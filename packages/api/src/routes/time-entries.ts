import { Router } from 'express';
import { TimeEntryController } from '../controllers/TimeEntryController';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new TimeEntryController();

// All routes require authentication
router.use(authenticate);

// Clock In/Out
router.post('/clock-in', controller.clockIn.bind(controller));
router.post('/clock-out', controller.clockOut.bind(controller));

// Breaks
router.post('/break/start', controller.startBreak.bind(controller));
router.post('/break/end', controller.endBreak.bind(controller));

// Status & History
router.get('/status', controller.getStatus.bind(controller));
router.get('/timesheet', controller.getTimesheet.bind(controller));

export default router;
