import { boards, users, projects, projectMembers, type Board, type InsertBoard, type User, type InsertUser, type Project, type InsertProject, type Block, type Phase, type ProjectMember, type InsertProjectMember } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

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

  // Project member methods
  getProjectMembers(projectId: number): Promise<ProjectMember[]>;
  inviteProjectMember(member: InsertProjectMember): Promise<ProjectMember>;
  updateProjectMember(id: number, updates: Partial<ProjectMember>): Promise<ProjectMember>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    console.log('[Storage] Getting all projects');
    const results = await db.select().from(projects);
    console.log('[Storage] Found projects:', results.length);
    return results;
  }

  async getProject(id: number): Promise<Project | undefined> {
    console.log('[Storage] Getting project:', id);
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    console.log('[Storage] Creating project:', insertProject);
    const [project] = await db.insert(projects).values({
      ...insertProject,
      userId: 1, // Default for now
      status: insertProject.status || 'draft',
      createdAt: new Date()
    }).returning();

    if (!project) {
      throw new Error('Failed to create project');
    }

    console.log('[Storage] Created project:', project);
    return project;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project> {
    console.log('[Storage] Updating project:', id, updates);
    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  // Board methods
  async getBoards(): Promise<Board[]> {
    return await db.select().from(boards);
  }

  async getBoard(id: number): Promise<Board | undefined> {
    const [board] = await db.select().from(boards).where(eq(boards.id, id));
    return board;
  }

  async createBoard(insertBoard: InsertBoard): Promise<Board> {
    console.log('[Storage] Creating board:', insertBoard);
    const [board] = await db.insert(boards).values({
      ...insertBoard,
      userId: 1, // Default for now
      status: insertBoard.status || 'draft',
      createdAt: new Date(),
      blocks: [],
      phases: []
    }).returning();

    if (!board) {
      throw new Error('Failed to create board');
    }

    console.log('[Storage] Created board:', board);
    return board;
  }

  async updateBoard(id: number, updates: Partial<Board>): Promise<Board> {
    console.log('[Storage] Updating board:', id, updates);
    const [board] = await db
      .update(boards)
      .set(updates)
      .where(eq(boards.id, id))
      .returning();
    return board;
  }

  async deleteBoard(id: number): Promise<void> {
    await db.delete(boards).where(eq(boards.id, id));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      createdAt: new Date()
    }).returning();
    return user;
  }

  // Project member methods
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    return await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
  }

  async inviteProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
    const [projectMember] = await db
      .insert(projectMembers)
      .values({
        ...member,
        invitedAt: new Date(),
        acceptedAt: null
      })
      .returning();
    return projectMember;
  }

  async updateProjectMember(id: number, updates: Partial<ProjectMember>): Promise<ProjectMember> {
    const [member] = await db
      .update(projectMembers)
      .set(updates)
      .where(eq(projectMembers.id, id))
      .returning();
    return member;
  }
}

export const storage = new DatabaseStorage();