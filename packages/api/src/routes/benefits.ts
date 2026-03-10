import { Router } from 'express';
import { BenefitsController } from '../controllers/BenefitsController';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new BenefitsController();

router.use(authenticate);

// Public/Employee Routes
router.get('/plans',
    requirePermission(Permission.READ_BENEFITS),
    controller.getPlans.bind(controller)
);

router.get('/plans/:id',
    requirePermission(Permission.READ_BENEFITS),
    controller.getPlan.bind(controller)
);

router.get('/my-enrollments',
    requirePermission(Permission.READ_BENEFITS),
    controller.getMyEnrollments.bind(controller)
);

router.post('/enroll',
    // Need a specific ENROLL permission? Or just READ_BENEFITS + User role?
    // WRITE_BENEFITS usually implies Admin. 
    // Let's assume READ_BENEFITS allows enrolling effectively for self.
    // Or we could check Permission.READ_BENEFITS since Employees have it.
    requirePermission(Permission.READ_BENEFITS),
    controller.enroll.bind(controller)
);

router.post('/enrollments/:id/terminate',
    requirePermission(Permission.READ_BENEFITS),
    controller.terminateEnrollment.bind(controller)
);


// Admin Routes
router.post('/plans',
    requirePermission(Permission.WRITE_BENEFITS),
    controller.createPlan.bind(controller)
);

router.put('/plans/:id',
    requirePermission(Permission.WRITE_BENEFITS),
    controller.updatePlan.bind(controller)
);

router.delete('/plans/:id',
    requirePermission(Permission.WRITE_BENEFITS),
    controller.deletePlan.bind(controller)
);

export default router;
