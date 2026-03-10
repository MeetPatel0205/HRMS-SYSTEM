import { z } from 'zod'

// Common validation schemas
export const UUIDSchema = z.string().uuid()
export const EmailSchema = z.string().email()
export const PhoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// Date range schema
export const DateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date()
}).refine(data => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
})

// API Response schemas
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional()
})

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
    timestamp: z.date(),
    requestId: z.string()
  })
})

export const ApiResponseSchema = z.union([SuccessResponseSchema, ErrorResponseSchema])

// TypeScript types
export type Pagination = z.infer<typeof PaginationSchema>
export type DateRange = z.infer<typeof DateRangeSchema>
export type SuccessResponse<T = any> = {
  success: true
  data: T
  message?: string
}
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

// Validation helper functions
export function validateUUID(value: string): boolean {
  return UUIDSchema.safeParse(value).success
}

export function validateEmail(value: string): boolean {
  return EmailSchema.safeParse(value).success
}

export function validatePassword(value: string): boolean {
  return PasswordSchema.safeParse(value).success
}

export function createSuccessResponse<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    message
  }
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, any>,
  requestId?: string
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date(),
      requestId: requestId || crypto.randomUUID()
    }
  }
}