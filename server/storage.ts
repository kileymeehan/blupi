import { boards, type Board, type InsertBoard, type User, type InsertUser, users } from "@shared/schema";
import { nanoid } from "nanoid";
import type { SessionData } from "express-session";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Board operations
  getBoards(userId: number): Promise<Board[]>;
  getBoard(id: number): Promise<Board | undefined>;
  createBoard(board: InsertBoard, userId: number): Promise<Board>;
  updateBoard(id: number, board: Partial<Board>): Promise<Board>;
  deleteBoard(id: number): Promise<void>;

  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private boards: Map<number, Board>;
  private users: Map<number, User>;
  currentBoardId: number;
  currentUserId: number;
  sessionStore: session.Store;

  constructor() {
    this.boards = new Map();
    this.users = new Map();
    this.currentBoardId = 1;
    this.currentUserId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  async getBoards(userId: number): Promise<Board[]> {
    return Array.from(this.boards.values()).filter(board => board.userId === userId);
  }

  async getBoard(id: number): Promise<Board | undefined> {
    return this.boards.get(id);
  }

  async createBoard(insertBoard: InsertBoard, userId: number): Promise<Board> {
    const id = this.currentBoardId++;
    const board: Board = {
      ...insertBoard,
      id,
      userId,
      createdAt: new Date().toISOString()
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id
    };
    this.users.set(id, user);
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
}

export const storage = new MemStorage();