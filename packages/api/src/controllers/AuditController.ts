import { Request, Response } from 'express'
import { AuditLogService, AuditLogQuery } from '../services/AuditLogService'
import { 
  ValidationError,
  NotFoundError
} from '../middleware/errorHandler'
import { createSuccessResponse } from '@hrms/shared'

export class AuditController {
  private auditLogService: AuditLogService

  constructor() {
    this.auditLogService = new AuditLogService()
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(req: Request, res: Response) {
    const {
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const take = Math.min(parseInt(limit as string), 100) // Max 100 per page

    const query: AuditLogQuery = {
      userId: userId as string,
      action: action as string,
      resource: resource as string,
      resourceId: resourceId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      skip,
      take
    }

    const result = await this.auditLogService.queryAuditLogs(query)

    res.json(createSuccessResponse({
      ...result,
      page: parseInt(page as string),
      limit: take,
      totalPages: Math.ceil(result.total / take)
    }))
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceAuditTrail(req: Request, res: Response) {
    const { resource, resourceId } = req.params

    if (!resource || !resourceId) {
      throw new ValidationError('Resource and resourceId are required')
    }

    const auditTrail = await this.auditLogService.getResourceAuditTrail(resource, resourceId)

    res.json(createSuccessResponse(auditTrail))
  }

  /**
   * Get audit trail for a specific user
   */
  async getUserAuditTrail(req: Request, res: Response) {
    const { userId } = req.params
    const { page = 1, limit = 50 } = req.query

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const take = Math.min(parseInt(limit as string), 100)

    const result = await this.auditLogService.getUserAuditTrail(userId, skip, take)

    res.json(createSuccessResponse({
      ...result,
      page: parseInt(page as string),
      limit: take,
      totalPages: Math.ceil(result.total / take)
    }))
  }

  /**
   * Get suspicious activity logs
   */
  async getSuspiciousActivity(req: Request, res: Response) {
    const { hours = 24 } = req.query
    const hoursAgo = parseInt(hours as string)

    if (isNaN(hoursAgo) || hoursAgo < 1 || hoursAgo > 168) { // Max 1 week
      throw new ValidationError('Hours must be between 1 and 168')
    }

    const suspiciousActivity = await this.auditLogService.getSuspiciousActivity(hoursAgo)

    res.json(createSuccessResponse(suspiciousActivity))
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(req: Request, res: Response) {
    const { days = 30 } = req.query
    const daysBack = parseInt(days as string)

    if (isNaN(daysBack) || daysBack < 1 || daysBack > 365) { // Max 1 year
      throw new ValidationError('Days must be between 1 and 365')
    }

    const statistics = await this.auditLogService.getAuditStatistics(daysBack)

    res.json(createSuccessResponse(statistics))
  }

  /**
   * Detect anomalous activity
   */
  async detectAnomalies(req: Request, res: Response) {
    const { userId } = req.query

    const anomalies = await this.auditLogService.detectAnomalies(userId as string)

    res.json(createSuccessResponse(anomalies))
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(req: Request, res: Response) {
    const { startDate, endDate } = req.body

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required')
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      throw new ValidationError('Start date must be before end date')
    }

    // Limit report to 1 year max
    const maxDays = 365
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > maxDays) {
      throw new ValidationError(`Report period cannot exceed ${maxDays} days`)
    }

    const report = await this.auditLogService.generateAuditReport(start, end)

    res.json(createSuccessResponse(report))
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(req: Request, res: Response) {
    const { startDate, endDate, format = 'json' } = req.body

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required')
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      throw new ValidationError('Start date must be before end date')
    }

    if (!['json', 'csv'].includes(format)) {
      throw new ValidationError('Format must be either json or csv')
    }

    const exportData = await this.auditLogService.exportAuditLogs(start, end, format)

    // Set appropriate headers for download
    const filename = `audit_logs_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.${format}`
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json')

    res.send(exportData)
  }

  /**
   * Archive old audit logs
   */
  async archiveOldLogs(req: Request, res: Response) {
    const { days = 90 } = req.body

    if (isNaN(days) || days < 30 || days > 2555) { // Min 30 days, max 7 years
      throw new ValidationError('Days must be between 30 and 2555')
    }

    const archivedCount = await this.auditLogService.archiveOldLogs(days)

    res.json(createSuccessResponse({
      archivedCount,
      message: `${archivedCount} audit logs older than ${days} days have been archived`
    }))
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(req: Request, res: Response) {
    const { id } = req.params

    const auditLog = await this.auditLogService.queryAuditLogs({
      skip: 0,
      take: 1
    })

    // This is a simplified implementation - in practice you'd query by ID
    if (!auditLog.data.length) {
      throw new NotFoundError('Audit log not found')
    }

    res.json(createSuccessResponse(auditLog.data[0]))
  }

  /**
   * Get audit summary for dashboard
   */
  async getAuditSummary(req: Request, res: Response) {
    const [
      recentActivity,
      suspiciousActivity,
      statistics
    ] = await Promise.all([
      this.auditLogService.queryAuditLogs({
        skip: 0,
        take: 10
      }),
      this.auditLogService.getSuspiciousActivity(24),
      this.auditLogService.getAuditStatistics(7)
    ])

    const summary = {
      recentActivity: recentActivity.data,
      suspiciousActivityCount: suspiciousActivity.length,
      weeklyStats: statistics,
      alerts: suspiciousActivity.slice(0, 5) // Top 5 alerts
    }

    res.json(createSuccessResponse(summary))
  }
}