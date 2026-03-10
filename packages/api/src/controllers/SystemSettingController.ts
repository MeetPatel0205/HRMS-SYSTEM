import { Request, Response, NextFunction } from 'express';
import { SystemSettingService } from '../services/SystemSettingService';
import { successResponse, errorResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class SystemSettingController {
  private systemSettingService: SystemSettingService;

  constructor() {
    this.systemSettingService = new SystemSettingService();
  }

  async getSettingByKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      
      const setting = await this.systemSettingService.getSettingByKey(key);
      
      if (!setting) {
        errorResponse(res, 'Setting not found', 404);
        return;
      }
      
      successResponse(res, setting, 'Setting retrieved successfully');
    } catch (error) {
      logger.error('Error getting setting:', error);
      return next(error);
    }
  }

  async getAllSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, isPublic } = req.query;
      
      const filters: any = {};
      if (category) filters.category = category as string;
      if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
      
      const settings = await this.systemSettingService.getAllSettings(filters);
      successResponse(res, settings, 'Settings retrieved successfully');
    } catch (error) {
      logger.error('Error getting all settings:', error);
      return next(error);
    }
  }

  async getSettingsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category } = req.params;
      
      const settings = await this.systemSettingService.getSettingsByCategory(category);
      
      successResponse(res, settings, 'Settings retrieved successfully');
    } catch (error) {
      logger.error('Error getting settings by category:', error);
      return next(error);
    }
  }

  async upsertSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key, value, category, description, isPublic } = req.body;
      const userId = req.user?.id;
      
      const setting = await this.systemSettingService.upsertSetting(
        key,
        value,
        category,
        description,
        isPublic,
        userId
      );
      
      successResponse(res, setting, 'Setting saved successfully', 201);
    } catch (error) {
      logger.error('Error upserting setting:', error);
      return next(error);
    }
  }

  async updateSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const userId = req.user?.id || '';
      
      const setting = await this.systemSettingService.updateSetting(key, value, userId);
      successResponse(res, setting, 'Setting updated successfully');
    } catch (error) {
      logger.error('Error updating setting:', error);
      return next(error);
    }
  }

  async deleteSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      const userId = req.user?.id || '';
      
      await this.systemSettingService.deleteSetting(key, userId);
      successResponse(res, null, 'Setting deleted successfully');
    } catch (error) {
      logger.error('Error deleting setting:', error);
      return next(error);
    }
  }

  async getPublicSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await this.systemSettingService.getPublicSettings();
      successResponse(res, settings, 'Public settings retrieved successfully');
    } catch (error) {
      logger.error('Error getting public settings:', error);
      return next(error);
    }
  }
}

