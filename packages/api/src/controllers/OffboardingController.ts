import { Request, Response } from 'express';
import { OffboardingService } from '../services/OffboardingService';

const service = new OffboardingService();

export class OffboardingController {
    async createRequest(req: Request, res: Response) {
        // @ts-ignore
        const employeeId = req.user.employeeId;
        // Or allowing admins to terminate? For now assume resignation or admin-initiated via body

        const targetEmployeeId = req.body.employeeId || employeeId;

        const result = await service.createExitRequest({
            ...req.body,
            employeeId: targetEmployeeId,
            lastWorkingDate: new Date(req.body.lastWorkingDate)
        });
        res.status(201).json({ success: true, data: result });
    }

    async updateRequest(req: Request, res: Response) {
        const result = await service.updateExitRequest(req.params.id, req.body);
        res.json({ success: true, data: result });
    }

    async getRequests(req: Request, res: Response) {
        // @ts-ignore
        const { employeeId } = req.query;
        // @ts-ignore
        const requesterId = req.user.employeeId;
        const isAdmin = req.query.isAdmin === 'true'; // Simplified check, middleware handles actual permission

        // If not admin, force viewing own requests
        const targetId = isAdmin ? (employeeId as string) : requesterId;

        const result = await service.getExitRequests(targetId);
        res.json({ success: true, data: result });
    }

    // Assets
    async addAsset(req: Request, res: Response) {
        const result = await service.addAssetToReturn(req.params.id, req.body.assetName, req.body.assetId);
        res.status(201).json({ success: true, data: result });
    }

    async updateAsset(req: Request, res: Response) {
        const result = await service.updateAssetStatus(req.params.id, req.body.status, req.body.notes);
        res.json({ success: true, data: result });
    }
}
