/**
 * isAuthenticated Middleware (V2)
 *
 * Enhanced authentication middleware for Role System V2.
 * Verifies JWT token and attaches comprehensive user context including
 * userTypes, allAccessRights, and optional admin context.
 *
 * Key features:
 * - Attaches userTypes[] to req.user
 * - Attaches allAccessRights[] to req.user
 * - Checks for admin token and attaches admin context if present
 * - Supports both V1 and V2 token formats during transition
 *
 * Usage:
 * ```typescript
 * router.get('/api/v2/me',
 *   isAuthenticated,
 *   getProfile
 * );
 * ```
 *
 * Phase 5, Task 5.6 - Full Implementation
 *
 * @module middlewares/isAuthenticated
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { verifyAccessToken } from '@/utils/jwt';
import { User, UserType } from '@/models/auth/User.model';
import { GlobalAdmin } from '@/models/GlobalAdmin.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { EscalationService } from '@/services/auth/escalation.service';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';

/**
 * Enhanced user context attached to request
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  userTypes: UserType[];
  allAccessRights: string[];
  canEscalateToAdmin: boolean;
  defaultDashboard: 'learner' | 'staff';
  lastSelectedDepartment?: string;

  // V1 compatibility (deprecated)
  roles?: string[];
}

/**
 * Extend Express Request with enhanced user context
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware: Enhanced authentication (V2)
 *
 * Verifies JWT access token and attaches comprehensive user context to request.
 * This is the primary authentication middleware for Role System V2.
 *
 * Token sources:
 * 1. Authorization header: "Bearer <token>"
 *
 * User context includes:
 * - userId: User's ObjectId as string
 * - email: User's email address
 * - userTypes: Array of user types ['learner', 'staff', 'global-admin']
 * - allAccessRights: Combined access rights from all department roles
 * - canEscalateToAdmin: Whether user can access admin dashboard
 * - defaultDashboard: Default dashboard to show ('learner' or 'staff')
 * - lastSelectedDepartment: Last selected department ObjectId
 *
 * Optional admin context (if X-Admin-Token header present):
 * - req.adminRoles: Array of global admin roles
 * - req.adminAccessRights: Access rights from admin roles
 *
 * V1/V2 compatibility:
 * - V1 tokens: Includes roles[] field (deprecated)
 * - V2 tokens: Includes userTypes[] and allAccessRights[]
 * - Middleware works with both formats during transition
 *
 * @throws ApiError 401 if no token provided
 * @throws ApiError 401 if token is invalid or expired
 * @throws ApiError 404 if user not found in database
 *
 * @example
 * // Basic route protection
 * router.get('/profile',
 *   isAuthenticated,
 *   getProfile
 * );
 *
 * @example
 * // Access user context in controller
 * async function getProfile(req: Request, res: Response) {
 *   const { userId, userTypes, allAccessRights } = req.user;
 *   // Use user context
 * }
 */
