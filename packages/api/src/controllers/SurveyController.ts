import { Request, Response, NextFunction } from 'express';
import { SurveyService } from '../services/SurveyService';
import { successResponse, errorResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class SurveyController {
  private surveyService: SurveyService;

  constructor() {
    this.surveyService = new SurveyService();
  }

  async createSurvey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const survey = await this.surveyService.createSurvey(req.body, userId);
      successResponse(res, survey, 'Survey created successfully', 201);
    } catch (error) {
      logger.error('Error creating survey:', error);
      return next(error);
    }
  }

  async getSurvey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const survey = await this.surveyService.getSurveyById(id);
      
      if (!survey) {
        errorResponse(res, 'Survey not found', 404);
        return;
      }
      
      successResponse(res, survey, 'Survey retrieved successfully');
    } catch (error) {
      logger.error('Error getting survey:', error);
      return next(error);
    }
  }

  async getAllSurveys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, status, type } = req.query;
      
      const filters: any = {};
      if (tenantId) filters.tenantId = tenantId as string;
      if (status) filters.status = status as string;
      if (type) filters.type = type as string;
      
      const surveys = await this.surveyService.getAllSurveys(filters);
      successResponse(res, surveys, 'Surveys retrieved successfully');
    } catch (error) {
      logger.error('Error getting surveys:', error);
      return next(error);
    }
  }

  async updateSurvey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const survey = await this.surveyService.updateSurvey(id, req.body, userId);
      successResponse(res, survey, 'Survey updated successfully');
    } catch (error) {
      logger.error('Error updating survey:', error);
      return next(error);
    }
  }

  async deleteSurvey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await this.surveyService.deleteSurvey(id, userId);
      successResponse(res, null, 'Survey deleted successfully');
    } catch (error) {
      logger.error('Error deleting survey:', error);
      return next(error);
    }
  }

  async submitResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const response = await this.surveyService.submitResponse(req.body, userId);
      successResponse(res, response, 'Survey response submitted successfully', 201);
    } catch (error) {
      logger.error('Error submitting survey response:', error);
      return next(error);
    }
  }

  async getSurveyResponses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const responses = await this.surveyService.getSurveyResponses(id);
      successResponse(res, responses, 'Survey responses retrieved successfully');
    } catch (error) {
      logger.error('Error getting survey responses:', error);
      return next(error);
    }
  }

  async getUserResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, userId } = req.params;
      const response = await this.surveyService.getUserResponse(id, userId);
      successResponse(res, response, 'User response retrieved successfully');
    } catch (error) {
      logger.error('Error getting user response:', error);
      return next(error);
    }
  }

  async getSurveyStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await this.surveyService.getSurveyStats(id);
      successResponse(res, stats, 'Survey stats retrieved successfully');
    } catch (error) {
      logger.error('Error getting survey stats:', error);
      return next(error);
    }
  }

  async getActiveSurveysForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const surveys = await this.surveyService.getActiveSurveysForUser(userId);
      successResponse(res, surveys, 'Active surveys retrieved successfully');
    } catch (error) {
      logger.error('Error getting active surveys:', error);
      return next(error);
    }
  }
}
