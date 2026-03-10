import { PrismaClient, Dashboard, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();

export class DashboardService {
  /**
   * Create dashboard
   */
  async createDashboard(
    data: Prisma.DashboardCreateInput,
    userId: string
  ): Promise<Dashboard> {
    const dashboard = await prisma.dashboard.create({
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
      },
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'Dashboard',
      resourceId: dashboard.id,
      newValues: dashboard,
    });

    return dashboard;
  }

  /**
   * Get dashboard by ID
   */
  async getDashboardById(id: string): Promise<Dashboard | null> {
    return prisma.dashboard.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get user dashboards
   */
  async getUserDashboards(userId: string): Promise<Dashboard[]> {
    return prisma.dashboard.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get default dashboard for user
   */
  async getDefaultDashboard(userId: string): Promise<Dashboard | null> {
    return prisma.dashboard.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    id: string,
    data: Prisma.DashboardUpdateInput,
    userId: string
  ): Promise<Dashboard> {
    const oldDashboard = await prisma.dashboard.findUnique({
      where: { id },
    });

    const dashboard = await prisma.dashboard.update({
      where: { id },
      data,
      include: {
        user: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Dashboard',
      resourceId: id,
      oldValues: oldDashboard || undefined,
      newValues: dashboard,
    });

    return dashboard;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(id: string, userId: string): Promise<void> {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id },
    });

    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    await prisma.dashboard.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Dashboard',
      resourceId: id,
      oldValues: dashboard,
    });
  }

  /**
   * Set default dashboard
   */
  async setDefaultDashboard(id: string, userId: string): Promise<Dashboard> {
    // Unset all other default dashboards for this user
    await prisma.dashboard.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set this dashboard as default
    const dashboard = await prisma.dashboard.update({
      where: { id },
      data: {
        isDefault: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'SET_DEFAULT',
      resource: 'Dashboard',
      resourceId: id,
      newValues: { isDefault: true },
    });

    return dashboard;
  }

  /**
   * Clone dashboard
   */
  async cloneDashboard(
    id: string,
    newName: string,
    userId: string
  ): Promise<Dashboard> {
    const originalDashboard = await prisma.dashboard.findUnique({
      where: { id },
    });

    if (!originalDashboard) {
      throw new Error('Dashboard not found');
    }

    const clonedDashboard = await prisma.dashboard.create({
      data: {
        name: newName,
        layout: originalDashboard.layout as any,
        widgets: originalDashboard.widgets as any,
        isDefault: false,
        user: {
          connect: { id: userId },
        },
      },
    });

    await auditLogService.log({
      userId,
      action: 'CLONE',
      resource: 'Dashboard',
      resourceId: clonedDashboard.id,
      newValues: clonedDashboard,
    });

    return clonedDashboard;
  }
}
