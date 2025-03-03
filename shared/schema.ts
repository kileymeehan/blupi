import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const blockSchema = z.object({
  id: z.string(),
  type: z.enum(['touchpoint', 'role', 'process', 'pitfall', 'policy', 'technology', 'rationale', 'question', 'note']),
  content: z.string(),
  columnIndex: z.number(),
  rowIndex: z.number()
});

export type Block = z.infer<typeof blockSchema>;

export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  blocks: jsonb("blocks").$type<Block[]>().notNull(),
  phases: jsonb("phases").$type<string[]>().notNull(),
  numColumns: integer("num_columns").notNull()
});

export const insertBoardSchema = createInsertSchema(boards).omit({ id: true });
export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type Board = typeof boards.$inferSelect;
