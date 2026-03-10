import { Request, Response } from 'express';
import { LearningService } from '../services/LearningService';

const service = new LearningService();

export class LearningController {
    // Courses
    async createCourse(req: Request, res: Response) {
        const result = await service.createCourse(req.body);
        res.status(201).json({ success: true, data: result });
    }

    async updateCourse(req: Request, res: Response) {
        const result = await service.updateCourse(req.params.id, req.body);
        res.json({ success: true, data: result });
    }

    async getCourses(req: Request, res: Response) {
        const activeOnly = req.query.active !== 'false';
        const result = await service.getCourses(activeOnly);
        res.json({ success: true, data: result });
    }

    async getCourse(req: Request, res: Response) {
        const result = await service.getCourse(req.params.id);
        res.json({ success: true, data: result });
    }

    async checkEnroll(req: Request, res: Response) {
        // ... (not implementing checkEnroll separately, assuming enroll handles it)
        // Oops, I was fixing enroll method return
    }

    // Records
    async enroll(req: Request, res: Response) {
        const { courseId } = req.body;
        // @ts-ignore
        const employeeId = req.user.employeeId;
        if (!employeeId) {
            res.status(400).json({ message: 'Employee not found' });
            return;
        }

        const result = await service.enroll(employeeId, courseId);
        res.status(201).json({ success: true, data: result });
    }

    async getMyRecords(req: Request, res: Response) {
        // @ts-ignore
        const employeeId = req.user.employeeId;
        if (!employeeId) {
            res.status(400).json({ message: 'Employee not found' });
            return;
        }

        const result = await service.getEmployeeRecords(employeeId);
        res.json({ success: true, data: result });
    }

    async updateProgress(req: Request, res: Response) {
        const { id } = req.params; // recordId
        const { status, score } = req.body;
        const result = await service.updateProgress(id, status, score);
        res.json({ success: true, data: result });
    }
}
