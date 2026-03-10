import { z } from 'zod'

// Enums
export enum UserRole {
  ADMIN = 'admin',
  HR_MANAGER = 'hr_manager',
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}

export enum Permission {
  // User permissions
  READ_USER = 'read_user',
  WRITE_USER = 'write_user',
  DELETE_USER = 'delete_user',

  // Role permissions
  READ_ROLE = 'read_role',
  WRITE_ROLE = 'write_role',
  DELETE_ROLE = 'delete_role',

  // Employee permissions
  READ_EMPLOYEE = 'read_employee',
  WRITE_EMPLOYEE = 'write_employee',
  DELETE_EMPLOYEE = 'delete_employee',

  // Recruitment permissions
  READ_RECRUITMENT = 'read_recruitment',
  WRITE_RECRUITMENT = 'write_recruitment',
  DELETE_RECRUITMENT = 'delete_recruitment',

  // Time & Attendance permissions
  READ_TIME_ATTENDANCE = 'read_time_attendance',
  WRITE_TIME_ATTENDANCE = 'write_time_attendance',
  APPROVE_TIMESHEET = 'approve_timesheet',

  // Leave permissions
  READ_LEAVE = 'read_leave',
  WRITE_LEAVE = 'write_leave',
  APPROVE_LEAVE = 'approve_leave',

  // Payroll permissions
  READ_PAYROLL = 'read_payroll',
  WRITE_PAYROLL = 'write_payroll',
  PROCESS_PAYROLL = 'process_payroll',

  // Performance permissions
  READ_PERFORMANCE = 'read_performance',
  WRITE_PERFORMANCE = 'write_performance',
  READ_OWN_PERFORMANCE = 'read_own_performance',

  // Benefits permissions
  READ_BENEFITS = 'read_benefits',
  WRITE_BENEFITS = 'write_benefits',

  // Learning permissions
  READ_LEARNING = 'read_learning',
  WRITE_LEARNING = 'write_learning',

  // Wellness
  READ_WELLNESS = 'read_wellness',
  WRITE_WELLNESS = 'write_wellness',

  // Talent permissions
  READ_TALENT = 'read_talent',
  WRITE_TALENT = 'write_talent',

  // Workforce permissions
  READ_WORKFORCE = 'read_workforce',
  WRITE_WORKFORCE = 'write_workforce',

  // Analytics permissions
  READ_ANALYTICS = 'read_analytics',
  WRITE_ANALYTICS = 'write_analytics',

  // Document permissions
  READ_DOCUMENTS = 'read_documents',
  WRITE_DOCUMENTS = 'write_documents',

  // Offboarding
  READ_OFFBOARDING = 'read_offboarding',
  WRITE_OFFBOARDING = 'write_offboarding',

  // Onboarding permissions
  READ_ONBOARDING = 'read_onboarding',
  WRITE_ONBOARDING = 'write_onboarding',

  // Department permissions
  READ_DEPARTMENT = 'read_department',
  WRITE_DEPARTMENT = 'write_department',

  // Report permissions
  READ_REPORT = 'read_report',
  WRITE_REPORT = 'write_report',

  // Compliance permissions
  READ_COMPLIANCE = 'read_compliance',
  WRITE_COMPLIANCE = 'write_compliance',

  // System permissions
  SYSTEM_ADMIN = 'system_admin',
  AUDIT_LOG = 'audit_log',
  AUDIT_LOGS = 'audit_logs'
}

// Zod Schemas
export const LoginCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  mfaCode: z.string().optional()
})

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  roles: z.array(z.nativeEnum(UserRole)),
  permissions: z.array(z.nativeEnum(Permission)),
  employeeId: z.string().uuid().optional(),
  isActive: z.boolean(),
  lastLogin: z.date().optional(),
  mfaEnabled: z.boolean().default(false)
})

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.string().default('Bearer')
})

export const AuthResultSchema = z.object({
  success: z.boolean(),
  token: z.string().optional(),
  refreshToken: z.string().optional(),
  user: UserProfileSchema.optional(),
  requiresMFA: z.boolean().optional(),
  message: z.string().optional()
})

// TypeScript Types
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>
export type UserProfile = z.infer<typeof UserProfileSchema>
export type TokenPair = z.infer<typeof TokenPairSchema>
export type AuthResult = z.infer<typeof AuthResultSchema>

// Role-Permission Mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.HR_MANAGER]: [
    Permission.READ_EMPLOYEE,
    Permission.WRITE_EMPLOYEE,
    Permission.READ_RECRUITMENT,
    Permission.WRITE_RECRUITMENT,
    Permission.READ_TIME_ATTENDANCE,
    Permission.WRITE_TIME_ATTENDANCE,
    Permission.APPROVE_TIMESHEET,
    Permission.READ_LEAVE,
    Permission.WRITE_LEAVE,
    Permission.APPROVE_LEAVE,
    Permission.READ_PAYROLL,
    Permission.WRITE_PAYROLL,
    Permission.PROCESS_PAYROLL,
    Permission.READ_PERFORMANCE,
    Permission.WRITE_PERFORMANCE,
    Permission.READ_OWN_PERFORMANCE,
    Permission.READ_BENEFITS,
    Permission.WRITE_BENEFITS,
    Permission.READ_LEARNING,
    Permission.WRITE_LEARNING,
    Permission.READ_TALENT,
    Permission.WRITE_TALENT,
    Permission.READ_WORKFORCE,
    Permission.WRITE_WORKFORCE,
    Permission.READ_ANALYTICS,
    Permission.READ_DOCUMENTS,
    Permission.WRITE_DOCUMENTS,
    Permission.READ_COMPLIANCE,
    Permission.WRITE_COMPLIANCE,
    Permission.READ_WELLNESS,
    Permission.WRITE_WELLNESS,
    Permission.AUDIT_LOGS
  ],
  [UserRole.MANAGER]: [
    Permission.READ_EMPLOYEE,
    Permission.READ_TIME_ATTENDANCE,
    Permission.APPROVE_TIMESHEET,
    Permission.READ_LEAVE,
    Permission.APPROVE_LEAVE,
    Permission.READ_PERFORMANCE,
    Permission.WRITE_PERFORMANCE,
    Permission.READ_OWN_PERFORMANCE,
    Permission.READ_WORKFORCE,
    Permission.WRITE_WORKFORCE,
    Permission.READ_ANALYTICS,
    Permission.READ_DOCUMENTS,
    Permission.READ_WELLNESS
  ],
  [UserRole.EMPLOYEE]: [
    Permission.READ_EMPLOYEE, // Own profile only
    Permission.READ_TIME_ATTENDANCE, // Own records only
    Permission.WRITE_TIME_ATTENDANCE, // Own records only
    Permission.READ_LEAVE, // Own records only
    Permission.WRITE_LEAVE, // Own requests only
    Permission.READ_PERFORMANCE, // Own records only
    Permission.READ_OWN_PERFORMANCE, // Own performance only
    Permission.READ_BENEFITS, // Own benefits only
    Permission.READ_LEARNING,
    Permission.READ_DOCUMENTS,
    Permission.READ_WELLNESS,
    Permission.WRITE_WELLNESS,
    Permission.READ_RECRUITMENT // View internal job board
  ]
}