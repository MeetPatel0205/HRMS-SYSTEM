import { Router } from 'express';
import { PerformanceController } from '../controllers/PerformanceController';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new PerformanceController();

router.use(authenticate);

// List my reviews (as employee)
router.get('/my-reviews',
    requirePermission(Permission.READ_PERFORMANCE),
    controller.getMyReviews.bind(controller)
);

// List reviews I need to conduct (as manager)
router.get('/to-conduct',
    requirePermission(Permission.WRITE_PERFORMANCE),
    controller.getReviewsToConduct.bind(controller)
);

// Create new review (HR/Admin/Manager)
router.post('/',
    requirePermission(Permission.WRITE_PERFORMANCE),
    controller.createReview.bind(controller)
);

// Get specific review
router.get('/:id',
    requirePermission(Permission.READ_PERFORMANCE),
    controller.getReview.bind(controller)
);

// Update review content
router.put('/:id',
    requirePermission(Permission.WRITE_PERFORMANCE),
    controller.updateReview.bind(controller)
);

// Submit review
router.post('/:id/submit',
    requirePermission(Permission.WRITE_PERFORMANCE),
    controller.submitReview.bind(controller)
);

// Approve review
router.post('/:id/approve',
    requirePermission(Permission.WRITE_PERFORMANCE),
    controller.approveReview.bind(controller)
);

export default router;
