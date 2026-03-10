import * as fc from 'fast-check'
import { AuditLogService, AuditLogEntry, AuditLogQuery } from '../../services/AuditLogService'
import { AuditMiddleware } from '../../middleware/auditMiddleware'
import { prisma } from '../../utils/database'
import { logger } from '../../utils/logger'

// Mock dependencies
jest.mock('../../utils/database')
jest.mock('../../utils/logger')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockLogger = logger as jest.Mocked<typeof logger>

/**
 * Property-Based Tests for Audit Trail System
 * These tests verify universal correctness properties for audit logging
 */

describe('AuditLogService Property-Based Tests', () => {
  let auditLogService: AuditLogService
  let auditMiddleware: AuditMiddleware

  beforeEach(() => {
    jest.clearAllMocks()
    auditLogService = new AuditLogService()
    auditMiddleware = new AuditMiddleware()
  })

  // Generators for test data
  const userIdGenerator = fc.uuid()
  const actionGenerator = fc.constantFrom(
    'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
    'SEARCH', 'EXPORT', 'ARCHIVE', 'PERMISSION_DENIED', 'UNAUTHORIZED_ACCESS'
  )
  const resourceGenerator = fc.constantFrom(
    'employee', 'user', 'role', 'time_entry', 'leave_request', 
    'performance_review', 'payroll', 'benefits', 'document', 'organization'
  )
  const ipAddressGenerator = fc.tuple(
    fc.integer({ min: 1, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 1, max: 255 })
  ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`)

  const userAgentGenerator = fc.constantFrom(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'PostmanRuntime/7.28.4',
    'curl/7.68.0'
  )

  const auditLogEntryGenerator = fc.record({
    userId: userIdGenerator,
    action: actionGenerator,
    resource: resourceGenerator,
    resourceId: fc.option(fc.uuid(), { nil: undefined }),
    oldValues: fc.option(fc.record({
      name: fc.string(),
      value: fc.oneof(fc.string(), fc.integer(), fc.boolean())
    }), { nil: undefined }),
    newValues: fc.option(fc.record({
      name: fc.string(),
      value: fc.oneof(fc.string(), fc.integer(), fc.boolean())
    }), { nil: undefined }),
    ipAddress: fc.option(ipAddressGenerator, { nil: undefined }),
    userAgent: fc.option(userAgentGenerator, { nil: undefined })
  })

  const auditLogQueryGenerator = fc.record({
    userId: fc.option(userIdGenerator, { nil: undefined }),
    action: fc.option(actionGenerator, { nil: undefined }),
    resource: fc.option(resourceGenerator, { nil: undefined }),
    resourceId: fc.option(fc.uuid(), { nil: undefined }),
    startDate: fc.option(fc.date(), { nil: undefined }),
    endDate: fc.option(fc.date(), { nil: undefined }),
    skip: fc.integer({ min: 0, max: 100 }),
    take: fc.integer({ min: 1, max: 100 })
  })

  /**
   * Property 2: Comprehensive Audit Trail
   * For any system operation that modifies data or accesses sensitive information, 
   * an audit log entry should be created with accurate timestamp, user identification, 
   * and operation details.
   * 
   * Validates: Requirements 1.2, 1.6, 3.6, 6.6, 13.7, 14.5, 18.4
   */
  describe('Property 2: Comprehensive Audit Trail', () => {
    it('should create audit log entry for every operation with complete information', async () => {
      await fc.assert(
        fc.asyncProperty(
          auditLogEntryGenerator,
          async (auditEntry) => {
            // Arrange
            const mockCreatedLog = {
              id: fc.sample(fc.uuid(), 1)[0],
              ...auditEntry,
              timestamp: new Date()
            }

            mockPrisma.auditLog.create.mockResolvedValue(mockCreatedLog as any)

            // Act
            const result = await auditLogService.createAuditLog(auditEntry)

            // Assert - All required fields should be preserved
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
              data: {
                userId: auditEntry.userId,
                action: auditEntry.action,
                resource: auditEntry.resource,
                resourceId: auditEntry.resourceId,
                oldValues: auditEntry.oldValues,
                newValues: auditEntry.newValues,
                ipAddress: auditEntry.ipAddress,
                userAgent: auditEntry.userAgent,
                timestamp: expect.any(Date)
              }
            })

            expect(result).toBeDefined()
            expect(result.userId).toBe(auditEntry.userId)
            expect(result.action).toBe(auditEntry.action)
            expect(result.resource).toBe(auditEntry.resource)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should maintain chronological order of audit entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditLogEntryGenerator, { minLength: 3, maxLength: 10 }),
          async (auditEntries) => {
            // Arrange - Create entries with sequential timestamps
            const entriesWithTimestamps = auditEntries.map((entry, index) => ({
              ...entry,
              id: `log-${index}`,
              timestamp: new Date(Date.now() + index * 1000) // 1 second apart
            }))

            mockPrisma.auditLog.findMany.mockResolvedValue(entriesWithTimestamps as any)

            const query: AuditLogQuery = {
              skip: 0,
              take: auditEntries.length
            }

            // Act
            const result = await auditLogService.queryAuditLogs(query)

            // Assert - Results should be in chronological order (newest first)
            expect(result.data.length).toBe(auditEntries.length)
            
            for (let i = 1; i < result.data.length; i++) {
              const current = new Date(result.data[i].timestamp)
              const previous = new Date(result.data[i - 1].timestamp)
              expect(current.getTime()).toBeLessThanOrEqual(previous.getTime())
            }
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should accurately filter audit logs by all query parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          auditLogQueryGenerator,
          fc.array(auditLogEntryGenerator, { minLength: 5, maxLength: 20 }),
          async (query, allEntries) => {
            // Arrange - Filter entries to match query
            const matchingEntries = allEntries.filter(entry => {
              if (query.userId && entry.userId !== query.userId) return false
              if (query.action && entry.action !== query.action) return false
              if (query.resource && entry.resource !== query.resource) return false
              if (query.resourceId && entry.resourceId !== query.resourceId) return false
              return true
            })

            const paginatedEntries = matchingEntries.slice(query.skip, query.skip + query.take)

            mockPrisma.auditLog.count.mockResolvedValue(matchingEntries.length)
            mockPrisma.auditLog.findMany.mockResolvedValue(paginatedEntries as any)

            // Act
            const result = await auditLogService.queryAuditLogs(query)

            // Assert - All returned entries should match query criteria
            expect(result.total).toBe(matchingEntries.length)
            expect(result.data.length).toBeLessThanOrEqual(query.take)
            expect(result.skip).toBe(query.skip)
            expect(result.take).toBe(query.take)

            result.data.forEach(entry => {
              if (query.userId) expect(entry.userId).toBe(query.userId)
              if (query.action) expect(entry.action).toBe(query.action)
              if (query.resource) expect(entry.resource).toBe(query.resource)
              if (query.resourceId) expect(entry.resourceId).toBe(query.resourceId)
            })
          }
        ),
        { numRuns: 40 }
      )
    })

    it('should preserve data integrity in old and new values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            oldData: fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              value: fc.integer(),
              active: fc.boolean()
            }),
            newData: fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              value: fc.integer(),
              active: fc.boolean()
            })
          }),
          userIdGenerator,
          async ({ oldData, newData }, userId) => {
            // Arrange
            const auditEntry: AuditLogEntry = {
              userId,
              action: 'UPDATE',
              resource: 'test_resource',
              resourceId: oldData.id,
              oldValues: oldData,
              newValues: newData
            }

            const mockCreatedLog = {
              id: fc.sample(fc.uuid(), 1)[0],
              ...auditEntry,
              timestamp: new Date()
            }

            mockPrisma.auditLog.create.mockResolvedValue(mockCreatedLog as any)

            // Act
            const result = await auditLogService.createAuditLog(auditEntry)

            // Assert - Data should be preserved exactly
            expect(result.oldValues).toEqual(oldData)
            expect(result.newValues).toEqual(newData)
            
            // Verify no data corruption
            expect(result.oldValues.id).toBe(oldData.id)
            expect(result.oldValues.name).toBe(oldData.name)
            expect(result.oldValues.value).toBe(oldData.value)
            expect(result.oldValues.active).toBe(oldData.active)
            
            expect(result.newValues.id).toBe(newData.id)
            expect(result.newValues.name).toBe(newData.name)
            expect(result.newValues.value).toBe(newData.value)
            expect(result.newValues.active).toBe(newData.active)
          }
        ),
        { numRuns: 40 }
      )
    })

    it('should track complete resource audit trail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // resourceId
          resourceGenerator,
          fc.array(auditLogEntryGenerator, { minLength: 3, maxLength: 8 }),
          async (resourceId, resource, auditEntries) => {
            // Arrange - All entries for the same resource
            const resourceEntries = auditEntries.map((entry, index) => ({
              ...entry,
              resource,
              resourceId,
              timestamp: new Date(Date.now() + index * 1000),
              id: `log-${index}`
            }))

            mockPrisma.auditLog.findMany.mockResolvedValue(resourceEntries as any)

            // Act
            const auditTrail = await auditLogService.getResourceAuditTrail(resource, resourceId)

            // Assert - All entries should be for the same resource
            expect(auditTrail.length).toBe(auditEntries.length)
            
            auditTrail.forEach(entry => {
              expect(entry.resource).toBe(resource)
              expect(entry.resourceId).toBe(resourceId)
            })

            // Should be ordered by timestamp (newest first)
            for (let i = 1; i < auditTrail.length; i++) {
              const current = new Date(auditTrail[i].timestamp)
              const previous = new Date(auditTrail[i - 1].timestamp)
              expect(current.getTime()).toBeLessThanOrEqual(previous.getTime())
            }
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should detect suspicious activity patterns accurately', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGenerator,
          fc.integer({ min: 10, max: 100 }), // high frequency count
          actionGenerator,
          async (userId, highCount, suspiciousAction) => {
            // Arrange - Create high-frequency activity
            const suspiciousEntries = Array.from({ length: highCount }, (_, index) => ({
              id: `log-${index}`,
              userId,
              action: suspiciousAction,
              resource: 'test_resource',
              timestamp: new Date(Date.now() - index * 1000),
              user: {
                id: userId,
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User'
              }
            }))

            mockPrisma.auditLog.findMany.mockResolvedValue(suspiciousEntries as any)

            // Act
            const anomalies = await auditLogService.detectAnomalies(userId)

            // Assert - Should detect high frequency if count > 50
            if (highCount > 50) {
              expect(anomalies.length).toBeGreaterThan(0)
              
              const highFrequencyAnomaly = anomalies.find(a => a.type === 'HIGH_FREQUENCY')
              expect(highFrequencyAnomaly).toBeDefined()
              expect(highFrequencyAnomaly.userId).toBe(userId)
              expect(highFrequencyAnomaly.action).toBe(suspiciousAction)
              expect(highFrequencyAnomaly.count).toBe(highCount)
            }
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should generate accurate audit statistics', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditLogEntryGenerator, { minLength: 5, maxLength: 20 }),
          fc.integer({ min: 1, max: 30 }), // days
          async (auditEntries, days) => {
            // Arrange
            const entriesWithTimestamps = auditEntries.map((entry, index) => ({
              ...entry,
              id: `log-${index}`,
              timestamp: new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000)
            }))

            // Group by action for expected results
            const actionCounts = entriesWithTimestamps.reduce((acc, entry) => {
              acc[entry.action] = (acc[entry.action] || 0) + 1
              return acc
            }, {} as Record<string, number>)

            const actionStats = Object.entries(actionCounts).map(([action, count]) => ({
              action,
              _count: count
            }))

            mockPrisma.auditLog.count.mockResolvedValue(auditEntries.length)
            mockPrisma.auditLog.groupBy
              .mockResolvedValueOnce(actionStats as any) // actions
              .mockResolvedValueOnce([]) // resources
              .mockResolvedValueOnce([]) // users
            mockPrisma.auditLog.findMany.mockResolvedValue(entriesWithTimestamps as any)

            // Act
            const statistics = await auditLogService.getAuditStatistics(days)

            // Assert - Statistics should be accurate
            expect(statistics.totalLogs).toBe(auditEntries.length)
            expect(statistics.period.days).toBe(days)
            expect(Array.isArray(statistics.topActions)).toBe(true)
            expect(Array.isArray(statistics.topResources)).toBe(true)
            expect(Array.isArray(statistics.topUsers)).toBe(true)
            expect(Array.isArray(statistics.dailyActivity)).toBe(true)

            // Verify action counts match
            statistics.topActions.forEach(actionStat => {
              expect(actionStat.count).toBe(actionCounts[actionStat.action])
            })
          }
        ),
        { numRuns: 25 }
      )
    })

    it('should handle date range filtering correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2023-01-01'), max: new Date('2023-12-31') }),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          fc.array(auditLogEntryGenerator, { minLength: 5, maxLength: 15 }),
          async (startDate, endDate, auditEntries) => {
            // Arrange - Ensure start date is before end date
            const actualStartDate = startDate < endDate ? startDate : endDate
            const actualEndDate = startDate < endDate ? endDate : startDate

            // Create entries with timestamps in and out of range
            const entriesWithTimestamps = auditEntries.map((entry, index) => {
              const inRange = index % 2 === 0
              const timestamp = inRange 
                ? new Date(actualStartDate.getTime() + Math.random() * (actualEndDate.getTime() - actualStartDate.getTime()))
                : new Date(actualStartDate.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000)

              return {
                ...entry,
                id: `log-${index}`,
                timestamp
              }
            })

            const entriesInRange = entriesWithTimestamps.filter(entry => 
              entry.timestamp >= actualStartDate && entry.timestamp <= actualEndDate
            )

            mockPrisma.auditLog.count.mockResolvedValue(entriesInRange.length)
            mockPrisma.auditLog.findMany.mockResolvedValue(entriesInRange as any)

            const query: AuditLogQuery = {
              startDate: actualStartDate,
              endDate: actualEndDate,
              skip: 0,
              take: 100
            }

            // Act
            const result = await auditLogService.queryAuditLogs(query)

            // Assert - All returned entries should be within date range
            expect(result.total).toBe(entriesInRange.length)
            
            result.data.forEach(entry => {
              const entryDate = new Date(entry.timestamp)
              expect(entryDate.getTime()).toBeGreaterThanOrEqual(actualStartDate.getTime())
              expect(entryDate.getTime()).toBeLessThanOrEqual(actualEndDate.getTime())
            })
          }
        ),
        { numRuns: 25 }
      )
    })

    it('should export audit logs in correct format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditLogEntryGenerator, { minLength: 3, maxLength: 10 }),
          fc.constantFrom('json', 'csv'),
          async (auditEntries, format) => {
            // Arrange
            const entriesWithUser = auditEntries.map((entry, index) => ({
              ...entry,
              id: `log-${index}`,
              timestamp: new Date(),
              user: {
                id: entry.userId,
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User'
              }
            }))

            mockPrisma.auditLog.findMany.mockResolvedValue(entriesWithUser as any)

            const startDate = new Date('2023-01-01')
            const endDate = new Date('2023-12-31')

            // Act
            const exportData = await auditLogService.exportAuditLogs(startDate, endDate, format)

            // Assert - Export should be in correct format
            expect(typeof exportData).toBe('string')
            expect(exportData.length).toBeGreaterThan(0)

            if (format === 'json') {
              expect(() => JSON.parse(exportData)).not.toThrow()
              const parsed = JSON.parse(exportData)
              expect(parsed.logs).toBeDefined()
              expect(Array.isArray(parsed.logs)).toBe(true)
              expect(parsed.totalRecords).toBe(auditEntries.length)
            } else if (format === 'csv') {
              const lines = exportData.split('\n')
              expect(lines.length).toBeGreaterThan(1) // Header + data
              expect(lines[0]).toContain('Timestamp') // Header row
            }
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * Additional audit trail robustness properties
   */
  describe('Audit Trail Robustness Properties', () => {
    it('should handle concurrent audit log creation without data loss', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditLogEntryGenerator, { minLength: 5, maxLength: 10 }),
          async (auditEntries) => {
            // Arrange - Mock successful creation for all entries
            auditEntries.forEach((entry, index) => {
              mockPrisma.auditLog.create.mockResolvedValueOnce({
                id: `log-${index}`,
                ...entry,
                timestamp: new Date()
              } as any)
            })

            // Act - Create all audit logs concurrently
            const promises = auditEntries.map(entry => 
              auditLogService.createAuditLog(entry)
            )
            const results = await Promise.all(promises)

            // Assert - All entries should be created successfully
            expect(results.length).toBe(auditEntries.length)
            expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(auditEntries.length)

            results.forEach((result, index) => {
              expect(result.userId).toBe(auditEntries[index].userId)
              expect(result.action).toBe(auditEntries[index].action)
              expect(result.resource).toBe(auditEntries[index].resource)
            })
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should handle pagination correctly for large result sets', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 1000 }), // total records
          fc.integer({ min: 10, max: 50 }), // page size
          fc.integer({ min: 0, max: 10 }), // page number
          async (totalRecords, pageSize, pageNumber) => {
            // Arrange
            const skip = pageNumber * pageSize
            const expectedCount = Math.min(pageSize, Math.max(0, totalRecords - skip))

            mockPrisma.auditLog.count.mockResolvedValue(totalRecords)
            mockPrisma.auditLog.findMany.mockResolvedValue(
              Array.from({ length: expectedCount }, (_, i) => ({
                id: `log-${skip + i}`,
                userId: fc.sample(userIdGenerator, 1)[0],
                action: 'READ',
                resource: 'test',
                timestamp: new Date()
              })) as any
            )

            const query: AuditLogQuery = {
              skip,
              take: pageSize
            }

            // Act
            const result = await auditLogService.queryAuditLogs(query)

            // Assert - Pagination should be correct
            expect(result.total).toBe(totalRecords)
            expect(result.skip).toBe(skip)
            expect(result.take).toBe(pageSize)
            expect(result.data.length).toBe(expectedCount)
          }
        ),
        { numRuns: 25 }
      )
    })

    it('should maintain audit log immutability', async () => {
      await fc.assert(
        fc.asyncProperty(
          auditLogEntryGenerator,
          async (auditEntry) => {
            // Arrange
            const originalEntry = { ...auditEntry }
            const mockCreatedLog = {
              id: fc.sample(fc.uuid(), 1)[0],
              ...auditEntry,
              timestamp: new Date()
            }

            mockPrisma.auditLog.create.mockResolvedValue(mockCreatedLog as any)

            // Act
            await auditLogService.createAuditLog(auditEntry)

            // Assert - Original entry should remain unchanged (immutability)
            expect(auditEntry).toEqual(originalEntry)
            
            // Verify the service doesn't modify input data
            expect(auditEntry.userId).toBe(originalEntry.userId)
            expect(auditEntry.action).toBe(originalEntry.action)
            expect(auditEntry.resource).toBe(originalEntry.resource)
            expect(auditEntry.oldValues).toEqual(originalEntry.oldValues)
            expect(auditEntry.newValues).toEqual(originalEntry.newValues)
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})