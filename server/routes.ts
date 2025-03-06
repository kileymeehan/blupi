import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBoardSchema, insertProjectSchema } from "@shared/schema";
import { ZodError } from "zod";
import { nanoid } from 'nanoid';
import { WebSocketServer, WebSocket } from 'ws';
import { sendProjectInvitation } from './utils/sendgrid';

// Track active connections per board
const boardConnections = new Map<number, Set<WebSocket>>();
// Track user information per board
const boardUsers = new Map<number, Set<{
  id: string;
  name: string;
  color: string;
}>>();

function broadcastToBoardUsers(boardId: number, message: any, excludeWs?: WebSocket) {
  const connections = boardConnections.get(boardId);
  if (!connections) return;

  const messageStr = JSON.stringify(message);
  connections.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Generate a random color for user avatars
function getRandomColor() {
  const colors = [
    '#F87171', '#FB923C', '#FBBF24', '#34D399', 
    '#60A5FA', '#818CF8', '#A78BFA', '#F472B6'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    let currentBoardId: number | null = null;
    let currentUser: { id: string; name: string; color: string } | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle board subscription
        if (message.type === 'subscribe') {
          const boardId = Number(message.boardId);
          const userName = message.userName || 'Anonymous';
          currentBoardId = boardId;

          // Create unique user identity
          currentUser = {
            id: nanoid(),
            name: userName,
            color: getRandomColor()
          };

          // Add user to board connections
          if (!boardConnections.has(boardId)) {
            boardConnections.set(boardId, new Set());
          }
          boardConnections.get(boardId)!.add(ws);

          // Add user to board users
          if (!boardUsers.has(boardId)) {
            boardUsers.set(boardId, new Set());
          }
          boardUsers.get(boardId)!.add(currentUser);

          // Send initial board state
          const board = await storage.getBoard(boardId);
          if (board) {
            ws.send(JSON.stringify({ type: 'board_update', board }));
          }

          // Broadcast updated user list
          broadcastToBoardUsers(boardId, {
            type: 'users_update',
            users: Array.from(boardUsers.get(boardId)!)
          });
        }

        // Handle board updates
        else if (message.type === 'board_update' && currentBoardId) {
          const updatedBoard = await storage.updateBoard(currentBoardId, message.board);
          broadcastToBoardUsers(currentBoardId, { 
            type: 'board_update',
            board: updatedBoard 
          }, ws);
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
        ws.send(JSON.stringify({ 
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    });

    ws.on('close', () => {
      if (currentBoardId && currentUser) {
        // Remove user from board connections
        if (boardConnections.has(currentBoardId)) {
          boardConnections.get(currentBoardId)!.delete(ws);
          if (boardConnections.get(currentBoardId)!.size === 0) {
            boardConnections.delete(currentBoardId);
          }
        }

        // Remove user from board users and broadcast update
        if (boardUsers.has(currentBoardId)) {
          boardUsers.get(currentBoardId)!.delete(currentUser);
          broadcastToBoardUsers(currentBoardId, {
            type: 'users_update',
            users: Array.from(boardUsers.get(currentBoardId)!)
          });
        }
      }
    });
  });

  // Project routes
  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      res.status(500).json({ error: true, message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      console.log('Creating project with data:', req.body);
      const parseResult = insertProjectSchema.safeParse(req.body);

      if (!parseResult.success) {
        console.error('Project validation error:', parseResult.error);
        return res.status(400).json({ 
          error: true,
          message: parseResult.error.errors[0].message 
        });
      }

      const project = await storage.createProject(parseResult.data);
      res.json(project);
    } catch (err) {
      console.error('Error creating project:', err);
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
      const project = await storage.getProject(Number(req.params.id));
      if (!project) {
        return res.status(404).json({ error: true, message: "Project not found" });
      }
      res.json(project);
    } catch (err) {
      console.error('Error fetching project:', err);
      res.status(500).json({ error: true, message: "Failed to fetch project" });
    }
  });

  // Add PATCH endpoint for projects
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(Number(req.params.id), req.body);
      if (!project) {
        return res.status(404).json({ error: true, message: "Project not found" });
      }
      res.json(project);
    } catch (err) {
      console.error('Error updating project:', err);
      res.status(500).json({ error: true, message: "Failed to update project" });
    }
  });

  // Update the invite endpoint
  app.post("/api/projects/:id/invite", async (req, res) => {
    try {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ 
          error: true, 
          message: "Email and role are required" 
        });
      }

      // Get the project details
      const project = await storage.getProject(Number(req.params.id));
      if (!project) {
        return res.status(404).json({ error: true, message: "Project not found" });
      }

      // Get or create user
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({
          email,
          username: email.split('@')[0],
          password: nanoid(), // temporary password
        });
      }

      // Create project member
      const projectMember = await storage.inviteProjectMember({
        projectId: Number(req.params.id),
        userId: user.id,
        role,
        status: 'pending'
      });

      // Send invitation email
      const emailSent = await sendProjectInvitation({
        to: email,
        projectName: project.name,
        role,
        inviterName: "Team member" // In a real app, this would be the current user's name
      });

      if (!emailSent) {
        console.error('Failed to send invitation email to:', email);
        return res.status(500).json({ 
          error: true, 
          message: "Failed to send invitation email. Please try again." 
        });
      }

      res.json({ 
        message: "Invitation sent successfully",
        projectMember
      });
    } catch (err) {
      console.error('Error sending invitation:', err);
      res.status(500).json({ 
        error: true, 
        message: "Failed to send invitation" 
      });
    }
  });


  // Board/Blueprint routes
  app.get("/api/boards", async (_req, res) => {
    try {
      const boards = await storage.getBoards();
      res.json(boards);
    } catch (err) {
      console.error('Error fetching boards:', err);
      res.status(500).json({ error: true, message: "Failed to fetch boards" });
    }
  });

  app.post("/api/boards", async (req, res) => {
    try {
      console.log('Creating board with data:', req.body);
      const parseResult = insertBoardSchema.safeParse(req.body);

      if (!parseResult.success) {
        console.error('Board validation error:', parseResult.error);
        return res.status(400).json({ 
          error: true,
          message: parseResult.error.errors[0].message 
        });
      }

      const board = await storage.createBoard(parseResult.data);
      res.json(board);
    } catch (err) {
      console.error('Error creating board:', err);
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
      const board = await storage.getBoard(Number(req.params.id));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }
      res.json(board);
    } catch (err) {
      console.error('Error fetching board:', err);
      res.status(500).json({ error: true, message: "Failed to fetch board" });
    }
  });

  app.patch("/api/boards/:id", async (req, res) => {
    try {
      const board = await storage.updateBoard(Number(req.params.id), req.body);
      res.json(board);
    } catch (err) {
      console.error('Error updating board:', err);
      res.status(500).json({ error: true, message: "Failed to update board" });
    }
  });

  app.delete("/api/boards/:id", async (req, res) => {
    try {
      await storage.deleteBoard(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      console.error('Error deleting board:', err);
      res.status(500).json({ error: true, message: "Failed to delete board" });
    }
  });

  // Add this new endpoint for public board access
  app.get("/api/public/boards/:id", async (req, res) => {
    try {
      const board = await storage.getBoard(Number(req.params.id));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      // Remove sensitive information for public view
      const publicBoard = {
        ...board,
        blocks: board.blocks.map(block => ({
          ...block,
          comments: [] // Remove comments from public view
        }))
      };

      res.json(publicBoard);
    } catch (err) {
      console.error('Error fetching public board:', err);
      res.status(500).json({ error: true, message: "Failed to fetch board" });
    }
  });

  // Update the comments endpoint to remove authentication requirement temporarily
  app.post("/api/boards/:boardId/blocks/:blockId/comments", async (req, res) => {
    try {
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

      // Find and update the block with the new comment
      const updatedBlocks = board.blocks.map(block => {
        if (block.id === req.params.blockId) {
          return {
            ...block,
            comments: [
              ...(block.comments || []),
              {
                id: nanoid(),
                content,
                userId: 1, // Default user ID for now
                username: username || "Anonymous",
                completed: false, // Add completed field
                createdAt: new Date().toISOString()
              }
            ]
          };
        }
        return block;
      });

      const updatedBoard = await storage.updateBoard(Number(req.params.boardId), {
        ...board,
        blocks: updatedBlocks
      });

      res.json(updatedBoard);
    } catch (err) {
      console.error('Error adding comment:', err);
      res.status(500).json({ error: true, message: "Failed to add comment" });
    }
  });

  // Update clear comments endpoint to remove auth requirement
  app.post("/api/boards/:boardId/blocks/:blockId/comments/clear", async (req, res) => {
    try {
      const board = await storage.getBoard(Number(req.params.boardId));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      // Clear comments for the specified block
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

      res.json(updatedBoard);
    } catch (err) {
      console.error('Error clearing comments:', err);
      res.status(500).json({ error: true, message: "Failed to clear comments" });
    }
  });

  // Add this endpoint for toggling comment completion
  app.patch("/api/boards/:boardId/blocks/:blockId/comments/:commentId/toggle", async (req, res) => {
    try {
      const { completed } = req.body;

      const board = await storage.getBoard(Number(req.params.boardId));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      // Update the comment's completion status
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

      res.json(updatedBoard);
    } catch (err) {
      console.error('Error toggling comment completion:', err);
      res.status(500).json({ error: true, message: "Failed to update comment" });
    }
  });

  return httpServer;
}