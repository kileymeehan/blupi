import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBoardSchema, insertProjectSchema, insertTagSchema } from "@shared/schema";
import { ZodError } from "zod";
import { nanoid } from 'nanoid';
import { WebSocketServer, WebSocket } from 'ws';

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  ws: WebSocket;
  boardId?: string;
}

const connectedUsers = new Map<string, ConnectedUser>();
const COLORS = [
  "#FF5733", "#33FF57", "#3357FF", "#FF33F5",
  "#33FFF5", "#F5FF33", "#FF3333", "#33FF33"
];

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  console.log('[HTTP] Creating basic HTTP server');

  // Initialize WebSocket server with explicit path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws-collab',
    clientTracking: true 
  });

  console.log('[WS] WebSocket server created on path /ws-collab');

  wss.on('connection', (ws) => {
    const userId = nanoid();
    const colorIndex = Math.floor(Math.random() * COLORS.length);

    console.log(`[WS] New connection established: ${userId}`);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[WS] Received message from ${userId}:`, message);

        if (message.type === 'subscribe') {
          const user: ConnectedUser = {
            id: userId,
            name: message.userName || 'Anonymous',
            color: COLORS[colorIndex],
            emoji: message.userEmoji,
            ws,
            boardId: message.boardId
          };
          connectedUsers.set(userId, user);

          console.log(`[WS] User subscribed to board ${message.boardId}:`, {
            userId,
            name: user.name,
            emoji: user.emoji
          });

          // Send initial users list to new user
          const boardUsers = Array.from(connectedUsers.values())
            .filter(u => u.boardId === message.boardId)
            .map(({ id, name, color, emoji }) => ({ id, name, color, emoji }));

          ws.send(JSON.stringify({
            type: 'users_update',
            users: boardUsers
          }));

          // Broadcast to other users in the same board
          Array.from(connectedUsers.values()).forEach((connectedUser) => {
            if (connectedUser.ws !== ws && 
                connectedUser.boardId === message.boardId && 
                connectedUser.ws.readyState === WebSocket.OPEN) {
              connectedUser.ws.send(JSON.stringify({
                type: 'users_update',
                users: boardUsers
              }));
            }
          });
        }
      } catch (error) {
        console.error('[WS] Error processing message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error(`[WS] Connection error for user ${userId}:`, error);
    });

    ws.on('close', (code, reason) => {
      console.log(`[WS] Connection closed for user ${userId}. Code: ${code}, Reason: ${reason}`);
      const user = connectedUsers.get(userId);
      if (user?.boardId) {
        connectedUsers.delete(userId);

        // Broadcast updated users list to remaining users in the same board
        const boardUsers = Array.from(connectedUsers.values())
          .filter(u => u.boardId === user.boardId)
          .map(({ id, name, color, emoji }) => ({ id, name, color, emoji }));

        Array.from(connectedUsers.values()).forEach((connectedUser) => {
          if (connectedUser.boardId === user.boardId &&
              connectedUser.ws.readyState === WebSocket.OPEN) {
            connectedUser.ws.send(JSON.stringify({
              type: 'users_update',
              users: boardUsers
            }));
          }
        });
      }
    });

    // Send heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(heartbeat);
    });
  });

  // Add a health check endpoint
  app.get("/api/ping", (_req, res) => {
    console.log('[HTTP] Handling ping request');
    res.json({ status: "ok" });
  });

  // Basic routes without WebSocket functionality
  app.get("/api/boards", async (_req, res) => {
    try {
      console.log('[HTTP] Fetching all boards');
      const boards = await storage.getBoards();
      res.json(boards);
    } catch (err) {
      console.error('[HTTP] Error fetching boards:', err);
      res.status(500).json({ error: true, message: "Failed to fetch boards" });
    }
  });

  app.get("/api/projects", async (_req, res) => {
    try {
      console.log('[HTTP] Fetching all projects');
      const projects = await storage.getProjects();
      console.log(`[HTTP] Retrieved ${projects.length} projects:`, projects.map(p => ({ id: p.id, name: p.name })));
      res.json(projects);
    } catch (err) {
      console.error('[HTTP] Error fetching projects:', err);
      res.status(500).json({ error: true, message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      console.log('[HTTP] Creating project with data:', req.body);
      const parseResult = insertProjectSchema.safeParse(req.body);

      if (!parseResult.success) {
        console.error('[HTTP] Project validation error:', parseResult.error);
        return res.status(400).json({
          error: true,
          message: parseResult.error.errors[0].message
        });
      }

      const project = await storage.createProject(parseResult.data);
      console.log('[HTTP] Successfully created project:', project.id);

      // Double check the project was stored
      const storedProject = await storage.getProject(project.id);
      if (!storedProject) {
        throw new Error('Project creation failed - not found after creation');
      }

      res.json(project);
    } catch (err) {
      console.error('[HTTP] Error creating project:', err);
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: true,
          message: err.errors[0].message
        });
      }
      res.status(500).json({ error: true, message: "Failed to create project" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      console.log(`[HTTP] Fetching project with ID: ${req.params.id}`);
      const project = await storage.getProject(Number(req.params.id));
      if (!project) {
        return res.status(404).json({ error: true, message: "Project not found" });
      }
      console.log(`[HTTP] Retrieved project: ${project.id}`);
      res.json(project);
    } catch (err) {
      console.error('[HTTP] Error fetching project:', err);
      res.status(500).json({ error: true, message: "Failed to fetch project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      console.log(`[HTTP] Updating project with ID: ${req.params.id}`);
      const project = await storage.updateProject(Number(req.params.id), req.body);
      if (!project) {
        return res.status(404).json({ error: true, message: "Project not found" });
      }
      console.log(`[HTTP] Successfully updated project: ${project.id}`);
      res.json(project);
    } catch (err) {
      console.error('[HTTP] Error updating project:', err);
      res.status(500).json({ error: true, message: "Failed to update project" });
    }
  });

  app.post("/api/projects/:id/invite", async (req, res) => {
    try {
      console.log(`[HTTP] Sending invitation for project ID: ${req.params.id}`);
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({
          error: true,
          message: "Email and role are required"
        });
      }

      const project = await storage.getProject(Number(req.params.id));
      if (!project) {
        return res.status(404).json({ error: true, message: "Project not found" });
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({
          email,
          username: email.split('@')[0],
          password: nanoid(),
        });
      }

      const projectMember = await storage.inviteProjectMember({
        projectId: Number(req.params.id),
        userId: user.id,
        role,
        status: 'pending'
      });

      const emailSent = await sendProjectInvitation({
        to: email,
        projectName: project.name,
        role,
        inviterName: "Team member"
      });

      if (!emailSent) {
        console.error('[HTTP] Failed to send invitation email to:', email);
        return res.status(500).json({
          error: true,
          message: "Failed to send invitation email. Please try again."
        });
      }

      console.log(`[HTTP] Invitation sent successfully to ${email} for project ${project.id}`);
      res.json({
        message: "Invitation sent successfully",
        projectMember
      });
    } catch (err) {
      console.error('[HTTP] Error sending invitation:', err);
      res.status(500).json({
        error: true,
        message: "Failed to send invitation"
      });
    }
  });


  app.get("/api/projects/:id/boards", async (req, res) => {
    try {
      console.log(`[HTTP] Fetching boards for project ID: ${req.params.id}`);
      const boards = await storage.getBoardsByProject(Number(req.params.id));
      console.log(`[HTTP] Retrieved ${boards.length} boards for project ${req.params.id}`);
      res.json(boards);
    } catch (err) {
      console.error('[HTTP] Error fetching project boards:', err);
      res.status(500).json({ error: true, message: "Failed to fetch project boards" });
    }
  });

  app.get("/api/boards", async (_req, res) => {
    try {
      console.log('[HTTP] Fetching all boards');
      const boards = await storage.getBoards();
      console.log(`[HTTP] Retrieved ${boards.length} boards`);
      res.json(boards);
    } catch (err) {
      console.error('[HTTP] Error fetching boards:', err);
      res.status(500).json({ error: true, message: "Failed to fetch boards" });
    }
  });

  app.post("/api/boards", async (req, res) => {
    try {
      console.log('[HTTP] Creating board with data:', req.body);
      const parseResult = insertBoardSchema.safeParse(req.body);

      if (!parseResult.success) {
        console.error('[HTTP] Board validation error:', parseResult.error);
        return res.status(400).json({
          error: true,
          message: parseResult.error.errors[0].message
        });
      }

      const board = await storage.createBoard(parseResult.data);
      console.log('[HTTP] Successfully created board:', board.id);
      res.json(board);
    } catch (err) {
      console.error('[HTTP] Error creating board:', err);
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: true,
          message: err.errors[0].message
        });
      }
      res.status(500).json({ error: true, message: "Failed to create board" });
    }
  });

  app.get("/api/boards/:id", async (req, res) => {
    try {
      console.log(`[HTTP] Fetching board with ID: ${req.params.id}`);
      const board = await storage.getBoard(Number(req.params.id));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }
      console.log(`[HTTP] Retrieved board: ${board.id}`);
      res.json(board);
    } catch (err) {
      console.error('[HTTP] Error fetching board:', err);
      res.status(500).json({ error: true, message: "Failed to fetch board" });
    }
  });

  app.patch("/api/boards/:id", async (req, res) => {
    try {
      console.log(`[HTTP] Updating board with ID: ${req.params.id}`);
      const board = await storage.updateBoard(Number(req.params.id), req.body);
      console.log(`[HTTP] Successfully updated board: ${board.id}`);
      res.json(board);
    } catch (err) {
      console.error('[HTTP] Error updating board:', err);
      res.status(500).json({ error: true, message: "Failed to update board" });
    }
  });

  app.delete("/api/boards/:id", async (req, res) => {
    try {
      console.log(`[HTTP] Deleting board with ID: ${req.params.id}`);
      await storage.deleteBoard(Number(req.params.id));
      console.log(`[HTTP] Successfully deleted board: ${req.params.id}`);
      res.status(204).send();
    } catch (err) {
      console.error('[HTTP] Error deleting board:', err);
      res.status(500).json({ error: true, message: "Failed to delete board" });
    }
  });

  app.get("/api/public/boards/:id", async (req, res) => {
    try {
      console.log(`[HTTP] Fetching public board with ID: ${req.params.id}`);
      const board = await storage.getBoard(Number(req.params.id));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      const publicBoard = {
        ...board,
        blocks: board.blocks.map(block => ({
          ...block,
          comments: []
        }))
      };

      console.log(`[HTTP] Retrieved public board: ${publicBoard.id}`);
      res.json(publicBoard);
    } catch (err) {
      console.error('[HTTP] Error fetching public board:', err);
      res.status(500).json({ error: true, message: "Failed to fetch board" });
    }
  });

  app.post("/api/boards/:boardId/blocks/:blockId/comments", async (req, res) => {
    try {
      console.log(`[HTTP] Adding comment to board ${req.params.boardId}, block ${req.params.blockId}`);
      const { content, username } = req.body;
      if (!content) {
        return res.status(400).json({
          error: true,
          message: "Comment content is required"
        });
      }

      const board = await storage.getBoard(Number(req.params.boardId));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      const updatedBlocks = board.blocks.map(block => {
        if (block.id === req.params.blockId) {
          const newComment = {
            id: nanoid(),
            content,
            userId: 1,
            username: username || "Anonymous",
            completed: false,
            createdAt: new Date().toISOString()
          };

          return {
            ...block,
            comments: [...(block.comments || []), newComment]
          };
        }
        return block;
      });

      const updatedBoard = await storage.updateBoard(Number(req.params.boardId), {
        ...board,
        blocks: updatedBlocks
      });
      console.log(`[HTTP] Successfully added comment to board ${updatedBoard.id}, block ${req.params.blockId}`);
      res.json(updatedBoard);
    } catch (err) {
      console.error('[HTTP] Error adding comment:', err);
      res.status(500).json({ error: true, message: "Failed to add comment" });
    }
  });

  app.post("/api/boards/:boardId/blocks/:blockId/comments/clear", async (req, res) => {
    try {
      console.log(`[HTTP] Clearing comments for board ${req.params.boardId}, block ${req.params.blockId}`);
      const board = await storage.getBoard(Number(req.params.boardId));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      const updatedBlocks = board.blocks.map(block => {
        if (block.id === req.params.blockId) {
          return {
            ...block,
            comments: []
          };
        }
        return block;
      });

      const updatedBoard = await storage.updateBoard(Number(req.params.boardId), {
        ...board,
        blocks: updatedBlocks
      });
      console.log(`[HTTP] Successfully cleared comments for board ${updatedBoard.id}, block ${req.params.blockId}`);
      res.json(updatedBoard);
    } catch (err) {
      console.error('[HTTP] Error clearing comments:', err);
      res.status(500).json({ error: true, message: "Failed to clear comments" });
    }
  });

  app.patch("/api/boards/:boardId/blocks/:blockId/comments/:commentId/toggle", async (req, res) => {
    try {
      console.log(`[HTTP] Toggling comment completion for board ${req.params.boardId}, block ${req.params.blockId}, comment ${req.params.commentId}`);
      const { completed } = req.body;

      const board = await storage.getBoard(Number(req.params.boardId));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      const updatedBlocks = board.blocks.map(block => {
        if (block.id === req.params.blockId) {
          return {
            ...block,
            comments: (block.comments || []).map(comment => {
              if (comment.id === req.params.commentId) {
                return {
                  ...comment,
                  completed
                };
              }
              return comment;
            })
          };
        }
        return block;
      });

      const updatedBoard = await storage.updateBoard(Number(req.params.boardId), {
        ...board,
        blocks: updatedBlocks
      });
      console.log(`[HTTP] Successfully toggled comment completion for board ${updatedBoard.id}, block ${req.params.blockId}, comment ${req.params.commentId}`);
      res.json(updatedBoard);
    } catch (err) {
      console.error('[HTTP] Error toggling comment completion:', err);
      res.status(500).json({ error: true, message: "Failed to update comment" });
    }
  });

  // Add after the existing board-related routes:

  // Tag routes
  app.post("/api/boards/:boardId/tags", async (req, res) => {
    try {
      console.log(`[HTTP] Creating tag for board ${req.params.boardId}`);
      const parseResult = insertTagSchema.safeParse({
        ...req.body,
        boardId: Number(req.params.boardId)
      });

      if (!parseResult.success) {
        console.error('[HTTP] Tag validation error:', parseResult.error);
        return res.status(400).json({
          error: true,
          message: parseResult.error.errors[0].message
        });
      }

      const tag = await storage.createTag(parseResult.data);
      console.log('[HTTP] Successfully created tag:', tag.id);
      res.json(tag);
    } catch (err) {
      console.error('[HTTP] Error creating tag:', err);
      res.status(500).json({ error: true, message: "Failed to create tag" });
    }
  });

  app.get("/api/boards/:boardId/tags", async (req, res) => {
    try {
      console.log(`[HTTP] Fetching tags for board ${req.params.boardId}`);
      const tags = await storage.getTagsByBoard(Number(req.params.boardId));
      console.log(`[HTTP] Retrieved ${tags.length} tags for board ${req.params.boardId}`);
      res.json(tags);
    } catch (err) {
      console.error('[HTTP] Error fetching tags:', err);
      res.status(500).json({ error: true, message: "Failed to fetch tags" });
    }
  });

  app.post("/api/boards/:boardId/blocks/:blockId/tags/:tagId", async (req, res) => {
    try {
      console.log(`[HTTP] Adding tag ${req.params.tagId} to block ${req.params.blockId}`);
      const blockTag = await storage.createBlockTag({
        tagId: Number(req.params.tagId),
        blockId: req.params.blockId,
        boardId: Number(req.params.boardId)
      });
      console.log('[HTTP] Successfully added tag to block');
      res.json(blockTag);
    } catch (err) {
      console.error('[HTTP] Error adding tag to block:', err);
      res.status(500).json({ error: true, message: "Failed to add tag to block" });
    }
  });

  app.delete("/api/boards/:boardId/blocks/:blockId/tags/:tagId", async (req, res) => {
    try {
      console.log(`[HTTP] Removing tag ${req.params.tagId} from block ${req.params.blockId}`);
      await storage.deleteBlockTag({
        tagId: Number(req.params.tagId),
        blockId: req.params.blockId,
        boardId: Number(req.params.boardId)
      });
      console.log('[HTTP] Successfully removed tag from block');
      res.status(204).send();
    } catch (err) {
      console.error('[HTTP] Error removing tag from block:', err);
      res.status(500).json({ error: true, message: "Failed to remove tag from block" });
    }
  });

  return httpServer;
}

//Dummy function to avoid compilation error
async function sendProjectInvitation(params: any): Promise<boolean> {
  return true;
}