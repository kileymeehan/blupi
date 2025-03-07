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

// Track notifications in memory since we're using MemStorage
const notifications = new Map<number, Array<{
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'comment' | 'invite';
  link?: string;
}>>();

function addNotification(userId: number, notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  if (!notifications.has(userId)) {
    notifications.set(userId, []);
  }

  const newNotification = {
    ...notification,
    id: nanoid(),
    timestamp: new Date().toISOString(),
    read: false
  };

  notifications.get(userId)!.unshift(newNotification);
  return newNotification;
}

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

  // Create WebSocket server with custom path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws-blupi' // Changed from '/ws' to avoid conflict with Vite
  });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] New connection established');
    let currentBoardId: number | null = null;
    let currentUser: { id: string; name: string; color: string } | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('[WebSocket] Received message:', message.type);

        // Handle board subscription
        if (message.type === 'subscribe') {
          const boardId = Number(message.boardId);
          const userName = message.userName || 'Anonymous';
          currentBoardId = boardId;
          console.log(`[WebSocket] User ${userName} subscribing to board ${boardId}`);

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

          if (!boardUsers.has(boardId)) {
            boardUsers.set(boardId, new Set());
          }
          boardUsers.get(boardId)!.add(currentUser);

          // Send initial board state and broadcast updated user list
          const board = await storage.getBoard(boardId);
          if (board) {
            console.log(`[WebSocket] Sending initial board state to user ${userName}`);
            ws.send(JSON.stringify({ type: 'board_update', board }));
          }

          broadcastToBoardUsers(boardId, {
            type: 'users_update',
            users: Array.from(boardUsers.get(boardId)!)
          });

        }
        // Handle notifications
        else if (message.type === 'notification') {
          console.log(`[WebSocket] Broadcasting notification to board ${currentBoardId}`);
          broadcastToBoardUsers(currentBoardId!, {
            type: 'notification',
            notification: {
              id: nanoid(),
              title: message.title,
              message: message.message,
              timestamp: new Date().toISOString(),
              read: false,
              type: message.notificationType
            }
          });
        }
        // Handle board updates
        else if (message.type === 'board_update' && currentBoardId) {
          console.log(`[WebSocket] Broadcasting board update for board ${currentBoardId}`);
          const updatedBoard = await storage.updateBoard(currentBoardId, message.board);
          broadcastToBoardUsers(currentBoardId, { 
            type: 'board_update',
            board: updatedBoard 
          }, ws);
        }
      } catch (err) {
        console.error('[WebSocket] Message error:', err);
        ws.send(JSON.stringify({ 
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    });

    ws.on('close', () => {
      if (currentBoardId && currentUser) {
        console.log(`[WebSocket] User ${currentUser.name} disconnected from board ${currentBoardId}`);
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

  // Add notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      console.log('Fetching notifications for user');
      const userId = 1; // For now, hardcode user ID
      const userNotifications = notifications.get(userId) || [];
      console.log(`Found ${userNotifications.length} notifications for user ${userId}`);
      res.json(userNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      res.status(500).json({ error: true, message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      console.log(`Marking notification ${req.params.id} as read`);
      const userId = 1; // For now, hardcode user ID
      const userNotifications = notifications.get(userId);
      if (!userNotifications) {
        console.log(`No notifications found for user ${userId}`);
        return res.status(404).json({ error: true, message: "No notifications found" });
      }

      const notification = userNotifications.find(n => n.id === req.params.id);
      if (!notification) {
        console.log(`Notification ${req.params.id} not found`);
        return res.status(404).json({ error: true, message: "Notification not found" });
      }

      notification.read = true;
      console.log(`Successfully marked notification ${req.params.id} as read`);
      res.json(notification);
    } catch (err) {
      console.error('Error marking notification as read:', err);
      res.status(500).json({ error: true, message: "Failed to update notification" });
    }
  });

  // Add a health check endpoint
  app.get("/api/ping", (_req, res) => {
    res.json({ status: "ok" });
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
      console.log('Successfully created project:', project.id);
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
      console.log(`Fetching project with ID: ${req.params.id}`);
      const project = await storage.getProject(Number(req.params.id));
      if (!project) {
        return res.status(404).json({ error: true, message: "Project not found" });
      }
      console.log(`Retrieved project: ${project.id}`);
      res.json(project);
    } catch (err) {
      console.error('Error fetching project:', err);
      res.status(500).json({ error: true, message: "Failed to fetch project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      console.log(`Updating project with ID: ${req.params.id}`);
      const project = await storage.updateProject(Number(req.params.id), req.body);
      if (!project) {
        return res.status(404).json({ error: true, message: "Project not found" });
      }
      console.log(`Successfully updated project: ${project.id}`);
      res.json(project);
    } catch (err) {
      console.error('Error updating project:', err);
      res.status(500).json({ error: true, message: "Failed to update project" });
    }
  });

  app.post("/api/projects/:id/invite", async (req, res) => {
    try {
      console.log(`Sending invitation for project ID: ${req.params.id}`);
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
        console.error('Failed to send invitation email to:', email);
        return res.status(500).json({ 
          error: true, 
          message: "Failed to send invitation email. Please try again." 
        });
      }

      console.log(`Invitation sent successfully to ${email} for project ${project.id}`);
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


  app.get("/api/boards", async (_req, res) => {
    try {
      console.log('Fetching all boards');
      const boards = await storage.getBoards();
      console.log(`Retrieved ${boards.length} boards`);
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
      console.log('Successfully created board:', board.id);
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
      console.log(`Fetching board with ID: ${req.params.id}`);
      const board = await storage.getBoard(Number(req.params.id));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }
      console.log(`Retrieved board: ${board.id}`);
      res.json(board);
    } catch (err) {
      console.error('Error fetching board:', err);
      res.status(500).json({ error: true, message: "Failed to fetch board" });
    }
  });

  app.patch("/api/boards/:id", async (req, res) => {
    try {
      console.log(`Updating board with ID: ${req.params.id}`);
      const board = await storage.updateBoard(Number(req.params.id), req.body);
      console.log(`Successfully updated board: ${board.id}`);
      res.json(board);
    } catch (err) {
      console.error('Error updating board:', err);
      res.status(500).json({ error: true, message: "Failed to update board" });
    }
  });

  app.delete("/api/boards/:id", async (req, res) => {
    try {
      console.log(`Deleting board with ID: ${req.params.id}`);
      await storage.deleteBoard(Number(req.params.id));
      console.log(`Successfully deleted board: ${req.params.id}`);
      res.status(204).send();
    } catch (err) {
      console.error('Error deleting board:', err);
      res.status(500).json({ error: true, message: "Failed to delete board" });
    }
  });

  app.get("/api/public/boards/:id", async (req, res) => {
    try {
      console.log(`Fetching public board with ID: ${req.params.id}`);
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

      console.log(`Retrieved public board: ${publicBoard.id}`);
      res.json(publicBoard);
    } catch (err) {
      console.error('Error fetching public board:', err);
      res.status(500).json({ error: true, message: "Failed to fetch board" });
    }
  });

  app.post("/api/boards/:boardId/blocks/:blockId/comments", async (req, res) => {
    try {
      console.log(`Adding comment to board ${req.params.boardId}, block ${req.params.blockId}`);
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
      console.log(`Successfully added comment to board ${updatedBoard.id}, block ${req.params.blockId}`);
      res.json(updatedBoard);
    } catch (err) {
      console.error('Error adding comment:', err);
      res.status(500).json({ error: true, message: "Failed to add comment" });
    }
  });

  app.post("/api/boards/:boardId/blocks/:blockId/comments/clear", async (req, res) => {
    try {
      console.log(`Clearing comments for board ${req.params.boardId}, block ${req.params.blockId}`);
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
      console.log(`Successfully cleared comments for board ${updatedBoard.id}, block ${req.params.blockId}`);
      res.json(updatedBoard);
    } catch (err) {
      console.error('Error clearing comments:', err);
      res.status(500).json({ error: true, message: "Failed to clear comments" });
    }
  });

  app.patch("/api/boards/:boardId/blocks/:blockId/comments/:commentId/toggle", async (req, res) => {
    try {
      console.log(`Toggling comment completion for board ${req.params.boardId}, block ${req.params.blockId}, comment ${req.params.commentId}`);
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
      console.log(`Successfully toggled comment completion for board ${updatedBoard.id}, block ${req.params.blockId}, comment ${req.params.commentId}`);
      res.json(updatedBoard);
    } catch (err) {
      console.error('Error toggling comment completion:', err);
      res.status(500).json({ error: true, message: "Failed to update comment" });
    }
  });

  return httpServer;
}