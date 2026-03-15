import { Request, Response } from 'express'
import { prisma } from '../utils/database'
import { CacheService } from '../utils/redis'
import { logger } from '../utils/logger'
import { encryptionService } from '../services/AuditLogService'
import { EmployeeService } from '../services/EmployeeService'
import { OrganizationService } from '../services/OrganizationService'
import {
  NotFoundError,
  ValidationError,
  ConflictError
} from '../middleware/errorHandler'
import {
  CreateEmployeeRequestSchema,
  UpdateEmployeeRequestSchema,
  SearchCriteriaSchema,
  createSuccessResponse,
  Employee,
  SearchResult,
  CACHE_TTL
} from '@hrms/shared'

export class EmployeeController {
  async getEmployees(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const skip = (page - 1) * limit
    const includeTerminated = req.query.includeTerminated === 'true'

    // Build where clause — exclude terminated employees by default
    const where = includeTerminated ? {} : { status: { not: 'terminated' } }

    // Check cache first
    const cacheKey = `employees:page:${page}:limit:${limit}:terminated:${includeTerminated}`
    const cached = await CacheService.get<SearchResult<Employee>>(cacheKey)

    if (cached) {
      return res.json(createSuccessResponse(cached))
    }

    // Fetch from database
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              roles: {
                select: {
                  role: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.employee.count({ where })
    ])

    const result: SearchResult<Employee> = {
      data: employees.map(this.mapEmployeeToResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }

    // Cache the result
    await CacheService.set(cacheKey, result, CACHE_TTL.SHORT)

    res.json(createSuccessResponse(result))
    return
  }

  async getEmployee(req: Request, res: Response) {
    const { id } = req.params

    // Check cache first
    const cacheKey = `employee:${id}`
    const cached = await CacheService.get<Employee>(cacheKey)

    if (cached) {
      return res.json(createSuccessResponse(cached))
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true
          }
        },
        directReports: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true
          }
        }
      }
    })

    if (!employee) {
      throw new NotFoundError('Employee not found')
    }

    const result = this.mapEmployeeToResponse(employee)

    // Cache the result
    await CacheService.set(cacheKey, result, CACHE_TTL.MEDIUM)

    res.json(createSuccessResponse(result))
    return
  }

  async createEmployee(req: Request, res: Response) {
    const data = CreateEmployeeRequestSchema.parse(req.body)
    const userId = req.user!.id

    // Check if employee with same email already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: data.contactInfo.email }
    })

    if (existingEmployee) {
      throw new ConflictError('Employee with this email already exists')
    }

    // Generate employee number
    const employeeNumber = await this.generateEmployeeNumber()

    // Encrypt SSN if provided
    const encryptedSSN = data.personalInfo.ssn
      ? JSON.stringify(encryptionService.encrypt(data.personalInfo.ssn))
      : null

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        employeeNumber,
        firstName: data.personalInfo.firstName,
        lastName: data.personalInfo.lastName,
        middleName: data.personalInfo.middleName,
        dateOfBirth: data.personalInfo.dateOfBirth,
        gender: data.personalInfo.gender,
        maritalStatus: data.personalInfo.maritalStatus,
        nationality: data.personalInfo.nationality,
        ssn: encryptedSSN,
        email: data.contactInfo.email,
        phone: data.contactInfo.phone,
        address: data.contactInfo.address,
        emergencyContacts: data.contactInfo.emergencyContacts,
        hireDate: data.employmentInfo.hireDate,
        terminationDate: data.employmentInfo.terminationDate,
        employmentType: data.employmentInfo.employmentType,
        status: data.employmentInfo.status,
        jobTitle: data.employmentInfo.jobTitle,
        department: data.employmentInfo.department,
        location: data.employmentInfo.location,
        managerId: data.employmentInfo.managerId,
        skills: [],
        certifications: [],
        languages: [],
        customFields: { ...(data.customFields || {}), salaryInfo: data.employmentInfo.salaryInfo },
        createdBy: userId,
        updatedBy: userId
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true
          }
        }
      }
    })

    // Invalidate relevant caches
    await this.invalidateEmployeeCaches()

    // Log audit trail
    await this.createAuditLog(userId, 'CREATE', 'employee', employee.id, null, employee)

    logger.info(`Employee created: ${employee.id} by user ${userId}`)

    res.status(201).json(createSuccessResponse(
      this.mapEmployeeToResponse(employee),
      'Employee created successfully'
    ))
  }

  async updateEmployee(req: Request, res: Response) {
    const { id } = req.params
    const data = UpdateEmployeeRequestSchema.parse(req.body)
    const userId = req.user!.id

    // Get existing employee
    const existingEmployee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      throw new NotFoundError('Employee not found')
    }

    // Check email uniqueness if email is being updated
    if (data.contactInfo?.email && data.contactInfo.email !== existingEmployee.email) {
      const emailExists = await prisma.employee.findUnique({
        where: { email: data.contactInfo.email }
      })

      if (emailExists) {
        throw new ConflictError('Employee with this email already exists')
      }
    }

    // Update employee
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        ...(data.personalInfo && {
          firstName: data.personalInfo.firstName,
          lastName: data.personalInfo.lastName,
          middleName: data.personalInfo.middleName,
          dateOfBirth: data.personalInfo.dateOfBirth,
          gender: data.personalInfo.gender,
          maritalStatus: data.personalInfo.maritalStatus,
          nationality: data.personalInfo.nationality,
          ssn: data.personalInfo.ssn
            ? JSON.stringify(encryptionService.encrypt(data.personalInfo.ssn))
            : existingEmployee.ssn
        }),
        ...(data.contactInfo && {
          email: data.contactInfo.email,
          phone: data.contactInfo.phone,
          address: data.contactInfo.address,
          emergencyContacts: data.contactInfo.emergencyContacts
        }),
        ...(data.employmentInfo && {
          hireDate: data.employmentInfo.hireDate,
          terminationDate: data.employmentInfo.terminationDate,
          employmentType: data.employmentInfo.employmentType,
          status: data.employmentInfo.status,
          jobTitle: data.employmentInfo.jobTitle,
          department: data.employmentInfo.department,
          location: data.employmentInfo.location,
          managerId: data.employmentInfo.managerId
        }),
        customFields: {
          ...(existingEmployee.customFields as object || {}),
          ...(data.customFields || {}),
          ...(data.employmentInfo?.salaryInfo ? { salaryInfo: data.employmentInfo.salaryInfo } : {})
        },
        updatedBy: userId
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true
          }
        }
      }
    })

    // Invalidate caches
    await CacheService.del(`employee:${id}`)
    await this.invalidateEmployeeCaches()

    // Log audit trail
    await this.createAuditLog(userId, 'UPDATE', 'employee', id, existingEmployee, updatedEmployee)

    logger.info(`Employee updated: ${id} by user ${userId}`)

    res.json(createSuccessResponse(
      this.mapEmployeeToResponse(updatedEmployee),
      'Employee updated successfully'
    ))
  }

  async deleteEmployee(req: Request, res: Response) {
    const { id } = req.params
    const userId = req.user!.id

    const employee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!employee) {
      throw new NotFoundError('Employee not found')
    }

    // Soft delete by updating status
    const deletedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        status: 'terminated',
        terminationDate: new Date(),
        updatedBy: userId
      }
    })

    // Invalidate caches
    await CacheService.del(`employee:${id}`)
    await this.invalidateEmployeeCaches()

    // Log audit trail
    await this.createAuditLog(userId, 'DELETE', 'employee', id, employee, deletedEmployee)

    logger.info(`Employee deleted: ${id} by user ${userId}`)

    res.json(createSuccessResponse(null, 'Employee deleted successfully'))
  }

  async searchEmployees(req: Request, res: Response) {
    const criteria = SearchCriteriaSchema.parse(req.body)
    const skip = (criteria.page - 1) * criteria.limit

    // Build where clause
    const where: any = {}

    if (criteria.query) {
      where.OR = [
        { firstName: { contains: criteria.query, mode: 'insensitive' } },
        { lastName: { contains: criteria.query, mode: 'insensitive' } },
        { email: { contains: criteria.query, mode: 'insensitive' } },
        { employeeNumber: { contains: criteria.query, mode: 'insensitive' } }
      ]
    }

    if (criteria.department) {
      where.department = criteria.department
    }

    if (criteria.location) {
      where.location = criteria.location
    }

    if (criteria.status) {
      where.status = criteria.status
    }

    if (criteria.employmentType) {
      where.employmentType = criteria.employmentType
    }

    if (criteria.managerId) {
      where.managerId = criteria.managerId
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: criteria.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true
            }
          }
        }
      }),
      prisma.employee.count({ where })
    ])

    const result: SearchResult<Employee> = {
      data: employees.map(this.mapEmployeeToResponse),
      total,
      page: criteria.page,
      limit: criteria.limit,
      totalPages: Math.ceil(total / criteria.limit)
    }

    res.json(createSuccessResponse(result))
  }

  async updateReportingStructure(req: Request, res: Response) {
    const updates = req.body.updates as Array<{ employeeId: string; managerId?: string }>
    const userId = req.user!.id

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ValidationError('Updates array is required and cannot be empty')
    }

    // Validate each update
    for (const update of updates) {
      if (!update.employeeId) {
        throw new ValidationError('Employee ID is required for each update')
      }

      // Check if employee exists
      const employee = await prisma.employee.findUnique({
        where: { id: update.employeeId }
      })

      if (!employee) {
        throw new NotFoundError(`Employee with ID ${update.employeeId} not found`)
      }

      // Check if manager exists (if provided)
      if (update.managerId) {
        const manager = await prisma.employee.findUnique({
          where: { id: update.managerId }
        })

        if (!manager) {
          throw new NotFoundError(`Manager with ID ${update.managerId} not found`)
        }

        // Prevent self-management
        if (update.employeeId === update.managerId) {
          throw new ValidationError('Employee cannot be their own manager')
        }
      }
    }

    // Use EmployeeService to handle the updates with circular reference checking
    const employeeService = new EmployeeService()
    await employeeService.updateReportingStructure(updates)

    // Invalidate relevant caches
    await CacheService.del('organization:chart')
    await this.invalidateEmployeeCaches()

    // Log audit trail for each update
    for (const update of updates) {
      await this.createAuditLog(
        userId,
        'UPDATE_REPORTING',
        'employee',
        update.employeeId,
        null,
        { managerId: update.managerId }
      )
    }

    logger.info(`Reporting structure updated for ${updates.length} employees by user ${userId}`)

    res.json(createSuccessResponse(
      { updatedCount: updates.length },
      'Reporting structure updated successfully'
    ))
  }

  async getEmployeesByManager(req: Request, res: Response) {
    const { managerId } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const skip = (page - 1) * limit

    // Check cache first
    const cacheKey = `manager:${managerId}:reports:page:${page}:limit:${limit}`
    const cached = await CacheService.get(cacheKey)

    if (cached) {
      return res.json(createSuccessResponse(cached))
    }

    // Verify manager exists
    const manager = await prisma.employee.findUnique({
      where: { id: managerId }
    })

    if (!manager) {
      throw new NotFoundError('Manager not found')
    }

    // Get direct reports
    const [directReports, total] = await Promise.all([
      prisma.employee.findMany({
        where: {
          managerId,
          status: { not: 'terminated' }
        },
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
          department: true,
          email: true,
          status: true
        }
      }),
      prisma.employee.count({
        where: {
          managerId,
          status: { not: 'terminated' }
        }
      })
    ])

    const result = {
      data: directReports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      manager: {
        id: manager.id,
        firstName: manager.firstName,
        lastName: manager.lastName,
        jobTitle: manager.jobTitle
      }
    }

    // Cache the result
    await CacheService.set(cacheKey, result, CACHE_TTL.MEDIUM)

    res.json(createSuccessResponse(result))
    return
  }

  async getOrganizationChartOld(req: Request, res: Response) {
    // Check cache first
    const cacheKey = 'organization:chart'
    const cached = await CacheService.get(cacheKey)

    if (cached) {
      return res.json(createSuccessResponse(cached))
    }

    // Get all employees with their manager relationships
    const employees = await prisma.employee.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        department: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true
          }
        }
      },
      orderBy: { jobTitle: 'asc' }
    })

    // Build organization tree
    const orgChart = this.buildOrganizationTree(employees)

    // Cache the result
    await CacheService.set(cacheKey, orgChart, CACHE_TTL.LONG)

    res.json(createSuccessResponse(orgChart))
    return
  }

  private mapEmployeeToResponse(employee: any): any {
    // Decrypt SSN if it's encrypted
    let decryptedSSN = employee.ssn
    if (employee.ssn && employee.ssn.startsWith('{')) {
      try {
        const encryptedData = JSON.parse(employee.ssn)
        decryptedSSN = encryptionService.decrypt(encryptedData)
      } catch (error) {
        logger.warn(`Failed to decrypt SSN for employee ${employee.id}:`, error)
        decryptedSSN = null // Don't expose potentially corrupted data
      }
    }

    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      userId: employee.userId || null,
      user: employee.user ? {
        id: employee.user.id,
        email: employee.user.email,
        firstName: employee.user.firstName,
        lastName: employee.user.lastName,
        roles: (employee.user.roles || []).map((ur: any) => ur.role?.name || ur.name).filter(Boolean)
      } : null,
      personalInfo: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        middleName: employee.middleName,
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        maritalStatus: employee.maritalStatus,
        nationality: employee.nationality,
        ssn: decryptedSSN
      },
      contactInfo: {
        email: employee.email,
        phone: employee.phone,
        address: employee.address,
        emergencyContacts: employee.emergencyContacts
      },
      employmentInfo: {
        hireDate: employee.hireDate,
        terminationDate: employee.terminationDate,
        employmentType: employee.employmentType,
        status: employee.status,
        jobTitle: employee.jobTitle,
        department: employee.department,
        location: employee.location,
        managerId: employee.managerId,
        salaryInfo: employee.salaryInfo || (employee.customFields as any)?.salaryInfo
      },
      customFields: employee.customFields,
      auditInfo: {
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
        createdBy: employee.createdBy,
        updatedBy: employee.updatedBy
      }
    }
  }

  private async generateEmployeeNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await prisma.employee.count()
    return `EMP${year}${String(count + 1).padStart(4, '0')}`
  }

  private buildOrganizationTree(employees: any[]): any[] {
    const employeeMap = new Map()
    const roots: any[] = []

    // Create employee map
    employees.forEach(emp => {
      employeeMap.set(emp.id, { ...emp, children: [] })
    })

    // Build tree structure
    employees.forEach(emp => {
      const employee = employeeMap.get(emp.id)
      if (emp.managerId && employeeMap.has(emp.managerId)) {
        const manager = employeeMap.get(emp.managerId)
        manager.children.push(employee)
      } else {
        roots.push(employee)
      }
    })

    return roots
  }

  private async invalidateEmployeeCaches(): Promise<void> {
    // This is a simple approach - in production, you might want more sophisticated cache invalidation
    const keys = ['employees:page:', 'organization:chart']
    for (const keyPattern of keys) {
      // In a real implementation, you'd scan for keys matching the pattern
      // For now, we'll just delete the organization chart
      if (keyPattern === 'organization:chart') {
        await CacheService.del(keyPattern)
      }
    }
  }

  private async createAuditLog(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    oldValues: any,
    newValues: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          oldValues: oldValues || null,
          newValues: newValues || null
        }
      })
    } catch (error) {
      logger.error('Failed to create audit log:', error)
      // Don't throw - audit log failure shouldn't break the main operation
    }
  }

  async getOrganizationChart(req: Request, res: Response) {
    const { department } = req.query

    const organizationService = new OrganizationService()
    const orgChart = await organizationService.getOrganizationChart(department as string)

    res.json(createSuccessResponse(orgChart))
  }

  async getHierarchyStats(req: Request, res: Response) {
    const organizationService = new OrganizationService()
    const stats = await organizationService.getHierarchyStats()

    res.json(createSuccessResponse(stats))
  }

  async getReportingChain(req: Request, res: Response) {
    const { employeeId } = req.params

    const organizationService = new OrganizationService()
    const reportingChain = await organizationService.getReportingChain(employeeId)

    res.json(createSuccessResponse(reportingChain))
  }

  async getEmployeesByLevel(req: Request, res: Response) {
    const level = parseInt(req.params.level)

    if (isNaN(level) || level < 0) {
      throw new ValidationError('Level must be a non-negative integer')
    }

    const organizationService = new OrganizationService()
    const employees = await organizationService.getEmployeesByLevel(level)

    res.json(createSuccessResponse(employees))
  }

  async getStatistics(req: Request, res: Response) {
    const employeeService = new EmployeeService()
    const stats = await employeeService.getEmployeeStatistics()
    res.json(createSuccessResponse(stats))
  }
}