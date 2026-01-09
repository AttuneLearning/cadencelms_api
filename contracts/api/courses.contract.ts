/**
 * Courses API Contracts
 * Version: 1.0.0
 *
 * These contracts define the course management endpoints for the LMS API.
 * Both backend and UI teams use these as the source of truth.
 *
 * Phase 2: Programs & Courses (High Priority - CRITICAL)
 */

export const CoursesContract = {
  /**
   * List Courses
   * GET /courses
   */
  list: {
    endpoint: '/api/v2/courses',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all courses with pagination and filters',

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
          description: 'Page number'
        },
        limit: {
          type: 'number',
          required: false,
          default: 10,
          min: 1,
          max: 100,
          description: 'Items per page'
        },
        department: {
          type: 'string',
          required: false,
          description: 'Filter by department ID'
        },
        program: {
          type: 'string',
          required: false,
          description: 'Filter by program ID'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['draft', 'published', 'archived'],
          description: 'Filter by status'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by title or code'
        },
        instructor: {
          type: 'string',
          required: false,
          description: 'Filter by instructor ID'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-createdAt',
          description: 'Sort field (prefix with - for desc). Options: title, code, createdAt, updatedAt'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            courses: [
              {
                id: 'string',
                title: 'string',
                code: 'string',
                description: 'string',
                department: {
                  id: 'string',
                  name: 'string'
                },
                program: {
                  id: 'string',
                  name: 'string'
                },
                credits: 'number',
                duration: 'number',
                status: 'draft|published|archived',
                instructors: [
                  {
                    id: 'string',
                    firstName: 'string',
                    lastName: 'string',
                    email: 'string'
                  }
                ],
                settings: {
                  allowSelfEnrollment: 'boolean',
                  passingScore: 'number',
                  maxAttempts: 'number',
                  certificateEnabled: 'boolean'
                },
                moduleCount: 'number',
                enrollmentCount: 'number',
                publishedAt: 'Date | null',
                archivedAt: 'Date | null',
                createdBy: 'string',
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view courses' }
      ]
    },

    example: {
      request: {
        query: {
          page: 1,
          limit: 10,
          department: '507f1f77bcf86cd799439012',
          status: 'published',
          sort: '-createdAt'
        }
      },
      response: {
        success: true,
        data: {
          courses: [
            {
              id: '507f1f77bcf86cd799439020',
              title: 'Introduction to Web Development',
              code: 'WEB101',
              description: 'Learn the fundamentals of HTML, CSS, and JavaScript',
              department: {
                id: '507f1f77bcf86cd799439012',
                name: 'Computer Science'
              },
              program: {
                id: '507f1f77bcf86cd799439015',
                name: 'Web Development Certificate'
              },
              credits: 3,
              duration: 40,
              status: 'published',
              instructors: [
                {
                  id: '507f1f77bcf86cd799439030',
                  firstName: 'Sarah',
                  lastName: 'Johnson',
                  email: 'sarah.johnson@example.com'
                }
              ],
              settings: {
                allowSelfEnrollment: true,
                passingScore: 70,
                maxAttempts: 3,
                certificateEnabled: true
              },
              moduleCount: 5,
              enrollmentCount: 45,
              publishedAt: '2026-01-01T00:00:00.000Z',
              archivedAt: null,
              createdBy: '507f1f77bcf86cd799439011',
              createdAt: '2025-12-15T00:00:00.000Z',
              updatedAt: '2026-01-05T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 45,
            totalPages: 5,
            hasNext: true,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:courses'],

    notes: `
      - Returns courses based on user permissions (department-scoped for staff)
      - Global admins see all courses
      - Instructors see courses they're assigned to
      - Learners only see published courses they're enrolled in
      - Search performs case-insensitive match on title and code
      - Status filter: draft, published, archived
      - Sort options: title, code, createdAt, updatedAt (prefix with - for descending)
    `
  },

  /**
   * Create Course
   * POST /courses
   */
  create: {
    endpoint: '/api/v2/courses',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new course',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        title: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 200,
          description: 'Course title'
        },
        code: {
          type: 'string',
          required: true,
          pattern: '^[A-Z]{2,4}[0-9]{3}$',
          description: 'Course code format: ABC123'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Course description'
        },
        department: {
          type: 'string',
          required: true,
          description: 'Department ID (ObjectId)'
        },
        program: {
          type: 'string',
          required: false,
          description: 'Program ID (ObjectId)'
        },
        credits: {
          type: 'number',
          required: false,
          min: 0,
          max: 10,
          default: 0,
          description: 'Credit hours'
        },
        duration: {
          type: 'number',
          required: false,
          min: 0,
          description: 'Duration in hours'
        },
        instructors: {
          type: 'array',
          required: false,
          items: 'string',
          description: 'Array of instructor IDs'
        },
        settings: {
          type: 'object',
          required: false,
          properties: {
            allowSelfEnrollment: { type: 'boolean', default: false },
            passingScore: { type: 'number', min: 0, max: 100, default: 70 },
            maxAttempts: { type: 'number', min: 1, default: 3 },
            certificateEnabled: { type: 'boolean', default: false }
          }
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
            title: 'string',
            code: 'string',
            description: 'string',
            department: 'string',
            program: 'string | null',
            credits: 'number',
            duration: 'number',
            status: 'draft',
            instructors: 'string[]',
            settings: 'object',
            createdBy: 'string',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to create courses' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department does not exist' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program does not exist' },
        { status: 409, code: 'COURSE_CODE_EXISTS', message: 'Course code already exists in this department' }
      ]
    },

    example: {
      request: {
        title: 'Advanced JavaScript',
        code: 'JS201',
        description: 'Deep dive into modern JavaScript features and patterns',
        department: '507f1f77bcf86cd799439012',
        program: '507f1f77bcf86cd799439015',
        credits: 3,
        duration: 40,
        instructors: ['507f1f77bcf86cd799439030'],
        settings: {
          allowSelfEnrollment: true,
          passingScore: 75,
          maxAttempts: 3,
          certificateEnabled: true
        }
      },
      response: {
        success: true,
        message: 'Course created successfully',
        data: {
          id: '507f1f77bcf86cd799439021',
          title: 'Advanced JavaScript',
          code: 'JS201',
          description: 'Deep dive into modern JavaScript features and patterns',
          department: '507f1f77bcf86cd799439012',
          program: '507f1f77bcf86cd799439015',
          credits: 3,
          duration: 40,
          status: 'draft',
          instructors: ['507f1f77bcf86cd799439030'],
          settings: {
            allowSelfEnrollment: true,
            passingScore: 75,
            maxAttempts: 3,
            certificateEnabled: true
          },
          createdBy: '507f1f77bcf86cd799439011',
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Course code must be unique within the department
      - Department must exist and user must have access to it
      - Program is optional but must exist if provided
      - Initial status is always 'draft'
      - Auto-generates slug from title
      - Validates instructor IDs exist and have appropriate role
      - Staff can only create courses in departments they have access to
      - Global admins can create courses in any department
    `
  },

  /**
   * Get Course Details
   * GET /courses/:id
   */
  getById: {
    endpoint: '/api/v2/courses/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific course',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Course ID (ObjectId)'
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
            title: 'string',
            code: 'string',
            description: 'string',
            department: {
              id: 'string',
              name: 'string'
            },
            program: {
              id: 'string',
              name: 'string'
            },
            credits: 'number',
            duration: 'number',
            status: 'draft|published|archived',
            instructors: [
              {
                id: 'string',
                firstName: 'string',
                lastName: 'string',
                email: 'string',
                role: 'string'
              }
            ],
            settings: {
              allowSelfEnrollment: 'boolean',
              passingScore: 'number',
              maxAttempts: 'number',
              certificateEnabled: 'boolean'
            },
            modules: [
              {
                id: 'string',
                title: 'string',
                type: 'scorm|custom|exercise',
                order: 'number',
                isPublished: 'boolean'
              }
            ],
            enrollmentCount: 'number',
            completionRate: 'number',
            publishedAt: 'Date | null',
            archivedAt: 'Date | null',
            createdBy: {
              id: 'string',
              firstName: 'string',
              lastName: 'string'
            },
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this course' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439020',
          title: 'Introduction to Web Development',
          code: 'WEB101',
          description: 'Learn the fundamentals of HTML, CSS, and JavaScript',
          department: {
            id: '507f1f77bcf86cd799439012',
            name: 'Computer Science'
          },
          program: {
            id: '507f1f77bcf86cd799439015',
            name: 'Web Development Certificate'
          },
          credits: 3,
          duration: 40,
          status: 'published',
          instructors: [
            {
              id: '507f1f77bcf86cd799439030',
              firstName: 'Sarah',
              lastName: 'Johnson',
              email: 'sarah.johnson@example.com',
              role: 'instructor'
            }
          ],
          settings: {
            allowSelfEnrollment: true,
            passingScore: 70,
            maxAttempts: 3,
            certificateEnabled: true
          },
          modules: [
            {
              id: '507f1f77bcf86cd799439040',
              title: 'HTML Basics',
              type: 'scorm',
              order: 1,
              isPublished: true
            },
            {
              id: '507f1f77bcf86cd799439041',
              title: 'CSS Fundamentals',
              type: 'scorm',
              order: 2,
              isPublished: true
            }
          ],
          enrollmentCount: 45,
          completionRate: 0.73,
          publishedAt: '2026-01-01T00:00:00.000Z',
          archivedAt: null,
          createdBy: {
            id: '507f1f77bcf86cd799439011',
            firstName: 'Admin',
            lastName: 'User'
          },
          createdAt: '2025-12-15T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z'
        }
      }
    },

    permissions: ['read:courses'],

    notes: `
      - Returns full course details including populated references
      - Includes list of modules with basic information
      - Includes enrollment statistics and completion rate
      - Access controlled by department permissions
      - Learners can only view published courses they're enrolled in
      - Staff can view all courses in their departments
      - Global admins can view all courses
    `
  },

  /**
   * Update Course (Full)
   * PUT /courses/:id
   */
  update: {
    endpoint: '/api/v2/courses/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Replace entire course resource (full update)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Course ID (ObjectId)'
        }
      },
      body: {
        title: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 200
        },
        code: {
          type: 'string',
          required: true,
          pattern: '^[A-Z]{2,4}[0-9]{3}$'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000
        },
        department: {
          type: 'string',
          required: true
        },
        program: {
          type: 'string',
          required: false
        },
        credits: {
          type: 'number',
          required: false,
          min: 0,
          max: 10
        },
        duration: {
          type: 'number',
          required: false,
          min: 0
        },
        instructors: {
          type: 'array',
          required: false,
          items: 'string'
        },
        settings: {
          type: 'object',
          required: false,
          properties: {
            allowSelfEnrollment: 'boolean',
            passingScore: 'number',
            maxAttempts: 'number',
            certificateEnabled: 'boolean'
          }
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
            /* Same structure as getById */
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update this course' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 409, code: 'COURSE_CODE_EXISTS', message: 'Course code already exists in this department' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          title: 'Introduction to Web Development - Updated',
          code: 'WEB101',
          description: 'Updated description',
          department: '507f1f77bcf86cd799439012',
          program: '507f1f77bcf86cd799439015',
          credits: 4,
          duration: 45,
          instructors: ['507f1f77bcf86cd799439030'],
          settings: {
            allowSelfEnrollment: true,
            passingScore: 75,
            maxAttempts: 3,
            certificateEnabled: true
          }
        }
      },
      response: {
        success: true,
        message: 'Course updated successfully',
        data: {
          /* Updated course object */
        }
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Full replacement of course resource
      - Cannot update status directly (use publish/archive endpoints)
      - Course code must remain unique within department
      - Cannot move to department user doesn't have access to
      - Cannot update archived courses without unarchiving first
      - All required fields must be provided
    `
  },

  /**
   * Update Course (Partial)
   * PATCH /courses/:id
   */
  patch: {
    endpoint: '/api/v2/courses/:id',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Partially update course fields',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Course ID (ObjectId)'
        }
      },
      body: {
        title: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 200
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000
        },
        credits: {
          type: 'number',
          required: false,
          min: 0,
          max: 10
        },
        duration: {
          type: 'number',
          required: false,
          min: 0
        },
        instructors: {
          type: 'array',
          required: false,
          items: 'string'
        },
        settings: {
          type: 'object',
          required: false,
          properties: {
            allowSelfEnrollment: 'boolean',
            passingScore: 'number',
            maxAttempts: 'number',
            certificateEnabled: 'boolean'
          }
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
            /* Same structure as getById */
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update this course' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          title: 'Introduction to Web Development - Updated',
          credits: 4
        }
      },
      response: {
        success: true,
        message: 'Course updated successfully',
        data: {
          /* Updated course object */
        }
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Only provided fields are updated
      - Cannot update: code, department, program, status (use dedicated endpoints)
      - Settings are merged with existing settings (not replaced)
      - Cannot update archived courses without unarchiving first
    `
  },

  /**
   * Delete Course
   * DELETE /courses/:id
   */
  delete: {
    endpoint: '/api/v2/courses/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a course (soft delete)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Course ID (ObjectId)'
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
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete this course' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 409, code: 'COURSE_HAS_ENROLLMENTS', message: 'Cannot delete course with active enrollments' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' }
      },
      response: {
        success: true,
        message: 'Course deleted successfully'
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Soft delete: sets status to 'archived' instead of removing
      - Cannot delete courses with active enrollments
      - Must archive first if course is published
      - Preserves all historical data for reporting
      - Can be unarchived if needed
    `
  },

  /**
   * Publish Course
   * POST /courses/:id/publish
   */
  publish: {
    endpoint: '/api/v2/courses/:id/publish',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Publish a course to make it available to learners',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Course ID (ObjectId)'
        }
      },
      body: {
        publishedAt: {
          type: 'Date',
          required: false,
          description: 'Schedule publish time (defaults to now)'
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
            status: 'published',
            publishedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Course cannot be published: missing required content' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to publish courses' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 409, code: 'COURSE_ALREADY_PUBLISHED', message: 'Course is already published' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          publishedAt: '2026-01-15T00:00:00.000Z'
        }
      },
      response: {
        success: true,
        message: 'Course published successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          status: 'published',
          publishedAt: '2026-01-15T00:00:00.000Z'
        }
      }
    },

    permissions: ['publish:courses'],

    notes: `
      - Course must have at least one module to be published
      - Cannot publish archived courses
      - Validates all content is complete and properly configured
      - Sends notifications to enrolled learners (if any)
      - Sets publishedAt timestamp
      - If publishedAt is in future, course becomes available at that time
      - Requires higher permission level than regular write:courses
    `
  },

  /**
   * Unpublish Course
   * POST /courses/:id/unpublish
   */
  unpublish: {
    endpoint: '/api/v2/courses/:id/unpublish',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Unpublish a course to make it unavailable to new learners',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Course ID (ObjectId)'
        }
      },
      body: {
        reason: {
          type: 'string',
          required: false,
          description: 'Reason for unpublishing'
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
            status: 'draft',
            publishedAt: 'null'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to unpublish courses' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 409, code: 'COURSE_NOT_PUBLISHED', message: 'Course is not currently published' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          reason: 'Content updates required'
        }
      },
      response: {
        success: true,
        message: 'Course unpublished successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          status: 'draft',
          publishedAt: null
        }
      }
    },

    permissions: ['publish:courses'],

    notes: `
      - Changes status from 'published' to 'draft'
      - Existing enrollments remain active
      - New enrollments are blocked
      - Learners with active enrollments can still access content
      - Does not send notifications
      - Can be re-published after updates
    `
  },

  /**
   * Archive Course
   * POST /courses/:id/archive
   */
  archive: {
    endpoint: '/api/v2/courses/:id/archive',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Archive a course to remove it from active use',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Course ID (ObjectId)'
        }
      },
      body: {
        reason: {
          type: 'string',
          required: false,
          description: 'Reason for archiving'
        },
        archivedAt: {
          type: 'Date',
          required: false,
          description: 'Archive timestamp (defaults to now)'
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
            status: 'archived',
            archivedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to archive courses' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 409, code: 'COURSE_ALREADY_ARCHIVED', message: 'Course is already archived' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          reason: 'Course curriculum outdated',
          archivedAt: '2026-01-08T00:00:00.000Z'
        }
      },
      response: {
        success: true,
        message: 'Course archived successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          status: 'archived',
          archivedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['publish:courses'],

    notes: `
      - Removes course from active listings
      - Existing enrollments remain accessible for learners
      - No new enrollments allowed
      - Course can be unarchived if needed
      - Preserves all data for historical reporting
      - Automatically unpublishes if currently published
    `
  },

  /**
   * Unarchive Course
   * POST /courses/:id/unarchive
   */
  unarchive: {
    endpoint: '/api/v2/courses/:id/unarchive',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Unarchive a course to restore it to draft status',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Course ID (ObjectId)'
        }
      },
      body: {}
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            id: 'string',
            status: 'draft',
            archivedAt: 'null'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to unarchive courses' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 409, code: 'COURSE_NOT_ARCHIVED', message: 'Course is not currently archived' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' }
      },
      response: {
        success: true,
        message: 'Course unarchived successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          status: 'draft',
          archivedAt: null
        }
      }
    },

    permissions: ['publish:courses'],

    notes: `
      - Restores course to 'draft' status
      - Course appears in active listings again
      - Must be re-published to make available to learners
      - Useful for updating archived courses
    `
  },

  /**
   * Duplicate Course
   * POST /courses/:id/duplicate
   */
  duplicate: {
    endpoint: '/api/v2/courses/:id/duplicate',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a copy of a course with optional modifications',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Source course ID (ObjectId)'
        }
      },
      body: {
        newTitle: {
          type: 'string',
          required: false,
          description: 'Title for duplicated course (defaults to "Copy of [Original Title]")'
        },
        newCode: {
          type: 'string',
          required: true,
          pattern: '^[A-Z]{2,4}[0-9]{3}$',
          description: 'Unique course code for the duplicate'
        },
        includeModules: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Copy all modules and content'
        },
        includeSettings: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Copy course settings'
        },
        targetProgram: {
          type: 'string',
          required: false,
          description: 'Assign to different program (defaults to same program)'
        },
        targetDepartment: {
          type: 'string',
          required: false,
          description: 'Assign to different department (defaults to same department)'
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
            title: 'string',
            code: 'string',
            status: 'draft',
            moduleCount: 'number',
            sourceCourseId: 'string'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to duplicate courses' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Source course not found' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Target program does not exist' },
        { status: 409, code: 'COURSE_CODE_EXISTS', message: 'New course code already exists in target department' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          newTitle: 'Introduction to Web Development - Winter 2026',
          newCode: 'WEB102',
          includeModules: true,
          includeSettings: true,
          targetProgram: '507f1f77bcf86cd799439015'
        }
      },
      response: {
        success: true,
        message: 'Course duplicated successfully',
        data: {
          id: '507f1f77bcf86cd799439022',
          title: 'Introduction to Web Development - Winter 2026',
          code: 'WEB102',
          status: 'draft',
          moduleCount: 5,
          sourceCourseId: '507f1f77bcf86cd799439020'
        }
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Creates complete copy of course structure
      - New course always starts in 'draft' status
      - Modules are deep copied if includeModules=true
      - Instructors are NOT copied (must be assigned manually)
      - Enrollments are NOT copied
      - Statistics are NOT copied (start fresh)
      - New course code must be unique in target department
      - User must have write access to target department
      - Useful for creating course variations or term-based instances
    `
  },

  /**
   * Export Course
   * GET /courses/:id/export
   */
  export: {
    endpoint: '/api/v2/courses/:id/export',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Export course package in various formats',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Course ID (ObjectId)'
        }
      },
      query: {
        format: {
          type: 'string',
          required: false,
          enum: ['scorm1.2', 'scorm2004', 'xapi', 'pdf', 'json'],
          default: 'scorm2004',
          description: 'Export format'
        },
        includeModules: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include all module content'
        },
        includeAssessments: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include assessments and quizzes'
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
            downloadUrl: 'string',
            filename: 'string',
            format: 'string',
            size: 'number',
            expiresAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'INVALID_FORMAT', message: 'Unsupported export format' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to export this course' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 409, code: 'COURSE_NOT_PUBLISHED', message: 'Only published courses can be exported' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        query: {
          format: 'scorm2004',
          includeModules: true,
          includeAssessments: true
        }
      },
      response: {
        success: true,
        message: 'Course export generated successfully',
        data: {
          downloadUrl: 'https://storage.example.com/exports/WEB101-scorm2004-20260108.zip',
          filename: 'WEB101-scorm2004-20260108.zip',
          format: 'scorm2004',
          size: 45678912,
          expiresAt: '2026-01-15T00:00:00.000Z'
        }
      }
    },

    permissions: ['read:courses'],

    notes: `
      - Generates downloadable course package
      - SCORM formats include manifest and runtime files
      - xAPI format includes statements and activity definitions
      - PDF format generates printable course content
      - JSON format exports raw course data for backup/migration
      - Export URL expires after 7 days
      - Only published courses can be exported
      - Large courses may take several minutes to generate
      - Export process runs asynchronously for large courses
    `
  },

  /**
   * Move Course to Department
   * PATCH /courses/:id/department
   */
  moveDepartment: {
    endpoint: '/api/v2/courses/:id/department',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Move course to a different department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Course ID (ObjectId)'
        }
      },
      body: {
        department: {
          type: 'string',
          required: true,
          description: 'Target department ID (ObjectId)'
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
            department: {
              id: 'string',
              name: 'string'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid department ID' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to move courses between departments' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Target department does not exist' },
        { status: 409, code: 'COURSE_CODE_EXISTS', message: 'Course code conflicts with existing course in target department' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          department: '507f1f77bcf86cd799439013'
        }
      },
      response: {
        success: true,
        message: 'Course moved to new department successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          department: {
            id: '507f1f77bcf86cd799439013',
            name: 'Information Technology'
          }
        }
      }
    },

    permissions: ['write:courses', 'manage:departments'],

    notes: `
      - User must have write access to both source and target departments
      - Course code must be unique in target department
      - Program assignment may be cleared if program doesn't belong to target department
      - Existing enrollments remain intact
      - Instructor assignments are preserved
      - Global admins can move courses between any departments
    `
  },

  /**
   * Assign Course to Program
   * PATCH /courses/:id/program
   */
  assignProgram: {
    endpoint: '/api/v2/courses/:id/program',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Assign or change course program',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Course ID (ObjectId)'
        }
      },
      body: {
        program: {
          type: 'string',
          required: true,
          description: 'Program ID (ObjectId) or null to remove'
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
            program: {
              id: 'string',
              name: 'string'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid program ID' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to assign courses to programs' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program does not exist' },
        { status: 409, code: 'PROGRAM_DEPARTMENT_MISMATCH', message: 'Program must belong to same department as course' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          program: '507f1f77bcf86cd799439016'
        }
      },
      response: {
        success: true,
        message: 'Course assigned to program successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          program: {
            id: '507f1f77bcf86cd799439016',
            name: 'Full Stack Development Certificate'
          }
        }
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Program must belong to same department as course
      - Set program to null to remove program assignment
      - Course can be assigned to only one program
      - Does not affect existing enrollments
      - Program-level courses may have additional requirements
    `
  }
};

// Type exports for consumers
export type CoursesContractType = typeof CoursesContract;
export type ListCoursesRequest = typeof CoursesContract.list.example.request;
export type ListCoursesResponse = typeof CoursesContract.list.example.response;
export type CreateCourseRequest = typeof CoursesContract.create.example.request;
export type CreateCourseResponse = typeof CoursesContract.create.example.response;
export type GetCourseResponse = typeof CoursesContract.getById.example.response;
export type UpdateCourseRequest = typeof CoursesContract.update.example.request;
export type DuplicateCourseRequest = typeof CoursesContract.duplicate.example.request;
export type DuplicateCourseResponse = typeof CoursesContract.duplicate.example.response;
export type ExportCourseResponse = typeof CoursesContract.export.example.response;
