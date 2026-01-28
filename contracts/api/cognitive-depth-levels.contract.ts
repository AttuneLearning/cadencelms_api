/**
 * Cognitive Depth Levels API Contracts
 * Version: 1.0.0
 *
 * These contracts define the cognitive depth level management endpoints.
 * Cognitive depth levels are used for adaptive learning question selection.
 *
 * Design:
 * - System defaults are seeded and available to all departments
 * - Departments can override defaults or create custom levels
 * - Questions reference levels by slug (string), validated against this collection
 * - Current endpoints work without adaptive features (optional enhancement)
 *
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md
 */

export const CognitiveDepthLevelsContracts = {
  // ============================================
  // SYSTEM DEFAULTS (Read-only for non-admins)
  // ============================================

  /**
   * List System Default Cognitive Depth Levels
   */
  listSystemDefaults: {
    endpoint: '/api/v2/cognitive-depth-levels',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List system default cognitive depth levels (available to all departments)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            levels: [
              {
                slug: 'string',
                name: 'string',
                description: 'string | null',
                order: 'number',
                advanceThreshold: 'number (0.0-1.0)',
                minAttempts: 'number',
                isDefault: 'boolean (true for system levels)',
                isActive: 'boolean'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          levels: [
            {
              slug: 'exposure',
              name: 'Exposure',
              description: 'First introduction to concept - recognition, definitions, basic recall',
              order: 1,
              advanceThreshold: 0.70,
              minAttempts: 2,
              isDefault: true,
              isActive: true
            },
            {
              slug: 'practice',
              name: 'Practice',
              description: 'Building familiarity - apply concept in simple, direct contexts',
              order: 2,
              advanceThreshold: 0.80,
              minAttempts: 3,
              isDefault: true,
              isActive: true
            },
            {
              slug: 'proficiency',
              name: 'Proficiency',
              description: 'Consistent application - multi-step reasoning, varied contexts',
              order: 3,
              advanceThreshold: 0.85,
              minAttempts: 4,
              isDefault: true,
              isActive: true
            },
            {
              slug: 'mastery',
              name: 'Mastery',
              description: 'Deep understanding - synthesis, edge cases, can teach others',
              order: 4,
              advanceThreshold: 0.90,
              minAttempts: 5,
              isDefault: true,
              isActive: true
            }
          ]
        }
      }
    },

    permissions: [],

    notes: `
      - Returns system-wide default levels
      - These are seeded during system setup
      - Available to all authenticated users
      - Departments can override these with custom values
      - advanceThreshold is the success rate (0.0-1.0) required to advance
      - minAttempts is minimum questions answered before advancement
    `
  },

  // ============================================
  // DEPARTMENT-SCOPED LEVELS
  // ============================================

  /**
   * List Cognitive Depth Levels for Department
   */
  listForDepartment: {
    endpoint: '/api/v2/departments/:departmentId/cognitive-depth-levels',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List cognitive depth levels for a department (includes overrides and system defaults)',

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
            levels: [
              {
                slug: 'string',
                name: 'string',
                description: 'string | null',
                order: 'number',
                advanceThreshold: 'number',
                minAttempts: 'number',
                isDefault: 'boolean',
                isOverride: 'boolean (true if department customized)',
                departmentId: 'ObjectId | null',
                isActive: 'boolean'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          levels: [
            {
              slug: 'exposure',
              name: 'Exposure',
              description: 'First introduction to concept',
              order: 1,
              advanceThreshold: 0.70,
              minAttempts: 2,
              isDefault: true,
              isOverride: false,
              departmentId: null,
              isActive: true
            },
            {
              slug: 'practice',
              name: 'Practice',
              description: 'Building familiarity - department customized',
              order: 2,
              advanceThreshold: 0.75,
              minAttempts: 4,
              isDefault: false,
              isOverride: true,
              departmentId: '507f1f77bcf86cd799439012',
              isActive: true
            },
            {
              slug: 'hands-on',
              name: 'Hands-On',
              description: 'Custom department level for practical exercises',
              order: 2.5,
              advanceThreshold: 0.80,
              minAttempts: 3,
              isDefault: false,
              isOverride: false,
              departmentId: '507f1f77bcf86cd799439012',
              isActive: true
            },
            {
              slug: 'proficiency',
              name: 'Proficiency',
              description: 'Consistent application',
              order: 3,
              advanceThreshold: 0.85,
              minAttempts: 4,
              isDefault: true,
              isOverride: false,
              departmentId: null,
              isActive: true
            },
            {
              slug: 'mastery',
              name: 'Mastery',
              description: 'Deep understanding',
              order: 4,
              advanceThreshold: 0.90,
              minAttempts: 5,
              isDefault: true,
              isOverride: false,
              departmentId: null,
              isActive: true
            }
          ]
        }
      }
    },

    permissions: ['content:assessments:manage', 'content:lessons:read'],

    notes: `
      - Returns merged list: department overrides + system defaults
      - Department overrides take precedence over system defaults with same slug
      - Custom department levels (new slugs) are included
      - Sorted by 'order' field for progression sequence
      - isOverride=true indicates department customized a system default
      - Fractional order values allow inserting between existing levels
    `
  },

  /**
   * Create Department Cognitive Depth Level
   */
  create: {
    endpoint: '/api/v2/departments/:departmentId/cognitive-depth-levels',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a custom cognitive depth level or override a system default',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true, description: 'Department ID' }
      },
      body: {
        slug: {
          type: 'string',
          required: true,
          pattern: '^[a-z0-9-]+$',
          maxLength: 50,
          description: 'Unique identifier (lowercase, alphanumeric with hyphens)'
        },
        name: {
          type: 'string',
          required: true,
          maxLength: 100,
          description: 'Display name'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 500,
          description: 'Level description'
        },
        order: {
          type: 'number',
          required: true,
          min: 0.1,
          description: 'Sort order (can be fractional: 2.5 between 2 and 3)'
        },
        advanceThreshold: {
          type: 'number',
          required: true,
          min: 0.1,
          max: 1.0,
          description: 'Success rate required to advance (0.0-1.0)'
        },
        minAttempts: {
          type: 'number',
          required: true,
          min: 1,
          max: 100,
          description: 'Minimum attempts before advancement possible'
        }
      }
    },

    response: {
      success: {
        status: 201,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            slug: 'string',
            name: 'string',
            description: 'string | null',
            order: 'number',
            advanceThreshold: 'number',
            minAttempts: 'number',
            departmentId: 'ObjectId',
            isDefault: 'boolean (false)',
            isActive: 'boolean',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'DUPLICATE_SLUG', message: 'Level with this slug already exists in department' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        slug: 'hands-on',
        name: 'Hands-On',
        description: 'Practical application exercises',
        order: 2.5,
        advanceThreshold: 0.80,
        minAttempts: 3
      },
      response: {
        success: true,
        message: 'Cognitive depth level created successfully',
        data: {
          slug: 'hands-on',
          name: 'Hands-On',
          description: 'Practical application exercises',
          order: 2.5,
          advanceThreshold: 0.80,
          minAttempts: 3,
          departmentId: '507f1f77bcf86cd799439012',
          isDefault: false,
          isActive: true,
          createdAt: '2026-01-24T00:00:00.000Z',
          updatedAt: '2026-01-24T00:00:00.000Z'
        }
      }
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - Creates a new level or overrides a system default
      - If slug matches a system default, this becomes an override
      - Slug must be lowercase, alphanumeric with hyphens only
      - Order can be fractional to insert between existing levels
      - Questions can reference this level by slug after creation
    `
  },

  /**
   * Update Department Cognitive Depth Level
   */
  update: {
    endpoint: '/api/v2/departments/:departmentId/cognitive-depth-levels/:slug',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update a department cognitive depth level',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        slug: { type: 'string', required: true, description: 'Level slug' }
      },
      body: {
        name: { type: 'string', required: false, maxLength: 100 },
        description: { type: 'string', required: false, maxLength: 500 },
        order: { type: 'number', required: false, min: 0.1 },
        advanceThreshold: { type: 'number', required: false, min: 0.1, max: 1.0 },
        minAttempts: { type: 'number', required: false, min: 1, max: 100 },
        isActive: { type: 'boolean', required: false }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: '{ ...updated level }'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'CANNOT_UPDATE_SYSTEM_DEFAULT', message: 'Create an override instead of updating system default directly' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Level not found in department' }
      ]
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - Can only update department-owned levels
      - To "update" a system default, create an override with same slug
      - Slug cannot be changed (would orphan question references)
      - Partial updates supported
    `
  },

  /**
   * Delete Department Cognitive Depth Level
   */
  delete: {
    endpoint: '/api/v2/departments/:departmentId/cognitive-depth-levels/:slug',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a department cognitive depth level (reverts to system default if override)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        slug: { type: 'string', required: true, description: 'Level slug' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            deleted: 'boolean',
            revertedToDefault: 'boolean (true if system default exists)',
            questionsAffected: 'number (questions using this level in department)'
          }
        }
      },
      errors: [
        { status: 400, code: 'CANNOT_DELETE_SYSTEM_DEFAULT', message: 'Cannot delete system default levels' },
        { status: 400, code: 'LEVEL_IN_USE', message: 'Cannot delete level with questions assigned (no system default to revert to)' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Level not found in department' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        message: 'Level deleted, reverted to system default',
        data: {
          deleted: true,
          revertedToDefault: true,
          questionsAffected: 15
        }
      }
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - If deleted level was an override, questions revert to system default
      - If deleted level was custom (no system default), questions are NOT orphaned - error returned
      - Cannot delete system default levels (only admins can modify those)
      - Returns count of questions that were using this level
    `
  },

  // ============================================
  // COURSE-SCOPED LEVELS
  // ============================================

  /**
   * List Cognitive Depth Levels for Course
   */
  listForCourse: {
    endpoint: '/api/v2/courses/:courseId/cognitive-depth-levels',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List cognitive depth levels for a course (merged: system + department + course)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        courseId: { type: 'ObjectId', required: true, description: 'Course ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            levels: [
              {
                slug: 'string',
                name: 'string',
                description: 'string | null',
                order: 'number',
                advanceThreshold: 'number (0.0-1.0)',
                minAttempts: 'number',
                source: 'system | department | course',
                isActive: 'boolean'
              }
            ],
            canOverride: 'boolean',
            hasOverrides: 'boolean'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this course' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    permissions: ['content:courses:read', 'content:own:read'],

    notes: `
      - Merges system defaults, department overrides, then course overrides
      - canOverride is based on department adaptive settings
      - hasOverrides indicates course has custom settings
    `
  },

  /**
   * Create/Update Course Cognitive Depth Override
   */
  upsertCourseOverride: {
    endpoint: '/api/v2/courses/:courseId/cognitive-depth-levels/:slug',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Create or update a course-level cognitive depth override',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        courseId: { type: 'ObjectId', required: true },
        slug: { type: 'string', required: true, description: 'Level slug' }
      },
      body: {
        advanceThreshold: { type: 'number', required: false, min: 0.1, max: 1.0 },
        minAttempts: { type: 'number', required: false, min: 1, max: 100 },
        description: { type: 'string', required: false, maxLength: 500 }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            slug: 'string',
            name: 'string',
            description: 'string | null',
            order: 'number',
            advanceThreshold: 'number',
            minAttempts: 'number',
            source: 'course'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'OVERRIDES_DISABLED', message: 'Course overrides not allowed by department' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this course' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 404, code: 'LEVEL_NOT_FOUND', message: 'Level slug not found in department/system' }
      ]
    },

    permissions: ['content:courses:manage'],

    notes: `
      - Overrides are stored at course scope and merged last
      - Slug must exist at department/system scope
      - Only override fields are stored; name/order inherit from base level
    `
  },

  /**
   * Delete Course Cognitive Depth Override
   */
  deleteCourseOverride: {
    endpoint: '/api/v2/courses/:courseId/cognitive-depth-levels/:slug',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a course-level cognitive depth override (revert to department/system)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        courseId: { type: 'ObjectId', required: true },
        slug: { type: 'string', required: true, description: 'Level slug' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this course' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 404, code: 'OVERRIDE_NOT_FOUND', message: 'Override not found for this course' }
      ]
    },

    permissions: ['content:courses:manage']
  },

  /**
   * Delete All Course Cognitive Depth Overrides
   */
  deleteAllCourseOverrides: {
    endpoint: '/api/v2/courses/:courseId/cognitive-depth-levels',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete all course-level cognitive depth overrides',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        courseId: { type: 'ObjectId', required: true }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this course' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    permissions: ['content:courses:manage']
  }
};

// Type exports
export type CognitiveDepthLevelsContractType = typeof CognitiveDepthLevelsContracts;
