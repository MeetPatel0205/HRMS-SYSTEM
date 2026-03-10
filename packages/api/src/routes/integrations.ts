import { Router } from 'express';
import { IntegrationController } from '../controllers/IntegrationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new IntegrationController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createIntegration(req, res, next));
router.get('/', (req, res, next) => controller.getAllIntegrations(req, res, next));
router.get('/:id', (req, res, next) => controller.getIntegration(req, res, next));
router.put('/:id', (req, res, next) => controller.updateIntegration(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteIntegration(req, res, next));

router.post('/:id/logs', (req, res, next) => controller.logIntegrationActivity(req, res, next));
router.get('/:id/logs', (req, res, next) => controller.getIntegrationLogs(req, res, next));

export default router;
