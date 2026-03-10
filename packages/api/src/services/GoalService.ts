import { PrismaClient, Goal, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';
import { ActivityService } from './ActivityService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();
const activityService = new ActivityService();

export class GoalService {
  /**
   * Create a new goal
   */
  async createGoal(
    data: Prisma.GoalCreateInput,
    userId: string
  ): Promise<Goal> {
    const goal = await prisma.goal.create({
      data,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
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
      resource: 'Goal',
      resourceId: goal.id,
      newValues: goal,
    });

    await activityService.logActivity({
      userId: goal.employeeId,
      actorId: userId,
      action: 'created',
      entityType: 'Goal',
      entityId: goal.id,
      description: `Goal "${goal.title}" was created`,
      metadata: { goalType: goal.type, category: goal.category },
    });

    return goal;
  }

  /**
   * Get goal by ID
   */
  async getGoalById(id: string): Promise<Goal | null> {
    return prisma.goal.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
          },
        },
      },
    });
  }

  /**
   * Get employee goals
   */
  async getEmployeeGoals(
    employeeId: string,
    filters?: {
      status?: string;
      type?: string;
      category?: string;
    }
  ): Promise<Goal[]> {
    const where: Prisma.GoalWhereInput = {
      employeeId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    return prisma.goal.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { targetDate: 'asc' },
    });
  }

  /**
   * Get all goals with filters
   */
  async getAllGoals(filters?: {
    status?: string;
    type?: string;
    category?: string;
    departmentId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ goals: Goal[]; total: number }> {
    const where: Prisma.GoalWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.departmentId) {
      where.employee = {
        departmentId: filters.departmentId,
      };
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
        orderBy: { targetDate: 'asc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      prisma.goal.count({ where }),
    ]);

    return { goals, total };
  }

  /**
   * Update goal
   */
  async updateGoal(
    id: string,
    data: Prisma.GoalUpdateInput,
    userId: string
  ): Promise<Goal> {
    const oldGoal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!oldGoal) {
      throw new Error('Goal not found');
    }

    const goal = await prisma.goal.update({
      where: { id },
      data,
      include: {
        employee: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Goal',
      resourceId: id,
      oldValues: oldGoal,
      newValues: goal,
    });

    await activityService.logActivity({
      userId: goal.employeeId,
      actorId: userId,
      action: 'updated',
      entityType: 'Goal',
      entityId: goal.id,
      description: `Goal "${goal.title}" was updated`,
      metadata: { progress: goal.progress, status: goal.status },
    });

    return goal;
  }

  /**
   * Update goal progress
   */
  async updateProgress(
    id: string,
    progress: number,
    userId: string
  ): Promise<Goal> {
    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        progress,
        status: progress >= 100 ? 'completed' : 'active',
      },
      include: {
        employee: true,
      },
    });

    await activityService.logActivity({
      userId: updatedGoal.employeeId,
      actorId: userId,
      action: 'updated',
      entityType: 'Goal',
      entityId: updatedGoal.id,
      description: `Goal progress updated to ${progress}%`,
      metadata: { progress, oldProgress: goal.progress },
    });

    return updatedGoal;
  }

  /**
   * Delete goal
   */
  async deleteGoal(id: string, userId: string): Promise<void> {
    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    await prisma.goal.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Goal',
      resourceId: id,
      oldValues: goal,
    });

    await activityService.logActivity({
      userId: goal.employeeId,
      actorId: userId,
      action: 'deleted',
      entityType: 'Goal',
      entityId: goal.id,
      description: `Goal "${goal.title}" was deleted`,
    });
  }

  /**
   * Get goal statistics
   */
  async getGoalStats(filters?: {
    employeeId?: string;
    departmentId?: string;
    type?: string;
  }): Promise<{
    total: number;
    active: number;
    completed: number;
    overdue: number;
    averageProgress: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const where: Prisma.GoalWhereInput = {};

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.departmentId) {
      where.employee = {
        departmentId: filters.departmentId,
      };
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    const goals = await prisma.goal.findMany({
      where,
      select: {
        status: true,
        type: true,
        category: true,
        progress: true,
        targetDate: true,
      },
    });

    const now = new Date();
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalProgress = 0;
    let overdue = 0;

    goals.forEach((goal) => {
      const type = goal.type || 'Unspecified';
      const category = goal.category || 'Unspecified';
      byType[type] = (byType[type] || 0) + 1;
      byCategory[category] = (byCategory[category] || 0) + 1;
      totalProgress += goal.progress;

      if (goal.status !== 'completed' && goal.targetDate && goal.targetDate < now) {
        overdue++;
      }
    });

    return {
      total: goals.length,
      active: goals.filter((g) => g.status === 'active').length,
      completed: goals.filter((g) => g.status === 'completed').length,
      overdue,
      averageProgress: goals.length > 0 ? totalProgress / goals.length : 0,
      byType,
      byCategory,
    };
  }
}
