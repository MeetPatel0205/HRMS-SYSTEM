import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { requirePermission, requirePermissions } from '../middleware/auth'
import { RoleController } from '../controllers/RoleController'
import { Permission } from '../shared/types'

const router = Router()
const roleController = new RoleController()

// Role CRUD routes
router.get('/', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.getRoles.bind(roleController))
)

router.get('/:id', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.getRole.bind(roleController))
)

router.post('/', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.createRole.bind(roleController))
)

router.put('/:id', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.updateRole.bind(roleController))
)

router.delete('/:id', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.deleteRole.bind(roleController))
)

// Role assignment routes
router.post('/assign', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.assignRole.bind(roleController))
)

router.delete('/users/:userId/roles/:roleId', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.removeRole.bind(roleController))
)

// User role and permission queries
router.get('/users/:userId/roles', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.getUserRoles.bind(roleController))
)

router.get('/users/:userId/permissions', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.getUserPermissions.bind(roleController))
)

router.post('/check-permission', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.checkPermission.bind(roleController))
)

// Role membership queries
router.get('/:roleId/users', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.getUsersWithRole.bind(roleController))
)

router.get('/permissions/:permission/users', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.getUsersWithPermission.bind(roleController))
)

// System administration
router.post('/initialize', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(roleController.initializeRoles.bind(roleController))
)

export default router