/**
 * Admin Role Management API Contract
 *
 * System-admin only endpoints for managing user role assignments,
 * global admin assignments, and role-access right mappings.
 *
 * Base path: /api/v2/admin
 *
 * Authorization:
 * - ALL endpoints require system-admin role
 * - ALL endpoints require escalation (admin token)
 * - Access right: system:*
 */

import { Types } from 'mongoose';

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

/**
 * POST /admin/users/:userId/roles
 * Assign a role to a user in a specific department
 */
export interface AssignUserRoleRequest {
  departmentId: string;  // ObjectId as string
  roleName: string;      // One of: instructor, content-admin, department-admin, etc.
  isPrimary?: boolean;   // Default: false
  expiresAt?: Date;      // Optional expiration date
}

export interface AssignUserRoleResponse {
  success: true;
  data: {
    userId: string;
    departmentId: string;
    roleName: string;
    isPrimary: boolean;
    assignedAt: Date;
    expiresAt: Date | null;
    assignedBy: string;  // System admin who assigned the role
  };
  message: string;
}

/**
 * DELETE /admin/users/:userId/roles/:membershipId
 * Remove a role assignment from a user
 */
export interface RemoveUserRoleResponse {
  success: true;
  data: {
    userId: string;
    membershipId: string;
    removedAt: Date;
    removedBy: string;
  };
  message: string;
}

/**
 * GET /admin/users/:userId/roles
 * List all role assignments for a user
 */
export interface GetUserRolesResponse {
  success: true;
  data: {
    userId: string;
    userType: 'staff' | 'learner';
    departmentMemberships: Array<{
      _id: string;
      departmentId: string;
      departmentName: string;
      roles: string[];
      isPrimary: boolean;
      joinedAt: Date;
      expiresAt: Date | null;
      isActive: boolean;
    }>;
    calculatedAccessRights: string[];  // All access rights from all roles
  };
}

/**
 * PUT /admin/users/:userId/roles/:membershipId
 * Update a role membership (change department, roles, expiration, etc.)
 */
export interface UpdateUserRoleRequest {
  departmentId?: string;     // Move to different department
  roles?: string[];          // Replace roles array
  isPrimary?: boolean;       // Change primary status
  expiresAt?: Date | null;   // Update or remove expiration
  isActive?: boolean;        // Activate/deactivate membership
}

export interface UpdateUserRoleResponse {
  success: true;
  data: {
    userId: string;
    membershipId: string;
    departmentId: string;
    roles: string[];
    isPrimary: boolean;
    expiresAt: Date | null;
    isActive: boolean;
    updatedAt: Date;
    updatedBy: string;
  };
  message: string;
}

// ============================================================================
// GLOBAL ADMIN MANAGEMENT
// ============================================================================

/**
 * POST /admin/global-admins
 * Create a global admin (or promote existing user)
 */
export interface CreateGlobalAdminRequest {
  userId: string;           // ObjectId of existing user
  roles: string[];          // Global admin roles: system-admin, enrollment-admin, etc.
  masterDepartmentId: string;  // Master department for the admin
  isPrimary?: boolean;      // Default: true
}

export interface CreateGlobalAdminResponse {
  success: true;
  data: {
    userId: string;
    roles: string[];
    masterDepartmentId: string;
    isPrimary: boolean;
    createdAt: Date;
    createdBy: string;
  };
  message: string;
}

/**
 * DELETE /admin/global-admins/:userId
 * Remove global admin status from a user (demote to regular user)
 */
export interface RemoveGlobalAdminResponse {
  success: true;
  data: {
    userId: string;
    removedAt: Date;
    removedBy: string;
  };
  message: string;
}

/**
 * GET /admin/global-admins
 * List all global admins
 */
export interface GetGlobalAdminsResponse {
  success: true;
  data: {
    globalAdmins: Array<{
      _id: string;
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      roleMemberships: Array<{
        departmentId: string;
        departmentName: string;
        roles: string[];
        isPrimary: boolean;
        joinedAt: Date;
        isActive: boolean;
      }>;
      calculatedAccessRights: string[];
      createdAt: Date;
      isActive: boolean;
    }>;
    total: number;
  };
}

/**
 * PUT /admin/global-admins/:userId/roles
 * Update global admin roles
 */
export interface UpdateGlobalAdminRolesRequest {
  roles: string[];  // Replace entire roles array
  departmentId?: string;  // Optionally change master department
}

export interface UpdateGlobalAdminRolesResponse {
  success: true;
  data: {
    userId: string;
    roles: string[];
    departmentId: string;
    updatedAt: Date;
    updatedBy: string;
    calculatedAccessRights: string[];
  };
  message: string;
}

// ============================================================================
// ROLE DEFINITION MANAGEMENT
// ============================================================================

/**
 * GET /admin/role-definitions
 * List all role definitions with their access rights
 */
