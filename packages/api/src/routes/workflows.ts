import { Router } from 'express';
import { WorkflowController } from '../controllers/WorkflowController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new WorkflowController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createWorkflow(req, res, next));
router.get('/', (req, res, next) => controller.getAllWorkflows(req, res, next));
router.get('/:id', (req, res, next) => controller.getWorkflow(req, res, next));
router.put('/:id', (req, res, next) => controller.updateWorkflow(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteWorkflow(req, res, next));

router.post('/:id/start', (req, res, next) => controller.startWorkflowInstance(req, res, next));
router.get('/:id/instances', (req, res, next) => controller.getWorkflowInstances(req, res, next));
router.post('/instances/:instanceId/approve', (req, res, next) => controller.approveWorkflowStep(req, res, next));
router.post('/instances/:instanceId/reject', (req, res, next) => controller.rejectWorkflowStep(req, res, next));

router.get('/:id/stats', (req, res, next) => controller.getWorkflowStats(req, res, next));

export default router;
