import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBoardSchema, insertProjectSchema } from "@shared/schema";
import { ZodError } from "zod";
import { nanoid } from 'nanoid';
import { sendProjectInvitation } from './utils/sendgrid';

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Add a health check endpoint
  app.get("/api/ping", (_req, res) => {
    console.log('[INFO] Health check endpoint accessed');
    res.json({ status: "ok" });
  });

  // Project routes
  app.get("/api/projects", async (_req, res) => {
    try {
      console.log('[INFO] Fetching all projects');
      const projects = await storage.getProjects();
      console.log(`[INFO] Retrieved ${projects.length} projects`);
      res.json(projects);
    } catch (err) {
      console.error('[ERROR] Error fetching projects:', err);
      if (err instanceof Error) {
        console.error('[ERROR] Stack trace:', err.stack);
      }
      res.status(500).json({ error: true, message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    const requestId = nanoid(6);
    try {
      console.log(`[INFO] [${requestId}] Creating project with data:`, req.body);
      const parseResult = insertProjectSchema.safeParse(req.body);

      if (!parseResult.success) {
        console.error(`[ERROR] [${requestId}] Project validation error:`, parseResult.error);
        return res.status(400).json({ 
          error: true,
          message: parseResult.error.errors[0].message,
          requestId
        });
      }

      const project = await storage.createProject(parseResult.data);
      console.log(`[INFO] [${requestId}] Successfully created project:`, project.id);
      res.json(project);
    } catch (err) {
      console.error(`[ERROR] [${requestId}] Error creating project:`, err);
      if (err instanceof Error) {
        console.error(`[ERROR] [${requestId}] Stack trace:`, err.stack);
      }
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: true,
          message: err.errors[0].message,
          requestId
        });
      }
      res.status(500).json({ 
        error: true, 
        message: "Failed to create project",
        requestId
      });
    }
  });

  // Board routes
  app.get("/api/boards", async (_req, res) => {
    const requestId = nanoid(6);
    try {
      console.log(`[INFO] [${requestId}] Fetching all boards`);
      const boards = await storage.getBoards();
      console.log(`[INFO] [${requestId}] Retrieved ${boards.length} boards`);
      res.json(boards);
    } catch (err) {
      console.error(`[ERROR] [${requestId}] Error fetching boards:`, err);
      if (err instanceof Error) {
        console.error(`[ERROR] [${requestId}] Stack trace:`, err.stack);
      }
      res.status(500).json({ 
        error: true, 
        message: "Failed to fetch boards",
        requestId
      });
    }
  });

  app.post("/api/boards", async (req, res) => {
    const requestId = nanoid(6);
    try {
      console.log(`[INFO] [${requestId}] Creating board with data:`, req.body);
      const parseResult = insertBoardSchema.safeParse(req.body);

      if (!parseResult.success) {
        console.error(`[ERROR] [${requestId}] Board validation error:`, parseResult.error);
        return res.status(400).json({ 
          error: true,
          message: parseResult.error.errors[0].message,
          requestId
        });
      }

      const board = await storage.createBoard(parseResult.data);
      console.log(`[INFO] [${requestId}] Successfully created board:`, board.id);
      res.json(board);
    } catch (err) {
      console.error(`[ERROR] [${requestId}] Error creating board:`, err);
      if (err instanceof Error) {
        console.error(`[ERROR] [${requestId}] Stack trace:`, err.stack);
      }
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: true,
          message: err.errors[0].message,
          requestId
        });
      }
      res.status(500).json({ 
        error: true, 
        message: "Failed to create board",
        requestId
      });
    }
  });

  app.get("/api/boards/:id", async (req, res) => {
    const requestId = nanoid(6);
    try {
      console.log(`[INFO] [${requestId}] Fetching board with ID: ${req.params.id}`);
      const board = await storage.getBoard(Number(req.params.id));
      if (!board) {
        console.log(`[INFO] [${requestId}] Board not found: ${req.params.id}`);
        return res.status(404).json({ 
          error: true, 
          message: "Board not found",
          requestId 
        });
      }
      console.log(`[INFO] [${requestId}] Retrieved board: ${board.id}`);
      res.json(board);
    } catch (err) {
      console.error(`[ERROR] [${requestId}] Error fetching board:`, err);
      if (err instanceof Error) {
        console.error(`[ERROR] [${requestId}] Stack trace:`, err.stack);
      }
      res.status(500).json({ 
        error: true, 
        message: "Failed to fetch board",
        requestId
      });
    }
  });

  app.patch("/api/boards/:id", async (req, res) => {
    const requestId = nanoid(6);
    try {
      console.log(`[INFO] [${requestId}] Updating board with ID: ${req.params.id}`);
      const board = await storage.updateBoard(Number(req.params.id), req.body);
      console.log(`[INFO] [${requestId}] Successfully updated board: ${board.id}`);
      res.json(board);
    } catch (err) {
      console.error(`[ERROR] [${requestId}] Error updating board:`, err);
      if (err instanceof Error) {
        console.error(`[ERROR] [${requestId}] Stack trace:`, err.stack);
      }
      res.status(500).json({ 
        error: true, 
        message: "Failed to update board",
        requestId
      });
    }
  });

  app.delete("/api/boards/:id", async (req, res) => {
    const requestId = nanoid(6);
    try {
      console.log(`[INFO] [${requestId}] Deleting board with ID: ${req.params.id}`);
      await storage.deleteBoard(Number(req.params.id));
      console.log(`[INFO] [${requestId}] Successfully deleted board: ${req.params.id}`);
      res.status(204).send();
    } catch (err) {
      console.error(`[ERROR] [${requestId}] Error deleting board:`, err);
      if (err instanceof Error) {
        console.error(`[ERROR] [${requestId}] Stack trace:`, err.stack);
      }
      res.status(500).json({ 
        error: true, 
        message: "Failed to delete board",
        requestId
      });
    }
  });

  return httpServer;
}