export interface GetRoleDefinitionsResponse {
  success: true;
  data: {
    roleDefinitions: Array<{
      _id: string;
      name: string;
      displayName: string;
      description: string;
      accessRights: Array<{
        _id: string;
        name: string;
        description: string;
        domain: string;
        isSensitive: boolean;
      }>;
      isGlobalRole: boolean;
      isDepartmentRole: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
    total: number;
  };
}

/**
 * PUT /admin/role-definitions/:roleName/access-rights
 * Update access rights for a role (replace entire list)
 */
export interface UpdateRoleAccessRightsRequest {
  accessRightIds: string[];  // Array of AccessRight ObjectIds
}

export interface UpdateRoleAccessRightsResponse {
  success: true;
  data: {
    roleName: string;
    accessRights: Array<{
      _id: string;
      name: string;
      description: string;
    }>;
    updatedAt: Date;
    updatedBy: string;
  };
  message: string;
}

/**
 * POST /admin/role-definitions/:roleName/access-rights
 * Add a single access right to a role
 */
export interface AddRoleAccessRightRequest {
  accessRightId: string;  // ObjectId of AccessRight
}

export interface AddRoleAccessRightResponse {
  success: true;
  data: {
    roleName: string;
    accessRightAdded: {
      _id: string;
      name: string;
      description: string;
    };
    totalAccessRights: number;
    updatedAt: Date;
    updatedBy: string;
  };
  message: string;
}

/**
 * DELETE /admin/role-definitions/:roleName/access-rights/:accessRightId
 * Remove a single access right from a role
 */
export interface RemoveRoleAccessRightResponse {
  success: true;
  data: {
    roleName: string;
    accessRightRemoved: {
      _id: string;
      name: string;
    };
    remainingAccessRights: number;
    updatedAt: Date;
    updatedBy: string;
  };
  message: string;
}

/**
 * GET /admin/role-definitions/:roleName
 * Get detailed information about a specific role
 */
export interface GetRoleDefinitionResponse {
  success: true;
  data: {
    _id: string;
    name: string;
    displayName: string;
    description: string;
    accessRights: Array<{
      _id: string;
      name: string;
      description: string;
      domain: string;
      resource: string;
      action: string;
      isSensitive: boolean;
    }>;
    isGlobalRole: boolean;
    isDepartmentRole: boolean;
    userCount: number;  // Number of users with this role
    createdAt: Date;
    updatedAt: Date;
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * POST /admin/users/bulk/assign-roles
 * Assign roles to multiple users at once
 */
export interface BulkAssignRolesRequest {
  assignments: Array<{
    userId: string;
    departmentId: string;
    roleName: string;
    isPrimary?: boolean;
  }>;
}

export interface BulkAssignRolesResponse {
  success: true;
  data: {
    successful: number;
    failed: number;
    results: Array<{
      userId: string;
      success: boolean;
      error?: string;
    }>;
  };
  message: string;
}

/**
 * POST /admin/users/bulk/remove-roles
 * Remove roles from multiple users at once
 */
export interface BulkRemoveRolesRequest {
  removals: Array<{
    userId: string;
    membershipId: string;
  }>;
}

export interface BulkRemoveRolesResponse {
  success: true;
  data: {
    successful: number;
    failed: number;
    results: Array<{
      userId: string;
      membershipId: string;
      success: boolean;
      error?: string;
    }>;
  };
  message: string;
}

// ============================================================================
// USER SEARCH & FILTERING
// ============================================================================

/**
 * GET /admin/users/search
 * Search for users to assign roles
 */
export interface SearchUsersRequest {
  query?: string;              // Search by name or email
  userType?: 'staff' | 'learner' | 'all';
  departmentId?: string;       // Filter by department
  hasRole?: string;            // Filter by role name
  withoutRole?: string;        // Users without this role
  page?: number;
  limit?: number;
}

export interface SearchUsersResponse {
  success: true;
  data: {
    users: Array<{
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
      userType: 'staff' | 'learner';
      currentRoles: string[];
      departments: Array<{
        departmentId: string;
        departmentName: string;
        roles: string[];
      }>;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// ============================================================================
// AUDIT & HISTORY
// ============================================================================

/**
 * GET /admin/users/:userId/role-history
 * Get complete role assignment history for a user
 */
export interface GetUserRoleHistoryResponse {
  success: true;
  data: {
    userId: string;
    history: Array<{
      _id: string;
      action: 'assigned' | 'removed' | 'updated';
      departmentId: string;
      departmentName: string;
      roleName: string;
      performedBy: {
        userId: string;
        name: string;
      };
      timestamp: Date;
      details: Record<string, any>;
    }>;
    total: number;
  };
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

export interface AdminRoleErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Error codes:
// - UNAUTHORIZED: Not a system-admin
// - ESCALATION_REQUIRED: Admin token not provided
// - USER_NOT_FOUND: User does not exist
// - ROLE_NOT_FOUND: Role definition does not exist
// - DEPARTMENT_NOT_FOUND: Department does not exist
// - ACCESS_RIGHT_NOT_FOUND: Access right does not exist
// - DUPLICATE_ASSIGNMENT: User already has this role in this department
// - CANNOT_REMOVE_LAST_ADMIN: Cannot remove last system-admin
// - INVALID_ROLE_FOR_USER_TYPE: Role not valid for this user type (e.g., learner roles on staff)
// - ROLE_DEFINITION_IN_USE: Cannot modify role definition with active users
