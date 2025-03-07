import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBoardSchema, insertProjectSchema } from "@shared/schema";
import { ZodError } from "zod";
import { nanoid } from 'nanoid';
import { sendProjectInvitation } from './utils/sendgrid';

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

  // Add logging to notifications endpoint
  app.get("/api/notifications", async (req, res) => {
    try {
      console.log('Fetching notifications for user');
      // For now, use a dummy user ID since we haven't implemented auth yet
      const userId = 1;
      const userNotifications = notifications.get(userId) || [];
      console.log(`Found ${userNotifications.length} notifications for user ${userId}`);
      res.json(userNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      res.status(500).json({ error: true, message: "Failed to fetch notifications" });
    }
  });

  // Add a health check endpoint
  app.get("/api/ping", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      console.log(`Marking notification ${req.params.id} as read`);
      const userId = 1; // Dummy user ID
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

  // Update the comments endpoint to use addNotification instead of WebSocket broadcast
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
          const newComment = {
            id: nanoid(),
            content,
            userId: 1,
            username: username || "Anonymous",
            completed: false,
            createdAt: new Date().toISOString()
          };

          // Add notification for new comment
          addNotification(1, {
            title: 'New Comment',
            message: `${username || 'Anonymous'} commented on a block in "${board.name}"`,
            type: 'comment',
            link: `/board/${board.id}`
          });

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