import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as accessPolicyController from '@/controllers/policy/accessPolicy.controller';
import * as accessPolicyValidator from '@/validators/accessPolicy.validator';

const router = Router();

/**
 * Access Policy Routes
 *
 * Department policy endpoints are at /api/v2/departments/:departmentId/access-policy
 * Program override endpoints are at /api/v2/programs/:programId/access-override
 * Learner access endpoints are at /api/v2/learners/:learnerId/version-access
 * Extension endpoints are at /api/v2/access-extension-requests
 *
 * All routes require authentication.
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// ============================================================================
// Access Extension Requests (Global - not scoped to department/program)
// ============================================================================

/**
 * GET /api/v2/access-extension-requests
 * List extension requests with filters
 * Access Right: policy:extension-requests:read
 */
router.get(
  '/',
  authorize('settings:extension-requests:read'),
  accessPolicyValidator.validateExtensionRequestFilters,
  accessPolicyController.listExtensionRequests
);

/**
 * GET /api/v2/access-extension-requests/:requestId
 * Get extension request by ID
 * Access Right: policy:extension-requests:read
 */
router.get(
  '/:requestId',
  authorize('settings:extension-requests:read'),
  accessPolicyController.getExtensionRequest
);

/**
 * PATCH /api/v2/access-extension-requests/:requestId
 * Review extension request (approve or deny)
 * Access Right: policy:extension-requests:manage
 */
router.patch(
  '/:requestId',
  authorize('settings:extension-requests:manage'),
  accessPolicyValidator.validateExtensionRequestReview,
  accessPolicyController.reviewExtensionRequest
);

export default router;
