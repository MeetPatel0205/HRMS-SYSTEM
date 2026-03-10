import { PrismaClient, Tenant, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();

export class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(
    data: Prisma.TenantCreateInput,
    userId: string
  ): Promise<Tenant> {
    const tenant = await prisma.tenant.create({
      data,
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'Tenant',
      resourceId: tenant.id,
      newValues: tenant,
    });

    return tenant;
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        employees: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get all tenants
   */
  async getAllTenants(filters?: {
    isActive?: boolean;
    search?: string;
  }): Promise<Tenant[]> {
    const where: Prisma.TenantWhereInput = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { domain: { contains: filters.search } },
      ];
    }

    return prisma.tenant.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            employees: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update tenant
   */
  async updateTenant(
    id: string,
    data: Prisma.TenantUpdateInput,
    userId: string
  ): Promise<Tenant> {
    const oldTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    const tenant = await prisma.tenant.update({
      where: { id },
      data,
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Tenant',
      resourceId: id,
      oldValues: oldTenant || undefined,
      newValues: tenant,
    });

    return tenant;
  }

  /**
   * Delete tenant
   */
  async deleteTenant(id: string, userId: string): Promise<void> {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: true,
        employees: true,
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.users.length > 0 || tenant.employees.length > 0) {
      throw new Error('Cannot delete tenant with users or employees');
    }

    await prisma.tenant.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Tenant',
      resourceId: id,
      oldValues: tenant,
    });
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(id: string): Promise<{
    userCount: number;
    employeeCount: number;
    activeUsers: number;
    activeEmployees: number;
  }> {
    const [userCount, employeeCount, activeUsers, activeEmployees] = await Promise.all([
      prisma.user.count({ where: { tenantId: id } }),
      prisma.employee.count({ where: { tenantId: id } }),
      prisma.user.count({ where: { tenantId: id, isActive: true } }),
      prisma.employee.count({ where: { tenantId: id, status: 'active' } }),
    ]);

    return {
      userCount,
      employeeCount,
      activeUsers,
      activeEmployees,
    };
  }
}
