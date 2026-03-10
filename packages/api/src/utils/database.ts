import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

// Configure Prisma with event-based logging
export const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
}) as PrismaClient & {
  $on(eventType: 'query', callback: (e: any) => void): void
  $on(eventType: 'error', callback: (e: any) => void): void
  $on(eventType: 'info', callback: (e: any) => void): void
  $on(eventType: 'warn', callback: (e: any) => void): void
}

// Enable SSL for database connections in production
if (process.env.NODE_ENV === 'production') {
  // Note: SSL mode should be configured in DATABASE_URL directly
  // Example: postgresql://user:pass@host:5432/db?sslmode=require
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode')) {
    logger.info('Enabling SSL for database connection in production')
    logger.info('Add sslmode=require to DATABASE_URL for SSL connections')
  }
}

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e: any) => {
    logger.debug(`Query: ${e.query}`)
    logger.debug(`Params: ${e.params}`)
    logger.debug(`Duration: ${e.duration}ms`)
  })
}

prisma.$on('error', (e: any) => {
  logger.error('Database error:', e)
})

prisma.$on('info', (e: any) => {
  logger.info('Database info:', e.message)
})

prisma.$on('warn', (e: any) => {
  logger.warn('Database warning:', e.message)
})

export async function connectDatabase() {
  try {
    await prisma.$connect()
    logger.info('Successfully connected to database')
  } catch (error) {
    logger.error('Failed to connect to database:', error)
    throw error
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect()
    logger.info('Disconnected from database')
  } catch (error) {
    logger.error('Error disconnecting from database:', error)
    throw error
  }
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDatabase()
})

export default prisma