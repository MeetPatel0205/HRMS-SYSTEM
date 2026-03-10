import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../utils/logger'
import { HTTP_STATUS, ERROR_CODES } from '../shared/constants'

export interface AppError extends Error {
  statusCode?: number
  code?: string
  isOperational?: boolean
}

export class CustomError extends Error implements AppError {
  statusCode: number
  code: string
  isOperational: boolean

  constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, code: string = ERROR_CODES.INTERNAL_ERROR) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    
    Error.captureStackTrace(this, this.constructor)
  }
}

export function errorHandler(
  error: AppError | ZodError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR
  let code: string = ERROR_CODES.INTERNAL_ERROR
  let message = 'Internal server error'
  let details: any = undefined

  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID()

  // Handle different error types
  if (error instanceof CustomError) {
    statusCode = error.statusCode
    code = error.code
    message = error.message
  } else if (error instanceof ZodError) {
    statusCode = HTTP_STATUS.BAD_REQUEST
    code = ERROR_CODES.VALIDATION_ERROR
    message = 'Validation failed'
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  } else if (error instanceof Error && error.name === 'PrismaClientKnownRequestError') {
    statusCode = HTTP_STATUS.BAD_REQUEST
    const prismaError = error as any
    
    switch (prismaError.code) {
      case 'P2002':
        code = ERROR_CODES.RESOURCE_ALREADY_EXISTS
        message = 'Resource already exists'
        details = { field: prismaError.meta?.target }
        break
      case 'P2025':
        statusCode = HTTP_STATUS.NOT_FOUND
        code = ERROR_CODES.RESOURCE_NOT_FOUND
        message = 'Resource not found'
        break
      case 'P2003':
        code = ERROR_CODES.RESOURCE_CONFLICT
        message = 'Foreign key constraint failed'
        break
      default:
        code = ERROR_CODES.DATABASE_ERROR
        message = 'Database operation failed'
    }
  } else if (error instanceof Error && error.name === 'PrismaClientValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST
    code = ERROR_CODES.VALIDATION_ERROR
    message = 'Invalid data provided'
  } else if (error instanceof Error && error.name === 'PrismaClientUnknownRequestError') {
    code = ERROR_CODES.DATABASE_ERROR
    message = 'Database error occurred'
  }

  // Log error details
  logger.error('Error occurred:', {
    requestId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code,
      statusCode
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    }
  })

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId
    }
  })
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Create specific error types
export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.INSUFFICIENT_PERMISSIONS)
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict') {
    super(message, HTTP_STATUS.CONFLICT, ERROR_CODES.RESOURCE_CONFLICT)
    this.name = 'ConflictError'
  }
}