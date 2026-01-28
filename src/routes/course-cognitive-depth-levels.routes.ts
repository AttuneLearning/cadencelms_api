import { Router } from 'express';
import { CourseCognitiveDepthLevelsController } from '@/controllers/content/course-cognitive-depth-levels.controller';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';

const router = Router({ mergeParams: true }); // mergeParams to access :courseId from parent route

/**
 * Course Cognitive Depth Levels Routes
 *
 * All routes require authentication.
 * Permissions based on course access rights.
 */

/**
 * @route   GET /api/v2/courses/:courseId/cognitive-depth-levels
 * @desc    Get cognitive depth levels for a course (merged: system + department + course)
 * @access  Private
 * @permission content:courses:read
 */
router.get(
  '/',
  isAuthenticated,
  authorize.anyOf(['content:courses:read', 'content:own:read']),
  CourseCognitiveDepthLevelsController.getForCourse
);

/**
 * @route   PUT /api/v2/courses/:courseId/cognitive-depth-levels/:slug
 * @desc    Create or update a course-level override for a depth level
 * @access  Private
 * @permission content:courses:manage
 */
router.put(
  '/:slug',
  isAuthenticated,
  authorize('content:courses:manage'),
  CourseCognitiveDepthLevelsController.upsertOverride
);

/**
 * @route   DELETE /api/v2/courses/:courseId/cognitive-depth-levels/:slug
 * @desc    Delete a course-level override (reverts to department/system)
 * @access  Private
 * @permission content:courses:manage
 */
router.delete(
  '/:slug',
  isAuthenticated,
  authorize('content:courses:manage'),
  CourseCognitiveDepthLevelsController.deleteOverride
);

/**
 * @route   DELETE /api/v2/courses/:courseId/cognitive-depth-levels
 * @desc    Delete all course-level overrides
 * @access  Private
 * @permission content:courses:manage
 */
router.delete(
  '/',
  isAuthenticated,
  authorize('content:courses:manage'),
  CourseCognitiveDepthLevelsController.deleteAllOverrides
);

export default router;
