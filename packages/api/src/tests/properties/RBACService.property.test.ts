import * as fc from 'fast-check'
import { RBACService } from '../../services/RBACService'
import { prisma } from '../../utils/database'
import { CacheService } from '../../utils/redis'
import { Permission, UserRole, ROLE_PERMISSIONS } from '../../shared/types'
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../../middleware/errorHandler'

// Mock dependencies
jest.mock('../../utils/database')
jest.mock('../../utils/redis')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>

describe('RBACService Property-Based Tests', () => {
  let rbacService: RBACService

  beforeEach(() => {
    jest.clearAllMocks()
    rbacService = new RBACService()
  })

  // Generators for test data
  const userIdGenerator = fc.uuid()
  const roleIdGenerator = fc.uuid()
  const roleNameGenerator = fc.string({ minLength: 1, maxLength: 50 })
  const permissionGenerator = fc.constantFrom(...Object.values(Permission))
  const permissionsArrayGenerator = fc.array(permissionGenerator, { minLength: 1, maxLength: 10 })
  
  const roleGenerator = fc.record({
    id: roleIdGenerator,
    name: roleNameGenerator,
    description: fc.option(fc.string(), { nil: null }),
    permissions: permissionsArrayGenerator,
    createdAt: fc.date(),
    updatedAt: fc.date()
  })

  const userRoleGenerator = fc.record({
    userId: userIdGenerator,
    roleId: roleIdGenerator,
    assignedAt: fc.date(),
    assignedBy: userIdGenerator,
    role: roleGenerator
  })

  const userGenerator = fc.record({
    id: userIdGenerator,
    email: fc.emailAddress(),
    isActive: fc.boolean(),
    roles: fc.array(userRoleGenerator, { maxLength: 5 })
  })

  /**
   * Feature: HRMS, Property 3: Role-Based Access Control
   * Validates: Requirements 1.5, 7.7, 10.7, 12.7, 16.6, 18.3
   * 
   * For any user attempting to access system resources, access should be granted 
   * only if the user's role has appropriate permissions for that specific resource and operation.
   */
  describe('Property 3: Role-Based Access Control', () => {
    it('should grant access only when user has required permission', () => {
      fc.assert(fc.property(
        userGenerator.filter(user => user.isActive),
        permissionGenerator,
        fc.boolean(), // Whether user should have the permission
        async (user, permission, shouldHavePermission) => {
          // Arrange - Set up user with or without the required permission
          const userPermissions = shouldHavePermission 
            ? [permission, ...fc.sample(permissionGenerator, 2)] 
            : fc.sample(permissionGenerator, 3).filter(p => p !== permission)

          const userWithRoles = {
            ...user,
            roles: [{
              ...user.roles[0] || { userId: user.id, roleId: fc.sample(roleIdGenerator, 1)[0], assignedAt: new Date(), assignedBy: user.id },
              role: {
                id: fc.sample(roleIdGenerator, 1)[0],
                name: 'test-role',
                description: 'Test role',
                permissions: userPermissions,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }]
          }

          mockPrisma.userRole.findMany.mockResolvedValue(userWithRoles.roles as any)
          mockCacheService.get.mockResolvedValue(null)
          mockCacheService.set.mockResolvedValue(true)

          // Act
          const hasPermission = await rbacService.hasPermission({
            userId: user.id,
            permission
          })

          // Assert
          expect(hasPermission).toBe(shouldHavePermission)
        }
      ), { numRuns: 50 })
    })

    it('should always grant access to users with SYSTEM_ADMIN permission', () => {
      fc.assert(fc.property(
        userGenerator.filter(user => user.isActive),
        permissionGenerator,
        async (user, permission) => {
          // Arrange - User with SYSTEM_ADMIN permission
          const adminUser = {
            ...user,
            roles: [{
              userId: user.id,
              roleId: fc.sample(roleIdGenerator, 1)[0],
              assignedAt: new Date(),
              assignedBy: user.id,
              role: {
                id: fc.sample(roleIdGenerator, 1)[0],
                name: UserRole.ADMIN,
                description: 'System Administrator',
                permissions: [Permission.SYSTEM_ADMIN],
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }]
          }

          mockPrisma.userRole.findMany.mockResolvedValue(adminUser.roles as any)
          mockCacheService.get.mockResolvedValue(null)
          mockCacheService.set.mockResolvedValue(true)

          // Act
          const hasPermission = await rbacService.hasPermission({
            userId: user.id,
            permission
          })

          // Assert - Should always have permission
          expect(hasPermission).toBe(true)
        }
      ), { numRuns: 50 })
    })

    it('should deny access to inactive users regardless of permissions', () => {
      fc.assert(fc.property(
        userGenerator.filter(user => !user.isActive),
        permissionGenerator,
        async (user, permission) => {
          // Arrange - Inactive user with permissions
          const userWithPermissions = {
            ...user,
            roles: [{
              userId: user.id,
              roleId: fc.sample(roleIdGenerator, 1)[0],
              assignedAt: new Date(),
              assignedBy: user.id,
              role: {
                id: fc.sample(roleIdGenerator, 1)[0],
                name: 'test-role',
                description: 'Test role',
                permissions: [permission, Permission.SYSTEM_ADMIN],
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }]
          }

          mockPrisma.user.findUnique.mockResolvedValue(userWithPermissions as any)

          // Act
          const result = await rbacService.authorize(user.id, 'test-resource', 'test-action')

          // Assert - Should deny access for inactive user
          expect(result).toBe(false)
        }
      ), { numRuns: 50 })
    })

    it('should correctly aggregate permissions from multiple roles', () => {
      fc.assert(fc.property(
        userIdGenerator,
        fc.array(permissionsArrayGenerator, { minLength: 2, maxLength: 5 }),
        permissionGenerator,
        async (userId, rolePermissions, testPermission) => {
          // Arrange - User with multiple roles
          const allPermissions = rolePermissions.flat()
          const shouldHavePermission = allPermissions.includes(testPermission)

          const userRoles = rolePermissions.map((permissions, index) => ({
            userId,
            roleId: fc.sample(roleIdGenerator, 1)[0],
            assignedAt: new Date(),
            assignedBy: userId,
            role: {
              id: fc.sample(roleIdGenerator, 1)[0],
              name: `role-${index}`,
              description: `Test role ${index}`,
              permissions,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }))

          mockPrisma.userRole.findMany.mockResolvedValue(userRoles as any)
          mockCacheService.get.mockResolvedValue(null)
          mockCacheService.set.mockResolvedValue(true)

          // Act
          const hasPermission = await rbacService.hasPermission({
            userId,
            permission: testPermission
          })

          // Assert
          expect(hasPermission).toBe(shouldHavePermission)
        }
      ), { numRuns: 50 })
    })
  })

  /**
   * Role management properties
   */
  describe('Role Management Properties', () => {
    it('should always validate permissions when creating roles', () => {
      fc.assert(fc.property(
        roleNameGenerator,
        fc.array(fc.string(), { minLength: 1, maxLength: 5 }), // Invalid permissions
        userIdGenerator,
        async (roleName, invalidPermissions, createdBy) => {
          // Arrange
          const createRequest = {
            name: roleName,
            permissions: invalidPermissions as Permission[]
          }

          // Act & Assert
          await expect(rbacService.createRole(createRequest, createdBy))
            .rejects.toThrow(ValidationError)
        }
      ), { numRuns: 30 })
    })

    it('should prevent duplicate role names', () => {
      fc.assert(fc.property(
        roleNameGenerator,
        permissionsArrayGenerator,
        userIdGenerator,
        async (roleName, permissions, createdBy) => {
          // Arrange - Existing role with same name
          mockPrisma.role.findUnique.mockResolvedValue({
            id: fc.sample(roleIdGenerator, 1)[0],
            name: roleName.toLowerCase(),
            description: 'Existing role',
            permissions: permissions as string[],
            createdAt: new Date(),
            updatedAt: new Date()
          } as any)

          const createRequest = {
            name: roleName,
            permissions
          }

          // Act & Assert
          await expect(rbacService.createRole(createRequest, createdBy))
            .rejects.toThrow(ConflictError)
        }
      ), { numRuns: 50 })
    })

    it('should prevent modification of system roles', () => {
      fc.assert(fc.property(
        fc.constantFrom(UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE),
        permissionsArrayGenerator,
        userIdGenerator,
        async (systemRole, newPermissions, updatedBy) => {
          // Arrange - System role
          mockPrisma.role.findUnique.mockResolvedValue({
            id: fc.sample(roleIdGenerator, 1)[0],
            name: systemRole,
            description: 'System role',
            permissions: ROLE_PERMISSIONS[systemRole] as string[],
            createdAt: new Date(),
            updatedAt: new Date()
          } as any)

          const updateRequest = {
            permissions: newPermissions
          }

          // Act & Assert
          await expect(rbacService.updateRole(fc.sample(roleIdGenerator, 1)[0], updateRequest, updatedBy))
            .rejects.toThrow(ForbiddenError)
        }
      ), { numRuns: 20 })
    })

    it('should prevent deletion of roles assigned to users', () => {
      fc.assert(fc.property(
        roleIdGenerator,
        roleNameGenerator,
        fc.array(userIdGenerator, { minLength: 1, maxLength: 5 }),
        userIdGenerator,
        async (roleId, roleName, assignedUsers, deletedBy) => {
          // Arrange - Role with assigned users
          const userRoles = assignedUsers.map(userId => ({
            userId,
            roleId,
            assignedAt: new Date(),
            assignedBy: deletedBy
          }))

          mockPrisma.role.findUnique.mockResolvedValue({
            id: roleId,
            name: roleName,
            description: 'Test role',
            permissions: fc.sample(permissionsArrayGenerator, 1)[0] as string[],
            createdAt: new Date(),
            updatedAt: new Date(),
            users: userRoles
          } as any)

          // Act & Assert
          await expect(rbacService.deleteRole(roleId, deletedBy))
            .rejects.toThrow(ConflictError)
        }
      ), { numRuns: 50 })
    })
  })

  /**
   * Role assignment properties
   */
  describe('Role Assignment Properties', () => {
    it('should prevent duplicate role assignments', () => {
      fc.assert(fc.property(
        userIdGenerator,
        roleIdGenerator,
        userIdGenerator, // assignedBy
        async (userId, roleId, assignedBy) => {
          // Arrange - Existing assignment
          mockPrisma.user.findUnique.mockResolvedValue({ id: userId } as any)
          mockPrisma.role.findUnique.mockResolvedValue({ id: roleId, name: 'test-role' } as any)
          mockPrisma.userRole.findUnique.mockResolvedValue({
            userId,
            roleId,
            assignedAt: new Date(),
            assignedBy
          } as any)

          const assignRequest = {
            userId,
            roleId,
            assignedBy
          }

          // Act & Assert
          await expect(rbacService.assignRole(assignRequest))
            .rejects.toThrow(ConflictError)
        }
      ), { numRuns: 50 })
    })

    it('should prevent assignment to non-existent users', () => {
      fc.assert(fc.property(
        userIdGenerator,
        roleIdGenerator,
        userIdGenerator, // assignedBy
        async (userId, roleId, assignedBy) => {
          // Arrange - Non-existent user
          mockPrisma.user.findUnique.mockResolvedValue(null)

          const assignRequest = {
            userId,
            roleId,
            assignedBy
          }

          // Act & Assert
          await expect(rbacService.assignRole(assignRequest))
            .rejects.toThrow(NotFoundError)
        }
      ), { numRuns: 50 })
    })

    it('should prevent assignment of non-existent roles', () => {
      fc.assert(fc.property(
        userIdGenerator,
        roleIdGenerator,
        userIdGenerator, // assignedBy
        async (userId, roleId, assignedBy) => {
          // Arrange - Non-existent role
          mockPrisma.user.findUnique.mockResolvedValue({ id: userId } as any)
          mockPrisma.role.findUnique.mockResolvedValue(null)

          const assignRequest = {
            userId,
            roleId,
            assignedBy
          }

          // Act & Assert
          await expect(rbacService.assignRole(assignRequest))
            .rejects.toThrow(NotFoundError)
        }
      ), { numRuns: 50 })
    })

    it('should prevent removal of last admin role', () => {
      fc.assert(fc.property(
        userIdGenerator,
        roleIdGenerator,
        userIdGenerator, // removedBy
        async (userId, roleId, removedBy) => {
          // Arrange - Last admin role assignment
          mockPrisma.userRole.findUnique.mockResolvedValue({
            userId,
            roleId,
            assignedAt: new Date(),
            assignedBy: removedBy,
            role: {
              id: roleId,
              name: UserRole.ADMIN,
              description: 'Admin role',
              permissions: ROLE_PERMISSIONS[UserRole.ADMIN] as string[],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          } as any)

          mockPrisma.userRole.count.mockResolvedValue(1) // Only one admin

          // Act & Assert
          await expect(rbacService.removeRole(userId, roleId, removedBy))
            .rejects.toThrow(ForbiddenError)
        }
      ), { numRuns: 30 })
    })
  })

  /**
   * Permission checking properties
   */
  describe('Permission Checking Properties', () => {
    it('should correctly implement hasAnyPermission logic', () => {
      fc.assert(fc.property(
        userIdGenerator,
        permissionsArrayGenerator,
        permissionsArrayGenerator,
        async (userId, userPermissions, requiredPermissions) => {
          // Arrange
          const shouldHaveAny = requiredPermissions.some(p => userPermissions.includes(p))

          mockPrisma.userRole.findMany.mockResolvedValue([{
            userId,
            roleId: fc.sample(roleIdGenerator, 1)[0],
            assignedAt: new Date(),
            assignedBy: userId,
            role: {
              id: fc.sample(roleIdGenerator, 1)[0],
              name: 'test-role',
              description: 'Test role',
              permissions: userPermissions,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }] as any)
          mockCacheService.get.mockResolvedValue(null)
          mockCacheService.set.mockResolvedValue(true)

          // Act
          const hasAnyPermission = await rbacService.hasAnyPermission(userId, requiredPermissions)

          // Assert
          expect(hasAnyPermission).toBe(shouldHaveAny)
        }
      ), { numRuns: 50 })
    })

    it('should correctly implement hasAllPermissions logic', () => {
      fc.assert(fc.property(
        userIdGenerator,
        permissionsArrayGenerator,
        permissionsArrayGenerator,
        async (userId, userPermissions, requiredPermissions) => {
          // Arrange
          const shouldHaveAll = requiredPermissions.every(p => userPermissions.includes(p))

          mockPrisma.userRole.findMany.mockResolvedValue([{
            userId,
            roleId: fc.sample(roleIdGenerator, 1)[0],
            assignedAt: new Date(),
            assignedBy: userId,
            role: {
              id: fc.sample(roleIdGenerator, 1)[0],
              name: 'test-role',
              description: 'Test role',
              permissions: userPermissions,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }] as any)
          mockCacheService.get.mockResolvedValue(null)
          mockCacheService.set.mockResolvedValue(true)

          // Act
          const hasAllPermissions = await rbacService.hasAllPermissions(userId, requiredPermissions)

          // Assert
          expect(hasAllPermissions).toBe(shouldHaveAll)
        }
      ), { numRuns: 50 })
    })

    it('should return consistent results for permission queries', () => {
      fc.assert(fc.property(
        userIdGenerator,
        permissionsArrayGenerator,
        permissionGenerator,
        async (userId, userPermissions, testPermission) => {
          // Arrange
          const userRoles = [{
            userId,
            roleId: fc.sample(roleIdGenerator, 1)[0],
            assignedAt: new Date(),
            assignedBy: userId,
            role: {
              id: fc.sample(roleIdGenerator, 1)[0],
              name: 'test-role',
              description: 'Test role',
              permissions: userPermissions,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }]

          mockPrisma.userRole.findMany.mockResolvedValue(userRoles as any)
          mockCacheService.get.mockResolvedValue(null)
          mockCacheService.set.mockResolvedValue(true)

          // Act - Multiple calls should return same result
          const result1 = await rbacService.hasPermission({ userId, permission: testPermission })
          const result2 = await rbacService.hasPermission({ userId, permission: testPermission })
          const result3 = await rbacService.hasAnyPermission(userId, [testPermission])

          // Assert - All calls should return consistent results
          expect(result1).toBe(result2)
          expect(result1).toBe(result3)
        }
      ), { numRuns: 50 })
    })
  })

  /**
   * Cache consistency properties
   */
  describe('Cache Consistency Properties', () => {
    it('should invalidate cache when roles are modified', () => {
      fc.assert(fc.property(
        roleIdGenerator,
        roleNameGenerator,
        permissionsArrayGenerator,
        userIdGenerator,
        async (roleId, roleName, newPermissions, updatedBy) => {
          // Arrange
          mockPrisma.role.findUnique.mockResolvedValue({
            id: roleId,
            name: roleName,
            description: 'Test role',
            permissions: fc.sample(permissionsArrayGenerator, 1)[0] as string[],
            createdAt: new Date(),
            updatedAt: new Date()
          } as any)

          mockPrisma.role.update.mockResolvedValue({
            id: roleId,
            name: roleName,
            description: 'Test role',
            permissions: newPermissions as string[],
            createdAt: new Date(),
            updatedAt: new Date()
          } as any)

          mockCacheService.del.mockResolvedValue(true)

          // Act
          await rbacService.updateRole(roleId, { permissions: newPermissions }, updatedBy)

          // Assert - Cache should be cleared
          expect(mockCacheService.del).toHaveBeenCalled()
        }
      ), { numRuns: 30 })
    })

    it('should invalidate user cache when role assignments change', () => {
      fc.assert(fc.property(
        userIdGenerator,
        roleIdGenerator,
        userIdGenerator, // assignedBy
        async (userId, roleId, assignedBy) => {
          // Arrange
          mockPrisma.user.findUnique.mockResolvedValue({ id: userId } as any)
          mockPrisma.role.findUnique.mockResolvedValue({ 
            id: roleId, 
            name: 'test-role',
            description: 'Test role',
            permissions: fc.sample(permissionsArrayGenerator, 1)[0] as string[]
          } as any)
          mockPrisma.userRole.findUnique.mockResolvedValue(null) // No existing assignment
          mockPrisma.userRole.create.mockResolvedValue({
            userId,
            roleId,
            assignedAt: new Date(),
            assignedBy
          } as any)
          mockCacheService.del.mockResolvedValue(true)

          // Act
          await rbacService.assignRole({ userId, roleId, assignedBy })

          // Assert - User permission cache should be cleared
          expect(mockCacheService.del).toHaveBeenCalledWith(`user_permissions:${userId}`)
        }
      ), { numRuns: 50 })
    })
  })
})