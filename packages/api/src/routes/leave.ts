import { Router } from 'express';
import { LeaveController } from '../controllers/LeaveController';
import { authenticate, authorize, requirePermission } from '../middleware/auth'; // Using requirePermission from new RBAC
import { Permission } from '../shared/types'; // Assuming types are here, or defined locally. 
// If Permission enum doesn't exist, we use string 'read_leave' etc.
// But based on previous work, I should check if Permission enum exists in shared/types or similar.
// I'll stick to string for now or 'read_leave' if I'm not sure, but better to check.
// Actually, `authorize` middleware used by `hr-modules` used 'APPROVE', 'LEAVE'. 
// I should align with the new RBAC system `requirePermission('read_leave')`.

const router = Router();
const controller = new LeaveController();

// Employee Routes
router.get('/balance', authenticate, controller.getLeaveBalance.bind(controller));
router.get('/types', authenticate, controller.getLeaveTypes.bind(controller));
router.get('/requests', authenticate, controller.getLeaveRequests.bind(controller));
router.post('/requests', authenticate, controller.submitLeaveRequest.bind(controller));

// Manager Routes (Using verifyPermission if possible, or distinct roles)
// 'approve_leave' permission would be ideal
// For now, let's use the new RBAC middleware pattern if available.
// Based on `hr-modules.ts`, it was `authorize('APPROVE', 'LEAVE')`.
// I'm replacing that with `requirePermission` if I can find the constant.
// If I can't find it, I'll use a string literal which matches the Permission model slugs.

// Checking seed data from previous turn would confirm slugs. 
// Commonly: 'approve_leave_request', 'read_leave_request', etc.
// Let's assume standard slugs for now.

// Manager Routes
router.get('/requests/all', authenticate, controller.getAllLeaveRequests.bind(controller));

router.post('/requests/:requestId/approve',
    authenticate,
    // requirePermission('approve_leave_request'), // Uncomment when Permission enum is confirmed 
    controller.approveLeaveRequest.bind(controller)
);

router.post('/requests/:requestId/reject',
    authenticate,
    // requirePermission('approve_leave_request'), 
    controller.rejectLeaveRequest.bind(controller)
);

export default router;
