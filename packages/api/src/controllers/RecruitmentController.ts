import { Request, Response } from 'express';
import { RecruitmentService } from '../services/RecruitmentService';

const service = new RecruitmentService();

export class RecruitmentController {
    // Jobs
    async createJob(req: Request, res: Response) {
        const result = await service.createJobPosting(req.body);
        res.status(201).json({ success: true, data: result });
    }

    async updateJob(req: Request, res: Response) {
        const result = await service.updateJobPosting(req.params.id, req.body);
        res.json({ success: true, data: result });
    }

    async publishJob(req: Request, res: Response) {
        const result = await service.publishJobPosting(req.params.id);
        res.json({ success: true, data: result });
    }

    async closeJob(req: Request, res: Response) {
        const result = await service.closeJobPosting(req.params.id);
        res.json({ success: true, data: result });
    }

    async getJobs(req: Request, res: Response) {
        const { status, department } = req.query;
        const result = await service.getJobPostings({
            status: status as string,
            department: department as string
        });
        res.json({ success: true, data: result });
    }

    async getJob(req: Request, res: Response) {
        const result = await service.getJobPosting(req.params.id);
        res.json({ success: true, data: result });
    }

    // Applications
    async apply(req: Request, res: Response) {
        const result = await service.submitApplication(req.body);
        res.status(201).json({ success: true, data: result });
    }

    async getApplications(req: Request, res: Response) {
        const { jobId } = req.query;
        const result = await service.getApplications(jobId as string);
        res.json({ success: true, data: result });
    }

    async updateApplicationStatus(req: Request, res: Response) {
        const { status, feedback } = req.body;
        const result = await service.updateApplicationStatus(req.params.id, status, feedback);
        res.json({ success: true, data: result });
    }

    // Interviews
    async scheduleInterview(req: Request, res: Response) {
        const result = await service.scheduleInterview({
            ...req.body,
            scheduledAt: new Date(req.body.scheduledAt)
        });
        res.status(201).json({ success: true, data: result });
    }
}
