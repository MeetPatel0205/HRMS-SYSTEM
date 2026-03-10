import { Router } from 'express';
import { RecruitmentController } from '../controllers/RecruitmentController';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new RecruitmentController();

// Public-ish routes (Authenticity required for now, or use a separate public endpoint)
// For now, we assume authenticated users (Internal Job Board)
router.use(authenticate);

// Jobs
router.get('/jobs',
    requirePermission(Permission.READ_RECRUITMENT),
    controller.getJobs.bind(controller)
);

router.get('/jobs/:id',
    requirePermission(Permission.READ_RECRUITMENT),
    controller.getJob.bind(controller)
);

// Admin / HR Management of Jobs
router.post('/jobs',
    requirePermission(Permission.WRITE_RECRUITMENT),
    controller.createJob.bind(controller)
);

router.put('/jobs/:id',
    requirePermission(Permission.WRITE_RECRUITMENT),
    controller.updateJob.bind(controller)
);

router.post('/jobs/:id/publish',
    requirePermission(Permission.WRITE_RECRUITMENT),
    controller.publishJob.bind(controller)
);

router.post('/jobs/:id/close',
    requirePermission(Permission.WRITE_RECRUITMENT),
    controller.closeJob.bind(controller)
);

// Applications
router.post('/apply',
    requirePermission(Permission.READ_RECRUITMENT), // Employees can apply? Or create separate "apply" perm? Using Read for now or None if public.
    controller.apply.bind(controller)
);

router.get('/applications',
    requirePermission(Permission.WRITE_RECRUITMENT), // Only HR sees all apps
    controller.getApplications.bind(controller)
);

router.put('/applications/:id/status',
    requirePermission(Permission.WRITE_RECRUITMENT),
    controller.updateApplicationStatus.bind(controller)
);

// Interviews
router.post('/interviews',
    requirePermission(Permission.WRITE_RECRUITMENT),
    controller.scheduleInterview.bind(controller)
);

export default router;
