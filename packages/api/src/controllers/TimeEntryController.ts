import { Request, Response } from 'express';
import { TimeEntryService } from '../services/TimeEntryService';
import { NotFoundError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';

const timeEntryService = new TimeEntryService();

export class TimeEntryController {
    async clockIn(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const { location, deviceInfo } = req.body;
        const ipAddress = req.ip;

        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee not found');

        const result = await timeEntryService.clockIn(employee.id, location, ipAddress, deviceInfo);

        res.json({
            success: true,
            data: result,
            message: 'Clocked in successfully'
        });
    }

    async clockOut(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const { location } = req.body;

        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee not found');

        const result = await timeEntryService.clockOut(employee.id, location);

        res.json({
            success: true,
            data: result,
            message: 'Clocked out successfully'
        });
    }

    async startBreak(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee not found');

        const result = await timeEntryService.startBreak(employee.id);

        res.json({
            success: true,
            data: result,
            message: 'Break started'
        });
    }

    async endBreak(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee not found');

        const result = await timeEntryService.endBreak(employee.id);

        res.json({
            success: true,
            data: result,
            message: 'Break ended'
        });
    }

    async getStatus(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee not found');

        const result = await timeEntryService.getEmployeeStatus(employee.id);

        res.json({
            success: true,
            data: result
        });
    }

    async getTimesheet(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const { startDate, endDate } = req.query;

        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee not found');

        const result = await timeEntryService.getTimesheet(
            employee.id,
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined
        );

        res.json({
            success: true,
            data: result
        });
    }
}
