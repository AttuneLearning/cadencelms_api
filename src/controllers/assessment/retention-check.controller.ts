import { Request, Response } from 'express';
import { RetentionCheckService } from '@/services/assessment/retention-check.service';
import { RemediationService } from '@/services/assessment/remediation.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Retention Check Controller
 *
 * Route handlers for retention check and remediation functionality.
 * All endpoints are course-scoped: /api/v2/courses/:courseId/retention-checks/*
 * and /api/v2/courses/:courseId/remediations/*
 *
 * @see API-ISS-013 Retention Check & Remediation System
 */

// ============================================
// RETENTION CHECK ENDPOINTS
// ============================================

/**
 * GET /api/v2/courses/:courseId/retention-checks/pending
 *
 * Get pending retention checks for the current learner.
 *
 * Access Rights: content:courses:read
 */
export const getPendingChecks = asyncHandler(async (req: Request, res: Response) => {
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

  const result = await RetentionCheckService.getPendingChecks(courseId, learnerId);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/courses/:courseId/retention-checks/:checkId
 *
 * Get retention check cards for answering.
 * Marks the check as in_progress if it was pending.
 *
 * Access Rights: content:courses:read
 */
export const getRetentionCheck = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, checkId } = req.params;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }
  if (!checkId) {
    throw ApiError.badRequest('checkId is required');
  }

  // Get learner ID from authenticated user
  const user = (req as any).user;
  const learnerId = user.id || user.userId;

  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await RetentionCheckService.getRetentionCheck(checkId, learnerId);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/courses/:courseId/retention-checks/:checkId/submit
 *
 * Submit answers for a retention check.
 * Evaluates pass/fail and creates remediation if needed.
 *
 * Access Rights: content:courses:read
 *
 * Body:
 * - answers: Array<{
 *     questionId: string,
 *     correct: boolean,
 *     quality?: number (0-5),
 *     timeSpent?: number (ms)
 *   }>
 */
export const submitRetentionCheck = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, checkId } = req.params;
  const { answers } = req.body;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }
  if (!checkId) {
    throw ApiError.badRequest('checkId is required');
  }

  // Validate answers
  if (!answers || !Array.isArray(answers)) {
    throw ApiError.badRequest('answers is required and must be an array');
  }

  if (answers.length === 0) {
    throw ApiError.badRequest('answers cannot be empty');
  }

  // Validate each answer
  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i];
    if (!answer.questionId || typeof answer.questionId !== 'string') {
      throw ApiError.badRequest(`answers[${i}].questionId is required and must be a string`);
    }
    if (typeof answer.correct !== 'boolean') {
      throw ApiError.badRequest(`answers[${i}].correct is required and must be a boolean`);
    }
    if (answer.quality !== undefined) {
      if (typeof answer.quality !== 'number' || answer.quality < 0 || answer.quality > 5) {
        throw ApiError.badRequest(`answers[${i}].quality must be a number between 0 and 5`);
      }
    }
    if (answer.timeSpent !== undefined) {
      if (typeof answer.timeSpent !== 'number' || answer.timeSpent < 0) {
        throw ApiError.badRequest(`answers[${i}].timeSpent must be a non-negative number`);
      }
    }
  }

  // Get learner ID from authenticated user
  const user = (req as any).user;
  const learnerId = user.id || user.userId;

  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await RetentionCheckService.submitRetentionCheck(checkId, learnerId, answers);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/courses/:courseId/retention-checks/history
 *
 * Get retention check history for the current learner.
 *
 * Access Rights: content:courses:read
 *
 * Query params:
 * - moduleId?: string (filter by source module)
 * - page?: number (default: 1)
 * - limit?: number (default: 20)
 */
export const getRetentionHistory = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const moduleId = req.query.moduleId as string | undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }

  // Validate pagination
  if (isNaN(page) || page < 1) {
    throw ApiError.badRequest('page must be a positive number');
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw ApiError.badRequest('limit must be a number between 1 and 100');
  }

  // Get learner ID from authenticated user
  const user = (req as any).user;
  const learnerId = user.id || user.userId;

  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await RetentionCheckService.getRetentionHistory(courseId, learnerId, {
    page,
    limit,
    moduleId
  });

  res.status(200).json(ApiResponse.paginated(result.history, result.pagination));
});

