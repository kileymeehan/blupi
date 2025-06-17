import { pgTable, text, serial, jsonb, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from 'drizzle-orm';
import { users, boards } from './schema';

// Notifications schema - for all types of notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(), // Who receives the notification
  type: text("type").notNull(), // 'team_invitation', 'comment_mention', 'board_shared', 'project_shared'
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // Additional data specific to notification type
  read: boolean("read").notNull().default(false),
  actionUrl: text("action_url"), // URL to navigate to when clicking notification
  createdBy: integer("created_by").references(() => users.id), // Who triggered the notification
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at")
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [notifications.createdBy],
    references: [users.id],
  })
}));

export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({ id: true, createdAt: true, readAt: true });

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Comments schema - for board comments with @mentions
export const boardComments = pgTable("board_comments", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => boards.id).notNull(),
  blockId: text("block_id"), // Optional: specific block this comment is attached to
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  mentions: jsonb("mentions").$type<number[]>(), // Array of user IDs mentioned in the comment
  parentId: integer("parent_id").references(() => boardComments.id), // For reply threading
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