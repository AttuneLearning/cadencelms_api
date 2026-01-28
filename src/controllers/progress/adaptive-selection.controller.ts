import { Request, Response } from 'express';
import { AdaptiveQuestionSelectionService } from '@/services/progress/adaptive-question-selection.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Adaptive Selection Controller
 * Handles all /api/v2/adaptive endpoints
 *
 * Provides adaptive question selection based on learner progress,
 * cognitive depth levels, and mastery tracking. Used for personalized
 * learning experiences and intelligent content delivery.
 *
 * Related: adaptive-question-selection.service.ts, learner-knowledge-progress.service.ts
 */

/**
 * POST /api/v2/adaptive/select-question
 * Select a single question adaptively based on learner progress
 *
 * Body:
 * - learnerId: string (optional) - Defaults to req.user.userId
 * - knowledgeNodeId: string (required) - The knowledge node to select from
 * - questionBankIds: string[] (optional) - Specific question banks to select from
 * - excludeQuestionIds: string[] (optional) - Questions to exclude from selection
 * - preferredTypes: string[] (optional) - Preferred question types
 *
 * Returns:
 * - Selected question with adaptive metadata
 * - null if no questions available
 */
export const selectQuestion = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { learnerId, knowledgeNodeId, questionBankIds, excludeQuestionIds, preferredTypes } = req.body;

  if (!knowledgeNodeId) {
    throw ApiError.badRequest('knowledgeNodeId is required');
  }

  const effectiveLearnerId = learnerId || user?.userId;
  if (!effectiveLearnerId) {
    throw ApiError.badRequest('learnerId is required');
  }

  const result = await AdaptiveQuestionSelectionService.selectQuestion({
    learnerId: effectiveLearnerId,
    knowledgeNodeId,
    questionBankIds,
    excludeQuestionIds,
    preferredTypes
  });

  if (!result) {
    res.status(200).json(ApiResponse.success(null, 'No questions available for selection'));
    return;
  }

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/adaptive/select-questions
 * Select multiple questions adaptively based on learner progress
 *
 * Body:
 * - learnerId: string (optional) - Defaults to req.user.userId
 * - knowledgeNodeId: string (required) - The knowledge node to select from
 * - count: number (optional) - Number of questions to select (default 5, max 20)
 * - questionBankIds: string[] (optional) - Specific question banks to select from
 * - excludeQuestionIds: string[] (optional) - Questions to exclude from selection
 * - preferredTypes: string[] (optional) - Preferred question types
 *
 * Returns:
 * - Array of selected questions with adaptive metadata
 */
export const selectMultiple = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { learnerId, knowledgeNodeId, count, questionBankIds, excludeQuestionIds, preferredTypes } = req.body;

  if (!knowledgeNodeId) {
    throw ApiError.badRequest('knowledgeNodeId is required');
  }

  const effectiveLearnerId = learnerId || user?.userId;
  if (!effectiveLearnerId) {
    throw ApiError.badRequest('learnerId is required');
  }

  // Validate and constrain count
  let questionCount = count !== undefined ? parseInt(count, 10) : 5;

  if (isNaN(questionCount) || questionCount < 1) {
    throw ApiError.badRequest('count must be a positive integer');
  }

  // Enforce maximum of 20 questions
  if (questionCount > 20) {
    questionCount = 20;
  }

  const result = await AdaptiveQuestionSelectionService.selectQuestions({
    learnerId: effectiveLearnerId,
    knowledgeNodeId,
    questionBankIds,
    excludeQuestionIds,
    preferredTypes
  }, questionCount);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/adaptive/record-response
 * Record learner response and update progress
 *
 * Body:
 * - learnerId: string (optional) - Defaults to req.user.userId
 * - questionId: string (required) - The question that was answered
 * - knowledgeNodeId: string (required) - The knowledge node for this question
 * - cognitiveDepth: string (required) - The cognitive depth level of the question
 * - isCorrect: boolean (required) - Whether the answer was correct
 *
 * Returns:
 * - progressUpdated: boolean - Whether progress was updated
 * - newMasteryScore: number - Updated mastery score
 * - levelAdvanced: boolean - Whether learner advanced to next level
 * - newDepth: string (optional) - New depth level if advanced
 * - previousDepth: string - Depth level before this response
 * - isNodeComplete: boolean - Whether the knowledge node is now complete
 */
export const recordResponse = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { learnerId, questionId, knowledgeNodeId, cognitiveDepth, isCorrect } = req.body;

  // Validate required fields
  if (!questionId) {
    throw ApiError.badRequest('questionId is required');
  }

  if (!knowledgeNodeId) {
    throw ApiError.badRequest('knowledgeNodeId is required');
  }

  if (!cognitiveDepth) {
    throw ApiError.badRequest('cognitiveDepth is required');
  }

  if (typeof isCorrect !== 'boolean') {
    throw ApiError.badRequest('isCorrect is required and must be a boolean');
  }

  const effectiveLearnerId = learnerId || user?.userId;
  if (!effectiveLearnerId) {
    throw ApiError.badRequest('learnerId is required');
  }

  const result = await AdaptiveQuestionSelectionService.recordResponse({
    learnerId: effectiveLearnerId,
    questionId,
    knowledgeNodeId,
    cognitiveDepth,
    isCorrect
  });

  res.status(200).json(ApiResponse.success(result));
});

/**
 * Export controller methods as a class for alternative usage pattern
 */
export class AdaptiveSelectionController {
  static selectQuestion = selectQuestion;
  static selectMultiple = selectMultiple;
  static recordResponse = recordResponse;
}
