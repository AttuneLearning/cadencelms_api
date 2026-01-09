import { Request, Response } from 'express';
import { ProgramsService } from '@/services/academic/programs.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Programs Controller
 * Handles all /api/v2/programs endpoints
 */

/**
 * GET /api/v2/programs
 * List all programs with filtering and pagination
 */
export const listPrograms = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    department: req.query.department as string,
    status: req.query.status as 'active' | 'inactive' | 'archived' | undefined,
    search: req.query.search as string,
    sort: req.query.sort as string
  };

  // Validate page and limit
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }
  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate status
  if (filters.status && !['active', 'inactive', 'archived'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, inactive, archived');
  }

  const result = await ProgramsService.listPrograms(filters, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/programs
 * Create a new program
 */
export const createProgram = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const { name, code, description, department, credential, duration, durationUnit, isPublished } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
    throw ApiError.badRequest('Name is required and must be between 1 and 200 characters');
  }

  if (!code || typeof code !== 'string' || code.length < 2 || code.length > 20) {
    throw ApiError.badRequest('Code is required and must be between 2 and 20 characters');
  }

  // Validate code pattern
  const codePattern = /^[A-Z0-9-]+$/;
  if (!codePattern.test(code)) {
    throw ApiError.badRequest('Code must contain only uppercase letters, numbers, and hyphens');
  }

  if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
    throw ApiError.badRequest('Description must not exceed 2000 characters');
  }

  if (!department || typeof department !== 'string') {
    throw ApiError.badRequest('Department is required');
  }

  if (!credential || !['certificate', 'diploma', 'degree'].includes(credential)) {
    throw ApiError.badRequest('Credential is required and must be one of: certificate, diploma, degree');
  }

  if (!duration || typeof duration !== 'number' || duration < 1) {
    throw ApiError.badRequest('Duration is required and must be at least 1');
  }

  if (!durationUnit || !['hours', 'weeks', 'months', 'years'].includes(durationUnit)) {
    throw ApiError.badRequest('Duration unit is required and must be one of: hours, weeks, months, years');
  }

  if (isPublished !== undefined && typeof isPublished !== 'boolean') {
    throw ApiError.badRequest('isPublished must be a boolean');
  }

  const programData = {
    name: name.trim(),
    code: code.toUpperCase(),
    description: description?.trim(),
    department,
    credential,
    duration,
    durationUnit,
    isPublished
  };

  const result = await ProgramsService.createProgram(programData, userId);
  res.status(201).json(ApiResponse.success(result, 'Program created successfully'));
});

/**
 * GET /api/v2/programs/:id
 * Get detailed information about a specific program
 */
export const getProgramById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await ProgramsService.getProgramById(id, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/programs/:id
 * Update program information
 */
export const updateProgram = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const { name, code, description, credential, duration, durationUnit, isPublished, status } = req.body;

  // Validate fields if provided
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 200)) {
    throw ApiError.badRequest('Name must be between 1 and 200 characters');
  }

  if (code !== undefined) {
    if (typeof code !== 'string' || code.length < 2 || code.length > 20) {
      throw ApiError.badRequest('Code must be between 2 and 20 characters');
    }
    const codePattern = /^[A-Z0-9-]+$/;
    if (!codePattern.test(code)) {
      throw ApiError.badRequest('Code must contain only uppercase letters, numbers, and hyphens');
    }
  }

  if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 2000)) {
    throw ApiError.badRequest('Description must not exceed 2000 characters');
  }

  if (credential !== undefined && !['certificate', 'diploma', 'degree'].includes(credential)) {
    throw ApiError.badRequest('Credential must be one of: certificate, diploma, degree');
  }

  if (duration !== undefined && (typeof duration !== 'number' || duration < 1)) {
    throw ApiError.badRequest('Duration must be at least 1');
  }

  if (durationUnit !== undefined && !['hours', 'weeks', 'months', 'years'].includes(durationUnit)) {
    throw ApiError.badRequest('Duration unit must be one of: hours, weeks, months, years');
  }

  if (isPublished !== undefined && typeof isPublished !== 'boolean') {
    throw ApiError.badRequest('isPublished must be a boolean');
  }

  if (status !== undefined && !['active', 'inactive', 'archived'].includes(status)) {
    throw ApiError.badRequest('Status must be one of: active, inactive, archived');
  }

  const updateData = {
    name: name?.trim(),
    code: code?.toUpperCase(),
    description: description?.trim(),
    credential,
    duration,
    durationUnit,
    isPublished,
    status
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData];
    }
  });

  const result = await ProgramsService.updateProgram(id, updateData, userId);
  res.status(200).json(ApiResponse.success(result, 'Program updated successfully'));
});

/**
 * DELETE /api/v2/programs/:id
 * Delete a program (soft delete)
 */
export const deleteProgram = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  await ProgramsService.deleteProgram(id, userId);
  res.status(200).json(ApiResponse.success(null, 'Program deleted successfully'));
});

/**
 * GET /api/v2/programs/:id/levels
 * Get all levels for a specific program
 */
export const getProgramLevels = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await ProgramsService.getProgramLevels(id, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/programs/:id/levels
 * Create a new level in a program
 */
export const createProgramLevel = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const { name, levelNumber, description } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
    throw ApiError.badRequest('Name is required and must be between 1 and 200 characters');
  }

  if (!levelNumber || typeof levelNumber !== 'number' || levelNumber < 1) {
    throw ApiError.badRequest('Level number is required and must be at least 1');
  }

  if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
    throw ApiError.badRequest('Description must not exceed 2000 characters');
  }

  const levelData = {
    name: name.trim(),
    levelNumber,
    description: description?.trim()
  };

  const result = await ProgramsService.createProgramLevel(id, levelData, userId);
  res.status(201).json(ApiResponse.success(result, 'Program level created successfully'));
});

/**
 * GET /api/v2/programs/:id/courses
 * Get all courses in a specific program
 */
export const getProgramCourses = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const levelId = req.query.level as string | undefined;
  const status = req.query.status as string | undefined;

  // Validate status if provided
  if (status && !['published', 'draft', 'archived'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: published, draft, archived');
  }

  const result = await ProgramsService.getProgramCourses(id, levelId, status, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/programs/:id/enrollments
 * Get all enrollments for a specific program
 */
export const getProgramEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    status: req.query.status as 'active' | 'completed' | 'withdrawn' | undefined,
    search: req.query.search as string
  };

  // Validate page and limit
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }
  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate status
  if (filters.status && !['active', 'completed', 'withdrawn'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, completed, withdrawn');
  }

  const result = await ProgramsService.getProgramEnrollments(id, filters, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PATCH /api/v2/programs/:id/department
 * Move a program to a different department
 */
export const updateProgramDepartment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const { department } = req.body;

  // Validate required field
  if (!department || typeof department !== 'string') {
    throw ApiError.badRequest('Department is required');
  }

  const result = await ProgramsService.updateProgramDepartment(id, department, userId);
  res.status(200).json(ApiResponse.success(result, 'Program moved to new department successfully'));
});
