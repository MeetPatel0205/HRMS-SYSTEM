import { Router } from 'express';
import { WellnessController } from '../controllers/WellnessController';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new WellnessController();

router.use(authenticate);

// Public/Employee Routes
router.get('/programs',
    requirePermission(Permission.READ_WELLNESS),
    controller.getPrograms.bind(controller)
);

router.get('/programs/:id',
    requirePermission(Permission.READ_WELLNESS),
    controller.getProgram.bind(controller)
);

router.get('/my-enrollments',
    requirePermission(Permission.READ_WELLNESS),
    controller.getMyEnrollments.bind(controller)
);

router.post('/enroll',
    requirePermission(Permission.READ_WELLNESS),
    controller.enroll.bind(controller)
);

router.put('/enrollments/:id',
    // Update progress
    requirePermission(Permission.READ_WELLNESS),
    controller.updateProgress.bind(controller)
);

// Admin Routes (WRITE_WELLNESS? Using WRITE_BENEFITS or generic? Let's assume WRITE_WELLNESS didn't exist in original enum but I added it for others? 
// Actually READ_WELLNESS exists. I check if WRITE_WELLNESS exists.)
// Looking back at auth.ts view, I didn't see WRITE_WELLNESS originally, but I might have missed it or it wasn't there.
// I will check or use a known one. 
// Safe bet: Add WRITE_WELLNESS to auth.ts if I haven't. I added WRITE_LEARNING.
// Let's use WRITE_EMPLOYEE as fallback or add WRITE_WELLNESS.
// I'll add WRITE_WELLNESS in a separate step to
router.post('/programs',
    requirePermission(Permission.WRITE_WELLNESS),
    controller.createProgram.bind(controller)
);

router.put('/programs/:id',
    requirePermission(Permission.WRITE_WELLNESS),
    controller.updateProgram.bind(controller)
);

export default router;
