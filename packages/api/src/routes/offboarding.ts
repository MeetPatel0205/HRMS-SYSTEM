import { Router } from 'express';
import { OffboardingController } from '../controllers/OffboardingController';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new OffboardingController();

router.use(authenticate);

// Employee Steps
router.post('/requests',
    // Any employee can resign? Or need permission? 
    // Assuming strictly standard flow for now.
    controller.createRequest.bind(controller)
);

router.get('/my-requests',
    controller.getRequests.bind(controller)
);

// Admin Routes
router.get('/requests',
    requirePermission(Permission.READ_OFFBOARDING),
    controller.getRequests.bind(controller)
);

router.put('/requests/:id',
    requirePermission(Permission.WRITE_OFFBOARDING),
    controller.updateRequest.bind(controller)
);

router.post('/requests/:id/assets',
    requirePermission(Permission.WRITE_OFFBOARDING),
    controller.addAsset.bind(controller)
);

router.put('/assets/:id',
    requirePermission(Permission.WRITE_OFFBOARDING),
    controller.updateAsset.bind(controller)
);

export default router;
