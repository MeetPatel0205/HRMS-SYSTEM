import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/TenantService';
import { successResponse, errorResponse } from '../shared/responses';

const tenantService = new TenantService();

export class TenantController {
  async createTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await tenantService.createTenant(req.body, req.user!.id);
      return successResponse(res, tenant, 'Tenant created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  async getTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await tenantService.getTenantById(req.params.id);
      if (!tenant) return errorResponse(res, 'Tenant not found', 404);
      return successResponse(res, tenant);
    } catch (error) {
      return next(error);
    }
  }

  async getAllTenants(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive, search } = req.query;
      const tenants = await tenantService.getAllTenants({
        isActive: isActive === 'true',
        search: search as string
      });
      return successResponse(res, tenants);
    } catch (error) {
      return next(error);
    }
  }

  async updateTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await tenantService.updateTenant(req.params.id, req.body, req.user!.id);
      return successResponse(res, tenant, 'Tenant updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async deleteTenant(req: Request, res: Response, next: NextFunction) {
    try {
      await tenantService.deleteTenant(req.params.id, req.user!.id);
      return successResponse(res, null, 'Tenant deleted successfully');
    } catch (error) {
      return next(error);
    }
  }

  async getTenantStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await tenantService.getTenantStats(req.params.id);
      return successResponse(res, stats);
    } catch (error) {
      return next(error);
    }
  }
}
