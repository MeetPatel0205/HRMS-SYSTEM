import { Router } from 'express';
import { PayrollController } from '../controllers/PayrollController';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new PayrollController();

router.use(authenticate);

// Admin: Simulate Payroll Run
router.post('/runs/simulate',
    requirePermission(Permission.PROCESS_PAYROLL),
    controller.simulate.bind(controller)
);

// Admin: Create Draft Run
router.post('/runs',
    requirePermission(Permission.PROCESS_PAYROLL),
    controller.createRun.bind(controller)
);

// Admin: Submit Run for Approval
router.put('/runs/:id/submit',
    requirePermission(Permission.PROCESS_PAYROLL),
    controller.submitRun.bind(controller)
);

// Admin: Approve Run
router.put('/runs/:id/approve',
    requirePermission(Permission.PROCESS_PAYROLL),
    controller.approveRun.bind(controller)
);

// Admin: Export Bank File
router.get('/export-bank-file',
    requirePermission(Permission.PROCESS_PAYROLL),
    controller.exportBankFile.bind(controller)
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
