export interface OnboardingTask {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'completed';
    completedAt?: string;
}

export interface OnboardingChecklist {
    id: string;
    employeeId: string;
    tasks: OnboardingTask[]; // Received as JSON from backend, parsed to array
    status: 'in_progress' | 'completed';
    startDate: string;
    dueDate: string;
    completedAt?: string;
    createdAt: string;
    employee?: {
        firstName: string;
        lastName: string;
        department: string;
        email: string;
    };
}
