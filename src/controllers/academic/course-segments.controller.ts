import { Request, Response } from 'express';
import { CourseSegmentsService } from '@/services/academic/course-segments.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Course Segments (Modules) Controller
 * Handles all course module management endpoints
 */

/**
 * GET /api/v2/courses/:courseId/modules
 * List all modules in a course
 */
export const listModules = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;

  const filters = {
    includeUnpublished: req.query.includeUnpublished === 'true',
    sort: req.query.sort as string | undefined
  };

  // Validate sort if provided
  const validSorts = ['order', 'title', 'createdAt'];
  if (filters.sort && !validSorts.includes(filters.sort)) {
    throw ApiError.badRequest(`Invalid sort field. Must be one of: ${validSorts.join(', ')}`);
  }

  const result = await CourseSegmentsService.listCourseModules(courseId, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/courses/:courseId/modules
 * Create a new module in a course
 */
export const createModule = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { title, description, order, type, contentId, settings, isPublished, passingScore, duration } = req.body;

  // Validate required fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw ApiError.badRequest('Title is required and must be a non-empty string');
  }

  if (title.length > 200) {
    throw ApiError.badRequest('Title cannot exceed 200 characters');
  }

  if (order === undefined || typeof order !== 'number') {
    throw ApiError.badRequest('Order is required and must be a number');
  }

  if (order < 1) {
    throw ApiError.badRequest('Order must be at least 1');
  }

  if (!type || typeof type !== 'string') {
    throw ApiError.badRequest('Type is required');
  }

  // Validate type
  const validTypes = ['scorm', 'custom', 'exercise', 'video', 'document'];
  if (!validTypes.includes(type)) {
    throw ApiError.badRequest(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate description if provided
  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw ApiError.badRequest('Description must be a string');
    }
    if (description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }
  }

  // Validate contentId if provided
  if (contentId !== undefined && typeof contentId !== 'string') {
    throw ApiError.badRequest('Content ID must be a string');
  }

  // Validate settings if provided
  if (settings !== undefined) {
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      throw ApiError.badRequest('Settings must be an object');
    }

    if (settings.allowMultipleAttempts !== undefined && typeof settings.allowMultipleAttempts !== 'boolean') {
      throw ApiError.badRequest('allowMultipleAttempts must be a boolean');
    }

    if (settings.maxAttempts !== undefined && settings.maxAttempts !== null && typeof settings.maxAttempts !== 'number') {
      throw ApiError.badRequest('maxAttempts must be a number or null');
    }

    if (settings.timeLimit !== undefined && settings.timeLimit !== null && typeof settings.timeLimit !== 'number') {
      throw ApiError.badRequest('timeLimit must be a number or null');
    }

    if (settings.showFeedback !== undefined && typeof settings.showFeedback !== 'boolean') {
      throw ApiError.badRequest('showFeedback must be a boolean');
    }

    if (settings.shuffleQuestions !== undefined && typeof settings.shuffleQuestions !== 'boolean') {
      throw ApiError.badRequest('shuffleQuestions must be a boolean');
    }
  }

  // Validate isPublished if provided
  if (isPublished !== undefined && typeof isPublished !== 'boolean') {
    throw ApiError.badRequest('isPublished must be a boolean');
  }

  // Validate passingScore if provided
  if (passingScore !== undefined) {
    if (typeof passingScore !== 'number') {
      throw ApiError.badRequest('Passing score must be a number');
    }
    if (passingScore < 0 || passingScore > 100) {
      throw ApiError.badRequest('Passing score must be between 0 and 100');
    }
  }

  // Validate duration if provided
  if (duration !== undefined) {
    if (typeof duration !== 'number') {
      throw ApiError.badRequest('Duration must be a number');
    }
    if (duration < 0) {
      throw ApiError.badRequest('Duration must be a positive number');
    }
  }

  const moduleData: any = {
    title: title.trim(),
    description: description !== undefined ? description.trim() : undefined,
    order,
    type,
    contentId,
    settings,
    isPublished,
    passingScore,
    duration
  };

  const result = await CourseSegmentsService.createCourseModule(courseId, moduleData);
  res.status(201).json(ApiResponse.success(result, 'Module created successfully'));
});

/**
 * GET /api/v2/courses/:courseId/modules/:moduleId
 * Get details of a specific module
 */
