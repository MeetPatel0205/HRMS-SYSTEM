import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

export class OffboardingService {
    // Exit Requests
    async createExitRequest(data: {
        employeeId: string;
        type: string;
        reason: string;
        lastWorkingDate: Date;
    }) {
        // Check for existing pending request
        const existing = await prisma.exitRequest.findFirst({
            where: {
                employeeId: data.employeeId,
                status: { in: ['pending', 'approved'] }
            }
        });
        if (existing) throw new ValidationError('Active exit request already exists');

        return prisma.exitRequest.create({
            data: {
                ...data,
                status: 'pending'
            }
        });
    }

    async updateExitRequest(id: string, data: any) {
        const req = await prisma.exitRequest.findUnique({ where: { id } });
        if (!req) throw new NotFoundError('Exit request not found');

        return prisma.exitRequest.update({
            where: { id },
            data,
            include: { employee: true }
        });
    }

    async getExitRequests(employeeId?: string) {
        const where = employeeId ? { employeeId } : {};
        return prisma.exitRequest.findMany({
            where,
            include: {
                employee: {
                    select: {
                        firstName: true,
                        lastName: true,
                        department: true,
                        jobTitle: true
                    }
                },
                interview: true,
                assets: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getExitRequestById(id: string) {
        const req = await prisma.exitRequest.findUnique({
            where: { id },
            include: {
                employee: true,
                interview: true,
                assets: true
            }
        });
        if (!req) throw new NotFoundError('Exit request not found');
        return req;
    }

    // Asset Returns
    async addAssetToReturn(exitRequestId: string, assetName: string, assetId?: string) {
        return prisma.assetReturn.create({
            data: {
                exitRequestId,
                assetName,
                assetId,
                status: 'pending'
            }
        });
    }

    async updateAssetStatus(assetReturnId: string, status: string, notes?: string) {
        return prisma.assetReturn.update({
            where: { id: assetReturnId },
            data: {
                status,
                notes,
                returnedAt: status === 'returned' ? new Date() : undefined
            }
        });
    }

    // Exit Interview
    async scheduleInterview(exitRequestId: string, data: { conductedBy: string; scheduledAt: Date }) {
        return prisma.exitInterview.create({
            data: {
                exitRequestId,
                conductedBy: data.conductedBy,
                scheduledAt: data.scheduledAt,
                status: 'scheduled'
            }
        });
    }

    async completeInterview(interviewId: string, responses: any, notes?: string) {
        return prisma.exitInterview.update({
            where: { id: interviewId },
            data: {
                responses,
                notes,
                status: 'completed',
                completedAt: new Date()
            }
        });
    }
}
