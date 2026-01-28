import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as learningUnitQuestionsController from '@/controllers/content/learning-unit-questions.controller';

const router = Router({ mergeParams: true });

/**
 * Learning Unit Questions Routes
 * Base path: /api/v2/learning-units/:learningUnitId/questions
 *
 * All routes require authentication
 * Handles linking questions from question banks to learning units (exercise/assessment types)
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/learning-units/:learningUnitId/questions
 * List all questions linked to a learning unit
 * Access Rights: content:assessments:manage, content:lessons:read
 *
 * Response includes:
 * - learningUnitId: ObjectId
 * - learningUnitTitle: string
 * - questions: array of linked questions with details
 * - totalQuestions: number
 * - totalPoints: number
 */
router.get('/',
  authorize.anyOf(['content:assessments:manage', 'content:lessons:read']),
  learningUnitQuestionsController.listLinked
);

/**
 * POST /api/v2/learning-units/:learningUnitId/questions
 * Link a single question to a learning unit
 * Access Right: content:assessments:manage
 *
 * Body:
 * - questionId: ObjectId (required)
 * - sequence: number (optional, auto-assigned if not provided)
 * - pointsOverride: number | null (optional, null = use question default)
 *
 * Note: Only learning units of type 'exercise' or 'assessment' support questions
 */
router.post('/',
  authorize('content:assessments:manage'),
  learningUnitQuestionsController.linkQuestion
);

/**
 * POST /api/v2/learning-units/:learningUnitId/questions/bulk
 * Bulk link multiple questions to a learning unit
 * Access Right: content:assessments:manage
 *
 * Body:
 * - questions: array of { questionId, sequence?, pointsOverride? }
 * - replaceExisting: boolean (optional, default: false)
 *
 * Note: If replaceExisting=true, all existing links are removed before adding new ones
 */
router.post('/bulk',
  authorize('content:assessments:manage'),
  learningUnitQuestionsController.bulkLink
);

/**
 * PUT /api/v2/learning-units/:learningUnitId/questions/:linkId
 * Update a question link (sequence or points override)
 * Access Right: content:assessments:manage
 *
 * Body:
 * - sequence: number (optional)
 * - pointsOverride: number | null (optional)
 */
router.put('/:linkId',
  authorize('content:assessments:manage'),
  learningUnitQuestionsController.updateLink
);

/**
 * DELETE /api/v2/learning-units/:learningUnitId/questions/:linkId
 * Unlink a question from a learning unit
 * Access Right: content:assessments:manage
 *
 * Note: This removes the link only; the question remains in the question bank
 */
router.delete('/:linkId',
  authorize('content:assessments:manage'),
  learningUnitQuestionsController.unlinkQuestion
);

export default router;
