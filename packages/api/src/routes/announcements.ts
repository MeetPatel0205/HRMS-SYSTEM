import { Router } from 'express';
import { AnnouncementController } from '../controllers/AnnouncementController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new AnnouncementController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createAnnouncement(req, res, next));
router.get('/', (req, res, next) => controller.getAllAnnouncements(req, res, next));
router.get('/:id', (req, res, next) => controller.getAnnouncement(req, res, next));
router.put('/:id', (req, res, next) => controller.updateAnnouncement(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteAnnouncement(req, res, next));

router.get('/user/:userId/active', (req, res, next) => controller.getActiveAnnouncementsForUser(req, res, next));

export default router;
