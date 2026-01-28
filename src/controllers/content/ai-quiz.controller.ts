import { Request, Response, NextFunction } from 'express';

/**
 * AI Quiz Controller - Shell Implementation
 *
 * These endpoints return 501 Not Implemented until LLM integration is ready.
 * Shell endpoints allow UI to be built against the expected contract.
 *
 * Contract reference: contracts/api/learning-unit-questions.contract.ts
 * Endpoints:
 *   - POST /api/v2/learning-units/:learningUnitId/ai-quiz/start
 *   - POST /api/v2/learning-units/:learningUnitId/ai-quiz/:sessionId/answer
 *   - GET  /api/v2/learning-units/:learningUnitId/ai-quiz/analytics
 *
 * @module controllers/content/ai-quiz
 */

/**
 * Start an AI-assisted quiz session
 *
 * POST /api/v2/learning-units/:learningUnitId/ai-quiz/start
 *
 * SHELL - Returns 501 until implemented
 *
 * When implemented, this will:
 * - Start a new AI-assisted quiz session
 * - Configure AI adaptation settings
 * - Return the first question
 *
 * @param req - Express request with learningUnitId param and optional aiConfig body
 * @param res - Express response
 * @param _next - Express next function (unused)
 */
export async function startQuiz(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'AI Quiz feature is not yet implemented'
  });
}

/**
 * Submit answer in AI quiz session
 *
 * POST /api/v2/learning-units/:learningUnitId/ai-quiz/:sessionId/answer
 *
 * SHELL - Returns 501 until implemented
 *
 * When implemented, this will:
 * - Record the learner's answer
 * - Use AI to provide adaptive feedback
 * - Select the next appropriate question
 *
 * @param req - Express request with learningUnitId and sessionId params
 * @param res - Express response
 * @param _next - Express next function (unused)
 */
export async function submitAnswer(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'AI Quiz feature is not yet implemented'
  });
}

/**
 * Get AI quiz analytics
 *
 * GET /api/v2/learning-units/:learningUnitId/ai-quiz/analytics
 *
 * SHELL - Returns 501 until implemented
 *
 * When implemented, this will:
 * - Return AI quiz usage statistics
 * - Show adaptation effectiveness metrics
 * - Provide learner performance insights
 *
 * @param req - Express request with learningUnitId param
 * @param res - Express response
 * @param _next - Express next function (unused)
 */
export async function getAnalytics(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'AI Quiz analytics not yet implemented'
  });
}
