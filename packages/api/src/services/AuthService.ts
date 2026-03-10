import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { prisma } from '../utils/database'
import { CacheService } from '../utils/redis'
import { logger } from '../utils/logger'
import { emailService } from './EmailService'
import {
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  ConflictError
} from '../middleware/errorHandler'
import {
  LoginCredentials,
  AuthResult,
  TokenPair,
  UserProfile,
  UserRole,
  Permission,
  ROLE_PERMISSIONS
} from '@hrms/shared'

export interface MFASetupResult {
  secret: string
  qrCode: string
  manualEntryKey: string
  backupCodes: string[]
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  newPassword: string
}

export class AuthService {
  private readonly jwtSecret: string
  private readonly jwtRefreshSecret: string
  private readonly mfaIssuer: string
  private readonly bcryptRounds: number

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET!
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!
    this.mfaIssuer = process.env.MFA_ISSUER || 'HRMS'
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12')

    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error('JWT secrets must be configured')
    }
  }

  /**
   * Authenticate user with email/password and optional MFA
   */
  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    const { email, password, mfaCode } = credentials

    // Find user with roles and employee data
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        employee: true
      }
    })

    if (!user || !user.isActive) {
      logger.warn(`Failed login attempt for email: ${email}`)
      throw new UnauthorizedError('Invalid credentials')
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      logger.warn(`Invalid password for user: ${user.id}`)
      await this.recordFailedLogin(user.id, 'invalid_password')
      throw new UnauthorizedError('Invalid credentials')
    }

    // Check if MFA is required
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return {
          success: false,
          requiresMFA: true,
          message: 'Multi-factor authentication code required'
        }
      }

      const isMFAValid = await this.verifyMFAToken(user.mfaSecret!, mfaCode)
      if (!isMFAValid) {
        logger.warn(`Invalid MFA code for user: ${user.id}`)
        await this.recordFailedLogin(user.id, 'invalid_mfa')
        throw new UnauthorizedError('Invalid multi-factor authentication code')
      }
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email)

    // Build user profile
    const userProfile = this.buildUserProfile(user)

    // Update last login and clear failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date()
      }
    })

    // Cache refresh token
    await CacheService.set(
      `refresh_token:${user.id}`,
      tokens.refreshToken,
      7 * 24 * 60 * 60 // 7 days
    )

    // Clear any failed login attempts
    await CacheService.del(`failed_logins:${user.id}`)

    logger.info(`Successful login for user: ${user.email}`)

    return {
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userProfile
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any

      // Check if refresh token exists in cache
      const cachedToken = await CacheService.get(`refresh_token:${decoded.userId}`)
      if (cachedToken !== refreshToken) {
        throw new UnauthorizedError('Invalid refresh token')
      }

      // Verify user is still active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive')
      }

      // Generate new tokens
      const tokens = this.generateTokens(user.id, user.email)

      // Update cached refresh token
      await CacheService.set(
        `refresh_token:${user.id}`,
        tokens.refreshToken,
        7 * 24 * 60 * 60
      )

      logger.info(`Token refreshed for user: ${user.id}`)

      return tokens
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token')
      }
      throw error
    }
  }

  /**
   * Logout user and invalidate tokens
   */
  async logout(userId: string, accessToken?: string): Promise<void> {
    // Remove refresh token from cache
    await CacheService.del(`refresh_token:${userId}`)

    // Add access token to blacklist if provided
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken) as any
        if (decoded?.exp) {
          const remainingTime = decoded.exp - Math.floor(Date.now() / 1000)
          if (remainingTime > 0) {
            await CacheService.set(`blacklist:${accessToken}`, true, remainingTime)
          }
        }
      } catch (error) {
        logger.warn('Error blacklisting token during logout:', error)
      }
    }

    logger.info(`User logged out: ${userId}`)
  }

  /**
   * Initiate password reset process
   */
  async initiatePasswordReset(request: PasswordResetRequest): Promise<void> {
    const { email } = request

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    // Always return success to prevent email enumeration
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`)
      return
    }

    // Generate secure reset token
    const resetToken = this.generateSecureToken()
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store reset token in cache
    await CacheService.set(`password_reset:${resetToken}`, user.id, 60 * 60)

    // Send email with reset link
    await emailService.sendPasswordResetEmail(user.email, resetToken)

    logger.info(`Password reset initiated for user: ${user.id}`)
  }

  /**
   * Complete password reset with token
   */
  async completePasswordReset(request: PasswordResetConfirm): Promise<void> {
    const { token, newPassword } = request

    // Validate password strength
    this.validatePasswordStrength(newPassword)

    // Get user ID from cache
    const userId = await CacheService.get(`password_reset:${token}`)
    if (!userId) {
      throw new UnauthorizedError('Invalid or expired reset token')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds)

    // Update password
    await prisma.user.update({
      where: { id: userId as string },
      data: { password: hashedPassword }
    })

    // Remove reset token
    await CacheService.del(`password_reset:${token}`)

    // Invalidate all refresh tokens for this user
    await CacheService.del(`refresh_token:${userId}`)

    // Clear failed login attempts
    await CacheService.del(`failed_logins:${userId}`)

    logger.info(`Password reset completed for user: ${userId}`)
  }

  /**
   * Setup multi-factor authentication
   */
  async setupMFA(userId: string): Promise<MFASetupResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    if (user.mfaEnabled) {
      throw new ConflictError('Multi-factor authentication is already enabled')
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.mfaIssuer} (${user.email})`,
      issuer: this.mfaIssuer,
      length: 32
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

    // Generate backup codes
    const backupCodes = this.generateBackupCodes()

    // Store secret and backup codes temporarily
    await CacheService.set(`mfa_setup:${userId}`, {
      secret: secret.base32,
      backupCodes
    }, 10 * 60) // 10 minutes

    logger.info(`MFA setup initiated for user: ${userId}`)

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
      backupCodes
    }
  }

  /**
   * Verify and enable MFA
   */
  async verifyAndEnableMFA(userId: string, token: string): Promise<void> {
    // Get temporary setup data
    const setupData = await CacheService.get(`mfa_setup:${userId}`)
    if (!setupData) {
      throw new UnauthorizedError('MFA setup session expired')
    }

    const { secret, backupCodes } = setupData as any

    // Verify token
    const isValid = this.verifyMFAToken(secret, token)
    if (!isValid) {
      throw new UnauthorizedError('Invalid authentication code')
    }

    // Enable MFA for user
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret
      }
    })

    // Store backup codes securely (in production, encrypt these)
    await CacheService.set(`mfa_backup:${userId}`, backupCodes, 365 * 24 * 60 * 60) // 1 year

    // Remove temporary setup data
    await CacheService.del(`mfa_setup:${userId}`)

    logger.info(`MFA enabled for user: ${userId}`)
  }

  /**
   * Disable multi-factor authentication
   */
  async disableMFA(userId: string, password: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid password')
    }

    // Disable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null
      }
    })

    // Remove backup codes
    await CacheService.del(`mfa_backup:${userId}`)

    logger.info(`MFA disabled for user: ${userId}`)
  }

  /**
   * Verify user authorization for resource access
   */
  async authorize(userId: string, resource: string, action: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user || !user.isActive) {
      return false
    }

    // Get all permissions for user
    const permissions = user.roles.flatMap(ur =>
      ur.role.permissions.map((rp: any) => rp.permission.slug as Permission)
    )
    const uniquePermissions = [...new Set(permissions)] as Permission[]

    // Check if user has required permission
    const requiredPermission = `${action}_${resource}`.toUpperCase() as Permission

    return uniquePermissions.includes(requiredPermission) ||
      uniquePermissions.includes(Permission.SYSTEM_ADMIN)
  }

  /**
   * Generate JWT token pair
   */
  private generateTokens(userId: string, email: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, email },
      this.jwtSecret,
      { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign(
      { userId, email },
      this.jwtRefreshSecret,
      { expiresIn: '7d' }
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes
      tokenType: 'Bearer'
    }
  }

  /**
   * Build user profile from database user
   */
  private buildUserProfile(user: any): UserProfile {
    const roles = user.roles.map((ur: any) => ur.role.name as UserRole)
    const permissions = user.roles.flatMap((ur: any) =>
      ur.role.permissions.map((rp: any) => rp.permission.slug as Permission)
    )

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions: [...new Set(permissions)] as Permission[],
      employeeId: user.employee?.id,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      mfaEnabled: user.mfaEnabled
    }
  }

  /**
   * Verify MFA token
   */
  private verifyMFAToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: parseInt(process.env.MFA_WINDOW || '2')
    })
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
  }

  /**
   * Generate backup codes for MFA
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = []
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase())
    }
    return codes
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long')
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new ValidationError('Password must contain at least one lowercase letter')
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter')
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new ValidationError('Password must contain at least one number')
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      throw new ValidationError('Password must contain at least one special character')
    }
  }

  /**
   * Record failed login attempt
   */
  private async recordFailedLogin(userId: string, reason: string): Promise<void> {
    const key = `failed_logins:${userId}`
    const attempts = await CacheService.get(key) || 0
    const newAttempts = (attempts as number) + 1

    await CacheService.set(key, newAttempts, 15 * 60) // 15 minutes

    // Lock account after 5 failed attempts
    if (newAttempts >= 5) {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      })

      logger.warn(`Account locked due to failed login attempts: ${userId}`)
    }

    logger.warn(`Failed login attempt ${newAttempts}/5 for user: ${userId}, reason: ${reason}`)
  }
}