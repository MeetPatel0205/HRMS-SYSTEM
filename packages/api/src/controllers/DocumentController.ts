import { Request, Response } from 'express';
import { DocumentService } from '../services/DocumentService';

const service = new DocumentService();

export class DocumentController {
    async create(req: Request, res: Response) {
        // @ts-ignore
        const userId = req.user.userId;
        const result = await service.create({
            ...req.body,
            uploadedBy: userId
        });
        res.status(201).json({ success: true, data: result });
    }

    async update(req: Request, res: Response) {
        const result = await service.update(req.params.id, req.body);
        res.json({ success: true, data: result });
    }

    async delete(req: Request, res: Response) {
        await service.delete(req.params.id);
        res.json({ success: true, message: 'Document deleted' });
    }

    async getAll(req: Request, res: Response) {
        const { category } = req.query;
        // @ts-ignore
        const userRole = req.user.role; // Assuming role is available on user object

        const docs = await service.getAll(category as string);

        // Filter by role manually if JSON filter is tricky
        // Assuming 'roles' is array of strings. If empty, public to all employees? 
        // Or "ALL".
        const filtered = docs.filter(doc => {
            const allowedRoles = doc.roles as string[] | null;
            if (!allowedRoles || allowedRoles.length === 0 || allowedRoles.includes('ALL')) return true;
            return allowedRoles.includes(userRole);
        });

        res.json({ success: true, data: filtered });
    }

    async getById(req: Request, res: Response) {
        const result = await service.getById(req.params.id);
        res.json({ success: true, data: result });
    }
}
