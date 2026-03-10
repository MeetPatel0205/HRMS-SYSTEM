import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from '../services/ExpenseService';
import { successResponse, errorResponse } from '../shared/responses';

const expenseService = new ExpenseService();

export class ExpenseController {
  async createExpenseReport(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await expenseService.createExpenseReport(req.body, req.user!.id);
      return successResponse(res, report, 'Expense report created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  async getExpenseReport(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await expenseService.getExpenseReportById(req.params.id);
      if (!report) return errorResponse(res, 'Expense report not found', 404);
      return successResponse(res, report);
    } catch (error) {
      return next(error);
    }
  }

  async getEmployeeExpenseReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, startDate, endDate } = req.query;
      const reports = await expenseService.getEmployeeExpenseReports(req.params.employeeId, {
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      return successResponse(res, reports);
    } catch (error) {
      return next(error);
    }
  }

  async getAllExpenseReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, departmentId, startDate, endDate } = req.query;
      const reports = await expenseService.getAllExpenseReports({
        status: status as string,
        departmentId: departmentId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      return successResponse(res, reports);
    } catch (error) {
      return next(error);
    }
  }

  async updateExpenseReport(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await expenseService.updateExpenseReport(req.params.id, req.body, req.user!.id);
      return successResponse(res, report, 'Expense report updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async deleteExpenseReport(req: Request, res: Response, next: NextFunction) {
    try {
      await expenseService.deleteExpenseReport(req.params.id, req.user!.id);
      return successResponse(res, null, 'Expense report deleted successfully');
    } catch (error) {
      return next(error);
    }
  }

  async approveExpenseReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { comments } = req.body;
      const report = await expenseService.approveExpenseReport(req.params.id, req.user!.id, comments);
      return successResponse(res, report, 'Expense report approved successfully');
    } catch (error) {
      return next(error);
    }
  }

  async rejectExpenseReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const report = await expenseService.rejectExpenseReport(req.params.id, req.user!.id, reason);
      return successResponse(res, report, 'Expense report rejected');
    } catch (error) {
      return next(error);
    }
  }

  async addExpenseItem(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await expenseService.addExpenseItem(req.body, req.user!.id);
      return successResponse(res, item, 'Expense item added successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  async updateExpenseItem(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await expenseService.updateExpenseItem(req.params.itemId, req.body, req.user!.id);
      return successResponse(res, item, 'Expense item updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async deleteExpenseItem(req: Request, res: Response, next: NextFunction) {
    try {
      await expenseService.deleteExpenseItem(req.params.itemId, req.user!.id);
      return successResponse(res, null, 'Expense item deleted successfully');
    } catch (error) {
      return next(error);
    }
  }

  async getExpenseStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId, departmentId, startDate, endDate } = req.query;
      const stats = await expenseService.getExpenseStats({
        employeeId: employeeId as string,
        departmentId: departmentId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      return successResponse(res, stats);
    } catch (error) {
      return next(error);
    }
  }
}
