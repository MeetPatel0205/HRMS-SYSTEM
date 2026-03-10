import { PrismaClient, ExpenseReport, ExpenseItem, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();
const notificationService = new NotificationService();

export class ExpenseService {
  /**
   * Create expense report
   */
  async createExpenseReport(
    data: Prisma.ExpenseReportCreateInput,
    userId: string
  ): Promise<ExpenseReport> {
    const report = await prisma.expenseReport.create({
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
        items: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'ExpenseReport',
      resourceId: report.id,
      newValues: report,
    });

    return report;
  }

  /**
   * Get expense report by ID
   */
  async getExpenseReportById(id: string): Promise<ExpenseReport | null> {
    return prisma.expenseReport.findUnique({
      where: { id },
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
        items: true,
      },
    });
  }

  /**
   * Get employee expense reports
   */
  async getEmployeeExpenseReports(
    employeeId: string,
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ExpenseReport[]> {
    const where: Prisma.ExpenseReportWhereInput = {
      employeeId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.AND = [];
      if (filters.startDate) {
        where.AND.push({ submittedAt: { gte: filters.startDate } });
      }
      if (filters.endDate) {
        where.AND.push({ submittedAt: { lte: filters.endDate } });
      }
    }

    return prisma.expenseReport.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Get all expense reports
   */
  async getAllExpenseReports(filters?: {
    status?: string;
    departmentId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ExpenseReport[]> {
    const where: Prisma.ExpenseReportWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.departmentId) {
      where.employee = {
        departmentId: filters.departmentId,
      };
    }

    if (filters?.startDate || filters?.endDate) {
      where.AND = [];
      if (filters.startDate) {
        where.AND.push({ submittedAt: { gte: filters.startDate } });
      }
      if (filters.endDate) {
        where.AND.push({ submittedAt: { lte: filters.endDate } });
      }
    }

    return prisma.expenseReport.findMany({
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
        items: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Update expense report
   */
  async updateExpenseReport(
    id: string,
    data: Prisma.ExpenseReportUpdateInput,
    userId: string
  ): Promise<ExpenseReport> {
    const oldReport = await prisma.expenseReport.findUnique({
      where: { id },
    });

    const report = await prisma.expenseReport.update({
      where: { id },
      data,
      include: {
        employee: true,
        items: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'ExpenseReport',
      resourceId: id,
      oldValues: oldReport || undefined,
      newValues: report,
    });

    return report;
  }

  /**
   * Delete expense report
   */
  async deleteExpenseReport(id: string, userId: string): Promise<void> {
    const report = await prisma.expenseReport.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!report) {
      throw new Error('Expense report not found');
    }

    // Delete all items first
    await prisma.expenseItem.deleteMany({
      where: { reportId: id },
    });

    // Delete the report
    await prisma.expenseReport.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'ExpenseReport',
      resourceId: id,
      oldValues: report,
    });
  }

  /**
   * Approve expense report
   */
  async approveExpenseReport(
    id: string,
    approverId: string,
    comments?: string
  ): Promise<ExpenseReport> {
    const report = await prisma.expenseReport.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: approverId,
      },
      include: {
        employee: true,
      },
    });

    await auditLogService.log({
      userId: approverId,
      action: 'APPROVE',
      resource: 'ExpenseReport',
      resourceId: id,
      newValues: { status: 'approved', comments },
    });

    // Notify employee
    await notificationService.createNotification({
      user: { connect: { id: report.employeeId } },
      type: 'expense',
      title: 'Expense Report Approved',
      message: `Your expense report "${report.title}" has been approved`,
      data: { expenseReportId: report.id },
    });

    return report;
  }

  /**
   * Reject expense report
   */
  async rejectExpenseReport(
    id: string,
    approverId: string,
    reason: string
  ): Promise<ExpenseReport> {
    const report = await prisma.expenseReport.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: approverId,
      },
      include: {
        employee: true,
      },
    });

    await auditLogService.log({
      userId: approverId,
      action: 'REJECT',
      resource: 'ExpenseReport',
      resourceId: id,
      newValues: { status: 'rejected', reason },
    });

    // Notify employee
    await notificationService.createNotification({
      user: { connect: { id: report.employeeId } },
      type: 'expense',
      title: 'Expense Report Rejected',
      message: `Your expense report "${report.title}" has been rejected: ${reason}`,
      data: { expenseReportId: report.id },
    });

    return report;
  }

  /**
   * Add expense item
   */
  async addExpenseItem(
    data: Prisma.ExpenseItemCreateInput,
    userId: string
  ): Promise<ExpenseItem> {
    const item = await prisma.expenseItem.create({
      data,
      include: {
        report: true,
      },
    });

    // Update report total
    await this.updateReportTotal(item.reportId);

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'ExpenseItem',
      resourceId: item.id,
      newValues: item,
    });

    return item;
  }

  /**
   * Update expense item
   */
  async updateExpenseItem(
    id: string,
    data: Prisma.ExpenseItemUpdateInput,
    userId: string
  ): Promise<ExpenseItem> {
    const oldItem = await prisma.expenseItem.findUnique({
      where: { id },
    });

    const item = await prisma.expenseItem.update({
      where: { id },
      data,
      include: {
        report: true,
      },
    });

    // Update report total
    await this.updateReportTotal(item.reportId);

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'ExpenseItem',
      resourceId: id,
      oldValues: oldItem || undefined,
      newValues: item,
    });

    return item;
  }

  /**
   * Delete expense item
   */
  async deleteExpenseItem(id: string, userId: string): Promise<void> {
    const item = await prisma.expenseItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new Error('Expense item not found');
    }

    const reportId = item.reportId;

    await prisma.expenseItem.delete({
      where: { id },
    });

    // Update report total
    await this.updateReportTotal(reportId);

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'ExpenseItem',
      resourceId: id,
      oldValues: item,
    });
  }

  /**
   * Update report total amount
   */
  private async updateReportTotal(reportId: string): Promise<void> {
    const items = await prisma.expenseItem.findMany({
      where: { reportId },
    });

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    await prisma.expenseReport.update({
      where: { id: reportId },
      data: { totalAmount: total },
    });
  }

  /**
   * Get expense statistics
   */
  async getExpenseStats(filters?: {
    employeeId?: string;
    departmentId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalReports: number;
    totalAmount: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const where: Prisma.ExpenseReportWhereInput = {};

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.departmentId) {
      where.employee = {
        departmentId: filters.departmentId,
      };
    }

    if (filters?.startDate || filters?.endDate) {
      where.AND = [];
      if (filters.startDate) {
        where.AND.push({ submittedAt: { gte: filters.startDate } });
      }
      if (filters.endDate) {
        where.AND.push({ submittedAt: { lte: filters.endDate } });
      }
    }

    const reports = await prisma.expenseReport.findMany({
      where,
      include: {
        items: true,
      },
    });

    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalAmount = 0;

    reports.forEach((report) => {
      byStatus[report.status] = (byStatus[report.status] || 0) + 1;
      totalAmount += report.totalAmount;

      report.items.forEach((item) => {
        const categoryName = item.category;
        byCategory[categoryName] = (byCategory[categoryName] || 0) + item.amount;
      });
    });

    return {
      totalReports: reports.length,
      totalAmount,
      byStatus,
      byCategory,
    };
  }
}
