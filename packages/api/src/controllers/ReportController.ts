import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/ReportService';
import { successResponse, errorResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const report = await this.reportService.createReport(req.body, userId);
      successResponse(res, report, 'Report created successfully', 201);
    } catch (error) {
      logger.error('Error creating report:', error);
      return next(error);
    }
  }

  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const report = await this.reportService.getReportById(id);
      
      if (!report) {
        errorResponse(res, 'Report not found', 404);
        return;
      }
      
      successResponse(res, report, 'Report retrieved successfully');
    } catch (error) {
      logger.error('Error getting report:', error);
      return next(error);
    }
  }

  async getAllReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, category, type } = req.query;
      
      const filters: any = {};
      if (tenantId) filters.tenantId = tenantId as string;
      if (category) filters.category = category as string;
      if (type) filters.type = type as string;
      
      const reports = await this.reportService.getAllReports(filters);
      successResponse(res, reports, 'Reports retrieved successfully');
    } catch (error) {
      logger.error('Error getting reports:', error);
      return next(error);
    }
  }

  async updateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const report = await this.reportService.updateReport(id, req.body, userId);
      successResponse(res, report, 'Report updated successfully');
    } catch (error) {
      logger.error('Error updating report:', error);
      return next(error);
    }
  }

  async deleteReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await this.reportService.deleteReport(id, userId);
      successResponse(res, null, 'Report deleted successfully');
    } catch (error) {
      logger.error('Error deleting report:', error);
      return next(error);
    }
  }

  async executeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { parameters, format } = req.body;
      const execution = await this.reportService.executeReport(id, parameters, format);
      successResponse(res, execution, 'Report executed successfully', 201);
    } catch (error) {
      logger.error('Error executing report:', error);
      return next(error);
    }
  }

  async getExecutionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { executionId } = req.params;
      const execution = await this.reportService.getExecutionById(executionId);
      
      if (!execution) {
        errorResponse(res, 'Report execution not found', 404);
        return;
      }
      
      successResponse(res, execution, 'Report execution retrieved successfully');
    } catch (error) {
      logger.error('Error getting report execution:', error);
      return next(error);
    }
  }

  async getReportExecutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { limit } = req.query;
      
      const executions = await this.reportService.getReportExecutions(
        id,
        limit ? parseInt(limit as string) : undefined
      );
      
      successResponse(res, executions, 'Report executions retrieved successfully');
    } catch (error) {
      logger.error('Error getting report executions:', error);
      return next(error);
    }
  }

  async getReportStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;
      const stats = await this.reportService.getReportStats(tenantId);
      successResponse(res, stats, 'Report stats retrieved successfully');
    } catch (error) {
      logger.error('Error getting report stats:', error);
      return next(error);
    }
  }
}
