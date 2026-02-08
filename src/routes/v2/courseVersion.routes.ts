import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import {
  validateCreateVersion,
  validateUpdateDraft,
  validateLockVersion
} from '@/validators/courseVersion.validator';
import {
  validateAddModule,
  validateReorderModules,
  validateUpdateModuleSettings
} from '@/validators/courseVersionModule.validator';
import * as courseVersionController from '@/controllers/academic/courseVersion.controller';
import * as courseVersionModuleController from '@/controllers/academic/courseVersionModule.controller';

/**
 * Course Version Routes
 *
 * Two base paths are used:
 * 1. /api/v2/courses/:id/versions - For operations scoped to a canonical course
 * 2. /api/v2/course-versions/:id - For operations on a specific version
 *
 * This split follows RESTful conventions:
 * - Creating/listing versions are operations on the course collection
 * - Getting/updating/publishing are operations on the version resource
 */

// Router for /api/v2/courses/:id/versions
export const courseVersionsRouter = Router({ mergeParams: true });

// Router for /api/v2/course-versions/:id
export const versionRouter = Router();

/**
 * =====================================================
 * ROUTES: /api/v2/courses/:id/versions
 * =====================================================
 */

// Apply authentication middleware
courseVersionsRouter.use(isAuthenticated);

/**
 * POST /api/v2/courses/:id/versions
 * Create a new draft version from the current published version.
 *
 * Access Right: content:courses:manage
 * Roles: instructor, content-admin, department-admin
 *
 * Body:
 * - changeNotes?: string - Optional notes describing intended changes
 *
 * Business Rules:
 * - Requires an existing published version
 * - Only one draft can exist at a time
 */
courseVersionsRouter.post(
  '/',
  authorize('content:courses:manage'),
  validateCreateVersion,
  courseVersionController.createVersion
);

/**
 * GET /api/v2/courses/:id/versions
 * List all versions for a canonical course.
 *
 * Access Right: content:courses:read
 * Roles: instructor, content-admin, department-admin
 *
 * Returns versions sorted by version number (descending).
 */
courseVersionsRouter.get(
  '/',
  authorize('content:courses:read'),
  courseVersionController.listVersions
);

/**
 * =====================================================
 * ROUTES: /api/v2/course-versions/:id
 * =====================================================
 */

// Apply authentication middleware
versionRouter.use(isAuthenticated);

/**
 * GET /api/v2/course-versions/:id
 * Get detailed information about a specific course version.
 *
 * Access Right: content:courses:read
 * Roles: instructor, content-admin, department-admin
 *
 * Returns full version details including settings, instructors, and audit info.
 */
versionRouter.get(
  '/:id',
  authorize('content:courses:read'),
  courseVersionController.getVersion
);

/**
 * PATCH /api/v2/course-versions/:id
 * Update a draft course version.
 *
 * Access Right: content:courses:manage
 * Roles: instructor (own drafts), department-admin (all)
 *
 * Body (all optional):
 * - title?: string - Course title (max 200 chars)
 * - description?: string | null - Course description (max 2000 chars)
 * - credits?: number - Credit hours (0-10)
 * - duration?: number - Duration in minutes
 * - settings?: Partial<CourseSettings> - Course settings
 * - instructorIds?: string[] - Array of instructor user IDs
 * - changeNotes?: string | null - Notes about changes
 *
 * Business Rules:
 * - Can only update versions in 'draft' status
 * - Cannot update locked versions
 */
versionRouter.patch(
  '/:id',
  authorize('content:courses:manage'),
  validateUpdateDraft,
  courseVersionController.updateDraft
);

/**
 * POST /api/v2/course-versions/:id/publish
 * Publish a course version.
 *
 * Access Right: content:courses:manage
 * Roles: department-admin
 *
 * Business Rules:
 * 1. Version must be in 'draft' status
 * 2. Locks the current published version (reason: 'superseded')
 * 3. Sets this version as 'published'
 * 4. Updates canonical course references
 * 5. Emits 'course.version.published' event
 *
 * Side Effects:
 * - May trigger certificate definition auto-versioning (via event)
 */
