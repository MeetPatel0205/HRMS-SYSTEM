import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { requirePermission } from '../middleware/auth'
import { AuditController } from '../controllers/AuditController'
import { Permission } from '../shared/types'

const router = Router()
const auditController = new AuditController()

// Audit log query routes
router.get('/', 
  requirePermission(Permission.AUDIT_LOGS), 
  asyncHandler(auditController.getAuditLogs.bind(auditController))
)

router.get('/summary', 
  requirePermission(Permission.AUDIT_LOGS), 
  asyncHandler(auditController.getAuditSummary.bind(auditController))
)

router.get('/statistics', 
  requirePermission(Permission.AUDIT_LOGS), 
  asyncHandler(auditController.getAuditStatistics.bind(auditController))
)

router.get('/suspicious', 
  requirePermission(Permission.AUDIT_LOGS), 
  asyncHandler(auditController.getSuspiciousActivity.bind(auditController))
)

router.get('/anomalies', 
  requirePermission(Permission.AUDIT_LOGS), 
  asyncHandler(auditController.detectAnomalies.bind(auditController))
)

router.get('/:id', 
  requirePermission(Permission.AUDIT_LOGS), 
  asyncHandler(auditController.getAuditLogById.bind(auditController))
)

// Resource-specific audit trails
router.get('/resource/:resource/:resourceId', 
  requirePermission(Permission.AUDIT_LOGS), 
  asyncHandler(auditController.getResourceAuditTrail.bind(auditController))
)

router.get('/user/:userId', 
  requirePermission(Permission.AUDIT_LOGS), 
  asyncHandler(auditController.getUserAuditTrail.bind(auditController))
)

// Report generation
router.post('/report', 
  requirePermission(Permission.AUDIT_LOGS), 
  asyncHandler(auditController.generateAuditReport.bind(auditController))
)

router.post('/export', 
  requirePermission(Permission.AUDIT_LOGS), 
  asyncHandler(auditController.exportAuditLogs.bind(auditController))
)

// Administrative operations
router.post('/archive', 
  requirePermission(Permission.SYSTEM_ADMIN), 
  asyncHandler(auditController.archiveOldLogs.bind(auditController))
)

export default router