import { prisma } from '../utils/database'
import { CacheService } from '../utils/redis'
import { logger } from '../utils/logger'
import {
  ValidationError,
  NotFoundError
} from '../middleware/errorHandler'

export interface OrganizationNode {
  id: string
  firstName: string
  lastName: string
  jobTitle: string
  email: string
  department: string
  managerId?: string
  level: number
  directReports: OrganizationNode[]
  totalReports: number
}

export interface HierarchyStats {
  totalEmployees: number
  totalManagers: number
  averageSpanOfControl: number
  maxDepth: number
  departmentBreakdown: Record<string, number>
}

export interface ReportingChain {
  employee: {
    id: string
    firstName: string
    lastName: string
    jobTitle: string
  }
  chain: Array<{
    id: string
    firstName: string
    lastName: string
    jobTitle: string
    level: number
  }>
}

export class OrganizationService {
  /**
   * Get complete organization chart with hierarchy levels
   * Property 5: Organizational Hierarchy Integrity
   */
  async getOrganizationChart(departmentId?: string): Promise<OrganizationNode[]> {
    const cacheKey = `org_chart:${departmentId || 'all'}`
    const cached = await CacheService.get<OrganizationNode[]>(cacheKey)
    
    if (cached) {
      return cached
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: {
        status: 'active',
        ...(departmentId && { department: departmentId })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        email: true,
        department: true,
        managerId: true
      },
      orderBy: [
        { department: 'asc' },
        { jobTitle: 'asc' },
        { lastName: 'asc' }
      ]
    })

    // Build hierarchy tree
    const tree = this.buildHierarchyTree(employees)

    // Cache the result
    await CacheService.set(cacheKey, tree, 30 * 60) // 30 minutes

