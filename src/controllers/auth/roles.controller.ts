import { Request, Response } from 'express';
import { RoleDefinition, USER_TYPES, UserType } from '@/models/RoleDefinition.model';
import { RoleService } from '@/services/auth/role.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

/**
 * Roles Controller
 * Handles all /api/v2/roles endpoints
 *
 * Provides role management and querying capabilities:
 * - List and query role definitions
 * - Get user's roles across departments
 * - Update role access rights (system-admin only)
 *
 * Reference: Phase 4, Task 4.2
 */

/**
 * GET /api/v2/roles
 * Query all RoleDefinition records
 *
 * Query params:
 * - userType: Filter by userType (learner, staff, global-admin)
 * - isActive: Filter by active status (default: true)
 * - sortBy: Sort field (sortOrder, name, displayName)
 */
export const listRoles = asyncHandler(async (req: Request, res: Response) => {
  const filters: any = {
    isActive: req.query.isActive !== 'false'
  };

  // Validate and add userType filter if provided
  if (req.query.userType) {
    const userType = req.query.userType as string;
    if (!USER_TYPES.includes(userType as UserType)) {
      throw ApiError.badRequest(`Invalid userType. Must be one of: ${USER_TYPES.join(', ')}`);
    }
    filters.userType = userType;
  }

  // Determine sort order
  let sortField = 'sortOrder';
  if (req.query.sortBy === 'name') {
    sortField = 'name';
  } else if (req.query.sortBy === 'displayName') {
    sortField = 'displayName';
  }

  const roles = await RoleDefinition.find(filters).sort({ [sortField]: 1 });

  res.status(200).json(ApiResponse.success({
    roles,
    total: roles.length
  }));
});

/**
 * GET /api/v2/roles/:name
 * Get single role by name
 *
 * Path params:
 * - name: Role name (e.g., 'instructor', 'content-admin')
 */
export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw ApiError.badRequest('Role name is required');
  }

  const role = await RoleDefinition.findByName(name.toLowerCase().trim());

  if (!role) {
    throw ApiError.notFound(`Role '${name}' not found`);
  }

  res.status(200).json(ApiResponse.success(role));
});

/**
 * GET /api/v2/roles/user-type/:type
 * Filter roles by userType
 *
 * Path params:
 * - type: User type (learner, staff, global-admin)
 *
 * Query params:
 * - includeInactive: Include inactive roles (default: false)
 */
export const getRolesByUserType = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.params;

  if (!type || typeof type !== 'string' || type.trim().length === 0) {
    throw ApiError.badRequest('User type is required');
  }

  const userType = type.toLowerCase().trim();

  // Validate userType
  if (!USER_TYPES.includes(userType as UserType)) {
    throw ApiError.badRequest(`Invalid userType. Must be one of: ${USER_TYPES.join(', ')}`);
  }

  // Determine whether to include inactive roles
  const includeInactive = req.query.includeInactive === 'true';

  let roles;
  if (includeInactive) {
    // Get all roles for this userType, including inactive
    roles = await RoleDefinition.find({ userType }).sort({ sortOrder: 1 });
  } else {
    // Use static method to get only active roles
    roles = await RoleDefinition.findByUserType(userType as UserType);
  }

  res.status(200).json(ApiResponse.success({
    userType,
    roles,
    total: roles.length
  }));
});

/**
 * PUT /api/v2/roles/:name/access-rights
 * Update role access rights
 *
 * Path params:
 * - name: Role name
 *
 * Body:
 * - accessRights: Array of access right strings (e.g., ['courses:content:read', 'courses:content:write'])
 *
 * Note: This endpoint should be protected by system-admin authorization middleware.
 * Authorization will be added in later implementation phase.
 */
