import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import {
  validateCreateCredentialGroup,
  validateUpdateCredentialGroup
} from '@/validators/credentialGroup.validator';
import {
  validateCreateDefinition,
  validateUpdateDefinition,
  validateDeprecateDefinition,
  validateAddRequirement
} from '@/validators/certificateDefinition.validator';
import * as credentialGroupController from '@/controllers/certificate/credentialGroup.controller';
import * as certificateDefinitionController from '@/controllers/certificate/certificateDefinition.controller';

/**
 * Credential Routes
 *
 * Two routers for credentials system:
 * 1. /api/v2/credential-groups - Credential groups (named credentials)
 * 2. /api/v2/certificate-definitions - Versioned definitions with requirements
 *
 * Access Rights:
 * - certificates:read - View credential groups and definitions
 * - certificates:manage - Create, update, activate, deprecate
 */

// Router for /api/v2/credential-groups
export const credentialGroupRouter = Router();

// Router for /api/v2/certificate-definitions
export const certificateDefinitionRouter = Router();

/**
 * =====================================================
 * ROUTES: /api/v2/credential-groups
 * =====================================================
 */

// Apply authentication middleware
credentialGroupRouter.use(isAuthenticated);

/**
 * GET /api/v2/credential-groups
 * List all credential groups with filtering and pagination.
 *
 * Access Right: certificates:read
 *
 * Query Parameters:
 * - page?: number - Page number (default: 1)
 * - limit?: number - Items per page (default: 20, max: 100)
 * - departmentId?: string - Filter by department
 * - type?: 'certificate' | 'diploma' | 'degree' | 'badge' - Filter by type
 * - isActive?: boolean - Filter by active status
 * - search?: string - Search by name or code
 * - sort?: string - Sort field (prefix with - for desc, default: -createdAt)
 */
credentialGroupRouter.get(
  '/',
  authorize('content:certificates:read'),
  credentialGroupController.listCredentialGroups
);

/**
 * POST /api/v2/credential-groups
 * Create a new credential group.
 *
 * Access Right: certificates:manage
 *
 * Body:
 * - name: string - Credential name (max 200 chars)
 * - code: string - Unique code within department (uppercase, 2-50 chars)
 * - description: string - Description (max 2000 chars)
 * - type: 'certificate' | 'diploma' | 'degree' | 'badge'
 * - badgeImageUrl?: string - URL to badge image
 * - badgeColor?: string - Hex color for badge display
 * - departmentId: string - Department ObjectId
 * - programId?: string - Optional link to academic program
 */
credentialGroupRouter.post(
  '/',
  authorize('content:certificates:manage'),
  validateCreateCredentialGroup,
  credentialGroupController.createCredentialGroup
);

/**
 * GET /api/v2/credential-groups/:id
 * Get detailed information about a credential group.
 *
 * Access Right: certificates:read
 *
 * Returns: Credential group with statistics (definition counts)
 */
credentialGroupRouter.get(
  '/:id',
  authorize('content:certificates:read'),
  credentialGroupController.getCredentialGroupById
);

/**
 * PATCH /api/v2/credential-groups/:id
 * Update a credential group.
 *
 * Access Right: certificates:manage
 *
 * Body (all optional):
 * - name?: string
 * - code?: string
 * - description?: string
 * - type?: 'certificate' | 'diploma' | 'degree' | 'badge'
 * - badgeImageUrl?: string | null
 * - badgeColor?: string | null
 * - programId?: string | null
 * - isActive?: boolean
 */
credentialGroupRouter.patch(
  '/:id',
  authorize('content:certificates:manage'),
  validateUpdateCredentialGroup,
  credentialGroupController.updateCredentialGroup
);

/**
 * DELETE /api/v2/credential-groups/:id
 * Delete a credential group (soft delete by deactivating).
 *
 * Access Right: certificates:manage
 *
 * Business Rules:
 * - Cannot delete if there are active definitions
 */
credentialGroupRouter.delete(
  '/:id',
  authorize('content:certificates:manage'),
  credentialGroupController.deleteCredentialGroup
);

/**
 * GET /api/v2/credential-groups/:id/definitions
 * List all certificate definitions for a credential group.
 *
 * Access Right: certificates:read
 *
 * Query Parameters:
 * - page?: number - Page number
 * - limit?: number - Items per page
 * - status?: 'draft' | 'active' | 'deprecated' - Filter by status
 * - sort?: string - Sort field
 */
credentialGroupRouter.get(
  '/:id/definitions',
  authorize('content:certificates:read'),
  credentialGroupController.listCredentialGroupDefinitions
);

/**
 * =====================================================
 * ROUTES: /api/v2/certificate-definitions
 * =====================================================
 */

// Apply authentication middleware
certificateDefinitionRouter.use(isAuthenticated);

/**
 * GET /api/v2/certificate-definitions
 * List all certificate definitions with filtering.
 *
 * Access Right: certificates:read
 *
 * Query Parameters:
 * - page?: number
 * - limit?: number
 * - credentialGroupId?: string - Filter by credential group
 * - status?: 'draft' | 'active' | 'deprecated'
 * - sort?: string
 */
