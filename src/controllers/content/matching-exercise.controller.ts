import { Request, Response } from 'express';
import { MatchingExerciseService } from '@/services/content/matching-exercise.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Matching Exercise Controller
 *
 * Handles all /api/v2/content/exercises matching-specific endpoints
 * and matching session/result endpoints.
 */

/**
 * POST /api/v2/content/exercises (with type='matching')
 * Create a new matching exercise
 */
export const createMatchingExercise = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    department,
    instructions,
    passingScore,
    difficulty,
    questionIds,
    shuffleColumnB,
    allowPartialCredit,
    showFeedbackOnDrop,
    maxAttempts,
    timeLimit,
    columnALabel,
    columnBLabel
  } = req.body;

  // Validate required fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw ApiError.badRequest('Title is required');
  }

  if (title.length > 200) {
    throw ApiError.badRequest('Title cannot exceed 200 characters');
  }

  if (!department || typeof department !== 'string') {
    throw ApiError.badRequest('Department ID is required');
  }

  if (!questionIds || !Array.isArray(questionIds) || questionIds.length < 2) {
    throw ApiError.badRequest('At least 2 question IDs are required for matching exercises');
  }

  // Validate optional fields
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      throw ApiError.badRequest('Description must be a string');
    }
    if (description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }
  }

  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    throw ApiError.badRequest('Invalid difficulty. Must be one of: easy, medium, hard');
  }

  if (passingScore !== undefined) {
    const passingScoreNum = parseInt(passingScore as any, 10);
    if (isNaN(passingScoreNum) || passingScoreNum < 0 || passingScoreNum > 100) {
      throw ApiError.badRequest('Passing score must be between 0 and 100');
    }
  }

  if (maxAttempts !== undefined) {
    const maxAttemptsNum = parseInt(maxAttempts as any, 10);
    if (isNaN(maxAttemptsNum) || maxAttemptsNum < 1) {
      throw ApiError.badRequest('Max attempts must be at least 1');
    }
  }

  if (timeLimit !== undefined) {
    const timeLimitNum = parseInt(timeLimit as any, 10);
    if (isNaN(timeLimitNum) || timeLimitNum < 0) {
      throw ApiError.badRequest('Time limit must be a non-negative number');
    }
  }

  // Get user ID from request (set by auth middleware)
  const createdBy = (req as any).user?.userId || (req as any).user?.id;
  if (!createdBy) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const exerciseData = {
    title: title.trim(),
    description: description?.trim(),
    department,
    instructions: instructions?.trim(),
    passingScore: passingScore !== undefined ? parseInt(passingScore as any, 10) : undefined,
    difficulty,
    questionIds,
    shuffleColumnB,
    allowPartialCredit,
    showFeedbackOnDrop,
    maxAttempts: maxAttempts !== undefined ? parseInt(maxAttempts as any, 10) : undefined,
    timeLimit: timeLimit !== undefined ? parseInt(timeLimit as any, 10) : undefined,
    columnALabel: columnALabel?.trim(),
    columnBLabel: columnBLabel?.trim(),
    createdBy
  };

  const result = await MatchingExerciseService.createMatchingExercise(exerciseData);
  res.status(201).json(ApiResponse.success(result, 'Matching exercise created successfully'));
});

/**
 * PUT /api/v2/content/exercises/:id/matching
 * Update a matching exercise
 */
