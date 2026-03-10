export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  employeeId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface MFAToken {
  sessionId: string;
  token: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  mfaRequired?: boolean;
}

export enum Permission {
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

  // Benefits permissions
  READ_BENEFITS = 'read_benefits',
  WRITE_BENEFITS = 'write_benefits',

  // Learning permissions
  READ_LEARNING = 'read_learning',
  WRITE_LEARNING = 'write_learning',

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

  // Compliance permissions
  READ_COMPLIANCE = 'read_compliance',
  WRITE_COMPLIANCE = 'write_compliance',

  // Wellness permissions
  READ_WELLNESS = 'read_wellness',
  WRITE_WELLNESS = 'write_wellness',

  // System permissions
  SYSTEM_ADMIN = 'system_admin',
  AUDIT_LOGS = 'audit_logs'
}
