import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/DashboardService';
import { successResponse, errorResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  async createDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const dashboard = await this.dashboardService.createDashboard(req.body, userId);
      successResponse(res, dashboard, 'Dashboard created successfully', 201);
    } catch (error) {
      logger.error('Error creating dashboard:', error);
      return next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dashboard = await this.dashboardService.getDashboardById(id);
      
      if (!dashboard) {
        errorResponse(res, 'Dashboard not found', 404);
        return;
      }
      
      successResponse(res, dashboard, 'Dashboard retrieved successfully');
    } catch (error) {
      logger.error('Error getting dashboard:', error);
      return next(error);
    }
  }

  async getUserDashboards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const dashboards = await this.dashboardService.getUserDashboards(userId);
      successResponse(res, dashboards, 'User dashboards retrieved successfully');
    } catch (error) {
      logger.error('Error getting user dashboards:', error);
      return next(error);
    }
  }

  async getDefaultDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const dashboard = await this.dashboardService.getDefaultDashboard(userId);
      successResponse(res, dashboard, 'Default dashboard retrieved successfully');
    } catch (error) {
      logger.error('Error getting default dashboard:', error);
      return next(error);
    }
  }

  async updateDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const dashboard = await this.dashboardService.updateDashboard(id, req.body, userId);
      successResponse(res, dashboard, 'Dashboard updated successfully');
    } catch (error) {
      logger.error('Error updating dashboard:', error);
      return next(error);
    }
  }

  async deleteDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await this.dashboardService.deleteDashboard(id, userId);
      successResponse(res, null, 'Dashboard deleted successfully');
    } catch (error) {
      logger.error('Error deleting dashboard:', error);
      return next(error);
    }
  }

  async setDefaultDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const dashboard = await this.dashboardService.setDefaultDashboard(id, userId);
      successResponse(res, dashboard, 'Default dashboard set successfully');
    } catch (error) {
      logger.error('Error setting default dashboard:', error);
      return next(error);
    }
  }

  async cloneDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, name } = req.body;
      const dashboard = await this.dashboardService.cloneDashboard(id, userId, name);
      successResponse(res, dashboard, 'Dashboard cloned successfully', 201);
    } catch (error) {
      logger.error('Error cloning dashboard:', error);
      return next(error);
    }
  }
}
