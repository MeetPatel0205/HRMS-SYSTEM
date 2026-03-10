import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new DocumentController();

router.use(authenticate);

// Public/Employee Routes
router.get('/',
    requirePermission(Permission.READ_DOCUMENTS),
    controller.getAll.bind(controller)
);

router.get('/:id',
    requirePermission(Permission.READ_DOCUMENTS),
    controller.getById.bind(controller)
);

// Admin Routes
router.post('/',
    requirePermission(Permission.WRITE_DOCUMENTS),
    controller.create.bind(controller)
);

router.put('/:id',
    requirePermission(Permission.WRITE_DOCUMENTS),
    controller.update.bind(controller)
);

router.delete('/:id',
    requirePermission(Permission.WRITE_DOCUMENTS),
    controller.delete.bind(controller)
);

export default router;
