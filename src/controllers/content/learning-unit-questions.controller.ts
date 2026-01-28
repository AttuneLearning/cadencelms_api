import { Request, Response } from 'express';
import { LearningUnitQuestionsService } from '@/services/content/learning-unit-questions.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Learning Unit Questions Controller
 * Handles all /api/v2/learning-units/:learningUnitId/questions endpoints
 * for linking questions from question banks to learning units (exercise/assessment types)
 */

/**
 * GET /api/v2/learning-units/:learningUnitId/questions
 * List all questions linked to a learning unit
 */
export const listLinked = asyncHandler(async (req: Request, res: Response) => {
  const { learningUnitId } = req.params;

  if (!learningUnitId) {
    throw ApiError.badRequest('Learning unit ID is required');
  }

  const result = await LearningUnitQuestionsService.listLinked(learningUnitId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/learning-units/:learningUnitId/questions
 * Link a single question to a learning unit
 */
export const linkQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { learningUnitId } = req.params;
  const { questionId, sequence, pointsOverride } = req.body;

  if (!learningUnitId) {
    throw ApiError.badRequest('Learning unit ID is required');
  }

  // Validate required fields
  if (!questionId || typeof questionId !== 'string') {
    throw ApiError.badRequest('Question ID is required');
  }

  // Validate sequence if provided
  if (sequence !== undefined && (typeof sequence !== 'number' || sequence < 0)) {
    throw ApiError.badRequest('Sequence must be a non-negative number');
  }

  // Validate pointsOverride if provided
  if (pointsOverride !== undefined && pointsOverride !== null) {
    if (typeof pointsOverride !== 'number' || pointsOverride < 0) {
      throw ApiError.badRequest('Points override must be a non-negative number or null');
    }
  }

  const linkData = {
    questionId,
    sequence,
    pointsOverride
  };

  const result = await LearningUnitQuestionsService.linkQuestion(learningUnitId, linkData);
  res.status(201).json(ApiResponse.success(result, 'Question linked'));
});

/**
 * POST /api/v2/learning-units/:learningUnitId/questions/bulk
 * Bulk link multiple questions to a learning unit
 */
export const bulkLink = asyncHandler(async (req: Request, res: Response) => {
  const { learningUnitId } = req.params;
  const { questions, replaceExisting } = req.body;

  if (!learningUnitId) {
    throw ApiError.badRequest('Learning unit ID is required');
  }

  // Validate questions array
  if (!questions || !Array.isArray(questions)) {
    throw ApiError.badRequest('Questions must be an array');
  }

  if (questions.length === 0) {
    throw ApiError.badRequest('Questions array cannot be empty');
  }

  // Validate each question in the array
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    if (!q.questionId || typeof q.questionId !== 'string') {
      throw ApiError.badRequest(`Question at index ${i}: questionId is required`);
    }

    if (q.sequence !== undefined && (typeof q.sequence !== 'number' || q.sequence < 0)) {
      throw ApiError.badRequest(`Question at index ${i}: sequence must be a non-negative number`);
    }

    if (q.pointsOverride !== undefined && q.pointsOverride !== null) {
      if (typeof q.pointsOverride !== 'number' || q.pointsOverride < 0) {
        throw ApiError.badRequest(`Question at index ${i}: pointsOverride must be a non-negative number or null`);
      }
    }
  }

  // Validate replaceExisting if provided
  if (replaceExisting !== undefined && typeof replaceExisting !== 'boolean') {
    throw ApiError.badRequest('replaceExisting must be a boolean');
  }

  const bulkData = {
    questions,
    replaceExisting
  };

  const result = await LearningUnitQuestionsService.bulkLink(learningUnitId, bulkData);
  res.status(201).json(ApiResponse.success(result, 'Questions linked'));
});

/**
 * PUT /api/v2/learning-units/:learningUnitId/questions/:linkId
 * Update a question link (sequence or points override)
 */
export const updateLink = asyncHandler(async (req: Request, res: Response) => {
  const { learningUnitId, linkId } = req.params;
  const { sequence, pointsOverride } = req.body;

  if (!learningUnitId) {
    throw ApiError.badRequest('Learning unit ID is required');
  }

  if (!linkId) {
    throw ApiError.badRequest('Link ID is required');
  }

  // Validate sequence if provided
  if (sequence !== undefined && (typeof sequence !== 'number' || sequence < 0)) {
    throw ApiError.badRequest('Sequence must be a non-negative number');
  }

  // Validate pointsOverride if provided
  if (pointsOverride !== undefined && pointsOverride !== null) {
    if (typeof pointsOverride !== 'number' || pointsOverride < 0) {
      throw ApiError.badRequest('Points override must be a non-negative number or null');
    }
  }

  const updateData = {
    sequence,
    pointsOverride
  };

  const result = await LearningUnitQuestionsService.updateLink(learningUnitId, linkId, updateData);
  res.status(200).json(ApiResponse.success(result, 'Link updated'));
});

/**
 * DELETE /api/v2/learning-units/:learningUnitId/questions/:linkId
 * Unlink a question from a learning unit
 */
export const unlinkQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { learningUnitId, linkId } = req.params;

  if (!learningUnitId) {
    throw ApiError.badRequest('Learning unit ID is required');
  }

  if (!linkId) {
    throw ApiError.badRequest('Link ID is required');
  }

  await LearningUnitQuestionsService.unlinkQuestion(learningUnitId, linkId);
  res.status(200).json(ApiResponse.success(null, 'Question unlinked'));
});
