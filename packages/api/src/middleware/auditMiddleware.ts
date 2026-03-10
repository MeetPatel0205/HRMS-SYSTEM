import { Request, Response, NextFunction } from 'express'
import { AuditLogService } from '../services/AuditLogService'
import { logger } from '../utils/logger'

export type AuditableRequest = Request & {
  user?: {
    id: string
    email: string
    roles: string[]
  }
  auditContext?: {
    action: string
    resource: string
    resourceId?: string
    oldValues?: any
    newValues?: any
  }
}

/**
 * Audit Middleware
 * Automatically logs all API requests and responses for audit trail
 * 
 * Property 2: Comprehensive Audit Trail
 * Validates: Requirements 1.2, 1.6, 3.6, 6.6, 13.7, 14.5, 18.4
 */
export class AuditMiddleware {
  private auditLogService: AuditLogService

  constructor() {
    this.auditLogService = new AuditLogService()
  }

  /**
   * Main audit middleware function
   */
  auditRequest = async (req: AuditableRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now()

    // Skip audit for certain paths
    if (this.shouldSkipAudit(req.path)) {
      return next()
    }

    // Capture request details
    const requestDetails = {
      method: req.method,
      path: req.path,
      query: req.query,
      body: this.sanitizeRequestBody(req.body),
      headers: this.sanitizeHeaders(req.headers),
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent') || 'Unknown'
    }

    // Store original response methods
    const originalSend = res.send
    const originalJson = res.json
    let responseBody: any = null
    let statusCode: number = 200

    // Override response methods to capture response data
    res.send = function (body: any) {
      responseBody = body
      statusCode = res.statusCode
      return originalSend.call(this, body)
    }

    res.json = function (body: any) {
      responseBody = body
      statusCode = res.statusCode
      return originalJson.call(this, body)
    }

    // Continue with request processing
    next()

    // Log after response is sent
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime
        await this.logRequest(req, requestDetails, responseBody, statusCode, duration)
      } catch (error) {
        logger.error('Failed to create audit log:', error)
      }
    })
  }

  /**
   * Enhanced audit logging for specific actions
   */
  auditAction = (action: string, resource: string) => {
    return (req: AuditableRequest, res: Response, next: NextFunction) => {
      req.auditContext = {
        action,
        resource,
        resourceId: req.params.id || req.params.resourceId
      }
      next()
    }
  }

  /**
   * Audit data changes (before/after values)
   */
  auditDataChange = (getOldValues: (req: AuditableRequest) => Promise<any>) => {
    return async (req: AuditableRequest, res: Response, next: NextFunction) => {
      try {
        if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
          const oldValues = await getOldValues(req)
          if (req.auditContext) {
            req.auditContext.oldValues = oldValues
          }
        }
        next()
      } catch (error) {
        logger.error('Failed to capture old values for audit:', error)
        next()
      }
    }
  }

  /**
   * Log the request details
   */
  private async logRequest(
    req: AuditableRequest,
    requestDetails: any,
    responseBody: any,
    statusCode: number,
    duration: number
  ): Promise<void> {
    const userId = req.user?.id || 'anonymous'
    const action = this.determineAction(req)
    const resource = this.determineResource(req)

    // Create audit log entry
    await this.auditLogService.createAuditLog({
      userId,
      action,
      resource,
      resourceId: req.auditContext?.resourceId || req.params.id,
      oldValues: req.auditContext?.oldValues,
      newValues: this.extractNewValues(req, responseBody),
      ipAddress: requestDetails.ipAddress,
      userAgent: requestDetails.userAgent
    })

    // Log performance metrics
    if (duration > 5000) { // Log slow requests
      logger.warn(`Slow request detected: ${req.method} ${req.path} took ${duration}ms`, {
        userId,
        method: req.method,
        path: req.path,
        duration,
        statusCode
      })
    }

    // Log security events
    if (statusCode === 401 || statusCode === 403) {
      await this.auditLogService.createAuditLog({
        userId,
        action: statusCode === 401 ? 'UNAUTHORIZED_ACCESS' : 'PERMISSION_DENIED',
        resource: 'security',
        resourceId: req.path,
        newValues: {
          statusCode,
          method: req.method,
          path: req.path,
          reason: statusCode === 401 ? 'Invalid or missing authentication' : 'Insufficient permissions'
        },
        ipAddress: requestDetails.ipAddress,
        userAgent: requestDetails.userAgent
      })
    }

    // Log failed requests
    if (statusCode >= 400) {
      logger.warn(`Request failed: ${req.method} ${req.path}`, {
        userId,
        statusCode,
        responseBody: typeof responseBody === 'string' ? responseBody.substring(0, 500) : responseBody
      })
    }
  }

  /**
   * Determine the action based on request
   */
  private determineAction(req: AuditableRequest): string {
    if (req.auditContext?.action) {
      return req.auditContext.action
    }

    const method = req.method.toLowerCase()
    const path = req.path.toLowerCase()

    // Authentication actions
    if (path.includes('/auth/login')) return 'LOGIN'
    if (path.includes('/auth/logout')) return 'LOGOUT'
    if (path.includes('/auth/refresh')) return 'TOKEN_REFRESH'
    if (path.includes('/auth/reset-password')) return 'PASSWORD_RESET'

    // CRUD operations
    switch (method) {
      case 'post':
        if (path.includes('/search')) return 'SEARCH'
        return 'CREATE'
      case 'get':
        return path.includes('/search') ? 'SEARCH' : 'READ'
      case 'put':
      case 'patch':
        return 'UPDATE'
      case 'delete':
        return 'DELETE'
      default:
        return method.toUpperCase()
    }
  }

  /**
   * Determine the resource based on request
   */
  private determineResource(req: AuditableRequest): string {
    if (req.auditContext?.resource) {
      return req.auditContext.resource
    }

    const path = req.path.toLowerCase()

    // Extract resource from path
    if (path.includes('/employees')) return 'employee'
    if (path.includes('/users')) return 'user'
    if (path.includes('/roles')) return 'role'
    if (path.includes('/auth')) return 'authentication'
    if (path.includes('/time-entries')) return 'time_entry'
    if (path.includes('/leave-requests')) return 'leave_request'
    if (path.includes('/performance-reviews')) return 'performance_review'
    if (path.includes('/payroll')) return 'payroll'
    if (path.includes('/benefits')) return 'benefits'
    if (path.includes('/training')) return 'training'
    if (path.includes('/documents')) return 'document'
    if (path.includes('/organization')) return 'organization'

    // Default to the first path segment
    const segments = path.split('/').filter(s => s.length > 0)
    return segments[0] || 'unknown'
  }

  /**
   * Extract new values from request/response
   */
  private extractNewValues(req: AuditableRequest, responseBody: any): any {
    if (req.auditContext?.newValues) {
      return req.auditContext.newValues
    }

    // For create/update operations, use request body
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      return this.sanitizeRequestBody(req.body)
    }

    // For successful responses, extract relevant data
    if (responseBody && typeof responseBody === 'object') {
      try {
        const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody
        if (parsed.data) {
          return parsed.data
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    return null
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body
    }

    const sanitized = { ...body }
    const sensitiveFields = [
      'password',
      'currentPassword',
      'newPassword',
      'confirmPassword',
      'ssn',
      'socialSecurityNumber',
      'creditCard',
      'bankAccount',
      'token',
      'secret',
      'key'
    ]

    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') {
        return obj
      }

      const result: any = Array.isArray(obj) ? [] : {}

      for (const [key, value] of Object.entries(obj)) {
        const keyLower = key.toLowerCase()

        if (sensitiveFields.some(field => keyLower.includes(field))) {
          result[key] = '[REDACTED]'
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value)
        } else {
          result[key] = value
        }
      }

      return result
    }

    return sanitizeObject(sanitized)
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers }
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token']

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]'
      }
    })

    return sanitized
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    )
  }

  /**
   * Determine if audit should be skipped for this path
   */
  private shouldSkipAudit(path: string): boolean {
    const skipPaths = [
      '/health',
      '/metrics',
      '/favicon.ico',
      '/robots.txt',
      '/ping'
    ]

    return skipPaths.some(skipPath => path.startsWith(skipPath))
  }
}

// Export singleton instance
export const auditMiddleware = new AuditMiddleware()

// Export individual middleware functions
export const auditRequest = auditMiddleware.auditRequest
export const auditAction = auditMiddleware.auditAction
export const auditDataChange = auditMiddleware.auditDataChange