// ============================================
// REMEDIATION ENDPOINTS
// ============================================

/**
 * GET /api/v2/courses/:courseId/remediations/active
 *
 * Get active remediations for the current learner.
 *
 * Access Rights: content:courses:read
 */
export const getActiveRemediations = asyncHandler(async (req: Request, res: Response) => {
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

  const result = await RemediationService.getActiveRemediations(courseId, learnerId);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/courses/:courseId/remediations/:remediationId/content-reviewed
 *
 * Mark content as reviewed for a remediation.
 *
 * Access Rights: content:courses:read
 *
 * Body (optional):
 * - itemsViewed?: string[] (content item IDs that were viewed)
 */
export const markContentReviewed = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, remediationId } = req.params;
  const { itemsViewed } = req.body;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }
  if (!remediationId) {
    throw ApiError.badRequest('remediationId is required');
  }

  // Validate itemsViewed if provided
  if (itemsViewed !== undefined) {
    if (!Array.isArray(itemsViewed)) {
      throw ApiError.badRequest('itemsViewed must be an array');
    }
    for (let i = 0; i < itemsViewed.length; i++) {
      if (typeof itemsViewed[i] !== 'string') {
        throw ApiError.badRequest(`itemsViewed[${i}] must be a string`);
      }
    }
  }

  // Get learner ID from authenticated user
  const user = (req as any).user;
  const learnerId = user.id || user.userId;

  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await RemediationService.markContentReviewed(
    remediationId,
    learnerId,
    itemsViewed
  );

  res.status(200).json(ApiResponse.success(result, 'Content marked as reviewed'));
});

/**
 * GET /api/v2/courses/:courseId/remediations/:remediationId/status
 *
 * Get detailed status of a remediation.
 *
 * Access Rights: content:courses:read
 */
export const getRemediationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, remediationId } = req.params;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }
  if (!remediationId) {
    throw ApiError.badRequest('remediationId is required');
  }

  // Get learner ID from authenticated user
  const user = (req as any).user;
  const learnerId = user.id || user.userId;

  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await RemediationService.getRemediationStatus(remediationId, learnerId);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/courses/:courseId/remediations/:remediationId/final-retake
 *
 * Link a final retake attempt to a remediation.
 * This is called by the exam system when a learner completes a final retake.
 *
 * Access Rights: content:courses:read
 *
 * Body:
 * - attemptId: string (the exam attempt ID)
 * - passed: boolean (whether the learner passed)
 */
export const linkFinalRetake = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, remediationId } = req.params;
  const { attemptId, passed } = req.body;

  if (!courseId) {
    throw ApiError.badRequest('courseId is required');
  }
  if (!remediationId) {
    throw ApiError.badRequest('remediationId is required');
  }

  // Validate body
  if (!attemptId || typeof attemptId !== 'string') {
    throw ApiError.badRequest('attemptId is required and must be a string');
  }
  if (typeof passed !== 'boolean') {
    throw ApiError.badRequest('passed is required and must be a boolean');
  }

  // Get learner ID from authenticated user
  const user = (req as any).user;
  const learnerId = user.id || user.userId;

  if (!learnerId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const remediation = await RemediationService.linkFinalRetake(
    remediationId,
    learnerId,
    attemptId,
    passed
  );

  // Determine next step
  let nextStep: string | null = null;
  if (remediation.status !== 'completed') {
    if (remediation.finalPassed === false) {
      nextStep = 'retake_again';
    }
  }

  res.status(200).json(ApiResponse.success({
    remediationId: remediation._id.toString(),
    status: remediation.status,
    finalRetakenAt: remediation.finalRetakenAt,
    finalPassed: remediation.finalPassed,
    completedAt: remediation.completedAt,
    nextStep
  }, 'Final retake recorded'));
});
