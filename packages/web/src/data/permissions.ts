import { Permission } from '../types/role';

export const SYSTEM_PERMISSIONS: Permission[] = [
    // User Management
    { id: 'read_user', name: 'View Users', description: 'Can view user list', category: 'users' },
    { id: 'write_user', name: 'Manage Users', description: 'Can create and edit users', category: 'users' },
    { id: 'delete_user', name: 'Delete Users', description: 'Can delete users', category: 'users' },

    // Role Management
    { id: 'read_role', name: 'View Roles', description: 'Can view roles', category: 'roles' },
    { id: 'write_role', name: 'Manage Roles', description: 'Can create and edit roles', category: 'roles' },
    { id: 'delete_role', name: 'Delete Roles', description: 'Can delete roles', category: 'roles' },

    // Employee Management
    { id: 'read_employee', name: 'View Employees', description: 'Can view employee profiles', category: 'employees' },
    { id: 'write_employee', name: 'Manage Employees', description: 'Can create and edit employees', category: 'employees' },
    { id: 'delete_employee', name: 'Delete Employees', description: 'Can delete employees', category: 'employees' },

    // Recruitment
    { id: 'read_recruitment', name: 'View Recruitment', description: 'Can view job postings and candidates', category: 'recruitment' },
    { id: 'write_recruitment', name: 'Manage Recruitment', description: 'Can create/edit job postings and manage candidates', category: 'recruitment' },
    { id: 'delete_recruitment', name: 'Delete Recruitment', description: 'Can delete job postings and candidate records', category: 'recruitment' },

    // Time & Attendance
    { id: 'read_time_attendance', name: 'View Time & Attendance', description: 'Can view attendance and timesheets', category: 'attendance' },
    { id: 'write_time_attendance', name: 'Manage Time & Attendance', description: 'Can manage attendance records', category: 'attendance' },
    { id: 'approve_timesheet', name: 'Approve Timesheets', description: 'Can approve/reject timesheets', category: 'attendance' },

    // Leave
    { id: 'read_leave', name: 'View Leave Requests', description: 'Can view leave requests', category: 'leave' },
    { id: 'write_leave', name: 'Manage Leave Requests', description: 'Can create/edit leave requests', category: 'leave' },
    { id: 'approve_leave', name: 'Approve Leave', description: 'Can approve/reject leave requests', category: 'leave' },

    // Payroll
    { id: 'read_payroll', name: 'View Payroll', description: 'Can view payroll information', category: 'payroll' },
    { id: 'write_payroll', name: 'Manage Payroll', description: 'Can create and edit payroll records', category: 'payroll' },
    { id: 'process_payroll', name: 'Process Payroll', description: 'Can run and process payroll', category: 'payroll' },

    // Performance
    { id: 'read_performance', name: 'View Performance', description: 'Can view performance reviews', category: 'performance' },
    { id: 'write_performance', name: 'Manage Performance', description: 'Can create and manage performance reviews', category: 'performance' },
    { id: 'read_own_performance', name: 'View Own Performance', description: 'Can view own performance reviews', category: 'performance' },

    // Benefits
    { id: 'read_benefits', name: 'View Benefits', description: 'Can view benefits information', category: 'benefits' },
    { id: 'write_benefits', name: 'Manage Benefits', description: 'Can manage benefits programs', category: 'benefits' },

    // Learning & Development
    { id: 'read_learning', name: 'View Learning', description: 'Can view training courses and programs', category: 'learning' },
    { id: 'write_learning', name: 'Manage Learning', description: 'Can create and manage training programs', category: 'learning' },

    // Talent Management
    { id: 'read_talent', name: 'View Talent', description: 'Can view talent management data', category: 'talent' },
    { id: 'write_talent', name: 'Manage Talent', description: 'Can manage talent programs and succession planning', category: 'talent' },

    // Workforce Planning
    { id: 'read_workforce', name: 'View Workforce', description: 'Can view workforce analytics and planning', category: 'workforce' },
    { id: 'write_workforce', name: 'Manage Workforce', description: 'Can manage workforce planning data', category: 'workforce' },

    // Analytics & Reports
    { id: 'read_analytics', name: 'View Analytics', description: 'Can view analytics dashboards', category: 'reports' },
    { id: 'write_analytics', name: 'Manage Analytics', description: 'Can create custom analytics and dashboards', category: 'reports' },
    { id: 'read_report', name: 'View Reports', description: 'Can view system reports', category: 'reports' },
    { id: 'write_report', name: 'Create Reports', description: 'Can generate reports', category: 'reports' },

    // Documents
    { id: 'read_documents', name: 'View Documents', description: 'Can view documents', category: 'documents' },
    { id: 'write_documents', name: 'Manage Documents', description: 'Can upload and manage documents', category: 'documents' },

    // Compliance
    { id: 'read_compliance', name: 'View Compliance', description: 'Can view compliance records', category: 'compliance' },
    { id: 'write_compliance', name: 'Manage Compliance', description: 'Can manage compliance policies and records', category: 'compliance' },

    // Wellness
    { id: 'read_wellness', name: 'View Wellness', description: 'Can view wellness programs', category: 'wellness' },
    { id: 'write_wellness', name: 'Manage Wellness', description: 'Can manage wellness programs and data', category: 'wellness' },

    // Onboarding & Offboarding
    { id: 'read_onboarding', name: 'View Onboarding', description: 'Can view onboarding tasks and checklists', category: 'onboarding' },
    { id: 'write_onboarding', name: 'Manage Onboarding', description: 'Can manage onboarding processes', category: 'onboarding' },
    { id: 'read_offboarding', name: 'View Offboarding', description: 'Can view offboarding tasks', category: 'offboarding' },
    { id: 'write_offboarding', name: 'Manage Offboarding', description: 'Can manage offboarding processes', category: 'offboarding' },

    // Department Management
    { id: 'read_department', name: 'View Departments', description: 'Can view departments', category: 'departments' },
    { id: 'write_department', name: 'Manage Departments', description: 'Can manage departments', category: 'departments' },

    // System
    { id: 'system_admin', name: 'System Administrator', description: 'Full system access', category: 'system' },
    { id: 'audit_log', name: 'View Audit Logs', description: 'Can view system audit logs', category: 'system' },
    { id: 'audit_logs', name: 'Access Audit Logs', description: 'Can access audit log system', category: 'system' },
];

export const getPermissionName = (slug: string): string => {
    const perm = SYSTEM_PERMISSIONS.find(p => p.id === slug);
    return perm ? perm.name : slug;
};
