import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/ProjectService';
import { successResponse, errorResponse } from '../shared/responses';

const projectService = new ProjectService();

export class ProjectController {
  async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.createProject(req.body, req.user!.id);
      return successResponse(res, project, 'Project created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getProjectById(req.params.id);
      if (!project) return errorResponse(res, 'Project not found', 404);
      return successResponse(res, project);
    } catch (error) {
      return next(error);
    }
  }

  async getAllProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, search } = req.query;
      const projects = await projectService.getAllProjects({
        status: status as string,
        search: search as string
      });
      return successResponse(res, projects);
    } catch (error) {
      return next(error);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.updateProject(req.params.id, req.body, req.user!.id);
      return successResponse(res, project, 'Project updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      await projectService.deleteProject(req.params.id, req.user!.id);
      return successResponse(res, null, 'Project deleted successfully');
    } catch (error) {
      return next(error);
    }
  }

  async getProjectStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await projectService.getProjectStats(req.params.id);
      return successResponse(res, stats);
    } catch (error) {
      return next(error);
    }
  }

  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await projectService.createTask(req.body, req.user!.id);
      return successResponse(res, task, 'Task created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  async getTask(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await projectService.getTaskById(req.params.taskId);
      if (!task) return errorResponse(res, 'Task not found', 404);
      return successResponse(res, task);
    } catch (error) {
      return next(error);
    }
  }

  async getProjectTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, priority, assignedTo } = req.query;
      const tasks = await projectService.getProjectTasks(req.params.id, {
        status: status as string,
        priority: priority as string,
        assigneeId: assignedTo as string
      });
      return successResponse(res, tasks);
    } catch (error) {
      return next(error);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await projectService.updateTask(req.params.taskId, req.body, req.user!.id);
      return successResponse(res, task, 'Task updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
      await projectService.deleteTask(req.params.taskId, req.user!.id);
      return successResponse(res, null, 'Task deleted successfully');
    } catch (error) {
      return next(error);
    }
  }

  async getEmployeeTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, priority, projectId } = req.query;
      const tasks = await projectService.getEmployeeTasks(req.params.employeeId, {
        status: status as string,
        priority: priority as string,
        projectId: projectId as string
      });
      return successResponse(res, tasks);
    } catch (error) {
      return next(error);
    }
  }
}
