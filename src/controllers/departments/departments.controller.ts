import { Request, Response } from 'express';
import { DepartmentsService } from '@/services/departments/departments.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Departments Controller
 * Handles all /api/v2/departments endpoints
 */

/**
 * GET /api/v2/departments
 * List departments with optional filtering and pagination
 */
export const listDepartments = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
    search: req.query.search as string | undefined,
    parentId: req.query.parentId as string | undefined,
    status: req.query.status as 'active' | 'inactive' | undefined,
    sort: req.query.sort as string | undefined
  };

  // Validate pagination
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate status
  if (filters.status && !['active', 'inactive'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, inactive');
  }

  const result = await DepartmentsService.listDepartments(filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/departments
 * Create a new department
 */
export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { name, code, description, parentId, status } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw ApiError.badRequest('Department name is required');
  }

  if (name.length > 200) {
    throw ApiError.badRequest('Department name cannot exceed 200 characters');
  }

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    throw ApiError.badRequest('Department code is required');
  }

  if (code.length < 2 || code.length > 20) {
    throw ApiError.badRequest('Department code must be between 2 and 20 characters');
  }

  // Validate code pattern
  const codePattern = /^[A-Z0-9-]+$/;
  if (!codePattern.test(code)) {
    throw ApiError.badRequest('Department code must contain only uppercase letters, numbers, and hyphens');
  }

  // Validate description length
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      throw ApiError.badRequest('Description must be a string');
    }
    if (description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }
  }

  // Validate status
  if (status && !['active', 'inactive'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, inactive');
  }

  const deptData = {
    name: name.trim(),
    code: code.trim().toUpperCase(),
    description: description?.trim(),
    parentId,
    status: status || 'active'
  };

  const result = await DepartmentsService.createDepartment(deptData);
  res.status(201).json(ApiResponse.success(result, 'Department created successfully'));
});

/**
 * GET /api/v2/departments/:id
 * Get department details by ID
 */
export const getDepartmentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Department ID is required');
  }

  const result = await DepartmentsService.getDepartmentById(id);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/departments/:id
 * Update department information
 */
export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code, description, parentId, status } = req.body;

  if (!id) {
    throw ApiError.badRequest('Department ID is required');
  }

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw ApiError.badRequest('Department name cannot be empty');
    }
    if (name.length > 200) {
      throw ApiError.badRequest('Department name cannot exceed 200 characters');
    }
  }

  // Validate code if provided
  if (code !== undefined) {
    if (typeof code !== 'string' || code.trim().length === 0) {
      throw ApiError.badRequest('Department code cannot be empty');
    }
    if (code.length < 2 || code.length > 20) {
      throw ApiError.badRequest('Department code must be between 2 and 20 characters');
    }

    // Validate code pattern
    const codePattern = /^[A-Z0-9-]+$/;
    if (!codePattern.test(code)) {
      throw ApiError.badRequest('Department code must contain only uppercase letters, numbers, and hyphens');
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

  // Validate status if provided
  if (status && !['active', 'inactive'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, inactive');
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name.trim();
  if (code !== undefined) updateData.code = code.trim().toUpperCase();
  if (description !== undefined) updateData.description = description?.trim();
  if (parentId !== undefined) updateData.parentId = parentId;
  if (status !== undefined) updateData.status = status;

  const result = await DepartmentsService.updateDepartment(id, updateData);
  res.status(200).json(ApiResponse.success(result, 'Department updated successfully'));
});

/**
 * DELETE /api/v2/departments/:id
 * Delete department (soft delete)
 */
export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Department ID is required');
  }

  await DepartmentsService.deleteDepartment(id);
  res.status(200).json(ApiResponse.success(null, 'Department deleted successfully'));
});

/**
 * GET /api/v2/departments/:id/hierarchy
 * Get department hierarchy (ancestors + descendants)
 */
export const getDepartmentHierarchy = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Department ID is required');
  }

  const depth = req.query.depth ? parseInt(req.query.depth as string, 10) : undefined;
  const includeInactive = req.query.includeInactive === 'true';

  // Validate depth
  if (depth !== undefined) {
    if (isNaN(depth) || depth < 1 || depth > 5) {
      throw ApiError.badRequest('Depth must be between 1 and 5');
    }
  }

  const result = await DepartmentsService.getDepartmentHierarchy(id, depth, includeInactive);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/departments/:id/programs
 * Get programs in a department
 */
export const getDepartmentPrograms = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Department ID is required');
  }

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
    status: req.query.status as 'active' | 'inactive' | 'archived' | undefined,
    includeChildDepartments: req.query.includeChildDepartments === 'true'
  };

  // Validate pagination
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

  const result = await DepartmentsService.getDepartmentPrograms(id, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/departments/:id/staff
 * Get staff assigned to department
 */
export const getDepartmentStaff = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Department ID is required');
  }

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
    role: req.query.role as 'content-admin' | 'instructor' | 'observer' | undefined,
    status: req.query.status as 'active' | 'inactive' | undefined,
    search: req.query.search as string | undefined
  };

  // Validate pagination
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate role
  if (filters.role && !['content-admin', 'instructor', 'observer'].includes(filters.role)) {
    throw ApiError.badRequest('Invalid role. Must be one of: content-admin, instructor, observer');
  }

  // Validate status
  if (filters.status && !['active', 'inactive'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, inactive');
  }

  const result = await DepartmentsService.getDepartmentStaff(id, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/departments/:id/stats
 * Get department statistics
 */
export const getDepartmentStats = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Department ID is required');
  }

  const params = {
    includeChildDepartments: req.query.includeChildDepartments === 'true',
    period: req.query.period as 'week' | 'month' | 'quarter' | 'year' | 'all' | undefined
  };

  // Validate period
  if (params.period && !['week', 'month', 'quarter', 'year', 'all'].includes(params.period)) {
    throw ApiError.badRequest('Invalid period. Must be one of: week, month, quarter, year, all');
  }

  const result = await DepartmentsService.getDepartmentStats(id, params);
  res.status(200).json(ApiResponse.success(result));
});
