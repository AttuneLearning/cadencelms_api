/**
 * Permissions & Role Management API Contracts
 * Version: 1.0.0
 *
 * These contracts define the role and permission management endpoints for the LMS API.
 * Supports built-in roles, custom roles, department-scoped permissions, role hierarchy,
 * and permission inheritance.
 */

export const PermissionsContract = {
  resource: 'permissions',
  version: '1.0.0',

  /**
   * List All Available Permissions
   * GET /api/v2/permissions
   */
  listPermissions: {
    endpoint: '/api/v2/permissions',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all available permissions grouped by category',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        category: {
          type: 'string',
          required: false,
          enum: ['users', 'courses', 'content', 'enrollments', 'assessments', 'reports', 'settings', 'system'],
          description: 'Filter by permission category'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            permissions: [
              {
                id: 'string',
                name: 'string',
                description: 'string',
                category: 'users|courses|content|enrollments|assessments|reports|settings|system',
                level: 'read|write|delete|manage',
                key: 'string',
                isSystemPermission: 'boolean'
              }
            ],
            categorized: {
              users: 'Permission[]',
              courses: 'Permission[]',
              content: 'Permission[]',
              enrollments: 'Permission[]',
              assessments: 'Permission[]',
              reports: 'Permission[]',
              settings: 'Permission[]',
              system: 'Permission[]'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view permissions' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          permissions: [
            {
              id: '507f1f77bcf86cd799439011',
              name: 'Read Users',
              description: 'View user profiles and lists',
              category: 'users',
              level: 'read',
              key: 'users:read',
              isSystemPermission: true
            },
            {
              id: '507f1f77bcf86cd799439012',
              name: 'Write Users',
              description: 'Create and update user accounts',
              category: 'users',
              level: 'write',
              key: 'users:write',
              isSystemPermission: true
            },
            {
              id: '507f1f77bcf86cd799439013',
              name: 'Manage Courses',
              description: 'Full control over courses including publish and archive',
              category: 'courses',
              level: 'manage',
              key: 'courses:manage',
              isSystemPermission: true
            }
          ],
          categorized: {
            users: [
              { id: '507f1f77bcf86cd799439011', name: 'Read Users', key: 'users:read', level: 'read', category: 'users', description: 'View user profiles and lists', isSystemPermission: true },
              { id: '507f1f77bcf86cd799439012', name: 'Write Users', key: 'users:write', level: 'write', category: 'users', description: 'Create and update user accounts', isSystemPermission: true },
              { id: '507f1f77bcf86cd799439014', name: 'Delete Users', key: 'users:delete', level: 'delete', category: 'users', description: 'Delete user accounts', isSystemPermission: true }
            ],
            courses: [
              { id: '507f1f77bcf86cd799439013', name: 'Manage Courses', key: 'courses:manage', level: 'manage', category: 'courses', description: 'Full control over courses', isSystemPermission: true }
            ],
            content: [],
            enrollments: [],
            assessments: [],
            reports: [],
            settings: [],
            system: []
          }
        }
      }
    },

    permissions: ['system:read', 'permissions:read'],

    notes: `
      - Returns all available permissions in the system
      - Permissions are grouped by category for easier management
      - System permissions cannot be deleted or modified
      - Custom permissions can be created for specific use cases
      - Permission format: domain:scope:action (three-level)
        * domain - Resource domain (content, reports, grades, enrollment, staff, learner, settings, system)
        * scope - Access scope (courses, classes, department, own-classes, etc.)
        * action - Allowed action (read, manage, export, manage-own)
      - Examples:
        * content:courses:read - Read course information
        * content:courses:manage - Full course management
        * reports:department:read - Read department reports
        * reports:class:read - Read class-level reports
        * grades:own-classes:manage - Manage grades for own classes only
      - Available domains:
        * content - Course, program, lesson, exam, class, SCORM management
        * reports - Analytics and reporting (department, class, content scopes)
        * grades - Grading functionality
        * enrollment - Enrollment management
        * staff - Staff member management
        * learner - Learner management
        * settings - Configuration settings
        * system - System-wide administration (system:* for full access)
    `
  },

  /**
   * List All Roles with Permissions
   * GET /api/v2/permissions/roles
   */
  listRoles: {
    endpoint: '/api/v2/permissions/roles',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all roles with their permissions and metadata',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        includeBuiltIn: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include built-in system roles'
        },
        includeCustom: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include custom roles'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter roles by department scope'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            roles: [
              {
                id: 'ObjectId',
                name: 'string',
                description: 'string',
                type: 'built-in|custom',
                level: 'number',
                permissions: 'string[]',
                departmentId: 'ObjectId | null',
                inheritsFrom: 'ObjectId | null',
                isActive: 'boolean',
                userCount: 'number',
                createdAt: 'Date',
                updatedAt: 'Date'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view roles' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          roles: [
            {
              id: '507f1f77bcf86cd799439020',
              name: 'system-admin',
              description: 'Full system administrator with unrestricted access',
              type: 'built-in',
              level: 100,
              permissions: [
                'system:*'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 3,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439021',
              name: 'department-admin',
              description: 'Department administrator with department-scoped permissions',
              type: 'built-in',
              level: 80,
              permissions: [
                'content:courses:manage',
                'content:programs:manage',
                'content:lessons:manage',
                'content:exams:manage',
                'content:scorm:manage',
                'content:courses:read',
                'content:classes:manage',
                'content:lessons:read',
                'content:classes:read',
                'content:classes:manage-own',
                'staff:department:manage',
                'learner:department:manage',
                'learner:department:read',
                'enrollment:department:manage',
                'enrollment:department:read',
                'reports:content:read',
                'reports:department:read',
                'reports:department:export',
                'reports:class:read',
                'reports:class:export',
                'settings:department:manage',
                'grades:department:read',
                'grades:own-classes:manage'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 12,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439022',
              name: 'instructor',
              description: 'Course instructor with teaching and grading capabilities',
              type: 'built-in',
              level: 60,
              permissions: [
                'content:courses:read',
                'content:lessons:read',
                'content:classes:read',
                'content:classes:manage-own',
                'enrollment:department:read',
                'learner:department:read',
                'reports:class:read',
                'reports:class:export',
                'grades:department:read',
                'grades:own-classes:manage'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 45,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439023',
              name: 'content-admin',
              description: 'Content library administrator',
              type: 'built-in',
              level: 70,
              permissions: [
                'content:courses:manage',
                'content:programs:manage',
                'content:lessons:manage',
                'content:exams:manage',
                'content:scorm:manage',
                'content:courses:read',
                'content:lessons:read',
                'reports:content:read'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 8,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439024',
              name: 'billing-admin',
              description: 'Billing and payment administrator',
              type: 'built-in',
              level: 50,
              permissions: [
                'enrollment:department:read',
                'reports:department:read',
                'reports:department:export'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 2,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439025',
              name: 'learner',
              description: 'Standard learner account',
              type: 'built-in',
              level: 10,
              permissions: [
                'content:courses:read',
                'content:lessons:read',
                'content:classes:read'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 1523,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439026',
              name: 'custom-course-reviewer',
              description: 'Custom role for course review and approval',
              type: 'custom',
              level: 55,
              permissions: [
                'content:courses:read',
                'content:courses:manage',
                'content:lessons:read',
                'reports:content:read'
              ],
              departmentId: '507f1f77bcf86cd799439030',
              inheritsFrom: '507f1f77bcf86cd799439022',
              isActive: true,
              userCount: 5,
              createdAt: '2026-01-05T10:30:00.000Z',
              updatedAt: '2026-01-06T14:20:00.000Z'
            }
          ]
        }
      }
    },

    permissions: ['permissions:read', 'users:read'],

    notes: `
      - Returns all roles in the system (built-in and custom)
      - Built-in roles:
        * system-admin (level 100) - Full system access
        * department-admin (level 80) - Department-scoped admin
        * instructor (level 60) - Teaching and grading
        * content-admin (level 70) - Content management
        * billing-admin (level 50) - Billing only
        * learner (level 10) - Basic learner access
      - Custom roles can be created with specific permission sets
      - Role level determines hierarchy (higher level = more authority)
      - Department-scoped roles only apply within specific departments
      - Roles can inherit permissions from other roles
      - Built-in roles cannot be deleted or have their core permissions changed
      - userCount shows how many users currently have this role
      - Permissions are stored as keys (e.g., 'courses:manage')
    `
  },

  /**
   * Get Role Details with Permissions
   * GET /api/v2/permissions/roles/:roleId
   */
  getRoleDetails: {
    endpoint: '/api/v2/permissions/roles/:roleId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific role including permissions and users',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        roleId: {
          type: 'ObjectId',
          required: true,
          description: 'Role ID or built-in role name (e.g., "system-admin")'
        }
      },
      query: {
        includeUsers: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include list of users with this role'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            role: {
              id: 'ObjectId',
              name: 'string',
              description: 'string',
              type: 'built-in|custom',
              level: 'number',
              permissions: [
                {
                  id: 'string',
                  key: 'string',
                  name: 'string',
                  description: 'string',
                  category: 'string',
                  level: 'string',
                  inherited: 'boolean'
                }
              ],
              departmentId: 'ObjectId | null',
              department: {
                id: 'ObjectId',
                name: 'string'
              },
              inheritsFrom: 'ObjectId | null',
              parentRole: {
                id: 'ObjectId',
                name: 'string'
              },
              inheritedPermissions: 'string[]',
              ownPermissions: 'string[]',
              effectivePermissions: 'string[]',
              isActive: 'boolean',
              canDelete: 'boolean',
              canEdit: 'boolean',
              userCount: 'number',
              users: [
                {
                  id: 'ObjectId',
                  email: 'string',
                  firstName: 'string',
                  lastName: 'string',
                  assignedAt: 'Date'
                }
              ],
              createdBy: 'ObjectId | null',
              createdAt: 'Date',
              updatedAt: 'Date'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view role details' },
        { status: 404, code: 'NOT_FOUND', message: 'Role not found' }
      ]
    },

    example: {
      request: {
        roleId: '507f1f77bcf86cd799439022'
      },
      response: {
        success: true,
        data: {
          role: {
            id: '507f1f77bcf86cd799439022',
            name: 'instructor',
            description: 'Course instructor with teaching and grading capabilities',
            type: 'built-in',
            level: 60,
            permissions: [
              {
                id: '507f1f77bcf86cd799439011',
                key: 'users:read',
                name: 'Read Users',
                description: 'View user profiles and lists',
                category: 'users',
                level: 'read',
                inherited: false
              },
              {
                id: '507f1f77bcf86cd799439012',
                key: 'courses:read',
                name: 'Read Courses',
                description: 'View course information',
                category: 'courses',
                level: 'read',
                inherited: false
              },
              {
                id: '507f1f77bcf86cd799439013',
                key: 'courses:write',
                name: 'Write Courses',
                description: 'Create and update courses',
                category: 'courses',
                level: 'write',
                inherited: false
              }
            ],
            departmentId: null,
            department: null,
            inheritsFrom: null,
            parentRole: null,
            inheritedPermissions: [],
            ownPermissions: [
              'users:read',
              'courses:read',
              'courses:write',
              'content:read',
              'content:write',
              'enrollments:read',
              'enrollments:write',
              'assessments:read',
              'assessments:write',
              'reports:read'
            ],
            effectivePermissions: [
              'users:read',
              'courses:read',
              'courses:write',
              'content:read',
              'content:write',
              'enrollments:read',
              'enrollments:write',
              'assessments:read',
              'assessments:write',
              'reports:read'
            ],
            isActive: true,
            canDelete: false,
            canEdit: false,
            userCount: 45,
            users: [],
            createdBy: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z'
          }
        }
      }
    },

    permissions: ['permissions:read', 'users:read'],

    notes: `
      - Returns detailed role information including all permissions
      - Permissions marked as "inherited" come from parent roles
      - effectivePermissions = ownPermissions + inheritedPermissions
      - canDelete = false for built-in roles
      - canEdit = false for built-in roles (can't change core permissions)
      - includeUsers=true returns list of users with this role (admin only)
      - Department-scoped roles only visible to users in that department
      - Role hierarchy enforced: can't view roles with higher level
    `
  },

  /**
   * Create Custom Role
   * POST /api/v2/permissions/roles
   */
  createRole: {
    endpoint: '/api/v2/permissions/roles',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new custom role with specific permissions',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        name: {
          type: 'string',
          required: true,
          minLength: 3,
          maxLength: 50,
          pattern: '^[a-z0-9-]+$',
          description: 'Role name (lowercase, hyphen-separated)'
        },
        description: {
          type: 'string',
          required: true,
          minLength: 10,
          maxLength: 500
        },
        level: {
          type: 'number',
          required: false,
          min: 11,
          max: 99,
          default: 50,
          description: 'Role level (11-99, cannot overlap built-in roles)'
        },
        permissions: {
          type: 'string[]',
          required: true,
          minItems: 1,
          description: 'Array of permission keys'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Department scope (null for global)'
        },
        inheritsFrom: {
          type: 'ObjectId',
          required: false,
          description: 'Parent role to inherit permissions from'
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
            role: {
              id: 'ObjectId',
              name: 'string',
              description: 'string',
              type: 'custom',
              level: 'number',
              permissions: 'string[]',
              departmentId: 'ObjectId | null',
              inheritsFrom: 'ObjectId | null',
              isActive: 'boolean',
              createdBy: 'ObjectId',
              createdAt: 'Date'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid role data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to create roles' },
        { status: 409, code: 'ROLE_EXISTS', message: 'Role with this name already exists' }
      ]
    },

    example: {
      request: {
        name: 'course-reviewer',
        description: 'Reviews and approves course content before publication',
        level: 55,
        permissions: [
          'content:courses:read',
          'content:courses:manage',
          'content:lessons:read',
          'reports:content:read'
        ],
        departmentId: '507f1f77bcf86cd799439030',
        inheritsFrom: null
      },
      response: {
        success: true,
        message: 'Custom role created successfully',
        data: {
          role: {
            id: '507f1f77bcf86cd799439040',
            name: 'course-reviewer',
            description: 'Reviews and approves course content before publication',
            type: 'custom',
            level: 55,
            permissions: [
              'content:courses:read',
              'content:courses:manage',
              'content:lessons:read',
              'reports:content:read'
            ],
            departmentId: '507f1f77bcf86cd799439030',
            inheritsFrom: null,
            isActive: true,
            createdBy: '507f1f77bcf86cd799439001',
            createdAt: '2026-01-08T10:30:00.000Z'
          }
        }
      }
    },

    permissions: ['permissions:write', 'system:manage'],

    notes: `
      - Only system-admin and department-admin can create custom roles
      - Department admins can only create roles within their departments
      - Role names must be unique within their scope (global or department)
      - Role names must be lowercase with hyphens (e.g., 'course-reviewer')
      - Custom role levels must be 11-99 (built-in roles use 10, 50, 60, 70, 80, 100)
      - All permissions must exist in the system
      - Cannot grant permissions higher than your own level
      - Department-scoped roles only apply to users in that department
      - Role inheritance copies all permissions from parent role
      - Cannot inherit from higher-level role than you have access to
      - Validation:
        * name: 3-50 chars, lowercase with hyphens
        * description: 10-500 chars
        * permissions: must be valid permission keys
        * level: 11-99 for custom roles
    `
  },

  /**
   * Update Role Permissions
   * PUT /api/v2/permissions/roles/:roleId
   */
  updateRole: {
    endpoint: '/api/v2/permissions/roles/:roleId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update custom role permissions and metadata',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        roleId: {
          type: 'ObjectId',
          required: true
        }
      },
      body: {
        description: {
          type: 'string',
          required: false,
          minLength: 10,
          maxLength: 500
        },
        level: {
          type: 'number',
          required: false,
          min: 11,
          max: 99
        },
        permissions: {
          type: 'string[]',
          required: false,
          description: 'Complete list of permissions (replaces existing)'
        },
        isActive: {
          type: 'boolean',
          required: false,
          description: 'Enable or disable role'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            role: {
              id: 'ObjectId',
              name: 'string',
              description: 'string',
              type: 'custom',
              level: 'number',
              permissions: 'string[]',
              departmentId: 'ObjectId | null',
              inheritsFrom: 'ObjectId | null',
              isActive: 'boolean',
              updatedBy: 'ObjectId',
              updatedAt: 'Date'
            },
            affectedUsers: 'number'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid update data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot modify built-in roles' },
        { status: 404, code: 'NOT_FOUND', message: 'Role not found' }
      ]
    },

    example: {
      request: {
        roleId: '507f1f77bcf86cd799439040',
        description: 'Reviews and approves course content with additional reporting access',
        permissions: [
          'content:courses:read',
          'content:courses:manage',
          'content:lessons:read',
          'content:lessons:manage',
          'reports:content:read',
          'reports:department:read'
        ]
      },
      response: {
        success: true,
        message: 'Role updated successfully',
        data: {
          role: {
            id: '507f1f77bcf86cd799439040',
            name: 'course-reviewer',
            description: 'Reviews and approves course content with additional reporting access',
            type: 'custom',
            level: 55,
            permissions: [
              'content:courses:read',
              'content:courses:manage',
              'content:lessons:read',
              'content:lessons:manage',
              'reports:content:read',
              'reports:department:read'
            ],
            departmentId: '507f1f77bcf86cd799439030',
            inheritsFrom: null,
            isActive: true,
            updatedBy: '507f1f77bcf86cd799439001',
            updatedAt: '2026-01-08T11:45:00.000Z'
          },
          affectedUsers: 5
        }
      }
    },

    permissions: ['permissions:write', 'system:manage'],

    notes: `
      - Only custom roles can be modified
      - Built-in roles cannot be edited (returns 403)
      - Cannot change role name (create new role instead)
      - Cannot change role scope (departmentId)
      - Permissions array replaces all existing permissions
      - Cannot grant permissions higher than your own level
      - Department admins can only modify roles in their departments
      - Disabling role (isActive=false) revokes access for all users with that role
      - affectedUsers shows how many users are impacted by the change
      - System tracks who made changes and when
      - Validation same as create endpoint
    `
  },

  /**
   * Delete Custom Role
   * DELETE /api/v2/permissions/roles/:roleId
   */
  deleteRole: {
    endpoint: '/api/v2/permissions/roles/:roleId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a custom role',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        roleId: {
          type: 'ObjectId',
          required: true
        }
      },
      query: {
        reassignTo: {
          type: 'ObjectId',
          required: false,
          description: 'Role ID to reassign users to (required if role has users)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            deletedRole: {
              id: 'ObjectId',
              name: 'string'
            },
            affectedUsers: 'number',
            reassignedTo: {
              id: 'ObjectId',
              name: 'string'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'ROLE_HAS_USERS', message: 'Cannot delete role with active users. Specify reassignTo role.' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot delete built-in roles' },
        { status: 404, code: 'NOT_FOUND', message: 'Role not found' }
      ]
    },

    example: {
      request: {
        roleId: '507f1f77bcf86cd799439040',
        reassignTo: '507f1f77bcf86cd799439022'
      },
      response: {
        success: true,
        message: 'Role deleted successfully',
        data: {
          deletedRole: {
            id: '507f1f77bcf86cd799439040',
            name: 'course-reviewer'
          },
          affectedUsers: 5,
          reassignedTo: {
            id: '507f1f77bcf86cd799439022',
            name: 'instructor'
          }
        }
      }
    },

    permissions: ['permissions:delete', 'system:manage'],

    notes: `
      - Only custom roles can be deleted
      - Built-in roles cannot be deleted (returns 403)
      - Cannot delete role if users currently have it (unless reassignTo provided)
      - reassignTo must be a valid role ID
      - All users with deleted role are reassigned to specified role
      - Department admins can only delete roles in their departments
      - Deletion is permanent (not soft delete)
      - Audit log tracks role deletion and user reassignment
    `
  },

  /**
   * Get User's Effective Permissions
   * GET /api/v2/permissions/user/:userId
   */
  getUserPermissions: {
    endpoint: '/api/v2/permissions/user/:userId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get effective permissions for a specific user (combining all roles)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        userId: {
          type: 'ObjectId',
          required: true,
          description: 'User ID (use "me" for current user)'
        }
      },
      query: {
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Calculate permissions for specific department context'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            userId: 'ObjectId',
            roles: [
              {
                id: 'ObjectId',
                name: 'string',
                type: 'built-in|custom',
                departmentId: 'ObjectId | null'
              }
            ],
            permissions: {
              all: 'string[]',
              byDomain: {
                content: 'string[]',
                reports: 'string[]',
                grades: 'string[]',
                enrollment: 'string[]',
                staff: 'string[]',
                learner: 'string[]',
                settings: 'string[]',
                system: 'string[]'
              },
              byRole: [
                {
                  roleId: 'ObjectId',
                  roleName: 'string',
                  permissions: 'string[]'
                }
              ]
            },
            departments: [
              {
                id: 'ObjectId',
                name: 'string',
                permissions: 'string[]'
              }
            ],
            effectiveLevel: 'number',
            isAdmin: 'boolean',
            isSuperAdmin: 'boolean'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot view permissions of other users' },
        { status: 404, code: 'NOT_FOUND', message: 'User not found' }
      ]
    },

    example: {
      request: {
        userId: '507f1f77bcf86cd799439050'
      },
      response: {
        success: true,
        data: {
          userId: '507f1f77bcf86cd799439050',
          roles: [
            {
              id: '507f1f77bcf86cd799439021',
              name: 'department-admin',
              type: 'built-in',
              departmentId: null
            },
            {
              id: '507f1f77bcf86cd799439040',
              name: 'course-reviewer',
              type: 'custom',
              departmentId: '507f1f77bcf86cd799439030'
            }
          ],
          permissions: {
            all: [
              'content:courses:manage',
              'content:classes:manage',
              'content:lessons:manage',
              'enrollment:department:manage',
              'reports:department:read',
              'reports:department:export',
              'grades:own-classes:manage'
            ],
            byDomain: {
              content: ['content:courses:manage', 'content:classes:manage', 'content:lessons:manage'],
              enrollment: ['enrollment:department:manage'],
              reports: ['reports:department:read', 'reports:department:export'],
              grades: ['grades:own-classes:manage'],
              staff: [],
              learner: [],
              settings: [],
              system: []
            },
            byRole: [
              {
                roleId: '507f1f77bcf86cd799439021',
                roleName: 'department-admin',
                permissions: [
                  'content:courses:manage',
                  'content:classes:manage',
                  'content:lessons:manage',
                  'enrollment:department:manage',
                  'reports:department:read',
                  'reports:department:export',
                  'grades:own-classes:manage'
                ]
              },
              {
                roleId: '507f1f77bcf86cd799439040',
                roleName: 'course-reviewer',
                permissions: [
                  'content:courses:read',
                  'content:courses:manage',
                  'content:lessons:read',
                  'reports:content:read'
                ]
              }
            ]
          },
          departments: [
            {
              id: '507f1f77bcf86cd799439030',
              name: 'Engineering Department',
              permissions: [
                'content:courses:read',
                'content:courses:manage',
                'content:lessons:read',
                'reports:content:read'
              ]
            }
          ],
          effectiveLevel: 80,
          isAdmin: true,
          isSuperAdmin: false
        }
      }
    },

    permissions: ['permissions:read', 'users:read'],

    notes: `
      - Returns combined permissions from all user's roles
      - Effective permissions = union of all role permissions
      - Department-scoped permissions only apply within that department
      - effectiveLevel = highest role level user has
      - isAdmin = true if user has any admin role (level >= 50)
      - isSuperAdmin = true if user has system-admin role (level 100)
      - Use userId="me" to get current user's permissions
      - Non-admin users can only view their own permissions
      - Admins can view permissions of users in their departments
      - System admins can view any user's permissions
      - departmentId filter shows permissions specific to that department
      - Useful for frontend to determine what UI elements to show
    `
  },

  /**
   * Check User Permission
   * POST /api/v2/permissions/check
   */
  checkPermission: {
    endpoint: '/api/v2/permissions/check',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Check if current user has specific permission(s)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        permission: {
          type: 'string',
          required: false,
          description: 'Single permission to check'
        },
        permissions: {
          type: 'string[]',
          required: false,
          description: 'Multiple permissions to check (OR logic)'
        },
        requireAll: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'If true, user must have ALL permissions (AND logic)'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Check permission within specific department context'
        },
        resourceId: {
          type: 'ObjectId',
          required: false,
          description: 'Check permission on specific resource (e.g., course ID)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            hasPermission: 'boolean',
            checkedPermissions: 'string[]',
            grantedPermissions: 'string[]',
            deniedPermissions: 'string[]',
            reason: 'string | null',
            context: {
              userId: 'ObjectId',
              departmentId: 'ObjectId | null',
              resourceId: 'ObjectId | null',
              userLevel: 'number'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Must provide permission or permissions array' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      ]
    },

    example: {
      request: {
        permissions: ['content:courses:manage', 'content:classes:manage'],
        requireAll: false,
        departmentId: '507f1f77bcf86cd799439030'
      },
      response: {
        success: true,
        data: {
          hasPermission: true,
          checkedPermissions: ['content:courses:manage', 'content:classes:manage'],
          grantedPermissions: ['content:courses:manage', 'content:classes:manage'],
          deniedPermissions: [],
          reason: null,
          context: {
            userId: '507f1f77bcf86cd799439050',
            departmentId: '507f1f77bcf86cd799439030',
            resourceId: null,
            userLevel: 80
          }
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Fast permission checking for frontend authorization
      - Can check single permission or multiple permissions
      - requireAll=false (default): returns true if user has ANY permission (OR logic)
      - requireAll=true: returns true only if user has ALL permissions (AND logic)
      - Department context restricts check to department-scoped permissions
      - Resource context checks ownership/association (e.g., user can edit their own courses)
      - Returns detailed breakdown of granted vs denied permissions
      - Useful for showing/hiding UI elements
      - Frontend should cache results for performance
      - Example use cases:
        * Check if user can manage courses: { permission: 'content:courses:manage' }
        * Check if user can read reports: { permissions: ['reports:department:read', 'reports:class:read'] }
        * Check if user can grade AND export: { permissions: ['grades:own-classes:manage', 'reports:class:export'], requireAll: true }
      - reason field explains why permission was denied (if applicable)
      - Extremely fast endpoint (< 10ms) for repeated checks
    `
  }
};

// Type exports for consumers
export type PermissionsContractType = typeof PermissionsContract;

// Request/Response types
export type ListPermissionsResponse = typeof PermissionsContract.listPermissions.example.response;
export type ListRolesResponse = typeof PermissionsContract.listRoles.example.response;
export type GetRoleDetailsResponse = typeof PermissionsContract.getRoleDetails.example.response;
export type CreateRoleRequest = typeof PermissionsContract.createRole.example.request;
export type CreateRoleResponse = typeof PermissionsContract.createRole.example.response;
export type UpdateRoleRequest = typeof PermissionsContract.updateRole.example.request;
export type UpdateRoleResponse = typeof PermissionsContract.updateRole.example.response;
export type DeleteRoleResponse = typeof PermissionsContract.deleteRole.example.response;
export type GetUserPermissionsResponse = typeof PermissionsContract.getUserPermissions.example.response;
export type CheckPermissionRequest = typeof PermissionsContract.checkPermission.example.request;
export type CheckPermissionResponse = typeof PermissionsContract.checkPermission.example.response;

/**
 * Built-in Roles Reference
 */
export const BUILT_IN_ROLES = {
  SYSTEM_ADMIN: {
    name: 'system-admin',
    level: 100,
    description: 'Full system administrator with unrestricted access'
  },
  DEPARTMENT_ADMIN: {
    name: 'department-admin',
    level: 80,
    description: 'Department administrator with department-scoped permissions'
  },
  CONTENT_ADMIN: {
    name: 'content-admin',
    level: 70,
    description: 'Content library administrator'
  },
  INSTRUCTOR: {
    name: 'instructor',
    level: 60,
    description: 'Course instructor with teaching and grading capabilities'
  },
  BILLING_ADMIN: {
    name: 'billing-admin',
    level: 50,
    description: 'Billing and payment administrator'
  },
  LEARNER: {
    name: 'learner',
    level: 10,
    description: 'Standard learner account'
  }
} as const;

/**
 * Permission Format Reference
 *
 * Permissions use a three-level format: `domain:scope:action`
 *
 * - domain: The resource domain (content, reports, grades, etc.)
 * - scope: The scope of access (department, class, own-classes, courses, etc.)
 * - action: The action allowed (read, manage, export, etc.)
 *
 * Examples:
 * - content:courses:read - Read courses in any scope
 * - content:courses:manage - Full management of courses
 * - reports:department:read - Read department-level reports
 * - reports:class:read - Read class-level reports
 * - grades:own-classes:manage - Manage grades for own classes only
 */

/**
 * 2-Part to 3-Part Permission Migration Guide
 *
 * The original contract specified a 2-part format (category:level).
 * The actual implementation uses a 3-part format (domain:scope:action).
 *
 * This mapping shows how to convert between formats and guidelines
 * for creating new permissions.
 *
 * FORMAT:
 *   2-part: category:action     (e.g., courses:read)
 *   3-part: domain:scope:action (e.g., content:courses:read)
 *
 * MIGRATION MAPPING:
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ CONTENT DOMAIN                                                         │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ 2-Part (deprecated)  │ 3-Part (actual)                                  │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ courses:read         │ content:courses:read                             │
 * │ courses:write        │ content:courses:manage                           │
 * │ courses:manage       │ content:courses:manage                           │
 * │ content:read         │ content:lessons:read                             │
 * │ content:write        │ content:lessons:manage                           │
 * │ content:manage       │ content:programs:manage, content:exams:manage,   │
 * │                      │ content:scorm:manage                             │
 * │ (new)                │ content:classes:read                             │
 * │ (new)                │ content:classes:manage                           │
 * │ (new)                │ content:classes:manage-own                       │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ENROLLMENT DOMAIN                                                      │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ 2-Part (deprecated)  │ 3-Part (actual)                                  │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ enrollments:read     │ enrollment:department:read                       │
 * │ enrollments:write    │ enrollment:department:manage                     │
 * │ enrollments:manage   │ enrollment:department:manage                     │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ REPORTS DOMAIN                                                         │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ 2-Part (deprecated)  │ 3-Part (actual)                                  │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ reports:read         │ reports:department:read                          │
 * │                      │ reports:class:read                               │
 * │                      │ reports:content:read                             │
 * │ reports:write        │ reports:department:export                        │
 * │                      │ reports:class:export                             │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ GRADES DOMAIN (was "assessments")                                      │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ 2-Part (deprecated)  │ 3-Part (actual)                                  │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ assessments:read     │ grades:department:read                           │
 * │ assessments:write    │ grades:own-classes:manage                        │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ USER MANAGEMENT (split into staff/learner domains)                     │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ 2-Part (deprecated)  │ 3-Part (actual)                                  │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ users:read           │ learner:department:read                          │
 * │ users:write          │ staff:department:manage                          │
 * │                      │ learner:department:manage                        │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ SETTINGS DOMAIN                                                        │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ 2-Part (deprecated)  │ 3-Part (actual)                                  │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ settings:read        │ (not implemented)                                │
 * │ settings:write       │ settings:department:manage                       │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ SYSTEM DOMAIN (unchanged)                                              │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ 2-Part               │ 3-Part                                           │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ system:*             │ system:*                                         │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * GUIDELINES FOR NEW PERMISSIONS:
 *
 * 1. Always use 3-part format: domain:scope:action
 *
 * 2. Choose appropriate scope based on access level:
 *    - department    → Access to all resources in a department
 *    - class         → Access to specific class resources
 *    - own-classes   → Access only to classes user is assigned to
 *    - own           → Access only to user's own resources
 *
 * 3. Use consistent action names:
 *    - read          → View/list resources
 *    - manage        → Create, update, delete resources
 *    - manage-own    → Manage only own resources
 *    - export        → Export/download data
 *
 * 4. Examples of future permissions:
 *
 *    Certificates:
 *    - certificates:department:read      → View department certificates
 *    - certificates:department:manage    → Manage department certificates
 *    - certificates:own:read             → View own certificates
 *
 *    Notifications:
 *    - notifications:department:manage   → Manage department notifications
 *    - notifications:own:read            → View own notifications
 *
 *    Calendar:
 *    - calendar:department:read          → View department calendar
 *    - calendar:department:manage        → Manage department events
 *    - calendar:own-classes:manage       → Manage own class schedules
 *
 *    Announcements:
 *    - announcements:department:read     → View department announcements
 *    - announcements:department:manage   → Create/edit announcements
 *    - announcements:class:manage        → Manage class-level announcements
 *
 *    Analytics:
 *    - analytics:department:read         → View department analytics
 *    - analytics:class:read              → View class analytics
 *    - analytics:own-classes:read        → View analytics for own classes
 *
 *    Billing (if applicable):
 *    - billing:organization:read         → View org billing
 *    - billing:organization:manage       → Manage org billing
 *    - billing:department:read           → View department billing
 */

/**
 * Permission Domains Reference
 */
export const PERMISSION_DOMAINS = {
  CONTENT: 'content',
  REPORTS: 'reports',
  GRADES: 'grades',
  ENROLLMENT: 'enrollment',
  STAFF: 'staff',
  LEARNER: 'learner',
  SETTINGS: 'settings',
  SYSTEM: 'system'
} as const;

/**
 * Permission Scopes Reference
 */
export const PERMISSION_SCOPES = {
  // Resource scopes
  COURSES: 'courses',
  PROGRAMS: 'programs',
  LESSONS: 'lessons',
  EXAMS: 'exams',
  CLASSES: 'classes',
  SCORM: 'scorm',
  // Access scopes
  DEPARTMENT: 'department',
  CLASS: 'class',
  OWN_CLASSES: 'own-classes',
  CONTENT: 'content'
} as const;

/**
 * Permission Actions Reference
 */
export const PERMISSION_ACTIONS = {
  READ: 'read',
  MANAGE: 'manage',
  MANAGE_OWN: 'manage-own',
  EXPORT: 'export'
} as const;

/**
 * Complete Permission Keys Reference
 *
 * These are the actual permission strings returned by the backend
 * and used for authorization checks.
 */
export const PERMISSION_KEYS = {
  // Content permissions
  CONTENT_COURSES_READ: 'content:courses:read',
  CONTENT_COURSES_MANAGE: 'content:courses:manage',
  CONTENT_PROGRAMS_MANAGE: 'content:programs:manage',
  CONTENT_LESSONS_READ: 'content:lessons:read',
  CONTENT_LESSONS_MANAGE: 'content:lessons:manage',
  CONTENT_EXAMS_MANAGE: 'content:exams:manage',
  CONTENT_SCORM_MANAGE: 'content:scorm:manage',
  CONTENT_CLASSES_READ: 'content:classes:read',
  CONTENT_CLASSES_MANAGE: 'content:classes:manage',
  CONTENT_CLASSES_MANAGE_OWN: 'content:classes:manage-own',

  // Staff/Learner management
  STAFF_DEPARTMENT_MANAGE: 'staff:department:manage',
  LEARNER_DEPARTMENT_READ: 'learner:department:read',
  LEARNER_DEPARTMENT_MANAGE: 'learner:department:manage',

  // Enrollment permissions
  ENROLLMENT_DEPARTMENT_READ: 'enrollment:department:read',
  ENROLLMENT_DEPARTMENT_MANAGE: 'enrollment:department:manage',

  // Reports permissions
  REPORTS_CONTENT_READ: 'reports:content:read',
  REPORTS_DEPARTMENT_READ: 'reports:department:read',
  REPORTS_DEPARTMENT_EXPORT: 'reports:department:export',
  REPORTS_CLASS_READ: 'reports:class:read',
  REPORTS_CLASS_EXPORT: 'reports:class:export',

  // Grades permissions
  GRADES_DEPARTMENT_READ: 'grades:department:read',
  GRADES_OWN_CLASSES_MANAGE: 'grades:own-classes:manage',

  // Settings permissions
  SETTINGS_DEPARTMENT_MANAGE: 'settings:department:manage',

  // System permissions (global admin)
  SYSTEM_ALL: 'system:*'
} as const;

/**
 * Role-to-Permissions Mapping Reference
 *
 * Shows which permissions are typically granted to each built-in role.
 * Actual permissions may vary based on department membership.
 */
export const ROLE_PERMISSIONS = {
  'department-admin': [
    'content:courses:manage',
    'content:programs:manage',
    'content:lessons:manage',
    'content:exams:manage',
    'content:scorm:manage',
    'content:courses:read',
    'content:classes:manage',
    'content:lessons:read',
    'content:classes:read',
    'content:classes:manage-own',
    'staff:department:manage',
    'learner:department:manage',
    'learner:department:read',
    'enrollment:department:manage',
    'enrollment:department:read',
    'reports:content:read',
    'reports:department:read',
    'reports:department:export',
    'reports:class:read',
    'reports:class:export',
    'settings:department:manage',
    'grades:department:read',
    'grades:own-classes:manage'
  ],
  'instructor': [
    'content:courses:read',
    'content:lessons:read',
    'content:classes:read',
    'content:classes:manage-own',
    'enrollment:department:read',
    'learner:department:read',
    'reports:class:read',
    'reports:class:export',
    'grades:department:read',
    'grades:own-classes:manage'
  ],
  'content-admin': [
    'content:courses:manage',
    'content:programs:manage',
    'content:lessons:manage',
    'content:exams:manage',
    'content:scorm:manage',
    'content:courses:read',
    'content:lessons:read',
    'reports:content:read'
  ],
  'learner': [
    'content:courses:read',
    'content:lessons:read',
    'content:classes:read'
  ]
} as const;