certificateDefinitionRouter.get(
  '/',
  authorize('content:certificates:read'),
  certificateDefinitionController.listDefinitions
);

/**
 * POST /api/v2/certificate-definitions
 * Create a new certificate definition.
 *
 * Access Right: certificates:manage
 *
 * Body:
 * - credentialGroupId: string - Parent credential group
 * - title: string - Definition title
 * - description: string - Definition description
 * - isCompatible?: boolean - Same credential as other versions (default: true)
 * - compatibilityBreakReason?: string - Why incompatible
 * - validFrom?: Date - When definition becomes effective
 * - validUntil?: Date - When definition expires
 * - expiresAfterMonths?: number - Credential expiry after earning
 * - autoIssue?: boolean - Auto-issue when requirements met (default: false)
 *
 * Notes:
 * - Version number is auto-assigned
 * - New definitions start in 'draft' status
 */
certificateDefinitionRouter.post(
  '/',
  authorize('content:certificates:manage'),
  validateCreateDefinition,
  certificateDefinitionController.createDefinition
);

/**
 * GET /api/v2/certificate-definitions/:id
 * Get detailed information about a certificate definition.
 *
 * Access Right: certificates:read
 *
 * Returns: Definition with all requirements
 */
certificateDefinitionRouter.get(
  '/:id',
  authorize('content:certificates:read'),
  certificateDefinitionController.getDefinitionById
);

/**
 * PATCH /api/v2/certificate-definitions/:id
 * Update a certificate definition.
 *
 * Access Right: certificates:manage
 *
 * Business Rules:
 * - Only draft definitions can be updated
 *
 * Body (all optional):
 * - title?: string
 * - description?: string
 * - isCompatible?: boolean
 * - compatibilityBreakReason?: string
 * - validFrom?: Date
 * - validUntil?: Date
 * - expiresAfterMonths?: number
 * - autoIssue?: boolean
 */
certificateDefinitionRouter.patch(
  '/:id',
  authorize('content:certificates:manage'),
  validateUpdateDefinition,
  certificateDefinitionController.updateDefinition
);

/**
 * POST /api/v2/certificate-definitions/:id/activate
 * Activate a certificate definition.
 *
 * Access Right: certificates:manage
 *
 * Business Rules:
 * - Only draft definitions can be activated
 * - Must have at least one requirement
 * - Automatically deprecates any existing active definition for the same credential group
 *
 * Side Effects:
 * - Emits 'certificate.definition.activated' event
 */
certificateDefinitionRouter.post(
  '/:id/activate',
  authorize('content:certificates:manage'),
  certificateDefinitionController.activateDefinition
);

/**
 * POST /api/v2/certificate-definitions/:id/deprecate
 * Deprecate a certificate definition.
 *
 * Access Right: certificates:manage
 *
 * Body:
 * - reason?: string - Deprecation reason
 *
 * Side Effects:
 * - Emits 'certificate.definition.deprecated' event
 */
certificateDefinitionRouter.post(
  '/:id/deprecate',
  authorize('content:certificates:manage'),
  validateDeprecateDefinition,
  certificateDefinitionController.deprecateDefinition
);

/**
 * GET /api/v2/certificate-definitions/:id/requirements
 * List all requirements for a certificate definition.
 *
 * Access Right: certificates:read
 *
 * Returns: Array of requirements with course version details
 */
certificateDefinitionRouter.get(
  '/:id/requirements',
  authorize('content:certificates:read'),
  certificateDefinitionController.listRequirements
);

/**
 * POST /api/v2/certificate-definitions/:id/requirements
 * Add a requirement to a certificate definition.
 *
 * Access Right: certificates:manage
 *
 * Business Rules:
 * - Only draft definitions can have requirements added
 * - Cannot add duplicate course version requirements
 *
 * Body:
 * - courseVersionId: string - Course version to require
 * - isRequired?: boolean - Required or elective (default: true)
 * - minimumScore?: number - Minimum passing score (0-100)
 * - order?: number - Display order
 * - electiveGroupId?: string - Elective group identifier
 * - electiveGroupName?: string - Elective group display name
 * - electiveMinCount?: number - Min courses from elective group
 */
certificateDefinitionRouter.post(
  '/:id/requirements',
  authorize('content:certificates:manage'),
  validateAddRequirement,
  certificateDefinitionController.addRequirement
);

/**
 * DELETE /api/v2/certificate-definitions/:id/requirements/:reqId
 * Remove a requirement from a certificate definition.
 *
 * Access Right: certificates:manage
 *
 * Business Rules:
 * - Only draft definitions can have requirements removed
 */
certificateDefinitionRouter.delete(
  '/:id/requirements/:reqId',
  authorize('content:certificates:manage'),
  certificateDefinitionController.removeRequirement
);

export default {
  credentialGroupRouter,
  certificateDefinitionRouter
};
