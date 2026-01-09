import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as staffController from '@/controllers/users/staff.controller';

const router = Router();

/**
 * Staff Routes
 * Base path: /api/v2/users/staff
 *
 * All routes require authentication
 * Permissions enforced at service layer
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/users/staff
 * List staff users with filtering and pagination
 * Permissions: global-admin, dept-admin
 */
router.get('/', staffController.listStaff);

/**
 * POST /api/v2/users/staff
 * Register a new staff user account
 * Permissions: global-admin, dept-admin
 */
router.post('/', staffController.registerStaff);

/**
 * GET /api/v2/users/staff/:id
 * Get detailed information for a specific staff user
 * Permissions: global-admin, dept-admin, staff (dept-scoped)
 */
router.get('/:id', staffController.getStaffById);

/**
 * PUT /api/v2/users/staff/:id
 * Update staff user information
 * Permissions: global-admin, dept-admin (limited fields)
 */
router.put('/:id', staffController.updateStaff);

/**
 * DELETE /api/v2/users/staff/:id
 * Soft delete a staff user (sets status to withdrawn)
 * Permissions: global-admin, dept-admin (dept-scoped)
 */
router.delete('/:id', staffController.deleteStaff);

/**
 * PATCH /api/v2/users/staff/:id/departments
 * Update staff user department assignments and roles
 * Permissions: global-admin, dept-admin (dept-scoped)
 */
router.patch('/:id/departments', staffController.updateStaffDepartments);

export default router;
