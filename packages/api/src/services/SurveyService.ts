import { PrismaClient, Survey, SurveyResponse, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();
const notificationService = new NotificationService();

export class SurveyService {
  /**
   * Create survey
   */
  async createSurvey(
    data: Prisma.SurveyCreateInput,
    userId: string
  ): Promise<Survey> {
    const survey = await prisma.survey.create({
      data,
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'Survey',
      resourceId: survey.id,
      newValues: survey,
    });

    // Notify target audience
    const targetAudience = Array.isArray(survey.targetAudience)
      ? (survey.targetAudience as string[])
      : [];

    if (targetAudience.includes('all')) {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);
      await notificationService.createBulkNotifications(userIds, {
        type: 'survey',
        title: 'New Survey Available',
        message: survey.title,
        data: { surveyId: survey.id },
      });
    }

    return survey;
  }

  /**
   * Get survey by ID
   */
  async getSurveyById(id: string): Promise<Survey | null> {
    return prisma.survey.findUnique({
      where: { id },
      include: {
        responses: true,
      },
    });
  }

  /**
   * Get all surveys
   */
  async getAllSurveys(filters?: {
    status?: string;
    isAnonymous?: boolean;
  }): Promise<Survey[]> {
    const where: Prisma.SurveyWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.isAnonymous !== undefined) {
      where.isAnonymous = filters.isAnonymous;
    }

    return prisma.survey.findMany({
      where,
      include: {
        _count: {
          select: {
            responses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update survey
   */
  async updateSurvey(
    id: string,
    data: Prisma.SurveyUpdateInput,
    userId: string
  ): Promise<Survey> {
    const oldSurvey = await prisma.survey.findUnique({
      where: { id },
    });

    const survey = await prisma.survey.update({
      where: { id },
      data,
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Survey',
      resourceId: id,
      oldValues: oldSurvey || undefined,
      newValues: survey,
    });

    return survey;
  }

  /**
   * Delete survey
   */
  async deleteSurvey(id: string, userId: string): Promise<void> {
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        responses: true,
      },
    });

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Delete all responses first
    await prisma.surveyResponse.deleteMany({
      where: { surveyId: id },
    });

    await prisma.survey.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Survey',
      resourceId: id,
      oldValues: survey,
    });
  }

  /**
   * Submit survey response
   */
  async submitResponse(
    data: Prisma.SurveyResponseCreateInput,
    userId: string
  ): Promise<SurveyResponse> {
    const response = await prisma.surveyResponse.create({
      data,
      include: {
        survey: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'SUBMIT',
      resource: 'SurveyResponse',
      resourceId: response.id,
      newValues: response,
    });

    return response;
  }

  /**
   * Get survey responses
   */
  async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    return prisma.surveyResponse.findMany({
      where: { surveyId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Get user's survey response
   */
  async getUserResponse(
    surveyId: string,
    userId: string
  ): Promise<SurveyResponse | null> {
    return prisma.surveyResponse.findFirst({
      where: {
        surveyId,
        respondentId: userId,
      },
      include: {
        survey: true,
      },
    });
  }

  /**
   * Get survey statistics
   */
  async getSurveyStats(surveyId: string): Promise<{
    totalResponses: number;
    completionRate: number;
    averageScore?: number;
    responsesByQuestion: any;
  }> {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        responses: true,
      },
    });

    if (!survey) {
      throw new Error('Survey not found');
    }

    const totalResponses = survey.responses.length;
    const targetAudience = Array.isArray(survey.targetAudience)
      ? (survey.targetAudience as string[])
      : [];
    const targetUsers = await this.getTargetUserCount(targetAudience);
    const completionRate = targetUsers > 0 ? (totalResponses / targetUsers) * 100 : 0;

    // Aggregate responses by question
    const responsesByQuestion: any = {};
    survey.responses.forEach((response) => {
      const answers = response.answers as any;
      Object.keys(answers).forEach((questionId) => {
        if (!responsesByQuestion[questionId]) {
          responsesByQuestion[questionId] = [];
        }
        responsesByQuestion[questionId].push(answers[questionId]);
      });
    });

    return {
      totalResponses,
      completionRate,
      responsesByQuestion,
    };
  }

  /**
   * Get target user count for audience
   */
  private async getTargetUserCount(targetAudience: string[]): Promise<number> {
    if (targetAudience.includes('all')) {
      return prisma.user.count({ where: { isActive: true } });
    }

    return prisma.user.count({
      where: {
        isActive: true,
        roles: {
          some: {
            role: {
              name: { in: targetAudience },
            },
          },
        },
      },
    });
  }

  /**
   * Get active surveys for user
   */
  async getActiveSurveysForUser(userId: string): Promise<Survey[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();

    return prisma.survey.findMany({
      where: {
        status: 'active',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
