import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { PayrollFormulaEngine } from './PayrollFormulaEngine';

export class PayrollService {
  /**
   * 1. Simulate payroll to preview the results without saving.
   */
  async simulatePayroll(employeeId: string, payrollRunStart: Date, payrollRunEnd: Date) {
      return this.calculateEmployeePayroll(employeeId, payrollRunStart, payrollRunEnd);
  }

  /**
   * The core 8-step enterprise calculation
   */
  private async calculateEmployeePayroll(employeeId: string, payrollRunStart: Date, payrollRunEnd: Date) {
      // Step 1: Fetch employee and active salary version
      const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
          include: {
              salaryVersions: {
                  where: {
                      effectiveFrom: { lte: payrollRunStart },
                      OR: [
                          { effectiveTo: null },
                          { effectiveTo: { gte: payrollRunEnd } }
                      ]
                  },
                  include: {
                      structure: {
                          include: {
                              components: {
                                  include: { component: true },
                                  orderBy: { orderIndex: 'asc' }
                              }
                          }
                      }
                  }
              }
          }
      });

      if (!employee) throw new NotFoundError('Employee not found');
      
      const activeSalaryVersion = employee.salaryVersions[0];
      if (!activeSalaryVersion) {
          throw new ValidationError(`No active salary structure found for employee ${employee.firstName} ${employee.lastName} in this period.`);
      }

      // Context variables for the Formula Engine
      const context: Record<string, number> = {
          CTC: activeSalaryVersion.annualCTC,
          MONTHLY_CTC: activeSalaryVersion.annualCTC / 12,
      };

      // Step 2 & 3: Calculate salary components using formula engine & Calculate gross salary
      let grossPay = 0;
      let totalComponentDeductions = 0;
      const componentDetails: Record<string, number> = {};

      for (const structComp of activeSalaryVersion.structure.components) {
          const comp = structComp.component;
          let amount = 0;

          if (structComp.formula || comp.formula) {
              const formulaToUse = structComp.formula || comp.formula || '0';
              amount = PayrollFormulaEngine.evaluate(formulaToUse, context);
          }
          
          // Context is updated so subsequent formulas can use this component's value (e.g. HRA needs BASIC)
          const compVarName = comp.name.toUpperCase().replace(/\s+/g, '_');
          context[compVarName] = amount;
          componentDetails[comp.name] = amount;

          if (comp.type === 'EARNING') {
              grossPay += amount;
          } else if (comp.type === 'DEDUCTION') {
              totalComponentDeductions += amount;
          }
      }

      context['GROSS_PAY'] = grossPay;

      // Step 4: Apply attendance multiplier
      // Fetch approved time entries
      const timeEntries = await prisma.timeEntry.findMany({
          where: {
              employeeId,
              date: { gte: payrollRunStart, lte: payrollRunEnd },
              status: 'approved'
          }
      });

      // Simple implementation: assume standard 22 working days per month if not provided
      const presentDays = new Set(timeEntries.map(te => te.date.toISOString().split('T')[0])).size;
      const totalWorkingDays = 22;
      
      const attendanceMultiplier = Math.min(presentDays / totalWorkingDays, 1);
      
      context['ATTENDANCE_MULTIPLIER'] = attendanceMultiplier;

      const adjustedGrossPay = grossPay * attendanceMultiplier;

      // Overtime calculation
      const overtimeHours = timeEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
      const hourlyRate = activeSalaryVersion.annualCTC / 2080;
      const overtimePay = overtimeHours * (hourlyRate * 1.5);

      context['OVERTIME_PAY'] = overtimePay;

      // Step 5: Add approved reimbursements
      const expenses = await prisma.expenseClaim.findMany({
          where: {
              employeeId,
              status: 'approved',
              payrollRunId: null, // Only fetch unpaid claims
              claimDate: { lte: payrollRunEnd }
          }
      });

      const reimbursements = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      context['REIMBURSEMENTS'] = reimbursements;

      // Step 6: Apply statutory deductions
      let statutoryDeductions = 0;
      const complianceRules = await prisma.complianceRule.findMany({
          where: { isActive: true, type: 'STATUTORY' }
      });

      const complianceDetails: Record<string, number> = {};
      for (const rule of complianceRules) {
          const amount = PayrollFormulaEngine.evaluate(rule.formula, { ...context, ADJUSTED_GROSS: adjustedGrossPay });
          statutoryDeductions += amount;
          complianceDetails[rule.name] = amount;
          context[rule.name.toUpperCase().replace(/\s+/g, '_')] = amount;
      }

      // Step 7: Calculate tax (TDS)
      let tax = 0;
      const taxRules = await prisma.complianceRule.findMany({
          where: { isActive: true, type: 'TAX' }
      });

      for (const rule of taxRules) {
          const amount = PayrollFormulaEngine.evaluate(rule.formula, { ...context, ADJUSTED_GROSS: adjustedGrossPay });
          tax += amount;
          complianceDetails[rule.name] = amount;
      }

      // Step 8: Generate final NetPay
      const totalDeductions = totalComponentDeductions + statutoryDeductions;
      const netPay = adjustedGrossPay + reimbursements + overtimePay - totalDeductions - tax;

      return {
          employeeId,
          grossPay: Number(adjustedGrossPay.toFixed(2)),
          deductions: {
              components: componentDetails,
              statutory: complianceDetails,
              total: Number(totalDeductions.toFixed(2))
          },
          reimbursements: Number(reimbursements.toFixed(2)),
          tax: Number(tax.toFixed(2)),
          netPay: Number(netPay.toFixed(2)),
          breakdown: {
              baseGrossPay: Number(grossPay.toFixed(2)),
              attendanceMultiplier: Number(attendanceMultiplier.toFixed(3)),
              presentDays,
              totalWorkingDays,
              overtimeHours,
              overtimePay: Number(overtimePay.toFixed(2)),
              expenseClaimIds: expenses.map(e => e.id)
          }
      };
  }

  /**
   * Create a draft payroll run for a set of dates
   */
  async createPayrollRun(startDate: Date, endDate: Date) {
      // 1. Create run
      const run = await prisma.payrollRun.create({
          data: {
              startDate,
              endDate,
              status: 'draft'
          }
      });

      // 2. Fetch active employees
      const employees = await prisma.employee.findMany({
          where: { status: 'active' }
      });

      const entries = [];
      const errors = [];

      for (const emp of employees) {
          try {
              const calc = await this.calculateEmployeePayroll(emp.id, startDate, endDate);
              
              const entry = await prisma.payrollEntry.create({
                  data: {
                      payrollRunId: run.id,
                      employeeId: emp.id,
                      grossPay: calc.grossPay,
                      deductions: calc.deductions,
                      reimbursements: calc.reimbursements,
                      tax: calc.tax,
                      netPay: calc.netPay,
                      status: 'pending'
                  }
              });

              // Mark expenses as paid in this run
              if (calc.breakdown.expenseClaimIds.length > 0) {
                  await prisma.expenseClaim.updateMany({
                      where: { id: { in: calc.breakdown.expenseClaimIds } },
                      data: { payrollRunId: run.id }
                  });
              }

              entries.push(entry);
          } catch (error: any) {
              errors.push({ employeeId: emp.id, error: error.message });
          }
      }

      return { run, entries, errors };
  }

  async getPayrollHistory(employeeId: string): Promise<any[]> {
      return prisma.payrollEntry.findMany({
          where: { employeeId },
          include: { payrollRun: true },
          orderBy: { createdAt: 'desc' }
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
