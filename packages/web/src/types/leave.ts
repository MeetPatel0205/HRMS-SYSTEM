export interface LeaveType {
    id: string;
    name: string;
    description?: string;
    maxDays?: number;
    carryOver: boolean;
    isActive: boolean;
}

export interface LeaveBalance {
    leaveType: LeaveType;
    year: number;
    totalDays: number;
    usedDays: number;
    remainingDays: number;
}

export interface LeaveRequest {
    id: string;
    employeeId: string;
    employee?: {
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
    };
    leaveTypeId: string;
    leaveType: LeaveType; // Include related type
    startDate: string; // ISO Date
    endDate: string; // ISO Date
    totalDays: number;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    submittedAt: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectionReason?: string;
}

export interface CreateLeaveRequest {
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
}
