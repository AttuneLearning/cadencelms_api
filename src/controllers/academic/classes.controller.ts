import { Request, Response } from 'express';
import { ClassesService } from '@/services/academic/classes.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Classes Controller
 * Handles all class management endpoints
 */

/**
 * GET /api/v2/classes
 * List all classes with filters
 */
export const listClasses = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    course: req.query.course as string | undefined,
    program: req.query.program as string | undefined,
    instructor: req.query.instructor as string | undefined,
    status: req.query.status as 'upcoming' | 'active' | 'completed' | 'cancelled' | undefined,
    department: req.query.department as string | undefined,
    term: req.query.term as string | undefined,
    search: req.query.search as string | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate status if provided
  if (filters.status && !['upcoming', 'active', 'completed', 'cancelled'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: upcoming, active, completed, cancelled');
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  const result = await ClassesService.listClasses(filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/classes
 * Create a new class
 */
export const createClass = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    course,
    program,
    programLevel,
    instructors,
    startDate,
    endDate,
    duration,
    capacity,
    academicTerm
  } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw ApiError.badRequest('Name is required and must be a non-empty string');
  }

  if (name.length > 200) {
    throw ApiError.badRequest('Name cannot exceed 200 characters');
  }

  if (!course || typeof course !== 'string') {
    throw ApiError.badRequest('Course ID is required');
  }

  if (!program || typeof program !== 'string') {
    throw ApiError.badRequest('Program ID is required');
  }

  if (!instructors || !Array.isArray(instructors) || instructors.length === 0) {
    throw ApiError.badRequest('At least one instructor is required');
  }

  // Validate instructors structure
  for (const instructor of instructors) {
    if (!instructor.userId || typeof instructor.userId !== 'string') {
      throw ApiError.badRequest('Each instructor must have a valid userId');
    }
    if (!instructor.role || !['primary', 'secondary'].includes(instructor.role)) {
      throw ApiError.badRequest('Each instructor must have a role of "primary" or "secondary"');
    }
  }

  if (!startDate) {
    throw ApiError.badRequest('Start date is required');
  }

  if (!endDate) {
    throw ApiError.badRequest('End date is required');
  }

  // Validate dates
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  if (isNaN(startDateObj.getTime())) {
    throw ApiError.badRequest('Start date must be a valid ISO 8601 date');
  }

  if (isNaN(endDateObj.getTime())) {
    throw ApiError.badRequest('End date must be a valid ISO 8601 date');
  }

  // Validate duration if provided
  if (duration !== undefined && (typeof duration !== 'number' || duration < 1)) {
    throw ApiError.badRequest('Duration must be a positive number');
  }

  // Validate capacity if provided
  if (capacity !== undefined && capacity !== null) {
    if (typeof capacity !== 'number' || capacity < 1) {
      throw ApiError.badRequest('Capacity must be a positive number or null for unlimited');
    }
  }

  const classData = {
    name: name.trim(),
    course,
    program,
    programLevel: programLevel || undefined,
    instructors,
    startDate: startDateObj,
    endDate: endDateObj,
    duration,
    capacity,
    academicTerm: academicTerm || undefined
  };

  const result = await ClassesService.createClass(classData);
  res.status(201).json(ApiResponse.success(result, 'Class created successfully'));
});

/**
 * GET /api/v2/classes/:id
 * Get details of a specific class
 */
export const getClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await ClassesService.getClassById(id);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/classes/:id
 * Update a class
 */
