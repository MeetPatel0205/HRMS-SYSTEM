import { Request, Response, NextFunction } from 'express'
import { HTTP_STATUS, ERROR_CODES } from '../shared/constants'

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID()
  
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      message: `Route ${req.method} ${req.originalUrl} not found`,
      timestamp: new Date().toISOString(),
      requestId
    }
  })
}