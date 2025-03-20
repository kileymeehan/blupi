import { pgTable, text, serial, jsonb, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from 'drizzle-orm';

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  boards: many(boards)
}));

// Add the missing user schema exports
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
  blocks: jsonb("blocks").$type<Block[]>().notNull().default([]),
  phases: jsonb("phases").$type<Phase[]>().notNull().default([]),
  status: text("status").notNull().default('draft'),
  projectId: integer("project_id").references(() => projects.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const boardsRelations = relations(boards, ({ one }) => ({
  project: one(projects, {
    fields: [boards.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [boards.userId],
    references: [users.id],
  })
}));

// Project schemas
export const projectStatuses = ["draft", "in-progress", "review", "complete"] as const;

export const insertProjectSchema = createInsertSchema(projects)
  .extend({
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
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
  })
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true });

export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type Board = typeof boards.$inferSelect;

// Other schemas remain unchanged
export const commentSchema = z.object({
  id: z.string(),
  content: z.string(),
  userId: z.number(),
  createdAt: z.string(),
  username: z.string(),
  completed: z.boolean().default(false)
});

export type Comment = z.infer<typeof commentSchema>;

export const attachmentSchema = z.object({
  id: z.string(),
  type: z.enum(['link', 'image', 'video']),
  url: z.string().url('Invalid URL'),
  title: z.string().optional()
});

export type Attachment = z.infer<typeof attachmentSchema>;

// Block schemas
export const blockSchema = z.object({
  id: z.string(),
  type: z.enum(['touchpoint', 'email', 'pendo', 'role', 'process', 'friction', 'policy', 'technology', 'rationale', 'question', 'note', 'hidden']),
  content: z.string(),
  phaseIndex: z.number(),
  columnIndex: z.number(),
  comments: z.array(commentSchema).optional().default([]),
  attachments: z.array(attachmentSchema).optional().default([]),
  notes: z.string().optional(),
  emojis: z.array(z.string()).optional().default([])
});

export type Block = z.infer<typeof blockSchema>;

export const columnSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().optional()
});

export type Column = z.infer<typeof columnSchema>;

export const phaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.array(columnSchema)
});

export type Phase = z.infer<typeof phaseSchema>;