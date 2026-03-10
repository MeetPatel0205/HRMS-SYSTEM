import { Router } from 'express';
import { ExpenseController } from '../controllers/ExpenseController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new ExpenseController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createExpenseReport(req, res, next));
router.get('/', (req, res, next) => controller.getAllExpenseReports(req, res, next));
router.get('/:id', (req, res, next) => controller.getExpenseReport(req, res, next));
router.put('/:id', (req, res, next) => controller.updateExpenseReport(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteExpenseReport(req, res, next));

router.post('/:id/approve', (req, res, next) => controller.approveExpenseReport(req, res, next));
router.post('/:id/reject', (req, res, next) => controller.rejectExpenseReport(req, res, next));

router.post('/:id/items', (req, res, next) => controller.addExpenseItem(req, res, next));
router.put('/:id/items/:itemId', (req, res, next) => controller.updateExpenseItem(req, res, next));
router.delete('/:id/items/:itemId', (req, res, next) => controller.deleteExpenseItem(req, res, next));

router.get('/tenant/:tenantId/stats', (req, res, next) => controller.getExpenseStats(req, res, next));

export default router;
