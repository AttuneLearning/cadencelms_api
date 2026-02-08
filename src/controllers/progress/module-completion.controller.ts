import { Request, Response } from 'express';
import { ModuleCompletionService } from '@/services/progress/module-completion.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Module Completion Controller
 *
 * Handles endpoints for global module completion tracking.
 * When a learner completes a module in one course, the completion
 * is tracked globally so it can be recognized across all courses
 * containing that module.
 */

/**
 * POST /api/v2/module-completions
 * Record a module completion
 *
 * Access Right: content:lessons:manage (staff) or self (learners)
 */
export const recordCompletion = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { learnerId, moduleId, courseVersionId, enrollmentId, score, isGlobalCompletion } = req.body;

  // Use the request's learnerId or default to current user (for self-recording)
  const effectiveLearnerId = learnerId || user.userId;

  // Only staff can record completions for other learners
  if (learnerId && learnerId !== user.userId) {
    const isStaff = user.userTypes?.includes('staff') || user.userTypes?.includes('global-admin');
    if (!isStaff) {
      throw ApiError.forbidden('Only staff can record completions for other learners');
    }
  }

  const completion = await ModuleCompletionService.recordCompletion({
    learnerId: effectiveLearnerId,
    moduleId,
    courseVersionId,
    enrollmentId,
    score: score ?? null,
    isGlobalCompletion: isGlobalCompletion ?? true
  });

  // Propagate completion to other enrollments if global
  let propagatedCount = 0;
  if (completion.isGlobalCompletion) {
    propagatedCount = await ModuleCompletionService.propagateCompletionToEnrollments(
      effectiveLearnerId,
      moduleId
    );
  }

  res.status(201).json(ApiResponse.success({
    completion: {
      _id: completion._id,
      learnerId: completion.learnerId,
      moduleId: completion.moduleId,
      completedInCourseVersionId: completion.completedInCourseVersionId,
      completedInEnrollmentId: completion.completedInEnrollmentId,
      completedAt: completion.completedAt,
      score: completion.score,
      isGlobalCompletion: completion.isGlobalCompletion
    },
    propagatedToEnrollments: propagatedCount
  }, 'Module completion recorded'));
});

/**
 * GET /api/v2/learners/:id/module-completions
 * Get global module completions for a learner
 *
 * Access Right: content:lessons:read (staff) or self (learners)
 */
export const getLearnerCompletions = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { id: learnerId } = req.params;
  const { moduleId, isGlobalCompletion, completedAfter, completedBefore, page, limit } = req.query;

  // Check authorization - learners can only see their own completions
  if (learnerId !== user.userId) {
    const isStaff = user.userTypes?.includes('staff') || user.userTypes?.includes('global-admin');
    if (!isStaff) {
      throw ApiError.forbidden('You can only view your own completions');
    }
  }

  // Parse filter parameters
  const filters: any = {};

  if (moduleId) {
    filters.moduleId = moduleId as string;
  }

  if (isGlobalCompletion !== undefined) {
    filters.isGlobalCompletion = isGlobalCompletion === 'true';
  }

  if (completedAfter) {
    filters.completedAfter = new Date(completedAfter as string);
  }

  if (completedBefore) {
    filters.completedBefore = new Date(completedBefore as string);
  }

  if (page) {
    filters.page = parseInt(page as string, 10);
  }

  if (limit) {
    filters.limit = parseInt(limit as string, 10);
  }

  const result = await ModuleCompletionService.getLearnerCompletions(learnerId, filters);

  res.status(200).json(ApiResponse.success({
    completions: result.completions,
    pagination: result.pagination
  }));
});

/**
 * GET /api/v2/modules/:id/usage
 * Get all courses using a specific module
 *
 * Access Right: content:lessons:read
 */
export const getModuleUsage = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { id: moduleId } = req.params;

  const usage = await ModuleCompletionService.getModuleUsage(moduleId);

  res.status(200).json(ApiResponse.success({
    moduleId: usage.moduleId,
    courseVersions: usage.courseVersions,
    totalCourses: usage.totalCourses
  }));
});

/**
 * GET /api/v2/modules/:id/completion-stats
 * Get completion statistics for a module
 *
 * Access Right: reports:department:read or content:lessons:read
 */
export const getModuleCompletionStats = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { id: moduleId } = req.params;

  const stats = await ModuleCompletionService.getModuleCompletionStats(moduleId);

  res.status(200).json(ApiResponse.success({
    moduleId,
    stats
  }));
});

/**
 * GET /api/v2/departments/:id/modules
 * List modules owned by a department
 *
 * Access Right: content:lessons:read
 */
export const getDepartmentModules = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { id: departmentId } = req.params;
  const { isShared, isPublished, page, limit } = req.query;

  const filters: any = {};

  if (isShared !== undefined) {
    filters.isShared = isShared === 'true';
  }

  if (isPublished !== undefined) {
    filters.isPublished = isPublished === 'true';
  }

  if (page) {
    filters.page = parseInt(page as string, 10);
  }

  if (limit) {
    filters.limit = parseInt(limit as string, 10);
  }

  const result = await ModuleCompletionService.getDepartmentModules(departmentId, filters);

  res.status(200).json(ApiResponse.success({
    modules: result.modules,
    pagination: result.pagination
  }));
});

/**
 * GET /api/v2/departments/:id/modules/available
 * List modules available to a department (owned + shared)
 *
 * Access Right: content:lessons:read
 */
export const getAvailableModules = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { id: departmentId } = req.params;
  const { isPublished, page, limit } = req.query;

  const filters: any = {};

  if (isPublished !== undefined) {
    filters.isPublished = isPublished === 'true';
  }

  if (page) {
    filters.page = parseInt(page as string, 10);
  }

  if (limit) {
    filters.limit = parseInt(limit as string, 10);
  }

  const result = await ModuleCompletionService.getAvailableModules(departmentId, filters);

  res.status(200).json(ApiResponse.success({
    modules: result.modules,
    pagination: result.pagination
  }));
});

/**
 * GET /api/v2/module-completions/check
 * Check if current user has completed specific modules
 *
 * Query: moduleIds (comma-separated)
 */
export const checkCompletions = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { moduleIds } = req.query;

  if (!moduleIds) {
    throw ApiError.badRequest('moduleIds query parameter is required');
  }

  const moduleIdArray = (moduleIds as string).split(',').map(id => id.trim());

  if (moduleIdArray.length === 0) {
    throw ApiError.badRequest('At least one moduleId is required');
  }

  if (moduleIdArray.length > 50) {
    throw ApiError.badRequest('Cannot check more than 50 modules at once');
  }

  const completionMap = await ModuleCompletionService.checkBulkCompletions(
    user.userId,
    moduleIdArray
  );

  // Convert Map to object for JSON response
  const completions: Record<string, boolean> = {};
  completionMap.forEach((completed, moduleId) => {
    completions[moduleId] = completed;
  });

  res.status(200).json(ApiResponse.success({
    learnerId: user.userId,
    completions
  }));
});
