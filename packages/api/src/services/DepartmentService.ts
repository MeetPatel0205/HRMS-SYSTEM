import { PrismaClient, Department, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();

export class DepartmentService {
  /**
   * Create a new department
   */
  async createDepartment(
    data: Prisma.DepartmentCreateInput,
    userId: string
  ): Promise<Department> {
    const department = await prisma.department.create({
      data,
      include: {
        parent: true,
        children: true,
        employees: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'Department',
      resourceId: department.id,
      newValues: department,
    });

    return department;
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string): Promise<Department | null> {
    return prisma.department.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        employees: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            email: true,
          },
        },
        tenant: true,
      },
    });
  }

  /**
   * Get all departments
   */
  async getAllDepartments(filters?: {
    tenantId?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<Department[]> {
    const where: Prisma.DepartmentWhereInput = {};

    if (filters?.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { code: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    return prisma.department.findMany({
      where,
      include: {
        parent: true,
        children: true,
        employees: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get department hierarchy
   */
  async getDepartmentHierarchy(tenantId?: string): Promise<Department[]> {
    const where: Prisma.DepartmentWhereInput = {
      parentId: null, // Root departments
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    return prisma.department.findMany({
      where,
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
              },
            },
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
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update department
   */
  async updateDepartment(
    id: string,
    data: Prisma.DepartmentUpdateInput,
    userId: string
  ): Promise<Department> {
    const oldDepartment = await prisma.department.findUnique({
      where: { id },
    });

    const department = await prisma.department.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: true,
        employees: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Department',
      resourceId: id,
      oldValues: oldDepartment || undefined,
      newValues: department,
    });

    return department;
  }

  /**
   * Delete department
   */
  async deleteDepartment(id: string, userId: string): Promise<void> {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        children: true,
        employees: true,
      },
    });

    if (!department) {
      throw new Error('Department not found');
    }

    if (department.children.length > 0) {
      throw new Error('Cannot delete department with child departments');
    }

    if (department.employees.length > 0) {
      throw new Error('Cannot delete department with employees');
    }

    await prisma.department.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Department',
      resourceId: id,
      oldValues: department,
    });
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(id: string): Promise<{
    employeeCount: number;
    subdepartmentCount: number;
    activeEmployees: number;
  }> {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        children: true,
        employees: {
          where: { status: 'active' },
        },
      },
    });

    if (!department) {
      throw new Error('Department not found');
    }

    return {
      employeeCount: department.employees.length,
      subdepartmentCount: department.children.length,
      activeEmployees: department.employees.filter((e) => e.status === 'active').length,
    };
  }
}