export const updateMatchingExercise = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    title,
    description,
    instructions,
    passingScore,
    difficulty,
    status,
    questionIds,
    shuffleColumnB,
    allowPartialCredit,
    showFeedbackOnDrop,
    maxAttempts,
    timeLimit,
    columnALabel,
    columnBLabel
  } = req.body;

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  // Validate title if provided
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw ApiError.badRequest('Title cannot be empty');
    }
    if (title.length > 200) {
      throw ApiError.badRequest('Title cannot exceed 200 characters');
    }
  }

  // Validate description if provided
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      throw ApiError.badRequest('Description must be a string');
    }
    if (description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }
  }

  // Validate difficulty if provided
  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    throw ApiError.badRequest('Invalid difficulty. Must be one of: easy, medium, hard');
  }

  // Validate status if provided
  if (status && !['draft', 'published', 'archived'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: draft, published, archived');
  }

  // Validate passingScore if provided
  if (passingScore !== undefined) {
    const passingScoreNum = parseInt(passingScore as any, 10);
    if (isNaN(passingScoreNum) || passingScoreNum < 0 || passingScoreNum > 100) {
      throw ApiError.badRequest('Passing score must be between 0 and 100');
    }
  }

  // Validate questionIds if provided
  if (questionIds !== undefined) {
    if (!Array.isArray(questionIds) || questionIds.length < 2) {
      throw ApiError.badRequest('At least 2 question IDs are required');
    }
  }

  const updateData: any = {};
  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description?.trim();
  if (instructions !== undefined) updateData.instructions = instructions?.trim();
  if (passingScore !== undefined) updateData.passingScore = parseInt(passingScore as any, 10);
  if (difficulty !== undefined) updateData.difficulty = difficulty;
  if (status !== undefined) updateData.status = status;
  if (questionIds !== undefined) updateData.questionIds = questionIds;
  if (shuffleColumnB !== undefined) updateData.shuffleColumnB = shuffleColumnB;
  if (allowPartialCredit !== undefined) updateData.allowPartialCredit = allowPartialCredit;
  if (showFeedbackOnDrop !== undefined) updateData.showFeedbackOnDrop = showFeedbackOnDrop;
  if (maxAttempts !== undefined) updateData.maxAttempts = parseInt(maxAttempts as any, 10);
  if (timeLimit !== undefined) updateData.timeLimit = parseInt(timeLimit as any, 10);
  if (columnALabel !== undefined) updateData.columnALabel = columnALabel?.trim();
  if (columnBLabel !== undefined) updateData.columnBLabel = columnBLabel?.trim();

  const result = await MatchingExerciseService.updateMatchingExercise(id, updateData);
  res.status(200).json(ApiResponse.success(result, 'Matching exercise updated successfully'));
});

/**
 * GET /api/v2/content/exercises/:id/matching-session
 * Get a matching session (creates new or returns existing)
 */
export const getMatchingSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  // Get learner ID from authenticated user
  const learnerId = (req as any).user?.userId || (req as any).user?.id;
  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await MatchingExerciseService.getMatchingSession(id, learnerId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/content/exercises/:id/matching-result
 * Submit matching result
 */
export const submitMatchingResult = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sessionId, matches, timeSpent } = req.body;

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  if (!sessionId || typeof sessionId !== 'string') {
    throw ApiError.badRequest('Session ID is required');
  }

  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    throw ApiError.badRequest('Matches array is required');
  }

  // Validate each match has required fields
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (!match.columnAId || typeof match.columnAId !== 'string') {
      throw ApiError.badRequest(`Match at index ${i} missing columnAId`);
    }
    if (!match.columnBId || typeof match.columnBId !== 'string') {
      throw ApiError.badRequest(`Match at index ${i} missing columnBId`);
    }
  }

  if (timeSpent === undefined || typeof timeSpent !== 'number' || timeSpent < 0) {
    throw ApiError.badRequest('Time spent must be a non-negative number');
  }

  // Get learner ID from authenticated user
  const learnerId = (req as any).user?.userId || (req as any).user?.id;
  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await MatchingExerciseService.submitMatchingResult(id, learnerId, {
    sessionId,
    matches,
    timeSpent
  });

  res.status(200).json(ApiResponse.success(result, 'Matching result submitted successfully'));
});

/**
 * GET /api/v2/content/exercises/:id/matching-attempts
 * Get matching attempt history for a learner
 */
export const getMatchingAttempts = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  // Validate pagination
  if (page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (limit < 1 || limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Get learner ID from authenticated user
  const learnerId = (req as any).user?.userId || (req as any).user?.id;
  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await MatchingExerciseService.getMatchingAttempts(id, learnerId, page, limit);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/content/exercises/matching-attempts/:attemptId
 * Get detailed results for a specific attempt
 */
export const getAttemptDetails = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;

  if (!attemptId) {
    throw ApiError.badRequest('Attempt ID is required');
  }

  // Get learner ID from authenticated user
  const learnerId = (req as any).user?.userId || (req as any).user?.id;
  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await MatchingExerciseService.getAttemptDetails(attemptId, learnerId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * DELETE /api/v2/content/exercises/matching-sessions/:sessionId
 * Abandon an active matching session
 */
export const abandonMatchingSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw ApiError.badRequest('Session ID is required');
  }

  // Get learner ID from authenticated user
  const learnerId = (req as any).user?.userId || (req as any).user?.id;
  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  await MatchingExerciseService.abandonSession(sessionId, learnerId);
  res.status(200).json(ApiResponse.success(null, 'Session abandoned successfully'));
});
