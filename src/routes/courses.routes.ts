import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as coursesController from '@/controllers/academic/courses.controller';

const router = Router();

/**
 * Courses Routes
 * Base path: /api/v2/courses
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/courses
 * List all courses with optional filtering and pagination
 */
router.get('/', coursesController.listCourses);

/**
 * POST /api/v2/courses
 * Create a new course
 */
router.post('/', coursesController.createCourse);

/**
 * GET /api/v2/courses/:id/export
 * Export course package in various formats
 */
router.get('/:id/export', coursesController.exportCourse);

/**
 * POST /api/v2/courses/:id/publish
 * Publish a course to make it available to learners
 */
router.post('/:id/publish', coursesController.publishCourse);

/**
 * POST /api/v2/courses/:id/unpublish
 * Unpublish a course to make it unavailable to new learners
 */
router.post('/:id/unpublish', coursesController.unpublishCourse);

/**
 * POST /api/v2/courses/:id/archive
 * Archive a course to remove it from active use
 */
router.post('/:id/archive', coursesController.archiveCourse);

/**
 * POST /api/v2/courses/:id/unarchive
 * Unarchive a course to restore it to draft status
 */
router.post('/:id/unarchive', coursesController.unarchiveCourse);

/**
 * POST /api/v2/courses/:id/duplicate
 * Create a copy of a course with optional modifications
 */
router.post('/:id/duplicate', coursesController.duplicateCourse);

/**
 * PATCH /api/v2/courses/:id/department
 * Move course to a different department
 */
router.patch('/:id/department', coursesController.updateCourseDepartment);

/**
 * PATCH /api/v2/courses/:id/program
 * Assign or change course program
 */
router.patch('/:id/program', coursesController.updateCourseProgram);

/**
 * GET /api/v2/courses/:id
 * Get detailed information about a specific course
 */
router.get('/:id', coursesController.getCourseById);

/**
 * PUT /api/v2/courses/:id
 * Replace entire course resource (full update)
 */
router.put('/:id', coursesController.updateCourse);

/**
 * PATCH /api/v2/courses/:id
 * Partially update course fields
 */
router.patch('/:id', coursesController.patchCourse);

/**
 * DELETE /api/v2/courses/:id
 * Delete a course (soft delete)
 */
router.delete('/:id', coursesController.deleteCourse);

export default router;
