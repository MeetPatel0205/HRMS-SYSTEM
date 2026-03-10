import { prisma } from '../utils/database'
import { CacheService } from '../utils/redis'
import { logger } from '../utils/logger'
import {
  ValidationError,
  NotFoundError,
  ConflictError
} from '../middleware/errorHandler'

export interface CreateEmployeeRequest {
  firstName: string
  lastName: string
  middleName?: string
  dateOfBirth: Date
  gender?: string
  maritalStatus?: string
  email: string
  phone: string
  address: any
  emergencyContacts: any[]
  hireDate: Date
  employmentType: string
  jobTitle: string
  department: string
  location: string
  managerId?: string
  salaryInfo: any
  customFields?: Record<string, any>
}

export interface UpdateEmployeeRequest {
  firstName?: string
  lastName?: string
  middleName?: string
  dateOfBirth?: Date
  gender?: string
  maritalStatus?: string
  email?: string
  phone?: string
  address?: any
  emergencyContacts?: any[]
  jobTitle?: string
  department?: string
  location?: string
  managerId?: string
  salaryInfo?: any
  customFields?: Record<string, any>
}

export interface SearchCriteria {
  department?: string
  location?: string
  status?: string
  jobTitle?: string
  search?: string
  skip: number
  take: number
}

export interface SearchResult<T> {
  data: T[]
  total: number
  skip: number
  take: number
}

export interface OrganizationNode {
  id: string
  firstName: string
  lastName: string
  jobTitle: string
  email: string
  managerId?: string
  directReports: OrganizationNode[]
}

