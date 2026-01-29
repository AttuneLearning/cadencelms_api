import { Request, Response } from 'express';
import { FlashcardService } from '@/services/assessment/flashcard.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { QualityRating } from '@/utils/sm2-algorithm';

/**
 * Flashcard Controller
 *
 * Route handlers for flashcard functionality.
 * All endpoints are course-scoped: /api/v2/courses/:courseId/flashcard-*
 *
 * @see API-ISS-010 Flashcard System Implementation
 */

// ============================================
// CONFIGURATION ENDPOINTS
// ============================================

/**
 * GET /api/v2/courses/:courseId/flashcard-config
 *
 * Get flashcard configuration for a course.
 * Returns default values if no custom configuration exists.
 *
 * Access Rights: content:courses:read
 */
export const getCourseConfig = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }

  const config = await FlashcardService.getCourseConfig(courseId);

  res.status(200).json(ApiResponse.success({
    courseId: config.courseId.toString(),
    enabled: config.enabled,
    flashcardsPerCheck: config.flashcardsPerCheck,
    failureThreshold: config.failureThreshold,
    checkFrequency: config.checkFrequency,
    checkFrequencyValue: config.checkFrequencyValue,
    selectionMethod: config.selectionMethod,
    requireContentReview: config.requireContentReview,
    requireFinalRetake: config.requireFinalRetake,
    includeOnlyCompletedModules: config.includeOnlyCompletedModules,
    masteryThreshold: config.masteryThreshold,
    masteryIntervalDays: config.masteryIntervalDays,
    defaultSessionSize: config.defaultSessionSize,
    maxSessionSize: config.maxSessionSize
  }));
});

/**
 * PUT /api/v2/courses/:courseId/flashcard-config
 *
 * Update flashcard configuration for a course.
 * Creates configuration if it doesn't exist.
 *
 * Access Rights: content:courses:manage
 *
 * Body:
 * - enabled?: boolean
 * - flashcardsPerCheck?: number (0-50)
 * - failureThreshold?: number (1-10)
 * - checkFrequency?: 'every_module' | 'every_n_modules' | 'custom'
 * - checkFrequencyValue?: number (1-100)
 * - selectionMethod?: 'random' | 'weighted_by_difficulty' | 'sm2_priority'
 * - requireContentReview?: boolean
 * - requireFinalRetake?: boolean
 * - includeOnlyCompletedModules?: boolean
 * - masteryThreshold?: number (1-10)
 * - masteryIntervalDays?: number (1-365)
 * - defaultSessionSize?: number (1-100)
 * - maxSessionSize?: number (1-100)
 */
