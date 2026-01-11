import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { requireEscalation } from '@/middlewares/require-escalation';
import { requireAdminRole } from '@/middlewares/require-admin-role';
import * as rolesController from '@/controllers/auth/roles.controller';

const router = Router();

/**
 * Roles Routes
 * Base path: /api/v2/roles
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/roles/me
 * Get all roles for the current authenticated user
 * Returns roles aggregated from all contexts (global, departments, classes)
 */
router.get('/me', rolesController.getMyRoles);

/**
 * GET /api/v2/roles/me/department/:departmentId
 * Get all roles for the current authenticated user within a specific department
 * Returns roles from department and class contexts within that department
 */
router.get('/me/department/:departmentId', rolesController.getMyRolesForDepartment);

/**
 * GET /api/v2/roles
 * List all available role definitions
 * Supports filtering by user type and pagination
 */
router.get('/', rolesController.listRoles);

/**
 * GET /api/v2/roles/user-type/:type
 * Get all roles available for a specific user type
 * @param type - User type (staff or learner)
 */
router.get('/user-type/:type', rolesController.getRolesByUserType);

/**
 * GET /api/v2/roles/:name
 * Get detailed information about a specific role
 * Includes access rights and applicable contexts
 */
router.get('/:name', rolesController.getRole);

/**
 * PUT /api/v2/roles/:name/access-rights
 * Update access rights for a specific role
 * Requires system-admin privileges
 */
router.put(
  '/:name/access-rights',
  requireEscalation,
  requireAdminRole(['system-admin']),
  rolesController.updateRoleAccessRights
);

export default router;
