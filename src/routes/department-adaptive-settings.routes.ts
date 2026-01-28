import { Router } from 'express';
import { DepartmentAdaptiveSettingsController } from '@/controllers/content/department-adaptive-settings.controller';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';

const router = Router({ mergeParams: true }); // mergeParams to access :departmentId from parent route

/**
 * Department Adaptive Settings Routes
 *
 * All routes require authentication.
 * Based on department access rights.
 */

/**
 * @route   GET /api/v2/departments/:departmentId/adaptive-settings
 * @desc    Get adaptive learning settings for a department
 * @access  Private
 * @permission content:department:read
 */
router.get(
  '/',
  isAuthenticated,
  authorize.anyOf(['content:department:read', 'content:own:read'], {
    scope: 'dept:${req.params.departmentId}'
  }),
  DepartmentAdaptiveSettingsController.get
);

/**
 * @route   PATCH /api/v2/departments/:departmentId/adaptive-settings
 * @desc    Update adaptive learning settings for a department
 * @access  Private
 * @permission content:department:manage
 */
router.patch(
  '/',
  isAuthenticated,
  authorize('content:department:manage', {
    scope: 'dept:${req.params.departmentId}'
  }),
  DepartmentAdaptiveSettingsController.update
);

export default router;
