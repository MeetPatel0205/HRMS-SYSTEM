import { Request, Response } from 'express';
import { BenefitsService } from '../services/BenefitsService';

const service = new BenefitsService();

export class BenefitsController {
    // Plans
    async createPlan(req: Request, res: Response) {
        const result = await service.createPlan(req.body);
        res.status(201).json({ success: true, data: result });
    }

    async updatePlan(req: Request, res: Response) {
        const result = await service.updatePlan(req.params.id, req.body);
        res.json({ success: true, data: result });
    }

    async deletePlan(req: Request, res: Response) {
        const result = await service.deletePlan(req.params.id);
        res.json({ success: true, data: result });
    }

    async getPlans(req: Request, res: Response) {
        const activeOnly = req.query.active !== 'false';
        const result = await service.getPlans(activeOnly);
        res.json({ success: true, data: result });
    }

    async getPlan(req: Request, res: Response) {
        const result = await service.getPlan(req.params.id);
        res.json({ success: true, data: result });
    }

    // Enrollments
    async enroll(req: Request, res: Response) {
        const { benefitPlanId, elections } = req.body;
        // @ts-ignore
        const employeeId = req.user.employeeId;
        if (!employeeId) {
            res.status(400).json({ message: 'Employee not found' });
            return;
        }

        const result = await service.enroll({
            employeeId,
            benefitPlanId,
            elections
        });
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

    async terminateEnrollment(req: Request, res: Response) {
        // Should verify ownership?
        const result = await service.terminateEnrollment(req.params.id);
        res.json({ success: true, data: result });
    }
}
