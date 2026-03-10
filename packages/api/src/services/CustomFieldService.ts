import { PrismaClient, CustomField, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();

export class CustomFieldService {
  async createCustomField(data: Prisma.CustomFieldCreateInput, userId: string): Promise<CustomField> {
    const field = await prisma.customField.create({ data });
    await auditLogService.log({ userId, action: 'CREATE', resource: 'CustomField', resourceId: field.id, newValues: field });
    return field;
  }

  async getCustomFieldById(id: string): Promise<CustomField | null> {
    return prisma.customField.findUnique({ where: { id } });
  }

  async getCustomFieldsByEntity(entityType: string): Promise<CustomField[]> {
    return prisma.customField.findMany({ where: { entityType, isActive: true }, orderBy: { displayOrder: 'asc' } });
  }

  async updateCustomField(id: string, data: Prisma.CustomFieldUpdateInput, userId: string): Promise<CustomField> {
    const old = await prisma.customField.findUnique({ where: { id } });
    const field = await prisma.customField.update({ where: { id }, data });
    await auditLogService.log({ userId, action: 'UPDATE', resource: 'CustomField', resourceId: id, oldValues: old || undefined, newValues: field });
    return field;
  }

  async deleteCustomField(id: string, userId: string): Promise<void> {
    const field = await prisma.customField.findUnique({ where: { id } });
    await prisma.customField.delete({ where: { id } });
    await auditLogService.log({ userId, action: 'DELETE', resource: 'CustomField', resourceId: id, oldValues: field || undefined });
  }
}
