import { PrismaClient, Project, Task, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';
import { ActivityService } from './ActivityService';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();
const activityService = new ActivityService();
const notificationService = new NotificationService();

export class ProjectService {
  /**
   * Create project
   */
  async createProject(
    data: Prisma.ProjectCreateInput,
    userId: string
  ): Promise<Project> {
    const project = await prisma.project.create({
      data,
      include: {
        team: true,
        tasks: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'Project',
      resourceId: project.id,
      newValues: project,
    });

    await activityService.logActivity({
      userId,
      actorId: userId,
      action: 'created',
      entityType: 'Project',
      entityId: project.id,
      description: `Project "${project.name}" was created`,
      metadata: { status: project.status },
    });

    return project;
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { id },
      include: {
        team: true,
        tasks: true,
      },
    });
  }

  /**
   * Get all projects
   */
  async getAllProjects(filters?: {
    status?: string;
    search?: string;
  }): Promise<Project[]> {
    const where: Prisma.ProjectWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    return prisma.project.findMany({
      where,
      include: {
        team: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Update project
   */
  async updateProject(
    id: string,
    data: Prisma.ProjectUpdateInput,
    userId: string
  ): Promise<Project> {
    const oldProject = await prisma.project.findUnique({
      where: { id },
    });

    const project = await prisma.project.update({
      where: { id },
      data,
      include: {
        team: true,
        tasks: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Project',
      resourceId: id,
      oldValues: oldProject || undefined,
      newValues: project,
    });

    await activityService.logActivity({
      userId,
      actorId: userId,
      action: 'updated',
      entityType: 'Project',
      entityId: project.id,
      description: `Project "${project.name}" was updated`,
      metadata: { status: project.status },
    });

    return project;
  }

  /**
   * Delete project
   */
  async deleteProject(id: string, userId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Delete all tasks first
    await prisma.task.deleteMany({
      where: { projectId: id },
    });

    await prisma.project.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Project',
      resourceId: id,
      oldValues: project,
    });
  }

  /**
   * Create task
   */
  async createTask(
    data: Prisma.TaskCreateInput,
    userId: string
  ): Promise<Task> {
    const task = await prisma.task.create({
      data,
      include: {
        project: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'Task',
      resourceId: task.id,
      newValues: task,
    });

    // Notify assignee
    if (task.assigneeId) {
      await notificationService.createNotification({
        user: { connect: { id: task.assigneeId } },
        type: 'task',
        title: 'New Task Assigned',
        message: `You have been assigned task: ${task.title}`,
        data: { taskId: task.id, projectId: task.projectId },
      });
    }

    return task;
  }

  /**
   * Get task by ID
   */
  async getTaskById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });
  }

  /**
   * Get project tasks
   */
  async getProjectTasks(
    projectId: string,
    filters?: {
      status?: string;
      priority?: string;
      assigneeId?: string;
    }
  ): Promise<Task[]> {
    const where: Prisma.TaskWhereInput = {
      projectId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    return prisma.task.findMany({
      where,
      include: {
        project: true,
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  /**
   * Update task
   */
  async updateTask(
    id: string,
    data: Prisma.TaskUpdateInput,
    userId: string
  ): Promise<Task> {
    const oldTask = await prisma.task.findUnique({
      where: { id },
    });

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        project: true,

      },
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Task',
      resourceId: id,
      oldValues: oldTask || undefined,
      newValues: task,
    });

    return task;
  }

  /**
   * Delete task
   */
  async deleteTask(id: string, userId: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    await prisma.task.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Task',
      resourceId: id,
      oldValues: task,
    });
  }

  /**
   * Get project statistics
   */
  async getProjectStats(id: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    completionPercentage: number;
  }> {
    const tasks = await prisma.task.findMany({
      where: { projectId: id },
    });

    const now = new Date();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'completed' && t.dueDate && t.dueDate < now
    ).length;
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionPercentage,
    };
  }

  /**
   * Get employee tasks
   */
  async getEmployeeTasks(
    employeeId: string,
    filters?: {
      status?: string;
      priority?: string;
      projectId?: string;
    }
  ): Promise<Task[]> {
    const where: Prisma.TaskWhereInput = {
      assigneeId: employeeId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    return prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }
}