export const isAuthenticated = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify access token
    const payload = verifyAccessToken(token);

    // Fetch user from database to get complete profile
    const user = await User.findById(payload.userId);

    if (!user) {
      logger.warn(`Authentication failed: User ${payload.userId} not found`);
      throw ApiError.notFound('User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn(`Authentication failed: User ${payload.userId} is not active`);
      throw ApiError.unauthorized('User account is not active');
    }

    // Get all access rights for user from all their roles
    // This will be populated from departmentMemberships via RoleDefinition
    const allAccessRights = await getUserAccessRights(user._id);

    // Build enhanced user context
    const authenticatedUser: AuthenticatedUser = {
      userId: user._id.toString(),
      email: user.email,
      userTypes: user.userTypes,
      allAccessRights,
      canEscalateToAdmin: user.canEscalateToAdmin(),
      defaultDashboard: user.defaultDashboard,
      lastSelectedDepartment: user.lastSelectedDepartment?.toString()
    };

    // V1 compatibility: Include roles if present in token (deprecated)
    if (payload.roles) {
      authenticatedUser.roles = payload.roles;
    }

    // Attach user to request
    req.user = authenticatedUser;

    // Optional: Check for admin token and attach admin context
    await attachAdminContextIfPresent(req);

    logger.debug(
      `User authenticated: ${user.email} (${user._id}) with userTypes [${user.userTypes.join(', ')}]`
    );

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Get all access rights for user from their roles
 *
 * Aggregates access rights from:
 * 1. Staff department memberships
 * 2. Learner department memberships
 * 3. GlobalAdmin roles (if applicable)
 *
 * @param userId - User's ObjectId
 * @returns Array of access rights (deduplicated)
 */
async function getUserAccessRights(userId: Types.ObjectId): Promise<string[]> {
  const accessRightsSet = new Set<string>();

  try {
    // Import models dynamically to avoid circular dependencies
    const { Staff } = await import('@/models/auth/Staff.model');
    const { Learner } = await import('@/models/auth/Learner.model');

    // Get Staff access rights
    const staff = await Staff.findById(userId);
    if (staff && staff.isActive) {
      for (const membership of staff.departmentMemberships) {
        if (membership.isActive) {
          const rights = await RoleDefinition.getCombinedAccessRights(membership.roles);
          rights.forEach((right) => accessRightsSet.add(right));
        }
      }
    }

    // Get Learner access rights
    const learner = await Learner.findById(userId);
    if (learner && learner.isActive) {
      for (const membership of learner.departmentMemberships) {
        if (membership.isActive) {
          const rights = await RoleDefinition.getCombinedAccessRights(membership.roles);
          rights.forEach((right) => accessRightsSet.add(right));
        }
      }
    }

    // Note: GlobalAdmin access rights are handled separately via escalation
    // They are NOT included in allAccessRights until user escalates

    return Array.from(accessRightsSet);
  } catch (error) {
    logger.error(`Error fetching user access rights: ${error}`);
    return [];
  }
}

/**
 * Attach admin context if X-Admin-Token header is present
 *
 * This allows endpoints to optionally accept admin escalation without requiring it.
 * If admin token is present and valid, admin context is attached.
 * If admin token is missing or invalid, request continues without admin context.
 *
 * @param req - Express request
 */
async function attachAdminContextIfPresent(req: Request): Promise<void> {
  try {
    const adminToken = req.headers['x-admin-token'] as string;

    if (!adminToken) {
      // No admin token, skip admin context
      return;
    }

    // Validate admin token
    const tokenPayload = await EscalationService.validateAdminToken(adminToken);
    const userId = new Types.ObjectId(tokenPayload.userId);

    // Verify GlobalAdmin record
    const globalAdmin = await GlobalAdmin.findById(userId);

    if (!globalAdmin || !globalAdmin.isActive) {
      // Invalid admin token, skip admin context
      logger.debug(`Invalid admin token for user ${userId}, skipping admin context`);
      return;
    }

    // Verify admin session is active
    const isSessionActive = await EscalationService.isAdminSessionActive(userId);

    if (!isSessionActive) {
      logger.debug(`Admin session expired for user ${userId}, skipping admin context`);
      return;
    }

    // Get admin roles and access rights
    const adminRoles = globalAdmin.getAllRoles();
    const adminAccessRights = await RoleDefinition.getCombinedAccessRights(adminRoles);

    // Attach admin context
    req.adminRoles = adminRoles;
    req.adminAccessRights = adminAccessRights;

    logger.debug(
      `Admin context attached: User ${userId} with admin roles [${adminRoles.join(', ')}]`
    );
  } catch (error) {
    // Silently skip admin context if any error occurs
    // The admin token is optional for this middleware
    logger.debug(`Could not attach admin context: ${error}`);
  }
}

/**
 * Helper: Check if user is authenticated
 *
 * Utility function to check authentication status.
 *
 * @param req - Express request
 * @returns True if user is authenticated
 */
export function isUserAuthenticated(req: Request): boolean {
  return !!(req.user && req.user.userId);
}

/**
 * Helper: Get user ID from request
 *
 * @param req - Express request
 * @returns User ID or null if not authenticated
 */
export function getUserId(req: Request): string | null {
  return req.user?.userId || null;
}

/**
 * Helper: Get user types from request
 *
 * @param req - Express request
 * @returns Array of user types or empty array
 */
export function getUserTypes(req: Request): UserType[] {
  return req.user?.userTypes || [];
}

/**
 * Helper: Check if user has specific user type
 *
 * @param req - Express request
 * @param userType - User type to check
 * @returns True if user has the user type
 */
export function hasUserType(req: Request, userType: UserType): boolean {
  return req.user?.userTypes.includes(userType) || false;
}

/**
 * Helper: Check if user can escalate to admin
 *
 * @param req - Express request
 * @returns True if user can escalate to admin dashboard
 */
export function canUserEscalate(req: Request): boolean {
  return req.user?.canEscalateToAdmin || false;
}

/**
 * Export default
 */
export default isAuthenticated;
