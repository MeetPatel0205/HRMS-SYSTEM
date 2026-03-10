export interface ExitRequest {
    id: string;
    employeeId: string;
    type: 'resignation' | 'termination';
    reason: string;
    lastWorkingDate: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    comments?: string;
    employee?: {
        firstName: string;
        lastName: string;
        department?: { name: string };
        designation?: string;
    };
    assets?: AssetReturn[];
    interview?: ExitInterview;
}

export interface AssetReturn {
    id: string;
    exitRequestId: string;
    assetName: string;
    assetId?: string;
    status: 'pending' | 'returned' | 'lost' | 'damaged';
    returnedAt?: string;
    notes?: string;
}

export interface ExitInterview {
    id: string;
    exitRequestId: string;
    conductedBy?: string;
    scheduledAt?: string;
    completedAt?: string;
    status: 'scheduled' | 'completed' | 'pending';
    notes?: string;
    responses?: any;
}
