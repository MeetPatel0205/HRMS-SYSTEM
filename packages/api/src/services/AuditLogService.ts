import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import crypto from 'crypto'

export interface AuditLogEntry {
  userId: string
  action: string
  resource: string
  resourceId?: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
}

export interface AuditLogQuery {
  userId?: string
  action?: string
  resource?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  skip: number
  take: number
}

export interface AuditLogResult {
  data: any[]
  total: number
  skip: number
  take: number
}

/**
 * AuditLog Service
 * Property 2: Comprehensive Audit Trail
 * 
 * Validates: Requirements 1.2, 1.6, 3.6, 6.6, 13.7, 14.5, 18.4
 */
export class AuditLogService {
  /**
   * Create audit log entry (alias for log method)
   */
  async log(entry: AuditLogEntry): Promise<any> {
    return this.createAuditLog(entry);
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(entry: AuditLogEntry): Promise<any> {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        oldValues: entry.oldValues,
        newValues: entry.newValues,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: new Date()
      }
    })

    logger.info(`Audit log created: ${entry.action} on ${entry.resource}`)

    return auditLog
  }

  /**
   * Query audit logs with filters
   */
  async queryAuditLogs(query: AuditLogQuery): Promise<AuditLogResult> {
    const where: any = {}

    if (query.userId) {
      where.userId = query.userId
    }

    if (query.action) {
      where.action = query.action
    }

    if (query.resource) {
      where.resource = query.resource
    }

    if (query.resourceId) {
      where.resourceId = query.resourceId
    }

    if (query.startDate || query.endDate) {
      where.timestamp = {}
      if (query.startDate) {
        where.timestamp.gte = query.startDate
      }
      if (query.endDate) {
        where.timestamp.lte = query.endDate
      }
    }

    // Get total count
    const total = await prisma.auditLog.count({ where })

    // Get paginated results
    const data = await prisma.auditLog.findMany({
      where,
      skip: query.skip,
      take: query.take,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    return {
      data,
      total,
      skip: query.skip,
      take: query.take
    }
  }

  /**
   * Get audit logs for specific resource
   */
  async getResourceAuditTrail(resource: string, resourceId: string): Promise<any[]> {
    return prisma.auditLog.findMany({
      where: {
        resource,
        resourceId
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    })
  }

  /**
   * Get audit logs for specific user
   */
  async getUserAuditTrail(userId: string, skip: number = 0, take: number = 100): Promise<AuditLogResult> {
    const total = await prisma.auditLog.count({ where: { userId } })

    const data = await prisma.auditLog.findMany({
      where: { userId },
      skip,
      take,
      orderBy: {
        timestamp: 'desc'
      }
    })

    return { data, total, skip, take }
  }

  /**
   * Get suspicious activity logs
   */
  async getSuspiciousActivity(hoursAgo: number = 24): Promise<any[]> {
    const startDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)

    // Define suspicious actions
    const suspiciousActions = [
      'UNAUTHORIZED_ACCESS',
      'MULTIPLE_FAILED_LOGINS',
      'PERMISSION_DENIED',
      'BULK_DELETE',
      'BULK_UPDATE'
    ]

    return prisma.auditLog.findMany({
      where: {
        AND: [
          { action: { in: suspiciousActions } },
          { timestamp: { gte: startDate } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    })
  }

  /**
   * Archive old audit logs (for compliance/performance)
   */
  async archiveOldLogs(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

    // Get logs to archive
    const logsToArchive = await prisma.auditLog.findMany({
      where: {
        timestamp: { lt: cutoffDate }
      }
    })

    if (logsToArchive.length === 0) {
      return 0
    }

    // In a production system, you would move these to an archive table or external storage
    // For now, we'll keep them but mark as archived
    logger.info(`Would archive ${logsToArchive.length} audit logs older than ${daysOld} days`)

    return logsToArchive.length
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(days: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [
      totalLogs,
      actionStats,
      resourceStats,
      userStats,
      dailyStats
    ] = await Promise.all([
      prisma.auditLog.count({
        where: { timestamp: { gte: startDate } }
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { timestamp: { gte: startDate } },
        _count: true,
        orderBy: { _count: { action: 'desc' } }
      }),
      prisma.auditLog.groupBy({
        by: ['resource'],
        where: { timestamp: { gte: startDate } },
        _count: true,
        orderBy: { _count: { resource: 'desc' } }
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: { timestamp: { gte: startDate } },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10
      }),
      this.getDailyAuditStats(startDate)
    ])

    return {
      period: { days, startDate },
      totalLogs,
      topActions: actionStats.map(stat => ({
        action: stat.action,
        count: stat._count
      })),
      topResources: resourceStats.map(stat => ({
        resource: stat.resource,
        count: stat._count
      })),
      topUsers: userStats.map(stat => ({
        userId: stat.userId,
        count: stat._count
      })),
      dailyActivity: dailyStats
    }
  }

  /**
   * Get daily audit statistics
   */
  private async getDailyAuditStats(startDate: Date): Promise<any[]> {
    const logs = await prisma.auditLog.findMany({
      where: { timestamp: { gte: startDate } },
      select: { timestamp: true, action: true }
    })

    const dailyStats: Record<string, Record<string, number>> = {}

    logs.forEach(log => {
      const date = log.timestamp.toISOString().split('T')[0]
      if (!dailyStats[date]) {
        dailyStats[date] = {}
      }
      dailyStats[date][log.action] = (dailyStats[date][log.action] || 0) + 1
    })

    return Object.entries(dailyStats).map(([date, actions]) => ({
      date,
      totalActions: Object.values(actions).reduce((sum, count) => sum + count, 0),
      actions
    })).sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Detect anomalous activity patterns
   */
  async detectAnomalies(userId?: string): Promise<any[]> {
    const anomalies: any[] = []
    const hoursAgo = 24
    const startDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)

    // Check for unusual activity patterns
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        timestamp: { gte: startDate },
        ...(userId && { userId })
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Group by user and action
    const userActionCounts: Record<string, Record<string, number>> = {}
    recentLogs.forEach(log => {
      if (!userActionCounts[log.userId]) {
        userActionCounts[log.userId] = {}
      }
      userActionCounts[log.userId][log.action] = (userActionCounts[log.userId][log.action] || 0) + 1
    })

    // Detect anomalies
    Object.entries(userActionCounts).forEach(([userId, actions]) => {
      const user = recentLogs.find(log => log.userId === userId)?.user

      // High frequency of actions
      Object.entries(actions).forEach(([action, count]) => {
        if (count > 50) { // Threshold for suspicious activity
          anomalies.push({
            type: 'HIGH_FREQUENCY',
            userId,
            user,
            action,
            count,
            description: `User performed ${action} ${count} times in the last ${hoursAgo} hours`
          })
        }
      })

      // Multiple failed attempts
      if (actions['LOGIN_FAILED'] && actions['LOGIN_FAILED'] > 5) {
        anomalies.push({
          type: 'MULTIPLE_FAILED_LOGINS',
          userId,
          user,
          count: actions['LOGIN_FAILED'],
          description: `User had ${actions['LOGIN_FAILED']} failed login attempts`
        })
      }

      // Bulk operations
      const bulkActions = ['BULK_DELETE', 'BULK_UPDATE', 'BULK_CREATE']
      bulkActions.forEach(bulkAction => {
        if (actions[bulkAction] && actions[bulkAction] > 0) {
          anomalies.push({
            type: 'BULK_OPERATION',
            userId,
            user,
            action: bulkAction,
            count: actions[bulkAction],
            description: `User performed bulk operation: ${bulkAction}`
          })
        }
      })
    })

    return anomalies
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const logs = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    })

    if (format === 'csv') {
      const headers = [
        'Timestamp',
        'User ID',
        'User Email',
        'User Name',
        'Action',
        'Resource',
        'Resource ID',
        'IP Address',
        'User Agent'
      ]

      const csvRows = logs.map(log => [
        log.timestamp.toISOString(),
        log.userId,
        log.user.email,
        `${log.user.firstName} ${log.user.lastName}`,
        log.action,
        log.resource,
        log.resourceId || '',
        log.ipAddress || '',
        log.userAgent || ''
      ])

      return [headers, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n')
    }

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      period: { startDate, endDate },
      totalRecords: logs.length,
      logs: logs.map(log => ({
        timestamp: log.timestamp,
        user: {
          id: log.userId,
          email: log.user.email,
          name: `${log.user.firstName} ${log.user.lastName}`
        },
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent
      }))
    }, null, 2)
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(startDate: Date, endDate: Date): Promise<any> {
    const logs = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Group by action
    const byAction: Record<string, number> = {}
    logs.forEach(log => {
      byAction[log.action] = (byAction[log.action] || 0) + 1
    })

    // Group by user
    const byUser: Record<string, number> = {}
    logs.forEach(log => {
      const userKey = `${log.user.email}`
      byUser[userKey] = (byUser[userKey] || 0) + 1
    })

    // Group by resource
    const byResource: Record<string, number> = {}
    logs.forEach(log => {
      byResource[log.resource] = (byResource[log.resource] || 0) + 1
    })

    return {
      period: { startDate, endDate },
      totalLogs: logs.length,
      byAction,
      byUser,
      byResource,
      logs
    }
  }
}

/**
 * Encryption Service
 * Property 46: Data Encryption and Security
 * 
 * Validates: Requirements 18.1
 * 
 * Provides comprehensive encryption for data at rest and in transit:
 * - AES-256-GCM for symmetric encryption
 * - HMAC-SHA256 for data integrity
 * - Secure random generation for tokens and codes
 * - Field-level encryption for sensitive data
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly encryptionKey: Buffer
  private readonly keyDerivationSalt: Buffer

  // List of sensitive fields that should always be encrypted
  private readonly sensitiveFields = [
    'ssn',
    'taxId',
    'bankAccount',
    'routingNumber',
    'creditCard',
    'passport',
    'driverLicense',
    'salary',
    'compensation',
    'medicalInfo',
    'healthData'
  ]

  constructor() {
    const keyHex = process.env.ENCRYPTION_KEY
    if (!keyHex) {
      throw new Error('ENCRYPTION_KEY must be configured')
    }

    // Validate key length (must be 32 bytes for AES-256)
    if (keyHex.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
    }

    this.encryptionKey = Buffer.from(keyHex, 'hex')

    // Derive a separate salt for key derivation
    this.keyDerivationSalt = crypto.createHash('sha256')
      .update(this.encryptionKey)
      .digest()
  }

  /**
   * Encrypt sensitive data with authenticated encryption
   */
  encrypt(data: string): { encrypted: string; iv: string; tag: string } {
    if (!data) {
      throw new Error('Cannot encrypt empty data')
    }

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv)

    let encrypted = cipher.update(data, 'utf-8', 'hex')
    encrypted += cipher.final('hex')

    const tag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    }
  }

  /**
   * Decrypt sensitive data with authentication verification
   */
  decrypt(data: { encrypted: string; iv: string; tag: string }): string {
    try {
      if (!data.encrypted || !data.iv || !data.tag) {
        throw new Error('Invalid encrypted data format')
      }

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        Buffer.from(data.iv, 'hex')
      )

      decipher.setAuthTag(Buffer.from(data.tag, 'hex'))

      let decrypted = decipher.update(data.encrypted, 'hex', 'utf-8')
      decrypted += decipher.final('utf-8')

      return decrypted
    } catch (error) {
      logger.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data - data may be corrupted or tampered')
    }
  }

  /**
   * Encrypt an object's sensitive fields
   */
  encryptObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj
    }

    const encrypted = { ...obj }

    for (const field of this.sensitiveFields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = JSON.stringify(this.encrypt(encrypted[field]))
      }
    }

    return encrypted
  }

  /**
   * Decrypt an object's sensitive fields
   */
  decryptObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj
    }

    const decrypted = { ...obj }

    for (const field of this.sensitiveFields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          // Check if field is encrypted (starts with '{')
          if (decrypted[field].startsWith('{')) {
            const encryptedData = JSON.parse(decrypted[field])
            decrypted[field] = this.decrypt(encryptedData)
          }
        } catch (error) {
          logger.warn(`Failed to decrypt field ${field}:`, error)
        }
      }
    }

    return decrypted
  }

  /**
   * Hash sensitive data (one-way) with HMAC-SHA256
   */
  hash(data: string): string {
    if (!data) {
      throw new Error('Cannot hash empty data')
    }

    return crypto
      .createHmac('sha256', this.encryptionKey)
      .update(data)
      .digest('hex')
  }

  /**
   * Verify hashed data using timing-safe comparison
   */
  verifyHash(data: string, hash: string): boolean {
    try {
      const computed = this.hash(data)
      return crypto.timingSafeEqual(
        Buffer.from(computed, 'hex'),
        Buffer.from(hash, 'hex')
      )
    } catch (error) {
      logger.error('Hash verification failed:', error)
      return false
    }
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    if (length < 16) {
      throw new Error('Token length must be at least 16 bytes')
    }
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Generate secure random code (numeric)
   */
  generateCode(length: number = 6): string {
    if (length < 4 || length > 10) {
      throw new Error('Code length must be between 4 and 10 digits')
    }
    return crypto.randomInt(10 ** (length - 1), 10 ** length).toString()
  }

  /**
   * Derive a key for specific purpose (e.g., per-user encryption)
   */
  deriveKey(purpose: string, context: string): Buffer {
    return crypto.pbkdf2Sync(
      context,
      this.keyDerivationSalt,
      100000,
      32,
      'sha256'
    )
  }

  /**
   * Check if data is encrypted
   */
  isEncrypted(data: string): boolean {
    try {
      if (!data || typeof data !== 'string') {
        return false
      }
      const parsed = JSON.parse(data)
      return !!(parsed.encrypted && parsed.iv && parsed.tag)
    } catch {
      return false
    }
  }

  /**
   * Mask sensitive data for logging (show only last 4 characters)
   */
  maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (!data || data.length <= visibleChars) {
      return '****'
    }
    return '*'.repeat(data.length - visibleChars) + data.slice(-visibleChars)
  }

  /**
   * Validate encryption key strength
   */
  validateKeyStrength(): boolean {
    // Key should be 32 bytes (256 bits) for AES-256
    return this.encryptionKey.length === 32
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService()
