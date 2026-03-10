export interface Permission {
    id: string; // The permission slug (e.g., 'read_employee')
    name: string;
    description: string;
    category?: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[]; // List of permission slugs
    userCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateRoleRequest {
    name: string;
    description?: string;
    permissions: string[];
}

export interface UpdateRoleRequest {
    name?: string;
    description?: string;
    permissions?: string[];
}

export interface AssignRoleRequest {
    userId: string;
    roleId: string;
}

export type PermissionCategory = 'users' | 'employees' | 'roles' | 'reports' | 'recruitment' | 'attendance' | 'leave' | 'payroll' | 'performance' | 'benefits' | 'learning' | 'talent' | 'workforce' | 'documents' | 'compliance' | 'wellness' | 'onboarding' | 'offboarding' | 'departments' | 'system' | 'other';
