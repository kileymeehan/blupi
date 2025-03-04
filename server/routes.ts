import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBoardSchema } from "@shared/schema";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes first
  setupAuth(app);

  app.get("/api/boards", async (_req, res) => {
    const boards = await storage.getBoards();
    res.json(boards);
  });

  app.get("/api/boards/:id", async (req, res) => {
    const board = await storage.getBoard(Number(req.params.id));
    if (!board) {
      res.status(404).json({ error: true, message: "Board not found" });
      return;
    }
    res.json(board);
  });

  app.post("/api/boards", async (req, res) => {
    const parseResult = insertBoardSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: true, message: "Invalid board data" });
      return;
    }
    const board = await storage.createBoard(parseResult.data);
    res.json(board);
  });

  app.patch("/api/boards/:id", async (req, res) => {
    const board = await storage.updateBoard(Number(req.params.id), req.body);
    res.json(board);
  });

  app.delete("/api/boards/:id", async (req, res) => {
    await storage.deleteBoard(Number(req.params.id));
    res.status(204).send();
  });

  // Add project routes
  app.get("/api/projects", async (_req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.post("/api/projects", async (req, res) => {
    const project = await storage.createProject(req.body);
    res.json(project);
  });

  const httpServer = createServer(app);
  return httpServer;
}