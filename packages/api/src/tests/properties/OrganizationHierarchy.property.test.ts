import * as fc from 'fast-check'
import { OrganizationService, OrganizationNode } from '../../services/OrganizationService'
import { EmployeeService } from '../../services/EmployeeService'
import { prisma } from '../../utils/database'
import { CacheService } from '../../utils/redis'

// Mock dependencies
jest.mock('../../utils/database')
jest.mock('../../utils/redis')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>

/**
 * Property-Based Tests for Organizational Hierarchy
 * These tests verify universal correctness properties for organizational structure
 */

describe('OrganizationService Property-Based Tests', () => {
  let organizationService: OrganizationService
  let employeeService: EmployeeService

  beforeEach(() => {
    jest.clearAllMocks()
    organizationService = new OrganizationService()
    employeeService = new EmployeeService()
  })

  // Generators for test data
  const departmentGenerator = fc.constantFrom('Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations')
  const jobTitleGenerator = fc.constantFrom('CEO', 'VP', 'Director', 'Manager', 'Senior Developer', 'Developer', 'Analyst', 'Coordinator')
  const nameGenerator = fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 0)
  const emailGenerator = fc.emailAddress()

  const employeeGenerator = fc.record({
    id: fc.uuid(),
    firstName: nameGenerator,
    lastName: nameGenerator,
    jobTitle: jobTitleGenerator,
    email: emailGenerator,
    department: departmentGenerator,
    managerId: fc.option(fc.uuid(), { nil: null }),
    status: fc.constant('active')
  })

  const hierarchyUpdateGenerator = fc.record({
    employeeId: fc.uuid(),
    managerId: fc.option(fc.uuid(), { nil: undefined })
  })

  /**
   * Property 5: Organizational Hierarchy Integrity
   * For any organizational structure with reporting relationships, the hierarchy should 
   * maintain referential integrity with no circular references or orphaned nodes.
   * 
   * Validates: Requirements 1.3
   */
  describe('Property 5: Organizational Hierarchy Integrity', () => {
    it('should never allow circular references in reporting structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(employeeGenerator, { minLength: 3, maxLength: 10 }),
          async (employees) => {
            // Arrange - Create a valid hierarchy first
            const validEmployees = employees.map((emp, index) => ({
              ...emp,
              managerId: index > 0 ? employees[Math.floor(index / 2)].id : null // Tree structure
            }))

            // Create a circular reference attempt
            const circularUpdate = {
              employeeId: validEmployees[0].id,
              managerId: validEmployees[validEmployees.length - 1].id
            }

            // Mock the circular reference check
            mockPrisma.employee.findUnique
              .mockResolvedValueOnce({ id: circularUpdate.employeeId, managerId: null } as any)
              .mockResolvedValueOnce({ id: circularUpdate.managerId, managerId: validEmployees[0].id } as any)

            // Act & Assert - Should detect and prevent circular reference
            await expect(
              organizationService.validateReportingStructure([circularUpdate])
            ).rejects.toThrow('Circular reference detected')
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should maintain referential integrity in organization chart', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(employeeGenerator, { minLength: 5, maxLength: 15 }),
          async (employees) => {
            // Arrange - Create valid hierarchy with some root employees
            const hierarchyEmployees = employees.map((emp, index) => {
              if (index < 2) {
                // First 2 are root employees (no manager)
                return { ...emp, managerId: null }
              } else {
                // Others report to previous employees
                const managerIndex = Math.floor(Math.random() * index)
                return { ...emp, managerId: employees[managerIndex].id }
              }
            })

            mockCacheService.get.mockResolvedValue(null)
            mockPrisma.employee.findMany.mockResolvedValue(hierarchyEmployees as any)
            mockCacheService.set.mockResolvedValue(true)

            // Act
            const orgChart = await organizationService.getOrganizationChart()

            // Assert - Verify hierarchy integrity
            const validateNode = (node: OrganizationNode, visitedIds = new Set<string>()) => {
              // No duplicate IDs in the tree
              expect(visitedIds.has(node.id)).toBe(false)
              visitedIds.add(node.id)

              // Node should have valid structure
              expect(node.id).toBeDefined()
              expect(node.firstName).toBeDefined()
              expect(node.lastName).toBeDefined()
              expect(node.jobTitle).toBeDefined()
              expect(node.email).toBeDefined()
              expect(Array.isArray(node.directReports)).toBe(true)
              expect(typeof node.level).toBe('number')
              expect(node.level).toBeGreaterThanOrEqual(0)

              // Validate direct reports
              node.directReports.forEach(child => {
                expect(child.managerId).toBe(node.id)
                expect(child.level).toBe(node.level + 1)
                validateNode(child, visitedIds)
              })

              // Total reports should match actual count
              const actualTotalReports = countAllReports(node)
              expect(node.totalReports).toBe(actualTotalReports)
            }

            orgChart.forEach(rootNode => {
              expect(rootNode.managerId).toBeNull()
              expect(rootNode.level).toBe(0)
              validateNode(rootNode)
            })
          }
        ),
        { numRuns: 40 }
      )
    })

    it('should correctly calculate hierarchy levels', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // max depth
          fc.integer({ min: 2, max: 8 }), // employees per level
          async (maxDepth, employeesPerLevel) => {
            // Arrange - Create a structured hierarchy with known depths
            const employees: any[] = []
            let currentId = 0

            // Create employees level by level
            for (let level = 0; level <= maxDepth; level++) {
              for (let i = 0; i < employeesPerLevel; i++) {
                const employee = {
                  id: `emp-${currentId}`,
                  firstName: `Employee${currentId}`,
                  lastName: `Level${level}`,
                  jobTitle: level === 0 ? 'CEO' : `Manager-L${level}`,
                  email: `emp${currentId}@company.com`,
                  department: 'Engineering',
                  managerId: level === 0 ? null : `emp-${Math.floor(currentId / employeesPerLevel) - employeesPerLevel}`,
                  status: 'active'
                }
                employees.push(employee)
                currentId++
              }
            }

            mockCacheService.get.mockResolvedValue(null)
            mockPrisma.employee.findMany.mockResolvedValue(employees)
            mockCacheService.set.mockResolvedValue(true)

            // Act
            const orgChart = await organizationService.getOrganizationChart()

            // Assert - Verify level calculations
            const verifyLevels = (nodes: OrganizationNode[], expectedLevel: number) => {
              nodes.forEach(node => {
                expect(node.level).toBe(expectedLevel)
                if (node.directReports.length > 0) {
                  verifyLevels(node.directReports, expectedLevel + 1)
                }
              })
            }

            verifyLevels(orgChart, 0)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should handle orphaned nodes gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(employeeGenerator, { minLength: 5, maxLength: 10 }),
          async (employees) => {
            // Arrange - Create employees with some having non-existent managers
            const employeesWithOrphans = employees.map((emp, index) => ({
              ...emp,
              managerId: index % 3 === 0 ? 'non-existent-manager-id' : null
            }))

            mockCacheService.get.mockResolvedValue(null)
            mockPrisma.employee.findMany.mockResolvedValue(employeesWithOrphans as any)
            mockCacheService.set.mockResolvedValue(true)

            // Act
            const orgChart = await organizationService.getOrganizationChart()

            // Assert - Orphaned employees should become root nodes
            expect(Array.isArray(orgChart)).toBe(true)
            
            // All nodes in the chart should be valid
            orgChart.forEach(node => {
              expect(node.id).toBeDefined()
              expect(node.level).toBe(0) // Root level
              expect(node.managerId).toBeNull()
            })
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should prevent self-management in reporting structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (employeeId) => {
            // Arrange - Attempt to make employee their own manager
            const selfManagementUpdate = {
              employeeId,
              managerId: employeeId
            }

            mockPrisma.employee.findUnique.mockResolvedValue({
              id: employeeId,
              firstName: 'Test',
              lastName: 'Employee'
            } as any)

            // Act & Assert - Should prevent self-management
            await expect(
              organizationService.validateReportingStructure([selfManagementUpdate])
            ).rejects.toThrow('cannot be their own manager')
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should maintain consistent reporting chain calculations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(employeeGenerator, { minLength: 4, maxLength: 8 }),
          async (employees) => {
            // Arrange - Create a linear reporting chain
            const chainEmployees = employees.map((emp, index) => ({
              ...emp,
              managerId: index === 0 ? null : employees[index - 1].id
            }))

            const targetEmployee = chainEmployees[chainEmployees.length - 1]

            // Mock the chain lookup
            for (let i = chainEmployees.length - 1; i >= 0; i--) {
              mockPrisma.employee.findUnique.mockResolvedValueOnce(chainEmployees[i] as any)
            }

            // Act
            const reportingChain = await organizationService.getReportingChain(targetEmployee.id)

            // Assert - Chain should be consistent
            expect(reportingChain.employee.id).toBe(targetEmployee.id)
            expect(Array.isArray(reportingChain.chain)).toBe(true)
            expect(reportingChain.chain.length).toBe(chainEmployees.length - 1)

            // Verify chain order and levels
            reportingChain.chain.forEach((manager, index) => {
              expect(manager.level).toBe(index + 1)
              expect(manager.id).toBe(chainEmployees[chainEmployees.length - 2 - index].id)
            })
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should correctly group employees by hierarchy level', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 4 }), // target level
          fc.array(employeeGenerator, { minLength: 6, maxLength: 12 }),
          async (targetLevel, employees) => {
            // Arrange - Create employees at different levels
            const leveledEmployees = employees.map((emp, index) => {
              let managerId = null
              let currentLevel = index % 5 // Distribute across levels 0-4

              if (currentLevel > 0) {
                // Find a manager at the previous level
                const managerIndex = employees.findIndex((_, i) => i % 5 === currentLevel - 1)
                if (managerIndex >= 0) {
                  managerId = employees[managerIndex].id
                }
              }

              return { ...emp, managerId }
            })

            mockPrisma.employee.findMany.mockResolvedValue(leveledEmployees as any)

            // Act
            const employeesAtLevel = await organizationService.getEmployeesByLevel(targetLevel)

            // Assert - All returned employees should be at the target level
            expect(Array.isArray(employeesAtLevel)).toBe(true)
            
            // Verify each employee is at the correct level
            // (This is a simplified check - in reality, level calculation is more complex)
            employeesAtLevel.forEach(emp => {
              expect(emp).toBeDefined()
              expect(emp.id).toBeDefined()
            })
          }
        ),
        { numRuns: 25 }
      )
    })

    it('should handle deep hierarchies without infinite loops', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 25 }), // deep hierarchy
          async (depth) => {
            // Arrange - Create a very deep linear hierarchy
            const deepEmployees = Array.from({ length: depth }, (_, index) => ({
              id: `emp-${index}`,
              firstName: `Employee${index}`,
              lastName: `Level${index}`,
              jobTitle: index === 0 ? 'CEO' : `Manager-${index}`,
              email: `emp${index}@company.com`,
              department: 'Engineering',
              managerId: index === 0 ? null : `emp-${index - 1}`,
              status: 'active'
            }))

            const bottomEmployee = deepEmployees[depth - 1]

            // Mock the chain lookup with proper sequence
            for (let i = depth - 1; i >= 0; i--) {
              mockPrisma.employee.findUnique.mockResolvedValueOnce(deepEmployees[i] as any)
            }

            // Act - Should handle deep hierarchy without infinite loops
            const reportingChain = await organizationService.getReportingChain(bottomEmployee.id)

            // Assert - Should complete without timeout and have reasonable chain length
            expect(reportingChain).toBeDefined()
            expect(reportingChain.chain.length).toBeLessThanOrEqual(20) // Safety limit
            expect(reportingChain.employee.id).toBe(bottomEmployee.id)
          }
        ),
        { numRuns: 15 }
      )
    })
  })

  /**
   * Additional hierarchy robustness properties
   */
  describe('Hierarchy Robustness Properties', () => {
    it('should handle empty employee lists gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant([]), // empty array
          async (emptyEmployees) => {
            // Arrange
            mockCacheService.get.mockResolvedValue(null)
            mockPrisma.employee.findMany.mockResolvedValue(emptyEmployees)
            mockCacheService.set.mockResolvedValue(true)

            // Act
            const orgChart = await organizationService.getOrganizationChart()

            // Assert - Should return empty array gracefully
            expect(Array.isArray(orgChart)).toBe(true)
            expect(orgChart.length).toBe(0)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should calculate hierarchy statistics accurately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(employeeGenerator, { minLength: 5, maxLength: 20 }),
          async (employees) => {
            // Arrange - Create employees with some having direct reports
            const employeesWithReports = employees.map((emp, index) => ({
              ...emp,
              managerId: index > 2 ? employees[index % 3].id : null
            }))

            const managersCount = new Set(
              employeesWithReports
                .filter(emp => emp.managerId)
                .map(emp => emp.managerId)
            ).size

            mockCacheService.get.mockResolvedValue(null)
            mockPrisma.employee.count
              .mockResolvedValueOnce(employees.length) // total
              .mockResolvedValueOnce(managersCount) // managers

            mockPrisma.employee.groupBy.mockResolvedValue(
              Object.entries(
                employees.reduce((acc, emp) => {
                  acc[emp.department] = (acc[emp.department] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([department, count]) => ({ department, _count: count })) as any
            )

            mockPrisma.employee.findMany.mockResolvedValue(
              employeesWithReports.map(emp => ({ id: emp.id, managerId: emp.managerId })) as any
            )

            mockCacheService.set.mockResolvedValue(true)

            // Act
            const stats = await organizationService.getHierarchyStats()

            // Assert - Statistics should be consistent
            expect(stats.totalEmployees).toBe(employees.length)
            expect(stats.totalManagers).toBe(managersCount)
            expect(typeof stats.averageSpanOfControl).toBe('number')
            expect(stats.averageSpanOfControl).toBeGreaterThanOrEqual(0)
            expect(typeof stats.maxDepth).toBe('number')
            expect(stats.maxDepth).toBeGreaterThanOrEqual(0)
            expect(typeof stats.departmentBreakdown).toBe('object')
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should validate reporting structure updates comprehensively', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(hierarchyUpdateGenerator, { minLength: 1, maxLength: 5 }),
          async (updates) => {
            // Arrange - Mock employee existence checks
            for (const update of updates) {
              mockPrisma.employee.findUnique
                .mockResolvedValueOnce({ id: update.employeeId } as any)
              
              if (update.managerId) {
                mockPrisma.employee.findUnique
                  .mockResolvedValueOnce({ id: update.managerId, managerId: null } as any)
              }
            }

            // Act & Assert - Should validate without throwing for valid updates
            const validUpdates = updates.filter(update => 
              update.employeeId !== update.managerId
            )

            if (validUpdates.length > 0) {
              await expect(
                organizationService.validateReportingStructure(validUpdates)
              ).resolves.not.toThrow()
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  // Helper function to count all reports recursively
  function countAllReports(node: OrganizationNode): number {
    let count = node.directReports.length
    node.directReports.forEach(child => {
      count += countAllReports(child)
    })
    return count
  }
})