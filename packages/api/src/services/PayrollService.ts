import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

interface SalaryInfo {
    hourlyRate: number;
    currency: string;
    payFrequency: 'weekly' | 'bi-weekly' | 'monthly';
    benefitDeductions?: number;
    taxExemptions?: number;
}

export class PayrollService {
    async calculatePayroll(employeeId: string, payPeriodStart: Date, payPeriodEnd: Date): Promise<any> {
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId }
        });
        if (!employee) throw new NotFoundError('Employee not found');

        const salaryInfo = employee.salaryInfo as unknown as SalaryInfo;

        if (!salaryInfo || !salaryInfo.hourlyRate) {
            // Fallback or error if no salary info
            throw new ValidationError(`Salary info missing for employee ${employee.firstName} ${employee.lastName}`);
        }

        // Get approved time entries for period
        const timeEntries = await prisma.timeEntry.findMany({
            where: {
                employeeId,
                date: { gte: payPeriodStart, lte: payPeriodEnd },
                status: 'approved' // Only approved entries
            }
        });

        // Calculate total hours
        const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
        // Assuming overtime is calculated in TimeEntry or we recalculate here. 
        // derived from TimeEntryService logic: regularHours, overtimeHours are stored.

        const regularHours = timeEntries.reduce((sum, entry) => sum + (entry.regularHours || 0), 0);
        const overtimeHours = timeEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);

        // Calculate gross pay
        const regularPay = salaryInfo.hourlyRate * regularHours;
        const overtimePay = salaryInfo.hourlyRate * 1.5 * overtimeHours;
        const grossPay = regularPay + overtimePay;

        // Calculate taxes (Simplified logic for now - ideally use a tax provider)
        // Federal Tax (~12-22% bracket simplified to 15% for demo)
        const federalTax = grossPay * 0.15;
        // Social Security (6.2%)
        const socialSecurity = grossPay * 0.062;
        // Medicare (1.45%)
        const medicare = grossPay * 0.0145;

        const taxWithholding = federalTax + socialSecurity + medicare;

        // Deductions
        const benefitDeductions = salaryInfo.benefitDeductions || 0;

        const deductions = {
            federalTax: parseFloat(federalTax.toFixed(2)),
            socialSecurity: parseFloat(socialSecurity.toFixed(2)),
            medicare: parseFloat(medicare.toFixed(2)),
            benefits: parseFloat(benefitDeductions.toFixed(2))
        };

        const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
        const netPay = grossPay - totalDeductions;

        return {
            employeeId,
            payPeriodStart,
            payPeriodEnd,
            grossPay: parseFloat(grossPay.toFixed(2)),
            taxWithholding: parseFloat(taxWithholding.toFixed(2)),
            deductions,
            netPay: parseFloat(netPay.toFixed(2)),
            breakdown: {
                totalHours: parseFloat(totalHours.toFixed(2)),
                regularHours: parseFloat(regularHours.toFixed(2)),
                overtimeHours: parseFloat(overtimeHours.toFixed(2)),
                regularPay: parseFloat(regularPay.toFixed(2)),
                overtimePay: parseFloat(overtimePay.toFixed(2))
            }
        };
    }

    async processPayroll(payPeriodStart: Date, payPeriodEnd: Date, processedBy: string): Promise<any> {
        const employees = await prisma.employee.findMany({
            where: { status: 'active' }
        });

        const results = [];
        const errors = [];

        for (const employee of employees) {
            try {
                // Check if already processed for this period? 
                // For now, allow reprocessing or check limit.

                const calculation = await this.calculatePayroll(employee.id, payPeriodStart, payPeriodEnd);

                const entry = await prisma.payrollEntry.create({
                    data: {
                        employeeId: employee.id,
                        payPeriodStart,
                        payPeriodEnd,
                        grossPay: calculation.grossPay,
                        taxWithholding: calculation.taxWithholding,
                        deductions: calculation.deductions,
                        netPay: calculation.netPay,
                        status: 'processed',
                        processedAt: new Date(),
                    }
                });

                results.push(entry);
            } catch (err: any) {
                errors.push({ employeeId: employee.id, name: `${employee.firstName} ${employee.lastName}`, error: err.message });
            }
        }

        return {
            processed: results,
            errors
        };
    }

    async getPayrollHistory(employeeId: string): Promise<any[]> {
        return prisma.payrollEntry.findMany({
            where: { employeeId },
            orderBy: { payPeriodStart: 'desc' }
        });
    }

    async getPayrollEntry(id: string): Promise<any> {
        const entry = await prisma.payrollEntry.findUnique({
            where: { id },
            include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } }
        });
        if (!entry) throw new NotFoundError('Payroll entry not found');
        return entry;
    }
}
