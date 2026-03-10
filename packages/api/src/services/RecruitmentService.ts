import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

export class RecruitmentService {
    // Job Postings
    async createJobPosting(data: {
        title: string;
        department: string;
        location: string;
        description: string;
        requirements: any;
        salaryRange?: any;
    }) {
        return prisma.jobPosting.create({
            data: {
                ...data,
                status: 'draft'
            }
        });
    }

    async updateJobPosting(id: string, data: any) {
        const posting = await prisma.jobPosting.findUnique({ where: { id } });
        if (!posting) throw new NotFoundError('Job posting not found');

        return prisma.jobPosting.update({
            where: { id },
            data
        });
    }

    async publishJobPosting(id: string) {
        return this.updateJobPosting(id, {
            status: 'published',
            publishedAt: new Date()
        });
    }

    async closeJobPosting(id: string) {
        return this.updateJobPosting(id, {
            status: 'closed',
            closedAt: new Date()
        });
    }

    async getJobPostings(filter: { status?: string; department?: string } = {}) {
        return prisma.jobPosting.findMany({
            where: filter,
            orderBy: { createdAt: 'desc' }
        });
    }

    async getJobPosting(id: string) {
        const posting = await prisma.jobPosting.findUnique({
            where: { id },
            include: {
                applications: true
            }
        });
        if (!posting) throw new NotFoundError('Job posting not found');
        return posting;
    }

    // Applications
    async submitApplication(data: {
        jobPostingId: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        resumeUrl: string;
    }) {
        const job = await prisma.jobPosting.findUnique({ where: { id: data.jobPostingId } });
        if (!job) throw new NotFoundError('Job posting not found');
        if (job.status !== 'published') throw new ValidationError('Job posting is not accepting applications');

        return prisma.application.create({
            data
        });
    }

    async getApplications(jobPostingId?: string) {
        const where = jobPostingId ? { jobPostingId } : {};
        return prisma.application.findMany({
            where,
            include: {
                jobPosting: {
                    select: { title: true, department: true }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });
    }

    async updateApplicationStatus(id: string, status: string, feedback?: string) {
        const app = await prisma.application.findUnique({ where: { id } });
        if (!app) throw new NotFoundError('Application not found');

        return prisma.application.update({
            where: { id },
            data: { status, feedback }
        });
    }

    // Interviews
    async scheduleInterview(data: {
        applicationId: string;
        scheduledAt: Date;
        interviewerId?: string;
    }) {
        const app = await prisma.application.findUnique({ where: { id: data.applicationId } });
        if (!app) throw new NotFoundError('Application not found');

        return prisma.interview.create({
            data: {
                ...data,
                status: 'scheduled'
            }
        });
    }
}