export const updateCourseConfig = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const {
    enabled,
    flashcardsPerCheck,
    failureThreshold,
    checkFrequency,
    checkFrequencyValue,
    selectionMethod,
    requireContentReview,
    requireFinalRetake,
    includeOnlyCompletedModules,
    masteryThreshold,
    masteryIntervalDays,
    defaultSessionSize,
    maxSessionSize
  } = req.body;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }

  // Validate fields
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    throw ApiError.badRequest('enabled must be a boolean');
  }

  if (flashcardsPerCheck !== undefined) {
    if (typeof flashcardsPerCheck !== 'number' || flashcardsPerCheck < 0 || flashcardsPerCheck > 50) {
      throw ApiError.badRequest('flashcardsPerCheck must be a number between 0 and 50');
    }
  }

  if (failureThreshold !== undefined) {
    if (typeof failureThreshold !== 'number' || failureThreshold < 1 || failureThreshold > 10) {
      throw ApiError.badRequest('failureThreshold must be a number between 1 and 10');
    }
  }

  if (checkFrequency !== undefined) {
    const validFrequencies = ['every_module', 'every_n_modules', 'custom'];
    if (!validFrequencies.includes(checkFrequency)) {
      throw ApiError.badRequest(`checkFrequency must be one of: ${validFrequencies.join(', ')}`);
    }
  }

  if (checkFrequencyValue !== undefined) {
    if (typeof checkFrequencyValue !== 'number' || checkFrequencyValue < 1 || checkFrequencyValue > 100) {
      throw ApiError.badRequest('checkFrequencyValue must be a number between 1 and 100');
    }
  }

  if (selectionMethod !== undefined) {
    const validMethods = ['random', 'weighted_by_difficulty', 'sm2_priority'];
    if (!validMethods.includes(selectionMethod)) {
      throw ApiError.badRequest(`selectionMethod must be one of: ${validMethods.join(', ')}`);
    }
  }

  if (requireContentReview !== undefined && typeof requireContentReview !== 'boolean') {
    throw ApiError.badRequest('requireContentReview must be a boolean');
  }

  if (requireFinalRetake !== undefined && typeof requireFinalRetake !== 'boolean') {
    throw ApiError.badRequest('requireFinalRetake must be a boolean');
  }

  if (includeOnlyCompletedModules !== undefined && typeof includeOnlyCompletedModules !== 'boolean') {
    throw ApiError.badRequest('includeOnlyCompletedModules must be a boolean');
  }

  if (masteryThreshold !== undefined) {
    if (typeof masteryThreshold !== 'number' || masteryThreshold < 1 || masteryThreshold > 10) {
      throw ApiError.badRequest('masteryThreshold must be a number between 1 and 10');
    }
  }

  if (masteryIntervalDays !== undefined) {
    if (typeof masteryIntervalDays !== 'number' || masteryIntervalDays < 1 || masteryIntervalDays > 365) {
      throw ApiError.badRequest('masteryIntervalDays must be a number between 1 and 365');
    }
  }

  if (defaultSessionSize !== undefined) {
    if (typeof defaultSessionSize !== 'number' || defaultSessionSize < 1 || defaultSessionSize > 100) {
      throw ApiError.badRequest('defaultSessionSize must be a number between 1 and 100');
    }
  }

  if (maxSessionSize !== undefined) {
    if (typeof maxSessionSize !== 'number' || maxSessionSize < 1 || maxSessionSize > 100) {
      throw ApiError.badRequest('maxSessionSize must be a number between 1 and 100');
    }
  }

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {};
  if (enabled !== undefined) updates.enabled = enabled;
  if (flashcardsPerCheck !== undefined) updates.flashcardsPerCheck = flashcardsPerCheck;
  if (failureThreshold !== undefined) updates.failureThreshold = failureThreshold;
  if (checkFrequency !== undefined) updates.checkFrequency = checkFrequency;
  if (checkFrequencyValue !== undefined) updates.checkFrequencyValue = checkFrequencyValue;
  if (selectionMethod !== undefined) updates.selectionMethod = selectionMethod;
  if (requireContentReview !== undefined) updates.requireContentReview = requireContentReview;
  if (requireFinalRetake !== undefined) updates.requireFinalRetake = requireFinalRetake;
  if (includeOnlyCompletedModules !== undefined) updates.includeOnlyCompletedModules = includeOnlyCompletedModules;
  if (masteryThreshold !== undefined) updates.masteryThreshold = masteryThreshold;
  if (masteryIntervalDays !== undefined) updates.masteryIntervalDays = masteryIntervalDays;
  if (defaultSessionSize !== undefined) updates.defaultSessionSize = defaultSessionSize;
  if (maxSessionSize !== undefined) updates.maxSessionSize = maxSessionSize;

  const config = await FlashcardService.updateCourseConfig(courseId, updates);

  res.status(200).json(ApiResponse.success({
    courseId: config.courseId.toString(),
    enabled: config.enabled,
    flashcardsPerCheck: config.flashcardsPerCheck,
    failureThreshold: config.failureThreshold,
    checkFrequency: config.checkFrequency,
    checkFrequencyValue: config.checkFrequencyValue,
    selectionMethod: config.selectionMethod,
    requireContentReview: config.requireContentReview,
    requireFinalRetake: config.requireFinalRetake,
    includeOnlyCompletedModules: config.includeOnlyCompletedModules,
    masteryThreshold: config.masteryThreshold,
    masteryIntervalDays: config.masteryIntervalDays,
    defaultSessionSize: config.defaultSessionSize,
    maxSessionSize: config.maxSessionSize
  }, 'Flashcard configuration updated successfully'));
});

// ============================================
// SESSION ENDPOINTS
// ============================================