export class EmployeeService {
  /**
   * Create a new employee
   * Property 1: Data Storage and Retrieval Integrity
   */
  async createEmployee(request: CreateEmployeeRequest, createdBy: string): Promise<any> {
    // Validate required fields
    this.validateEmployeeData(request)

    // Check if email is unique
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: request.email }
    })

    if (existingEmployee) {
      throw new ConflictError(`Employee with email ${request.email} already exists`)
    }

    // Generate unique employee number
    const employeeNumber = await this.generateEmployeeNumber()

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        employeeNumber,
        firstName: request.firstName,
        lastName: request.lastName,
        middleName: request.middleName,
        dateOfBirth: request.dateOfBirth,
        gender: request.gender,
        maritalStatus: request.maritalStatus,
        email: request.email,
        phone: request.phone,
        address: request.address,
        emergencyContacts: request.emergencyContacts,
        hireDate: request.hireDate,
        employmentType: request.employmentType,
        jobTitle: request.jobTitle,
        department: request.department,
        location: request.location,
        managerId: request.managerId,
        salaryInfo: request.salaryInfo,
        skills: [],
        certifications: [],
        languages: [],
        customFields: request.customFields || {},
        createdBy,
        updatedBy: createdBy,
        status: 'active'
      },
      include: {
        manager: true,
        directReports: true
      }
    })

    // Cache the employee
    await CacheService.set(
      `employee:${employee.id}`,
      employee,
      24 * 60 * 60 // 24 hours
    )

    // Clear employees list cache
    await CacheService.del('employees_list')

    logger.info(`Employee created: ${employee.id}`)

    return employee
  }

  /**
   * Update employee information
   * Property 2: Comprehensive Audit Trail
   */
  async updateEmployee(employeeId: string, updates: UpdateEmployeeRequest, updatedBy: string): Promise<any> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      throw new NotFoundError('Employee not found')
    }

    // Validate updated fields if provided
    if (updates.email && updates.email !== employee.email) {
      const existingEmployee = await prisma.employee.findUnique({
        where: { email: updates.email }
      })
      if (existingEmployee) {
        throw new ConflictError(`Employee with email ${updates.email} already exists`)
      }
    }

    // Store old values for audit trail
    const oldValues = { ...employee }

    // Update employee
    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...updates,
        updatedBy,
        updatedAt: new Date()
      },
      include: {
        manager: true,
        directReports: true
      }
    })

    // Create audit log entry
    await this.createAuditLog(
      updatedBy,
      'UPDATE',
      'employees',
      employeeId,
      oldValues,
      updatedEmployee
    )

    // Update cache
    await CacheService.set(
      `employee:${employeeId}`,
      updatedEmployee,
      24 * 60 * 60
    )

    // Clear employees list cache
    await CacheService.del('employees_list')

    logger.info(`Employee updated: ${employeeId}`)

    return updatedEmployee
  }

  /**
   * Get employee by ID
   * Property 1: Data Storage and Retrieval Integrity
   */
  async getEmployee(employeeId: string): Promise<any> {
    // Try to get from cache first
    const cached = await CacheService.get(`employee:${employeeId}`)
    if (cached) {
      return cached
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        manager: true,
        directReports: true,
        timeEntries: {
          orderBy: { date: 'desc' },
          take: 10
        },
        leaveRequests: {
          orderBy: { submittedAt: 'desc' },
          take: 10
        },
        performanceReviews: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    if (!employee) {
      throw new NotFoundError('Employee not found')
    }

    // Cache the employee
    await CacheService.set(
      `employee:${employeeId}`,
      employee,
      24 * 60 * 60
    )

    return employee
  }

  /**
   * Search employees with advanced filtering
   * Property 4: Search and Filter Accuracy
   */
  async searchEmployees(criteria: SearchCriteria): Promise<SearchResult<any>> {
    const where: any = {
      status: { not: 'terminated' }
    }

    // Apply filters
    if (criteria.department) {
      where.department = criteria.department
    }

    if (criteria.location) {
      where.location = criteria.location
    }

    if (criteria.status) {
      where.status = criteria.status
    }

    if (criteria.jobTitle) {
      where.jobTitle = {
        contains: criteria.jobTitle,
        mode: 'insensitive'
      }
    }

    if (criteria.search) {
      where.OR = [
        {
          firstName: {
            contains: criteria.search,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: criteria.search,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: criteria.search,
            mode: 'insensitive'
          }
        },
        {
          employeeNumber: {
            contains: criteria.search,
            mode: 'insensitive'
          }
        }
      ]
    }

    // Get total count
    const total = await prisma.employee.count({ where })

    // Get paginated results
    const data = await prisma.employee.findMany({
      where,
      skip: criteria.skip,
      take: criteria.take,
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return {
      data,
      total,
      skip: criteria.skip,
      take: criteria.take
    }
  }

  /**
   * Get organizational chart
   * Property 5: Organizational Hierarchy Integrity
   */
  async getOrganizationChart(departmentId?: string): Promise<OrganizationNode[]> {
    // Get all employees without manager (root level)
    const rootEmployees = await prisma.employee.findMany({
      where: {
        managerId: null,
        status: 'active',
        ...(departmentId && { department: departmentId })
      },
      include: {
        directReports: true
      }
    })

    // Build organization tree
    const tree: OrganizationNode[] = []
    for (const employee of rootEmployees) {
      const node = await this.buildOrganizationNode(employee)
      tree.push(node)
    }

    return tree
  }

  /**
   * Update reporting structure
   */
  async updateReportingStructure(updates: Array<{ employeeId: string; managerId?: string }>): Promise<void> {
    for (const update of updates) {
      // Check for circular references
      if (update.managerId) {
        const wouldCreateCircle = await this.checkCircularReference(update.employeeId, update.managerId)
        if (wouldCreateCircle) {
          throw new ValidationError('Circular reference detected in reporting structure')
        }
      }

      await prisma.employee.update({
        where: { id: update.employeeId },
        data: {
          managerId: update.managerId || null,
          updatedAt: new Date()
        }
      })

      // Clear cache
      await CacheService.del(`employee:${update.employeeId}`)
    }

    // Clear organization chart cache
    await CacheService.del('organization_chart')

    logger.info(`Reporting structure updated for ${updates.length} employees`)
  }

  /**
   * Get employee by email
   */
  async getEmployeeByEmail(email: string): Promise<any> {
    return prisma.employee.findUnique({
      where: { email: email.toLowerCase() }
    })
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(department: string): Promise<any[]> {
    return prisma.employee.findMany({
      where: {
        department,
        status: 'active'
      },
      orderBy: {
        lastName: 'asc'
      }
    })
  }

  /**
   * Get employee count statistics
   */
  async getEmployeeStatistics(): Promise<any> {
    const total = await prisma.employee.count()
    
    const byStatus = await prisma.employee.groupBy({
      by: ['status'],
      _count: true
    })

    const byDepartment = await prisma.employee.groupBy({
      by: ['department'],
      _count: true
    })

    const byLocation = await prisma.employee.groupBy({
      by: ['location'],
      _count: true
    })

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
      byDepartment: Object.fromEntries(byDepartment.map(d => [d.department, d._count])),
      byLocation: Object.fromEntries(byLocation.map(l => [l.location, l._count]))
    }
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(employeeId: string, terminationDate: Date, reason: string, terminatedBy: string): Promise<any> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      throw new NotFoundError('Employee not found')
    }

    if (employee.status === 'terminated') {
      throw new ConflictError('Employee is already terminated')
    }

    // Update employee status
    const terminatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        status: 'terminated',
        terminationDate,
        updatedBy: terminatedBy
      }
    })

    // Create audit log
    await this.createAuditLog(
      terminatedBy,
      'TERMINATE',
      'employees',
      employeeId,
      { status: employee.status },
      { status: 'terminated', terminationDate, terminationReason: reason }
    )

    // Clear cache
    await CacheService.del(`employee:${employeeId}`)
    await CacheService.del('employees_list')

    logger.info(`Employee terminated: ${employeeId}`)

    return terminatedEmployee
  }

  // ============ Private Helper Methods ============

  private async generateEmployeeNumber(): Promise<string> {
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { employeeNumber: true }
    })

    const lastNumber = lastEmployee?.employeeNumber ? parseInt(lastEmployee.employeeNumber.replace(/\D/g, '')) : 0
    const newNumber = (lastNumber + 1).toString().padStart(6, '0')

    return `EMP${newNumber}`
  }

  private validateEmployeeData(request: CreateEmployeeRequest): void {
    if (!request.firstName || !request.firstName.trim()) {
      throw new ValidationError('First name is required')
    }

    if (!request.lastName || !request.lastName.trim()) {
      throw new ValidationError('Last name is required')
    }

    if (!request.email || !this.isValidEmail(request.email)) {
      throw new ValidationError('Valid email is required')
    }

    if (!request.phone || !this.isValidPhone(request.phone)) {
      throw new ValidationError('Valid phone number is required')
    }

    if (!request.hireDate) {
      throw new ValidationError('Hire date is required')
    }

    if (request.hireDate > new Date()) {
      throw new ValidationError('Hire date cannot be in the future')
    }

    if (!request.jobTitle || !request.jobTitle.trim()) {
      throw new ValidationError('Job title is required')
    }

    if (!request.department || !request.department.trim()) {
      throw new ValidationError('Department is required')
    }

    if (!request.location || !request.location.trim()) {
      throw new ValidationError('Location is required')
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\-\+\s\(\)]{10,}$/
    return phoneRegex.test(phone)
  }

  private async buildOrganizationNode(employee: any): Promise<OrganizationNode> {
    const directReports = await prisma.employee.findMany({
      where: {
        managerId: employee.id,
        status: 'active'
      },
      include: {
        directReports: true
      }
    })

    const node: OrganizationNode = {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      jobTitle: employee.jobTitle,
      email: employee.email,
      managerId: employee.managerId,
      directReports: []
    }

    for (const report of directReports) {
      const childNode = await this.buildOrganizationNode(report)
      node.directReports.push(childNode)
    }

    return node
  }

  private async checkCircularReference(employeeId: string, managerId: string, visited = new Set<string>()): Promise<boolean> {
    if (employeeId === managerId) {
      return true
    }

    if (visited.has(managerId)) {
      return false
    }

    visited.add(managerId)

    const manager = await prisma.employee.findUnique({
      where: { id: managerId },
      select: { managerId: true }
    })

    if (!manager || !manager.managerId) {
      return false
    }

    return this.checkCircularReference(employeeId, manager.managerId, visited)
  }

  private async createAuditLog(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    oldValues: any,
    newValues: any
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldValues,
        newValues,
        timestamp: new Date()
      }
    })
  }
}