versionRouter.post(
  '/:id/publish',
  authorize('content:courses:manage'),
  courseVersionController.publishVersion
);

/**
 * POST /api/v2/course-versions/:id/lock
 * Manually lock a course version.
 *
 * Access Right: content:courses:manage
 * Roles: department-admin
 *
 * Body:
 * - reason?: string - Optional reason for locking
 *
 * Business Rules:
 * - Cannot lock an already locked version
 * - Captures stats snapshot at lock time
 */
versionRouter.post(
  '/:id/lock',
  authorize('content:courses:manage'),
  validateLockVersion,
  courseVersionController.lockVersion
);

/**
 * =====================================================
 * ROUTES: /api/v2/course-versions/:id/modules
 * Module management within course versions
 * =====================================================
 */

/**
 * GET /api/v2/course-versions/:id/modules
 * List all modules in a course version.
 *
 * Access Right: content:courses:read
 * Roles: instructor, content-admin, department-admin
 *
 * Returns modules sorted by order, with populated module details.
 */
versionRouter.get(
  '/:id/modules',
  authorize('content:courses:read'),
  courseVersionModuleController.listModulesForVersion
);

/**
 * POST /api/v2/course-versions/:id/modules
 * Add a module to a course version.
 *
 * Access Right: content:courses:manage
 * Roles: instructor, content-admin, department-admin
 *
 * Body:
 * - moduleId: string (required) - The module to add
 * - order?: number - Position in the version (auto-calculated if not provided)
 * - isRequired?: boolean - Whether module is required (default: true)
 * - availableFrom?: Date | null - When module becomes available
 * - availableUntil?: Date | null - When module availability ends
 *
 * Business Rules:
 * - Version must be in 'draft' status
 * - Module must exist and be in the same department
 * - Cannot add duplicate module to same version
 */
versionRouter.post(
  '/:id/modules',
  authorize('content:courses:manage'),
  validateAddModule,
  courseVersionModuleController.addModuleToVersion
);

/**
 * PATCH /api/v2/course-versions/:id/modules/reorder
 * Reorder modules within a course version.
 *
 * Access Right: content:courses:manage
 * Roles: instructor, content-admin, department-admin
 *
 * Body:
 * - moduleOrder: string[] (required) - Array of module IDs in desired order
 *
 * Business Rules:
 * - Version must be in 'draft' status
 * - All module IDs must exist in the version
 * - Array must include all modules (no partial reorder)
 */
versionRouter.patch(
  '/:id/modules/reorder',
  authorize('content:courses:manage'),
  validateReorderModules,
  courseVersionModuleController.reorderModules
);

/**
 * PATCH /api/v2/course-versions/:id/modules/:moduleId
 * Update settings for a module in a version.
 *
 * Access Right: content:courses:manage
 * Roles: instructor, content-admin, department-admin
 *
 * Body (all optional):
 * - isRequired?: boolean
 * - availableFrom?: Date | null
 * - availableUntil?: Date | null
 *
 * Business Rules:
 * - Version must be in 'draft' status
 */
versionRouter.patch(
  '/:id/modules/:moduleId',
  authorize('content:courses:manage'),
  validateUpdateModuleSettings,
  courseVersionModuleController.updateModuleSettings
);

/**
 * DELETE /api/v2/course-versions/:id/modules/:moduleId
 * Remove a module from a course version.
 *
 * Access Right: content:courses:manage
 * Roles: instructor, content-admin, department-admin
 *
 * Business Rules:
 * - Version must be in 'draft' status
 * - Remaining modules are automatically re-ordered
 */
versionRouter.delete(
  '/:id/modules/:moduleId',
  authorize('content:courses:manage'),
  courseVersionModuleController.removeModuleFromVersion
);

export default {
  courseVersionsRouter,
  versionRouter
};
