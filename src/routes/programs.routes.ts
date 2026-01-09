import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as programsController from '@/controllers/academic/programs.controller';

const router = Router();

/**
 * Programs Routes
 * Base path: /api/v2/programs
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/programs
 * List all programs with filtering and pagination
 */
router.get('/', programsController.listPrograms);

/**
 * POST /api/v2/programs
 * Create a new program
 */
router.post('/', programsController.createProgram);

/**
 * GET /api/v2/programs/:id
 * Get detailed information about a specific program
 */
router.get('/:id', programsController.getProgramById);

/**
 * PUT /api/v2/programs/:id
 * Update program information
 */
router.put('/:id', programsController.updateProgram);

/**
 * DELETE /api/v2/programs/:id
 * Delete a program (soft delete)
 */
router.delete('/:id', programsController.deleteProgram);

/**
 * GET /api/v2/programs/:id/levels
 * Get all levels for a specific program
 */
router.get('/:id/levels', programsController.getProgramLevels);

/**
 * POST /api/v2/programs/:id/levels
 * Create a new level in a program
 */
router.post('/:id/levels', programsController.createProgramLevel);

/**
 * GET /api/v2/programs/:id/courses
 * Get all courses in a specific program
 */
router.get('/:id/courses', programsController.getProgramCourses);

/**
 * GET /api/v2/programs/:id/enrollments
 * Get all enrollments for a specific program
 */
router.get('/:id/enrollments', programsController.getProgramEnrollments);

/**
 * PATCH /api/v2/programs/:id/department
 * Move a program to a different department
 */
router.patch('/:id/department', programsController.updateProgramDepartment);

export default router;
