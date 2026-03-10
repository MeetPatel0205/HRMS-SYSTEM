import { Request, Response, NextFunction } from 'express';
import { AnnouncementService } from '../services/AnnouncementService';
import { successResponse, errorResponse } from '../shared/responses';
import { logger } from '../utils/logger';

export class AnnouncementController {
  private announcementService: AnnouncementService;

  constructor() {
    this.announcementService = new AnnouncementService();
  }

  async createAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const announcement = await this.announcementService.createAnnouncement(req.body, userId);
      successResponse(res, announcement, 'Announcement created successfully', 201);
    } catch (error) {
      logger.error('Error creating announcement:', error);
      return next(error);
    }
  }

  async getAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const announcement = await this.announcementService.getAnnouncementById(id);
      
      if (!announcement) {
        errorResponse(res, 'Announcement not found', 404);
        return;
      }
      
      successResponse(res, announcement, 'Announcement retrieved successfully');
    } catch (error) {
      logger.error('Error getting announcement:', error);
      return next(error);
    }
  }

  async getAllAnnouncements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, priority, status } = req.query;
      
      const filters: any = {};
      if (tenantId) filters.tenantId = tenantId as string;
      if (priority) filters.priority = priority as string;
      if (status) filters.status = status as string;
      
      const announcements = await this.announcementService.getAllAnnouncements(filters);
      successResponse(res, announcements, 'Announcements retrieved successfully');
    } catch (error) {
      logger.error('Error getting announcements:', error);
      return next(error);
    }
  }

  async updateAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const announcement = await this.announcementService.updateAnnouncement(id, req.body, userId);
      successResponse(res, announcement, 'Announcement updated successfully');
    } catch (error) {
      logger.error('Error updating announcement:', error);
      return next(error);
    }
  }

  async deleteAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await this.announcementService.deleteAnnouncement(id, userId);
      successResponse(res, null, 'Announcement deleted successfully');
    } catch (error) {
      logger.error('Error deleting announcement:', error);
      return next(error);
    }
  }

  async getActiveAnnouncementsForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const announcements = await this.announcementService.getActiveAnnouncementsForUser(userId);
      successResponse(res, announcements, 'Active announcements retrieved successfully');
    } catch (error) {
      logger.error('Error getting active announcements:', error);
      return next(error);
    }
  }
}
