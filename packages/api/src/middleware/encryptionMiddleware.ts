import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { encryptionService } from '../services/AuditLogService'

/**
 * Encryption Middleware
 * 
 * Provides automatic encryption/decryption of sensitive fields in requests and responses
 * Validates: Requirements 18.1 - Data encryption and security
 */

// List of routes that handle sensitive data
const SENSITIVE_ROUTES = [
  '/api/v1/employees',
  '/api/v1/payroll',
  '/api/v1/benefits',
  '/api/v1/performance'
]

/**
 * Middleware to encrypt sensitive fields in response data
 */
export function encryptResponseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only apply to sensitive routes
  const isSensitiveRoute = SENSITIVE_ROUTES.some(route => 
    req.path.startsWith(route)
  )

  if (!isSensitiveRoute) {
    return next()
  }

  // Store original json method
  const originalJson = res.json.bind(res)

  // Override json method to encrypt sensitive fields
  res.json = function (data: any) {
    try {
      // Don't encrypt error responses
      if (data.error || data.message) {
        return originalJson(data)
      }

      // Encrypt sensitive fields in the response
      const encryptedData = encryptSensitiveFields(data)
      return originalJson(encryptedData)
    } catch (error) {
      logger.error('Error encrypting response data:', error)
      return originalJson(data)
    }
  }

  next()
}

/**
 * Middleware to decrypt sensitive fields in request data
 */
export function decryptRequestMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = decryptSensitiveFields(req.body)
    }
    next()
  } catch (error) {
    logger.error('Error decrypting request data:', error)
    res.status(400).json({
      error: 'Invalid encrypted data in request'
    })
  }
}

/**
 * Recursively encrypt sensitive fields in an object
 */
function encryptSensitiveFields(data: any): any {
  if (!data) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => encryptSensitiveFields(item))
  }

  if (typeof data === 'object') {
    const encrypted: any = {}
    
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveField(key) && typeof value === 'string' && value) {
        // Only encrypt if not already encrypted
        if (!encryptionService.isEncrypted(value)) {
          encrypted[key] = JSON.stringify(encryptionService.encrypt(value))
        } else {
          encrypted[key] = value
        }
      } else if (typeof value === 'object') {
        encrypted[key] = encryptSensitiveFields(value)
      } else {
        encrypted[key] = value
      }
    }
    
    return encrypted
  }

  return data
}

/**
 * Recursively decrypt sensitive fields in an object
 */
function decryptSensitiveFields(data: any): any {
  if (!data) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => decryptSensitiveFields(item))
  }

  if (typeof data === 'object') {
    const decrypted: any = {}
    
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveField(key) && typeof value === 'string' && value) {
        // Only decrypt if encrypted
        if (encryptionService.isEncrypted(value)) {
          try {
            const encryptedData = JSON.parse(value)
            decrypted[key] = encryptionService.decrypt(encryptedData)
          } catch (error) {
            logger.warn(`Failed to decrypt field ${key}:`, error)
            decrypted[key] = value
          }
        } else {
          decrypted[key] = value
        }
      } else if (typeof value === 'object') {
        decrypted[key] = decryptSensitiveFields(value)
      } else {
        decrypted[key] = value
      }
    }
    
    return decrypted
  }

  return data
}

/**
 * Check if a field name indicates sensitive data
 */
function isSensitiveField(fieldName: string): boolean {
  const sensitivePatterns = [
    'ssn',
    'taxid',
    'tax_id',
    'bankaccount',
    'bank_account',
    'routingnumber',
    'routing_number',
    'creditcard',
    'credit_card',
    'passport',
    'driverlicense',
    'driver_license',
    'salary',
    'compensation',
    'medicalinfo',
    'medical_info',
    'healthdata',
    'health_data'
  ]

  const normalizedField = fieldName.toLowerCase().replace(/[_-]/g, '')
  return sensitivePatterns.some(pattern => 
    normalizedField.includes(pattern.replace(/[_-]/g, ''))
  )
}

/**
 * Middleware to add security headers for data protection
 */
export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  
  // Add additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  
  // Strict Transport Security (only if using HTTPS)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  next()
}

/**
 * Middleware to log access to sensitive data
 */
export function sensitiveDataAccessLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isSensitiveRoute = SENSITIVE_ROUTES.some(route => 
    req.path.startsWith(route)
  )

  if (isSensitiveRoute) {
    logger.info('Sensitive data access', {
      userId: (req as any).user?.id,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    })
  }

  next()
}
