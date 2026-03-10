export interface TrainingCourse {
    id: string;
    title: string;
    description: string;
    type: string; // online, instructor_led
    duration: number; // minutes
    provider: string;
    isActive: boolean;
}

export interface TrainingRecord {
    id: string;
    employeeId: string;
    trainingCourseId: string;
    enrollmentDate: string;
    completionDate?: string;
    score?: number;
    status: 'enrolled' | 'in_progress' | 'completed';
    certificateUrl?: string;
    trainingCourse?: TrainingCourse;
}
