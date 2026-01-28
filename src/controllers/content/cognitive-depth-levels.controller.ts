import { Request, Response } from 'express';
import { CognitiveDepthLevelsService } from '@/services/content/cognitive-depth-levels.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Cognitive Depth Levels Controller
 *
 * Handles cognitive depth level management endpoints.
 * Supports system defaults and department-specific overrides.
 *
 * @module controllers/content/cognitive-depth-levels
 */

/**
 * GET /api/v2/cognitive-depth-levels
 * List system default cognitive depth levels
 */
export const listSystemDefaults = asyncHandler(async (_req: Request, res: Response) => {
  const levels = await CognitiveDepthLevelsService.getSystemDefaults();

  res.status(200).json(
    ApiResponse.success(levels, 'System default cognitive depth levels retrieved successfully')
  );
});

/**
 * GET /api/v2/departments/:departmentId/cognitive-depth-levels
 * List cognitive depth levels for a department (merged with system defaults)
 */
export const listForDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;

  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  const levels = await CognitiveDepthLevelsService.getForDepartment(departmentId);

  res.status(200).json(
    ApiResponse.success(levels, 'Cognitive depth levels retrieved successfully')
  );
});

/**
 * POST /api/v2/departments/:departmentId/cognitive-depth-levels
 * Create a department-specific cognitive depth level
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const { slug, name, description, order, advanceThreshold, minAttempts } = req.body;

  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  // Validate required fields
  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    throw ApiError.badRequest('Slug is required and must be a non-empty string');
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw ApiError.badRequest('Name is required and must be a non-empty string');
  }

  if (order === undefined || order === null) {
    throw ApiError.badRequest('Order is required');
  }

  if (typeof order !== 'number' || !Number.isInteger(order) || order < 0) {
    throw ApiError.badRequest('Order must be a non-negative integer');
  }

  if (advanceThreshold === undefined || advanceThreshold === null) {
    throw ApiError.badRequest('Advance threshold is required');
  }

  if (typeof advanceThreshold !== 'number' || advanceThreshold < 0 || advanceThreshold > 100) {
    throw ApiError.badRequest('Advance threshold must be a number between 0 and 100');
  }

  if (minAttempts === undefined || minAttempts === null) {
    throw ApiError.badRequest('Minimum attempts is required');
  }

  if (typeof minAttempts !== 'number' || !Number.isInteger(minAttempts) || minAttempts < 1) {
    throw ApiError.badRequest('Minimum attempts must be a positive integer');
  }

  // Validate optional fields
  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw ApiError.badRequest('Description must be a string');
  }

  const level = await CognitiveDepthLevelsService.create(departmentId, {
    slug: slug.trim(),
    name: name.trim(),
    description: description?.trim(),
    order,
    advanceThreshold,
    minAttempts
  });

  res.status(201).json(
    ApiResponse.created(level, 'Cognitive depth level created successfully')
  );
});

/**
 * PUT /api/v2/departments/:departmentId/cognitive-depth-levels/:slug
 * Update a department-specific cognitive depth level
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, slug } = req.params;
  const { name, description, order, advanceThreshold, minAttempts, isActive } = req.body;

  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  if (!slug) {
    throw ApiError.badRequest('Slug is required');
  }

  // Validate optional fields if provided
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    throw ApiError.badRequest('Name must be a non-empty string');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw ApiError.badRequest('Description must be a string');
  }

  if (order !== undefined && order !== null) {
    if (typeof order !== 'number' || !Number.isInteger(order) || order < 0) {
      throw ApiError.badRequest('Order must be a non-negative integer');
    }
  }

  if (advanceThreshold !== undefined && advanceThreshold !== null) {
    if (typeof advanceThreshold !== 'number' || advanceThreshold < 0 || advanceThreshold > 100) {
      throw ApiError.badRequest('Advance threshold must be a number between 0 and 100');
    }
  }

  if (minAttempts !== undefined && minAttempts !== null) {
    if (typeof minAttempts !== 'number' || !Number.isInteger(minAttempts) || minAttempts < 1) {
      throw ApiError.badRequest('Minimum attempts must be a positive integer');
    }
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw ApiError.badRequest('isActive must be a boolean');
  }

  const level = await CognitiveDepthLevelsService.update(departmentId, slug, {
    name: name?.trim(),
    description: description?.trim(),
    order,
    advanceThreshold,
    minAttempts,
    isActive
  });

  res.status(200).json(
    ApiResponse.success(level, 'Cognitive depth level updated successfully')
  );
});

/**
 * DELETE /api/v2/departments/:departmentId/cognitive-depth-levels/:slug
 * Delete a department-specific cognitive depth level (reverts to system default if exists)
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, slug } = req.params;

  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  if (!slug) {
    throw ApiError.badRequest('Slug is required');
  }

  await CognitiveDepthLevelsService.delete(departmentId, slug);

  res.status(200).json(
    ApiResponse.success(null, 'Cognitive depth level deleted successfully')
  );
});
