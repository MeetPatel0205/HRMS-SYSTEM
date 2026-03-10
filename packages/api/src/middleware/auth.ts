import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../utils/database'
import { RBACService } from '../services/RBACService'
import { UnauthorizedError, ForbiddenError } from './errorHandler'
import { UserProfile, Permission } from '@hrms/shared'
import { logger } from '../utils/logger'

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile
    }
  }
}

interface JwtPayload {
  userId: string
  email: string
  iat: number
  exp: number
}

const rbacService = new RBACService()

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token required')
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    if (!token) {
      throw new UnauthorizedError('Access token required')
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload
    
    // Fetch user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        roles: {
          include: {
            role: true
          }
        },
        employee: true
      }
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid or inactive user')
    }

    // Build user profile with permissions from RBAC service
    const roles = user.roles.map((ur: any) => ur.role.name as any)
    const permissions = await rbacService.getUserPermissions(user.id)

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions: permissions,
      employeeId: user.employee?.id,
      isActive: user.isActive,
      lastLogin: user.lastLogin || undefined,
      mfaEnabled: user.mfaEnabled
    }

    // Attach user to request
    req.user = userProfile

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid access token'))
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Access token expired'))
    } else {
      next(error)
    }
  }
}

// Permission checking middleware
export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'))
    }

    const hasPermission = await rbacService.hasPermission({
      userId: req.user.id,
      permission,
      resourceId: req.params.id,
      context: { method: req.method, path: req.path }
    })

    if (!hasPermission) {
      logger.warn(`User ${req.user.id} attempted to access resource requiring ${permission}`)
      return next(new ForbiddenError(`Insufficient permissions. Required: ${permission}`))
    }

    next()
  }
}

// Multiple permissions (user needs ALL of them)
export function requirePermissions(permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'))
    }

    const hasAllPermissions = await rbacService.hasAllPermissions(req.user.id, permissions)

    if (!hasAllPermissions) {
      logger.warn(`User ${req.user.id} attempted to access resource requiring permissions: ${permissions.join(', ')}`)
      return next(new ForbiddenError(`Insufficient permissions. Required: ${permissions.join(', ')}`))
    }

    next()
  }
}

// Any of the permissions (user needs at least ONE of them)
export function requireAnyPermission(permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'))
    }

    const hasAnyPermission = await rbacService.hasAnyPermission(req.user.id, permissions)

    if (!hasAnyPermission) {
      logger.warn(`User ${req.user.id} attempted to access resource requiring any of: ${permissions.join(', ')}`)
      return next(new ForbiddenError(`Insufficient permissions. Required any of: ${permissions.join(', ')}`))
    }

    next()
  }
}

// Check if user owns the resource (for employee self-service)
export function requireOwnership(getResourceOwnerId: (req: Request) => string | undefined) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'))
    }

    const resourceOwnerId = getResourceOwnerId(req)
    
    // Admin and HR managers can access any resource
    const hasAdminAccess = await rbacService.hasAnyPermission(req.user.id, [
      Permission.SYSTEM_ADMIN,
      Permission.WRITE_EMPLOYEE
    ])

    if (hasAdminAccess) {
      return next()
    }

    // Check if user owns the resource
    if (req.user.employeeId !== resourceOwnerId) {
      logger.warn(`User ${req.user.id} attempted to access resource owned by ${resourceOwnerId}`)
      return next(new ForbiddenError('Access denied. You can only access your own resources.'))
    }

    next()
  }
}

// Aliases for backward compatibility
export const authenticate = authMiddleware
export const authorize = (action: string, resource: string) => {
  // Convert action_resource to Permission enum format
  const permission = `${action}_${resource}`.toUpperCase() as Permission
  return requirePermission(permission)
}