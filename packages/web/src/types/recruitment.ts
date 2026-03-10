export interface JobPosting {
    id: string;
    title: string;
    department: string;
    location: string;
    description: string;
    requirements: any; // JSON
    salaryRange?: { min: number; max: number; currency: string };
    status: 'draft' | 'published' | 'closed';
    createdAt: string;
    publishedAt?: string;
    closedAt?: string;
    applications?: Application[];
}

export interface Application {
    id: string;
    jobPostingId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    resumeUrl: string;
    status: 'submitted' | 'under_review' | 'interview_scheduled' | 'offer_extended' | 'hired' | 'rejected';
    score?: number;
    feedback?: string;
    submittedAt: string;
    jobPosting?: {
        title: string;
        department: string;
    };
}

export interface Interview {
    id: string;
    applicationId: string;
    interviewerId?: string;
    scheduledAt: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    feedbackUrl?: string;
    rating?: number;
    notes?: string;
}
