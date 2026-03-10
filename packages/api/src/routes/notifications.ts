import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new NotificationController();

router.use(authMiddleware);

router.get('/user/:userId', (req, res, next) => controller.getUserNotifications(req, res, next));
router.get('/user/:userId/unread-count', (req, res, next) => controller.getUnreadCount(req, res, next));
router.put('/:id/read', (req, res, next) => controller.markAsRead(req, res, next));
router.put('/user/:userId/read-all', (req, res, next) => controller.markAllAsRead(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteNotification(req, res, next));

router.post('/send-to-role', (req, res, next) => controller.sendToRole(req, res, next));
router.post('/send-to-tenant', (req, res, next) => controller.sendToTenant(req, res, next));

export default router;
