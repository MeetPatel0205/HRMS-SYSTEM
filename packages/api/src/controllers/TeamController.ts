import { Request, Response, NextFunction } from 'express';
import { TeamService } from '../services/TeamService';
import { successResponse, errorResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class TeamController {
  private teamService: TeamService;

  constructor() {
    this.teamService = new TeamService();
  }

  async createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const team = await this.teamService.createTeam(req.body, userId);
      successResponse(res, team, 'Team created successfully', 201);
    } catch (error) {
      logger.error('Error creating team:', error);
      return next(error);
    }
  }

  async getTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const team = await this.teamService.getTeamById(id);
      
      if (!team) {
        errorResponse(res, 'Team not found', 404);
        return;
      }
      
      successResponse(res, team, 'Team retrieved successfully');
    } catch (error) {
      logger.error('Error getting team:', error);
      return next(error);
    }
  }

  async getAllTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status as string;
      
      const teams = await this.teamService.getAllTeams(filters);
      successResponse(res, teams, 'Teams retrieved successfully');
    } catch (error) {
      logger.error('Error getting teams:', error);
      return next(error);
    }
  }

  async updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const team = await this.teamService.updateTeam(id, req.body, userId);
      successResponse(res, team, 'Team updated successfully');
    } catch (error) {
      logger.error('Error updating team:', error);
      return next(error);
    }
  }

  async deleteTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await this.teamService.deleteTeam(id, userId);
      successResponse(res, null, 'Team deleted successfully');
    } catch (error) {
      logger.error('Error deleting team:', error);
      return next(error);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { employeeId, role } = req.body;
      const userId = req.user!.id;
      await this.teamService.addMember(id, employeeId, role, userId);
      successResponse(res, null, 'Member added successfully', 201);
    } catch (error) {
      logger.error('Error adding member:', error);
      return next(error);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, memberId } = req.params;
      const userId = req.user!.id;
      await this.teamService.removeMember(id, memberId, userId);
      successResponse(res, null, 'Member removed successfully');
    } catch (error) {
      logger.error('Error removing member:', error);
      return next(error);
    }
  }

  async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, memberId } = req.params;
      const { role } = req.body;
      const userId = req.user!.id;
      await this.teamService.updateMemberRole(id, memberId, role, userId);
      successResponse(res, null, 'Member role updated successfully');
    } catch (error) {
      logger.error('Error updating member role:', error);
      return next(error);
    }
  }

  async getTeamStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await this.teamService.getTeamStats(id);
      successResponse(res, stats, 'Team stats retrieved successfully');
    } catch (error) {
      logger.error('Error getting team stats:', error);
      return next(error);
    }
  }
}
