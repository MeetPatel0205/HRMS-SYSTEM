import { PrismaClient, Activity, Prisma } from '@prisma/client';
import { WebSocketService } from './WebSocketService';

const prisma = new PrismaClient();

export class ActivityService {
  private wsService: WebSocketService;

  constructor(wsService?: WebSocketService) {
    this.wsService = wsService || WebSocketService.getInstance();
  }

  /**
   * Log an activity
   */
  async logActivity(data: {
    userId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    description: string;
    metadata?: any;
  }): Promise<Activity> {
    const activity = await prisma.activity.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Send real-time activity update
    this.wsService.broadcastActivity({
      id: activity.id,
      userId: activity.userId,
      actorId: activity.actorId,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId,
      description: activity.description,
      metadata: activity.metadata,
      createdAt: activity.createdAt,
      actor: activity.actor,
    });

    return activity;
  }

  /**
   * Get user activity feed
   */
  async getUserActivityFeed(
    userId: string,
    filters?: {
      entityType?: string;
      action?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ activities: Activity[]; total: number }> {
    const where: Prisma.ActivityWhereInput = {
      userId,
    };

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      prisma.activity.count({ where }),
    ]);

    return { activities, total };
  }

  /**
   * Get global activity feed
   */
  async getGlobalActivityFeed(filters?: {
    entityType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ activities: Activity[]; total: number }> {
    const where: Prisma.ActivityWhereInput = {};

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      }),
      prisma.activity.count({ where }),
    ]);

    return { activities, total };
  }

  /**
   * Get entity activity history
   */
  async getEntityActivityHistory(
    entityType: string,
    entityId: string
  ): Promise<Activity[]> {
    return prisma.activity.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<{
    totalActivities: number;
    activitiesByType: Record<string, number>;
    activitiesByAction: Record<string, number>;
  }> {
    const where: Prisma.ActivityWhereInput = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const activities = await prisma.activity.findMany({
      where,
      select: {
        entityType: true,
        action: true,
      },
    });

    const activitiesByType: Record<string, number> = {};
    const activitiesByAction: Record<string, number> = {};

    activities.forEach((activity) => {
      activitiesByType[activity.entityType] =
        (activitiesByType[activity.entityType] || 0) + 1;
      activitiesByAction[activity.action] =
        (activitiesByAction[activity.action] || 0) + 1;
    });

    return {
      totalActivities: activities.length,
      activitiesByType,
      activitiesByAction,
    };
  }

  /**
   * Delete old activities
   */
  async deleteOldActivities(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.activity.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
