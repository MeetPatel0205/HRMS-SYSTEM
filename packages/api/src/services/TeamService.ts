import { PrismaClient, Team, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';
import { ActivityService } from './ActivityService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();
const activityService = new ActivityService();

export class TeamService {
  /**
   * Create a new team
   */
  async createTeam(
    data: Prisma.TeamCreateInput,
    userId: string
  ): Promise<Team> {
    const team = await prisma.team.create({
      data,
      include: {
        members: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'Team',
      resourceId: team.id,
      newValues: team,
    });

    return team;
  }

  /**
   * Get team by ID
   */
  async getTeamById(id: string): Promise<Team | null> {
    return prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
                email: true,
                jobTitle: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get all teams
   */
  async getAllTeams(filters?: {
    isActive?: boolean;
    search?: string;
  }): Promise<Team[]> {
    const where: Prisma.TeamWhereInput = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    return prisma.team.findMany({
      where,
      include: {
        members: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update team
   */
  async updateTeam(
    id: string,
    data: Prisma.TeamUpdateInput,
    userId: string
  ): Promise<Team> {
    const oldTeam = await prisma.team.findUnique({
      where: { id },
    });

    const team = await prisma.team.update({
      where: { id },
      data,
      include: {
        members: true,
      },
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Team',
      resourceId: id,
      oldValues: oldTeam || undefined,
      newValues: team,
    });

    return team;
  }

  /**
   * Delete team
   */
  async deleteTeam(id: string, userId: string): Promise<void> {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    if (team.members.length > 0) {
      throw new Error('Cannot delete team with members');
    }

    await prisma.team.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Team',
      resourceId: id,
      oldValues: team,
    });
  }

  /**
   * Add member to team
   */
  async addMember(
    teamId: string,
    employeeId: string,
    role: string,
    userId: string
  ): Promise<void> {
    await prisma.teamMember.create({
      data: {
        teamId,
        employeeId,
        role,
      },
    });

    await activityService.logActivity({
      userId: employeeId,
      actorId: userId,
      action: 'added',
      entityType: 'Team',
      entityId: teamId,
      description: `Employee added to team`,
      metadata: { role },
    });
  }

  /**
   * Remove member from team
   */
  async removeMember(
    teamId: string,
    employeeId: string,
    userId: string
  ): Promise<void> {
    await prisma.teamMember.deleteMany({
      where: {
        teamId,
        employeeId,
      },
    });

    await activityService.logActivity({
      userId: employeeId,
      actorId: userId,
      action: 'removed',
      entityType: 'Team',
      entityId: teamId,
      description: `Employee removed from team`,
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    teamId: string,
    employeeId: string,
    role: string,
    userId: string
  ): Promise<void> {
    await prisma.teamMember.updateMany({
      where: {
        teamId,
        employeeId,
      },
      data: {
        role,
      },
    });

    await activityService.logActivity({
      userId: employeeId,
      actorId: userId,
      action: 'updated',
      entityType: 'Team',
      entityId: teamId,
      description: `Team member role updated to ${role}`,
      metadata: { role },
    });
  }

  /**
   * Get team statistics
   */
  async getTeamStats(id: string): Promise<{
    memberCount: number;
    activeMembers: number;
  }> {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    return {
      memberCount: team.members.length,
      activeMembers: team.members.filter((m) => m.employee.status === 'active').length,
    };
  }
}
