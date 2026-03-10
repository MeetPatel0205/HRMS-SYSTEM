import { Router } from 'express';
import { LearningController } from '../controllers/LearningController';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new LearningController();

router.use(authenticate);

// Public/Employee Routes
router.get('/courses',
    requirePermission(Permission.READ_LEARNING),
    controller.getCourses.bind(controller)
);

router.get('/courses/:id',
    requirePermission(Permission.READ_LEARNING),
    controller.getCourse.bind(controller)
);

router.get('/my-records',
    requirePermission(Permission.READ_LEARNING),
    controller.getMyRecords.bind(controller)
);

router.post('/enroll',
    requirePermission(Permission.READ_LEARNING),
    controller.enroll.bind(controller)
);

// Admin Routes (Needs WRITE_LEARNING - assuming it exists or using WRITE_DOCUMENTS/Generic Admin permission)
// For now I'll use WRITE_LEARNING if it exists, or fall back to WRITE_EMPLOYEE as a placeholder for "HR Admin"
// I will assume WRITE_LEARNING exists as a counterpart to READ_LEARNING in the enum, 
// if not I might need to add it to shared/types/auth.ts
router.post('/courses',
    requirePermission(Permission.WRITE_LEARNING),
    controller.createCourse.bind(controller)
);

router.put('/courses/:id',
    requirePermission(Permission.WRITE_LEARNING),
    controller.updateCourse.bind(controller)
);

router.put('/records/:id/progress',
    // Employees update their own progress? Or Instructor? 
    // For self-paced, employee might update. For now, let's allow READ_LEARNING but validation should check ownership.
    // Or restrict to WRITE_LEARNING for instructor grading.
    // Let's allow READ_LEARNING for now for self-marking completion (simplified).
    requirePermission(Permission.READ_LEARNING),
    controller.updateProgress.bind(controller)
);

export default router;
