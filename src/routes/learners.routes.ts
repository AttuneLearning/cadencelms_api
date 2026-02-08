import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { requireEscalation } from '@/middlewares/requireEscalation';
import { requireAdminRole } from '@/middlewares/requireAdminRole';
import * as learnersController from '@/controllers/users/learners.controller';
import * as accessPolicyController from '@/controllers/policy/accessPolicy.controller';

const router = Router();

/**
 * Learners Routes
 * Base path: /api/v2/users/learners
 *
 * All routes require authentication and staff/admin permissions
 * FERPA COMPLIANCE: All learner operations require escalation
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/users/learners
 * List all learners with filtering and pagination
 * Access Right: learner:directory:read (masked) OR learner:pii:read (full)
 * Roles: instructor, content-admin, department-admin (directory)
 *        enrollment-admin, system-admin (full PII)
 * Service Layer:
 * - learner:directory:read: Returns "LastName, F." + last 4 of ID, no email
 * - learner:pii:read: Returns full name, email, DOB, address
 */
router.get('/',
  authorize.anyOf(['learner:pii:read', 'learner:directory:read']),
  learnersController.listLearners
);

/**
 * POST /api/v2/users/learners
 * Register a new learner account
 * Access Right: learner:pii:read
 * Roles: department-admin, enrollment-admin
 * Security: Requires escalation (FERPA-sensitive PII)
 */
router.post('/',
  requireEscalation,
  authorize('learner:pii:read'),
  learnersController.registerLearner
);

/**
 * GET /api/v2/users/learners/:id
 * Get detailed learner profile by ID
 * Access Right: learner:pii:read
 * Roles: instructor (enrolled only), department-admin, enrollment-admin
 * Service Layer: Data masking applied, FERPA-sensitive
 */
router.get('/:id',
  authorize('learner:pii:read'),
  learnersController.getLearnerById
);

/**
 * PUT /api/v2/users/learners/:id
 * Update learner profile information
 * Access Right: learner:pii:read
 * Roles: department-admin, enrollment-admin
 * Security: Requires escalation (FERPA-sensitive PII)
 */
router.put('/:id',
  requireEscalation,
  authorize('learner:pii:read'),
  learnersController.updateLearner
);

/**
 * DELETE /api/v2/users/learners/:id
 * Soft delete learner account (sets status to withdrawn)
 * Access Right: learner:pii:read
 * Roles: department-admin, enrollment-admin, system-admin
 * Security: Requires escalation + admin role check (FERPA-sensitive)
 */
router.delete('/:id',
  requireEscalation,
  requireAdminRole(['system-admin', 'enrollment-admin']),
  authorize('learner:pii:read'),
  learnersController.deleteLearner
);

// ============================================================================
// Learner Version Access Routes
// ============================================================================

/**
 * GET /api/v2/users/learners/:learnerId/version-access
 * Get learner's version access information
 * Access Right: enrollment:own:read OR enrollment:department:read
 * Service Layer: Learners can view own access, staff can view department learners
 */
router.get('/:learnerId/version-access',
  authorize.anyOf(['enrollment:own:read', 'enrollment:department:read']),
  accessPolicyController.getLearnerVersionAccess
);

export default router;
