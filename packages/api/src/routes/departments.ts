import { Router } from 'express';
import { DepartmentController } from '../controllers/DepartmentController';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { Permission } from '@hrms/shared';

const router = Router();
const controller = new DepartmentController();

// All routes require authentication
router.use(authMiddleware);

// Create department
router.post('/', requirePermission(Permission.WRITE_EMPLOYEE), (req, res, next) => controller.createDepartment(req, res, next));

// Get all departments
router.get('/', (req, res, next) => controller.getAllDepartments(req, res, next));

// Get department hierarchy
router.get('/hierarchy', (req, res, next) => controller.getDepartmentHierarchy(req, res, next));

// Get department by ID
router.get('/:id', (req, res, next) => controller.getDepartment(req, res, next));

// Get department stats
router.get('/:id/stats', (req, res, next) => controller.getDepartmentStats(req, res, next));

// Update department
router.put('/:id', requirePermission(Permission.WRITE_EMPLOYEE), (req, res, next) => controller.updateDepartment(req, res, next));

// Delete department
router.delete('/:id', requirePermission(Permission.WRITE_EMPLOYEE), (req, res, next) => controller.deleteDepartment(req, res, next));

export default router;
