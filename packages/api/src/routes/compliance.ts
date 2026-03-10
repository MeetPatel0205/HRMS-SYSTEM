import { Router } from 'express';
import { ComplianceController } from '../controllers/ComplianceController';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new ComplianceController();

router.use(authenticate);

// Public/Employee Routes
router.get('/my-records',
    requirePermission(Permission.READ_COMPLIANCE),
    controller.getMyRecords.bind(controller)
);

router.post('/records/:id/proof',
    requirePermission(Permission.READ_COMPLIANCE), // Employee submitting proof
    controller.submitProof.bind(controller)
);

// Admin Routes
router.get('/requirements',
    requirePermission(Permission.READ_COMPLIANCE), // All can see requirements
    controller.getRequirements.bind(controller)
);

router.post('/requirements',
    requirePermission(Permission.WRITE_COMPLIANCE),
    controller.createRequirement.bind(controller)
);

router.put('/requirements/:id',
    requirePermission(Permission.WRITE_COMPLIANCE),
    controller.updateRequirement.bind(controller)
);

router.post('/assign',
    requirePermission(Permission.WRITE_COMPLIANCE),
    controller.assign.bind(controller)
);

router.get('/stats',
    requirePermission(Permission.WRITE_COMPLIANCE),
    controller.getStats.bind(controller)
);

export default router;
