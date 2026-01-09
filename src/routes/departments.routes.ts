import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as departmentsController from '@/controllers/departments/departments.controller';

const router = Router();

/**
 * Departments Routes
 * Base path: /api/v2/departments
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/departments
 * List all departments with optional filtering and pagination
 */
router.get('/', departmentsController.listDepartments);

/**
 * POST /api/v2/departments
 * Create a new department
 */
router.post('/', departmentsController.createDepartment);

/**
 * GET /api/v2/departments/:id/hierarchy
 * Get department tree structure including ancestors and descendants
 */
router.get('/:id/hierarchy', departmentsController.getDepartmentHierarchy);

/**
 * GET /api/v2/departments/:id/programs
 * Get all programs in a department
 */
router.get('/:id/programs', departmentsController.getDepartmentPrograms);

/**
 * GET /api/v2/departments/:id/staff
 * Get all staff members assigned to a department
 */
router.get('/:id/staff', departmentsController.getDepartmentStaff);

/**
 * GET /api/v2/departments/:id/stats
 * Get statistical overview of department activity and performance
 */
router.get('/:id/stats', departmentsController.getDepartmentStats);

/**
 * GET /api/v2/departments/:id
 * Get detailed information about a specific department
 */
router.get('/:id', departmentsController.getDepartmentById);

/**
 * PUT /api/v2/departments/:id
 * Update department information
 */
router.put('/:id', departmentsController.updateDepartment);

/**
 * DELETE /api/v2/departments/:id
 * Delete a department (soft delete)
 */
router.delete('/:id', departmentsController.deleteDepartment);

export default router;
