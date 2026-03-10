export interface WellnessProgram {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate?: string;
    isActive: boolean;
    _count?: {
        enrollments: number;
    };
}

export interface WellnessEnrollment {
    id: string;
    employeeId: string;
    programId: string;
    enrolledAt: string;
    points: number;
    status: string;
    program?: WellnessProgram;
}