export const getModule = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, moduleId } = req.params;

  const result = await CourseSegmentsService.getCourseModuleById(courseId, moduleId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/courses/:courseId/modules/:moduleId
 * Update an existing module
 */
export const updateModule = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, moduleId } = req.params;
  const { title, description, type, contentId, settings, isPublished, passingScore, duration } = req.body;

  // Validate title if provided
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw ApiError.badRequest('Title must be a non-empty string');
    }
    if (title.length > 200) {
      throw ApiError.badRequest('Title cannot exceed 200 characters');
    }
  }

  // Validate description if provided
  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw ApiError.badRequest('Description must be a string');
    }
    if (description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }
  }

  // Validate type if provided
  if (type !== undefined) {
    const validTypes = ['scorm', 'custom', 'exercise', 'video', 'document'];
    if (!validTypes.includes(type)) {
      throw ApiError.badRequest(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  // Validate contentId if provided
  if (contentId !== undefined && contentId !== null && typeof contentId !== 'string') {
    throw ApiError.badRequest('Content ID must be a string');
  }

  // Validate settings if provided
  if (settings !== undefined) {
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      throw ApiError.badRequest('Settings must be an object');
    }

    if (settings.allowMultipleAttempts !== undefined && typeof settings.allowMultipleAttempts !== 'boolean') {
      throw ApiError.badRequest('allowMultipleAttempts must be a boolean');
    }

    if (settings.maxAttempts !== undefined && settings.maxAttempts !== null && typeof settings.maxAttempts !== 'number') {
      throw ApiError.badRequest('maxAttempts must be a number or null');
    }

    if (settings.timeLimit !== undefined && settings.timeLimit !== null && typeof settings.timeLimit !== 'number') {
      throw ApiError.badRequest('timeLimit must be a number or null');
    }

    if (settings.showFeedback !== undefined && typeof settings.showFeedback !== 'boolean') {
      throw ApiError.badRequest('showFeedback must be a boolean');
    }

    if (settings.shuffleQuestions !== undefined && typeof settings.shuffleQuestions !== 'boolean') {
      throw ApiError.badRequest('shuffleQuestions must be a boolean');
    }
  }

  // Validate isPublished if provided
  if (isPublished !== undefined && typeof isPublished !== 'boolean') {
    throw ApiError.badRequest('isPublished must be a boolean');
  }

  // Validate passingScore if provided
  if (passingScore !== undefined) {
    if (typeof passingScore !== 'number') {
      throw ApiError.badRequest('Passing score must be a number');
    }
    if (passingScore < 0 || passingScore > 100) {
      throw ApiError.badRequest('Passing score must be between 0 and 100');
    }
  }

  // Validate duration if provided
  if (duration !== undefined) {
    if (typeof duration !== 'number') {
      throw ApiError.badRequest('Duration must be a number');
    }
    if (duration < 0) {
      throw ApiError.badRequest('Duration must be a positive number');
    }
  }

  const updateData = {
    title: title !== undefined ? title.trim() : undefined,
    description: description !== undefined ? description.trim() : undefined,
    type,
    contentId,
    settings,
    isPublished,
    passingScore,
    duration
  };

  const result = await CourseSegmentsService.updateCourseModule(courseId, moduleId, updateData);
  res.status(200).json(ApiResponse.success(result, 'Module updated successfully'));
});

/**
 * DELETE /api/v2/courses/:courseId/modules/:moduleId
 * Delete a module from a course
 */
export const deleteModule = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, moduleId } = req.params;
  const force = req.query.force === 'true';

  const result = await CourseSegmentsService.deleteCourseModule(courseId, moduleId, force);
  res.status(200).json(
    ApiResponse.success(result, 'Module deleted successfully and subsequent modules reordered')
  );
});

/**
 * PATCH /api/v2/courses/:courseId/modules/reorder
 * Reorder modules within a course
 */
export const reorderModules = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { moduleIds } = req.body;

  // Validate moduleIds
  if (!moduleIds || !Array.isArray(moduleIds)) {
    throw ApiError.badRequest('moduleIds must be an array');
  }

  if (moduleIds.length === 0) {
    throw ApiError.badRequest('moduleIds array cannot be empty');
  }

  // Validate each ID is a string
  for (const id of moduleIds) {
    if (typeof id !== 'string') {
      throw ApiError.badRequest('All module IDs must be strings');
    }
  }

  const result = await CourseSegmentsService.reorderCourseModules(courseId, moduleIds);
  res.status(200).json(ApiResponse.success(result, 'Modules reordered successfully'));
});
