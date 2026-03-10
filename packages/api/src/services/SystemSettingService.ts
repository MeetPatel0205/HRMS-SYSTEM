import { PrismaClient, SystemSetting, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();

export class SystemSettingService {
  /**
   * Get setting by key
   */
  async getSettingByKey(key: string): Promise<SystemSetting | null> {
    return prisma.systemSetting.findUnique({
      where: { key },
    });
  }

  /**
   * Get setting value by key
   */
  async getSettingValue(key: string, defaultValue?: any): Promise<any> {
    const setting = await this.getSettingByKey(key);
    return setting ? setting.value : defaultValue;
  }

  /**
   * Get all settings
   */
  async getAllSettings(filters?: {
    category?: string;
    isPublic?: boolean;
  }): Promise<SystemSetting[]> {
    const where: Prisma.SystemSettingWhereInput = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }

    return prisma.systemSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
    return prisma.systemSetting.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Create or update setting
   */
  async upsertSetting(
    key: string,
    value: any,
    category: string,
    description?: string,
    isPublic: boolean = false,
    userId?: string
  ): Promise<SystemSetting> {
    const existingSetting = await this.getSettingByKey(key);

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        category,
        description,
        isPublic,
      },
      update: {
        value,
        category,
        description,
        isPublic,
        updatedAt: new Date(),
      },
    });

    if (userId) {
      await auditLogService.log({
        userId,
        action: existingSetting ? 'UPDATE' : 'CREATE',
        resource: 'SystemSetting',
        resourceId: setting.id,
        oldValues: existingSetting || undefined,
        newValues: setting,
      });
    }

    return setting;
  }

  /**
   * Update setting
   */
  async updateSetting(
    key: string,
    value: any,
    userId: string
  ): Promise<SystemSetting> {
    const oldSetting = await this.getSettingByKey(key);

    if (!oldSetting) {
      throw new Error('Setting not found');
    }

    const setting = await prisma.systemSetting.update({
      where: { key },
      data: {
        value,
        updatedAt: new Date(),
      },
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'SystemSetting',
      resourceId: setting.id,
      oldValues: oldSetting,
      newValues: setting,
    });

    return setting;
  }

  /**
   * Delete setting
   */
  async deleteSetting(key: string, userId: string): Promise<void> {
    const setting = await this.getSettingByKey(key);

    if (!setting) {
      throw new Error('Setting not found');
    }

    await prisma.systemSetting.delete({
      where: { key },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'SystemSetting',
      resourceId: setting.id,
      oldValues: setting,
    });
  }

  /**
   * Get public settings (for frontend)
   */
  async getPublicSettings(): Promise<Record<string, any>> {
    const settings = await prisma.systemSetting.findMany({
      where: { isPublic: true },
    });

    const result: Record<string, any> = {};
    settings.forEach((setting) => {
      result[setting.key] = setting.value;
    });

    return result;
  }

  /**
   * Initialize default settings
   */
  async initializeDefaultSettings(): Promise<void> {
    const defaultSettings = [
      // General settings
      { key: 'app.name', value: 'Enterprise HRMS', category: 'general', isPublic: true },
      { key: 'app.timezone', value: 'UTC', category: 'general', isPublic: true },
      { key: 'app.dateFormat', value: 'YYYY-MM-DD', category: 'general', isPublic: true },
      { key: 'app.timeFormat', value: 'HH:mm:ss', category: 'general', isPublic: true },
      
      // Authentication settings
      { key: 'auth.sessionTimeout', value: 3600, category: 'authentication', isPublic: false },
      { key: 'auth.mfaRequired', value: false, category: 'authentication', isPublic: false },
      { key: 'auth.passwordMinLength', value: 8, category: 'authentication', isPublic: true },
      { key: 'auth.passwordRequireSpecialChar', value: true, category: 'authentication', isPublic: true },
      
      // Leave settings
      { key: 'leave.annualLeaveDefault', value: 20, category: 'leave', isPublic: false },
      { key: 'leave.sickLeaveDefault', value: 10, category: 'leave', isPublic: false },
      { key: 'leave.carryOverEnabled', value: true, category: 'leave', isPublic: false },
      { key: 'leave.maxCarryOver', value: 5, category: 'leave', isPublic: false },
      
      // Attendance settings
      { key: 'attendance.workingHoursPerDay', value: 8, category: 'attendance', isPublic: false },
      { key: 'attendance.workingDaysPerWeek', value: 5, category: 'attendance', isPublic: false },
      { key: 'attendance.overtimeEnabled', value: true, category: 'attendance', isPublic: false },
      { key: 'attendance.overtimeRate', value: 1.5, category: 'attendance', isPublic: false },
      
      // Payroll settings
      { key: 'payroll.currency', value: 'USD', category: 'payroll', isPublic: true },
      { key: 'payroll.payPeriod', value: 'monthly', category: 'payroll', isPublic: false },
      { key: 'payroll.taxRate', value: 0.2, category: 'payroll', isPublic: false },
      
      // Notification settings
      { key: 'notification.emailEnabled', value: true, category: 'notification', isPublic: false },
      { key: 'notification.smsEnabled', value: false, category: 'notification', isPublic: false },
      { key: 'notification.pushEnabled', value: true, category: 'notification', isPublic: false },
    ];

    for (const setting of defaultSettings) {
      await this.upsertSetting(
        setting.key,
        setting.value,
        setting.category,
        undefined,
        setting.isPublic
      );
    }
  }

  /**
   * Bulk update settings
   */
  async bulkUpdateSettings(
    settings: Array<{ key: string; value: any }>,
    userId: string
  ): Promise<SystemSetting[]> {
    const updatedSettings: SystemSetting[] = [];

    for (const { key, value } of settings) {
      const setting = await this.updateSetting(key, value, userId);
      updatedSettings.push(setting);
    }

    return updatedSettings;
  }

  /**
   * Export settings
   */
  async exportSettings(category?: string): Promise<any> {
    const where: Prisma.SystemSettingWhereInput = category ? { category } : {};
    
    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return {
      exportDate: new Date().toISOString(),
      category: category || 'all',
      settings: settings.map((s) => ({
        key: s.key,
        value: s.value,
        category: s.category,
        description: s.description,
        isPublic: s.isPublic,
      })),
    };
  }

  /**
   * Import settings
   */
  async importSettings(
    data: Array<{ key: string; value: any; category: string; description?: string; isPublic?: boolean }>,
    userId: string
  ): Promise<number> {
    let importedCount = 0;

    for (const setting of data) {
      await this.upsertSetting(
        setting.key,
        setting.value,
        setting.category,
        setting.description,
        setting.isPublic || false,
        userId
      );
      importedCount++;
    }

    return importedCount;
  }
}
