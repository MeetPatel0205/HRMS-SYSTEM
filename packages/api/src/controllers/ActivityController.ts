import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/ActivityService';
import { successResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class ActivityController {
  private activityService: ActivityService;

  constructor() {
    this.activityService = new ActivityService();
  }

  async getUserActivityFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit, offset } = req.query;
      
      const result = await this.activityService.getUserActivityFeed(
        userId,
        {
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined,
        }
      );
      
      successResponse(res, result, 'User activity feed retrieved successfully');
    } catch (error) {
      logger.error('Error getting user activity feed:', error);
      return next(error);
    }
  }

  async getGlobalActivityFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, offset } = req.query;
      
      const result = await this.activityService.getGlobalActivityFeed({
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      
      successResponse(res, result, 'Global activity feed retrieved successfully');
    } catch (error) {
      logger.error('Error getting global activity feed:', error);
      return next(error);
    }
  }

  async getEntityActivityHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityType, entityId } = req.params;
      
      const activities = await this.activityService.getEntityActivityHistory(
        entityType,
        entityId
      );
      
      successResponse(res, activities, 'Entity activity history retrieved successfully');
    } catch (error) {
      logger.error('Error getting entity activity history:', error);
      return next(error);
    }
  }

  async getActivityStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      const stats = await this.activityService.getActivityStats({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      
      successResponse(res, stats, 'Activity stats retrieved successfully');
    } catch (error) {
      logger.error('Error getting activity stats:', error);
      return next(error);
    }
  }
}
