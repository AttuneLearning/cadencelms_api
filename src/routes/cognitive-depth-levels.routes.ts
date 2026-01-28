/**
 * Cognitive Depth Levels Routes
 *
 * Routes for managing cognitive depth levels used in content creation.
 * Supports both system defaults and department-specific overrides.
 *
 * Base path: /api/v2
 *
 * Routes:
 * - GET /api/v2/cognitive-depth-levels - List system default levels
 * - GET /api/v2/departments/:departmentId/cognitive-depth-levels - List levels for department
 * - POST /api/v2/departments/:departmentId/cognitive-depth-levels - Create department override
 * - PUT /api/v2/departments/:departmentId/cognitive-depth-levels/:slug - Update department level
 * - DELETE /api/v2/departments/:departmentId/cognitive-depth-levels/:slug - Delete department level
 *
 * @module routes/cognitive-depth-levels
 */

import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import {
  listSystemDefaults,
  listForDepartment,
  create,
  update,
  remove
} from '@/controllers/content/cognitive-depth-levels.controller';

const router = Router();

/**
 * GET /api/v2/cognitive-depth-levels
 *
 * List all system default cognitive depth levels.
 * These are the base levels available to all departments.
 *
 * Authorization:
 *   - Requires authentication
 *
 * Response:
 * {
 *   success: true,
 *   data: CognitiveDepthLevel[]
 * }
 */
router.get('/cognitive-depth-levels',
  isAuthenticated,
  listSystemDefaults
);

/**
 * GET /api/v2/departments/:departmentId/cognitive-depth-levels
 *
 * List cognitive depth levels available for a specific department.
 * Returns system defaults merged with any department-specific overrides.
 *
 * Path parameters:
 *   - departmentId: The department ObjectId
 *
 * Authorization:
 *   - Requires authentication
 *   - Requires content:department:read OR content:own:read permission
 *
 * Response:
 * {
 *   success: true,
 *   data: CognitiveDepthLevel[]
 * }
 */
router.get('/departments/:departmentId/cognitive-depth-levels',
  isAuthenticated,
  authorize.anyOf(['content:department:read', 'content:own:read']),
  listForDepartment
);

/**
 * POST /api/v2/departments/:departmentId/cognitive-depth-levels
 *
 * Create a department-specific cognitive depth level override.
 * Allows departments to customize level descriptions or add new levels.
 *
 * Path parameters:
 *   - departmentId: The department ObjectId
 *
 * Body:
 *   - slug: string (required) - Unique identifier for the level
 *   - name: string (required) - Display name
 *   - description: string (optional) - Detailed description
 *   - order: number (optional) - Sort order
 *
 * Authorization:
 *   - Requires authentication
 *   - Requires content:department:manage permission
 *
 * Response:
 * {
 *   success: true,
 *   data: CognitiveDepthLevel
 * }
 */
router.post('/departments/:departmentId/cognitive-depth-levels',
  isAuthenticated,
  authorize.anyOf(['content:department:manage']),
  create
);

/**
 * PUT /api/v2/departments/:departmentId/cognitive-depth-levels/:slug
 *
 * Update a department-specific cognitive depth level.
 * Can modify name, description, or order of a department override.
 *
 * Path parameters:
 *   - departmentId: The department ObjectId
 *   - slug: The level slug identifier
 *
 * Body:
 *   - name: string (optional) - Display name
 *   - description: string (optional) - Detailed description
 *   - order: number (optional) - Sort order
 *
 * Authorization:
 *   - Requires authentication
 *   - Requires content:department:manage permission
 *
 * Response:
 * {
 *   success: true,
 *   data: CognitiveDepthLevel
 * }
 */
router.put('/departments/:departmentId/cognitive-depth-levels/:slug',
  isAuthenticated,
  authorize.anyOf(['content:department:manage']),
  update
);

/**
 * DELETE /api/v2/departments/:departmentId/cognitive-depth-levels/:slug
 *
 * Delete a department-specific cognitive depth level.
 * Reverts the level to use the system default if one exists.
 * If deleting a custom level with no system default, removes it entirely.
 *
 * Path parameters:
 *   - departmentId: The department ObjectId
 *   - slug: The level slug identifier
 *
 * Authorization:
 *   - Requires authentication
 *   - Requires content:department:manage permission
 *
 * Response:
 * {
 *   success: true,
 *   message: 'Cognitive depth level deleted successfully'
 * }
 */
router.delete('/departments/:departmentId/cognitive-depth-levels/:slug',
  isAuthenticated,
  authorize.anyOf(['content:department:manage']),
  remove
);

export default router;
