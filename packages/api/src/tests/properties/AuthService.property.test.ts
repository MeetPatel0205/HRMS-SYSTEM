import * as fc from 'fast-check'
import { AuthService } from '../../services/AuthService'
import { prisma } from '../../utils/database'
import { CacheService } from '../../utils/redis'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { LoginCredentials } from '../../shared/types'

// Mock dependencies
jest.mock('../../utils/database')
jest.mock('../../utils/redis')
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')
jest.mock('speakeasy')
jest.mock('qrcode')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCacheService = CacheService as jest.Mocked<typeof CacheService>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockJwt = jwt as jest.Mocked<typeof jwt>

describe('AuthService Property-Based Tests', () => {
  let authService: AuthService

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up environment variables
    process.env.JWT_SECRET = 'test-jwt-secret'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
    process.env.MFA_ISSUER = 'Test HRMS'
    process.env.BCRYPT_ROUNDS = '4'
    
    authService = new AuthService()
  })

  // Generators for test data
  const emailGenerator = fc.emailAddress()
  const passwordGenerator = fc.string({ minLength: 8, maxLength: 50 })
  const strongPasswordGenerator = fc.string({ minLength: 8, maxLength: 50 })
    .filter(pwd => 
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(pwd)
    )
  const userIdGenerator = fc.uuid()
  const tokenGenerator = fc.string({ minLength: 20, maxLength: 100 })
  const mfaCodeGenerator = fc.string({ minLength: 6, maxLength: 6 }).filter(code => /^\d{6}$/.test(code))

  const userGenerator = fc.record({
    id: userIdGenerator,
    email: emailGenerator,
    password: fc.string(),
    firstName: fc.string({ minLength: 1, maxLength: 50 }),
    lastName: fc.string({ minLength: 1, maxLength: 50 }),
    isActive: fc.boolean(),
    mfaEnabled: fc.boolean(),
    mfaSecret: fc.option(fc.string(), { nil: null }),
    lastLogin: fc.option(fc.date(), { nil: null }),
    roles: fc.array(fc.record({
      role: fc.record({
        name: fc.constantFrom('admin', 'hr_manager', 'manager', 'employee'),
        permissions: fc.array(fc.string())
      })
    })),
    employee: fc.option(fc.record({
      id: userIdGenerator
    }), { nil: null })
  })

  const loginCredentialsGenerator = fc.record({
    email: emailGenerator,
    password: passwordGenerator,
    mfaCode: fc.option(mfaCodeGenerator, { nil: undefined })
  })

  /**
   * Feature: HRMS, Property 47: Multi-Factor Authentication Enforcement
   * Validates: Requirements 18.2
   * 
   * For any sensitive operation, the system should enforce multi-factor authentication 
   * and verify all authentication factors before granting access.
   */
  describe('Property 47: Multi-Factor Authentication Enforcement', () => {
    it('should enforce MFA when enabled for user', () => {
      fc.assert(fc.property(
        loginCredentialsGenerator,
        userGenerator.filter(user => user.mfaEnabled && user.isActive),
        async (credentials, user) => {
          // Arrange
          mockPrisma.user.findUnique.mockResolvedValue(user as any)
          mockBcrypt.compare.mockResolvedValue(true as never)

          // Act - authenticate without MFA code
          const credentialsWithoutMFA = { ...credentials, mfaCode: undefined }
          const result = await authService.authenticate(credentialsWithoutMFA)

          // Assert - should require MFA
          expect(result.success).toBe(false)
          expect(result.requiresMFA).toBe(true)
        }
      ), { numRuns: 50 })
    })

    it('should verify MFA code when provided', () => {
      fc.assert(fc.property(
        loginCredentialsGenerator.filter(creds => creds.mfaCode !== undefined),
        userGenerator.filter(user => user.mfaEnabled && user.isActive && user.mfaSecret),
        fc.boolean(), // MFA verification result
        async (credentials, user, mfaValid) => {
          // Arrange
          mockPrisma.user.findUnique.mockResolvedValue(user as any)
          mockBcrypt.compare.mockResolvedValue(true as never)
          
          // Mock MFA verification
          const speakeasy = require('speakeasy')
          speakeasy.totp.verify.mockReturnValue(mfaValid)

          if (mfaValid) {
            mockJwt.sign.mockReturnValue('mock-token' as never)
            mockCacheService.set.mockResolvedValue(true)
            mockCacheService.del.mockResolvedValue(true)
            mockPrisma.user.update.mockResolvedValue(user as any)
          }

          // Act
          const result = await authService.authenticate(credentials)

          // Assert
          if (mfaValid) {
            expect(result.success).toBe(true)
            expect(result.user).toBeDefined()
            expect(result.token).toBeDefined()
          } else {
            expect(result.success).toBe(false)
            expect(result.requiresMFA).toBeUndefined()
          }
        }
      ), { numRuns: 50 })
    })

    it('should not require MFA for users with MFA disabled', () => {
      fc.assert(fc.property(
        loginCredentialsGenerator,
        userGenerator.filter(user => !user.mfaEnabled && user.isActive),
        async (credentials, user) => {
          // Arrange
          mockPrisma.user.findUnique.mockResolvedValue(user as any)
          mockBcrypt.compare.mockResolvedValue(true as never)
          mockJwt.sign.mockReturnValue('mock-token' as never)
          mockCacheService.set.mockResolvedValue(true)
          mockCacheService.del.mockResolvedValue(true)
          mockPrisma.user.update.mockResolvedValue(user as any)

          // Act
          const result = await authService.authenticate(credentials)

          // Assert
          expect(result.success).toBe(true)
          expect(result.requiresMFA).toBeUndefined()
          expect(result.user).toBeDefined()
        }
      ), { numRuns: 50 })
    })
  })

  /**
   * Additional property tests for authentication robustness
   */
  describe('Authentication Robustness Properties', () => {
    it('should always reject authentication for inactive users', () => {
      fc.assert(fc.property(
        loginCredentialsGenerator,
        userGenerator.filter(user => !user.isActive),
        async (credentials, user) => {
          // Arrange
          mockPrisma.user.findUnique.mockResolvedValue(user as any)

          // Act & Assert
          await expect(authService.authenticate(credentials))
            .rejects.toThrow('Invalid credentials')
        }
      ), { numRuns: 50 })
    })

    it('should always reject authentication for non-existent users', () => {
      fc.assert(fc.property(
        loginCredentialsGenerator,
        async (credentials) => {
          // Arrange
          mockPrisma.user.findUnique.mockResolvedValue(null)

          // Act & Assert
          await expect(authService.authenticate(credentials))
            .rejects.toThrow('Invalid credentials')
        }
      ), { numRuns: 50 })
    })

    it('should always reject authentication with wrong password', () => {
      fc.assert(fc.property(
        loginCredentialsGenerator,
        userGenerator.filter(user => user.isActive),
        async (credentials, user) => {
          // Arrange
          mockPrisma.user.findUnique.mockResolvedValue(user as any)
          mockBcrypt.compare.mockResolvedValue(false as never)
          mockCacheService.get.mockResolvedValue(0)
          mockCacheService.set.mockResolvedValue(true)

          // Act & Assert
          await expect(authService.authenticate(credentials))
            .rejects.toThrow('Invalid credentials')
        }
      ), { numRuns: 50 })
    })

    it('should always generate valid token pairs for successful authentication', () => {
      fc.assert(fc.property(
        loginCredentialsGenerator,
        userGenerator.filter(user => user.isActive && !user.mfaEnabled),
        async (credentials, user) => {
          // Arrange
          mockPrisma.user.findUnique.mockResolvedValue(user as any)
          mockBcrypt.compare.mockResolvedValue(true as never)
          mockJwt.sign.mockReturnValue('mock-token' as never)
          mockCacheService.set.mockResolvedValue(true)
          mockCacheService.del.mockResolvedValue(true)
          mockPrisma.user.update.mockResolvedValue(user as any)

          // Act
          const result = await authService.authenticate(credentials)

          // Assert
          expect(result.success).toBe(true)
          expect(result.token).toBeDefined()
          expect(result.refreshToken).toBeDefined()
          expect(typeof result.token).toBe('string')
          expect(typeof result.refreshToken).toBe('string')
          expect(result.token).not.toBe('')
          expect(result.refreshToken).not.toBe('')
        }
      ), { numRuns: 50 })
    })
  })

  /**
   * Token refresh properties
   */
  describe('Token Refresh Properties', () => {
    it('should always generate new tokens for valid refresh requests', () => {
      fc.assert(fc.property(
        tokenGenerator,
        userIdGenerator,
        emailGenerator,
        async (refreshToken, userId, email) => {
          // Arrange
          const decoded = { userId, email }
          mockJwt.verify.mockReturnValue(decoded as never)
          mockCacheService.get.mockResolvedValue(refreshToken)
          mockPrisma.user.findUnique.mockResolvedValue({
            id: userId,
            email,
            isActive: true
          } as any)
          mockJwt.sign.mockReturnValue('new-token' as never)
          mockCacheService.set.mockResolvedValue(true)

          // Act
          const result = await authService.refreshToken(refreshToken)

          // Assert
          expect(result.accessToken).toBeDefined()
          expect(result.refreshToken).toBeDefined()
          expect(result.expiresIn).toBe(900) // 15 minutes
          expect(result.tokenType).toBe('Bearer')
        }
      ), { numRuns: 50 })
    })

    it('should always reject refresh for tokens not in cache', () => {
      fc.assert(fc.property(
        tokenGenerator,
        userIdGenerator,
        emailGenerator,
        tokenGenerator, // Different token in cache
        async (refreshToken, userId, email, cachedToken) => {
          fc.pre(refreshToken !== cachedToken) // Ensure tokens are different

          // Arrange
          const decoded = { userId, email }
          mockJwt.verify.mockReturnValue(decoded as never)
          mockCacheService.get.mockResolvedValue(cachedToken)

          // Act & Assert
          await expect(authService.refreshToken(refreshToken))
            .rejects.toThrow('Invalid refresh token')
        }
      ), { numRuns: 50 })
    })
  })

  /**
   * Password reset properties
   */
  describe('Password Reset Properties', () => {
    it('should always accept password reset requests without revealing user existence', () => {
      fc.assert(fc.property(
        emailGenerator,
        fc.option(userGenerator, { nil: null }),
        async (email, user) => {
          // Arrange
          mockPrisma.user.findUnique.mockResolvedValue(user as any)
          if (user) {
            mockCacheService.set.mockResolvedValue(true)
          }

          // Act & Assert - should not throw regardless of user existence
          await expect(authService.initiatePasswordReset({ email }))
            .resolves.not.toThrow()
        }
      ), { numRuns: 50 })
    })

    it('should always validate password strength for reset', () => {
      fc.assert(fc.property(
        tokenGenerator,
        fc.string({ maxLength: 7 }), // Weak password
        userIdGenerator,
        async (token, weakPassword, userId) => {
          // Arrange
          mockCacheService.get.mockResolvedValue(userId)

          // Act & Assert
          await expect(authService.completePasswordReset({ token, newPassword: weakPassword }))
            .rejects.toThrow()
        }
      ), { numRuns: 50 })
    })

    it('should always accept strong passwords for reset', () => {
      fc.assert(fc.property(
        tokenGenerator,
        strongPasswordGenerator,
        userIdGenerator,
        async (token, strongPassword, userId) => {
          // Arrange
          mockCacheService.get.mockResolvedValue(userId)
          mockBcrypt.hash.mockResolvedValue('hashed-password' as never)
          mockPrisma.user.update.mockResolvedValue({} as any)
          mockCacheService.del.mockResolvedValue(true)

          // Act & Assert
          await expect(authService.completePasswordReset({ token, newPassword: strongPassword }))
            .resolves.not.toThrow()
        }
      ), { numRuns: 30 }) // Fewer runs due to complex password generation
    })
  })

  /**
   * Authorization properties
   */
  describe('Authorization Properties', () => {
    it('should always deny authorization for inactive users', () => {
      fc.assert(fc.property(
        userIdGenerator,
        fc.string(),
        fc.string(),
        userGenerator.filter(user => !user.isActive),
        async (userId, resource, action, user) => {
          // Arrange
          mockPrisma.user.findUnique.mockResolvedValue(user as any)

          // Act
          const result = await authService.authorize(userId, resource, action)

          // Assert
          expect(result).toBe(false)
        }
      ), { numRuns: 50 })
    })

    it('should always allow authorization for system admins', () => {
      fc.assert(fc.property(
        userIdGenerator,
        fc.string(),
        fc.string(),
        userGenerator.filter(user => user.isActive),
        async (userId, resource, action, user) => {
          // Arrange
          const adminUser = {
            ...user,
            roles: [{
              role: {
                permissions: ['SYSTEM_ADMIN']
              }
            }]
          }
          mockPrisma.user.findUnique.mockResolvedValue(adminUser as any)

          // Act
          const result = await authService.authorize(userId, resource, action)

          // Assert
          expect(result).toBe(true)
        }
      ), { numRuns: 50 })
    })

    it('should correctly match permissions for authorization', () => {
      fc.assert(fc.property(
        userIdGenerator,
        fc.constantFrom('employee', 'payroll', 'performance'),
        fc.constantFrom('read', 'write', 'delete'),
        userGenerator.filter(user => user.isActive),
        fc.boolean(),
        async (userId, resource, action, user, hasPermission) => {
          // Arrange
          const requiredPermission = `${action}_${resource}`.toUpperCase()
          const permissions = hasPermission ? [requiredPermission] : ['OTHER_PERMISSION']
          
          const userWithPermissions = {
            ...user,
            roles: [{
              role: {
                permissions
              }
            }]
          }
          mockPrisma.user.findUnique.mockResolvedValue(userWithPermissions as any)

          // Act
          const result = await authService.authorize(userId, resource, action)

          // Assert
          expect(result).toBe(hasPermission)
        }
      ), { numRuns: 50 })
    })
  })
})