/**
 * Course Template API Contracts
 * Version: 1.0.0
 *
 * These contracts define the course template management endpoints for the LMS API.
 * Templates provide reusable CSS/HTML structures for course rendering.
 * Both backend and UI teams use these as the source of truth.
 *
 * Template Types:
 * - master: Global templates (admin only, applies across institution)
 * - department: Department-specific templates (dept admins)
 * - custom: Individual instructor templates (instructors)
 */

export const TemplatesContract = {
  /**
   * List Course Templates
   */
  list: {
    endpoint: '/api/v2/templates',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Retrieve list of course templates with filtering',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        type: {
          type: 'string',
          required: false,
          enum: ['master', 'department', 'custom'],
          description: 'Filter by template type'
        },
        department: {
          type: 'string',
          required: false,
          description: 'Filter by department ID (ObjectId)'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'draft'],
          default: 'active',
          description: 'Filter by template status'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by template name'
        },
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
          description: 'Items per page'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-createdAt',
          description: 'Sort field (prefix with - for desc)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            templates: [
              {
                id: 'string',
                name: 'string',
                type: 'master|department|custom',
                status: 'active|draft',
                department: 'string | null',
                departmentName: 'string | null',
                isGlobal: 'boolean',
                createdBy: {
                  id: 'string',
                  firstName: 'string',
                  lastName: 'string'
                },
                usageCount: 'number',
                previewUrl: 'string | null',
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
          type: 'department',
          status: 'active',
          page: 1,
          limit: 10
        }
      },
      response: {
        success: true,
        data: {
          templates: [
            {
              id: '507f1f77bcf86cd799439011',
              name: 'Computer Science Department Template',
              type: 'department',
              status: 'active',
              department: '507f1f77bcf86cd799439012',
              departmentName: 'Computer Science',
              isGlobal: false,
              createdBy: {
                id: '507f1f77bcf86cd799439013',
                firstName: 'Jane',
                lastName: 'Smith'
              },
              usageCount: 24,
              previewUrl: '/api/v2/templates/507f1f77bcf86cd799439011/preview',
              createdAt: '2025-12-01T00:00:00.000Z',
              updatedAt: '2026-01-05T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:templates'],

    notes: `
      - Learners cannot access this endpoint (staff/admin only)
      - Master templates visible to all staff but editable only by global-admins
      - Department templates visible to staff within that department
      - Custom templates visible to creator and department admins
      - usageCount indicates how many courses are using this template
      - Filtering by department requires user to have access to that department
      - Results automatically filtered by user's department scope unless global-admin
      - Search matches template name (case-insensitive, partial match)
      - Sort options: name, createdAt, updatedAt, usageCount (prefix with - for desc)
    `
  },

  /**
   * Create Course Template
   */
  create: {
    endpoint: '/api/v2/templates',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new course template',

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
          description: 'Template name'
        },
        type: {
          type: 'string',
          required: true,
          enum: ['master', 'department', 'custom'],
          description: 'Template type (determines scope and permissions)'
        },
        css: {
          type: 'string',
          required: false,
          maxLength: 50000,
          description: 'CSS stylesheet content'
        },
        html: {
          type: 'string',
          required: false,
          maxLength: 100000,
          description: 'HTML structure with placeholders'
        },
        department: {
          type: 'string',
          required: false,
          description: 'Department ID (required for department templates)'
        },
        isGlobal: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Global visibility (master templates only)'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'draft'],
          default: 'draft',
          description: 'Initial template status'
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
            type: 'master|department|custom',
            status: 'active|draft',
            css: 'string | null',
            html: 'string | null',
            department: 'string | null',
            departmentName: 'string | null',
            isGlobal: 'boolean',
            createdBy: {
              id: 'string',
              firstName: 'string',
              lastName: 'string'
            },
            usageCount: 'number',
            previewUrl: 'string | null',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to create this template type' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department does not exist' },
        { status: 409, code: 'DUPLICATE_NAME', message: 'Template with this name already exists in scope' }
      ]
    },

    example: {
      request: {
        name: 'Computer Science Department Template',
        type: 'department',
        css: '.course-header { background: #003366; color: white; padding: 20px; }',
        html: '<div class="course-header"><h1>{{courseTitle}}</h1></div><div class="course-content">{{content}}</div>',
        department: '507f1f77bcf86cd799439012',
        status: 'draft'
      },
      response: {
        success: true,
        message: 'Template created successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          name: 'Computer Science Department Template',
          type: 'department',
          status: 'draft',
          css: '.course-header { background: #003366; color: white; padding: 20px; }',
          html: '<div class="course-header"><h1>{{courseTitle}}</h1></div><div class="course-content">{{content}}</div>',
          department: '507f1f77bcf86cd799439012',
          departmentName: 'Computer Science',
          isGlobal: false,
          createdBy: {
            id: '507f1f77bcf86cd799439013',
            firstName: 'Jane',
            lastName: 'Smith'
          },
          usageCount: 0,
          previewUrl: '/api/v2/templates/507f1f77bcf86cd799439011/preview',
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:templates'],

    notes: `
      - Master templates: Require 'admin:templates' permission (global-admin only)
      - Department templates: Require department admin role
      - Custom templates: Any staff member can create
      - Department field is required for type='department'
      - isGlobal only applicable to master templates
      - CSS/HTML sanitization applied to prevent XSS:
        - Removes <script> tags
        - Removes event handlers (onclick, onload, etc.)
        - Allows safe CSS properties only
        - Validates HTML structure
      - Supported placeholders in HTML:
        - {{courseTitle}} - Course title
        - {{courseCode}} - Course code
        - {{content}} - Main content area
        - {{instructorName}} - Instructor name
        - {{departmentName}} - Department name
      - Name must be unique within scope (department for dept templates, global for master)
      - Initial usageCount is 0
      - createdBy automatically set to authenticated user
    `
  },

  /**
   * Get Template Details
   */
  getById: {
    endpoint: '/api/v2/templates/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Retrieve detailed information about a specific template',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Template ID (ObjectId)'
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
            type: 'master|department|custom',
            status: 'active|draft',
            css: 'string | null',
            html: 'string | null',
            department: 'string | null',
            departmentName: 'string | null',
            isGlobal: 'boolean',
            createdBy: {
              id: 'string',
              firstName: 'string',
              lastName: 'string',
              email: 'string'
            },
            usageCount: 'number',
            usedByCourses: [
              {
                id: 'string',
                title: 'string',
                code: 'string'
              }
            ],
            previewUrl: 'string | null',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this template' },
        { status: 404, code: 'TEMPLATE_NOT_FOUND', message: 'Template does not exist' }
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
          name: 'Computer Science Department Template',
          type: 'department',
          status: 'active',
          css: '.course-header { background: #003366; color: white; padding: 20px; }',
          html: '<div class="course-header"><h1>{{courseTitle}}</h1></div><div class="course-content">{{content}}</div>',
          department: '507f1f77bcf86cd799439012',
          departmentName: 'Computer Science',
          isGlobal: false,
          createdBy: {
            id: '507f1f77bcf86cd799439013',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@university.edu'
          },
          usageCount: 24,
          usedByCourses: [
            {
              id: '507f1f77bcf86cd799439014',
              title: 'Introduction to Programming',
              code: 'CS101'
            },
            {
              id: '507f1f77bcf86cd799439015',
              title: 'Data Structures',
              code: 'CS201'
            }
          ],
          previewUrl: '/api/v2/templates/507f1f77bcf86cd799439011/preview',
          createdAt: '2025-12-01T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z'
        }
      }
    },

    permissions: ['read:templates'],

    notes: `
      - Returns full template details including CSS/HTML content
      - usedByCourses includes up to 100 courses using this template
      - Access control:
        - Master templates: Visible to all staff
        - Department templates: Visible to department staff only
        - Custom templates: Visible to creator and department admins
      - CSS/HTML returned as stored (sanitized on create/update)
      - usageCount reflects current number of courses using this template
      - previewUrl can be used to render template with sample content
    `
  },

  /**
   * Update Template
   */
  update: {
    endpoint: '/api/v2/templates/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update an existing template',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Template ID (ObjectId)'
        }
      },
      body: {
        name: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 200,
          description: 'Template name'
        },
        css: {
          type: 'string',
          required: false,
          maxLength: 50000,
          description: 'CSS stylesheet content'
        },
        html: {
          type: 'string',
          required: false,
          maxLength: 100000,
          description: 'HTML structure with placeholders'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'draft'],
          description: 'Template status'
        },
        isGlobal: {
          type: 'boolean',
          required: false,
          description: 'Global visibility (master templates only)'
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
            type: 'master|department|custom',
            status: 'active|draft',
            css: 'string | null',
            html: 'string | null',
            department: 'string | null',
            departmentName: 'string | null',
            isGlobal: 'boolean',
            createdBy: {
              id: 'string',
              firstName: 'string',
              lastName: 'string'
            },
            usageCount: 'number',
            previewUrl: 'string | null',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to modify this template' },
        { status: 404, code: 'TEMPLATE_NOT_FOUND', message: 'Template does not exist' },
        { status: 409, code: 'DUPLICATE_NAME', message: 'Template with this name already exists in scope' },
        { status: 409, code: 'TEMPLATE_IN_USE', message: 'Cannot modify active template in use by courses' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        body: {
          name: 'CS Department Template v2',
          css: '.course-header { background: #004080; color: white; padding: 25px; border-radius: 5px; }',
          status: 'active'
        }
      },
      response: {
        success: true,
        message: 'Template updated successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          name: 'CS Department Template v2',
          type: 'department',
          status: 'active',
          css: '.course-header { background: #004080; color: white; padding: 25px; border-radius: 5px; }',
          html: '<div class="course-header"><h1>{{courseTitle}}</h1></div><div class="course-content">{{content}}</div>',
          department: '507f1f77bcf86cd799439012',
          departmentName: 'Computer Science',
          isGlobal: false,
          createdBy: {
            id: '507f1f77bcf86cd799439013',
            firstName: 'Jane',
            lastName: 'Smith'
          },
          usageCount: 24,
          previewUrl: '/api/v2/templates/507f1f77bcf86cd799439011/preview',
          createdAt: '2025-12-01T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:templates'],

    notes: `
      - Permission requirements:
        - Master templates: Require 'admin:templates' permission
        - Department templates: Require department admin role
        - Custom templates: Only creator or department admin can edit
      - Cannot change template type after creation
      - Cannot change department after creation
      - CSS/HTML sanitization applied on update (same rules as create)
      - Updating active template in use shows warning (use duplicate instead)
      - Name uniqueness validated within scope
      - Partial updates supported (only send changed fields)
      - isGlobal only modifiable on master templates
      - updatedAt automatically updated
      - Version history not tracked (consider duplicating before major changes)
    `
  },

  /**
   * Delete Template
   */
  delete: {
    endpoint: '/api/v2/templates/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a template',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Template ID (ObjectId)'
        }
      },
      query: {
        force: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Force delete even if in use (removes from courses)'
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
            deletedId: 'string',
            affectedCourses: 'number',
            replacedWith: 'string | null'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete this template' },
        { status: 404, code: 'TEMPLATE_NOT_FOUND', message: 'Template does not exist' },
        { status: 409, code: 'TEMPLATE_IN_USE', message: 'Cannot delete template in use by courses. Use force=true or reassign courses first.' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        query: {
          force: false
        }
      },
      response: {
        success: true,
        message: 'Template deleted successfully',
        data: {
          deletedId: '507f1f77bcf86cd799439011',
          affectedCourses: 0,
          replacedWith: null
        }
      }
    },

    permissions: ['write:templates', 'delete:templates'],

    notes: `
      - Permission requirements:
        - Master templates: Require 'admin:templates' permission
        - Department templates: Require department admin role
        - Custom templates: Only creator or department admin can delete
      - Cannot delete template in use unless force=true
      - With force=true:
        - Removes template reference from courses (courses revert to default)
        - affectedCourses indicates how many courses were updated
        - replacedWith indicates default template used (if any)
      - Soft delete (template marked as deleted, not removed from database)
      - Courses using deleted template will use department default or system default
      - Deletion is permanent for templates not in use
      - System default templates cannot be deleted
      - Consider duplicating template before deletion for backup
    `
  },

  /**
   * Duplicate Template
   */
  duplicate: {
    endpoint: '/api/v2/templates/:id/duplicate',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a copy of an existing template',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Source template ID (ObjectId)'
        }
      },
      body: {
        name: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 200,
          description: 'New template name (defaults to "Copy of [original]")'
        },
        type: {
          type: 'string',
          required: false,
          enum: ['master', 'department', 'custom'],
          description: 'New template type (defaults to same as source)'
        },
        department: {
          type: 'string',
          required: false,
          description: 'Target department for new template (required if type=department)'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'draft'],
          default: 'draft',
          description: 'Status for new template'
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
            type: 'master|department|custom',
            status: 'active|draft',
            css: 'string | null',
            html: 'string | null',
            department: 'string | null',
            departmentName: 'string | null',
            isGlobal: 'boolean',
            createdBy: {
              id: 'string',
              firstName: 'string',
              lastName: 'string'
            },
            usageCount: 'number',
            duplicatedFrom: 'string',
            previewUrl: 'string | null',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to duplicate or create this template type' },
        { status: 404, code: 'TEMPLATE_NOT_FOUND', message: 'Source template does not exist' },
        { status: 409, code: 'DUPLICATE_NAME', message: 'Template with this name already exists' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        body: {
          name: 'CS Department Template - Spring 2026',
          type: 'department',
          department: '507f1f77bcf86cd799439012',
          status: 'draft'
        }
      },
      response: {
        success: true,
        message: 'Template duplicated successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          name: 'CS Department Template - Spring 2026',
          type: 'department',
          status: 'draft',
          css: '.course-header { background: #003366; color: white; padding: 20px; }',
          html: '<div class="course-header"><h1>{{courseTitle}}</h1></div><div class="course-content">{{content}}</div>',
          department: '507f1f77bcf86cd799439012',
          departmentName: 'Computer Science',
          isGlobal: false,
          createdBy: {
            id: '507f1f77bcf86cd799439013',
            firstName: 'Jane',
            lastName: 'Smith'
          },
          usageCount: 0,
          duplicatedFrom: '507f1f77bcf86cd799439011',
          previewUrl: '/api/v2/templates/507f1f77bcf86cd799439020/preview',
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:templates'],

    notes: `
      - Copies all CSS/HTML content from source template
      - Creates new template with new ID (not a reference)
      - Permission requirements:
        - Must have read access to source template
        - Must have write permissions for target template type
        - Creating master template requires 'admin:templates'
        - Creating department template requires department admin
      - Default name: "Copy of [original name]"
      - New template always starts with usageCount: 0
      - duplicatedFrom field tracks source template
      - Can duplicate across template types (with appropriate permissions)
      - Can duplicate to different department
      - Useful for:
        - Creating variations of existing templates
        - Versioning templates before major changes
        - Cross-department template sharing
      - Source template metadata (createdBy, usageCount) not copied
      - createdBy set to current user
    `
  },

  /**
   * Preview Template
   */
  preview: {
    endpoint: '/api/v2/templates/:id/preview',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Generate preview of template with sample content',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Template ID (ObjectId)'
        }
      },
      query: {
        courseTitle: {
          type: 'string',
          required: false,
          default: 'Sample Course Title',
          description: 'Sample course title for preview'
        },
        courseCode: {
          type: 'string',
          required: false,
          default: 'SAMPLE101',
          description: 'Sample course code for preview'
        },
        format: {
          type: 'string',
          required: false,
          enum: ['html', 'json'],
          default: 'html',
          description: 'Response format'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          contentType: 'text/html | application/json',
          data: 'string | object',
          description: 'If format=html: returns rendered HTML. If format=json: returns object with html, css, and metadata'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this template' },
        { status: 404, code: 'TEMPLATE_NOT_FOUND', message: 'Template does not exist' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        query: {
          courseTitle: 'Introduction to Programming',
          courseCode: 'CS101',
          format: 'json'
        }
      },
      response: {
        success: true,
        data: {
          html: '<div class="course-header"><h1>Introduction to Programming</h1></div><div class="course-content"><p>This is sample course content...</p></div>',
          css: '.course-header { background: #003366; color: white; padding: 20px; }',
          metadata: {
            templateId: '507f1f77bcf86cd799439011',
            templateName: 'Computer Science Department Template',
            previewGenerated: '2026-01-08T00:00:00.000Z',
            placeholders: {
              courseTitle: 'Introduction to Programming',
              courseCode: 'CS101',
              instructorName: 'Sample Instructor',
              departmentName: 'Computer Science',
              content: '<p>This is sample course content...</p>'
            }
          }
        }
      }
    },

    permissions: ['read:templates'],

    notes: `
      - Renders template with sample data for visual preview
      - format=html returns ready-to-display HTML (with inline CSS)
      - format=json returns structured data with separate HTML/CSS
      - Placeholder values:
        - courseTitle: From query param or default
        - courseCode: From query param or default
        - instructorName: "Sample Instructor"
        - departmentName: From template's department or "Sample Department"
        - content: Sample lorem ipsum content
      - Access control same as getById
      - Preview does not affect usageCount
      - Useful for:
        - Template selection UI
        - Visual comparison of templates
        - Testing template changes before applying
      - Preview includes all CSS styles (scoped to avoid conflicts)
      - Responsive design maintained in preview
      - No course data required (all sample data)
    `
  }
};

// Type exports for consumers
export type TemplatesContractType = typeof TemplatesContract;
export type TemplateListRequest = typeof TemplatesContract.list.request;
export type TemplateListResponse = typeof TemplatesContract.list.example.response;
export type TemplateCreateRequest = typeof TemplatesContract.create.example.request;
export type TemplateCreateResponse = typeof TemplatesContract.create.example.response;
export type TemplateDetailsResponse = typeof TemplatesContract.getById.example.response;
export type TemplateUpdateRequest = typeof TemplatesContract.update.example.request;
export type TemplateUpdateResponse = typeof TemplatesContract.update.example.response;
export type TemplateDuplicateRequest = typeof TemplatesContract.duplicate.example.request;
export type TemplateDuplicateResponse = typeof TemplatesContract.duplicate.example.response;
