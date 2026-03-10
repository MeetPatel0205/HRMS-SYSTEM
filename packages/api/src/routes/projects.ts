import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new ProjectController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createProject(req, res, next));
router.get('/', (req, res, next) => controller.getAllProjects(req, res, next));
router.get('/:id', (req, res, next) => controller.getProject(req, res, next));
router.put('/:id', (req, res, next) => controller.updateProject(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteProject(req, res, next));

router.post('/:id/tasks', (req, res, next) => controller.createTask(req, res, next));
router.put('/:id/tasks/:taskId', (req, res, next) => controller.updateTask(req, res, next));
router.delete('/:id/tasks/:taskId', (req, res, next) => controller.deleteTask(req, res, next));

router.get('/:id/stats', (req, res, next) => controller.getProjectStats(req, res, next));

export default router;
