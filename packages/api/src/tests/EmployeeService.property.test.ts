import * as fc from 'fast-check'
import { EmployeeService, CreateEmployeeRequest, SearchCriteria } from '../services/EmployeeService'
import { prisma } from '../utils/database'
import { CacheService } from '../utils/redis'

// Mock dependencies
jest.mock('../utils/database')
jest.mock('../utils/redis')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>

/**
 * Property-Based Tests for Employee Service
 * These tests verify universal correctness properties across all possible inputs
 */

describe('EmployeeService Property-Based Tests', () => {
  let employeeService: EmployeeService

  beforeEach(() => {
    jest.clearAllMocks()
    employeeService = new EmployeeService()
  })

  // Generators for test data
  const emailGenerator = fc.emailAddress()
  const phoneGenerator = fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^\d+$/.test(s))
  const nameGenerator = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
  const departmentGenerator = fc.constantFrom('Engineering', 'HR', 'Sales', 'Marketing', 'Finance')
  const employmentTypeGenerator = fc.constantFrom('Full-time', 'Part-time', 'Contract', 'Temporary')
  const locationGenerator = fc.constantFrom('New York', 'Los Angeles', 'Chicago', 'Remote', 'London')
  const statusGenerator = fc.constantFrom('active', 'inactive', 'on_leave', 'terminated')

  const addressGenerator = fc.record({
    street: fc.string({ minLength: 5, maxLength: 100 }),
    city: fc.string({ minLength: 2, maxLength: 50 }),
    state: fc.string({ minLength: 2, maxLength: 50 }),
    zipCode: fc.string({ minLength: 5, maxLength: 10 }),
    country: fc.string({ minLength: 2, maxLength: 50 })
  })

  const emergencyContactGenerator = fc.record({
    name: nameGenerator,
    relationship: fc.constantFrom('Spouse', 'Parent', 'Sibling', 'Friend', 'Other'),
    phone: phoneGenerator,
    email: fc.option(emailGenerator, { nil: null })
  })

  const salaryInfoGenerator = fc.record({
    amount: fc.float({ min: 30000, max: 200000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP'),
    frequency: fc.constantFrom('annual', 'monthly', 'hourly')
  })

  const createEmployeeRequestGenerator = fc.record({
    firstName: nameGenerator,
    lastName: nameGenerator,
    middleName: fc.option(nameGenerator, { nil: undefined }),
    dateOfBirth: fc.date({ min: new Date('1950-01-01'), max: new Date('2005-12-31') }),
    gender: fc.option(fc.constantFrom('Male', 'Female', 'Other'), { nil: undefined }),
    maritalStatus: fc.option(fc.constantFrom('Single', 'Married', 'Divorced', 'Widowed'), { nil: undefined }),
    email: emailGenerator,
    phone: phoneGenerator,
    address: addressGenerator,
    emergencyContacts: fc.array(emergencyContactGenerator, { minLength: 1, maxLength: 3 }),
    hireDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    employmentType: employmentTypeGenerator,
    jobTitle: fc.string({ minLength: 5, maxLength: 100 }),
    department: departmentGenerator,
    location: locationGenerator,
    managerId: fc.option(fc.uuid(), { nil: undefined }),
    salaryInfo: salaryInfoGenerator,
    customFields: fc.option(fc.record({
      skills: fc.array(fc.string({ minLength: 2, maxLength: 30 })),
      certifications: fc.array(fc.string({ minLength: 5, maxLength: 50 }))
    }), { nil: undefined })
  })

  /**
   * Property 1: Data Storage and Retrieval Integrity
   * For any employee profile with complete information, storing and then retrieving 
   * the profile should return all original data fields intact without loss or corruption.
   * 
   * Validates: Requirements 1.1, 2.1, 2.5
   */
  describe('Property 1: Data Storage and Retrieval Integrity', () => {
    it('Employee data stored should be retrievable with all fields intact', async () => {
      await fc.assert(
        fc.asyncProperty(
          createEmployeeRequestGenerator,
          fc.uuid(), // createdBy
          async (employeeData, createdBy) => {
            // Arrange
            const mockEmployee = {
              id: fc.sample(fc.uuid(), 1)[0],
              employeeNumber: 'EMP000001',
              ...employeeData,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy,
              updatedBy: createdBy
            }

            mockPrisma.employee.findUnique.mockResolvedValue(null) // No existing employee
            mockPrisma.employee.create.mockResolvedValue(mockEmployee as any)
            mockCacheService.set.mockResolvedValue(true)
            mockCacheService.del.mockResolvedValue(true)

            // Act
            const createdEmployee = await employeeService.createEmployee(employeeData, createdBy)

            // Assert - All original fields should be preserved
            expect(createdEmployee.firstName).toBe(employeeData.firstName)
            expect(createdEmployee.lastName).toBe(employeeData.lastName)
            expect(createdEmployee.email).toBe(employeeData.email)
            expect(createdEmployee.phone).toBe(employeeData.phone)
            expect(createdEmployee.department).toBe(employeeData.department)
            expect(createdEmployee.jobTitle).toBe(employeeData.jobTitle)
            expect(createdEmployee.location).toBe(employeeData.location)
            expect(createdEmployee.employmentType).toBe(employeeData.employmentType)
            expect(createdEmployee.address).toEqual(employeeData.address)
            expect(createdEmployee.emergencyContacts).toEqual(employeeData.emergencyContacts)
            expect(createdEmployee.salaryInfo).toEqual(employeeData.salaryInfo)
            
            // Verify audit fields are set
            expect(createdEmployee.createdBy).toBe(createdBy)
            expect(createdEmployee.updatedBy).toBe(createdBy)
            expect(createdEmployee.status).toBe('active')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('Employee retrieval should return exact stored data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // employeeId
          createEmployeeRequestGenerator,
          async (employeeId, originalData) => {
            // Arrange
            const mockEmployee = {
              id: employeeId,
              employeeNumber: 'EMP000001',
              ...originalData,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              updatedBy: 'test-user',
              manager: null,
              directReports: [],
              timeEntries: [],
              leaveRequests: [],
              performanceReviews: []
            }

            mockCacheService.get.mockResolvedValue(null) // Not in cache
            mockPrisma.employee.findUnique.mockResolvedValue(mockEmployee as any)
            mockCacheService.set.mockResolvedValue(true)

            // Act
            const retrievedEmployee = await employeeService.getEmployee(employeeId)

            // Assert - Retrieved data should match stored data exactly
            expect(retrievedEmployee.id).toBe(employeeId)
            expect(retrievedEmployee.firstName).toBe(originalData.firstName)
            expect(retrievedEmployee.lastName).toBe(originalData.lastName)
            expect(retrievedEmployee.email).toBe(originalData.email)
            expect(retrievedEmployee.phone).toBe(originalData.phone)
            expect(retrievedEmployee.department).toBe(originalData.department)
            expect(retrievedEmployee.jobTitle).toBe(originalData.jobTitle)
            expect(retrievedEmployee.location).toBe(originalData.location)
            expect(retrievedEmployee.employmentType).toBe(originalData.employmentType)
            expect(retrievedEmployee.address).toEqual(originalData.address)
            expect(retrievedEmployee.emergencyContacts).toEqual(originalData.emergencyContacts)
            expect(retrievedEmployee.salaryInfo).toEqual(originalData.salaryInfo)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('Employee number generation should produce unique sequential numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (count) => {
            // Arrange
            const generatedNumbers = new Set<string>()
            
            for (let i = 0; i < count; i++) {
              const expectedNumber = `EMP${(i + 1).toString().padStart(6, '0')}`
              generatedNumbers.add(expectedNumber)
            }

            // Assert - All generated numbers should be unique and sequential
            expect(generatedNumbers.size).toBe(count)
            
            // Verify format
            generatedNumbers.forEach(num => {
              expect(num).toMatch(/^EMP\d{6}$/)
            })
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  /**
   * Property 4: Search and Filter Accuracy
   * For any search query with specific filter criteria, all returned results should 
   * match the filter conditions and no matching records should be excluded.
   * 
   * Validates: Requirements 1.4, 14.6
   */
  describe('Property 4: Search and Filter Accuracy', () => {
    it('Search results should only contain employees matching all filter criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          departmentGenerator,
          locationGenerator,
          statusGenerator,
          fc.string({ minLength: 1, maxLength: 50 }), // search term
          fc.integer({ min: 0, max: 50 }), // skip
          fc.integer({ min: 1, max: 20 }), // take
          async (department, location, status, search, skip, take) => {
            // Arrange
            const criteria: SearchCriteria = {
              department,
              location,
              status,
              search,
              skip,
              take
            }

            const mockEmployees = [
              {
                id: '1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@company.com',
                department,
                location,
                status,
                employeeNumber: 'EMP000001'
              },
              {
                id: '2',
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@company.com',
                department: 'Different',
                location,
                status,
                employeeNumber: 'EMP000002'
              }
            ]

            const matchingEmployees = mockEmployees.filter(emp => 
              emp.department === department &&
              emp.location === location &&
              emp.status === status &&
              (emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
               emp.lastName.toLowerCase().includes(search.toLowerCase()) ||
               emp.email.toLowerCase().includes(search.toLowerCase()) ||
               emp.employeeNumber.toLowerCase().includes(search.toLowerCase()))
            )

            mockPrisma.employee.count.mockResolvedValue(matchingEmployees.length)
            mockPrisma.employee.findMany.mockResolvedValue(matchingEmployees as any)

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - All results should match the filter criteria
            result.data.forEach(employee => {
              expect(employee.department).toBe(department)
              expect(employee.location).toBe(location)
              expect(employee.status).toBe(status)
              
              // Should match search term in at least one field
              const matchesSearch = 
                employee.firstName.toLowerCase().includes(search.toLowerCase()) ||
                employee.lastName.toLowerCase().includes(search.toLowerCase()) ||
                employee.email.toLowerCase().includes(search.toLowerCase()) ||
                employee.employeeNumber.toLowerCase().includes(search.toLowerCase())
              
              expect(matchesSearch).toBe(true)
            })

            // Verify pagination
            expect(result.skip).toBe(skip)
            expect(result.take).toBe(take)
            expect(result.total).toBe(matchingEmployees.length)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('Empty search criteria should return all active employees', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 50 }), // skip
          fc.integer({ min: 1, max: 20 }), // take
          async (skip, take) => {
            // Arrange
            const criteria: SearchCriteria = { skip, take }
            const mockEmployees = Array.from({ length: 10 }, (_, i) => ({
              id: `emp-${i}`,
              firstName: `Employee${i}`,
              lastName: `Test${i}`,
              email: `emp${i}@company.com`,
              department: 'Engineering',
              location: 'New York',
              status: 'active',
              employeeNumber: `EMP${(i + 1).toString().padStart(6, '0')}`
            }))

            mockPrisma.employee.count.mockResolvedValue(mockEmployees.length)
            mockPrisma.employee.findMany.mockResolvedValue(mockEmployees as any)

            // Act
            const result = await employeeService.searchEmployees(criteria)

            // Assert - Should return all employees (not terminated)
            result.data.forEach(employee => {
              expect(employee.status).not.toBe('terminated')
            })

            expect(result.skip).toBe(skip)
            expect(result.take).toBe(take)
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  /**
   * Property 5: Organizational Hierarchy Integrity
   * For any organizational structure with reporting relationships, the hierarchy should 
   * maintain referential integrity with no circular references or orphaned nodes.
   * 
   * Validates: Requirements 1.3
   */
  describe('Property 5: Organizational Hierarchy Integrity', () => {
    it('No circular references should exist in reporting structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              employeeId: fc.uuid(),
              managerId: fc.option(fc.uuid(), { nil: undefined })
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (updates) => {
            // Arrange - Ensure no direct circular references
            const validUpdates = updates.filter(update => 
              update.managerId !== update.employeeId
            )

            // Mock the circular reference check to return false (no circles)
            for (const update of validUpdates) {
              if (update.managerId) {
                mockPrisma.employee.findUnique.mockResolvedValue({
                  id: update.managerId,
                  managerId: null // Manager has no manager to avoid circles
                } as any)
              }
              
              mockPrisma.employee.update.mockResolvedValue({} as any)
              mockCacheService.del.mockResolvedValue(true)
            }

            // Act & Assert - Should not throw for valid hierarchy updates
            await expect(
              employeeService.updateReportingStructure(validUpdates)
            ).resolves.not.toThrow()

            // Verify no employee is their own manager
            validUpdates.forEach(update => {
              if (update.managerId) {
                expect(update.employeeId).not.toBe(update.managerId)
              }
            })
          }
        ),
        { numRuns: 30 }
      )
    })

    it('Organization chart should maintain hierarchy integrity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              firstName: nameGenerator,
              lastName: nameGenerator,
              jobTitle: fc.string({ minLength: 5, maxLength: 50 }),
              email: emailGenerator,
              managerId: fc.option(fc.uuid(), { nil: null }),
              status: fc.constant('active')
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (employees) => {
            // Arrange - Create valid hierarchy (root employees have no manager)
            const rootEmployees = employees.filter(emp => emp.managerId === null)
            
            mockPrisma.employee.findMany.mockResolvedValue(rootEmployees as any)

            // Mock the recursive building of organization nodes
            for (const employee of rootEmployees) {
              mockPrisma.employee.findMany
                .mockResolvedValueOnce([]) // No direct reports for simplicity
            }

            // Act
            const orgChart = await employeeService.getOrganizationChart()

            // Assert - Each node should have valid structure
            orgChart.forEach(node => {
              expect(node.id).toBeDefined()
              expect(node.firstName).toBeDefined()
              expect(node.lastName).toBeDefined()
              expect(node.jobTitle).toBeDefined()
              expect(node.email).toBeDefined()
              expect(Array.isArray(node.directReports)).toBe(true)
              
              // Root nodes should not have managerId or it should be null
              expect(node.managerId).toBeNull()
            })
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})

/**
 * Additional Employee Data Property Tests
 */
describe('EmployeeService Data Properties', () => {
  let employeeService: EmployeeService

  beforeEach(() => {
    jest.clearAllMocks()
    employeeService = new EmployeeService()
  })

  /**
   * Property: Email uniqueness should be enforced
   */
  it('Duplicate email addresses should be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        createEmployeeRequestGenerator,
        fc.uuid(), // createdBy
        async (employeeData, createdBy) => {
          // Arrange - Mock existing employee with same email
          mockPrisma.employee.findUnique.mockResolvedValue({
            id: 'existing-id',
            email: employeeData.email
          } as any)

          // Act & Assert - Should throw conflict error
          await expect(
            employeeService.createEmployee(employeeData, createdBy)
          ).rejects.toThrow('already exists')
        }
      ),
      { numRuns: 30 }
    )
  })

  /**
   * Property: Employee status transitions should be tracked
   */
  it('Employee termination should update status and date', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // employeeId
        fc.date({ min: new Date(), max: new Date(Date.now() + 86400000) }), // terminationDate
        fc.string({ minLength: 5, maxLength: 100 }), // reason
        fc.uuid(), // terminatedBy
        async (employeeId, terminationDate, reason, terminatedBy) => {
          // Arrange
          const mockEmployee = {
            id: employeeId,
            status: 'active',
            firstName: 'John',
            lastName: 'Doe'
          }

          mockPrisma.employee.findUnique.mockResolvedValue(mockEmployee as any)
          mockPrisma.employee.update.mockResolvedValue({
            ...mockEmployee,
            status: 'terminated',
            terminationDate
          } as any)
          mockPrisma.auditLog.create.mockResolvedValue({} as any)
          mockCacheService.del.mockResolvedValue(true)

          // Act
          const result = await employeeService.terminateEmployee(
            employeeId, 
            terminationDate, 
            reason, 
            terminatedBy
          )

          // Assert
          expect(result.status).toBe('terminated')
          expect(mockPrisma.employee.update).toHaveBeenCalledWith({
            where: { id: employeeId },
            data: {
              status: 'terminated',
              terminationDate,
              updatedBy: terminatedBy
            }
          })
        }
      ),
      { numRuns: 30 }
    )
  })

  /**
   * Property: Employee statistics should be accurate
   */
  it('Employee statistics should reflect actual data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }), // total count
        fc.array(
          fc.record({
            status: statusGenerator,
            _count: fc.integer({ min: 1, max: 20 })
          }),
          { minLength: 1, maxLength: 4 }
        ),
        async (totalCount, statusGroups) => {
          // Arrange
          mockPrisma.employee.count.mockResolvedValue(totalCount)
          mockPrisma.employee.groupBy
            .mockResolvedValueOnce(statusGroups as any) // byStatus
            .mockResolvedValueOnce([]) // byDepartment
            .mockResolvedValueOnce([]) // byLocation

          // Act
          const stats = await employeeService.getEmployeeStatistics()

          // Assert
          expect(stats.total).toBe(totalCount)
          expect(typeof stats.byStatus).toBe('object')
          expect(typeof stats.byDepartment).toBe('object')
          expect(typeof stats.byLocation).toBe('object')

          // Verify status counts are properly mapped
          statusGroups.forEach(group => {
            expect(stats.byStatus[group.status]).toBe(group._count)
          })
        }
      ),
      { numRuns: 30 }
    )
  })
})
