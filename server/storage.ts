import { boards, users, projects, type Board, type InsertBoard, type User, type InsertUser, type Project, type InsertProject, type Block, type Phase } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Board methods
  getBoards(): Promise<Board[]>;
  getBoard(id: number): Promise<Board | undefined>;
  createBoard(board: InsertBoard): Promise<Board>;
  updateBoard(id: number, board: Partial<Board>): Promise<Board>;
  deleteBoard(id: number): Promise<void>;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private boards: Map<number, Board>;
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  public sessionStore: session.Store;
  private currentBoardId: number;
  private currentUserId: number;
  private currentProjectId: number;

  constructor() {
    this.boards = new Map();
    this.users = new Map();
    this.projects = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    this.currentBoardId = 1;
    this.currentUserId = 1;
    this.currentProjectId = 1;
  }

  // Board methods
  async getBoards(): Promise<Board[]> {
    return Array.from(this.boards.values());
  }

  async getBoard(id: number): Promise<Board | undefined> {
    return this.boards.get(id);
  }

  async createBoard(insertBoard: InsertBoard): Promise<Board> {
    const id = this.currentBoardId++;
    const createdAt = new Date();
    const board: Board = {
      ...insertBoard,
      id,
      createdAt,
      userId: 1, // Default for now
      projectId: insertBoard.projectId, // Ensure projectId is preserved from input
      description: insertBoard.description || null,
      blocks: (insertBoard.blocks || []) as Block[],
      phases: (insertBoard.phases || []) as Phase[]
    };
    this.boards.set(id, board);
    return board;
  }

  async updateBoard(id: number, updates: Partial<Board>): Promise<Board> {
    const board = await this.getBoard(id);
    if (!board) throw new Error("Board not found");

    const updatedBoard = { ...board, ...updates };
    this.boards.set(id, updatedBoard);
    return updatedBoard;
  }

  async deleteBoard(id: number): Promise<void> {
    this.boards.delete(id);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const user: User = {
      ...insertUser,
      id,
      createdAt
    };
    this.users.set(id, user);
    return user;
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const createdAt = new Date();
    const project: Project = {
      ...insertProject,
      id,
      createdAt,
      userId: 1, // Default for now
      description: insertProject.description || null
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project> {
    const project = await this.getProject(id);
    if (!project) throw new Error("Project not found");

    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
}

export const storage = new MemStorage();