export const updateClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    instructors,
    startDate,
    endDate,
    duration,
    capacity,
    academicTerm,
    status
  } = req.body;

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw ApiError.badRequest('Name must be a non-empty string');
    }
    if (name.length > 200) {
      throw ApiError.badRequest('Name cannot exceed 200 characters');
    }
  }

  // Validate instructors if provided
  if (instructors !== undefined) {
    if (!Array.isArray(instructors) || instructors.length === 0) {
      throw ApiError.badRequest('At least one instructor is required');
    }

    for (const instructor of instructors) {
      if (!instructor.userId || typeof instructor.userId !== 'string') {
        throw ApiError.badRequest('Each instructor must have a valid userId');
      }
      if (!instructor.role || !['primary', 'secondary'].includes(instructor.role)) {
        throw ApiError.badRequest('Each instructor must have a role of "primary" or "secondary"');
      }
    }
  }

  // Validate dates if provided
  let startDateObj: Date | undefined;
  let endDateObj: Date | undefined;

  if (startDate !== undefined) {
    startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      throw ApiError.badRequest('Start date must be a valid ISO 8601 date');
    }
  }

  if (endDate !== undefined) {
    endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      throw ApiError.badRequest('End date must be a valid ISO 8601 date');
    }
  }

  // Validate duration if provided
  if (duration !== undefined && (typeof duration !== 'number' || duration < 1)) {
    throw ApiError.badRequest('Duration must be a positive number');
  }

  // Validate capacity if provided
  if (capacity !== undefined && capacity !== null) {
    if (typeof capacity !== 'number' || capacity < 1) {
      throw ApiError.badRequest('Capacity must be a positive number or null for unlimited');
    }
  }

  // Validate status if provided
  if (status !== undefined && !['upcoming', 'active', 'completed', 'cancelled'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: upcoming, active, completed, cancelled');
  }

  const updateData = {
    name: name !== undefined ? name.trim() : undefined,
    instructors,
    startDate: startDateObj,
    endDate: endDateObj,
    duration,
    capacity,
    academicTerm: academicTerm || undefined,
    status
  };

  const result = await ClassesService.updateClass(id, updateData);
  res.status(200).json(ApiResponse.success(result, 'Class updated successfully'));
});

/**
 * DELETE /api/v2/classes/:id
 * Delete a class
 */
export const deleteClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const force = req.query.force === 'true';

  const result = await ClassesService.deleteClass(id, force);
  res.status(200).json(ApiResponse.success(result, 'Class deleted successfully'));
});

/**
 * GET /api/v2/classes/:id/enrollments
 * Get all enrollments for a class
 */
export const getClassEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const filters = {
    status: req.query.status as 'active' | 'withdrawn' | 'completed' | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate status if provided
  if (filters.status && !['active', 'withdrawn', 'completed'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, withdrawn, completed');
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 200)) {
    throw ApiError.badRequest('Limit must be between 1 and 200');
  }

  const result = await ClassesService.listClassEnrollments(id, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/classes/:id/enrollments
 * Enroll one or more learners in a class
 */
export const enrollLearners = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { learnerIds, enrolledAt } = req.body;

  // Validate required fields
  if (!learnerIds || !Array.isArray(learnerIds) || learnerIds.length === 0) {
    throw ApiError.badRequest('At least one learner ID is required');
  }

  // Validate learner IDs
  for (const learnerId of learnerIds) {
    if (typeof learnerId !== 'string') {
      throw ApiError.badRequest('All learner IDs must be strings');
    }
  }

  // Validate enrolledAt if provided
  let enrolledAtObj: Date | undefined;
  if (enrolledAt !== undefined) {
    enrolledAtObj = new Date(enrolledAt);
    if (isNaN(enrolledAtObj.getTime())) {
      throw ApiError.badRequest('enrolledAt must be a valid ISO 8601 date');
    }
  }

  const result = await ClassesService.enrollLearnersInClass(id, learnerIds, enrolledAtObj);

  const message = result.successCount === learnerIds.length
    ? `${result.successCount} learner${result.successCount > 1 ? 's' : ''} enrolled successfully`
    : `${result.successCount} learner${result.successCount > 1 ? 's' : ''} enrolled successfully, ${result.failedCount} failed`;

  res.status(201).json(ApiResponse.success(result, message));
});

/**
 * DELETE /api/v2/classes/:id/enrollments/:enrollmentId
 * Remove a learner enrollment from a class
 */
export const dropEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const { id, enrollmentId } = req.params;
  const reason = req.query.reason as string | undefined;

  // Validate reason length if provided
  if (reason && reason.length > 500) {
    throw ApiError.badRequest('Reason cannot exceed 500 characters');
  }

  const result = await ClassesService.dropLearnerFromClass(id, enrollmentId, reason);
  res.status(200).json(ApiResponse.success(result, 'Enrollment withdrawn successfully'));
});

/**
 * GET /api/v2/classes/:id/roster
 * Get class roster with learner details and progress
 */
export const getClassRoster = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const includeProgress = req.query.includeProgress !== 'false'; // Default true
  const status = req.query.status as string | undefined;

  // Validate status if provided
  if (status && !['active', 'withdrawn', 'completed'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, withdrawn, completed');
  }

  const result = await ClassesService.getClassRoster(id, includeProgress, status);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/classes/:id/progress
 * Get class-wide progress statistics
 */
export const getClassProgress = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await ClassesService.getClassProgress(id);
  res.status(200).json(ApiResponse.success(result));
});
