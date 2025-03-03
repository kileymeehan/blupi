import { boards, type Board, type InsertBoard, type Block } from "@shared/schema";

export interface IStorage {
  getBoards(): Promise<Board[]>;
  getBoard(id: number): Promise<Board | undefined>;
  createBoard(board: InsertBoard): Promise<Board>;
  updateBoard(id: number, board: Partial<Board>): Promise<Board>;
  deleteBoard(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private boards: Map<number, Board>;
  currentId: number;

  constructor() {
    this.boards = new Map();
    this.currentId = 1;
  }

  async getBoards(): Promise<Board[]> {
    return Array.from(this.boards.values());
  }

  async getBoard(id: number): Promise<Board | undefined> {
    return this.boards.get(id);
  }

  async createBoard(insertBoard: InsertBoard): Promise<Board> {
    const id = this.currentId++;
    const board: Board = { ...insertBoard, id };
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
}

export const storage = new MemStorage();
