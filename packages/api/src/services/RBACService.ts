import { prisma } from '../utils/database'
import { CacheService } from '../utils/redis'
import { logger } from '../utils/logger'
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError
} from '../middleware/errorHandler'
import {
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  CACHE_TTL
} from '@hrms/shared'

export interface RoleData {
  id: string
  name: string
  description?: string
  permissions: Permission[]
  createdAt: Date
  updatedAt: Date
}

export interface UserRoleAssignment {
  userId: string
  roleId: string
  assignedAt: Date
  assignedBy: string
}

export interface CreateRoleRequest {
  name: string
  description?: string
  permissions: Permission[]
}

export interface UpdateRoleRequest {
  name?: string
  description?: string
  permissions?: Permission[]
}

export interface AssignRoleRequest {
  userId: string
  roleId: string
  assignedBy: string
}

export interface PermissionCheck {
  userId: string
  permission: Permission
  resourceId?: string
  context?: Record<string, any>
}

export class RBACService {
  /**
   * Create a new role
   */
  async createRole(request: CreateRoleRequest, createdBy: string): Promise<RoleData> {
    const { name, description, permissions } = request

    // Validate role name
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Role name is required')
    }

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: name.toLowerCase() }
    })

    if (existingRole) {
      throw new ConflictError(`Role '${name}' already exists`)
    }

    // Validate permissions
    this.validatePermissions(permissions)

    // Verify permissions exist in DB, if not, creating them is part of seeding usually.
    // For now, assume they exist or we create them on the fly?
    // Better to ensure they exist.
    const dbPermissions = await prisma.permission.findMany({
      where: { slug: { in: permissions } }
    })

    if (dbPermissions.length !== permissions.length) {
      // Find missing permissions and create them? 
      // Or throw error?
      // For robustness, let's create missing permissions based on slug parsing
      const foundSlugs = dbPermissions.map(p => p.slug)
      const missingSlugs = permissions.filter(p => !foundSlugs.includes(p))

      for (const slug of missingSlugs) {
        // Parse slug: e.g. "read_employee" -> resource="employee", action="read"
        const parts = slug.split('_')
        const action = parts[0]
        const resource = parts.slice(1).join('_')

        await prisma.permission.create({
          data: {
            slug,
            action,
            resource,
            description: `Permission to ${action} ${resource}`
          }
        })
      }
    }

    // Create role with permissions
    const role = await prisma.role.create({
      data: {
        name: name.toLowerCase(),
        description,
        permissions: {
          create: permissions.map(slug => ({
            permission: { connect: { slug } }
          }))
        }
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    })

    // Clear role cache
    await this.clearRoleCache()

    logger.info(`Role created: ${role.name} by user ${createdBy}`)

    return this.mapRoleToResponse(role)
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: string, request: UpdateRoleRequest, updatedBy: string): Promise<RoleData> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true }
    })

    if (!role) {
      throw new NotFoundError('Role not found')
    }

    // Prevent modification of system roles
    if (this.isSystemRole(role.name)) {
      throw new ForbiddenError('System roles cannot be modified')
    }

    const updateData: any = {}

    if (request.name) {
      // Check if new name conflicts with existing role
      const existingRole = await prisma.role.findUnique({
        where: { name: request.name.toLowerCase() }
      })

      if (existingRole && existingRole.id !== roleId) {
        throw new ConflictError(`Role '${request.name}' already exists`)
      }

      updateData.name = request.name.toLowerCase()
    }

    if (request.description !== undefined) {
      updateData.description = request.description
    }

    if (request.permissions) {
      this.validatePermissions(request.permissions)

      // Ensure all permissions exist in DB
      for (const slug of request.permissions) {
        const exists = await prisma.permission.findUnique({ where: { slug } })
        if (!exists) {
          const parts = slug.split('_')
          const action = parts[0]
          const resource = parts.slice(1).join('_')
          await prisma.permission.create({
            data: { slug, action, resource }
          })
        }
      }

      // Delete existing permission links
      await prisma.rolePermission.deleteMany({
        where: { roleId }
      })
      const permissions = await prisma.permission.findMany({
        where: { slug: { in: request.permissions } }
      })

      await prisma.rolePermission.createMany({
        data: permissions.map(p => ({
          roleId,
          permissionId: p.id
        }))
      })
    }

    // Now update the role details
    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: updateData,
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    })

    // Clear caches
    await this.clearRoleCache()
    await this.clearUserPermissionCache()

    logger.info(`Role updated: ${updatedRole.name} by user ${updatedBy}`)

    return this.mapRoleToResponse(updatedRole)
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string, deletedBy: string): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        users: true
      }
    })

    if (!role) {
      throw new NotFoundError('Role not found')
    }

    // Prevent deletion of system roles
    if (this.isSystemRole(role.name)) {
      throw new ForbiddenError('System roles cannot be deleted')
    }

    // Check if role is assigned to users
    if (role.users.length > 0) {
      throw new ConflictError('Cannot delete role that is assigned to users')
    }

    // Delete role
    await prisma.role.delete({
      where: { id: roleId }
    })

    // Clear caches
    await this.clearRoleCache()

    logger.info(`Role deleted: ${role.name} by user ${deletedBy}`)
  }

  /**
   * Get all roles
   */
  async getRoles(): Promise<RoleData[]> {
    // Check cache first
    const cacheKey = 'roles:all'
    const cached = await CacheService.get<RoleData[]>(cacheKey)

    if (cached) {
      return cached
    }

    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    })

    const result = roles.map(this.mapRoleToResponse)

    // Cache the result
    await CacheService.set(cacheKey, result, CACHE_TTL.MEDIUM)

    return result
  }

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<RoleData> {
    // Check cache first
    const cacheKey = `role:${roleId}`
    const cached = await CacheService.get<RoleData>(cacheKey)

    if (cached) {
      return cached
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    })

    if (!role) {
      throw new NotFoundError('Role not found')
    }

    const result = this.mapRoleToResponse(role)

    // Cache the result
    await CacheService.set(cacheKey, result, CACHE_TTL.MEDIUM)

    return result
  }

  /**
   * Assign role to user
   */
  async assignRole(request: AssignRoleRequest): Promise<UserRoleAssignment> {
    const { userId, roleId, assignedBy } = request

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    })

    if (!role) {
      throw new NotFoundError('Role not found')
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      }
    })

    if (existingAssignment) {
      throw new ConflictError('Role is already assigned to user')
    }

    // Create assignment
    const assignment = await prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy
      }
    })

    // Clear user permission cache and employee list cache
    await CacheService.del(`user_permissions:${userId}`)
    if (typeof CacheService.delPattern === 'function') {
      await CacheService.delPattern('employees:page:*')
    }

    logger.info(`Role ${role.name} assigned to user ${userId} by ${assignedBy}`)

    return {
      userId: assignment.userId,
      roleId: assignment.roleId,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assignedBy
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string, removedBy: string): Promise<void> {
    // Verify assignment exists
    const assignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      },
      include: {
        role: true
      }
    })

    if (!assignment) {
      throw new NotFoundError('Role assignment not found')
    }

    // Prevent removal of last admin role
    if (assignment.role.name === UserRole.ADMIN) {
      const adminCount = await prisma.userRole.count({
        where: {
          role: {
            name: UserRole.ADMIN
          }
        }
      })

      if (adminCount <= 1) {
        throw new ForbiddenError('Cannot remove the last admin role')
      }
    }

    // Remove assignment
    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      }
    })

    // Clear user permission cache and employee list cache
    await CacheService.del(`user_permissions:${userId}`)
    if (typeof CacheService.delPattern === 'function') {
      await CacheService.delPattern('employees:page:*')
    }

    logger.info(`Role ${assignment.role.name} removed from user ${userId} by ${removedBy}`)
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<RoleData[]> {
    // Check cache first
    const cacheKey = `user_roles:${userId}`
    const cached = await CacheService.get<RoleData[]>(cacheKey)

    if (cached) {
      return cached
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    })

    const result = userRoles.map(ur => this.mapRoleToResponse(ur.role))

    // Cache the result
    await CacheService.set(cacheKey, result, CACHE_TTL.SHORT)

    return result
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    // Check cache first
    const cacheKey = `user_permissions:${userId}`
    const cached = await CacheService.get<Permission[]>(cacheKey)

    if (cached) {
      return cached
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    })

    // Collect all permissions from all roles
    const permissions = userRoles.flatMap(ur =>
      ur.role.permissions.map((rp: any) => rp.permission.slug as Permission)
    )
    const uniquePermissions = [...new Set(permissions)]

    // Cache the result
    await CacheService.set(cacheKey, uniquePermissions, CACHE_TTL.SHORT)

    return uniquePermissions
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(check: PermissionCheck): Promise<boolean> {
    const { userId, permission, resourceId, context } = check

    // Get user permissions
    const permissions = await this.getUserPermissions(userId)

    // Check for system admin permission (grants all access)
    if (permissions.includes(Permission.SYSTEM_ADMIN)) {
      return true
    }

    // Check for specific permission
    if (!permissions.includes(permission)) {
      return false
    }

    // Additional context-based checks can be implemented here
    if (resourceId && context) {
      return await this.checkResourceAccess(userId, permission, resourceId, context)
    }

    return true
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId)

    // Check for system admin permission
    if (userPermissions.includes(Permission.SYSTEM_ADMIN)) {
      return true
    }

    // Check if user has any of the required permissions
    return permissions.some(permission => userPermissions.includes(permission))
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId)

    // Check for system admin permission
    if (userPermissions.includes(Permission.SYSTEM_ADMIN)) {
      return true
    }

    // Check if user has all required permissions
    return permissions.every(permission => userPermissions.includes(permission))
  }

  /**
   * Get users with specific role
   */
  async getUsersWithRole(roleId: string): Promise<string[]> {
    const userRoles = await prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true }
    })

    return userRoles.map(ur => ur.userId)
  }

  /**
   * Get users with specific permission
   */
  async getUsersWithPermission(permission: Permission): Promise<string[]> {
    // Find role IDs that have this permission
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        permission: { slug: permission }
      },
      select: { roleId: true }
    })

    const roleIds = rolePermissions.map(rp => rp.roleId)

    const userRoles = await prisma.userRole.findMany({
      where: { roleId: { in: roleIds } },
      select: { userId: true }
    })

    const userIds = userRoles.map(ur => ur.userId)
    return [...new Set(userIds)]
  }

  /**
   * Initialize default roles and permissions
   */
  async initializeDefaultRoles(): Promise<void> {
    logger.info('Initializing default roles...')

    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      // 1. Ensure permissions exist
      for (const permSlug of permissions) {
        const exists = await prisma.permission.findUnique({ where: { slug: permSlug } })
        if (!exists) {
          const parts = permSlug.split('_')
          const action = parts[0]
          const resource = parts.slice(1).join('_')
          await prisma.permission.create({
            data: {
              slug: permSlug,
              action,
              resource,
              description: `Permission to ${action} ${resource}`
            }
          })
        }
      }

      // 2. Create/Update Role
      const existingRole = await prisma.role.findUnique({
        where: { name: roleName.toLowerCase() }
      })

      let roleId = existingRole?.id

      if (!existingRole) {
        const newRole = await prisma.role.create({
          data: {
            name: roleName.toLowerCase(),
            description: this.getRoleDescription(roleName as UserRole)
          }
        })
        roleId = newRole.id
        logger.info(`Created default role: ${roleName}`)
      }

      if (roleId) {
        // Update permissions logic
        // Find permission IDs
        const dbPermissions = await prisma.permission.findMany({
          where: { slug: { in: permissions } }
        })

        // Clear existing
        await prisma.rolePermission.deleteMany({ where: { roleId } })

        // Add new
        await prisma.rolePermission.createMany({
          data: dbPermissions.map(p => ({
            roleId: roleId!,
            permissionId: p.id
          }))
        })

        logger.info(`Updated permissions for role: ${roleName}`)
      }
    }

    // Clear caches
    await this.clearRoleCache()
    await this.clearUserPermissionCache()

    logger.info('Default roles initialization completed')
  }

  /**
   * Validate permissions array
   */
  private validatePermissions(permissions: Permission[]): void {
    if (!Array.isArray(permissions)) {
      throw new ValidationError('Permissions must be an array')
    }

    const validPermissions = Object.values(Permission)
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p))

    if (invalidPermissions.length > 0) {
      throw new ValidationError(`Invalid permissions: ${invalidPermissions.join(', ')}`)
    }
  }

  /**
   * Check if role is a system role that cannot be modified
   */
  private isSystemRole(roleName: string): boolean {
    const systemRoles = [
      UserRole.ADMIN,
      UserRole.HR_MANAGER,
      UserRole.MANAGER,
      UserRole.EMPLOYEE
    ]
    return systemRoles.includes(roleName as UserRole)
  }

  /**
   * Get role description
   */
  private getRoleDescription(role: UserRole): string {
    const descriptions = {
      [UserRole.ADMIN]: 'System Administrator with full access to all features',
      [UserRole.HR_MANAGER]: 'HR Manager with comprehensive human resources management access',
      [UserRole.MANAGER]: 'Manager with team management and reporting capabilities',
      [UserRole.EMPLOYEE]: 'Employee with self-service access to personal information'
    }
    return descriptions[role] || 'Custom role'
  }

  /**
   * Check resource-specific access
   */
  private async checkResourceAccess(
    userId: string,
    permission: Permission,
    resourceId: string,
    context: Record<string, any>
  ): Promise<boolean> {
    // This method can be extended to implement resource-specific access control
    // For example:
    // - Employees can only access their own records
    // - Managers can access their team members' records
    // - Department-based access control

    // For now, return true if user has the permission
    // In a real implementation, you would check the specific resource access rules
    return true
  }

  /**
   * Map database role to response format
   */
  private mapRoleToResponse(role: any): RoleData {
    // Extract permissions slugs from relation
    const permissions = role.permissions
      ? role.permissions.map((rp: any) => rp.permission.slug as Permission)
      : []

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }
  }

  /**
   * Clear role cache
   */
  private async clearRoleCache(): Promise<void> {
    await CacheService.del('roles:all')
    // In a production system, you might want to clear all role-related cache keys
  }

  /**
   * Clear user permission cache
   */
  private async clearUserPermissionCache(): Promise<void> {
    // In a production system, you would clear all user permission cache keys
    // This is a simplified implementation
    // Ideally iterate over all users? Or just rely on expire time.
  }
}