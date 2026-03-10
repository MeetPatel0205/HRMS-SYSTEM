import { Request, Response } from 'express';
import { WellnessService } from '../services/WellnessService';

const service = new WellnessService();

export class WellnessController {
    // Programs
    async createProgram(req: Request, res: Response) {
        const result = await service.createProgram({
            ...req.body,
            startDate: new Date(req.body.startDate),
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
        });
        res.status(201).json({ success: true, data: result });
    }

    async updateProgram(req: Request, res: Response) {
        const result = await service.updateProgram(req.params.id, req.body);
        res.json({ success: true, data: result });
    }

    async getPrograms(req: Request, res: Response) {
        const activeOnly = req.query.active !== 'false';
        const result = await service.getPrograms(activeOnly);
        res.json({ success: true, data: result });
    }

    async getProgram(req: Request, res: Response) {
        const result = await service.getProgram(req.params.id);
        res.json({ success: true, data: result });
    }

    // Enrollments
    async enroll(req: Request, res: Response) {
        const { programId } = req.body;
        // @ts-ignore
        const employeeId = req.user.employeeId;
        if (!employeeId) {
            res.status(400).json({ message: 'Employee not found' });
            return;
        }

        const result = await service.enroll(employeeId, programId);
        res.status(201).json({ success: true, data: result });
    }

    async getMyEnrollments(req: Request, res: Response) {
        // @ts-ignore
        const employeeId = req.user.employeeId;
        if (!employeeId) {
            res.status(400).json({ message: 'Employee not found' });
            return;
        }

        const result = await service.getEmployeeEnrollments(employeeId);
        res.json({ success: true, data: result });
    }

    async updateProgress(req: Request, res: Response) {
        // id is enrollmentId
        const result = await service.updateProgress(req.params.id, req.body);
        res.json({ success: true, data: result });
    }
}
