import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as auditLogsController from '@/controllers/system/audit-logs.controller';

const router = Router();

/**
 * Audit Logs Routes
 * Base path: /api/v2/audit-logs
 *
 * All routes require authentication and appropriate permissions.
 * Audit logs are immutable - no POST, PUT, or DELETE operations.
 *
 * Permission requirements:
 * - read:audit-logs - Required for all endpoints
 * - export:audit-logs - Required for export endpoint
 *
 * Access control:
 * - Global admins: See all logs across all departments
 * - Department admins/staff: See logs scoped to their departments
 * - Learners: Cannot access audit logs (will receive 403)
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/audit-logs/export
 * Export audit logs in various formats (JSON, CSV, XLSX, PDF)
 * Must be defined before /:id route to avoid conflict
 */
router.get('/export', auditLogsController.exportAuditLogs);

/**
 * GET /api/v2/audit-logs/user/:userId
 * Get comprehensive activity audit trail for a specific user
 * Must be defined before /:id route to avoid conflict
 */
router.get('/user/:userId', auditLogsController.getUserActivity);

/**
 * GET /api/v2/audit-logs/entity/:entityType/:entityId
 * Get complete audit history for a specific entity
 */
router.get('/entity/:entityType/:entityId', auditLogsController.getEntityHistory);

/**
 * GET /api/v2/audit-logs
 * List audit logs with advanced filtering and search
 */
router.get('/', auditLogsController.listAuditLogs);

/**
 * GET /api/v2/audit-logs/:id
 * Get detailed information for a specific audit log entry
 */
router.get('/:id', auditLogsController.getAuditLogById);

export default router;
