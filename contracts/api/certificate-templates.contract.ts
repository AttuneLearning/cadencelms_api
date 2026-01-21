/**
 * Certificate Templates API Contract
 *
 * This file documents the API contract for certificate templates endpoints.
 * It serves as the source of truth for frontend-backend integration.
 *
 * Base Path: /api/v2/certificate-templates
 * Related Issue: API-ISS-004
 */

/**
 * GET /api/v2/certificate-templates
 * List certificate templates available for program configuration
 *
 * Authorization: content:programs:manage
 *
 * Query Parameters:
 * - scope: string (optional) - Filter by scope: 'system', 'organization', or 'department'
 * - departmentId: string (optional) - Filter by department ID (for department-scoped templates)
 *
 * Response 200:
 * {
 *   "status": "success",
 *   "success": true,
 *   "data": {
 *     "templates": [
 *       {
 *         "id": "507f1f77bcf86cd799439011",
 *         "name": "Standard Certificate",
 *         "description": "Default certificate template",
 *         "thumbnailUrl": "/templates/standard-thumb.png",
 *         "scope": "system",
 *         "isDefault": true
 *       },
 *       {
 *         "id": "507f1f77bcf86cd799439012",
 *         "name": "Department Custom",
 *         "description": "Custom template for Cognitive Therapy",
 *         "thumbnailUrl": "/templates/custom-thumb.png",
 *         "scope": "department",
 *         "departmentId": "507f1f77bcf86cd799439013",
 *         "departmentName": "Cognitive Therapy"
 *       }
 *     ]
 *   }
 * }
 *
 * Response 400 (Invalid scope):
 * {
 *   "status": "error",
 *   "success": false,
 *   "message": "Invalid scope. Must be one of: system, organization, department"
 * }
 *
 * Response 400 (Invalid departmentId):
 * {
 *   "status": "error",
 *   "success": false,
 *   "message": "Invalid department ID"
 * }
 *
 * Response 401 (Not authenticated):
 * {
 *   "status": "error",
 *   "success": false,
 *   "message": "Authentication required"
 * }
 *
 * Response 403 (Insufficient permissions):
 * {
 *   "status": "error",
 *   "success": false,
 *   "message": "Insufficient permissions. Required access right(s): content:programs:manage"
 * }
 */

export interface CertificateTemplate {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  scope: 'system' | 'department';
  isDefault: boolean;
  departmentId?: string;
  departmentName?: string;
}

export interface ListCertificateTemplatesResponse {
  templates: CertificateTemplate[];
}

export interface ListCertificateTemplatesQuery {
  scope?: 'system' | 'organization' | 'department';
  departmentId?: string;
}

/**
 * Implementation Notes:
 *
 * 1. Scope Mapping:
 *    - The existing Template model uses 'type' (master/department/custom)
 *    - This endpoint maps Template types to scope:
 *      - 'master' + isGlobal=true → 'system' scope
 *      - 'department' → 'department' scope
 *
 * 2. Filtering:
 *    - Only active templates (status='active') are returned
 *    - Custom templates (type='custom') are excluded
 *    - When departmentId is specified, only department-scoped templates are returned
 *
 * 3. Metadata:
 *    - description and thumbnailUrl come from Template.metadata field
 *    - isDefault flag comes from Template.metadata.isDefault
 *
 * 4. Future Enhancement:
 *    - Consider adding a 'category' or 'purpose' field to Template model
 *      to better distinguish certificate templates from other template types
 */
