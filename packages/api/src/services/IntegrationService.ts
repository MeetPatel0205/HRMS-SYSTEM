import { PrismaClient, Integration, IntegrationLog, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();

export class IntegrationService {
  async createIntegration(data: Prisma.IntegrationCreateInput, userId: string): Promise<Integration> {
    const integration = await prisma.integration.create({ data });
    await auditLogService.log({ userId, action: 'CREATE', resource: 'Integration', resourceId: integration.id, newValues: integration });
    return integration;
  }

  async getIntegrationById(id: string): Promise<Integration | null> {
    return prisma.integration.findUnique({ where: { id }, include: { logs: { orderBy: { executedAt: 'desc' }, take: 10 } } });
  }

  async getAllIntegrations(filters?: { type?: string; status?: string; tenantId?: string }): Promise<Integration[]> {
    const where: Prisma.IntegrationWhereInput = {};
    if (filters?.type) where.type = filters.type;
    // Note: status and tenantId are not currently on the Integration model
    return prisma.integration.findMany({ where, orderBy: { name: 'asc' } });
  }

  async updateIntegration(id: string, data: Prisma.IntegrationUpdateInput, userId: string): Promise<Integration> {
    const old = await prisma.integration.findUnique({ where: { id } });
    const integration = await prisma.integration.update({ where: { id }, data });
    await auditLogService.log({ userId, action: 'UPDATE', resource: 'Integration', resourceId: id, oldValues: old || undefined, newValues: integration });
    return integration;
  }

  async deleteIntegration(id: string, userId: string): Promise<void> {
    const integration = await prisma.integration.findUnique({ where: { id } });
    await prisma.integrationLog.deleteMany({ where: { integrationId: id } });
    await prisma.integration.delete({ where: { id } });
    await auditLogService.log({ userId, action: 'DELETE', resource: 'Integration', resourceId: id, oldValues: integration || undefined });
  }

  async logIntegrationActivity(integrationId: string, action: string, status: string, request?: any, response?: any, error?: string): Promise<IntegrationLog> {
    return prisma.integrationLog.create({
      data: {
        integrationId,
        event: action,
        direction: action,
        status,
        details: { request, response },
        executedAt: new Date()
      }
    });
  }

  async getIntegrationLogs(integrationId: string, limit: number = 100): Promise<IntegrationLog[]> {
    return prisma.integrationLog.findMany({ where: { integrationId }, orderBy: { executedAt: 'desc' }, take: limit });
  }
}
