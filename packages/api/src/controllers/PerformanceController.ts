import { Request, Response } from 'express';
import { PerformanceService } from '../services/PerformanceService';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';

const performanceService = new PerformanceService();

export class PerformanceController {
    async createReview(req: Request, res: Response) {
        const result = await performanceService.createReview({
            ...req.body,
            reviewPeriodStart: new Date(req.body.reviewPeriodStart),
            reviewPeriodEnd: new Date(req.body.reviewPeriodEnd)
        });
        res.status(201).json({ success: true, data: result });
    }

    async getReview(req: Request, res: Response) {
        const { id } = req.params;
        const result = await performanceService.getReview(id);
        res.json({ success: true, data: result });
    }

    async getMyReviews(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee profile not found');

        const result = await performanceService.getEmployeeReviews(employee.id);
        res.json({ success: true, data: result });
    }

    async getReviewsToConduct(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee profile not found');

        const result = await performanceService.getReviewsToConduct(employee.id);
        res.json({ success: true, data: result });
    }

    async updateReview(req: Request, res: Response) {
        const { id } = req.params;
        const result = await performanceService.updateReviewContent(id, req.body);
        res.json({ success: true, data: result });
    }

    async submitReview(req: Request, res: Response) {
        const { id } = req.params;
        const result = await performanceService.submitReview(id);
        res.json({ success: true, data: result });
    }

    async approveReview(req: Request, res: Response) {
        const { id } = req.params;
        const { rating } = req.body;
        const result = await performanceService.approveReview(id, rating);
        res.json({ success: true, data: result });
    }
}
