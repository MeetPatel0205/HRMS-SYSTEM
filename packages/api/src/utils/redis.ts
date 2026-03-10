import { createClient } from 'redis'
import { logger } from './logger'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: false // Disable automatic reconnection
  }
})

redisClient.on('error', (err) => {
  // Silently log Redis errors when not connected
  if (err.code !== 'ECONNREFUSED') {
    logger.error('Redis Client Error:', err)
  }
})

redisClient.on('connect', () => {
  logger.info('Redis client connected')
})

redisClient.on('ready', () => {
  logger.info('Redis client ready')
})

redisClient.on('end', () => {
  logger.info('Redis client disconnected')
})

let isRedisConnected = false

export async function connectRedis() {
  try {
    await redisClient.connect()
    isRedisConnected = true
    logger.info('Successfully connected to Redis')
  } catch (error) {
    isRedisConnected = false
    logger.warn('Failed to connect to Redis (running without cache):', error)
    // Don't throw - allow app to run without Redis
  }
}

export function isRedisAvailable(): boolean {
  return isRedisConnected
}

export async function disconnectRedis() {
  if (!isRedisConnected) return

  try {
    await redisClient.quit()
    isRedisConnected = false
    logger.info('Disconnected from Redis')
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error)
    throw error
  }
}

// Cache utility functions
export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    if (!isRedisConnected) return null

    try {
      const value = await redisClient.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  static async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!isRedisConnected) return false

    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await redisClient.setEx(key, ttlSeconds, serialized)
      } else {
        await redisClient.set(key, serialized)
      }
      return true
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error)
      return false
    }
  }

  static async del(key: string): Promise<boolean> {
    if (!isRedisConnected) return false

    try {
      await redisClient.del(key)
      return true
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error)
      return false
    }
  }

  static async delPattern(pattern: string): Promise<boolean> {
    if (!isRedisConnected) return false

    try {
      const keys = await redisClient.keys(pattern)
      if (keys && keys.length > 0) {
        await redisClient.del(keys)
      }
      return true
    } catch (error) {
      logger.error(`Cache delete pattern error for pattern ${pattern}:`, error)
      return false
    }
  }

  static async exists(key: string): Promise<boolean> {
    if (!isRedisConnected) return false

    try {
      const result = await redisClient.exists(key)
      return result === 1
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error)
      return false
    }
  }

  static async flush(): Promise<boolean> {
    if (!isRedisConnected) return false

    try {
      await redisClient.flushAll()
      return true
    } catch (error) {
      logger.error('Cache flush error:', error)
      return false
    }
  }
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await disconnectRedis()
})

export default redisClient