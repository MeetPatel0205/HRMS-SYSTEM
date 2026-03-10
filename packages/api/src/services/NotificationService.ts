import { PrismaClient, Notification, Prisma } from '@prisma/client';
import { WebSocketService } from './WebSocketService';

const prisma = new PrismaClient();

export class NotificationService {
  private wsService: WebSocketService;

  constructor(wsService?: WebSocketService) {
    this.wsService = wsService || WebSocketService.getInstance();
  }

  /**
   * Create a notification
   */
  async createNotification(
    data: Prisma.NotificationCreateInput
  ): Promise<Notification> {
    const notification = await prisma.notification.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Send real-time notification via WebSocket
    this.wsService.sendNotification(data.user.connect?.id || '', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt,
    });

    return notification;
  }

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(
    userIds: string[],
    notificationData: {
      type: string;
      title: string;
      message: string;
      data?: any;
    }
  ): Promise<number> {
    const notifications = userIds.map((userId) => ({
      userId,
      ...notificationData,
    }));

    const result = await prisma.notification.createMany({
      data: notifications,
    });

    // Send real-time notifications
    userIds.forEach((userId) => {
      this.wsService.sendNotification(userId, {
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        createdAt: new Date(),
      });
    });

    return result.count;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    filters?: {
      read?: boolean;
      type?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ notifications: Notification[]; total: number }> {
    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (filters?.read !== undefined) {
      where.read = filters.read;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Delete old notifications
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        read: true,
      },
    });

    return result.count;
  }

  /**
   * Send notification to role
   */
  async sendToRole(
    roleName: string,
    notificationData: {
      type: string;
      title: string;
      message: string;
      data?: any;
    }
  ): Promise<number> {
    const users = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: roleName,
            },
          },
        },
      },
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);
    return this.createBulkNotifications(userIds, notificationData);
  }

  /**
   * Send notification to tenant
   */
  async sendToTenant(
    tenantId: string,
    notificationData: {
      type: string;
      title: string;
      message: string;
      data?: any;
    }
  ): Promise<number> {
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);
    return this.createBulkNotifications(userIds, notificationData);
  }
}
