import { PrismaClient, Schedule, Shift, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();
const notificationService = new NotificationService();

export class ScheduleService {
  /**
   * Create a new schedule
   */
  async createSchedule(
    data: Prisma.ScheduleCreateInput,
    userId: string
  ): Promise<Schedule> {
    const schedule = await prisma.schedule.create({
      data,
      include: {
        shifts: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'Schedule',
      resourceId: schedule.id,
      newValues: schedule,
    });

    // Note: Schedule doesn't have employeeId - notifications should be sent when shifts are created
    return schedule;
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: string): Promise<Schedule | null> {
    return prisma.schedule.findUnique({
      where: { id },
      include: {
        shifts: {
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
        },
      },
    });
  }

  /**
   * Get employee schedules
   */
  async getEmployeeSchedules(
    employeeId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
    }
  ): Promise<Schedule[]> {
    const where: Prisma.ScheduleWhereInput = {
      shifts: {
        some: {
          employeeId,
        },
      },
    };

    if (filters?.startDate || filters?.endDate) {
      where.AND = [];
      if (filters.startDate) {
        where.AND.push({ startDate: { gte: filters.startDate } });
      }
      if (filters.endDate) {
        where.AND.push({ endDate: { lte: filters.endDate } });
      }
    }

    return prisma.schedule.findMany({
      where,
      include: {
        shifts: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Get all schedules
   */
  async getAllSchedules(filters?: {
    departmentId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<Schedule[]> {
    const where: Prisma.ScheduleWhereInput = {};

    if (filters?.departmentId) {
      where.shifts = {
        some: {
          employee: {
            departmentId: filters.departmentId,
          },
        },
      };
    }

    if (filters?.startDate || filters?.endDate) {
      where.AND = [];
      if (filters.startDate) {
        where.AND.push({ startDate: { gte: filters.startDate } });
      }
      if (filters.endDate) {
        where.AND.push({ endDate: { lte: filters.endDate } });
      }
    }

    return prisma.schedule.findMany({
      where,
      include: {
        shifts: {
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
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    id: string,
    data: Prisma.ScheduleUpdateInput,
    userId: string
  ): Promise<Schedule> {
    const oldSchedule = await prisma.schedule.findUnique({
      where: { id },
    });

    const schedule = await prisma.schedule.update({
      where: { id },
      data,
      include: {
        shifts: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Schedule',
      resourceId: id,
      oldValues: oldSchedule || undefined,
      newValues: schedule,
    });

    // Note: Schedule doesn't have employeeId - notifications should be sent when shifts are updated
    return schedule;
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(id: string, userId: string): Promise<void> {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        shifts: true,
      },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Delete all shifts first
    await prisma.shift.deleteMany({
      where: { scheduleId: id },
    });

    await prisma.schedule.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Schedule',
      resourceId: id,
      oldValues: schedule,
    });
  }

  /**
   * Create shift
   */
  async createShift(
    data: Prisma.ShiftCreateInput,
    userId: string
  ): Promise<Shift> {
    const shift = await prisma.shift.create({
      data,
      include: {
        schedule: true,
        employee: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'Shift',
      resourceId: shift.id,
      newValues: shift,
    });

    return shift;
  }

  /**
   * Update shift
   */
  async updateShift(
    id: string,
    data: Prisma.ShiftUpdateInput,
    userId: string
  ): Promise<Shift> {
    const oldShift = await prisma.shift.findUnique({
      where: { id },
    });

    const shift = await prisma.shift.update({
      where: { id },
      data,
      include: {
        schedule: true,
        employee: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Shift',
      resourceId: id,
      oldValues: oldShift || undefined,
      newValues: shift,
    });

    return shift;
  }

  /**
   * Delete shift
   */
  async deleteShift(id: string, userId: string): Promise<void> {
    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift) {
      throw new Error('Shift not found');
    }

    await prisma.shift.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Shift',
      resourceId: id,
      oldValues: shift,
    });
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(filters?: {
    employeeId?: string;
    departmentId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalSchedules: number;
    totalShifts: number;
    totalHours: number;
    byType: Record<string, number>;
  }> {
    const where: Prisma.ScheduleWhereInput = {};

    if (filters?.employeeId) {
      where.shifts = {
        some: {
          employeeId: filters.employeeId,
        },
      };
    }

    if (filters?.departmentId) {
      where.shifts = {
        some: {
          employee: {
            departmentId: filters.departmentId,
          },
        },
      };
    }

    if (filters?.startDate || filters?.endDate) {
      where.AND = [];
      if (filters.startDate) {
        where.AND.push({ startDate: { gte: filters.startDate } });
      }
      if (filters.endDate) {
        where.AND.push({ endDate: { lte: filters.endDate } });
      }
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        shifts: true,
      },
    });

    const byType: Record<string, number> = {};
    let totalShifts = 0;
    let totalHours = 0;

    schedules.forEach((schedule) => {
      byType[schedule.type] = (byType[schedule.type] || 0) + 1;
      totalShifts += schedule.shifts.length;
      schedule.shifts.forEach((shift) => {
        const hours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      });
    });

    return {
      totalSchedules: schedules.length,
      totalShifts,
      totalHours,
      byType,
    };
  }
}
