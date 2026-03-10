import { Router } from 'express';
import { ScheduleController } from '../controllers/ScheduleController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new ScheduleController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createSchedule(req, res, next));
router.get('/', (req, res, next) => controller.getAllSchedules(req, res, next));
router.get('/:id', (req, res, next) => controller.getSchedule(req, res, next));
router.put('/:id', (req, res, next) => controller.updateSchedule(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteSchedule(req, res, next));

router.get('/employee/:employeeId', (req, res, next) => controller.getEmployeeSchedules(req, res, next));

router.post('/shifts', (req, res, next) => controller.createShift(req, res, next));
router.put('/shifts/:id', (req, res, next) => controller.updateShift(req, res, next));
router.delete('/shifts/:id', (req, res, next) => controller.deleteShift(req, res, next));

router.get('/tenant/:tenantId/stats', (req, res, next) => controller.getScheduleStats(req, res, next));

export default router;
