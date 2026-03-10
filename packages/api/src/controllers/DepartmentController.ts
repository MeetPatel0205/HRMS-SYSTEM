import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/DepartmentService';
import { successResponse, errorResponse } from '../shared/responses';

const departmentService = new DepartmentService();

export class DepartmentController {
  async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const department = await departmentService.createDepartment(req.body, req.user!.id);
      return successResponse(res, department, 'Department created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  async getDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const department = await departmentService.getDepartmentById(req.params.id);
      if (!department) return errorResponse(res, 'Department not found', 404);
      return successResponse(res, department);
    } catch (error) {
      return next(error);
    }
  }

  async getAllDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, isActive, search } = req.query;
      const departments = await departmentService.getAllDepartments({
        tenantId: tenantId as string,
        isActive: isActive === 'true',
        search: search as string
      });
      return successResponse(res, departments);
    } catch (error) {
      return next(error);
    }
  }

  async getDepartmentHierarchy(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.query;
      const hierarchy = await departmentService.getDepartmentHierarchy(tenantId as string);
      return successResponse(res, hierarchy);
    } catch (error) {
      return next(error);
    }
  }

  async updateDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const department = await departmentService.updateDepartment(req.params.id, req.body, req.user!.id);
      return successResponse(res, department, 'Department updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async deleteDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      await departmentService.deleteDepartment(req.params.id, req.user!.id);
      return successResponse(res, null, 'Department deleted successfully');
    } catch (error) {
      return next(error);
    }
  }

  async getDepartmentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await departmentService.getDepartmentStats(req.params.id);
      return successResponse(res, stats);
    } catch (error) {
      return next(error);
    }
  }
}
