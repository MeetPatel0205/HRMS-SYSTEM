import { Request, Response, NextFunction } from 'express';
import { CandidateService } from '../services/CandidateService';
import { successResponse, errorResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class CandidateController {
  private candidateService: CandidateService;

  constructor() {
    this.candidateService = new CandidateService();
  }

  async createCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '';
      const candidate = await this.candidateService.createCandidate(req.body, userId);
      successResponse(res, candidate, 'Candidate created successfully', 201);
    } catch (error) {
      logger.error('Error creating candidate:', error);
      return next(error);
    }
  }

  async getCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const candidate = await this.candidateService.getCandidateById(id);

      if (!candidate) {
        errorResponse(res, 'Candidate not found', 404);
        return;
      }

      successResponse(res, candidate, 'Candidate retrieved successfully');
    } catch (error) {
      logger.error('Error getting candidate:', error);
      return next(error);
    }
  }

  async getAllCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, source } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (source) filters.source = source as string;

      const candidates = await this.candidateService.getAllCandidates(filters);
      successResponse(res, candidates, 'Candidates retrieved successfully');
    } catch (error) {
      logger.error('Error getting candidates:', error);
      return next(error);
    }
  }

  async updateCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '';
      const candidate = await this.candidateService.updateCandidate(id, req.body, userId);
      successResponse(res, candidate, 'Candidate updated successfully');
    } catch (error) {
      logger.error('Error updating candidate:', error);
      return next(error);
    }
  }

  async updateCandidateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.id || '';
      const candidate = await this.candidateService.updateCandidateStatus(id, status, userId);
      successResponse(res, candidate, 'Candidate status updated successfully');
    } catch (error) {
      logger.error('Error updating candidate status:', error);
      return next(error);
    }
  }

  async deleteCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '';
      await this.candidateService.deleteCandidate(id, userId);
      successResponse(res, null, 'Candidate deleted successfully');
    } catch (error) {
      logger.error('Error deleting candidate:', error);
      return next(error);
    }
  }
}
