import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import {
  validateCreateException,
  validateRevokeException,
  validateListExceptionsFilters
} from '@/validators/learnerException.validator';
import * as learnerExceptionController from '@/controllers/exception/learnerException.controller';

/**
 * Learner Exception Routes
 *
 * Two routers:
 * 1. enrollmentExceptionRouter — mounted at /api/v2/enrollments
 *    - POST /:enrollmentId/exceptions — Create exception
 *    - GET  /:enrollmentId/exceptions — List exceptions for enrollment
 *
 * 2. exceptionRouter — mounted at /api/v2/exceptions
 *    - GET /:exceptionId — Get single exception
 *    - PUT /:exceptionId/revoke — Revoke exception
 */

// Router for /api/v2/enrollments (enrollment-scoped operations)
export const enrollmentExceptionRouter = Router({ mergeParams: true });

// Router for /api/v2/exceptions (exception-level operations)
export const exceptionRouter = Router();

// =====================================================
// ROUTES: /api/v2/enrollments/:enrollmentId/exceptions
// =====================================================

enrollmentExceptionRouter.use(isAuthenticated);

/**
 * POST /api/v2/enrollments/:enrollmentId/exceptions
 * Create a learner exception for an enrollment.
 *
 * Access Right: enrollment:department:manage (staff/admin only)
 */
enrollmentExceptionRouter.post(
  '/:enrollmentId/exceptions',
  authorize('enrollment:department:manage'),
  validateCreateException,
  learnerExceptionController.createException
);

/**
 * GET /api/v2/enrollments/:enrollmentId/exceptions
 * List exceptions for an enrollment.
 *
 * Access Right: enrollment:department:read OR enrollment:own:read
 */
enrollmentExceptionRouter.get(
  '/:enrollmentId/exceptions',
  authorize.anyOf(['enrollment:department:read', 'enrollment:own:read']),
  validateListExceptionsFilters,
  learnerExceptionController.listExceptions
);

// =====================================================
// ROUTES: /api/v2/exceptions
// =====================================================

exceptionRouter.use(isAuthenticated);

/**
 * GET /api/v2/exceptions/:exceptionId
 * Get a single exception by ID.
 *
 * Access Right: enrollment:department:read OR enrollment:own:read
 */
exceptionRouter.get(
  '/:exceptionId',
  authorize.anyOf(['enrollment:department:read', 'enrollment:own:read']),
  learnerExceptionController.getException
);

/**
 * PUT /api/v2/exceptions/:exceptionId/revoke
 * Revoke an exception.
 *
 * Access Right: enrollment:department:manage (staff/admin only)
 */
exceptionRouter.put(
  '/:exceptionId/revoke',
  authorize('enrollment:department:manage'),
  validateRevokeException,
  learnerExceptionController.revokeException
);
