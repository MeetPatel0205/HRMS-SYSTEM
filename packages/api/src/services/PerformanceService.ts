import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

interface Goal {
    id: string;
    description: string;
    weight: number;
    rating?: number;
    comment?: string;
}

interface Competency {
    id: string;
    name: string;
    description: string;
    rating?: number;
    comment?: string;
}

interface ReviewFeedback {
    strengths: string;
    improvements: string;
    additionalComments?: string;
}

export class PerformanceService {
    async createReview(data: {
        employeeId: string;
        reviewerId: string;
        reviewPeriodStart: Date;
        reviewPeriodEnd: Date;
        reviewType: string;
        template?: string;
    }): Promise<any> {
        // Validate employee and reviewer exist
        const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
        if (!employee) throw new NotFoundError('Employee not found');

        const reviewer = await prisma.employee.findUnique({ where: { id: data.reviewerId } });
        if (!reviewer) throw new NotFoundError('Reviewer not found');

        // Check for existing review in this period? 
        // Optional: strict check to prevent duplicates

        return prisma.performanceReview.create({
            data: {
                ...data,
                status: 'draft',
                goals: [], // Initialize empty
                competencies: [], // Initialize empty
                feedback: { strengths: '', improvements: '' },
                peerFeedback: []
            }
        });
    }

    async getReview(id: string): Promise<any> {
        const review = await prisma.performanceReview.findUnique({
            where: { id },
            include: {
                employee: { select: { firstName: true, lastName: true, jobTitle: true } },
                reviewer: { select: { firstName: true, lastName: true } }
            }
        });
        if (!review) throw new NotFoundError('Review not found');
        return review;
    }

    async getEmployeeReviews(employeeId: string): Promise<any[]> {
        return prisma.performanceReview.findMany({
            where: { employeeId },
            orderBy: { reviewPeriodStart: 'desc' },
            include: {
                reviewer: { select: { firstName: true, lastName: true } }
            }
        });
    }

    async getReviewsToConduct(reviewerId: string): Promise<any[]> {
        return prisma.performanceReview.findMany({
            where: { reviewerId },
            orderBy: { reviewPeriodStart: 'desc' },
            include: {
                employee: { select: { firstName: true, lastName: true, jobTitle: true } }
            }
        });
    }

    async updateReviewContent(id: string, updates: {
        goals?: Goal[];
        competencies?: Competency[];
        feedback?: ReviewFeedback;
        selfAssessment?: any;
    }): Promise<any> {
        const review = await prisma.performanceReview.findUnique({ where: { id } });
        if (!review) throw new NotFoundError('Review not found');

        if (review.status === 'approved') {
            throw new ValidationError('Cannot update an approved review');
        }

        return prisma.performanceReview.update({
            where: { id },
            data: {
                ...updates,
                goals: updates.goals as any,
                competencies: updates.competencies as any,
                feedback: updates.feedback as any,
                selfAssessment: updates.selfAssessment as any,
                updatedAt: new Date()
            }
        });
    }

    async submitReview(id: string): Promise<any> {
        const review = await prisma.performanceReview.findUnique({ where: { id } });
        if (!review) throw new NotFoundError('Review not found');

        return prisma.performanceReview.update({
            where: { id },
            data: {
                status: 'submitted',
                submittedAt: new Date()
            }
        });
    }

    async approveReview(id: string, overallRating: number): Promise<any> {
        const review = await prisma.performanceReview.findUnique({ where: { id } });
        if (!review) throw new NotFoundError('Review not found');

        return prisma.performanceReview.update({
            where: { id },
            data: {
                status: 'approved',
                overallRating,
                approvedAt: new Date()
            }
        });
    }
}
