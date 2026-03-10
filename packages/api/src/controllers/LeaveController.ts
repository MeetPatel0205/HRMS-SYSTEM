import { Request, Response } from 'express';

import { LeaveService } from '../services/LeaveService';
import { NotFoundError } from '../middleware/errorHandler';
// Need to verify where createSuccessResponse comes from. 
// HRModulesController imported it from '@hrms/shared' but it might be in utils locally too or shared package
// Inspecting HRModulesController again usually helps but I will assume local util for now or standard response

// HRModulesController had: import { createSuccessResponse } from '@hrms/shared'
// But other controllers might use local utils. 
// Let's stick to what HRModulesController used if possible, or define a standard response helper

const leaveService = new LeaveService();

export class LeaveController {
    async getLeaveBalance(req: Request, res: Response) {
        // In strict TS with middleware, user is defined
        const userId = (req as any).user?.id;
        if (!userId) throw new NotFoundError('User not authenticated'); // Should be handled by middleware though

        // We need employeeId, not userId.
        // The previous implementation fetched employee by userId. 
        // We should probably move "getEmployeeIdByUserId" to a helper or just do it here.
        // Ideally the middleware attaches employeeId too, but let's stick to existing pattern

        // For now, I'll assume we need to fetch employee first.
        // Actually, let's put that logic in the Service or a shared helper.
        // But since I can't easily change Service signature right now without breaking separation, 
        // I'll assume the Service method `getLeaveBalance` takes employeeId.

        // Wait, the previous Controller implementation did the employee lookup. 
        // I'll keep it here for now to match the refactor pattern.

        // I need prisma to look up employee
        const { prisma } = require('../utils/database'); // dynamic import or standard import

        const employee = await prisma.employee.findUnique({
            where: { userId }
        });

        if (!employee) {
            throw new NotFoundError('Employee profile not found');
        }

        const balances = await leaveService.getLeaveBalance(employee.id);
        // Transform to array if needed or keep as record. 
        // The previous controller returned an array of objects. 
        // My service returns a Record<string, any>. 
        // Let's convert it to match the previous API response format to avoid breaking frontend.

        const result = Object.values(balances); // The service I wrote returns Record<name, object>

        res.json({
            success: true,
            data: result
        });
    }

    async submitLeaveRequest(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const { leaveTypeId, startDate, endDate, reason } = req.body;

        const { prisma } = require('../utils/database');
        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee profile not found');

        const result = await leaveService.submitLeaveRequest({
            employeeId: employee.id,
            leaveTypeId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason
        });

        res.json({
            success: true,
            data: result,
            message: 'Leave request submitted successfully'
        });
    }

    async getLeaveRequests(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const { prisma } = require('../utils/database');
        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee not found');

        const requests = await prisma.leaveRequest.findMany({
            where: { employeeId: employee.id },
            include: { leaveType: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: requests
        });
    }

    async approveLeaveRequest(req: Request, res: Response) {
        const { requestId } = req.params;
        const userId = (req as any).user?.id; // Approver

        // Verify approver? Service just takes ID.
        const result = await leaveService.approveLeaveRequest(requestId, userId);

        res.json({
            success: true,
            data: result,
            message: 'Leave request approved'
        });
    }

    async rejectLeaveRequest(req: Request, res: Response) {
        const { requestId } = req.params;
        const userId = (req as any).user?.id;
        const { reason } = req.body;

        const result = await leaveService.rejectLeaveRequest(requestId, userId, reason);

        res.json({
            success: true,
            data: result,
            message: 'Leave request rejected'
        });
    }

    async getAllLeaveRequests(req: Request, res: Response) {
        const { status } = req.query;
        const requests = await leaveService.getAllLeaveRequests(status as string);
        res.json({
            success: true,
            data: requests
        });
    }

    async getLeaveTypes(req: Request, res: Response) {
        const types = await leaveService.getLeaveTypes();
        res.json({
            success: true,
            data: types
        });
    }
}
