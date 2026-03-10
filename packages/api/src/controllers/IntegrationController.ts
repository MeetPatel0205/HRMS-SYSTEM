import { Request, Response, NextFunction } from 'express';
import { IntegrationService } from '../services/IntegrationService';
import { successResponse, errorResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class IntegrationController {
  private integrationService: IntegrationService;

  constructor() {
    this.integrationService = new IntegrationService();
  }

  async createIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '';
      const integration = await this.integrationService.createIntegration(req.body, userId);
      successResponse(res, integration, 'Integration created successfully', 201);
    } catch (error) {
      logger.error('Error creating integration:', error);
      return next(error);
    }
  }

  async getIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const integration = await this.integrationService.getIntegrationById(id);

      if (!integration) {
        errorResponse(res, 'Integration not found', 404);
        return;
      }

      successResponse(res, integration, 'Integration retrieved successfully');
    } catch (error) {
      logger.error('Error getting integration:', error);
      return next(error);
    }
  }

  async getAllIntegrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, type, status } = req.query;

      const filters: any = {};
      if (tenantId) filters.tenantId = tenantId as string;
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;

      const integrations = await this.integrationService.getAllIntegrations(filters);
      successResponse(res, integrations, 'Integrations retrieved successfully');
    } catch (error) {
      logger.error('Error getting integrations:', error);
      return next(error);
    }
  }

  async updateIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '';
      const integration = await this.integrationService.updateIntegration(id, req.body, userId);
      successResponse(res, integration, 'Integration updated successfully');
    } catch (error) {
      logger.error('Error updating integration:', error);
      return next(error);
    }
  }

  async deleteIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '';
      await this.integrationService.deleteIntegration(id, userId);
      successResponse(res, null, 'Integration deleted successfully');
    } catch (error) {
      logger.error('Error deleting integration:', error);
      return next(error);
    }
  }

  async logIntegrationActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { action, status, request, response, error } = req.body;
      const log = await this.integrationService.logIntegrationActivity(id, action, status, request, response, error);
      successResponse(res, log, 'Integration activity logged successfully', 201);
    } catch (error) {
      logger.error('Error logging integration activity:', error);
      return next(error);
    }
  }

  async getIntegrationLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { limit } = req.query;

      const logs = await this.integrationService.getIntegrationLogs(
        id,
        limit ? parseInt(limit as string) : undefined
      );

      successResponse(res, logs, 'Integration logs retrieved successfully');
    } catch (error) {
      logger.error('Error getting integration logs:', error);
      return next(error);
    }
  }
}
