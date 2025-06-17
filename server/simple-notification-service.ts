import { pool } from "./db";

export interface SimpleNotification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export class SimpleNotificationService {
  async createNotification(
    userId: number,
    type: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<SimpleNotification> {
    const result = await pool.query(`
      INSERT INTO notifications (to_user_id, type, title, message, read, created_at)
      VALUES ($1, $2, $3, $4, false, NOW())
      RETURNING id, to_user_id as "userId", type, title, message, read, created_at as "createdAt"
    `, [userId, type, title, message]);
    
    return result.rows[0];
  }

  async getUserNotifications(userId: number): Promise<SimpleNotification[]> {
    try {
      const result = await pool.query(`
        SELECT id, to_user_id as "userId", type, title, message, read, 
               created_at as "createdAt"
        FROM notifications 
        WHERE to_user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 50
      `, [userId]);
      
      return result.rows || [];
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM notifications 
        WHERE to_user_id = $1 AND read = false
      `, [userId]);
      
      if (result && result.rows && result.rows[0]) {
        return parseInt(result.rows[0].count);
      }
      return 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  async markAsRead(notificationId: number, userId: number): Promise<void> {
    await pool.query(`
      UPDATE notifications 
      SET read = true, read_at = NOW()
      WHERE id = $1 AND to_user_id = $2
    `, [notificationId, userId]);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await pool.query(`
      UPDATE notifications 
      SET read = true, read_at = NOW()
      WHERE to_user_id = $1 AND read = false
    `, [userId]);
  }

  async createTeamInvitationNotification(
    inviteeUserId: number,
    inviterName: string,
    teamName: string
  ): Promise<SimpleNotification> {
    return await this.createNotification(
      inviteeUserId,
      'team_invitation',
      'Team Invitation',
      `${inviterName} invited you to join ${teamName}`,
      '/team'
    );
  }

  async createCommentMentionNotification(
    mentionedUserId: number,
    commenterName: string,
    boardName: string,
    boardId: number
  ): Promise<SimpleNotification> {
    return await this.createNotification(
      mentionedUserId,
      'comment_mention',
      'You were mentioned in a comment',
      `${commenterName} mentioned you in a comment on ${boardName}`,
      `/board/${boardId}`
    );
  }
}

export const simpleNotificationService = new SimpleNotificationService();