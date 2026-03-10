import { Request, Response } from 'express'
import { RBACService } from '../services/RBACService'
import { logger } from '../utils/logger'
import { 
  ValidationError
} from '../middleware/errorHandler'
import { 
  createSuccessResponse,
  Permission
} from '@hrms/shared'
import { z } from 'zod'

const CreateRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  permissions: z.array(z.nativeEnum(Permission))
})

const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  permissions: z.array(z.nativeEnum(Permission)).optional()
})

const AssignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid()
})

const CheckPermissionSchema = z.object({
  userId: z.string().uuid(),
  permission: z.nativeEnum(Permission),
  resourceId: z.string().optional(),
  context: z.record(z.any()).optional()
})

export class RoleController {
  private rbacService: RBACService

  constructor() {
    this.rbacService = new RBACService()
  }

  /**
   * Create a new role
   */
  async createRole(req: Request, res: Response) {
    const data = CreateRoleSchema.parse(req.body)
    const createdBy = req.user!.id

    const role = await this.rbacService.createRole(data, createdBy)

    res.status(201).json(createSuccessResponse(
      role,
      'Role created successfully'
    ))
  }

  /**
   * Update an existing role
   */
  async updateRole(req: Request, res: Response) {
    const { id } = req.params
    const data = UpdateRoleSchema.parse(req.body)
    const updatedBy = req.user!.id

    const role = await this.rbacService.updateRole(id, data, updatedBy)

    res.json(createSuccessResponse(
      role,
      'Role updated successfully'
    ))
  }

  /**
   * Delete a role
   */
  async deleteRole(req: Request, res: Response) {
    const { id } = req.params
    const deletedBy = req.user!.id

    await this.rbacService.deleteRole(id, deletedBy)

    res.json(createSuccessResponse(
      null,
      'Role deleted successfully'
    ))
  }

  /**
   * Get all roles
   */
  async getRoles(req: Request, res: Response) {
    const roles = await this.rbacService.getRoles()

    res.json(createSuccessResponse(roles))
  }

  /**
   * Get role by ID
   */
  async getRole(req: Request, res: Response) {
    const { id } = req.params

    const role = await this.rbacService.getRole(id)

    res.json(createSuccessResponse(role))
  }

  /**
   * Assign role to user
   */
  async assignRole(req: Request, res: Response) {
    const data = AssignRoleSchema.parse(req.body)
    const assignedBy = req.user!.id

    const assignment = await this.rbacService.assignRole({
      ...data,
      assignedBy
    })

    res.status(201).json(createSuccessResponse(
      assignment,
      'Role assigned successfully'
    ))
  }

  /**
   * Remove role from user
   */
  async removeRole(req: Request, res: Response) {
    const { userId, roleId } = req.params
    const removedBy = req.user!.id

    await this.rbacService.removeRole(userId, roleId, removedBy)

    res.json(createSuccessResponse(
      null,
      'Role removed successfully'
    ))
  }

  /**
   * Get user roles
   */
  async getUserRoles(req: Request, res: Response) {
    const { userId } = req.params

    const roles = await this.rbacService.getUserRoles(userId)

    res.json(createSuccessResponse(roles))
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(req: Request, res: Response) {
    const { userId } = req.params

    const permissions = await this.rbacService.getUserPermissions(userId)

    res.json(createSuccessResponse(permissions))
  }

  /**
   * Check if user has permission
   */
  async checkPermission(req: Request, res: Response) {
    const data = CheckPermissionSchema.parse(req.body)

    const hasPermission = await this.rbacService.hasPermission(data)

    res.json(createSuccessResponse({
      hasPermission,
      userId: data.userId,
      permission: data.permission,
      resourceId: data.resourceId
    }))
  }

  /**
   * Get users with specific role
   */
  async getUsersWithRole(req: Request, res: Response) {
    const { roleId } = req.params

    const userIds = await this.rbacService.getUsersWithRole(roleId)

    res.json(createSuccessResponse(userIds))
  }

  /**
   * Get users with specific permission
   */
  async getUsersWithPermission(req: Request, res: Response) {
    const { permission } = req.params

    const userIds = await this.rbacService.getUsersWithPermission(permission as any)

    res.json(createSuccessResponse(userIds))
  }

  /**
   * Initialize default roles
   */
  async initializeRoles(req: Request, res: Response) {
    await this.rbacService.initializeDefaultRoles()

    res.json(createSuccessResponse(
      null,
      'Default roles initialized successfully'
    ))
  }
}