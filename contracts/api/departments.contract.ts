/**
 * Department Management API Contracts
 * Version: 1.0.0
 *
 * These contracts define the department management endpoints for the LMS API.
 * Both backend and UI teams use these as the source of truth.
 *
 * Phase 1: Core Identity & Organization (High Priority)
 */

export const DepartmentsContract = {
  /**
   * List Departments
   */
  list: {
    endpoint: '/api/v2/departments',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Retrieve list of departments with optional filtering and pagination',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        page: {
          type: 'number',
          required: false,
          default: 1,
          min: 1,
          description: 'Page number for pagination'
        },
        limit: {
          type: 'number',
          required: false,
          default: 10,
          min: 1,
          max: 100,
          description: 'Number of items per page'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by department name or code'
        },
        parentId: {
          type: 'string',
          required: false,
          description: 'Filter by parent department ID'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'inactive'],
          description: 'Filter by department status'
        },
        sort: {
          type: 'string',
          required: false,
          default: 'name',
          description: 'Sort field (prefix with - for descending)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            departments: [
              {
                id: 'string',
                name: 'string',
                code: 'string',
                description: 'string or null',
                parentId: 'string or null',
                status: 'active or inactive',
                level: 'number',
                hasChildren: 'boolean',
                metadata: {
                  totalStaff: 'number',
                  totalPrograms: 'number',
                  totalCourses: 'number'
                },
                createdAt: 'Date',
                updatedAt: 'Date'
              }
            ],
            pagination: {
              page: 'number',
              limit: 'number',
              total: 'number',
              totalPages: 'number',
              hasNext: 'boolean',
              hasPrev: 'boolean'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' }
      ]
    },

    example: {
      request: {
        query: {
          page: 1,
          limit: 10,
          status: 'active',
          sort: 'name'
        }
      },
      response: {
        success: true,
        data: {
          departments: [
            {
              id: '507f1f77bcf86cd799439011',
              name: 'Computer Science',
              code: 'CS',
              description: 'Department of Computer Science and Information Technology',
              parentId: null,
              status: 'active',
              level: 1,
              hasChildren: true,
              metadata: {
                totalStaff: 15,
                totalPrograms: 3,
                totalCourses: 45
              },
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2026-01-08T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439012',
              name: 'Software Engineering',
              code: 'SE',
              description: 'Software Engineering Division',
              parentId: '507f1f77bcf86cd799439011',
              status: 'active',
              level: 2,
              hasChildren: false,
              metadata: {
                totalStaff: 8,
                totalPrograms: 1,
                totalCourses: 20
              },
              createdAt: '2025-02-01T00:00:00.000Z',
              updatedAt: '2026-01-08T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:departments'],

    notes: `
      - Returns departments accessible to the authenticated user
      - Global admins see all departments
      - Staff see departments they are assigned to and their children
      - Pagination defaults: page=1, limit=10
      - Sort options: name, code, createdAt, -name, -code, -createdAt (- for descending)
      - Search performs case-insensitive match on name and code fields
      - parentId=null returns top-level departments only
      - metadata fields are computed from related records
    `
  },

  /**
   * Create Department
   */
  create: {
    endpoint: '/api/v2/departments',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        name: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 200,
          description: 'Department name'
        },
        code: {
          type: 'string',
          required: true,
          minLength: 2,
          maxLength: 20,
          pattern: '^[A-Z0-9-]+$',
          description: 'Unique department code (uppercase alphanumeric with hyphens)'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Department description'
        },
        parentId: {
          type: 'string',
          required: false,
          description: 'Parent department ID for hierarchical structure'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'inactive'],
          default: 'active',
          description: 'Department status'
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
            id: 'string',
            name: 'string',
            code: 'string',
            description: 'string or null',
            parentId: 'string or null',
            status: 'active or inactive',
            level: 'number',
            hasChildren: 'boolean',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to create department' },
        { status: 404, code: 'PARENT_NOT_FOUND', message: 'Parent department not found' },
        { status: 409, code: 'CODE_EXISTS', message: 'Department code already exists' }
      ]
    },

    example: {
      request: {
        name: 'Artificial Intelligence',
        code: 'AI',
        description: 'Department of Artificial Intelligence and Machine Learning',
        parentId: '507f1f77bcf86cd799439011',
        status: 'active'
      },
      response: {
        success: true,
        message: 'Department created successfully',
        data: {
          id: '507f1f77bcf86cd799439013',
          name: 'Artificial Intelligence',
          code: 'AI',
          description: 'Department of Artificial Intelligence and Machine Learning',
          parentId: '507f1f77bcf86cd799439011',
          status: 'active',
          level: 2,
          hasChildren: false,
          createdAt: '2026-01-08T10:30:00.000Z',
          updatedAt: '2026-01-08T10:30:00.000Z'
        }
      }
    },

    permissions: ['write:departments'],

    notes: `
      - Department code must be unique across the entire system
      - Code format: uppercase letters, numbers, and hyphens only (e.g., CS, CS-AI, CS-2024)
      - Name must be unique within the same parent department
      - If parentId provided, parent department must exist and be active
      - Level is automatically calculated: top-level departments are level 1, children are parent level + 1
      - Maximum nesting depth: 5 levels
      - Creating a department does not automatically assign staff to it
      - Global admin or user with write:departments permission required
    `
  },

  /**
   * Get Department Details
   */
  get: {
    endpoint: '/api/v2/departments/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Department ID'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'string',
            name: 'string',
            code: 'string',
            description: 'string or null',
            parentId: 'string or null',
            parent: 'object or null',
            status: 'active or inactive',
            level: 'number',
            hasChildren: 'boolean',
            childCount: 'number',
            metadata: {
              totalStaff: 'number',
              totalPrograms: 'number',
              totalCourses: 'number',
              activeEnrollments: 'number'
            },
            createdAt: 'Date',
            updatedAt: 'Date',
            createdBy: 'object or null',
            updatedBy: 'object or null'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439011',
          name: 'Computer Science',
          code: 'CS',
          description: 'Department of Computer Science and Information Technology',
          parentId: null,
          parent: null,
          status: 'active',
          level: 1,
          hasChildren: true,
          childCount: 3,
          metadata: {
            totalStaff: 15,
            totalPrograms: 3,
            totalCourses: 45,
            activeEnrollments: 234
          },
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z',
          createdBy: {
            id: '507f1f77bcf86cd799439020',
            name: 'Admin User'
          },
          updatedBy: {
            id: '507f1f77bcf86cd799439020',
            name: 'Admin User'
          }
        }
      }
    },

    permissions: ['read:departments'],

    notes: `
      - Returns detailed department information including parent relationship
      - parent field is populated with basic parent department information if parentId exists
      - metadata fields are computed from related records:
        - totalStaff: count of staff assigned to this department
        - totalPrograms: count of programs in this department
        - totalCourses: count of courses in this department or its programs
        - activeEnrollments: count of active course enrollments
      - createdBy and updatedBy populated if audit information exists
      - Users can only view departments they have access to (assigned or global admin)
    `
  },

  /**
   * Update Department
   */
  update: {
    endpoint: '/api/v2/departments/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update department information',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Department ID'
        }
      },
      body: {
        name: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 200,
          description: 'Department name'
        },
        code: {
          type: 'string',
          required: false,
          minLength: 2,
          maxLength: 20,
          pattern: '^[A-Z0-9-]+$',
          description: 'Department code'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Department description'
        },
        parentId: {
          type: 'string',
          required: false,
          description: 'Parent department ID (set to null to make top-level)'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'inactive'],
          description: 'Department status'
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
            id: 'string',
            name: 'string',
            code: 'string',
            description: 'string or null',
            parentId: 'string or null',
            status: 'active or inactive',
            level: 'number',
            hasChildren: 'boolean',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'CIRCULAR_REFERENCE', message: 'Cannot set parent that would create circular reference' },
        { status: 400, code: 'MAX_DEPTH_EXCEEDED', message: 'Maximum nesting depth would be exceeded' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update department' },
        { status: 404, code: 'NOT_FOUND', message: 'Department not found' },
        { status: 404, code: 'PARENT_NOT_FOUND', message: 'Parent department not found' },
        { status: 409, code: 'CODE_EXISTS', message: 'Department code already exists' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439013'
        },
        body: {
          name: 'Artificial Intelligence & Machine Learning',
          description: 'Department of AI, Machine Learning, and Deep Learning Research',
          status: 'active'
        }
      },
      response: {
        success: true,
        message: 'Department updated successfully',
        data: {
          id: '507f1f77bcf86cd799439013',
          name: 'Artificial Intelligence & Machine Learning',
          code: 'AI',
          description: 'Department of AI, Machine Learning, and Deep Learning Research',
          parentId: '507f1f77bcf86cd799439011',
          status: 'active',
          level: 2,
          hasChildren: false,
          createdAt: '2026-01-08T10:30:00.000Z',
          updatedAt: '2026-01-08T11:15:00.000Z'
        }
      }
    },

    permissions: ['write:departments'],

    notes: `
      - All fields are optional - only provided fields will be updated
      - Code must remain unique if changed
      - Changing parentId will recalculate level for department and all children
      - Cannot set parentId to self or any descendant (prevents circular references)
      - Cannot change parentId if it would exceed maximum nesting depth (5 levels)
      - Setting status to 'inactive' does not cascade to children or related records
      - Setting parentId to null makes the department top-level (level 1)
      - Changing parent will update child hierarchy paths
      - Global admin or user with write:departments permission required
    `
  },

  /**
   * Delete Department
   */
  delete: {
    endpoint: '/api/v2/departments/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a department (soft delete)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Department ID'
        }
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
        { status: 400, code: 'HAS_CHILDREN', message: 'Cannot delete department with child departments' },
        { status: 400, code: 'HAS_PROGRAMS', message: 'Cannot delete department with active programs' },
        { status: 400, code: 'HAS_STAFF', message: 'Cannot delete department with assigned staff' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete department' },
        { status: 404, code: 'NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439013'
        }
      },
      response: {
        success: true,
        message: 'Department deleted successfully'
      }
    },

    permissions: ['delete:departments'],

    notes: `
      - Performs soft delete (sets deletedAt timestamp, not actual deletion)
      - Cannot delete department with child departments (must delete or reassign children first)
      - Cannot delete department with active programs (must delete or reassign programs first)
      - Cannot delete department with assigned staff (must remove staff assignments first)
      - Cannot delete department with active courses (checked via programs)
      - Deleted departments are hidden from list/get endpoints by default
      - Deleted departments can be restored by admin (not via API, database operation)
      - Global admin or user with delete:departments permission required
      - Consider setting status to 'inactive' instead if temporary deactivation is needed
    `
  },

  /**
   * Get Department Hierarchy
   */
  getHierarchy: {
    endpoint: '/api/v2/departments/:id/hierarchy',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get department tree structure including ancestors and descendants',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Department ID'
        }
      },
      query: {
        depth: {
          type: 'number',
          required: false,
          min: 1,
          max: 5,
          description: 'Maximum depth of child departments to include'
        },
        includeInactive: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include inactive departments in hierarchy'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            ancestors: [
              {
                id: 'string',
                name: 'string',
                code: 'string',
                level: 'number'
              }
            ],
            current: {
              id: 'string',
              name: 'string',
              code: 'string',
              description: 'string or null',
              parentId: 'string or null',
              status: 'active or inactive',
              level: 'number',
              hasChildren: 'boolean'
            },
            children: [
              {
                id: 'string',
                name: 'string',
                code: 'string',
                description: 'string or null',
                status: 'active or inactive',
                level: 'number',
                hasChildren: 'boolean',
                childCount: 'number',
                children: 'array' // Nested recursively based on depth
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439012'
        },
        query: {
          depth: 2,
          includeInactive: false
        }
      },
      response: {
        success: true,
        data: {
          ancestors: [
            {
              id: '507f1f77bcf86cd799439011',
              name: 'Computer Science',
              code: 'CS',
              level: 1
            }
          ],
          current: {
            id: '507f1f77bcf86cd799439012',
            name: 'Software Engineering',
            code: 'SE',
            description: 'Software Engineering Division',
            parentId: '507f1f77bcf86cd799439011',
            status: 'active',
            level: 2,
            hasChildren: true
          },
          children: [
            {
              id: '507f1f77bcf86cd799439013',
              name: 'Web Development',
              code: 'WEB',
              description: 'Web Development Team',
              status: 'active',
              level: 3,
              hasChildren: false,
              childCount: 0,
              children: []
            },
            {
              id: '507f1f77bcf86cd799439014',
              name: 'Mobile Development',
              code: 'MOBILE',
              description: 'Mobile Development Team',
              status: 'active',
              level: 3,
              hasChildren: true,
              childCount: 2,
              children: [
                {
                  id: '507f1f77bcf86cd799439015',
                  name: 'iOS Development',
                  code: 'IOS',
                  description: null,
                  status: 'active',
                  level: 4,
                  hasChildren: false,
                  childCount: 0,
                  children: []
                }
              ]
            }
          ]
        }
      }
    },

    permissions: ['read:departments'],

    notes: `
      - ancestors array contains all parent departments from root to immediate parent
      - ancestors ordered from top-level (root) to immediate parent
      - current object contains the requested department
      - children array contains nested child departments up to specified depth
      - depth parameter controls how many levels of children to return (default: unlimited)
      - includeInactive=false filters out inactive departments from all parts of hierarchy
      - children array is recursive - each child can have its own children array
      - Empty children array means no children or depth limit reached
      - hasChildren indicates if department has children (even if not included due to depth)
      - childCount shows total immediate children regardless of depth parameter
      - Useful for building department selector trees and navigation breadcrumbs
    `
  },

  /**
   * Get Department Programs
   */
  getPrograms: {
    endpoint: '/api/v2/departments/:id/programs',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all programs in a department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Department ID'
        }
      },
      query: {
        page: {
          type: 'number',
          required: false,
          default: 1,
          min: 1
        },
        limit: {
          type: 'number',
          required: false,
          default: 10,
          min: 1,
          max: 100
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'inactive', 'archived'],
          description: 'Filter by program status'
        },
        includeChildDepartments: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include programs from child departments'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            departmentId: 'string',
            departmentName: 'string',
            programs: [
              {
                id: 'string',
                name: 'string',
                code: 'string',
                description: 'string or null',
                departmentId: 'string',
                departmentName: 'string',
                status: 'active or inactive or archived',
                levelCount: 'number',
                courseCount: 'number',
                enrollmentCount: 'number',
                createdAt: 'Date',
                updatedAt: 'Date'
              }
            ],
            pagination: {
              page: 'number',
              limit: 'number',
              total: 'number',
              totalPages: 'number',
              hasNext: 'boolean',
              hasPrev: 'boolean'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        query: {
          page: 1,
          limit: 10,
          status: 'active',
          includeChildDepartments: true
        }
      },
      response: {
        success: true,
        data: {
          departmentId: '507f1f77bcf86cd799439011',
          departmentName: 'Computer Science',
          programs: [
            {
              id: '507f1f77bcf86cd799439030',
              name: 'Computer Science Certificate',
              code: 'CS-CERT',
              description: 'Comprehensive computer science certification program',
              departmentId: '507f1f77bcf86cd799439011',
              departmentName: 'Computer Science',
              status: 'active',
              levelCount: 3,
              courseCount: 15,
              enrollmentCount: 120,
              createdAt: '2025-01-15T00:00:00.000Z',
              updatedAt: '2026-01-08T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439031',
              name: 'Web Development Bootcamp',
              code: 'WEB-BOOT',
              description: 'Intensive web development training program',
              departmentId: '507f1f77bcf86cd799439013',
              departmentName: 'Web Development',
              status: 'active',
              levelCount: 2,
              courseCount: 8,
              enrollmentCount: 85,
              createdAt: '2025-03-01T00:00:00.000Z',
              updatedAt: '2026-01-08T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:departments', 'read:programs'],

    notes: `
      - Returns programs directly in the specified department by default
      - includeChildDepartments=true returns programs from all descendant departments
      - When including child departments, departmentName shows the actual program's department
      - levelCount is the number of program levels configured
      - courseCount is the total courses across all levels
      - enrollmentCount is the number of active learner enrollments
      - Results are paginated with default limit of 10
      - Only returns programs the user has permission to view
      - status filter applies to program status, not department status
    `
  },

  /**
   * Get Department Staff
   */
  getStaff: {
    endpoint: '/api/v2/departments/:id/staff',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all staff members assigned to a department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Department ID'
        }
      },
      query: {
        page: {
          type: 'number',
          required: false,
          default: 1,
          min: 1
        },
        limit: {
          type: 'number',
          required: false,
          default: 10,
          min: 1,
          max: 100
        },
        role: {
          type: 'string',
          required: false,
          enum: ['content-admin', 'instructor', 'observer'],
          description: 'Filter by department role'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'inactive'],
          description: 'Filter by user status'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by name or email'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            departmentId: 'string',
            departmentName: 'string',
            staff: [
              {
                id: 'string',
                email: 'string',
                firstName: 'string',
                lastName: 'string',
                fullName: 'string',
                departmentRole: 'content-admin or instructor or observer',
                status: 'active or inactive',
                assignedCourses: 'number',
                lastLogin: 'Date or null',
                joinedDepartmentAt: 'Date',
                permissions: 'string[]'
              }
            ],
            pagination: {
              page: 'number',
              limit: 'number',
              total: 'number',
              totalPages: 'number',
              hasNext: 'boolean',
              hasPrev: 'boolean'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        query: {
          page: 1,
          limit: 10,
          role: 'instructor',
          status: 'active'
        }
      },
      response: {
        success: true,
        data: {
          departmentId: '507f1f77bcf86cd799439011',
          departmentName: 'Computer Science',
          staff: [
            {
              id: '507f1f77bcf86cd799439040',
              email: 'john.instructor@example.com',
              firstName: 'John',
              lastName: 'Smith',
              fullName: 'John Smith',
              departmentRole: 'instructor',
              status: 'active',
              assignedCourses: 5,
              lastLogin: '2026-01-08T09:30:00.000Z',
              joinedDepartmentAt: '2025-06-15T00:00:00.000Z',
              permissions: ['read:courses', 'read:learners', 'read:progress']
            },
            {
              id: '507f1f77bcf86cd799439041',
              email: 'jane.instructor@example.com',
              firstName: 'Jane',
              lastName: 'Doe',
              fullName: 'Jane Doe',
              departmentRole: 'instructor',
              status: 'active',
              assignedCourses: 3,
              lastLogin: '2026-01-07T14:20:00.000Z',
              joinedDepartmentAt: '2025-08-01T00:00:00.000Z',
              permissions: ['read:courses', 'read:learners', 'read:progress']
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:departments', 'read:staff'],

    notes: `
      - Returns staff members with active assignments to this department
      - departmentRole is specific to this department (user may have different roles in other departments)
      - assignedCourses counts courses in this department where user is instructor
      - permissions array shows department-scoped permissions for this role
      - joinedDepartmentAt is when the staff member was assigned to this department
      - Global admin can view all staff in any department
      - Department content-admin can view all staff in their department
      - Search performs case-insensitive match on firstName, lastName, and email
      - Does not include global-admin users unless they are explicitly assigned to department
    `
  },

  /**
   * Get Department Statistics
   */
  getStats: {
    endpoint: '/api/v2/departments/:id/stats',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get statistical overview of department activity and performance',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Department ID'
        }
      },
      query: {
        includeChildDepartments: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include statistics from child departments'
        },
        period: {
          type: 'string',
          required: false,
          enum: ['week', 'month', 'quarter', 'year', 'all'],
          default: 'all',
          description: 'Time period for enrollment and completion stats'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            departmentId: 'string',
            departmentName: 'string',
            period: 'string',
            includesChildren: 'boolean',
            staff: {
              total: 'number',
              byRole: {
                contentAdmin: 'number',
                instructor: 'number',
                observer: 'number'
              },
              active: 'number',
              inactive: 'number'
            },
            programs: {
              total: 'number',
              active: 'number',
              inactive: 'number',
              archived: 'number'
            },
            courses: {
              total: 'number',
              published: 'number',
              draft: 'number',
              archived: 'number'
            },
            enrollments: {
              total: 'number',
              active: 'number',
              completed: 'number',
              withdrawn: 'number',
              newThisPeriod: 'number',
              completedThisPeriod: 'number'
            },
            performance: {
              averageCompletionRate: 'number',
              averageScore: 'number',
              totalTimeSpent: 'number',
              averageTimePerCourse: 'number'
            },
            topCourses: [
              {
                courseId: 'string',
                courseName: 'string',
                enrollmentCount: 'number',
                completionRate: 'number',
                averageScore: 'number'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        query: {
          includeChildDepartments: true,
          period: 'month'
        }
      },
      response: {
        success: true,
        data: {
          departmentId: '507f1f77bcf86cd799439011',
          departmentName: 'Computer Science',
          period: 'month',
          includesChildren: true,
          staff: {
            total: 15,
            byRole: {
              contentAdmin: 2,
              instructor: 10,
              observer: 3
            },
            active: 14,
            inactive: 1
          },
          programs: {
            total: 3,
            active: 3,
            inactive: 0,
            archived: 0
          },
          courses: {
            total: 45,
            published: 38,
            draft: 5,
            archived: 2
          },
          enrollments: {
            total: 450,
            active: 234,
            completed: 189,
            withdrawn: 27,
            newThisPeriod: 35,
            completedThisPeriod: 28
          },
          performance: {
            averageCompletionRate: 0.78,
            averageScore: 82.5,
            totalTimeSpent: 1458000,
            averageTimePerCourse: 6230
          },
          topCourses: [
            {
              courseId: '507f1f77bcf86cd799439050',
              courseName: 'Introduction to Programming',
              enrollmentCount: 85,
              completionRate: 0.82,
              averageScore: 84.2
            },
            {
              courseId: '507f1f77bcf86cd799439051',
              courseName: 'Data Structures',
              enrollmentCount: 67,
              completionRate: 0.75,
              averageScore: 79.8
            },
            {
              courseId: '507f1f77bcf86cd799439052',
              courseName: 'Web Development Fundamentals',
              enrollmentCount: 58,
              completionRate: 0.88,
              averageScore: 86.1
            }
          ]
        }
      }
    },

    permissions: ['read:departments', 'read:analytics'],

    notes: `
      - Provides comprehensive statistical overview of department operations
      - includeChildDepartments=true aggregates stats from all descendant departments
      - period parameter filters enrollment and completion counts to specific timeframe
      - averageCompletionRate is (completed enrollments / total enrollments)
      - averageScore is mean score across all completed course enrollments
      - totalTimeSpent is total seconds spent in all courses (from progress tracking)
      - averageTimePerCourse is totalTimeSpent / completed enrollments
      - topCourses limited to top 5 by enrollment count
      - Performance metrics only include completed enrollments
      - Only includes courses/programs user has access to view
      - Useful for department dashboards and administrative reports
      - Statistics computed in real-time (may be cached for performance)
    `
  }
};

// Type exports for consumers
export type DepartmentsContractType = typeof DepartmentsContract;
export type DepartmentListResponse = typeof DepartmentsContract.list.example.response;
export type DepartmentCreateRequest = typeof DepartmentsContract.create.example.request;
export type DepartmentCreateResponse = typeof DepartmentsContract.create.example.response;
export type DepartmentDetailsResponse = typeof DepartmentsContract.get.example.response;
export type DepartmentUpdateRequest = typeof DepartmentsContract.update.example.request;
export type DepartmentHierarchyResponse = typeof DepartmentsContract.getHierarchy.example.response;
export type DepartmentProgramsResponse = typeof DepartmentsContract.getPrograms.example.response;
export type DepartmentStaffResponse = typeof DepartmentsContract.getStaff.example.response;
export type DepartmentStatsResponse = typeof DepartmentsContract.getStats.example.response;
