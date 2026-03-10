import { Router } from 'express';
import { ActivityController } from '../controllers/ActivityController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new ActivityController();

router.use(authMiddleware);

router.get('/user/:userId', (req, res, next) => controller.getUserActivityFeed(req, res, next));
router.get('/tenant/:tenantId', (req, res, next) => controller.getGlobalActivityFeed(req, res, next));
router.get('/entity/:entityType/:entityId', (req, res, next) => controller.getEntityActivityHistory(req, res, next));
router.get('/tenant/:tenantId/stats', (req, res, next) => controller.getActivityStats(req, res, next));

export default router;
