import { pgTable, text, serial, jsonb, integer, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from 'drizzle-orm';

// Organizations table - the tenant anchor for multi-tenancy
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  settings: jsonb("settings").$type<OrganizationSettings>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export type OrganizationSettings = {
  logoUrl?: string;
  primaryColor?: string;
  allowPublicBoards?: boolean;
};

export const insertOrganizationSchema = createInsertSchema(organizations)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// User-Organization membership - tracks which orgs users belong to
export const userOrganizations = pgTable("user_organizations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  role: text("role").notNull().default('member'),
  isActive: boolean("is_active").notNull().default(false),
  joinedAt: timestamp("joined_at").defaultNow().notNull()
});

export const userOrganizationsRelations = relations(userOrganizations, ({ one }) => ({
  user: one(users, {
    fields: [userOrganizations.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [userOrganizations.organizationId],
    references: [organizations.id],
  })
}));

export const insertUserOrganizationSchema = createInsertSchema(userOrganizations)
  .omit({ id: true, joinedAt: true });

export type InsertUserOrganization = z.infer<typeof insertUserOrganizationSchema>;
export type UserOrganization = typeof userOrganizations.$inferSelect;

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  firebaseUid: text("firebase_uid").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  boards: many(boards)
}));

export const insertUserSchema = createInsertSchema(users)
  .extend({
    password: z.string().min(8, "Password must be at least 8 characters")
  })
  .omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default('#4F46E5'),
  status: text("status").notNull().default('draft'),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  boards: many(boards),
  members: many(projectMembers)
}));

// Project members schema
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default('pending'),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at")
});

export const insertProjectMemberSchema = createInsertSchema(projectMembers)
  .omit({ id: true, invitedAt: true, acceptedAt: true });

export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  })
}));

// Board schema
export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  segments: text("segments"),
  blocks: jsonb("blocks").$type<Block[]>().notNull().default([]),
  phases: jsonb("phases").$type<Phase[]>().notNull().default([]),
  status: text("status").notNull().default('draft'),
  projectId: integer("project_id").references(() => projects.id), // Made optional for blueprint-first approach
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const boardsRelations = relations(boards, ({ one, many }) => ({
  project: one(projects, {
    fields: [boards.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [boards.userId],
    references: [users.id],
  }),
  permissions: many(boardPermissions)
}));

// Board permissions schema - tracks who can access each board
export const boardPermissions = pgTable("board_permissions", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => boards.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull().default('viewer'), // 'owner', 'editor', 'viewer'
  grantedBy: integer("granted_by").references(() => users.id).notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  lastAccessAt: timestamp("last_access_at")
});

export const boardPermissionsRelations = relations(boardPermissions, ({ one }) => ({
  board: one(boards, {
    fields: [boardPermissions.boardId],
    references: [boards.id],
  }),
  user: one(users, {
    fields: [boardPermissions.userId],
    references: [users.id],
  }),
  grantedByUser: one(users, {
    fields: [boardPermissions.grantedBy],
    references: [users.id],
  })
}));

export const insertBoardPermissionSchema = createInsertSchema(boardPermissions)
  .omit({ id: true, grantedAt: true, lastAccessAt: true });

export type InsertBoardPermission = z.infer<typeof insertBoardPermissionSchema>;
export type BoardPermission = typeof boardPermissions.$inferSelect;

// Team members schema - organization-level team management
// Note: organizationId remains integer for backward compatibility with existing data
// Will be migrated to UUID reference in future migration
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  organizationUuid: uuid("organization_uuid").references(() => organizations.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  invitedBy: integer("invited_by").references(() => users.id).notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default('member'), // 'admin', 'member'
  status: text("status").notNull().default('pending'), // 'pending', 'active', 'inactive'
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  lastAccessAt: timestamp("last_access_at")
});

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  invitedByUser: one(users, {
    fields: [teamMembers.invitedBy],
    references: [users.id],
  })
}));

export const insertTeamMemberSchema = createInsertSchema(teamMembers)
  .omit({ id: true, invitedAt: true, acceptedAt: true, lastAccessAt: true });

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

