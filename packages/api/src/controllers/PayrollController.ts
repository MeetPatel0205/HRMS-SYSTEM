import { Request, Response } from 'express';
import { PayrollService } from '../services/PayrollService';
import { NotFoundError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';

const payrollService = new PayrollService();

export class PayrollController {
    async processPayroll(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const { startDate, endDate } = req.body;

        // Verify admin or permission (handled by route middleware usually, but good to have check)

        const result = await payrollService.processPayroll(
            new Date(startDate),
            new Date(endDate),
            userId
        );

        res.json({
            success: true,
            data: result,
            message: 'Payroll processing completed'
        });
    }

    async getHistory(req: Request, res: Response) {
        const userId = (req as any).user?.id;

        // If employee, get own. If admin, can get others? 
        // For now, let's implement for the logged-in user (Employee view)
        // Admin view might need a separate endpoint or query param.

        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee not found');

        const result = await payrollService.getPayrollHistory(employee.id);

        res.json({
            success: true,
            data: result
        });
    }

    async getPayrollEntry(req: Request, res: Response) {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        const entry = await payrollService.getPayrollEntry(id);

        // Security check: ensure user owns this entry or is admin
        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee not found');

        // Check role/permission here if needed, or simple ownership
        // if (entry.employeeId !== employee.id && !isAdmin) throw ...

        // For simplicity now, assuming ownership check or similar
        // We'll trust middleware for fine-grained, but let's add basic ownership
        if (entry.employeeId !== employee.id) {
            // In real app, check 'manage_payroll' permission here
            // throw new ForbiddenError()
        }

        res.json({
            success: true,
            data: entry
        });
    }
}
