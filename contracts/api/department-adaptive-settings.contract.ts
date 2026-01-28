/**
 * Department Adaptive Settings API Contracts
 * Version: 1.0.0
 *
 * Controls department-level adaptive learning settings.
 * Related: cognitive-depth-levels.contract.ts
 */

export const DepartmentAdaptiveSettingsContracts = {
  /**
   * Get Department Adaptive Settings
   */
  get: {
    endpoint: '/api/v2/departments/:departmentId/adaptive-settings',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get adaptive learning settings for a department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true, description: 'Department ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            allowCourseDepthOverrides: 'boolean',
            defaultDepthLevels: 'string[]'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    permissions: ['content:departments:read'],

    notes: `
      - allowCourseDepthOverrides controls whether course-level overrides are permitted
      - defaultDepthLevels should reflect active cognitive depth level slugs
    `
  },

  /**
   * Update Department Adaptive Settings
   */
  update: {
    endpoint: '/api/v2/departments/:departmentId/adaptive-settings',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Update adaptive learning settings for a department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true, description: 'Department ID' }
      },
      body: {
        allowCourseDepthOverrides: {
          type: 'boolean',
          required: false,
          description: 'Enable/disable course-level cognitive depth overrides'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            allowCourseDepthOverrides: 'boolean'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    permissions: ['content:departments:manage']
  }
};

export type DepartmentAdaptiveSettingsContractType = typeof DepartmentAdaptiveSettingsContracts;
