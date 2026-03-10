export interface SuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  timestamp: string
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    timestamp: string
    requestId?: string
  }
}

export function createSuccessResponse<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  requestId?: string
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId
    }
  }
}

// Helper functions for Express responses
import { Response } from 'express'

export function successResponse<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json(createSuccessResponse(data, message))
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode: number = 400,
  code?: string,
  details?: any
): Response {
  return res.status(statusCode).json(createErrorResponse(
    code || `ERROR_${statusCode}`,
    message,
    details
  ))
}
