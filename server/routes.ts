import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBoardSchema } from "@shared/schema";
import { setupAuth } from "./auth";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Board routes
  app.get("/api/boards", requireAuth, async (req, res) => {
    const boards = await storage.getBoards(req.user!.id);
    res.json(boards);
  });

  app.get("/api/boards/:id", requireAuth, async (req, res) => {
    const board = await storage.getBoard(Number(req.params.id));
    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }
    if (board.userId !== req.user!.id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    res.json(board);
  });

  app.post("/api/boards", requireAuth, async (req, res) => {
    const parseResult = insertBoardSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: "Invalid board data" });
      return;
    }
    const board = await storage.createBoard(parseResult.data, req.user!.id);
    res.json(board);
  });

  app.patch("/api/boards/:id", requireAuth, async (req, res) => {
    const board = await storage.getBoard(Number(req.params.id));
    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }
    if (board.userId !== req.user!.id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    const updatedBoard = await storage.updateBoard(Number(req.params.id), req.body);
    res.json(updatedBoard);
  });

  app.delete("/api/boards/:id", requireAuth, async (req, res) => {
    const board = await storage.getBoard(Number(req.params.id));
    if (!board) {
      res.status(404).json({ message: "Board not found" });
      return;
    }
    if (board.userId !== req.user!.id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    await storage.deleteBoard(Number(req.params.id));
    res.status(204).send();
  });

  const httpServer = createServer(app);
  return httpServer;
}