    return tree
  }

  /**
   * Get reporting chain for a specific employee
   */
  async getReportingChain(employeeId: string): Promise<ReportingChain> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        managerId: true
      }
    })

    if (!employee) {
      throw new NotFoundError('Employee not found')
    }

    const chain: ReportingChain['chain'] = []
    let currentManagerId = employee.managerId
    let level = 1

    // Walk up the reporting chain
    while (currentManagerId) {
      const manager = await prisma.employee.findUnique({
        where: { id: currentManagerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
          managerId: true
        }
      })

      if (!manager) {
        break
      }

      chain.push({
        id: manager.id,
        firstName: manager.firstName,
        lastName: manager.lastName,
        jobTitle: manager.jobTitle,
        level
      })

      currentManagerId = manager.managerId
      level++

      // Prevent infinite loops
      if (level > 20) {
        logger.warn(`Reporting chain too deep for employee ${employeeId}`)
        break
      }
    }

    return {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        jobTitle: employee.jobTitle
      },
      chain
    }
  }

  /**
   * Get hierarchy statistics
   */
  async getHierarchyStats(): Promise<HierarchyStats> {
    const cacheKey = 'hierarchy_stats'
    const cached = await CacheService.get<HierarchyStats>(cacheKey)
    
    if (cached) {
      return cached
    }

    const [
      totalEmployees,
      managersCount,
      departmentStats,
      allEmployees
    ] = await Promise.all([
      prisma.employee.count({ where: { status: 'active' } }),
      prisma.employee.count({ 
        where: { 
          status: 'active',
          directReports: { some: {} }
        }
      }),
      prisma.employee.groupBy({
        by: ['department'],
        where: { status: 'active' },
        _count: true
      }),
      prisma.employee.findMany({
        where: { status: 'active' },
        select: { id: true, managerId: true }
      })
    ])

    // Calculate span of control and max depth
    const managerReportCounts = new Map<string, number>()
    const employeeDepths = new Map<string, number>()

    // Count direct reports for each manager
    allEmployees.forEach(emp => {
      if (emp.managerId) {
        managerReportCounts.set(
          emp.managerId,
          (managerReportCounts.get(emp.managerId) || 0) + 1
        )
      }
    })

    // Calculate depths
    const calculateDepth = (employeeId: string, visited = new Set<string>()): number => {
      if (visited.has(employeeId)) {
        return 0 // Circular reference protection
      }

      if (employeeDepths.has(employeeId)) {
        return employeeDepths.get(employeeId)!
      }

      visited.add(employeeId)
      const employee = allEmployees.find(e => e.id === employeeId)
      
      if (!employee || !employee.managerId) {
        employeeDepths.set(employeeId, 0)
        return 0
      }

      const depth = 1 + calculateDepth(employee.managerId, visited)
      employeeDepths.set(employeeId, depth)
      return depth
    }

    allEmployees.forEach(emp => calculateDepth(emp.id))

    const reportCounts = Array.from(managerReportCounts.values())
    const averageSpanOfControl = reportCounts.length > 0 
      ? reportCounts.reduce((sum, count) => sum + count, 0) / reportCounts.length 
      : 0

    const maxDepth = Math.max(...Array.from(employeeDepths.values()), 0)

    const departmentBreakdown = Object.fromEntries(
      departmentStats.map(stat => [stat.department, stat._count])
    )

    const stats: HierarchyStats = {
      totalEmployees,
      totalManagers: managersCount,
      averageSpanOfControl: Math.round(averageSpanOfControl * 100) / 100,
      maxDepth,
      departmentBreakdown
    }

    // Cache for 1 hour
    await CacheService.set(cacheKey, stats, 60 * 60)

    return stats
  }

  /**
   * Validate reporting structure changes
   */
  async validateReportingStructure(updates: Array<{ employeeId: string; managerId?: string }>): Promise<void> {
    for (const update of updates) {
      // Check for circular references
      if (update.managerId) {
        const wouldCreateCircle = await this.checkCircularReference(
          update.employeeId, 
          update.managerId
        )
        
        if (wouldCreateCircle) {
          throw new ValidationError(
            `Circular reference detected: Employee ${update.employeeId} cannot report to ${update.managerId}`
          )
        }
      }

      // Verify both employees exist
      const [employee, manager] = await Promise.all([
        prisma.employee.findUnique({ where: { id: update.employeeId } }),
        update.managerId 
          ? prisma.employee.findUnique({ where: { id: update.managerId } })
          : null
      ])

      if (!employee) {
        throw new NotFoundError(`Employee ${update.employeeId} not found`)
      }

      if (update.managerId && !manager) {
        throw new NotFoundError(`Manager ${update.managerId} not found`)
      }

      // Prevent self-management
      if (update.employeeId === update.managerId) {
        throw new ValidationError('Employee cannot be their own manager')
      }
    }
  }

  /**
   * Get employees by hierarchy level
   */
  async getEmployeesByLevel(level: number): Promise<any[]> {
    const allEmployees = await prisma.employee.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        department: true,
        managerId: true
      }
    })

    const employeeLevels = new Map<string, number>()
    
    // Calculate levels
    const calculateLevel = (employeeId: string, visited = new Set<string>()): number => {
      if (visited.has(employeeId)) {
        return 0
      }

      if (employeeLevels.has(employeeId)) {
        return employeeLevels.get(employeeId)!
      }

      visited.add(employeeId)
      const employee = allEmployees.find(e => e.id === employeeId)
      
      if (!employee || !employee.managerId) {
        employeeLevels.set(employeeId, 0)
        return 0
      }

      const empLevel = 1 + calculateLevel(employee.managerId, visited)
      employeeLevels.set(employeeId, empLevel)
      return empLevel
    }

    allEmployees.forEach(emp => calculateLevel(emp.id))

    return allEmployees.filter(emp => employeeLevels.get(emp.id) === level)
  }

  /**
   * Clear organization-related caches
   */
  async clearOrganizationCaches(): Promise<void> {
    const cacheKeys = [
      'org_chart:all',
      'hierarchy_stats'
    ]

    await Promise.all(cacheKeys.map(key => CacheService.del(key)))

    // Clear department-specific caches (simplified approach)
    const departments = await prisma.employee.findMany({
      where: { status: 'active' },
      select: { department: true },
      distinct: ['department']
    })

    const deptCacheKeys = departments.map(d => `org_chart:${d.department}`)
    await Promise.all(deptCacheKeys.map(key => CacheService.del(key)))
  }

  // ============ Private Helper Methods ============

  private buildHierarchyTree(employees: any[]): OrganizationNode[] {
    const employeeMap = new Map<string, OrganizationNode>()
    const roots: OrganizationNode[] = []

    // Create employee map with initial data
    employees.forEach(emp => {
      employeeMap.set(emp.id, {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        jobTitle: emp.jobTitle,
        email: emp.email,
        department: emp.department,
        managerId: emp.managerId,
        level: 0,
        directReports: [],
        totalReports: 0
      })
    })

    // Build tree structure and calculate levels
    employees.forEach(emp => {
      const employee = employeeMap.get(emp.id)!
      
      if (emp.managerId && employeeMap.has(emp.managerId)) {
        const manager = employeeMap.get(emp.managerId)!
        manager.directReports.push(employee)
        employee.level = manager.level + 1
      } else {
        roots.push(employee)
      }
    })

    // Calculate total reports (recursive count)
    const calculateTotalReports = (node: OrganizationNode): number => {
      let total = node.directReports.length
      node.directReports.forEach(child => {
        total += calculateTotalReports(child)
      })
      node.totalReports = total
      return total
    }

    roots.forEach(root => calculateTotalReports(root))

    return roots
  }

  private async checkCircularReference(
    employeeId: string, 
    managerId: string, 
    visited = new Set<string>()
  ): Promise<boolean> {
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
}