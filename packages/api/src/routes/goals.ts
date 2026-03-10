import { Router } from 'express';
import { GoalController } from '../controllers/GoalController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new GoalController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createGoal(req, res, next));
router.get('/', (req, res, next) => controller.getAllGoals(req, res, next));
router.get('/:id', (req, res, next) => controller.getGoal(req, res, next));
router.put('/:id', (req, res, next) => controller.updateGoal(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteGoal(req, res, next));

router.put('/:id/progress', (req, res, next) => controller.updateProgress(req, res, next));
router.get('/employee/:employeeId', (req, res, next) => controller.getEmployeeGoals(req, res, next));
router.get('/tenant/:tenantId/stats', (req, res, next) => controller.getGoalStats(req, res, next));

export default router;
