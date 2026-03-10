// HRMS API Server
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'

import { errorHandler } from './middleware/errorHandler'
import { notFoundHandler } from './middleware/notFoundHandler'
import { authMiddleware } from './middleware/auth'
import { logger } from './utils/logger'
import { connectDatabase } from './utils/database'
import { connectRedis } from './utils/redis'
import { webSocketService } from './services/WebSocketService'

// Import routes
import authRoutes from './routes/auth'
import employeeRoutes from './routes/employees'
import roleRoutes from './routes/roles'
import auditRoutes from './routes/audit'
import hrModulesRoutes from './routes/hr-modules'
import chatRoutes from './routes/chat'
import tenantRoutes from './routes/tenants'
import departmentRoutes from './routes/departments'
import teamRoutes from './routes/teams'
import goalRoutes from './routes/goals'
import projectRoutes from './routes/projects'
import expenseRoutes from './routes/expenses'
import scheduleRoutes from './routes/schedules'
import notificationRoutes from './routes/notifications'
import activityRoutes from './routes/activities'
import announcementRoutes from './routes/announcements'
import surveyRoutes from './routes/surveys'
import dashboardRoutes from './routes/dashboards'
import reportRoutes from './routes/reports'
import workflowRoutes from './routes/workflows'
import customFieldRoutes from './routes/custom-fields'
import integrationRoutes from './routes/integrations'
import candidateRoutes from './routes/candidates'
import settingRoutes from './routes/settings'
import leaveRoutes from './routes/leave'
import timeRoutes from './routes/time-entries'
import payrollRoutes from './routes/payroll'
import performanceRoutes from './routes/performance'
import recruitmentRoutes from './routes/recruitment'
import onboardingRoutes from './routes/onboarding'
import benefitsRoutes from './routes/benefits'
import learningRoutes from './routes/learning'
import wellnessRoutes from './routes/wellness'
import complianceRoutes from './routes/compliance'
import documentRoutes from './routes/documents'
import offboardingRoutes from './routes/offboarding'


import { RBACService } from './services/RBACService'
import { prisma as dbPrisma } from './utils/database'

/**
 * Bootstrap default roles and ensure users have proper role assignments.
 * Runs once on server startup — safe to call multiple times (idempotent).
 */
async function bootstrapRolesAndAdmin() {
  const rbacService = new RBACService()

  // 1. Initialize default roles and permissions
  await rbacService.initializeDefaultRoles()
  logger.info('Default roles initialized')

  // 2. Load all roles from DB
  const allRoles = await dbPrisma.role.findMany()
  const roleMap = new Map(allRoles.map(r => [r.name, r.id]))

  if (allRoles.length === 0) {
    logger.warn('No roles found after initialization — skipping bootstrap')
    return
  }

  // 3. Known email-to-role mapping for system users
  const knownUserRoles: Array<{ emailMatch: string; roleName: string; exact: boolean }> = [
    { emailMatch: 'admin@hrms.com', roleName: 'admin', exact: true },
    { emailMatch: 'hr@hrms.com', roleName: 'hr_manager', exact: true },
    { emailMatch: 'manager@hrms.com', roleName: 'manager', exact: true },
  ]

  // 4. Assign correct roles to known system users
  for (const mapping of knownUserRoles) {
    const user = await dbPrisma.user.findUnique({ where: { email: mapping.emailMatch } })
    if (!user) continue

    const roleId = roleMap.get(mapping.roleName)
    if (!roleId) continue

    // Check if user already has this specific role
    const hasRole = await dbPrisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId } }
    })

    if (!hasRole) {
      // Remove any incorrect roles first (e.g., admin user having only 'employee')
      await dbPrisma.userRole.deleteMany({ where: { userId: user.id } })

      // Assign the correct role
      await dbPrisma.userRole.create({
        data: {
          userId: user.id,
          roleId,
          assignedBy: user.id,
        }
      })
      logger.info(`Role '${mapping.roleName}' assigned to ${user.email}`)
    }
  }

  // 5. Ensure all remaining users without any role get the default 'employee' role
  const employeeRoleId = roleMap.get('employee')
  if (employeeRoleId) {
    const usersWithoutRoles = await dbPrisma.user.findMany({
      where: { roles: { none: {} } },
      select: { id: true, email: true }
    })

    for (const user of usersWithoutRoles) {
      await dbPrisma.userRole.create({
        data: {
          userId: user.id,
          roleId: employeeRoleId,
          assignedBy: user.id,
        }
      })
      logger.info(`Default employee role assigned to ${user.email}`)
    }
  }

  // Clear cache to ensure frontend gets the freshly bootstrapped roles instead of stale data
  import('./utils/redis').then(({ CacheService, isRedisAvailable }) => {
    if (isRedisAvailable()) {
      CacheService.flush().then(() => logger.info('Cache flushed after role bootstrap'))
    }
  }).catch(err => logger.warn('Failed to flush cache during bootstrap:', err))

  logger.info('Role bootstrap complete')
}


// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const HTTPS_PORT = process.env.HTTPS_PORT || 3443
const USE_HTTPS = process.env.USE_HTTPS === 'true'

// Enhanced security middleware with strict settings
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true
}))
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use(limiter)

// Body parsing middleware
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }))

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/employees', authMiddleware, employeeRoutes)
app.use('/api/v1/roles', authMiddleware, roleRoutes)
app.use('/api/v1/audit', authMiddleware, auditRoutes)
app.use('/api/v1/leave', authMiddleware, leaveRoutes)
app.use('/api/v1/time', authMiddleware, timeRoutes)
app.use('/api/v1/payroll', authMiddleware, payrollRoutes)
app.use('/api/v1/performance', authMiddleware, performanceRoutes)
app.use('/api/v1/recruitment', authMiddleware, recruitmentRoutes)
app.use('/api/v1/onboarding', authMiddleware, onboardingRoutes)
app.use('/api/v1/benefits', authMiddleware, benefitsRoutes)
app.use('/api/v1/learning', authMiddleware, learningRoutes)
app.use('/api/v1/wellness', authMiddleware, wellnessRoutes)
app.use('/api/v1/compliance', authMiddleware, complianceRoutes)
app.use('/api/v1/documents', authMiddleware, documentRoutes)
app.use('/api/v1/offboarding', authMiddleware, offboardingRoutes)
app.use('/api/v1/chat', chatRoutes)
app.use('/api/v1/tenants', tenantRoutes)
app.use('/api/v1/departments', departmentRoutes)
app.use('/api/v1/teams', teamRoutes)
app.use('/api/v1/goals', goalRoutes)
app.use('/api/v1/projects', projectRoutes)
app.use('/api/v1/expenses', expenseRoutes)
app.use('/api/v1/schedules', scheduleRoutes)
app.use('/api/v1/notifications', notificationRoutes)
app.use('/api/v1/activities', activityRoutes)
app.use('/api/v1/announcements', announcementRoutes)
app.use('/api/v1/surveys', surveyRoutes)
app.use('/api/v1/dashboards', dashboardRoutes)
app.use('/api/v1/reports', reportRoutes)
app.use('/api/v1/workflows', workflowRoutes)
app.use('/api/v1/custom-fields', customFieldRoutes)
app.use('/api/v1/integrations', integrationRoutes)
app.use('/api/v1/candidates', candidateRoutes)
app.use('/api/v1/settings', settingRoutes)
app.use('/api/v1', authMiddleware, hrModulesRoutes)

// Error handling middleware
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase()
    logger.info('Database connected successfully')

    // Connect to Redis (optional)
    try {
      await connectRedis()
      logger.info('Redis connected successfully')
    } catch (error) {
      logger.warn('Redis not available, continuing without cache')
    }

    // Auto-bootstrap: initialize default roles and ensure admin has the admin role
    try {
      await bootstrapRolesAndAdmin()
    } catch (error) {
      logger.warn('Role bootstrap failed (non-fatal):', error)
    }

    // Start HTTPS server if enabled
    if (USE_HTTPS) {
      try {
        const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../certs/cert.pem')
        const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '../certs/key.pem')

        // Check if certificates exist
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
          const httpsOptions = {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
            // Enable strong ciphers only
            ciphers: [
              'ECDHE-RSA-AES128-GCM-SHA256',
              'ECDHE-RSA-AES256-GCM-SHA384',
              'ECDHE-RSA-AES128-SHA256',
              'ECDHE-RSA-AES256-SHA384'
            ].join(':'),
            honorCipherOrder: true,
            minVersion: 'TLSv1.2' as const
          }

          const httpsServer = https.createServer(httpsOptions, app)

          // Initialize WebSocket on HTTPS server
          webSocketService.initialize(httpsServer)

          httpsServer.listen(HTTPS_PORT, () => {
            logger.info(`HRMS API Server running on HTTPS port ${HTTPS_PORT}`)
            logger.info(`WebSocket server initialized on HTTPS`)
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
            logger.info('TLS/SSL encryption enabled for data in transit')
          })
        } else {
          logger.warn('SSL certificates not found, falling back to HTTP')
          logger.warn(`Expected cert at: ${certPath}`)
          logger.warn(`Expected key at: ${keyPath}`)
          startHttpServer()
        }
      } catch (error) {
        logger.error('Failed to start HTTPS server:', error)
        logger.warn('Falling back to HTTP server')
        startHttpServer()
      }
    } else {
      startHttpServer()
    }
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

function startHttpServer() {
  const httpServer = http.createServer(app)

  // Initialize WebSocket on HTTP server
  webSocketService.initialize(httpServer)

  httpServer.listen(PORT, () => {
    logger.info(`HRMS API Server running on HTTP port ${PORT}`)
    logger.info(`WebSocket server initialized on HTTP`)
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
    if (process.env.NODE_ENV === 'production') {
      logger.warn('WARNING: Running in production without HTTPS is not recommended')
    }
  })
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  process.exit(0)
})

startServer()

export default app

