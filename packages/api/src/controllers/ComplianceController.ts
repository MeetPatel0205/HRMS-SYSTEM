import { Request, Response } from 'express';
import { ComplianceService } from '../services/ComplianceService';

const service = new ComplianceService();

export class ComplianceController {
    // Requirements
    async createRequirement(req: Request, res: Response) {
        const result = await service.createRequirement({
            ...req.body,
            dueDate: new Date(req.body.dueDate)
        });
        res.status(201).json({ success: true, data: result });
    }

    async updateRequirement(req: Request, res: Response) {
        const result = await service.updateRequirement(req.params.id, req.body);
        res.json({ success: true, data: result });
    }

    async getRequirements(req: Request, res: Response) {
        const result = await service.getRequirements();
        res.json({ success: true, data: result });
    }

    // Records
    async assign(req: Request, res: Response) {
        const { employeeId, requirementId, expiresAt } = req.body;
        const result = await service.assignRequirement(employeeId, requirementId, expiresAt ? new Date(expiresAt) : undefined);
        res.status(201).json({ success: true, data: result });
    }

    async submitProof(req: Request, res: Response) {
        const { documentUrl } = req.body;
        const result = await service.submitProof(req.params.id, documentUrl);
        res.json({ success: true, data: result });
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

    async getStats(req: Request, res: Response) {
        const result = await service.getOverallStats();
        res.json({ success: true, data: result });
    }
}
