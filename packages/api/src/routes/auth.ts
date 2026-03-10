import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { authMiddleware } from '../middleware/auth'
import { AuthController } from '../controllers/AuthController'

const router = Router()
const authController = new AuthController()

// Authentication routes
router.post('/login', asyncHandler(authController.login.bind(authController)))
router.post('/logout', asyncHandler(authController.logout.bind(authController)))
router.post('/refresh', asyncHandler(authController.refreshToken.bind(authController)))
router.post('/forgot-password', asyncHandler(authController.forgotPassword.bind(authController)))
router.post('/reset-password', asyncHandler(authController.resetPassword.bind(authController)))

// Protected routes
router.get('/me', authMiddleware, asyncHandler(authController.me.bind(authController)))
router.post('/register', authMiddleware, asyncHandler(authController.register.bind(authController)))
router.post('/create-employee-user', authMiddleware, asyncHandler(authController.createEmployeeUser.bind(authController)))

// MFA routes
router.post('/mfa/setup', asyncHandler(authController.setupMFA.bind(authController)))
router.post('/mfa/verify', asyncHandler(authController.verifyMFA.bind(authController)))
router.post('/mfa/disable', asyncHandler(authController.disableMFA.bind(authController)))

export default router