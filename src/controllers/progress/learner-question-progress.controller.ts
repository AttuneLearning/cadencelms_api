import { Request, Response } from 'express';
import { LearnerQuestionProgressService } from '@/services/progress/learner-question-progress.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Learner Question Progress Controller
 * Handles all /api/v2/learning-units/:learningUnitId/progress/:learnerId/questions endpoints
 *
 * Tracks learner progress on questions within learning units (exercises/assessments).
 * Used for mastery-based learning, adaptive question selection, and progress analytics.
 *
 * Related: learning-unit-questions.contract.ts (getLearnerProgress, updateQuestionProgress)
 */

/**
 * GET /api/v2/learning-units/:learningUnitId/progress/:learnerId/questions
 * Get learner progress on questions in a learning unit
 *
 * Returns:
 * - Progress records for each question (correctCount, incorrectCount, mastery status)
 * - Session statistics (questionsAnswered, correctThisSession, masteredThisSession)
 *
 * Permissions:
 * - Staff can view any learner's progress (content:assessments:manage)
 * - Learners can view their own progress (learner:progress:read)
 */
export const getProgress = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { learningUnitId, learnerId } = req.params;

  // Validate required parameters
  if (!learningUnitId) {
    throw ApiError.badRequest('Learning unit ID is required');
  }

  if (!learnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  // Get progress from service
  const result = await LearnerQuestionProgressService.getProgress(learningUnitId, learnerId);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/learning-units/:learningUnitId/progress/:learnerId/questions/:questionId
 * Record learner answer to a question (typically called by assessment engine)
 *
 * Body:
 * - isCorrect: boolean (required) - Whether the answer was correct
 * - attemptId: string (optional) - Assessment attempt ID for tracking
 * - timeSpent: number (optional) - Seconds spent on question
 *
 * Returns:
 * - Updated progress record (correctCount, incorrectCount, isActive, masteredAt)
 * - Message indicating result (e.g., "Question mastered!")
 *
 * Permissions:
 * - content:assessments:manage (staff managing progress)
 * - take:assessments (learner recording own progress during assessment)
 */
export const updateProgress = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { learningUnitId, learnerId, questionId } = req.params;
  const { isCorrect, attemptId, timeSpent } = req.body;

  // Validate required parameters
  if (!learningUnitId) {
    throw ApiError.badRequest('Learning unit ID is required');
  }

  if (!learnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  if (!questionId) {
    throw ApiError.badRequest('Question ID is required');
  }

  // Validate required body field
  if (typeof isCorrect !== 'boolean') {
    throw ApiError.badRequest('isCorrect is required and must be a boolean');
  }

  // Validate optional fields
  if (attemptId !== undefined && typeof attemptId !== 'string') {
    throw ApiError.badRequest('attemptId must be a string');
  }

  if (timeSpent !== undefined && (typeof timeSpent !== 'number' || timeSpent < 0)) {
    throw ApiError.badRequest('timeSpent must be a non-negative number');
  }

  // Update progress via service
  const result = await LearnerQuestionProgressService.updateProgress(
    learningUnitId,
    learnerId,
    questionId,
    { isCorrect, attemptId, timeSpent }
  );

  res.status(200).json(ApiResponse.success(result));
});

/**
 * Export controller methods as a class for alternative usage pattern
 * (Matches the class-based pattern shown in the task specification)
 */
export class LearnerQuestionProgressController {
  static getProgress = getProgress;
  static updateProgress = updateProgress;
}
