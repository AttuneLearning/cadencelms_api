import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as learnerQuestionProgressController from '@/controllers/progress/learner-question-progress.controller';

const router = Router({ mergeParams: true });

/**
 * Learner Question Progress Routes
 * Base path: /api/v2/learning-units/:learningUnitId/progress/:learnerId/questions
 *
 * Tracks learner progress on questions within learning units (exercises/assessments).
 * Used for mastery-based learning, adaptive question selection, and progress analytics.
 *
 * All routes require authentication.
 *
 * Related contract: contracts/api/learning-unit-questions.contract.ts
 * - getLearnerProgress
 * - updateQuestionProgress
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/learning-units/:learningUnitId/progress/:learnerId/questions
 * Get learner progress on questions in a learning unit
 *
 * Returns progress records for each question and session statistics.
 *
 * Permissions:
 * - content:assessments:manage - Staff can view any learner's progress
 * - learner:progress:read - Learners can view their own progress
 */
router.get(
  '/',
  authorize.anyOf(['content:assessments:manage', 'learner:progress:read']),
  learnerQuestionProgressController.getProgress
);

/**
 * POST /api/v2/learning-units/:learningUnitId/progress/:learnerId/questions/:questionId
 * Update progress after answering a question (typically called by assessment engine)
 *
 * Body:
 * - isCorrect: boolean (required)
 * - attemptId: string (optional) - Assessment attempt ID
 * - timeSpent: number (optional) - Seconds spent on question
 *
 * Returns updated progress record with mastery status.
 *
 * Permissions:
 * - content:assessments:manage - Staff managing progress
 * - learner:assessments:take - Learner recording progress during assessment
 */
router.post(
  '/:questionId',
  authorize.anyOf(['content:assessments:manage', 'learner:assessments:take']),
  learnerQuestionProgressController.updateProgress
);

export default router;
