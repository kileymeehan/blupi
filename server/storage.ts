import { 
  projects, boards as boardsTable, 
  users, projectMembers, sheetDocuments, projectSheetDocuments,
  boardPermissions, teamMembers, pendingInvitations, notifications, flaggedBlocks,
  type Board, type InsertBoard, 
  type User, type InsertUser, 
  type Project, type InsertProject,
  type ProjectMember, type InsertProjectMember,
  type SheetDocument, type InsertSheetDocument,
  type ProjectSheetDocument, type InsertProjectSheetDocument,
  type BoardPermission, type InsertBoardPermission,
  type TeamMember, type InsertTeamMember,
  type PendingInvitation, type InsertPendingInvitation,
  type Notification, type InsertNotification,
  type FlaggedBlock, type InsertFlaggedBlock
} from "@shared/schema";
import { db, sql as neonSql } from "./db";
import { eq, desc, or, and, inArray, count, sql } from "drizzle-orm";
import session from "express-session";
import MemoryStore from "memorystore";

const MemoryStoreSession = MemoryStore(session);

export class DatabaseStorage {
  public sessionStore: session.Store;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Use memory store for sessions to avoid pool issues during startup
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000, // prune expired entries every 24h
      max: 10000, // max number of sessions
      ttl: 86400000, // 24 hours
      dispose: (key: string, val: any) => {
        console.log('[Session Store] Disposing session:', key);
      }
    });
  }

  // Project methods
  async getProjects(userId?: number): Promise<(Project & { user?: { username: string, email: string } })[]> {
    try {
      console.log('[Storage] Getting projects for user:', userId);
      
      let results;
      
      if (userId) {
        results = await db
          .select()
          .from(projects)
          .leftJoin(users, eq(projects.userId, users.id))
          .where(eq(projects.userId, userId))
          .orderBy(desc(projects.createdAt));
      } else {
        results = await db
          .select()
          .from(projects)
          .leftJoin(users, eq(projects.userId, users.id))
          .orderBy(desc(projects.createdAt));
      }
      
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

  async getProjectsByMember(userId: number): Promise<(Project & { user?: { username: string, email: string } })[]> {
    try {
      console.log('[Storage] Getting projects where user is member:', userId);
      
      // Join projectMembers with projects and users to get projects where user is assigned
      const results = await db
        .select()
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .leftJoin(users, eq(projects.userId, users.id))
        .where(eq(projectMembers.userId, userId))
        .orderBy(desc(projects.createdAt));
      
      // Map to include user info in the expected format
      const projectsWithUser = results.map(row => ({
        ...row.projects,
        user: row.users ? { 
          username: row.users.username, 
          email: row.users.email 
        } : undefined
      }));
      
      console.log('[Storage] Found member projects:', projectsWithUser.length);
      return projectsWithUser as (Project & { user?: { username: string, email: string } })[];
    } catch (error) {
      console.error('[Storage] Error getting projects by member:', error);
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

  async createProject(insertProject: InsertProject & { userId: number }): Promise<Project> {
    try {
      console.log('[Storage] Creating project:', insertProject);
      const [project] = await db.insert(projects).values({
        name: insertProject.name,
        description: insertProject.description,
        color: insertProject.color || '#4F46E5',
        status: insertProject.status || 'draft',
        userId: insertProject.userId
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
  async getBoards(userId?: number): Promise<(Board & { user?: { username: string, email: string } })[]> {
    try {
      console.log('🔵 [STORAGE] === GETTING BOARDS DEBUG ===');
      console.log('[Storage] Getting boards for user:', userId);
      
      // First, let's check total boards in database
      const totalBoardsCount = await db
        .select({ count: sql`count(*)` })
        .from(boardsTable);
      console.log('[Storage] Total boards in database:', totalBoardsCount[0]?.count);
      
      // Check boards owned by this user
      if (userId) {
        const userOwnedCount = await db
          .select({ count: sql`count(*)` })
          .from(boardsTable)
          .where(eq(boardsTable.userId, userId));
        console.log('[Storage] Boards owned by user', userId, ':', userOwnedCount[0]?.count);
      }
      
      // Check boards in user's projects
      if (userId) {
        const userProjectsQuery = await db
          .select({ projectId: projects.id })
          .from(projects)
          .where(eq(projects.userId, userId));
        console.log('[Storage] User has', userProjectsQuery.length, 'projects');
        
        if (userProjectsQuery.length > 0) {
          const projectIds = userProjectsQuery.map(p => p.projectId);
          const boardsInProjectsCount = await db
            .select({ count: sql`count(*)` })
            .from(boardsTable)
            .where(inArray(boardsTable.projectId, projectIds));
          console.log('[Storage] Boards in user projects:', boardsInProjectsCount[0]?.count);
        }
      }
      
      let boardResults;
      
      if (userId) {
        // Get boards user owns OR boards in user's projects
        const userProjects = await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.userId, userId));
        
        const projectIds = userProjects.map(p => p.id);
        console.log('[Storage] User project IDs:', projectIds);
        
        boardResults = await db
          .select()
          .from(boardsTable)
          .leftJoin(users, eq(boardsTable.userId, users.id))
          .where(
            or(
              eq(boardsTable.userId, userId), // Boards user owns
              projectIds.length > 0 ? inArray(boardsTable.projectId, projectIds) : sql`false` // Boards in user's projects
            )
          )
          .orderBy(desc(boardsTable.createdAt));
      } else {
        boardResults = await db
          .select()
          .from(boardsTable)
          .leftJoin(users, eq(boardsTable.userId, users.id))
          .orderBy(desc(boardsTable.createdAt));
      }
      
      // Map to include user info in the expected format
      const boardsWithUser = boardResults.map(row => ({
        ...row.boards,
        user: row.users ? { 
          username: row.users.username, 
          email: row.users.email 
        } : undefined
      }));
      
      console.log('[Storage] Retrieved boards:', boardsWithUser.length);
      if (boardsWithUser.length > 0) {
        console.log('[Storage] Sample board:', JSON.stringify(boardsWithUser[0], null, 2));
      }
      
      return boardsWithUser as (Board & { user?: { username: string, email: string } })[];
    } catch (error) {
      console.error('[Storage] Error getting boards:', error);
      throw error;
    }
  }

  // Get boards that a specific user has access to
  async getBoardsForUser(userId: number): Promise<(Board & { user?: { username: string, email: string } })[]> {
    try {
      console.log('[Storage] Getting boards for user:', userId);
      
      // Get boards the user owns or has permissions to access
      const boardResults = await db
        .select()
        .from(boardsTable)
        .leftJoin(users, eq(boardsTable.userId, users.id))
        .leftJoin(boardPermissions, eq(boardPermissions.boardId, boardsTable.id))
        .where(
          or(
            eq(boardsTable.userId, userId), // User owns the board
            eq(boardPermissions.userId, userId) // User has permission to access the board
          )
        )
        .orderBy(desc(boardsTable.createdAt));
      
      // Remove duplicates and map to include user info
      const uniqueBoards = new Map();
      boardResults.forEach(row => {
        if (!uniqueBoards.has(row.boards.id)) {
          uniqueBoards.set(row.boards.id, {
            ...row.boards,
            user: row.users ? { 
              username: row.users.username, 
              email: row.users.email 
            } : undefined
          });
        }
      });
      
      const boardsWithUser = Array.from(uniqueBoards.values());
      console.log('[Storage] Retrieved boards for user:', boardsWithUser.length);
      return boardsWithUser as (Board & { user?: { username: string, email: string } })[];
    } catch (error) {
      console.error('[Storage] Error fetching boards for user:', error);
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

  async createBoard(insertBoard: InsertBoard & { userId: number }): Promise<Board> {
    try {
      console.log('[Storage] Creating board:', insertBoard);
      // projectId is now optional, so we don't check for it
      
      // Preserve blocks and phases if provided
      const blocks = insertBoard.blocks || [];
      const phases = insertBoard.phases || [];
      
      const [board] = await db.insert(boardsTable).values({
        name: insertBoard.name,
        description: insertBoard.description || '',
        projectId: insertBoard.projectId || null,
        userId: insertBoard.userId,
        status: insertBoard.status || 'draft',
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
      
      // Helper function to recursively convert string timestamps to Date objects
      const convertTimestamps = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        
        if (typeof obj === 'string') {
          // Check if it's an ISO date string
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(obj)) {
            return new Date(obj);
          }
          return obj;
        }
        
        if (Array.isArray(obj)) {
          return obj.map(convertTimestamps);
        }
        
        if (typeof obj === 'object') {
          const converted: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (key.includes('At') && typeof value === 'string') {
              // Skip comment createdAt fields - they should remain as strings
              if (key === 'createdAt' && obj.hasOwnProperty('content') && obj.hasOwnProperty('username')) {
                converted[key] = value; // Keep as string for comments
              } else {
                // Convert timestamp fields for other objects
                converted[key] = new Date(value);
              }
            } else {
              converted[key] = convertTimestamps(value);
            }
          }
          return converted;
        }
        
        return obj;
      };
      
      // Process all updates to convert timestamps
      const processedUpdates = convertTimestamps({ ...updates });
      
      const [board] = await db
        .update(boardsTable)
        .set({
          ...processedUpdates,
          updatedAt: new Date() // Always set a fresh timestamp
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

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
      return user;
    } catch (error) {
      console.error('[Storage] Error getting user by Firebase UID:', error);
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

  // Team member methods
  async getTeamMembers(organizationId: number): Promise<(TeamMember & { user?: { username: string, email: string } })[]> {
    try {
      console.log('[Storage] Getting team members for organization:', organizationId);
      const results = await db
        .select()
        .from(teamMembers)
        .leftJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.organizationId, organizationId))
        .orderBy(desc(teamMembers.invitedBy));
      
      return results.map(row => ({
        ...row.team_members,
        user: row.users ? { 
          username: row.users.username, 
          email: row.users.email 
        } : undefined
      }));
    } catch (error) {
      console.error('[Storage] Error getting team members:', error);
      throw error;
    }
  }

  async inviteTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    try {
      console.log('[Storage] Inviting team member:', member.email);
      const [teamMember] = await db
        .insert(teamMembers)
        .values({
          ...member,
          invitedAt: new Date()
        })
        .returning();
      return teamMember;
    } catch (error) {
      console.error('[Storage] Error inviting team member:', error);
      throw error;
    }
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    try {
      console.log('[Storage] Getting team member:', id);
      const [member] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, id));
      return member;
    } catch (error) {
      console.error('[Storage] Error getting team member:', error);
      throw error;
    }
  }

  async updateTeamMember(id: number, updates: Partial<TeamMember>): Promise<TeamMember> {
    try {
      const [member] = await db
        .update(teamMembers)
        .set(updates)
        .where(eq(teamMembers.id, id))
        .returning();
      return member;
    } catch (error) {
      console.error('[Storage] Error updating team member:', error);
      throw error;
    }
  }

  async removeTeamMember(id: number): Promise<void> {
    try {
      console.log('[Storage] Removing team member:', id);
      
      await db
        .delete(teamMembers)
        .where(eq(teamMembers.id, id));
      console.log('[Storage] Team member removed successfully');
    } catch (error) {
      console.error('[Storage] Error removing team member:', error);
      throw error;
    }
  }

  async cancelPendingInvitation(id: number): Promise<void> {
    try {
      console.log('[Storage] Cancelling pending invitation:', id);
      
      await db
        .delete(pendingInvitations)
        .where(eq(pendingInvitations.id, id));
      console.log('[Storage] Pending invitation cancelled successfully');
    } catch (error) {
      console.error('[Storage] Error cancelling pending invitation:', error);
      throw error;
    }
  }

  // Pending invitation methods
  async createPendingInvitation(invitation: InsertPendingInvitation): Promise<PendingInvitation> {
    try {
      console.log('[Storage] Creating pending invitation for:', invitation.email);
      const [pendingInvitation] = await db
        .insert(pendingInvitations)
        .values({
          ...invitation,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        })
        .returning();
      return pendingInvitation;
    } catch (error) {
      console.error('[Storage] Error creating pending invitation:', error);
      throw error;
    }
  }

  async getPendingInvitationByToken(token: string): Promise<PendingInvitation | undefined> {
    try {
      const [invitation] = await db
        .select()
        .from(pendingInvitations)
        .where(eq(pendingInvitations.token, token));
      return invitation;
    } catch (error) {
      console.error('[Storage] Error getting pending invitation by token:', error);
      throw error;
    }
  }

  async getPendingInvitations(organizationId: number): Promise<PendingInvitation[]> {
    try {
      const invitations = await db
        .select()
        .from(pendingInvitations)
        .where(and(
          eq(pendingInvitations.organizationId, organizationId),
          eq(pendingInvitations.status, 'pending')
        ))
        .orderBy(desc(pendingInvitations.createdAt));
      return invitations;
    } catch (error) {
      console.error('[Storage] Error getting pending invitations:', error);
      throw error;
    }
  }

  async resendInvitation(invitationId: number): Promise<PendingInvitation | null> {
    try {
      console.log('[Storage] Resending invitation:', invitationId);
      
      // Get the invitation details
      const [invitation] = await db
        .select()
        .from(pendingInvitations)
        .where(eq(pendingInvitations.id, invitationId));
      
      if (!invitation) {
        console.log('[Storage] Invitation not found:', invitationId);
        return null;
      }
      
      // Generate new token and extend expiry
      const newToken = Buffer.from(`${invitation.email}-${Date.now()}-${Math.random()}`).toString('base64url');
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      // Update the invitation with new token and expiry
      const [updatedInvitation] = await db
        .update(pendingInvitations)
        .set({
          token: newToken,
          expiresAt: newExpiresAt,
          updatedAt: new Date()
        })
        .where(eq(pendingInvitations.id, invitationId))
        .returning();
      
      console.log('[Storage] Invitation resent successfully:', updatedInvitation.email);
      return updatedInvitation;
    } catch (error) {
      console.error('[Storage] Error resending invitation:', error);
      throw error;
    }
  }

  async acceptPendingInvitation(token: string, userId: number): Promise<void> {
    try {
      await db
        .update(pendingInvitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date()
        })
        .where(eq(pendingInvitations.token, token));
    } catch (error) {
      console.error('[Storage] Error accepting pending invitation:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('[Storage] Error getting user by email:', error);
      throw error;
    }
  }

  // Board permission methods
  async grantBoardPermission(permission: InsertBoardPermission): Promise<BoardPermission> {
    try {
      console.log('[Storage] Granting board permission:', permission);
      const [boardPermission] = await db
        .insert(boardPermissions)
        .values({
          ...permission,
          grantedAt: new Date()
        })
        .returning();
      return boardPermission;
    } catch (error) {
      console.error('[Storage] Error granting board permission:', error);
      throw error;
    }
  }

  async revokeBoardPermission(boardId: number, userId: number): Promise<void> {
    try {
      await db
        .delete(boardPermissions)
        .where(
          and(
            eq(boardPermissions.boardId, boardId),
            eq(boardPermissions.userId, userId)
          )
        );
    } catch (error) {
      console.error('[Storage] Error revoking board permission:', error);
      throw error;
    }
  }

  async updateLastAccess(userId: number, boardId?: number): Promise<void> {
    try {
      const now = new Date();
      
      // Update team member last access
      await db
        .update(teamMembers)
        .set({ lastAccessAt: now })
        .where(eq(teamMembers.userId, userId));
      
      // Update board permission last access if boardId provided
      if (boardId) {
        await db
          .update(boardPermissions)
          .set({ lastAccessAt: now })
          .where(
            and(
              eq(boardPermissions.boardId, boardId),
              eq(boardPermissions.userId, userId)
            )
          );
      }
    } catch (error) {
      console.error('[Storage] Error updating last access:', error);
      throw error;
    }
  }

  // Sheet Document methods
  async getSheetDocuments(boardId: number): Promise<SheetDocument[]> {
    try {
      console.log('[Storage] Getting sheet documents for board:', boardId);
      return await db
        .select()
        .from(sheetDocuments)
        .where(eq(sheetDocuments.boardId, boardId))
        .orderBy(desc(sheetDocuments.createdAt));
    } catch (error) {
      console.error('[Storage] Error getting sheet documents:', error);
      throw error;
    }
  }

  async getSheetDocument(id: string): Promise<SheetDocument | undefined> {
    try {
      console.log('[Storage] Getting sheet document:', id);
      const [doc] = await db
        .select()
        .from(sheetDocuments)
        .where(eq(sheetDocuments.id, id));
      return doc;
    } catch (error) {
      console.error('[Storage] Error getting sheet document:', error);
      throw error;
    }
  }

  async createSheetDocument(boardId: number, document: { name: string, sheetId: string }): Promise<SheetDocument> {
    try {
      console.log('[Storage] Creating sheet document:', document);
      
      // Create a unique ID for the document
      const id = `sheet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const [sheetDoc] = await db.insert(sheetDocuments).values({
        id,
        boardId,
        name: document.name,
        sheetId: document.sheetId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      if (!sheetDoc) {
        throw new Error('Failed to create sheet document');
      }

      console.log('[Storage] Created sheet document:', sheetDoc);
      return sheetDoc;
    } catch (error) {
      console.error('[Storage] Error creating sheet document:', error);
      throw error;
    }
  }

  async updateSheetDocument(id: string, updates: Partial<SheetDocument>): Promise<SheetDocument> {
    try {
      console.log('[Storage] Updating sheet document:', id, updates);
      const [sheetDoc] = await db
        .update(sheetDocuments)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(sheetDocuments.id, id))
        .returning();

      if (!sheetDoc) {
        throw new Error('Sheet document not found');
      }

      return sheetDoc;
    } catch (error) {
      console.error('[Storage] Error updating sheet document:', error);
      throw error;
    }
  }

  async deleteSheetDocument(id: string): Promise<void> {
    try {
      console.log('[Storage] Deleting sheet document:', id);
      await db.delete(sheetDocuments).where(eq(sheetDocuments.id, id));
    } catch (error) {
      console.error('[Storage] Error deleting sheet document:', error);
      throw error;
    }
  }

  // Project Sheet Document methods
  async getProjectSheetDocuments(projectId: number): Promise<ProjectSheetDocument[]> {
    try {
      console.log('[Storage] Getting project sheet documents for project:', projectId);
      return await db
        .select()
        .from(projectSheetDocuments)
        .where(eq(projectSheetDocuments.projectId, projectId))
        .orderBy(desc(projectSheetDocuments.createdAt));
    } catch (error) {
      console.error('[Storage] Error getting project sheet documents:', error);
      throw error;
    }
  }

  async createProjectSheetDocument(insertDoc: InsertProjectSheetDocument & { id: string }): Promise<ProjectSheetDocument> {
    try {
      console.log('[Storage] Creating project sheet document:', insertDoc);
      const [sheetDoc] = await db.insert(projectSheetDocuments).values({
        id: insertDoc.id,
        projectId: insertDoc.projectId,
        name: insertDoc.name,
        sheetId: insertDoc.sheetId,
        url: insertDoc.url,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      if (!sheetDoc) {
        throw new Error('Failed to create project sheet document');
      }

      console.log('[Storage] Created project sheet document:', sheetDoc);
      return sheetDoc;
    } catch (error) {
      console.error('[Storage] Error creating project sheet document:', error);
      throw error;
    }
  }

  async deleteProjectSheetDocument(id: string): Promise<void> {
    try {
      console.log('[Storage] Deleting project sheet document:', id);
      await db.delete(projectSheetDocuments).where(eq(projectSheetDocuments.id, id));
    } catch (error) {
      console.error('[Storage] Error deleting project sheet document:', error);
      throw error;
    }
  }

  // Notification methods
  async createNotification(notification: any): Promise<any> {
    try {
      const notificationId = crypto.randomUUID();
      const toUserId = notification.userId || notification.toUserId;
      const notificationType = notification.type;
      const title = notification.title;
      const message = notification.message;
      const isRead = notification.read || false;
      
      const values = [
        notificationId,
        toUserId,
        notificationType,
        title,
        message,
        isRead
      ];
      
      // Use neon SQL client with string query and parameters array
      const query = `
        INSERT INTO notifications (id, to_user_id, type, title, message, read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;
      
      const result = await neonSql(query, values);
      return result[0];
    } catch (error) {
      console.error('[Storage] Error creating notification:', error);
      console.error('[Storage] Error name:', error.name);
      console.error('[Storage] Error message:', error.message);
      console.error('[Storage] Error code:', error.code);
      throw error;
    }
  }

  async getUserNotifications(userId: number, unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      console.log(`[Storage] === GETTING NOTIFICATIONS FOR USER ${userId} ===`);
      console.log(`[Storage] unreadOnly: ${unreadOnly}`);
      
      const whereConditions = [eq(notifications.toUserId, userId)];
      if (unreadOnly) {
        whereConditions.push(eq(notifications.read, false));
      }
      
      console.log('[Storage] About to execute Drizzle query...');
      const results = await db
        .select()
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt));
      
      console.log(`[Storage] Drizzle query completed. Retrieved ${results.length} notifications for user ${userId}`);
      if (results.length > 0) {
        console.log('[Storage] Sample notification structure:', {
          id: results[0].id,
          toUserId: results[0].toUserId,
          type: results[0].type,
          title: results[0].title,
          message: results[0].message,
          read: results[0].read
        });
      } else {
        console.log('[Storage] No notifications found - checking raw database...');
        // Fallback direct SQL query to debug - using parameterized query to prevent SQL injection
        const rawResult = await db.execute(sql`SELECT * FROM notifications WHERE to_user_id = ${userId} LIMIT 1`);
        console.log('[Storage] Raw SQL result:', rawResult);
      }
      
      return results;
    } catch (error) {
      console.error('[Storage] Error getting user notifications:', error);
      console.error('[Storage] Error details:', error.message);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      console.log('[Storage] Marking notification as read:', notificationId);
      await db
        .update(notifications)
        .set({ 
          read: true, 
          readAt: new Date() 
        })
        .where(eq(notifications.id, notificationId));
    } catch (error) {
      console.error('[Storage] Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      console.log('[Storage] Marking all notifications as read for user:', userId);
      await db
        .update(notifications)
        .set({ 
          read: true, 
          readAt: new Date() 
        })
        .where(
          and(
            eq(notifications.toUserId, userId),
            eq(notifications.read, false)
          )
        );
    } catch (error) {
      console.error('[Storage] Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: number): Promise<void> {
    try {
      console.log('[Storage] Deleting notification:', notificationId);
      await db
        .delete(notifications)
        .where(eq(notifications.id, notificationId));
    } catch (error) {
      console.error('[Storage] Error deleting notification:', error);
      throw error;
    }
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    try {
      console.log('[Storage] Getting unread notification count for user:', userId);
      const result = await db
        .select({ count: count(notifications.id) })
        .from(notifications)
        .where(
          and(
            eq(notifications.toUserId, userId),
            eq(notifications.read, false)
          )
        );
      return result[0]?.count || 0;
    } catch (error) {
      console.error('[Storage] Error getting unread notification count:', error);
      throw error;
    }
  }

  // Project member methods
  async getProjectMembers(projectId: number): Promise<(ProjectMember & { user?: { username: string, email: string } })[]> {
    try {
      console.log('[Storage] Getting project members for:', projectId);
      const results = await db
        .select()
        .from(projectMembers)
        .leftJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, projectId))
        .orderBy(desc(projectMembers.invitedAt));
      
      return results.map(row => ({
        ...row.project_members,
        user: row.users ? {
          username: row.users.username,
          email: row.users.email
        } : undefined
      }));
    } catch (error) {
      console.error('[Storage] Error getting project members:', error);
      throw error;
    }
  }

  async addProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
    try {
      console.log('[Storage] Adding project member:', member);
      const [result] = await db
        .insert(projectMembers)
        .values(member)
        .returning();
      return result;
    } catch (error) {
      console.error('[Storage] Error adding project member:', error);
      throw error;
    }
  }

  async removeProjectMember(projectId: number, userId: number): Promise<void> {
    try {
      console.log('[Storage] Removing project member:', { projectId, userId });
      await db
        .delete(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userId)
          )
        );
    } catch (error) {
      console.error('[Storage] Error removing project member:', error);
      throw error;
    }
  }

  async updateProjectMemberRole(projectId: number, userId: number, role: string): Promise<void> {
    try {
      console.log('[Storage] Updating project member role:', { projectId, userId, role });
      await db
        .update(projectMembers)
        .set({ role })
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userId)
          )
        );
    } catch (error) {
      console.error('[Storage] Error updating project member role:', error);
      throw error;
    }
  }

  // Flagged blocks methods
  async flagBlock(flaggedBlock: InsertFlaggedBlock): Promise<FlaggedBlock> {
    try {
      console.log('[Storage] Flagging block:', flaggedBlock);
      const [result] = await db
        .insert(flaggedBlocks)
        .values(flaggedBlock)
        .returning();
      return result;
    } catch (error) {
      console.error('[Storage] Error flagging block:', error);
      throw error;
    }
  }

  async unflagBlock(boardId: number, blockId: string, userId: number): Promise<void> {
    try {
      console.log('[Storage] Unflagging block:', { boardId, blockId, userId });
      await db
        .delete(flaggedBlocks)
        .where(
          and(
            eq(flaggedBlocks.boardId, boardId),
            eq(flaggedBlocks.blockId, blockId),
            eq(flaggedBlocks.userId, userId)
          )
        );
    } catch (error) {
      console.error('[Storage] Error unflagging block:', error);
      throw error;
    }
  }

  async getFlaggedBlocks(userId: number): Promise<(FlaggedBlock & { board: { name: string } })[]> {
    try {
      console.log('[Storage] Getting flagged blocks for user:', userId);
      const results = await db
        .select({
          id: flaggedBlocks.id,
          boardId: flaggedBlocks.boardId,
          blockId: flaggedBlocks.blockId,
          userId: flaggedBlocks.userId,
          reason: flaggedBlocks.reason,
          createdAt: flaggedBlocks.createdAt,
          resolvedAt: flaggedBlocks.resolvedAt,
          resolved: flaggedBlocks.resolved,
          boardName: boardsTable.name
        })
        .from(flaggedBlocks)
        .innerJoin(boardsTable, eq(flaggedBlocks.boardId, boardsTable.id))
        .where(and(
          eq(flaggedBlocks.userId, userId),
          eq(flaggedBlocks.resolved, false)
        ))
        .orderBy(desc(flaggedBlocks.createdAt));
      
      return results.map(result => ({
        id: result.id,
        boardId: result.boardId,
        blockId: result.blockId,
        userId: result.userId,
        reason: result.reason,
        createdAt: result.createdAt,
        resolvedAt: result.resolvedAt,
        resolved: result.resolved,
        board: {
          name: result.boardName
        }
      }));
    } catch (error) {
      console.error('[Storage] Error getting flagged blocks:', error);
      throw error;
    }
  }

  async resolveFlaggedBlock(flaggedBlockId: number): Promise<void> {
    try {
      console.log('[Storage] Resolving flagged block:', flaggedBlockId);
      await db
        .update(flaggedBlocks)
        .set({
          resolved: true,
          resolvedAt: new Date()
        })
        .where(eq(flaggedBlocks.id, flaggedBlockId));
    } catch (error) {
      console.error('[Storage] Error resolving flagged block:', error);
      throw error;
    }
  }

  async deleteFlaggedBlock(flaggedBlockId: number): Promise<void> {
    try {
      console.log('[Storage] Deleting flagged block:', flaggedBlockId);
      await db
        .delete(flaggedBlocks)
        .where(eq(flaggedBlocks.id, flaggedBlockId));
    } catch (error) {
      console.error('[Storage] Error deleting flagged block:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();