/**
 * GET /api/v2/courses/:courseId/flashcard-session
 *
 * Get a flashcard practice session for the current user.
 * Selects cards based on SM-2 priority (due cards first).
 *
 * Access Rights: content:courses:read (learner must be enrolled)
 *
 * Query params:
 * - moduleId?: ObjectId (filter cards by module)
 * - sessionSize?: number (override default session size, max from config)
 */
export const getFlashcardSession = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const moduleId = req.query.moduleId as string | undefined;
  const sessionSize = req.query.sessionSize ? parseInt(req.query.sessionSize as string, 10) : undefined;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }

  // Get learner ID from authenticated user
  const user = (req as any).user;
  const learnerId = user.id || user.userId;

  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Validate sessionSize if provided
  if (sessionSize !== undefined && (isNaN(sessionSize) || sessionSize < 1 || sessionSize > 100)) {
    throw ApiError.badRequest('sessionSize must be a number between 1 and 100');
  }

  const session = await FlashcardService.getFlashcardSession(courseId, learnerId, {
    moduleId,
    sessionSize
  });

  res.status(200).json(ApiResponse.success(session));
});

// ============================================
// RESULT RECORDING ENDPOINTS
// ============================================

/**
 * POST /api/v2/courses/:courseId/flashcard-result
 *
 * Record the result of a flashcard review.
 * Updates learner progress using SM-2 algorithm.
 *
 * Access Rights: content:courses:read (learner must be enrolled)
 *
 * Body:
 * - questionId: ObjectId (required)
 * - promptIndex: number (required, which prompt variation was shown)
 * - isCorrect: boolean (required)
 * - quality?: number (0-5, optional SM-2 quality rating)
 */
export const recordFlashcardResult = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { questionId, promptIndex, isCorrect, quality } = req.body;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }

  // Validate required fields
  if (!questionId || typeof questionId !== 'string') {
    throw ApiError.badRequest('questionId is required and must be a string');
  }

  if (promptIndex === undefined || typeof promptIndex !== 'number' || promptIndex < 0) {
    throw ApiError.badRequest('promptIndex is required and must be a non-negative number');
  }

  if (isCorrect === undefined || typeof isCorrect !== 'boolean') {
    throw ApiError.badRequest('isCorrect is required and must be a boolean');
  }

  // Validate optional quality rating
  if (quality !== undefined) {
    if (typeof quality !== 'number' || quality < 0 || quality > 5 || !Number.isInteger(quality)) {
      throw ApiError.badRequest('quality must be an integer between 0 and 5');
    }
  }

  // Get learner ID from authenticated user
  const user = (req as any).user;
  const learnerId = user.id || user.userId;

  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await FlashcardService.recordFlashcardResult(
    courseId,
    learnerId,
    questionId,
    promptIndex,
    isCorrect,
    quality as QualityRating | undefined
  );

  res.status(200).json(ApiResponse.success(result, 'Flashcard result recorded'));
});

// ============================================
// PROGRESS ENDPOINTS
// ============================================

/**
 * GET /api/v2/courses/:courseId/flashcard-progress
 *
 * Get flashcard progress summary for the current user.
 *
 * Access Rights: content:courses:read (learner must be enrolled)
 */
export const getFlashcardProgress = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }

  // Get learner ID from authenticated user
  const user = (req as any).user;
  const learnerId = user.id || user.userId;

  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const progress = await FlashcardService.getFlashcardProgress(courseId, learnerId);

  res.status(200).json(ApiResponse.success(progress));
});

/**
 * DELETE /api/v2/courses/:courseId/flashcard-progress
 *
 * Reset flashcard progress for the current user.
 * This clears all progress and allows starting fresh.
 *
 * Access Rights: content:courses:read (learner must be enrolled)
 *
 * Query params:
 * - questionId?: ObjectId (optional, reset only specific question)
 */
export const resetFlashcardProgress = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const questionId = req.query.questionId as string | undefined;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }

  // Get learner ID from authenticated user
  const user = (req as any).user;
  const learnerId = user.id || user.userId;

  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await FlashcardService.resetProgress(courseId, learnerId, questionId);

  res.status(200).json(ApiResponse.success(result, 'Flashcard progress reset successfully'));
});
