import { PrismaClient, Report, ReportExecution, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();

export class ReportService {
  /**
   * Create report
   */
  async createReport(
    data: Prisma.ReportCreateInput,
    userId: string
  ): Promise<Report> {
    const report = await prisma.report.create({
      data,
      include: {
        creator: {
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
      resource: 'Report',
      resourceId: report.id,
      newValues: report,
    });

    return report;
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string): Promise<Report | null> {
    return prisma.report.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get all reports
   */
  async getAllReports(filters?: {
    category?: string;

    search?: string;
  }): Promise<Report[]> {
    const where: Prisma.ReportWhereInput = {};

    if (filters?.category) {
      where.category = filters.category;
    }



    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    return prisma.report.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            executions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update report
   */
  async updateReport(
    id: string,
    data: Prisma.ReportUpdateInput,
    userId: string
  ): Promise<Report> {
    const oldReport = await prisma.report.findUnique({
      where: { id },
    });

    const report = await prisma.report.update({
      where: { id },
      data,
      include: {
        creator: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Report',
      resourceId: id,
      oldValues: oldReport || undefined,
      newValues: report,
    });

    return report;
  }

  /**
   * Delete report
   */
  async deleteReport(id: string, userId: string): Promise<void> {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        executions: true,
      },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Delete all executions first
    await prisma.reportExecution.deleteMany({
      where: { reportId: id },
    });

    await prisma.report.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Report',
      resourceId: id,
      oldValues: report,
    });
  }

  /**
   * Execute report
   */
  async executeReport(
    reportId: string,
    parameters: any,
    userId: string
  ): Promise<ReportExecution> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error('Report not found');
    }



    const startTime = new Date();

    try {
      // Execute the report query
      const results = await this.runReportQuery(report, parameters);

      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();

      // Create execution record
      const execution = await prisma.reportExecution.create({
        data: {
          reportId,
          executedBy: userId,
          parameters,
          results,
          status: 'completed',
          executionTime,
          executedAt: startTime,
        },
        include: {
          report: true,
        },
      });

      await auditLogService.log({
        userId,
        action: 'EXECUTE',
        resource: 'Report',
        resourceId: reportId,
        newValues: { executionId: execution.id, executionTime },
      });

      return execution;
    } catch (error: any) {
      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();

      // Create failed execution record
      const execution = await prisma.reportExecution.create({
        data: {
          reportId,
          executedBy: userId,
          parameters,
          status: 'failed',
          error: error.message,
          executionTime,
          executedAt: startTime,
        },
        include: {
          report: true,
        },
      });

      throw error;
    }
  }

  /**
   * Run report query
   */
  private async runReportQuery(report: Report, parameters: any): Promise<any> {
    // This is a simplified implementation
    // In a real system, you would parse the query template and execute it
    const query = report.configuration as any;

    // Replace parameters in query
    let processedQuery = JSON.stringify(query);
    Object.keys(parameters).forEach((key) => {
      processedQuery = processedQuery.replace(
        new RegExp(`{{${key}}}`, 'g'),
        parameters[key]
      );
    });

    // Execute query based on report type
    switch (report.category) {
      case 'employee':
        return this.executeEmployeeReport(JSON.parse(processedQuery));
      case 'attendance':
        return this.executeAttendanceReport(JSON.parse(processedQuery));
      case 'payroll':
        return this.executePayrollReport(JSON.parse(processedQuery));
      case 'performance':
        return this.executePerformanceReport(JSON.parse(processedQuery));
      default:
        throw new Error(`Unsupported report category: ${report.category}`);
    }
  }

  /**
   * Execute employee report
   */
  private async executeEmployeeReport(query: any): Promise<any> {
    return prisma.employee.findMany({
      where: query.where || {},
      select: query.select || undefined,
      orderBy: query.orderBy || { employeeNumber: 'asc' },
    });
  }

  /**
   * Execute attendance report
   */
  private async executeAttendanceReport(query: any): Promise<any> {
    return prisma.timeEntry.findMany({
      where: query.where || {},
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: query.orderBy || { date: 'desc' },
    });
  }

  /**
   * Execute payroll report
   */
  private async executePayrollReport(query: any): Promise<any> {
    return prisma.payrollEntry.findMany({
      where: query.where || {},
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: query.orderBy || { payPeriodStart: 'desc' },
    });
  }

  /**
   * Execute performance report
   */
  private async executePerformanceReport(query: any): Promise<any> {
    return prisma.performanceReview.findMany({
      where: query.where || {},
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: query.orderBy || { reviewDate: 'desc' },
    });
  }

  /**
   * Get report execution by ID
   */
  async getExecutionById(id: string): Promise<ReportExecution | null> {
    return prisma.reportExecution.findUnique({
      where: { id },
      include: {
        report: true,
      },
    });
  }

  /**
   * Get report executions
   */
  async getReportExecutions(
    reportId: string,
    limit: number = 50
  ): Promise<ReportExecution[]> {
    return prisma.reportExecution.findMany({
      where: { reportId },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get report statistics
   */
  async getReportStats(reportId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  }> {
    const executions = await prisma.reportExecution.findMany({
      where: { reportId },
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter((e) => e.status === 'completed').length;
    const failedExecutions = executions.filter((e) => e.status === 'failed').length;
    const averageExecutionTime =
      totalExecutions > 0
        ? executions.reduce((sum, e) => sum + (e.executionTime || 0), 0) / totalExecutions
        : 0;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
    };
  }
}