export const updateRoleAccessRights = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const { accessRights } = req.body;

  // Validate role name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw ApiError.badRequest('Role name is required');
  }

  // Validate accessRights
  if (!accessRights || !Array.isArray(accessRights)) {
    throw ApiError.badRequest('accessRights must be an array');
  }

  if (accessRights.length === 0) {
    throw ApiError.badRequest('accessRights array cannot be empty');
  }

  // Validate access rights format (pattern: domain:resource:action or domain:*)
  const accessRightPattern = /^[a-z]+:[a-z-]+:[a-z-]+$|^[a-z]+:\*$/;
  for (const right of accessRights) {
    if (typeof right !== 'string' || !accessRightPattern.test(right)) {
      throw ApiError.badRequest(
        `Invalid access right format: '${right}'. Must follow pattern: domain:resource:action (e.g., 'courses:content:read') or domain:* (e.g., 'courses:*')`
      );
    }
  }

  // Find the role
  const role = await RoleDefinition.findOne({ name: name.toLowerCase().trim() });

  if (!role) {
    throw ApiError.notFound(`Role '${name}' not found`);
  }

  // Update access rights
  role.accessRights = accessRights;
  await role.save();

  res.status(200).json(ApiResponse.success(role, 'Role access rights updated successfully'));
});

/**
 * GET /api/v2/roles/me
 * Get current user's roles across all departments
 *
 * Returns all department memberships for the authenticated user
 * across all userTypes (staff, learner, global-admin).
 *
 * Requires authentication middleware to set req.user
 */
export const getMyRoles = asyncHandler(async (req: Request, res: Response) => {
  // Extract authenticated user ID
  const userId = (req as any).user?.id;

  if (!userId) {
    throw ApiError.unauthorized('Authentication required');
  }

  // Validate userId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.badRequest('Invalid user ID');
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Get all roles for the user across all userTypes
  const memberships = await RoleService.getAllRolesForUser(userObjectId);

  res.status(200).json(ApiResponse.success({
    userId,
    memberships,
    total: memberships.length
  }));
});

/**
 * GET /api/v2/roles/me/department/:departmentId
 * Get user's roles in specific department
 *
 * Path params:
 * - departmentId: Department ObjectId
 *
 * Query params:
 * - userType: Specify which userType to check (learner, staff, global-admin)
 *             If not provided, checks all userTypes
 *
 * Requires authentication middleware to set req.user
 */
export const getMyRolesForDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const { userType } = req.query;

  // Extract authenticated user ID
  const userId = (req as any).user?.id;

  if (!userId) {
    throw ApiError.unauthorized('Authentication required');
  }

  // Validate departmentId
  if (!departmentId || typeof departmentId !== 'string' || departmentId.trim().length === 0) {
    throw ApiError.badRequest('Department ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(departmentId)) {
    throw ApiError.badRequest('Invalid department ID format');
  }

  // Validate userId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.badRequest('Invalid user ID');
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const deptObjectId = new mongoose.Types.ObjectId(departmentId);

  // If userType specified, validate and check only that type
  if (userType) {
    const userTypeStr = userType as string;

    if (!USER_TYPES.includes(userTypeStr as UserType)) {
      throw ApiError.badRequest(`Invalid userType. Must be one of: ${USER_TYPES.join(', ')}`);
    }

    const roles = await RoleService.getRolesForDepartment(
      userObjectId,
      deptObjectId,
      userTypeStr as UserType
    );

    res.status(200).json(ApiResponse.success({
      userId,
      departmentId,
      userType: userTypeStr,
      roles
    }));
    return;
  }

  // If no userType specified, check all userTypes
  const allRoles: { [key: string]: string[] } = {
    learner: [],
    staff: [],
    'global-admin': []
  };

  for (const ut of USER_TYPES) {
    const roles = await RoleService.getRolesForDepartment(
      userObjectId,
      deptObjectId,
      ut
    );
    allRoles[ut] = roles;
  }

  res.status(200).json(ApiResponse.success({
    userId,
    departmentId,
    rolesByUserType: allRoles
  }));
});
