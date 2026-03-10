export interface BenefitPlan {
    id: string;
    name: string;
    description: string;
    type: string; // health, dental, vision, retirement
    provider: string;
    cost: {
        employee: number;
        employer: number;
        frequency: string; // monthly, per_pay_period
    };
    isActive: boolean;
    createdAt: string;
}

export interface BenefitEnrollment {
    id: string;
    employeeId: string;
    benefitPlanId: string;
    enrollmentDate: string;
    effectiveDate: string;
    endDate?: string;
    status: 'active' | 'terminated';
    elections: any; // specific choices (e.g., coverage level)
    benefitPlan?: BenefitPlan;
}
