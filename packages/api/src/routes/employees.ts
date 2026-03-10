import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { requirePermission, requireOwnership } from '../middleware/auth'
import { EmployeeController } from '../controllers/EmployeeController'
import { Permission } from '../shared/types'

const router = Router()
const employeeController = new EmployeeController()

// Employee CRUD routes
router.get('/',
  requirePermission(Permission.READ_EMPLOYEE),
  asyncHandler(employeeController.getEmployees.bind(employeeController))
)

router.get('/:id',
  requireOwnership(req => req.params.id),
  asyncHandler(employeeController.getEmployee.bind(employeeController))
)

router.post('/',
  requirePermission(Permission.WRITE_EMPLOYEE),
  asyncHandler(employeeController.createEmployee.bind(employeeController))
)

router.put('/:id',
  requireOwnership(req => req.params.id),
  asyncHandler(employeeController.updateEmployee.bind(employeeController))
)

router.delete('/:id',
  requirePermission(Permission.DELETE_EMPLOYEE),
  asyncHandler(employeeController.deleteEmployee.bind(employeeController))
)

// Search and filtering
router.get('/statistics',
  requirePermission(Permission.READ_EMPLOYEE),
  asyncHandler(employeeController.getStatistics.bind(employeeController))
)

router.post('/search',
  requirePermission(Permission.READ_EMPLOYEE),
  asyncHandler(employeeController.searchEmployees.bind(employeeController))
)

// Organizational structure
router.get('/organization/chart',
  requirePermission(Permission.READ_EMPLOYEE),
  asyncHandler(employeeController.getOrganizationChart.bind(employeeController))
)

router.get('/organization/stats',
  requirePermission(Permission.READ_EMPLOYEE),
  asyncHandler(employeeController.getHierarchyStats.bind(employeeController))
)

router.get('/organization/reporting-chain/:employeeId',
  requirePermission(Permission.READ_EMPLOYEE),
  asyncHandler(employeeController.getReportingChain.bind(employeeController))
)

router.get('/organization/level/:level',
  requirePermission(Permission.READ_EMPLOYEE),
  asyncHandler(employeeController.getEmployeesByLevel.bind(employeeController))
)

router.put('/organization/reporting-structure',
  requirePermission(Permission.WRITE_EMPLOYEE),
  asyncHandler(employeeController.updateReportingStructure.bind(employeeController))
)

router.get('/manager/:managerId/reports',
  requirePermission(Permission.READ_EMPLOYEE),
  asyncHandler(employeeController.getEmployeesByManager.bind(employeeController))
)

export default router