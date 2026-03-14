import { Request, Response } from 'express';
import { PayrollService } from '../services/PayrollService';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';

const payrollService = new PayrollService();

export class PayrollController {
    async simulate(req: Request, res: Response) {
        const { employeeId, startDate, endDate } = req.body;
        if (!employeeId || !startDate || !endDate) {
            throw new ValidationError('employeeId, startDate, and endDate are required');
        }
        const result = await payrollService.simulatePayroll(employeeId, new Date(startDate), new Date(endDate));
        res.json({ success: true, data: result });
    }

    async createRun(req: Request, res: Response) {
        const { startDate, endDate } = req.body;
        if (!startDate || !endDate) {
            throw new ValidationError('startDate and endDate are required');
        }
        const result = await payrollService.createPayrollRun(new Date(startDate), new Date(endDate));
        res.status(201).json({ success: true, data: result, msg: 'Draft payroll run created' });
    }

    async submitRun(req: Request, res: Response) {
        const { id } = req.params;
        const run = await prisma.payrollRun.update({
            where: { id },
            data: { status: 'pending_approval' }
        });
        res.json({ success: true, data: run, msg: 'Payroll run submitted for approval' });
    }

    async approveRun(req: Request, res: Response) {
        const { id } = req.params;
        
        const run = await prisma.payrollRun.update({
            where: { id },
            data: { status: 'approved' }
        });

        // Update all related entries to processed
        await prisma.payrollEntry.updateMany({
            where: { payrollRunId: id },
            data: { status: 'processed' }
        });

        res.json({ success: true, data: run, msg: 'Payroll run approved' });
    }

    async exportBankFile(req: Request, res: Response) {
        const { runId } = req.query;
        if (!runId || typeof runId !== 'string') {
            throw new ValidationError('runId query parameter is required');
        }

        const entries = await prisma.payrollEntry.findMany({
            where: { payrollRunId: runId },
            include: { employee: true }
        });

        if (entries.length === 0) {
            throw new NotFoundError('No entries found for this payroll run');
        }

        let csv = 'Employee Name,Bank Account Number,IFSC Code,Net Salary\n';
        for (const entry of entries) {
            const emp = entry.employee;
            const name = `${emp.firstName} ${emp.lastName}`;
            const account = emp.bankAccountNumber || 'NOT_PROVIDED';
            const ifsc = emp.bankIFSC || 'NOT_PROVIDED';
            csv += `"${name}","${account}","${ifsc}",${entry.netPay}\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="bank_transfer_${runId}.csv"`);
        res.send(csv);
    }

    async getHistory(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (!employee) throw new NotFoundError('Employee not found');

        const result = await payrollService.getPayrollHistory(employee.id);
        res.json({ success: true, data: result });
    }

    async getPayrollEntry(req: Request, res: Response) {
        const { id } = req.params;
        const entry = await payrollService.getPayrollEntry(id);
        res.json({ success: true, data: entry });
    }
}
