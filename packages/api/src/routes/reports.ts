import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new ReportController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createReport(req, res, next));
router.get('/', (req, res, next) => controller.getAllReports(req, res, next));
router.get('/:id', (req, res, next) => controller.getReport(req, res, next));
router.put('/:id', (req, res, next) => controller.updateReport(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteReport(req, res, next));

router.post('/:id/execute', (req, res, next) => controller.executeReport(req, res, next));
router.get('/:id/executions', (req, res, next) => controller.getReportExecutions(req, res, next));
router.get('/executions/:executionId', (req, res, next) => controller.getExecutionById(req, res, next));

router.get('/tenant/:tenantId/stats', (req, res, next) => controller.getReportStats(req, res, next));

export default router;
