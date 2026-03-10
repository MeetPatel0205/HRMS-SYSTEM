import { Router } from 'express';
import { SystemSettingController } from '../controllers/SystemSettingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new SystemSettingController();

router.use(authMiddleware);

router.get('/public', (req, res, next) => controller.getPublicSettings(req, res, next));
router.get('/', (req, res, next) => controller.getAllSettings(req, res, next));
router.get('/key/:key', (req, res, next) => controller.getSettingByKey(req, res, next));
router.get('/category/:category', (req, res, next) => controller.getSettingsByCategory(req, res, next));

router.post('/', (req, res, next) => controller.upsertSetting(req, res, next));
router.put('/:key', (req, res, next) => controller.updateSetting(req, res, next));
router.delete('/:key', (req, res, next) => controller.deleteSetting(req, res, next));

export default router;
