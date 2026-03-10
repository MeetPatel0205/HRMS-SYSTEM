import { Request, Response, NextFunction } from 'express';
import { WorkflowService } from '../services/WorkflowService';
import { successResponse, errorResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class WorkflowController {
  private workflowService: WorkflowService;

  constructor() {
    this.workflowService = new WorkflowService();
  }

  async createWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '';
      const workflow = await this.workflowService.createWorkflow(req.body, userId);
      successResponse(res, workflow, 'Workflow created successfully', 201);
    } catch (error) {
      logger.error('Error creating workflow:', error);
      return next(error);
    }
  }

  async getWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workflow = await this.workflowService.getWorkflowById(id);
      
      if (!workflow) {
        errorResponse(res, 'Workflow not found', 404);
        return;
      }
      
      successResponse(res, workflow, 'Workflow retrieved successfully');
    } catch (error) {
      logger.error('Error getting workflow:', error);
      return next(error);
    }
  }

  async getAllWorkflows(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, type, status } = req.query;
      
      const filters: any = {};
      if (tenantId) filters.tenantId = tenantId as string;
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;
      
      const workflows = await this.workflowService.getAllWorkflows(filters);
      successResponse(res, workflows, 'Workflows retrieved successfully');
    } catch (error) {
      logger.error('Error getting workflows:', error);
      return next(error);
    }
  }

  async updateWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '';
      const workflow = await this.workflowService.updateWorkflow(id, req.body, userId);
      successResponse(res, workflow, 'Workflow updated successfully');
    } catch (error) {
      logger.error('Error updating workflow:', error);
      return next(error);
    }
  }

  async deleteWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '';
      await this.workflowService.deleteWorkflow(id, userId);
      successResponse(res, null, 'Workflow deleted successfully');
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      return next(error);
    }
  }

  async startWorkflowInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { entityId, initiatedBy, data } = req.body;
      const instance = await this.workflowService.startWorkflowInstance(id, entityId, initiatedBy, data);
      successResponse(res, instance, 'Workflow instance started successfully', 201);
    } catch (error) {
      logger.error('Error starting workflow instance:', error);
      return next(error);
    }
  }

  async approveWorkflowStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const { approvedBy, comments } = req.body;
      const instance = await this.workflowService.approveWorkflowStep(instanceId, approvedBy, comments);
      successResponse(res, instance, 'Workflow step approved successfully');
    } catch (error) {
      logger.error('Error approving workflow step:', error);
      return next(error);
    }
  }

  async rejectWorkflowStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const { rejectedBy, reason } = req.body;
      const instance = await this.workflowService.rejectWorkflowStep(instanceId, rejectedBy, reason);
      successResponse(res, instance, 'Workflow step rejected successfully');
    } catch (error) {
      logger.error('Error rejecting workflow step:', error);
      return next(error);
    }
  }

  async getWorkflowInstances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.query;
      
      const instances = await this.workflowService.getWorkflowInstances({
        workflowId: id,
        status: status as string
      });
      
      successResponse(res, instances, 'Workflow instances retrieved successfully');
    } catch (error) {
      logger.error('Error getting workflow instances:', error);
      return next(error);
    }
  }

  async getWorkflowStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await this.workflowService.getWorkflowStats(id);
      successResponse(res, stats, 'Workflow stats retrieved successfully');
    } catch (error) {
      logger.error('Error getting workflow stats:', error);
      return next(error);
    }
  }
}
