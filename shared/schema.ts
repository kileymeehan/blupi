import { pgTable, text, serial, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
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

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, userId: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Add comment schema before block schema
export const commentSchema = z.object({
  id: z.string(),
  content: z.string(),
  userId: z.number(),
  createdAt: z.string(),
  username: z.string()
});

export type Comment = z.infer<typeof commentSchema>;

// Update block schema to include comments
export const blockSchema = z.object({
  id: z.string(),
  type: z.enum(['touchpoint', 'role', 'process', 'pitfall', 'policy', 'technology', 'rationale', 'question', 'note']),
  content: z.string(),
  phaseIndex: z.number(),
  columnIndex: z.number(),
  comments: z.array(commentSchema).optional().default([])
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

// Board schema updated with project and user references
export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  blocks: jsonb("blocks").$type<Block[]>().notNull().default([]),
  phases: jsonb("phases").$type<Phase[]>().notNull().default([]),
  projectId: integer("project_id").references(() => projects.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertBoardSchema = createInsertSchema(boards).omit({ id: true, userId: true, createdAt: true });
export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type Board = typeof boards.$inferSelect;