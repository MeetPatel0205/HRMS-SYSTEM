import { Request, Response } from 'express';
import { OnboardingService } from '../services/OnboardingService';

const service = new OnboardingService();

export class OnboardingController {
    async assignChecklist(req: Request, res: Response) {
        const { employeeId, tasks, startDate, dueDate } = req.body;
        const result = await service.assignChecklist({
            employeeId,
            tasks,
            startDate: new Date(startDate),
            dueDate: new Date(dueDate)
        });
        res.status(201).json({ success: true, data: result });
    }

    async getMyChecklist(req: Request, res: Response) {
        // @ts-ignore - user attached by auth middleware
        const employeeId = req.user.employeeId;
        if (!employeeId) {
            res.status(404).json({ success: false, message: 'Employee profile not found' });
            return;
        }
        const result = await service.getChecklist(employeeId);
        res.json({ success: true, data: result });
    }

    async getEmployeeChecklist(req: Request, res: Response) {
        const { employeeId } = req.params;
        const result = await service.getChecklist(employeeId);
        res.json({ success: true, data: result });
    }

    async getAllChecklists(req: Request, res: Response) {
        const result = await service.getAllChecklists();
        res.json({ success: true, data: result });
    }

    async updateTask(req: Request, res: Response) {
        const { id } = req.params; // Checklist ID
        const { taskId, status } = req.body;
        const result = await service.updateTaskStatus(id, taskId, status);
        res.json({ success: true, data: result });
    }

    async updateChecklist(req: Request, res: Response) {
        const { id } = req.params;
        const result = await service.updateChecklist(id, req.body);
        res.json({ success: true, data: result });
    }
}