// Pending invitations for users who haven't registered yet
// Note: organizationId remains integer for backward compatibility with existing data
export const pendingInvitations = pgTable("pending_invitations", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  organizationId: integer("organization_id").notNull(),
  organizationUuid: uuid("organization_uuid").references(() => organizations.id),
  invitedBy: integer("invited_by").references(() => users.id).notNull(),
  role: text("role").notNull().default('member'),
  teamName: text("team_name").notNull(),
  inviterName: text("inviter_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  status: text("status").notNull().default('pending') // 'pending', 'accepted', 'expired'
});

export const pendingInvitationsRelations = relations(pendingInvitations, ({ one }) => ({
  invitedByUser: one(users, {
    fields: [pendingInvitations.invitedBy],
    references: [users.id],
  })
}));

export const insertPendingInvitationSchema = createInsertSchema(pendingInvitations)
  .omit({ id: true, createdAt: true, acceptedAt: true });

export type InsertPendingInvitation = z.infer<typeof insertPendingInvitationSchema>;
export type PendingInvitation = typeof pendingInvitations.$inferSelect;

// Notifications schema - for all types of notifications
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  toUserId: integer("to_user_id").references(() => users.id).notNull(), // Who receives the notification
  type: text("type").notNull(), // 'team_invitation', 'comment_mention', 'board_shared', 'project_shared'
  title: text("title").notNull(),
  message: text("message").notNull(),
  meta: jsonb("meta"), // Additional data specific to notification type
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at")
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.toUserId],
    references: [users.id],
  })
}));

export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({ id: true, createdAt: true, readAt: true });

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Board comments schema - for comments with @mentions
export const boardComments = pgTable("board_comments", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => boards.id).notNull(),
  blockId: text("block_id"), // Optional: specific block this comment is attached to
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  mentions: jsonb("mentions").$type<number[]>(), // Array of user IDs mentioned in the comment
  parentId: integer("parent_id"), // For reply threading - self-reference
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const boardCommentsRelations = relations(boardComments, ({ one, many }) => ({
  board: one(boards, {
    fields: [boardComments.boardId],
    references: [boards.id],
  }),
  user: one(users, {
    fields: [boardComments.userId],
    references: [users.id],
  }),
  parent: one(boardComments, {
    fields: [boardComments.parentId],
    references: [boardComments.id],
    relationName: "parent"
  }),
  replies: many(boardComments, {
    relationName: "parent"
  })
}));

export const insertBoardCommentSchema = createInsertSchema(boardComments)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertBoardComment = z.infer<typeof insertBoardCommentSchema>;
export type BoardComment = typeof boardComments.$inferSelect;



// Legacy comment schema for board data compatibility
export const legacyCommentSchema = z.object({
  id: z.string(),
  content: z.string(),
  userId: z.number(),
  createdAt: z.string(),
  username: z.string(),
  completed: z.boolean().default(false)
});

export type LegacyComment = z.infer<typeof legacyCommentSchema>;

export const attachmentSchema = z.object({
  id: z.string(),
  type: z.enum(['link', 'image', 'video']),
  url: z.string().url('Invalid URL'),
  title: z.string().optional()
});

export type Attachment = z.infer<typeof attachmentSchema>;

export const emotionSchema = z.object({
  value: z.number().min(1).max(7), // 1-7 scale for emotional intensity
  color: z.string() // hex color for the emotion level
});

export type Emotion = z.infer<typeof emotionSchema>;

export const columnSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().optional(),
  storyboardPrompt: z.string().optional(),
  storyboardImageUrl: z.string().optional(),
  emotion: emotionSchema.optional() // Optional emotion for blueprint feature
});

export type Column = z.infer<typeof columnSchema>;

export const phaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.array(columnSchema),
  collapsed: z.boolean().optional().default(false),
  importedFromBoardId: z.number().optional() // Track if this phase was imported from another blueprint
});

export type Phase = z.infer<typeof phaseSchema>;

// Department schema
export const departmentSchema = z.enum([
  'Engineering',
  'Marketing',
  'Product',
  'Design',
  'Brand',
  'Support',
  'Sales',
  'Custom'
]);

export type Department = z.infer<typeof departmentSchema>;

// Define Google Sheets connection information schema
export const sheetsConnectionSchema = z.object({
  sheetId: z.string(),
  sheetName: z.string().optional(),
  cellRange: z.string(), // e.g., "A1", "B3:C4"
  label: z.string().optional(), // Optional label for the data
  lastUpdated: z.string().optional(), // ISO date string of last fetch
  formattedValue: z.string().optional() // Formatted value retrieved from the sheet
});

