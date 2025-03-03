import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const blockSchema = z.object({
  id: z.string(),
  type: z.enum(['touchpoint', 'role', 'process', 'pitfall', 'policy', 'technology', 'rationale', 'question', 'note']),
  content: z.string(),
  phaseIndex: z.number(),
  columnIndex: z.number()
});

export type Block = z.infer<typeof blockSchema>;

export const columnSchema = z.object({
  id: z.string(),
  name: z.string()
});

export type Column = z.infer<typeof columnSchema>;

export const phaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.array(columnSchema)
});

export type Phase = z.infer<typeof phaseSchema>;

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: text("created_at").notNull()
});

export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  blocks: jsonb("blocks").$type<Block[]>().notNull(),
  phases: jsonb("phases").$type<Phase[]>().notNull(),
  userId: serial("user_id").references(() => users.id).notNull(),
  createdAt: text("created_at").notNull()
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertBoardSchema = createInsertSchema(boards).omit({ id: true, userId: true });
export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type Board = typeof boards.$inferSelect;