import { db } from "./db";
import { notifications, boardComments, users, teamMembers, boards } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InsertNotification, Notification, InsertBoardComment, BoardComment } from "@shared/schema";

export class NotificationService {
  // Create a notification
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  // Get notifications for a user
  async getUserNotifications(userId: number, limit = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  // Get unread notification count
  async getUnreadCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    
    return result.length;
  }

  // Mark notification as read
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  // Create team invitation notification
  async createTeamInvitationNotification(
    inviteeUserId: number,
    inviterUserId: number,
    inviterName: string,
    teamName: string
  ): Promise<Notification> {
    return await this.createNotification({
      userId: inviteeUserId,
      type: 'team_invitation',
      title: 'Team Invitation',
      message: `${inviterName} invited you to join ${teamName}`,
      data: {
        inviterUserId,
        inviterName,
        teamName
      },
      actionUrl: '/team',
      createdBy: inviterUserId
    });
  }

  // Create comment mention notification
  async createCommentMentionNotification(
    mentionedUserId: number,
    commenterUserId: number,
    commenterName: string,
    boardId: number,
    boardName: string,
    commentContent: string
  ): Promise<Notification> {
    return await this.createNotification({
      userId: mentionedUserId,
      type: 'comment_mention',
      title: 'You were mentioned in a comment',
      message: `${commenterName} mentioned you in a comment on ${boardName}`,
      data: {
        commenterUserId,
        commenterName,
        boardId,
        boardName,
        commentContent: commentContent.substring(0, 100) + (commentContent.length > 100 ? '...' : '')
      },
      actionUrl: `/board/${boardId}`,
      createdBy: commenterUserId
    });
  }

  // Create comment with @mentions
  async createCommentWithMentions(comment: InsertBoardComment): Promise<BoardComment> {
    const [created] = await db.insert(boardComments).values({
      boardId: comment.boardId,
      userId: comment.userId,
      content: comment.content,
      blockId: comment.blockId || null,
      mentions: comment.mentions || null,
      parentId: comment.parentId || null,
      resolved: comment.resolved || false
    }).returning();
    
    // Process mentions if they exist
    if (comment.mentions && comment.mentions.length > 0) {
      // Get board info
      const [board] = await db.select({ name: boards.name }).from(boards).where(eq(boards.id, comment.boardId));

      // Get commenter info
      const [commenter] = await db.select({ 
        email: users.email, 
        firstName: users.firstName, 
        lastName: users.lastName 
      }).from(users).where(eq(users.id, comment.userId));

      if (board && commenter) {
        const commenterName = commenter.firstName && commenter.lastName 
          ? `${commenter.firstName} ${commenter.lastName}`
          : commenter.email;

        // Create notifications for each mentioned user
        for (const mentionedUserId of comment.mentions) {
          if (mentionedUserId !== comment.userId) { // Don't notify the commenter
            await this.createCommentMentionNotification(
              mentionedUserId,
              comment.userId,
              commenterName,
              comment.boardId,
              board.name,
              comment.content
            );
          }
        }
      }
    }

    return created;
  }

  // Get comments for a board
  async getBoardComments(boardId: number): Promise<BoardComment[]> {
    return await db
      .select()
      .from(boardComments)
      .where(eq(boardComments.boardId, boardId))
      .orderBy(desc(boardComments.createdAt));
  }

  // Parse @mentions from comment content
  parseMentions(content: string, teamUserIds: number[]): number[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: number[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      // For now, we'll need to look up users by email/username
      // This is a simplified version - in practice you'd want a more robust user lookup
      teamUserIds.forEach(userId => {
        if (!mentions.includes(userId)) {
          mentions.push(userId);
        }
      });
    }

    return mentions;
  }

  // Handle team member acceptance
  async handleTeamMemberAccepted(
    newMemberUserId: number,
    inviterUserId: number,
    newMemberName: string,
    teamName: string
  ): Promise<Notification> {
    return await this.createNotification({
      userId: inviterUserId,
      type: 'team_invitation',
      title: 'Team Member Joined',
      message: `${newMemberName} has joined ${teamName}`,
      data: {
        newMemberUserId,
        newMemberName,
        teamName
      },
      actionUrl: '/team',
      createdBy: newMemberUserId
    });
  }
}

export const notificationService = new NotificationService();