export type SheetsConnection = z.infer<typeof sheetsConnectionSchema>;

// Board-level Google Sheets documents
export const sheetDocuments = pgTable("sheet_documents", {
  id: text("id").primaryKey(),
  boardId: integer("board_id").references(() => boards.id).notNull(),
  name: text("name").notNull(),
  sheetId: text("sheet_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const sheetDocumentsRelations = relations(sheetDocuments, ({ one }) => ({
  board: one(boards, {
    fields: [sheetDocuments.boardId],
    references: [boards.id],
  })
}));

export const insertSheetDocumentSchema = createInsertSchema(sheetDocuments)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertSheetDocument = z.infer<typeof insertSheetDocumentSchema>;
export type SheetDocument = typeof sheetDocuments.$inferSelect;

// Project-level Google Sheets documents
export const projectSheetDocuments = pgTable("project_sheet_documents", {
  id: text("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  sheetId: text("sheet_id").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const projectSheetDocumentsRelations = relations(projectSheetDocuments, ({ one }) => ({
  project: one(projects, {
    fields: [projectSheetDocuments.projectId],
    references: [projects.id],
  })
}));

export const insertProjectSheetDocumentSchema = createInsertSchema(projectSheetDocuments)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertProjectSheetDocument = z.infer<typeof insertProjectSheetDocumentSchema>;
export type ProjectSheetDocument = typeof projectSheetDocuments.$inferSelect;

// Flagged blocks schema - tracks blocks that users have flagged for follow-up
export const flaggedBlocks = pgTable("flagged_blocks", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => boards.id).notNull(),
  blockId: text("block_id").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  reason: text("reason"), // Optional reason for flagging
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolved: boolean("resolved").notNull().default(false)
});

export const flaggedBlocksRelations = relations(flaggedBlocks, ({ one }) => ({
  board: one(boards, {
    fields: [flaggedBlocks.boardId],
    references: [boards.id],
  }),
  user: one(users, {
    fields: [flaggedBlocks.userId],
    references: [users.id],
  })
}));

export const insertFlaggedBlockSchema = createInsertSchema(flaggedBlocks)
  .omit({ id: true, createdAt: true, resolvedAt: true });

export type InsertFlaggedBlock = z.infer<typeof insertFlaggedBlockSchema>;
export type FlaggedBlock = typeof flaggedBlocks.$inferSelect;

// Now we can define blockSchema since its dependencies are defined
export const blockSchema = z.object({
  id: z.string(),
  type: z.enum(['touchpoint', 'email', 'pendo', 'role', 'process', 'friction', 'policy', 'technology', 'rationale', 'question', 'note', 'hidden', 'hypothesis', 'insight', 'metrics', 'experiment', 'video', 'front-stage', 'back-stage', 'custom-divider']),
  content: z.string(),
  phaseIndex: z.number(),
  columnIndex: z.number(),
  comments: z.array(legacyCommentSchema).optional().default([]),
  attachments: z.array(attachmentSchema).optional().default([]),
  notes: z.string().optional(),
  emoji: z.string().optional(),
  department: departmentSchema.optional(),
  customDepartment: z.string().optional(), // For when department is 'Custom'
  isDivider: z.boolean().optional().default(false), // To mark divider-style blocks
  sheetsConnection: sheetsConnectionSchema.optional(), // Google Sheets connection for metrics blocks
  experimentTarget: z.string().optional(), // Target value for experiment blocks
  flagged: z.boolean().optional().default(false), // Whether this block is flagged for follow-up
});

export type Block = z.infer<typeof blockSchema>;

// Project schemas
export const projectStatuses = ["draft", "in-progress", "review", "complete"] as const;

export const insertProjectSchema = createInsertSchema(projects)
  .extend({
    color: z.string().regex(/^#[0-9A-F]{6}([0-9A-F]{2})?$/i, "Invalid hex color"),
    status: z.enum(projectStatuses).optional(),
  })
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true });

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Board schemas
export const boardStatuses = ["draft", "in-progress", "review", "complete"] as const;

export const insertBoardSchema = createInsertSchema(boards)
  .extend({
    status: z.enum(boardStatuses).optional(),
    projectId: z.number().optional(), // Make projectId optional for blueprint-first approach
  })
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true });

export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type Board = typeof boards.$inferSelect;

