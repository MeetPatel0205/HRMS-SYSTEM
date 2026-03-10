import { Request, Response, NextFunction } from 'express';
import { CustomFieldService } from '../services/CustomFieldService';
import { successResponse, errorResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class CustomFieldController {
  private customFieldService: CustomFieldService;

  constructor() {
    this.customFieldService = new CustomFieldService();
  }

  async createCustomField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '';
      const customField = await this.customFieldService.createCustomField(req.body, userId);
      successResponse(res, customField, 'Custom field created successfully', 201);
    } catch (error) {
      logger.error('Error creating custom field:', error);
      return next(error);
    }
  }

  async getCustomField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customField = await this.customFieldService.getCustomFieldById(id);

      if (!customField) {
        errorResponse(res, 'Custom field not found', 404);
        return;
      }

      successResponse(res, customField, 'Custom field retrieved successfully');
    } catch (error) {
      logger.error('Error getting custom field:', error);
      return next(error);
    }
  }

  async getCustomFieldsByEntity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityType } = req.params;

      const customFields = await this.customFieldService.getCustomFieldsByEntity(entityType);

      successResponse(res, customFields, 'Custom fields retrieved successfully');
    } catch (error) {
      logger.error('Error getting custom fields by entity:', error);
      return next(error);
    }
  }

  async updateCustomField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '';
      const customField = await this.customFieldService.updateCustomField(id, req.body, userId);
      successResponse(res, customField, 'Custom field updated successfully');
    } catch (error) {
      logger.error('Error updating custom field:', error);
      return next(error);
    }
  }

  async deleteCustomField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '';
      await this.customFieldService.deleteCustomField(id, userId);
      successResponse(res, null, 'Custom field deleted successfully');
    } catch (error) {
      logger.error('Error deleting custom field:', error);
      return next(error);
    }
  }
}
