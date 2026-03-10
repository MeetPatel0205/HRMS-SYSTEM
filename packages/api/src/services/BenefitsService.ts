import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

export class BenefitsService {
    // Plans (Admin)
    async createPlan(data: {
        name: string;
        description: string;
        type: string;
        provider: string;
        cost: any;
    }) {
        return prisma.benefitPlan.create({
            data
        });
    }

    async updatePlan(id: string, data: any) {
        const plan = await prisma.benefitPlan.findUnique({ where: { id } });
        if (!plan) throw new NotFoundError('Benefit plan not found');

        return prisma.benefitPlan.update({
            where: { id },
            data
        });
    }

    async deletePlan(id: string) {
        // Soft delete or hard delete? Schema has isActive. Let's toggle or soft delete.
        // Actually schema has isActive, so let's set it to false.
        // But if we want to delete, we should check enrollments.
        return prisma.benefitPlan.update({
            where: { id },
            data: { isActive: false }
        });
    }

    async getPlans(activeOnly: boolean = true) {
        const where = activeOnly ? { isActive: true } : {};
        return prisma.benefitPlan.findMany({
            where,
            orderBy: { name: 'asc' }
        });
    }

    async getPlan(id: string) {
        const plan = await prisma.benefitPlan.findUnique({ where: { id } });
        if (!plan) throw new NotFoundError('Benefit plan not found');
        return plan;
    }

    // Enrollments (Employee)
    async enroll(data: {
        employeeId: string;
        benefitPlanId: string;
        elections: any;
    }) {
        const plan = await prisma.benefitPlan.findUnique({ where: { id: data.benefitPlanId } });
        if (!plan) throw new NotFoundError('Benefit plan not found');
        if (!plan.isActive) throw new ValidationError('Cannot enroll in inactive plan');

        // Check active enrollment for same type? 
        // For simplicity, just create new enrollment. Real world needs overlap checks.

        return prisma.benefitEnrollment.create({
            data: {
                ...data,
                enrollmentDate: new Date(),
                effectiveDate: new Date(), // Logic for this usually complex (next month etc)
                status: 'active'
            }
        });
    }

    async getEmployeeEnrollments(employeeId: string) {
        return prisma.benefitEnrollment.findMany({
            where: { employeeId, status: 'active' },
            include: {
                benefitPlan: true
            }
        });
    }

    async terminateEnrollment(id: string) {
        return prisma.benefitEnrollment.update({
            where: { id },
            data: {
                status: 'terminated',
                endDate: new Date()
            }
        });
    }
}
