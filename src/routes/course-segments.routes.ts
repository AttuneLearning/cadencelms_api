import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as courseSegmentsController from '@/controllers/academic/course-segments.controller';

const router = Router();

/**
 * Course Segments (Modules) Routes
 * Base: /api/v2/courses/:courseId/modules
 *
 * All routes require authentication
 * Write operations (POST, PUT, DELETE, PATCH) require staff permissions
 * Read operations (GET) available to enrolled learners and staff
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/courses/:courseId/modules
 * List all modules in a course
 * Permissions: authenticated users (learners see only published)
 */
router.get('/:courseId/modules', courseSegmentsController.listModules);

/**
 * POST /api/v2/courses/:courseId/modules
 * Create a new module in a course
 * Permissions: staff, admin
 */
router.post('/:courseId/modules', courseSegmentsController.createModule);

/**
 * GET /api/v2/courses/:courseId/modules/:moduleId
 * Get details of a specific module
 * Permissions: authenticated users (learners see only published)
 */
router.get('/:courseId/modules/:moduleId', courseSegmentsController.getModule);

/**
 * PUT /api/v2/courses/:courseId/modules/:moduleId
 * Update an existing module
 * Permissions: staff, admin
 */
router.put('/:courseId/modules/:moduleId', courseSegmentsController.updateModule);

/**
 * DELETE /api/v2/courses/:courseId/modules/:moduleId
 * Delete a module from a course
 * Permissions: staff, admin
 */
router.delete('/:courseId/modules/:moduleId', courseSegmentsController.deleteModule);

/**
 * PATCH /api/v2/courses/:courseId/modules/reorder
 * Reorder modules within a course
 * Permissions: staff, admin
 */
router.patch('/:courseId/modules/reorder', courseSegmentsController.reorderModules);

export default router;
