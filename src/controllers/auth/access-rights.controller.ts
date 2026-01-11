/**
 * Access Rights Controller
 *
 * Handles all /api/v2/access-rights endpoints
 * Provides read-only access to the access rights catalog
 * and role-to-rights mappings.
 *
 * Endpoints:
 * - GET /api/v2/access-rights - Query all access rights with pagination
 * - GET /api/v2/access-rights/domain/:domain - Filter by specific domain
 * - GET /api/v2/access-rights/role/:roleName - Get access rights for specific role
 *
 * @module controllers/auth/access-rights
 */

import { Request, Response } from 'express';
import { AccessRight, ACCESS_RIGHT_DOMAINS, AccessRightDomain } from '@/models/AccessRight.model';
import { AccessRightsService } from '@/services/auth/access-rights.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * GET /api/v2/access-rights
 * List all access rights with optional filtering and pagination
 *
 * Query Parameters:
 * - page: number (default: 1, min: 1)
 * - limit: number (default: 50, min: 1, max: 100)
 * - domain: string (optional, one of: content, enrollment, staff, learner, reports, system, billing, audit, grades)
 * - isSensitive: boolean (optional)
 * - isActive: boolean (optional, default: true)
 *
 * Response:
 * - 200: Paginated list of access rights
 * - 400: Invalid query parameters
 * - 500: Server error
 */
export const listAccessRights = asyncHandler(async (req: Request, res: Response) => {
  // Parse and validate pagination parameters
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

  if (page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (limit < 1 || limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Parse filter parameters
  const domain = req.query.domain as string | undefined;
  const isSensitive = req.query.isSensitive === 'true' ? true :
                      req.query.isSensitive === 'false' ? false : undefined;
  const isActive = req.query.isActive === 'false' ? false : true;

  // Validate domain if provided
  if (domain && !ACCESS_RIGHT_DOMAINS.includes(domain as AccessRightDomain)) {
    throw ApiError.badRequest(
      `Invalid domain. Must be one of: ${ACCESS_RIGHT_DOMAINS.join(', ')}`
    );
  }

  // Build query
  const query: Record<string, any> = { isActive };

  if (domain) {
    query.domain = domain;
  }

  if (isSensitive !== undefined) {
    query.isSensitive = isSensitive;
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;

  const [accessRights, total] = await Promise.all([
    AccessRight
      .find(query)
      .select('name domain resource action description isSensitive sensitiveCategory isActive createdAt updatedAt')
      .sort({ domain: 1, resource: 1, action: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AccessRight.countDocuments(query)
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);

  // Return paginated response
  res.status(200).json(
    ApiResponse.paginated(accessRights, {
      page,
      limit,
      total,
      totalPages
    })
  );
});

/**
 * GET /api/v2/access-rights/domain/:domain
 * Get all access rights for a specific domain
 *
 * Path Parameters:
 * - domain: string (required, one of: content, enrollment, staff, learner, reports, system, billing, audit, grades)
 *
 * Query Parameters:
 * - isActive: boolean (optional, default: true)
 *
 * Response:
 * - 200: List of access rights in the domain
 * - 400: Invalid domain
 * - 404: Domain has no access rights
 * - 500: Server error
 */
export const getAccessRightsByDomain = asyncHandler(async (req: Request, res: Response) => {
  const { domain } = req.params;

  // Validate domain
  if (!domain) {
    throw ApiError.badRequest('Domain is required');
  }

  if (!ACCESS_RIGHT_DOMAINS.includes(domain as AccessRightDomain)) {
    throw ApiError.badRequest(
      `Invalid domain. Must be one of: ${ACCESS_RIGHT_DOMAINS.join(', ')}`
    );
  }

  // Parse filter parameters
  const isActive = req.query.isActive === 'false' ? false : true;

  // Query access rights for domain
  const accessRights = await AccessRight
    .find({
      domain: domain.toLowerCase(),
      isActive
    })
    .select('name domain resource action description isSensitive sensitiveCategory isActive createdAt updatedAt')
    .sort({ resource: 1, action: 1 })
    .lean();

  // Check if domain has any access rights
  if (accessRights.length === 0) {
    throw ApiError.notFound(`No access rights found for domain: ${domain}`);
  }

  // Return success response
  res.status(200).json(
    ApiResponse.success(accessRights, `Found ${accessRights.length} access rights for domain: ${domain}`)
  );
});

/**
 * GET /api/v2/access-rights/role/:roleName
 * Get all access rights for a specific role
 *
 * This endpoint queries the RoleDefinition model via AccessRightsService
 * to retrieve the access rights granted to a specific role.
 *
 * Supports wildcard expansion: if a role has 'system:*', this will
 * expand to all actual system access rights.
 *
 * Path Parameters:
 * - roleName: string (required, e.g., 'instructor', 'content-admin')
 *
 * Query Parameters:
 * - expandWildcards: boolean (optional, default: true)
 *
 * Response:
 * - 200: List of access rights for the role
 * - 400: Invalid role name
 * - 404: Role not found
 * - 500: Server error
 */
export const getAccessRightsForRole = asyncHandler(async (req: Request, res: Response) => {
  const { roleName } = req.params;

  // Validate role name
  if (!roleName || typeof roleName !== 'string' || roleName.trim().length === 0) {
    throw ApiError.badRequest('Role name is required');
  }

  const normalizedRoleName = roleName.toLowerCase().trim();

  // Parse query parameters
  const expandWildcards = req.query.expandWildcards !== 'false';

  // Get access rights for role using service
  const accessRights = await AccessRightsService.getAccessRightsForRole(normalizedRoleName);

  // Check if role exists (empty array means role not found)
  if (accessRights.length === 0) {
    throw ApiError.notFound(`Role not found or has no access rights: ${roleName}`);
  }

  // Expand wildcards if requested
  let finalAccessRights = accessRights;
  if (expandWildcards) {
    finalAccessRights = await AccessRightsService.expandWildcards(accessRights);
  }

  // Get full details for each access right
  const accessRightDetails = await AccessRight
    .find({
      name: { $in: finalAccessRights },
      isActive: true
    })
    .select('name domain resource action description isSensitive sensitiveCategory')
    .sort({ domain: 1, resource: 1, action: 1 })
    .lean();

  // Return success response with both raw rights and details
  res.status(200).json(
    ApiResponse.success({
      roleName: normalizedRoleName,
      accessRights: accessRights,
      expandedAccessRights: expandWildcards ? finalAccessRights : undefined,
      details: accessRightDetails,
      totalRights: accessRights.length,
      totalExpanded: expandWildcards ? finalAccessRights.length : accessRights.length,
      totalDetailsFound: accessRightDetails.length
    }, `Found ${accessRights.length} access rights for role: ${roleName}`)
  );
});
