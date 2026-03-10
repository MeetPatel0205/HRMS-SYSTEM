import * as fc from 'fast-check'
import { EmployeeService, SearchCriteria } from '../../services/EmployeeService'
import { prisma } from '../../utils/database'
import { CacheService } from '../../utils/redis'

// Mock dependencies
jest.mock('../../utils/database')
jest.mock('../../utils/redis')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>

/**
 * Property-Based Tests for Employee Search and Filtering
 * These tests verify universal correctness properties for search functionality
 */

describe('EmployeeService Search Property-Based Tests', () => {
  let employeeService: EmployeeService

  beforeEach(() => {
    jest.clearAllMocks()
    employeeService = new EmployeeService()
  })

  // Generators for test data
  const departmentGenerator = fc.constantFrom('Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations')
  const locationGenerator = fc.constantFrom('New York', 'Los Angeles', 'Chicago', 'Remote', 'London', 'Toronto')
  const statusGenerator = fc.constantFrom('active', 'inactive', 'on_leave', 'terminated')
  const employmentTypeGenerator = fc.constantFrom('Full-time', 'Part-time', 'Contract', 'Temporary', 'Intern')
  const jobTitleGenerator = fc.constantFrom('Software Engineer', 'Senior Developer', 'Manager', 'Director', 'Analyst', 'Coordinator')

  const employeeGenerator = fc.record({
    id: fc.uuid(),
    employeeNumber: fc.string({ minLength: 8, maxLength: 10 }).map(s => `EMP${s.slice(0, 6)}`),
    firstName: fc.string({ minLength: 2, maxLength: 30 }),
    lastName: fc.string({ minLength: 2, maxLength: 30 }),
    email: fc.emailAddress(),
    department: departmentGenerator,
    location: locationGenerator,
    status: statusGenerator,
    employmentType: employmentTypeGenerator,
    jobTitle: jobTitleGenerator,
    managerId: fc.option(fc.uuid(), { nil: null })
  })

  const searchCriteriaGenerator = fc.record({
    department: fc.option(departmentGenerator, { nil: undefined }),
    location: fc.option(locationGenerator, { nil: undefined }),
    status: fc.option(statusGenerator, { nil: undefined }),
    employmentType: fc.option(employmentTypeGenerator, { nil: undefined }),
    jobTitle: fc.option(jobTitleGenerator, { nil: undefined }),
    search: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    skip: fc.integer({ min: 0, max: 100 }),
    take: fc.integer({ min: 1, max: 50 })
  })

  /**
   * Property 4: Search and Filter Accuracy
   * For any search query with specific filter criteria, all returned results should 
   * match the filter conditions and no matching records should be excluded.
   * 
   * Validates: Requirements 1.4, 14.6
   */
  describe('Property 4: Search and Filter Accuracy', () => {
    it('should return only employees matching department filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          departmentGenerator,
          fc.array(employeeGenerator, { minLength: 5, maxLength: 20 }),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          async (targetDepartment, allEmployees, skip, take) => {
            // Arrange - Create employees with mixed departments
            const employeesWithTargetDept = allEmployees.map((emp, index) => ({
              ...emp,
              department: index % 3 === 0 ? targetDepartment : emp.department
            }))

            const expectedMatches = employeesWithTargetDept.filter(emp => 
              emp.department === targetDepartment && emp.status !== 'terminated'
            )

            mockPrisma.employee.count.mockResolvedValue(expectedMatches.length)
            mockPrisma.employee.findMany.mockResolvedValue(expectedMatches as any)

            const criteria: SearchCriteria = {
              department: targetDepartment,
              skip,
              take
            }

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - All results should match department filter
            result.data.forEach(employee => {
              expect(employee.department).toBe(targetDepartment)
            })

            expect(result.total).toBe(expectedMatches.length)
            expect(result.skip).toBe(skip)
            expect(result.take).toBe(take)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return only employees matching location filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          locationGenerator,
          fc.array(employeeGenerator, { minLength: 5, maxLength: 20 }),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          async (targetLocation, allEmployees, skip, take) => {
            // Arrange
            const employeesWithTargetLocation = allEmployees.map((emp, index) => ({
              ...emp,
              location: index % 4 === 0 ? targetLocation : emp.location
            }))

            const expectedMatches = employeesWithTargetLocation.filter(emp => 
              emp.location === targetLocation && emp.status !== 'terminated'
            )

            mockPrisma.employee.count.mockResolvedValue(expectedMatches.length)
            mockPrisma.employee.findMany.mockResolvedValue(expectedMatches as any)

            const criteria: SearchCriteria = {
              location: targetLocation,
              skip,
              take
            }

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - All results should match location filter
            result.data.forEach(employee => {
              expect(employee.location).toBe(targetLocation)
            })

            expect(result.total).toBe(expectedMatches.length)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return only employees matching status filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          statusGenerator,
          fc.array(employeeGenerator, { minLength: 5, maxLength: 20 }),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          async (targetStatus, allEmployees, skip, take) => {
            // Arrange
            const employeesWithTargetStatus = allEmployees.map((emp, index) => ({
              ...emp,
              status: index % 3 === 0 ? targetStatus : emp.status
            }))

            const expectedMatches = employeesWithTargetStatus.filter(emp => 
              emp.status === targetStatus
            )

            mockPrisma.employee.count.mockResolvedValue(expectedMatches.length)
            mockPrisma.employee.findMany.mockResolvedValue(expectedMatches as any)

            const criteria: SearchCriteria = {
              status: targetStatus,
              skip,
              take
            }

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - All results should match status filter
            result.data.forEach(employee => {
              expect(employee.status).toBe(targetStatus)
            })

            expect(result.total).toBe(expectedMatches.length)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return only employees matching multiple filters', async () => {
      await fc.assert(
        fc.asyncProperty(
          departmentGenerator,
          locationGenerator,
          statusGenerator,
          fc.array(employeeGenerator, { minLength: 10, maxLength: 30 }),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          async (targetDept, targetLocation, targetStatus, allEmployees, skip, take) => {
            // Arrange - Create employees with some matching all criteria
            const employeesWithMixedCriteria = allEmployees.map((emp, index) => {
              if (index % 5 === 0) {
                // Every 5th employee matches all criteria
                return {
                  ...emp,
                  department: targetDept,
                  location: targetLocation,
                  status: targetStatus
                }
              }
              return emp
            })

            const expectedMatches = employeesWithMixedCriteria.filter(emp => 
              emp.department === targetDept &&
              emp.location === targetLocation &&
              emp.status === targetStatus
            )

            mockPrisma.employee.count.mockResolvedValue(expectedMatches.length)
            mockPrisma.employee.findMany.mockResolvedValue(expectedMatches as any)

            const criteria: SearchCriteria = {
              department: targetDept,
              location: targetLocation,
              status: targetStatus,
              skip,
              take
            }

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - All results should match ALL filter criteria
            result.data.forEach(employee => {
              expect(employee.department).toBe(targetDept)
              expect(employee.location).toBe(targetLocation)
              expect(employee.status).toBe(targetStatus)
            })

            expect(result.total).toBe(expectedMatches.length)
          }
        ),
        { numRuns: 40 }
      )
    })

    it('should return employees matching text search in any searchable field', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 10 }),
          fc.array(employeeGenerator, { minLength: 5, maxLength: 15 }),
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 1, max: 10 }),
          async (searchTerm, allEmployees, skip, take) => {
            // Arrange - Create employees with search term in different fields
            const employeesWithSearchTerm = allEmployees.map((emp, index) => {
              switch (index % 4) {
                case 0:
                  return { ...emp, firstName: `${searchTerm}John` }
                case 1:
                  return { ...emp, lastName: `Smith${searchTerm}` }
                case 2:
                  return { ...emp, email: `${searchTerm.toLowerCase()}@company.com` }
                case 3:
                  return { ...emp, employeeNumber: `EMP${searchTerm}001` }
                default:
                  return emp
              }
            })

            const expectedMatches = employeesWithSearchTerm.filter(emp => {
              const searchLower = searchTerm.toLowerCase()
              return (
                emp.firstName.toLowerCase().includes(searchLower) ||
                emp.lastName.toLowerCase().includes(searchLower) ||
                emp.email.toLowerCase().includes(searchLower) ||
                emp.employeeNumber.toLowerCase().includes(searchLower)
              ) && emp.status !== 'terminated'
            })

            mockPrisma.employee.count.mockResolvedValue(expectedMatches.length)
            mockPrisma.employee.findMany.mockResolvedValue(expectedMatches as any)

            const criteria: SearchCriteria = {
              search: searchTerm,
              skip,
              take
            }

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - All results should contain search term in at least one field
            result.data.forEach(employee => {
              const searchLower = searchTerm.toLowerCase()
              const matchesSearch = 
                employee.firstName.toLowerCase().includes(searchLower) ||
                employee.lastName.toLowerCase().includes(searchLower) ||
                employee.email.toLowerCase().includes(searchLower) ||
                employee.employeeNumber.toLowerCase().includes(searchLower)
              
              expect(matchesSearch).toBe(true)
            })

            expect(result.total).toBe(expectedMatches.length)
          }
        ),
        { numRuns: 40 }
      )
    })

    it('should handle case-insensitive search correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 8 }),
          fc.constantFrom('UPPER', 'lower', 'MiXeD'),
          fc.array(employeeGenerator, { minLength: 3, maxLength: 10 }),
          async (baseTerm, caseType, allEmployees) => {
            // Arrange - Create search term with different cases
            let searchTerm: string
            switch (caseType) {
              case 'UPPER':
                searchTerm = baseTerm.toUpperCase()
                break
              case 'lower':
                searchTerm = baseTerm.toLowerCase()
                break
              case 'MiXeD':
                searchTerm = baseTerm.split('').map((char, i) => 
                  i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
                ).join('')
                break
              default:
                searchTerm = baseTerm
            }

            // Create employees with the base term in different cases
            const employeesWithTerm = allEmployees.map((emp, index) => ({
              ...emp,
              firstName: index === 0 ? `${baseTerm.toLowerCase()}John` : emp.firstName,
              lastName: index === 1 ? `Smith${baseTerm.toUpperCase()}` : emp.lastName,
              email: index === 2 ? `${baseTerm.toLowerCase()}@company.com` : emp.email
            }))

            const expectedMatches = employeesWithTerm.filter(emp => {
              const termLower = baseTerm.toLowerCase()
              return (
                emp.firstName.toLowerCase().includes(termLower) ||
                emp.lastName.toLowerCase().includes(termLower) ||
                emp.email.toLowerCase().includes(termLower)
              ) && emp.status !== 'terminated'
            })

            mockPrisma.employee.count.mockResolvedValue(expectedMatches.length)
            mockPrisma.employee.findMany.mockResolvedValue(expectedMatches as any)

            const criteria: SearchCriteria = {
              search: searchTerm,
              skip: 0,
              take: 10
            }

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - Should find matches regardless of case
            expect(result.data.length).toBeGreaterThan(0)
            
            result.data.forEach(employee => {
              const termLower = baseTerm.toLowerCase()
              const matchesSearch = 
                employee.firstName.toLowerCase().includes(termLower) ||
                employee.lastName.toLowerCase().includes(termLower) ||
                employee.email.toLowerCase().includes(termLower) ||
                employee.employeeNumber.toLowerCase().includes(termLower)
              
              expect(matchesSearch).toBe(true)
            })
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should respect pagination parameters correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 50 }), // skip
          fc.integer({ min: 1, max: 20 }), // take
          fc.integer({ min: 10, max: 100 }), // total available
          async (skip, take, totalAvailable) => {
            // Arrange
            const allEmployees = Array.from({ length: totalAvailable }, (_, i) => ({
              id: `emp-${i}`,
              employeeNumber: `EMP${i.toString().padStart(6, '0')}`,
              firstName: `Employee${i}`,
              lastName: `Test${i}`,
              email: `emp${i}@company.com`,
              department: 'Engineering',
              location: 'New York',
              status: 'active',
              employmentType: 'Full-time',
              jobTitle: 'Developer',
              managerId: null
            }))

            // Calculate expected results based on pagination
            const expectedCount = Math.min(take, Math.max(0, totalAvailable - skip))
            const expectedResults = allEmployees.slice(skip, skip + take)

            mockPrisma.employee.count.mockResolvedValue(totalAvailable)
            mockPrisma.employee.findMany.mockResolvedValue(expectedResults as any)

            const criteria: SearchCriteria = {
              skip,
              take
            }

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - Pagination should be respected
            expect(result.skip).toBe(skip)
            expect(result.take).toBe(take)
            expect(result.total).toBe(totalAvailable)
            expect(result.data.length).toBe(expectedCount)

            // Verify correct records are returned
            if (expectedCount > 0) {
              expect(result.data[0].employeeNumber).toBe(`EMP${skip.toString().padStart(6, '0')}`)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return empty results when no employees match criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          departmentGenerator,
          locationGenerator,
          fc.string({ minLength: 10, maxLength: 20 }), // Unlikely search term
          async (department, location, unlikelySearch) => {
            // Arrange - Mock no matching results
            mockPrisma.employee.count.mockResolvedValue(0)
            mockPrisma.employee.findMany.mockResolvedValue([])

            const criteria: SearchCriteria = {
              department,
              location,
              search: `${unlikelySearch}XYZ123UNLIKELY`,
              skip: 0,
              take: 10
            }

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - Should return empty results gracefully
            expect(result.data).toEqual([])
            expect(result.total).toBe(0)
            expect(result.skip).toBe(0)
            expect(result.take).toBe(10)
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should exclude terminated employees from default searches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(employeeGenerator, { minLength: 5, maxLength: 15 }),
          async (allEmployees) => {
            // Arrange - Mix of active and terminated employees
            const employeesWithMixedStatus = allEmployees.map((emp, index) => ({
              ...emp,
              status: index % 3 === 0 ? 'terminated' : 'active'
            }))

            const activeEmployees = employeesWithMixedStatus.filter(emp => 
              emp.status !== 'terminated'
            )

            mockPrisma.employee.count.mockResolvedValue(activeEmployees.length)
            mockPrisma.employee.findMany.mockResolvedValue(activeEmployees as any)

            const criteria: SearchCriteria = {
              skip: 0,
              take: 20
            }

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - Should not include terminated employees
            result.data.forEach(employee => {
              expect(employee.status).not.toBe('terminated')
            })

            expect(result.total).toBe(activeEmployees.length)
          }
        ),
        { numRuns: 40 }
      )
    })
  })

  /**
   * Additional search robustness properties
   */
  describe('Search Robustness Properties', () => {
    it('should handle special characters in search terms safely', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => 
            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(s)
          ),
          fc.array(employeeGenerator, { minLength: 3, maxLength: 8 }),
          async (specialCharSearch, employees) => {
            // Arrange
            mockPrisma.employee.count.mockResolvedValue(0)
            mockPrisma.employee.findMany.mockResolvedValue([])

            const criteria: SearchCriteria = {
              search: specialCharSearch,
              skip: 0,
              take: 10
            }

            // Act & Assert - Should not throw errors with special characters
            await expect(employeeService.searchEmployees(criteria))
              .resolves.not.toThrow()

            const result = await employeeService.searchEmployees(criteria)
            expect(result).toBeDefined()
            expect(Array.isArray(result.data)).toBe(true)
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should handle very large skip values gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 10000 }), // Very large skip
          fc.integer({ min: 1, max: 10 }),
          async (largeSkip, take) => {
            // Arrange
            mockPrisma.employee.count.mockResolvedValue(100) // Total less than skip
            mockPrisma.employee.findMany.mockResolvedValue([])

            const criteria: SearchCriteria = {
              skip: largeSkip,
              take
            }

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - Should handle gracefully
            expect(result.data).toEqual([])
            expect(result.total).toBe(100)
            expect(result.skip).toBe(largeSkip)
            expect(result.take).toBe(take)
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})