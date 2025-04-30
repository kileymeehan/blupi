import { 
  projects, boards as boardsTable, 
  users, projectMembers, 
  type Board, type InsertBoard, 
  type User, type InsertUser, 
  type Project, type InsertProject,
  type ProjectMember, type InsertProjectMember
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {
  public sessionStore: session.Store;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // Project methods
  async getProjects(): Promise<(Project & { user?: { username: string, email: string } })[]> {
    try {
      console.log('[Storage] Getting all projects');
      const results = await db
        .select()
        .from(projects)
        .leftJoin(users, eq(projects.userId, users.id))
        .orderBy(desc(projects.createdAt));
      
      // Map to include user info in the expected format
      const projectsWithUser = results.map(row => ({
        ...row.projects,
        user: row.users ? { 
          username: row.users.username, 
          email: row.users.email 
        } : undefined
      }));
      
      console.log('[Storage] Found projects:', projectsWithUser.length);
      return projectsWithUser as (Project & { user?: { username: string, email: string } })[];
    } catch (error) {
      console.error('[Storage] Error getting projects:', error);
      throw error;
    }
  }

  async getProject(id: number): Promise<Project | undefined> {
    try {
      console.log('[Storage] Getting project:', id);
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .orderBy(desc(projects.createdAt));
      return project;
    } catch (error) {
      console.error('[Storage] Error getting project:', error);
      throw error;
    }
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    try {
      console.log('[Storage] Creating project:', insertProject);
      const [project] = await db.insert(projects).values({
        ...insertProject,
        userId: 1, // Default for now until we implement proper user management
        status: insertProject.status || 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      if (!project) {
        throw new Error('Failed to create project');
      }

      console.log('[Storage] Created project:', project);
      return project;
    } catch (error) {
      console.error('[Storage] Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project> {
    try {
      console.log('[Storage] Updating project:', id, updates);
      const [project] = await db
        .update(projects)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(projects.id, id))
        .returning();
      return project;
    } catch (error) {
      console.error('[Storage] Error updating project:', error);
      throw error;
    }
  }

  // Board methods
  async getBoards(): Promise<(Board & { user?: { username: string, email: string } })[]> {
    try {
      console.log('[Storage] Getting all boards');
      const boardResults = await db
        .select()
        .from(boardsTable)
        .leftJoin(users, eq(boardsTable.userId, users.id))
        .orderBy(desc(boardsTable.createdAt));
      
      // Map to include user info in the expected format
      const boardsWithUser = boardResults.map(row => ({
        ...row.boards,
        user: row.users ? { 
          username: row.users.username, 
          email: row.users.email 
        } : undefined
      }));
      
      console.log('[Storage] Retrieved boards:', boardsWithUser.length);
      return boardsWithUser as (Board & { user?: { username: string, email: string } })[];
    } catch (error) {
      console.error('[Storage] Error getting boards:', error);
      throw error;
    }
  }

  async getBoardsByProject(projectId: number): Promise<(Board & { user?: { username: string, email: string } })[]> {
    try {
      console.log('[Storage] Getting boards for project:', projectId);
      if (!projectId) {
        console.error('[Storage] Project ID is required to get boards');
        return [];
      }

      // Use the correct table reference and ensure strict equality check
      const boardResults = await db
        .select()
        .from(boardsTable)
        .leftJoin(users, eq(boardsTable.userId, users.id))
        .where(eq(boardsTable.projectId, projectId))
        .orderBy(desc(boardsTable.createdAt));

      // Map to include user info in the expected format
      const boardsWithUser = boardResults.map(row => ({
        ...row.boards,
        user: row.users ? { 
          username: row.users.username, 
          email: row.users.email 
        } : undefined
      }));

      console.log('[Storage] Retrieved project boards:', boardsWithUser.length);
      return boardsWithUser as (Board & { user?: { username: string, email: string } })[];
    } catch (error) {
      console.error('[Storage] Error getting boards by project:', error);
      throw error;
    }
  }

  async getBoard(id: number): Promise<Board | undefined> {
    try {
      const [board] = await db
        .select()
        .from(boardsTable)
        .where(eq(boardsTable.id, id));
      return board;
    } catch (error) {
      console.error('[Storage] Error getting board:', error);
      throw error;
    }
  }

  async createBoard(insertBoard: InsertBoard): Promise<Board> {
    try {
      console.log('[Storage] Creating board:', insertBoard);
      // projectId is now optional, so we don't check for it
      
      // Preserve blocks and phases if provided
      const blocks = insertBoard.blocks || [];
      const phases = insertBoard.phases || [];
      
      const [board] = await db.insert(boardsTable).values({
        ...insertBoard,
        userId: 1, // Default for now until we implement proper user management
        status: insertBoard.status || 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        blocks: blocks,
        phases: phases
      }).returning();

      if (!board) {
        throw new Error('Failed to create board');
      }

      console.log('[Storage] Created board:', board);
      return board;
    } catch (error) {
      console.error('[Storage] Error creating board:', error);
      throw error;
    }
  }

  async updateBoard(id: number, updates: Partial<Board>): Promise<Board> {
    try {
      console.log('[Storage] Updating board:', id, updates);
      const [board] = await db
        .update(boardsTable)
        .set({
          ...updates,
          updatedAt: new Date() // Ensure we always set a new Date object
        })
        .where(eq(boardsTable.id, id))
        .returning();

      if (!board) {
        throw new Error('Board not found');
      }

      return board;
    } catch (error) {
      console.error('[Storage] Error updating board:', error);
      throw error;
    }
  }

  async deleteBoard(id: number): Promise<void> {
    try {
      await db.delete(boardsTable).where(eq(boardsTable.id, id));
    } catch (error) {
      console.error('[Storage] Error deleting board:', error);
      throw error;
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('[Storage] Error getting user:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('[Storage] Error getting user by email:', error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values({
        ...insertUser,
        createdAt: new Date()
      }).returning();
      return user;
    } catch (error) {
      console.error('[Storage] Error creating user:', error);
      throw error;
    }
  }

  // Project member methods
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    try {
      return await db
        .select()
        .from(projectMembers)
        .where(eq(projectMembers.projectId, projectId));
    } catch (error) {
      console.error('[Storage] Error getting project members:', error);
      throw error;
    }
  }

  async inviteProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
    try {
      const [projectMember] = await db
        .insert(projectMembers)
        .values({
          ...member,
          invitedAt: new Date(),
          acceptedAt: null
        })
        .returning();
      return projectMember;
    } catch (error) {
      console.error('[Storage] Error inviting project member:', error);
      throw error;
    }
  }

  async updateProjectMember(id: number, updates: Partial<ProjectMember>): Promise<ProjectMember> {
    try {
      const [member] = await db
        .update(projectMembers)
        .set(updates)
        .where(eq(projectMembers.id, id))
        .returning();
      return member;
    } catch (error) {
      console.error('[Storage] Error updating project member:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();