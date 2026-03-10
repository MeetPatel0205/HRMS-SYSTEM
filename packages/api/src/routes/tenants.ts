import { Router } from 'express';
import { TenantController } from '../controllers/TenantController';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new TenantController();

// All routes require authentication
router.use(authMiddleware);

// Create tenant - Admin only
router.post('/', requirePermission(Permission.SYSTEM_ADMIN), (req, res, next) => controller.createTenant(req, res, next));

// Get all tenants - Admin only
router.get('/', requirePermission(Permission.SYSTEM_ADMIN), (req, res, next) => controller.getAllTenants(req, res, next));

// Get tenant by ID
router.get('/:id', (req, res, next) => controller.getTenant(req, res, next));

// Get tenant stats
router.get('/:id/stats', (req, res, next) => controller.getTenantStats(req, res, next));

// Update tenant - Admin only
router.put('/:id', requirePermission(Permission.SYSTEM_ADMIN), (req, res, next) => controller.updateTenant(req, res, next));

// Delete tenant - Admin only
router.delete('/:id', requirePermission(Permission.SYSTEM_ADMIN), (req, res, next) => controller.deleteTenant(req, res, next));

export default router;
