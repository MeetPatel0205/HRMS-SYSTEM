import { PrismaClient, Announcement, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();
const notificationService = new NotificationService();

export class AnnouncementService {
  /**
   * Create announcement
   */
  async createAnnouncement(
    data: Prisma.AnnouncementCreateInput,
    userId: string
  ): Promise<Announcement> {
    const announcement = await prisma.announcement.create({
      data,
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'Announcement',
      resourceId: announcement.id,
      newValues: announcement,
    });

    // Notify all users based on target audience
    // Notify all users based on target audience
    const targetAudience = Array.isArray(announcement.targetAudience)
      ? (announcement.targetAudience as string[])
      : [];

    if (targetAudience.includes('all')) {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);
      await notificationService.createBulkNotifications(userIds, {
        type: 'announcement',
        title: 'New Announcement',
        message: announcement.title,
        data: { announcementId: announcement.id },
      });
    }

    return announcement;
  }

  /**
   * Get announcement by ID
   */
  async getAnnouncementById(id: string): Promise<Announcement | null> {
    return prisma.announcement.findUnique({
      where: { id },
    });
  }

  /**
   * Get all announcements
   */
  async getAllAnnouncements(filters?: {
    type?: string;
  }): Promise<Announcement[]> {
    const where: Prisma.AnnouncementWhereInput = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    return prisma.announcement.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });
  }

  /**
   * Update announcement
   */
  async updateAnnouncement(
    id: string,
    data: Prisma.AnnouncementUpdateInput,
    userId: string
  ): Promise<Announcement> {
    const oldAnnouncement = await prisma.announcement.findUnique({
      where: { id },
    });

    const announcement = await prisma.announcement.update({
      where: { id },
      data,
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Announcement',
      resourceId: id,
      oldValues: oldAnnouncement || undefined,
      newValues: announcement,
    });

    return announcement;
  }

  /**
   * Delete announcement
   */
  async deleteAnnouncement(id: string, userId: string): Promise<void> {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw new Error('Announcement not found');
    }

    await prisma.announcement.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Announcement',
      resourceId: id,
      oldValues: announcement,
    });
  }

  /**
   * Get active announcements for user
   */
  async getActiveAnnouncementsForUser(userId: string): Promise<Announcement[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const userRoles = user.roles.map((ur) => ur.role.name);

    return prisma.announcement.findMany({
      where: {
        publishedAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: now } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
    });
  }
}
