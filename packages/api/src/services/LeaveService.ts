import { prisma } from '../utils/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

interface LeaveRequestInput {
    employeeId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
}

export class LeaveService {
    async getLeaveBalance(employeeId: string, leaveTypeId?: string): Promise<Record<string, any>> {
        const whereClause: any = { employeeId };
        if (leaveTypeId) whereClause.leaveTypeId = leaveTypeId;

        // Get assigned balances
        const balances = await prisma.leaveBalance.findMany({
            where: whereClause,
            include: { leaveType: true }
        });

        // Get all active leave types
        const types = await prisma.leaveType.findMany({
            where: { isActive: true }
        });

        // Map balances to types, treating missing balances as default (maxDays)
        const result: Record<string, any> = {};

        for (const type of types) {
            const balanceUtil = balances.find(b => b.leaveTypeId === type.id);

            result[type.name] = {
                leaveType: type,
                year: new Date().getFullYear(),
                totalDays: balanceUtil?.totalDays ?? type.maxDays ?? 0,
                usedDays: balanceUtil?.usedDays ?? 0,
                remainingDays: (balanceUtil?.totalDays ?? type.maxDays ?? 0) - (balanceUtil?.usedDays ?? 0)
            };
        }

        return result;
    }

    async submitLeaveRequest(data: LeaveRequestInput): Promise<any> {
        const { employeeId, leaveTypeId, startDate, endDate, reason } = data;

        // Calculate days
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive

        // Check balance
        const balance = await prisma.leaveBalance.findFirst({
            where: {
                employeeId,
                leaveTypeId,
                year: new Date().getFullYear()
            },
            include: { leaveType: true }
        });

        // If no balance record, check if we can create one or if we should check default limits
        // For now, let's assume if balance record doesn't exist, we fallback to LeaveType maxDays
        let maxDays = 0;
        let usedDays = 0;

        if (balance) {
            maxDays = balance.totalDays;
            usedDays = balance.usedDays;
        } else {
            const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
            if (!leaveType) throw new NotFoundError('Leave type not found');
            maxDays = leaveType.maxDays || 0;
        }

        if (maxDays > 0 && (usedDays + totalDays) > maxDays) {
            throw new ValidationError(`Insufficient leave balance. You have ${maxDays - usedDays} days remaining.`);
        }

        return prisma.leaveRequest.create({
            data: {
                employeeId,
                leaveTypeId,
                startDate: start,
                endDate: end,
                totalDays,
                reason,
                status: 'pending',
                approvalWorkflow: [], // Can be enhanced with actual workflow steps
                attachments: []
            },
            include: {
                leaveType: true
            }
        });
    }

    async approveLeaveRequest(requestId: string, approverId: string): Promise<any> {
        const request = await prisma.leaveRequest.findUnique({
            where: { id: requestId }
        });
        if (!request) throw new NotFoundError('Leave request not found');

        if (request.status !== 'pending') {
            throw new ValidationError('Request is not pending');
        }

        const updatedRequest = await prisma.leaveRequest.update({
            where: { id: requestId },
            data: {
                status: 'approved',
                approvedBy: approverId,
                approvedAt: new Date() // Add this if you add the field to schema, otherwise just status
            }
        });

        // Update Balance
        // Find or Create balance record
        const year = new Date().getFullYear();
        const balance = await prisma.leaveBalance.findFirst({
            where: {
                employeeId: request.employeeId,
                leaveTypeId: request.leaveTypeId,
                year
            }
        });

        if (balance) {
            await prisma.leaveBalance.update({
                where: { id: balance.id },
                data: { usedDays: { increment: request.totalDays } }
            });
        } else {
            // Fetch Max Days first
            const leaveType = await prisma.leaveType.findUnique({
                where: { id: request.leaveTypeId }
            });

            await prisma.leaveBalance.create({
                data: {
                    employeeId: request.employeeId,
                    leaveTypeId: request.leaveTypeId,
                    year,
                    totalDays: leaveType?.maxDays || 0,
                    usedDays: request.totalDays
                }
            });
        }

        return updatedRequest;
    }

    async rejectLeaveRequest(requestId: string, approverId: string, reason?: string): Promise<any> {
        return prisma.leaveRequest.update({
            where: { id: requestId },
            data: {
                status: 'rejected',
                rejectedBy: approverId,
                rejectionReason: reason
            }
        });
    }

    async getAllLeaveRequests(status?: string): Promise<any[]> {
        const whereClause: any = {};
        if (status) {
            whereClause.status = status;
        }

        return prisma.leaveRequest.findMany({
            where: whereClause,
            include: {
                leaveType: true,
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeNumber: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getLeaveTypes(): Promise<any[]> {
        return prisma.leaveType.findMany({
            where: { isActive: true }
        });
    }
}
