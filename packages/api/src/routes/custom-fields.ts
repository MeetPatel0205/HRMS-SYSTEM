import { Router } from 'express';
import { CustomFieldController } from '../controllers/CustomFieldController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new CustomFieldController();

router.use(authMiddleware);

router.post('/', (req, res, next) => controller.createCustomField(req, res, next));
router.get('/:id', (req, res, next) => controller.getCustomField(req, res, next));
router.put('/:id', (req, res, next) => controller.updateCustomField(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteCustomField(req, res, next));

router.get('/entity/:entityType', (req, res, next) => controller.getCustomFieldsByEntity(req, res, next));

export default router;
