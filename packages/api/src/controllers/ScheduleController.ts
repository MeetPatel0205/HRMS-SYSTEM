import { Request, Response, NextFunction } from 'express';
import { ScheduleService } from '../services/ScheduleService';
import { successResponse, errorResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class ScheduleController {
  private scheduleService: ScheduleService;

  constructor() {
    this.scheduleService = new ScheduleService();
  }

  async createSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const schedule = await this.scheduleService.createSchedule(req.body, userId);
      successResponse(res, schedule, 'Schedule created successfully', 201);
    } catch (error) {
      logger.error('Error creating schedule:', error);
      return next(error);
    }
  }

  async getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const schedule = await this.scheduleService.getScheduleById(id);
      
      if (!schedule) {
        errorResponse(res, 'Schedule not found', 404);
        return;
      }
      
      successResponse(res, schedule, 'Schedule retrieved successfully');
    } catch (error) {
      logger.error('Error getting schedule:', error);
      return next(error);
    }
  }

  async getEmployeeSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;
      
      const schedules = await this.scheduleService.getEmployeeSchedules(employeeId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      
      successResponse(res, schedules, 'Employee schedules retrieved successfully');
    } catch (error) {
      logger.error('Error getting employee schedules:', error);
      return next(error);
    }
  }

  async getAllSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, departmentId, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (tenantId) filters.tenantId = tenantId as string;
      if (departmentId) filters.departmentId = departmentId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const schedules = await this.scheduleService.getAllSchedules(filters);
      successResponse(res, schedules, 'Schedules retrieved successfully');
    } catch (error) {
      logger.error('Error getting schedules:', error);
      return next(error);
    }
  }

  async updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const schedule = await this.scheduleService.updateSchedule(id, req.body, userId);
      successResponse(res, schedule, 'Schedule updated successfully');
    } catch (error) {
      logger.error('Error updating schedule:', error);
      return next(error);
    }
  }

  async deleteSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await this.scheduleService.deleteSchedule(id, userId);
      successResponse(res, null, 'Schedule deleted successfully');
    } catch (error) {
      logger.error('Error deleting schedule:', error);
      return next(error);
    }
  }

  async createShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const shift = await this.scheduleService.createShift(req.body, userId);
      successResponse(res, shift, 'Shift created successfully', 201);
    } catch (error) {
      logger.error('Error creating shift:', error);
      return next(error);
    }
  }

  async updateShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const shift = await this.scheduleService.updateShift(id, req.body, userId);
      successResponse(res, shift, 'Shift updated successfully');
    } catch (error) {
      logger.error('Error updating shift:', error);
      return next(error);
    }
  }

  async deleteShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await this.scheduleService.deleteShift(id, userId);
      successResponse(res, null, 'Shift deleted successfully');
    } catch (error) {
      logger.error('Error deleting shift:', error);
      return next(error);
    }
  }

  async getScheduleStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.scheduleService.getScheduleStats({});
      successResponse(res, stats, 'Schedule stats retrieved successfully');
    } catch (error) {
      logger.error('Error getting schedule stats:', error);
      return next(error);
    }
  }
}
