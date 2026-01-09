import { Request, Response } from 'express';
import { PermissionsService } from '@/services/auth/permissions.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Permissions Controller
 * Handles all /api/v2/permissions endpoints
 */

/**
 * GET /api/v2/permissions
 * List all available permissions
 */
export const listPermissions = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    category: req.query.category as string | undefined
  };

  // Validate category if provided
  const validCategories = ['users', 'courses', 'content', 'enrollments', 'assessments', 'reports', 'settings', 'system'];
  if (filters.category && !validCategories.includes(filters.category)) {
    throw ApiError.badRequest(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  const result = await PermissionsService.listPermissions(filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/permissions/roles
 * List all roles with their permissions
 */
export const listRoles = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    includeBuiltIn: req.query.includeBuiltIn !== 'false',
    includeCustom: req.query.includeCustom !== 'false',
    departmentId: req.query.departmentId as string | undefined
  };

  const result = await PermissionsService.listRoles(filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/permissions/roles/:roleId
 * Get role details with permissions
 */
export const getRoleDetails = asyncHandler(async (req: Request, res: Response) => {
  const { roleId } = req.params;
  const includeUsers = req.query.includeUsers === 'true';

  if (!roleId) {
    throw ApiError.badRequest('Role ID is required');
  }

  const result = await PermissionsService.getRoleDetails(roleId, includeUsers);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/permissions/roles
 * Create a new custom role
 */
export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, level, permissions, departmentId, inheritsFrom } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw ApiError.badRequest('Role name is required');
  }

  if (name.length < 3 || name.length > 50) {
    throw ApiError.badRequest('Role name must be between 3 and 50 characters');
  }

  // Validate name pattern
  const namePattern = /^[a-z0-9-]+$/;
  if (!namePattern.test(name)) {
    throw ApiError.badRequest('Role name must be lowercase with hyphens only (e.g., course-reviewer)');
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    throw ApiError.badRequest('Role description is required');
  }

  if (description.length < 10 || description.length > 500) {
    throw ApiError.badRequest('Role description must be between 10 and 500 characters');
  }

  // Validate level if provided
  if (level !== undefined && level !== null) {
    if (typeof level !== 'number' || level < 11 || level > 99) {
      throw ApiError.badRequest('Role level must be a number between 11 and 99');
    }
  }

  // Validate permissions
  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
    throw ApiError.badRequest('At least one permission is required');
  }

  // Validate permission format
  for (const perm of permissions) {
    if (typeof perm !== 'string' || !perm.includes(':')) {
      throw ApiError.badRequest('Invalid permission format. Must be in format "category:level"');
    }
  }

  const roleData = {
    name: name.trim().toLowerCase(),
    description: description.trim(),
    level,
    permissions,
    departmentId,
    inheritsFrom
  };

  // Get createdBy from authenticated user
  const createdBy = (req as any).user?.id;

  const result = await PermissionsService.createRole(roleData, createdBy);
  res.status(201).json(ApiResponse.success(result, 'Custom role created successfully'));
});

/**
 * PUT /api/v2/permissions/roles/:roleId
 * Update a custom role
 */
export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const { roleId } = req.params;
  const { description, level, permissions, isActive } = req.body;

  if (!roleId) {
    throw ApiError.badRequest('Role ID is required');
  }

  // Validate description if provided
  if (description !== undefined) {
    if (typeof description !== 'string' || description.trim().length === 0) {
      throw ApiError.badRequest('Role description cannot be empty');
    }
    if (description.length < 10 || description.length > 500) {
      throw ApiError.badRequest('Role description must be between 10 and 500 characters');
    }
  }

  // Validate level if provided
  if (level !== undefined && level !== null) {
    if (typeof level !== 'number' || level < 11 || level > 99) {
      throw ApiError.badRequest('Role level must be a number between 11 and 99');
    }
  }

  // Validate permissions if provided
  if (permissions !== undefined) {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw ApiError.badRequest('At least one permission is required');
    }

    // Validate permission format
    for (const perm of permissions) {
      if (typeof perm !== 'string' || !perm.includes(':')) {
        throw ApiError.badRequest('Invalid permission format. Must be in format "category:level"');
      }
    }
  }

  // Validate isActive if provided
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw ApiError.badRequest('isActive must be a boolean');
  }

  const updateData: any = {};
  if (description !== undefined) updateData.description = description.trim();
  if (level !== undefined) updateData.level = level;
  if (permissions !== undefined) updateData.permissions = permissions;
  if (isActive !== undefined) updateData.isActive = isActive;

  // Get updatedBy from authenticated user
  const updatedBy = (req as any).user?.id;

  const result = await PermissionsService.updateRole(roleId, updateData, updatedBy);
  res.status(200).json(ApiResponse.success(result, 'Role updated successfully'));
});

/**
 * DELETE /api/v2/permissions/roles/:roleId
 * Delete a custom role
 */
export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const { roleId } = req.params;
  const { reassignTo } = req.query;

  if (!roleId) {
    throw ApiError.badRequest('Role ID is required');
  }

  const result = await PermissionsService.deleteRole(roleId, reassignTo as string | undefined);
  res.status(200).json(ApiResponse.success(result, 'Role deleted successfully'));
});

/**
 * GET /api/v2/permissions/user/:userId
 * Get user's effective permissions
 */
export const getUserPermissions = asyncHandler(async (req: Request, res: Response) => {
  let { userId } = req.params;
  const { departmentId } = req.query;

  if (!userId) {
    throw ApiError.badRequest('User ID is required');
  }

  // Handle "me" keyword
  if (userId === 'me') {
    const authenticatedUserId = (req as any).user?.id;
    if (!authenticatedUserId) {
      throw ApiError.unauthorized('Authentication required');
    }
    userId = authenticatedUserId;
  }

  const result = await PermissionsService.getUserPermissions(userId, departmentId as string | undefined);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/permissions/check
 * Check if current user has specific permission(s)
 */
export const checkPermission = asyncHandler(async (req: Request, res: Response) => {
  const { permission, permissions, requireAll, departmentId, resourceId } = req.body;

  // Validate input
  if (!permission && !permissions) {
    throw ApiError.badRequest('Must provide either permission or permissions array');
  }

  if (permission && permissions) {
    throw ApiError.badRequest('Cannot provide both permission and permissions. Choose one.');
  }

  if (permissions && !Array.isArray(permissions)) {
    throw ApiError.badRequest('permissions must be an array');
  }

  if (permissions && permissions.length === 0) {
    throw ApiError.badRequest('permissions array cannot be empty');
  }

  // Validate permission format
  if (permission && (typeof permission !== 'string' || !permission.includes(':'))) {
    throw ApiError.badRequest('Invalid permission format. Must be in format "category:level"');
  }

  if (permissions) {
    for (const perm of permissions) {
      if (typeof perm !== 'string' || !perm.includes(':')) {
        throw ApiError.badRequest('Invalid permission format. Must be in format "category:level"');
      }
    }
  }

  // Validate requireAll if provided
  if (requireAll !== undefined && typeof requireAll !== 'boolean') {
    throw ApiError.badRequest('requireAll must be a boolean');
  }

  // Get authenticated user ID
  const userId = (req as any).user?.id;
  if (!userId) {
    throw ApiError.unauthorized('Authentication required');
  }

  const checkData = {
    permission,
    permissions,
    requireAll,
    departmentId,
    resourceId
  };

  const result = await PermissionsService.checkPermission(userId, checkData);
  res.status(200).json(ApiResponse.success(result));
});
