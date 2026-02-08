/**
 * Module Edit Lock Routes
 *
 * Base path: /api/v2/modules/:id/edit-lock
 *
 * Implements optimistic locking for module editing to prevent simultaneous edits.
 *
 * All routes require authentication.
 * Write operations require content:lessons:manage permission.
 */

import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { validateModuleIdParam } from '@/validators/moduleEditLock.validator';
import * as moduleEditLockController from '@/controllers/academic/moduleEditLock.controller';

const router = Router({ mergeParams: true });

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * POST /api/v2/modules/:id/edit-lock
 * Acquire an edit lock on a module
 *
 * Access Right: content:lessons:manage
 * Roles: instructor, content-admin, department-admin
 *
 * Success Response (200):
 * {
 *   status: "success",
 *   data: {
 *     moduleId: string,
 *     isLocked: true,
 *     lock: {
 *       userId: string,
 *       userName: string,
 *       acquiredAt: string (ISO date),
 *       expiresAt: string (ISO date)
 *     },
 *     accessRequest: null | { userId, userName, requestedAt }
 *   }
 * }
 *
 * Conflict Response (409 - MODULE_LOCKED):
 * {
 *   status: "error",
 *   code: "MODULE_LOCKED",
 *   message: "This module is currently being edited by [userName]",
 *   data: { ModuleEditLockResponse }
 * }
 */
router.post(
  '/:id/edit-lock',
  authorize('content:lessons:manage'),
  validateModuleIdParam,
  moduleEditLockController.acquireLock
);

/**
 * DELETE /api/v2/modules/:id/edit-lock
 * Release an edit lock on a module
 *
 * Access Right: content:lessons:manage
 * Roles: instructor, content-admin, department-admin
 *
 * Only the lock holder can release the lock.
 * Idempotent - succeeds even if no lock exists.
 *
 * Response (200):
 * {
 *   status: "success",
 *   message: "Lock released successfully",
 *   data: null
 * }
 */
router.delete(
  '/:id/edit-lock',
  authorize('content:lessons:manage'),
  validateModuleIdParam,
  moduleEditLockController.releaseLock
);

/**
 * GET /api/v2/modules/:id/edit-lock
 * Get the current lock status for a module
 *
 * Access Right: content:lessons:read
 * Roles: instructor, content-admin, department-admin, course-taker, auditor
 *
 * Response (200):
 * {
 *   status: "success",
 *   data: {
 *     moduleId: string,
 *     isLocked: boolean,
 *     lock: null | {
 *       userId: string,
 *       userName: string,
 *       acquiredAt: string (ISO date),
 *       expiresAt: string (ISO date)
 *     },
 *     accessRequest: null | { userId, userName, requestedAt }
 *   }
 * }
 */
router.get(
  '/:id/edit-lock',
  authorize('content:lessons:read'),
  validateModuleIdParam,
  moduleEditLockController.getLockStatus
);

/**
 * PATCH /api/v2/modules/:id/edit-lock
 * Send heartbeat to extend lock expiry
 *
 * Access Right: content:lessons:manage
 * Roles: instructor, content-admin, department-admin
 *
 * Only the lock holder can send heartbeats.
 * Extends the lock by 30 minutes from the current time.
 *
 * Response (200):
 * {
 *   status: "success",
 *   message: "Lock extended successfully",
 *   data: { ModuleEditLockResponse }
 * }
 *
 * Error Response (404 - LOCK_NOT_FOUND):
 * When no active lock exists for the module.
 */
router.patch(
  '/:id/edit-lock',
  authorize('content:lessons:manage'),
  validateModuleIdParam,
  moduleEditLockController.heartbeat
);

/**
 * POST /api/v2/modules/:id/edit-lock/request-access
 * Request access to a locked module
 *
 * Access Right: content:lessons:manage
 * Roles: instructor, content-admin, department-admin
 *
 * Stores the access request on the lock for the lock holder to see.
 * Only stores the most recent request (no queue).
 *
 * Response (200):
 * {
 *   status: "success",
 *   message: "Access request submitted",
 *   data: { ModuleEditLockResponse with accessRequest populated }
 * }
 *
 * Error Responses:
 * - 400: Module is not currently locked
 * - 400: You already hold the lock on this module
 */
router.post(
  '/:id/edit-lock/request-access',
  authorize('content:lessons:manage'),
  validateModuleIdParam,
  moduleEditLockController.requestAccess
);

export default router;
