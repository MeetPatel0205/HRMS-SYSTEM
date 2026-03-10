import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { AuthService } from '../services/AuthService'
import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import {
  ValidationError,
  ConflictError,
  NotFoundError
} from '../middleware/errorHandler'
import {
  LoginCredentialsSchema,
  createSuccessResponse
} from '@hrms/shared'

export class AuthController {
  private authService: AuthService

  constructor() {
    this.authService = new AuthService()
  }
  async login(req: Request, res: Response) {
    const credentials = LoginCredentialsSchema.parse(req.body)

    const result = await this.authService.authenticate(credentials)

    if (!result.success && result.requiresMFA) {
      return res.json(createSuccessResponse({
        requiresMFA: true,
        message: result.message
      }))
    }

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: result.message || 'Authentication failed',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || crypto.randomUUID()
        }
      })
    }

    res.json(createSuccessResponse({
      user: result.user,
      accessToken: result.token,
      refreshToken: result.refreshToken,
      expiresIn: 15 * 60 // 15 minutes
    }))
    return
  }

  async logout(req: Request, res: Response) {
    const authHeader = req.headers.authorization
    let accessToken: string | undefined

    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7)
    }

    // Get user ID from token or request
    let userId: string | undefined
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken) as any
        userId = decoded?.userId
      } catch (error) {
        logger.warn('Error decoding token during logout:', error)
      }
    }

    if (userId) {
      await this.authService.logout(userId, accessToken)
    }

    res.json(createSuccessResponse({ message: 'Logged out successfully' }))
  }

  async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body

    if (!refreshToken) {
      throw new ValidationError('Refresh token required')
    }

    const tokens = await this.authService.refreshToken(refreshToken)

    res.json(createSuccessResponse({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    }))
  }

  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body

    if (!email) {
      throw new ValidationError('Email is required')
    }

    await this.authService.initiatePasswordReset({ email })

    res.json(createSuccessResponse({
      message: 'If the email exists, a reset link has been sent'
    }))
  }

  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      throw new ValidationError('Token and new password are required')
    }

    await this.authService.completePasswordReset({ token, newPassword })

    res.json(createSuccessResponse({ message: 'Password reset successfully' }))
  }

  async setupMFA(req: Request, res: Response) {
    const { userId } = req.body

    if (!userId) {
      throw new ValidationError('User ID is required')
    }

    const result = await this.authService.setupMFA(userId)

    res.json(createSuccessResponse({
      secret: result.secret,
      qrCode: result.qrCode,
      manualEntryKey: result.manualEntryKey,
      backupCodes: result.backupCodes
    }))
  }

  async verifyMFA(req: Request, res: Response) {
    const { userId, token } = req.body

    if (!userId || !token) {
      throw new ValidationError('User ID and token are required')
    }

    await this.authService.verifyAndEnableMFA(userId, token)

    res.json(createSuccessResponse({ message: 'MFA enabled successfully' }))
  }

  async me(req: Request, res: Response) {
    const user = (req as any).user // User is attached by auth middleware

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || crypto.randomUUID()
        }
      })
    }

    return res.json(createSuccessResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles || []
      }
    }))
  }

  async disableMFA(req: Request, res: Response) {
    const { userId, password } = req.body

    if (!userId || !password) {
      throw new ValidationError('User ID and password are required')
    }

    await this.authService.disableMFA(userId, password)

    res.json(createSuccessResponse({ message: 'MFA disabled successfully' }))
  }

  async createEmployeeUser(req: Request, res: Response) {
    const { employeeId, password } = req.body

    if (!employeeId || !password) {
      throw new ValidationError('Employee ID and password are required')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    const result = await prisma.$transaction(async (tx) => {
      // Find the employee
      const employee = await tx.employee.findUnique({
        where: { id: employeeId }
      })

      if (!employee) {
        throw new NotFoundError('Employee not found')
      }

      if (employee.userId) {
        throw new ConflictError('Employee already has a linked user account')
      }

      // Check if user with email already exists
      const existingUser = await tx.user.findUnique({ where: { email: employee.email } })
      if (existingUser) {
        throw new ConflictError('A login account with this employee\'s email already exists')
      }

      // Create the User account
      const user = await tx.user.create({
        data: {
          email: employee.email,
          password: hashedPassword,
          firstName: employee.firstName,
          lastName: employee.lastName,
          isActive: true,
        }
      })

      // Link Employee to User
      await tx.employee.update({
        where: { id: employeeId },
        data: { userId: user.id }
      })

      // Auto-assign default 'employee' role
      const employeeRole = await tx.role.findUnique({ where: { name: 'employee' } })
      if (employeeRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: employeeRole.id,
            assignedBy: req.user?.id || user.id,
          }
        })
      }

      return { user }
    })

    logger.info(`Login account created for employee: ${employeeId}`)

    res.status(201).json(createSuccessResponse({
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      }
    }, 'Login account created successfully'))
  }

  async register(req: Request, res: Response) {
    const { email, password, firstName, lastName } = req.body

    if (!email || !password || !firstName || !lastName) {
      throw new ValidationError('Email, password, first name, and last name are required')
    }

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw new ConflictError('A user with this email already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user + employee in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the User account
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          isActive: true,
        }
      })

      // Generate employee number
      const count = await tx.employee.count()
      const year = new Date().getFullYear()
      const employeeNumber = `EMP${year}${String(count + 1).padStart(4, '0')}`

      // Create linked Employee record
      const employee = await tx.employee.create({
        data: {
          employeeNumber,
          userId: user.id,
          firstName,
          lastName,
          email,
          phone: '',
          dateOfBirth: new Date('2000-01-01'),
          address: {},
          emergencyContacts: [],
          hireDate: new Date(),
          employmentType: 'full_time',
          status: 'active',
          jobTitle: 'New Employee',
          department: 'Unassigned',
          location: 'Main Office',
          salaryInfo: {},
          skills: [],
          certifications: [],
          languages: [],
          customFields: {},
          createdBy: req.user?.id || user.id,
          updatedBy: req.user?.id || user.id,
        }
      })

      // Auto-assign default 'employee' role
      const employeeRole = await tx.role.findUnique({ where: { name: 'employee' } })
      if (employeeRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: employeeRole.id,
            assignedBy: req.user?.id || user.id,
          }
        })
      }

      return { user, employee }
    })

    logger.info(`User registered: ${result.user.id} (${email})`)

    res.status(201).json(createSuccessResponse({
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      employee: {
        id: result.employee.id,
        employeeNumber: result.employee.employeeNumber,
      }
    }, 'User created successfully'))
  }
}