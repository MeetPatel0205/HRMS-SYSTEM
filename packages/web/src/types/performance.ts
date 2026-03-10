export interface Goal {
    id: string;
    description: string;
    weight: number;
    rating?: number;
    comment?: string;
}

export interface Competency {
    id: string;
    name: string;
    description: string;
    rating?: number;
    comment?: string;
}

export interface ReviewFeedback {
    strengths: string;
    improvements: string;
    additionalComments?: string;
}

export interface PerformanceReview {
    id: string;
    employeeId: string;
    reviewerId: string;
    reviewPeriodStart: string;
    reviewPeriodEnd: string;
    reviewType: string;
    status: 'draft' | 'submitted' | 'approved';
    goals: Goal[];
    competencies: Competency[];
    overallRating?: number;
    feedback: ReviewFeedback;
    selfAssessment?: any;
    peerFeedback?: any[];
    submittedAt?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
    employee?: {
        firstName: string;
        lastName: string;
        jobTitle: string;
    };
    reviewer?: {
        firstName: string;
        lastName: string;
    };
}
