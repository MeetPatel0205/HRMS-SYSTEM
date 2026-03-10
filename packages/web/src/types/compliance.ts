export interface ComplianceRequirement {
    id: string;
    name: string;
    description: string;
    dueDate: string;
    frequency: string;
    status: string;
    _count?: {
        records: number;
    };
}

export interface EmployeeCompliance {
    id: string;
    employeeId: string;
    requirementId: string;
    status: 'pending' | 'compliant' | 'non_compliant' | 'expired';
    completedAt?: string;
    expiresAt?: string;
    documentUrl?: string;
    complianceRequirement?: ComplianceRequirement;
}

export interface ComplianceStats {
    total: number;
    compliant: number;
    pending: number;
    expired: number;
    rate: number;
}
