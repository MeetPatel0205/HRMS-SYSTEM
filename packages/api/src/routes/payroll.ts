import { Router } from 'express';
import { PayrollController } from '../controllers/PayrollController';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new PayrollController();

router.use(authenticate);

// Admin: Process Payroll
router.post('/process',
    requirePermission(Permission.PROCESS_PAYROLL),
    controller.processPayroll.bind(controller)
);

// Employee: View History
router.get('/history',
    requirePermission(Permission.READ_PAYROLL),
    controller.getHistory.bind(controller)
);

// Employee: View Specific Slip
router.get('/:id',
    requirePermission(Permission.READ_PAYROLL),
    controller.getPayrollEntry.bind(controller)
);

export default router;
