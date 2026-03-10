import { AuthService } from '../services/AuthService'
import { prisma } from '../utils/database'
import { CacheService } from '../utils/redis'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UnauthorizedError, ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler'

// Mock dependencies
jest.mock('../utils/database')
jest.mock('../utils/redis')
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')
jest.mock('speakeasy')
jest.mock('qrcode')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockJwt = jwt as jest.Mocked<typeof jwt>

describe('AuthService', () => {
  let authService: AuthService
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up environment variables
    process.env.JWT_SECRET = 'test-jwt-secret'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
    process.env.MFA_ISSUER = 'Test HRMS'
    process.env.BCRYPT_ROUNDS = '12'
    
    authService = new AuthService()
  })

  describe('authenticate', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      mfaEnabled: false,
      mfaSecret: null,
      lastLogin: null,
      roles: [
        {
          role: {
            name: 'employee',
            permissions: ['READ_EMPLOYEE']
          }
        }
      ],
      employee: {
        id: 'emp-123'
      }
    }

    it('should authenticate user with valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockBcrypt.compare.mockResolvedValue(true as never)
      mockJwt.sign.mockReturnValue('mock-token' as never)
      mockCacheService.set.mockResolvedValue(true)
      mockCacheService.del.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      // Act
      const result = await authService.authenticate(credentials)

      // Assert
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.token).toBe('mock-token')
      expect(result.refreshToken).toBe('mock-token')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          roles: {
            include: {
              role: true
            }
          },
          employee: true
        }
      })
    })

    it('should throw UnauthorizedError for invalid email', async () => {
      // Arrange
      const credentials = {
        email: 'invalid@example.com',
        password: 'password123'
      }

      mockPrisma.user.findUnique.mockResolvedValue(null)

      // Act & Assert
      await expect(authService.authenticate(credentials))
        .rejects.toThrow(UnauthorizedError)
    })

    it('should throw UnauthorizedError for invalid password', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password'
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockBcrypt.compare.mockResolvedValue(false as never)
      mockCacheService.get.mockResolvedValue(0)
      mockCacheService.set.mockResolvedValue(true)

      // Act & Assert
      await expect(authService.authenticate(credentials))
        .rejects.toThrow(UnauthorizedError)
    })

    it('should require MFA when enabled', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      const mfaUser = { ...mockUser, mfaEnabled: true, mfaSecret: 'secret' }
      mockPrisma.user.findUnique.mockResolvedValue(mfaUser as any)
      mockBcrypt.compare.mockResolvedValue(true as never)

      // Act
      const result = await authService.authenticate(credentials)

      // Assert
      expect(result.success).toBe(false)
      expect(result.requiresMFA).toBe(true)
    })

    it('should authenticate with valid MFA code', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
        mfaCode: '123456'
      }

      const mfaUser = { ...mockUser, mfaEnabled: true, mfaSecret: 'secret' }
      mockPrisma.user.findUnique.mockResolvedValue(mfaUser as any)
      mockBcrypt.compare.mockResolvedValue(true as never)
      mockJwt.sign.mockReturnValue('mock-token' as never)
      mockCacheService.set.mockResolvedValue(true)
      mockCacheService.del.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue(mfaUser as any)

      // Mock speakeasy verification
      const speakeasy = require('speakeasy')
      speakeasy.totp.verify.mockReturnValue(true)

      // Act
      const result = await authService.authenticate(credentials)

      // Assert
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
    })

    it('should lock account after 5 failed attempts', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password'
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockBcrypt.compare.mockResolvedValue(false as never)
      mockCacheService.get.mockResolvedValue(4) // 4 previous attempts
      mockCacheService.set.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      // Act & Assert
      await expect(authService.authenticate(credentials))
        .rejects.toThrow(UnauthorizedError)
      
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { isActive: false }
      })
    })
  })

  describe('refreshToken', () => {
    it('should refresh valid token', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token'
      const decoded = { userId: 'user-123', email: 'test@example.com' }
      
      mockJwt.verify.mockReturnValue(decoded as never)
      mockCacheService.get.mockResolvedValue(refreshToken)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        isActive: true
      } as any)
      mockJwt.sign.mockReturnValue('new-token' as never)
      mockCacheService.set.mockResolvedValue(true)

      // Act
      const result = await authService.refreshToken(refreshToken)

      // Assert
      expect(result.accessToken).toBe('new-token')
      expect(result.refreshToken).toBe('new-token')
      expect(result.expiresIn).toBe(900) // 15 minutes
    })

    it('should throw UnauthorizedError for invalid token', async () => {
      // Arrange
      const refreshToken = 'invalid-token'
      
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token')
      })

      // Act & Assert
      await expect(authService.refreshToken(refreshToken))
        .rejects.toThrow(UnauthorizedError)
    })

    it('should throw UnauthorizedError for token not in cache', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token'
      const decoded = { userId: 'user-123', email: 'test@example.com' }
      
      mockJwt.verify.mockReturnValue(decoded as never)
      mockCacheService.get.mockResolvedValue('different-token')

      // Act & Assert
      await expect(authService.refreshToken(refreshToken))
        .rejects.toThrow(UnauthorizedError)
    })
  })

  describe('logout', () => {
    it('should logout user and invalidate tokens', async () => {
      // Arrange
      const userId = 'user-123'
      const accessToken = 'access-token'
      
      mockCacheService.del.mockResolvedValue(true)
      mockCacheService.set.mockResolvedValue(true)
      mockJwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 } as never)

      // Act
      await authService.logout(userId, accessToken)

      // Assert
      expect(mockCacheService.del).toHaveBeenCalledWith(`refresh_token:${userId}`)
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `blacklist:${accessToken}`,
        true,
        expect.any(Number)
      )
    })
  })

  describe('initiatePasswordReset', () => {
    it('should initiate password reset for existing user', async () => {
      // Arrange
      const request = { email: 'test@example.com' }
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com'
      } as any)
      mockCacheService.set.mockResolvedValue(true)

      // Act
      await authService.initiatePasswordReset(request)

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      })
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^password_reset:/),
        'user-123',
        3600
      )
    })

    it('should not throw error for non-existent user', async () => {
      // Arrange
      const request = { email: 'nonexistent@example.com' }
      
      mockPrisma.user.findUnique.mockResolvedValue(null)

      // Act & Assert
      await expect(authService.initiatePasswordReset(request))
        .resolves.not.toThrow()
    })
  })

  describe('completePasswordReset', () => {
    it('should reset password with valid token', async () => {
      // Arrange
      const request = {
        token: 'valid-reset-token',
        newPassword: 'NewPassword123!'
      }
      
      mockCacheService.get.mockResolvedValue('user-123')
      mockBcrypt.hash.mockResolvedValue('hashed-new-password' as never)
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockCacheService.del.mockResolvedValue(true)

      // Act
      await authService.completePasswordReset(request)

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: 'hashed-new-password' }
      })
      expect(mockCacheService.del).toHaveBeenCalledWith('password_reset:valid-reset-token')
      expect(mockCacheService.del).toHaveBeenCalledWith('refresh_token:user-123')
    })

    it('should throw UnauthorizedError for invalid token', async () => {
      // Arrange
      const request = {
        token: 'invalid-token',
        newPassword: 'NewPassword123!'
      }
      
      mockCacheService.get.mockResolvedValue(null)

      // Act & Assert
      await expect(authService.completePasswordReset(request))
        .rejects.toThrow(UnauthorizedError)
    })

    it('should throw ValidationError for weak password', async () => {
      // Arrange
      const request = {
        token: 'valid-token',
        newPassword: 'weak'
      }
      
      mockCacheService.get.mockResolvedValue('user-123')

      // Act & Assert
      await expect(authService.completePasswordReset(request))
        .rejects.toThrow(ValidationError)
    })
  })

  describe('setupMFA', () => {
    it('should setup MFA for user', async () => {
      // Arrange
      const userId = 'user-123'
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        mfaEnabled: false
      } as any)
      mockCacheService.set.mockResolvedValue(true)

      // Mock speakeasy and QRCode
      const speakeasy = require('speakeasy')
      const QRCode = require('qrcode')
      
      speakeasy.generateSecret.mockReturnValue({
        base32: 'SECRET123',
        otpauth_url: 'otpauth://totp/test'
      })
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,qrcode')

      // Act
      const result = await authService.setupMFA(userId)

      // Assert
      expect(result.secret).toBe('SECRET123')
      expect(result.qrCode).toBe('data:image/png;base64,qrcode')
      expect(result.backupCodes).toHaveLength(10)
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `mfa_setup:${userId}`,
        expect.objectContaining({
          secret: 'SECRET123',
          backupCodes: expect.any(Array)
        }),
        600
      )
    })

    it('should throw NotFoundError for non-existent user', async () => {
      // Arrange
      const userId = 'non-existent'
      
      mockPrisma.user.findUnique.mockResolvedValue(null)

      // Act & Assert
      await expect(authService.setupMFA(userId))
        .rejects.toThrow(NotFoundError)
    })

    it('should throw ConflictError if MFA already enabled', async () => {
      // Arrange
      const userId = 'user-123'
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        mfaEnabled: true
      } as any)

      // Act & Assert
      await expect(authService.setupMFA(userId))
        .rejects.toThrow(ConflictError)
    })
  })

  describe('verifyAndEnableMFA', () => {
    it('should verify and enable MFA', async () => {
      // Arrange
      const userId = 'user-123'
      const token = '123456'
      
      mockCacheService.get.mockResolvedValue({
        secret: 'SECRET123',
        backupCodes: ['CODE1', 'CODE2']
      })
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockCacheService.set.mockResolvedValue(true)
      mockCacheService.del.mockResolvedValue(true)

      // Mock speakeasy verification
      const speakeasy = require('speakeasy')
      speakeasy.totp.verify.mockReturnValue(true)

      // Act
      await authService.verifyAndEnableMFA(userId, token)

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaSecret: 'SECRET123'
        }
      })
      expect(mockCacheService.del).toHaveBeenCalledWith(`mfa_setup:${userId}`)
    })

    it('should throw UnauthorizedError for expired setup', async () => {
      // Arrange
      const userId = 'user-123'
      const token = '123456'
      
      mockCacheService.get.mockResolvedValue(null)

      // Act & Assert
      await expect(authService.verifyAndEnableMFA(userId, token))
        .rejects.toThrow(UnauthorizedError)
    })

    it('should throw UnauthorizedError for invalid token', async () => {
      // Arrange
      const userId = 'user-123'
      const token = 'invalid'
      
      mockCacheService.get.mockResolvedValue({
        secret: 'SECRET123',
        backupCodes: []
      })

      // Mock speakeasy verification
      const speakeasy = require('speakeasy')
      speakeasy.totp.verify.mockReturnValue(false)

      // Act & Assert
      await expect(authService.verifyAndEnableMFA(userId, token))
        .rejects.toThrow(UnauthorizedError)
    })
  })

  describe('disableMFA', () => {
    it('should disable MFA with valid password', async () => {
      // Arrange
      const userId = 'user-123'
      const password = 'password123'
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        password: 'hashed-password'
      } as any)
      mockBcrypt.compare.mockResolvedValue(true as never)
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockCacheService.del.mockResolvedValue(true)

      // Act
      await authService.disableMFA(userId, password)

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null
        }
      })
      expect(mockCacheService.del).toHaveBeenCalledWith(`mfa_backup:${userId}`)
    })

    it('should throw UnauthorizedError for invalid password', async () => {
      // Arrange
      const userId = 'user-123'
      const password = 'wrong-password'
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        password: 'hashed-password'
      } as any)
      mockBcrypt.compare.mockResolvedValue(false as never)

      // Act & Assert
      await expect(authService.disableMFA(userId, password))
        .rejects.toThrow(UnauthorizedError)
    })
  })

  describe('authorize', () => {
    it('should authorize user with correct permissions', async () => {
      // Arrange
      const userId = 'user-123'
      const resource = 'employee'
      const action = 'read'
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        isActive: true,
        roles: [
          {
            role: {
              permissions: ['READ_EMPLOYEE']
            }
          }
        ]
      } as any)

      // Act
      const result = await authService.authorize(userId, resource, action)

      // Assert
      expect(result).toBe(true)
    })

    it('should deny authorization for insufficient permissions', async () => {
      // Arrange
      const userId = 'user-123'
      const resource = 'payroll'
      const action = 'write'
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        isActive: true,
        roles: [
          {
            role: {
              permissions: ['READ_EMPLOYEE']
            }
          }
        ]
      } as any)

      // Act
      const result = await authService.authorize(userId, resource, action)

      // Assert
      expect(result).toBe(false)
    })

    it('should deny authorization for inactive user', async () => {
      // Arrange
      const userId = 'user-123'
      const resource = 'employee'
      const action = 'read'
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        isActive: false,
        roles: []
      } as any)

      // Act
      const result = await authService.authorize(userId, resource, action)

      // Assert
      expect(result).toBe(false)
    })
  })
})