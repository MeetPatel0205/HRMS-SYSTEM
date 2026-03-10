import { Request, Response, NextFunction } from 'express';
import { GoalService } from '../services/GoalService';
import { successResponse, errorResponse } from '../shared/responses';

const goalService = new GoalService();

export class GoalController {
  async createGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await goalService.createGoal(req.body, req.user!.id);
      return successResponse(res, goal, 'Goal created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  async getGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await goalService.getGoalById(req.params.id);
      if (!goal) return errorResponse(res, 'Goal not found', 404);
      return successResponse(res, goal);
    } catch (error) {
      return next(error);
    }
  }

  async getEmployeeGoals(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, type, category } = req.query;
      const goals = await goalService.getEmployeeGoals(req.params.employeeId, {
        status: status as string,
        type: type as string,
        category: category as string
      });
      return successResponse(res, goals);
    } catch (error) {
      return next(error);
    }
  }

  async getAllGoals(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, type, category, departmentId, search, limit, offset } = req.query;
      const result = await goalService.getAllGoals({
        status: status as string,
        type: type as string,
        category: category as string,
        departmentId: departmentId as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      return successResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }

  async updateGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await goalService.updateGoal(req.params.id, req.body, req.user!.id);
      return successResponse(res, goal, 'Goal updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { progress } = req.body;
      const goal = await goalService.updateProgress(req.params.id, progress, req.user!.id);
      return successResponse(res, goal, 'Goal progress updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async deleteGoal(req: Request, res: Response, next: NextFunction) {
    try {
      await goalService.deleteGoal(req.params.id, req.user!.id);
      return successResponse(res, null, 'Goal deleted successfully');
    } catch (error) {
      return next(error);
    }
  }

  async getGoalStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId, departmentId, type } = req.query;
      const stats = await goalService.getGoalStats({
        employeeId: employeeId as string,
        departmentId: departmentId as string,
        type: type as string
      });
      return successResponse(res, stats);
    } catch (error) {
      return next(error);
    }
  }
}
