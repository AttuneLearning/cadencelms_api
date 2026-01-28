import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { QuestionBanksController } from '@/controllers/content/question-banks.controller';

const router = Router({ mergeParams: true });

/**
 * Department Question Banks Routes
 * Base path: /api/v2/departments/:departmentId/question-banks
 *
 * All routes require authentication.
 * Access rights are based on the contract:
 * - Read access: content:assessments:manage OR content:lessons:read
 * - Write access: content:assessments:manage
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/departments/:departmentId/question-banks
 * List all question banks in a department
 * Access Right: content:assessments:manage OR content:lessons:read
 */
router.get('/',
  authorize.anyOf(['content:assessments:manage', 'content:lessons:read']),
  QuestionBanksController.list
);

/**
 * POST /api/v2/departments/:departmentId/question-banks
 * Create a new question bank in a department
 * Access Right: content:assessments:manage
 */
router.post('/',
  authorize('content:assessments:manage'),
  QuestionBanksController.create
);

/**
 * GET /api/v2/departments/:departmentId/question-banks/:bankId
 * Get detailed information for a question bank
 * Access Right: content:assessments:manage OR content:lessons:read
 */
router.get('/:bankId',
  authorize.anyOf(['content:assessments:manage', 'content:lessons:read']),
  QuestionBanksController.getById
);

/**
 * PUT /api/v2/departments/:departmentId/question-banks/:bankId
 * Update a question bank
 * Access Right: content:assessments:manage
 */
router.put('/:bankId',
  authorize('content:assessments:manage'),
  QuestionBanksController.update
);

/**
 * DELETE /api/v2/departments/:departmentId/question-banks/:bankId
 * Delete a question bank (soft delete)
 * Access Right: content:assessments:manage
 */
router.delete('/:bankId',
  authorize('content:assessments:manage'),
  QuestionBanksController.delete
);

export default router;
