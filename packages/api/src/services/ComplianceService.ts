import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

export class ComplianceService {
    // Requirements (Admin)
    async createRequirement(data: {
        name: string;
        description?: string;
        dueDate: Date;
        frequency: string;
    }) {
        return prisma.complianceRequirement.create({
            data
        });
    }

    async updateRequirement(id: string, data: any) {
        const req = await prisma.complianceRequirement.findUnique({ where: { id } });
        if (!req) throw new NotFoundError('Requirement not found');

        return prisma.complianceRequirement.update({
            where: { id },
            data
        });
    }

    async getRequirements(activeOnly: boolean = true) {
        // status is string, activeOnly filter might mean different things. 
        // Assuming 'pending' or 'active' vs 'archived'. 
        // Schema has status field.
        const where = activeOnly ? { status: { not: 'archived' } } : {};
        return prisma.complianceRequirement.findMany({
            where,
            orderBy: { dueDate: 'asc' },
            include: {
                _count: {
                    select: { records: true }
                }
            }
        });
    }

    // Employee Compliance Records
    async assignRequirement(employeeId: string, requirementId: string, expiresAt?: Date) {
        const req = await prisma.complianceRequirement.findUnique({ where: { id: requirementId } });
        if (!req) throw new NotFoundError('Requirement not found');

        // Check if already assigned
        const existing = await prisma.employeeCompliance.findFirst({
            where: { employeeId, requirementId }
        });

        if (existing) return existing;

        return prisma.employeeCompliance.create({
            data: {
                employeeId,
                requirementId,
                status: 'pending',
                expiresAt
            }
        });
    }

    async submitProof(recordId: string, documentUrl: string) {
        const record = await prisma.employeeCompliance.findUnique({ where: { id: recordId } });
        if (!record) throw new NotFoundError('Compliance record not found');

        return prisma.employeeCompliance.update({
            where: { id: recordId },
            data: {
                status: 'compliant', // Or 'review_pending' if manual review needed. Assuming auto-compliant on upload for now.
                documentUrl,
                completedAt: new Date()
            }
        });
    }

    async getEmployeeRecords(employeeId: string) {
        return prisma.employeeCompliance.findMany({
            where: { employeeId },
            include: {
                complianceRequirement: true
            },
            orderBy: { complianceRequirement: { dueDate: 'asc' } }
        });
    }

    async getOverallStats() {
        // Admin dashboard stats
        const total = await prisma.employeeCompliance.count();
        const compliant = await prisma.employeeCompliance.count({ where: { status: 'compliant' } });
        const pending = await prisma.employeeCompliance.count({ where: { status: 'pending' } });
        const expired = await prisma.employeeCompliance.count({ where: { status: 'expired' } });

        return {
            total,
            compliant,
            pending,
            expired,
            rate: total > 0 ? (compliant / total) * 100 : 0
        };
    }
}
