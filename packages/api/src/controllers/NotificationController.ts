import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/NotificationService';
import { successResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async getUserNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { unreadOnly, limit } = req.query;
      
      const result = await this.notificationService.getUserNotifications(
        userId,
        {
          read: unreadOnly === 'true' ? false : undefined,
          limit: limit ? parseInt(limit as string) : undefined,
        }
      );
      
      successResponse(res, result, 'Notifications retrieved successfully');
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      return next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const count = await this.notificationService.getUnreadCount(userId);
      successResponse(res, { count }, 'Unread count retrieved successfully');
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const notification = await this.notificationService.markAsRead(id, userId);
      successResponse(res, notification, 'Notification marked as read');
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      await this.notificationService.markAllAsRead(userId);
      successResponse(res, null, 'All notifications marked as read');
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      return next(error);
    }
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await this.notificationService.deleteNotification(id, userId);
      successResponse(res, null, 'Notification deleted successfully');
    } catch (error) {
      logger.error('Error deleting notification:', error);
      return next(error);
    }
  }

  async sendToRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, title, message, type, data } = req.body;
      await this.notificationService.sendToRole(role, {
        type,
        title,
        message,
        data,
      });
      successResponse(res, null, 'Notifications sent to role successfully');
    } catch (error) {
      logger.error('Error sending notifications to role:', error);
      return next(error);
    }
  }

  async sendToTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, title, message, type, data } = req.body;
      await this.notificationService.sendToTenant(tenantId, {
        type,
        title,
        message,
        data,
      });
      successResponse(res, null, 'Notifications sent to tenant successfully');
    } catch (error) {
      logger.error('Error sending notifications to tenant:', error);
      return next(error);
    }
  }
}
