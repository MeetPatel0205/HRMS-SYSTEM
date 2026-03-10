import { PrismaClient, Candidate, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();
const notificationService = new NotificationService();

export class CandidateService {
  async createCandidate(data: Prisma.CandidateCreateInput, userId: string): Promise<Candidate> {
    const candidate = await prisma.candidate.create({ data });
    await auditLogService.log({ userId, action: 'CREATE', resource: 'Candidate', resourceId: candidate.id, newValues: candidate });
    return candidate;
  }

  async getCandidateById(id: string): Promise<Candidate | null> {
    return prisma.candidate.findUnique({ where: { id } });
  }

  async getAllCandidates(filters?: { status?: string; source?: string }): Promise<Candidate[]> {
    const where: Prisma.CandidateWhereInput = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = { contains: filters.source };
    return prisma.candidate.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async updateCandidate(id: string, data: Prisma.CandidateUpdateInput, userId: string): Promise<Candidate> {
    const old = await prisma.candidate.findUnique({ where: { id } });
    const candidate = await prisma.candidate.update({ where: { id }, data });
    await auditLogService.log({ userId, action: 'UPDATE', resource: 'Candidate', resourceId: id, oldValues: old || undefined, newValues: candidate });
    return candidate;
  }

  async updateCandidateStatus(id: string, status: string, userId: string): Promise<Candidate> {
    const candidate = await this.updateCandidate(id, { status }, userId);
    if (candidate.email) {
      await notificationService.createNotification({
        user: { connect: { email: candidate.email } },
        type: 'recruitment',
        title: 'Application Status Update',
        message: `Your application status has been updated to: ${status}`,
        data: { candidateId: id }
      });
    }
    return candidate;
  }

  async deleteCandidate(id: string, userId: string): Promise<void> {
    const candidate = await prisma.candidate.findUnique({ where: { id } });
    await prisma.candidate.delete({ where: { id } });
    await auditLogService.log({ userId, action: 'DELETE', resource: 'Candidate', resourceId: id, oldValues: candidate || undefined });
  }
}
