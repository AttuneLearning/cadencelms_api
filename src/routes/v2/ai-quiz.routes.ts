import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as aiQuizController from '@/controllers/content/ai-quiz.controller';

const router = Router({ mergeParams: true });

/**
 * AI Quiz Routes - Shell Implementation
 * Base path: /api/v2/learning-units/:learningUnitId/ai-quiz
 *
 * These routes return 501 Not Implemented until LLM integration is ready.
 * Shell endpoints allow UI to be built against the expected contract.
 *
 * Contract reference: contracts/api/learning-unit-questions.contract.ts
 * (aiQuizStart, aiQuizAnswer, aiQuizAnalytics)
 *
 * All routes require authentication.
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * POST /api/v2/learning-units/:learningUnitId/ai-quiz/start
 * Start an AI-assisted quiz session
 * Access Right: learner:assessments:take
 *
 * SHELL - Returns 501 until implemented
 */
router.post('/start',
  authorize('learner:assessments:take'),
  aiQuizController.startQuiz
);

/**
 * POST /api/v2/learning-units/:learningUnitId/ai-quiz/:sessionId/answer
 * Submit answer in AI quiz session
 * Access Right: learner:assessments:take
 *
 * SHELL - Returns 501 until implemented
 */
router.post('/:sessionId/answer',
  authorize('learner:assessments:take'),
  aiQuizController.submitAnswer
);

/**
 * GET /api/v2/learning-units/:learningUnitId/ai-quiz/analytics
 * Get AI quiz analytics (staff only)
 * Access Right: content:assessments:manage
 *
 * SHELL - Returns 501 until implemented
 */
router.get('/analytics',
  authorize('content:assessments:manage'),
  aiQuizController.getAnalytics
);

export default router;
