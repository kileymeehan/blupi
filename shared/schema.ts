import { pgTable, text, serial, jsonb, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertUserSchema = createInsertSchema(users)
  .extend({
    password: z.string().min(8, "Password must be at least 8 characters")
  })
  .omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Project members schema
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default('pending'),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export const insertProjectMemberSchema = createInsertSchema(projectMembers)
  .extend({
    role: z.enum(["viewer", "editor", "admin"]),
    status: z.enum(["pending", "accepted"]).optional(),
  })
  .omit({ id: true, invitedAt: true, acceptedAt: true });

export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;

// Project schema updated with status
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default('#4F46E5'),
  status: text("status").notNull().default('draft'),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const projectStatuses = ["draft", "in-progress", "review", "complete"] as const;

export const insertProjectSchema = createInsertSchema(projects)
  .extend({
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
    status: z.enum(projectStatuses).optional(),
  })
  .omit({ id: true, userId: true, createdAt: true });

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Board schema updated with status
export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  blocks: jsonb("blocks").$type<Block[]>().notNull().default([]),
  phases: jsonb("phases").$type<Phase[]>().notNull().default([]),
  status: text("status").notNull().default('draft'),
  projectId: integer("project_id").references(() => projects.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const boardStatuses = ["draft", "in-progress", "review", "complete"] as const;

export const insertBoardSchema = createInsertSchema(boards)
  .extend({
    status: z.enum(boardStatuses).optional(),
  })
  .omit({ id: true, userId: true, createdAt: true });

export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type Board = typeof boards.$inferSelect;

// Other schemas
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

export const blockSchema = z.object({
  id: z.string(),
  type: z.enum(['touchpoint', 'role', 'process', 'pitfall', 'policy', 'technology', 'rationale', 'question', 'note']),
  content: z.string(),
  phaseIndex: z.number(),
  columnIndex: z.number(),
  comments: z.array(commentSchema).optional().default([]),
  attachments: z.array(attachmentSchema).optional().default([]),
  notes: z.string().optional()
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