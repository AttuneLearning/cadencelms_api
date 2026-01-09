/**
 * Programs API Contracts
 * Version: 1.0.0
 *
 * These contracts define the program management endpoints for the LMS API.
 * Both backend and UI teams use these as the source of truth.
 *
 * Programs are the top-level academic structures that group courses and
 * provide credentials (certificates, diplomas, degrees).
 */

export const ProgramsContract = {
  /**
   * List Programs
   * GET /api/v2/programs
   */
  list: {
    endpoint: '/api/v2/programs',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all programs with filtering and pagination',

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
        department: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department ID'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'inactive', 'archived'],
          description: 'Filter by program status'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by program name or code'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-createdAt',
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
            programs: [
              {
                id: 'ObjectId',
                name: 'string',
                code: 'string',
                description: 'string',
                department: {
                  id: 'ObjectId',
                  name: 'string'
                },
                credential: 'certificate|diploma|degree',
                duration: 'number',
                durationUnit: 'hours|weeks|months|years',
                isPublished: 'boolean',
                status: 'active|inactive|archived',
                totalLevels: 'number',
                totalCourses: 'number',
                activeEnrollments: 'number',
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
          department: '507f1f77bcf86cd799439012',
          status: 'active',
          page: 1,
          limit: 10
        }
      },
      response: {
        success: true,
        data: {
          programs: [
            {
              id: '507f1f77bcf86cd799439013',
              name: 'Certified Business Technician',
              code: 'CBT-101',
              description: 'Comprehensive business technology certification program',
              department: {
                id: '507f1f77bcf86cd799439012',
                name: 'Business Technology'
              },
              credential: 'certificate',
              duration: 6,
              durationUnit: 'months',
              isPublished: true,
              status: 'active',
              totalLevels: 3,
              totalCourses: 12,
              activeEnrollments: 45,
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-12-15T10:30:00Z'
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

    permissions: ['read:programs'],

    notes: `
      - Returns programs based on user department access
      - Global admins see all programs
      - Department staff see only their department's programs
      - Search operates on program name and code fields
      - Status filter: active (accepting enrollments), inactive (paused), archived (historical)
      - Returned counts (totalLevels, totalCourses, activeEnrollments) are computed
    `
  },

  /**
   * Create Program
   * POST /api/v2/programs
   */
  create: {
    endpoint: '/api/v2/programs',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new program',

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
          description: 'Program name'
        },
        code: {
          type: 'string',
          required: true,
          pattern: '^[A-Z0-9-]+$',
          minLength: 2,
          maxLength: 20,
          description: 'Unique program code (e.g., CBT-101)'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Program description'
        },
        department: {
          type: 'ObjectId',
          required: true,
          description: 'Department ID that owns this program'
        },
        credential: {
          type: 'string',
          required: true,
          enum: ['certificate', 'diploma', 'degree'],
          description: 'Type of credential awarded upon completion'
        },
        duration: {
          type: 'number',
          required: true,
          min: 1,
          description: 'Expected program duration'
        },
        durationUnit: {
          type: 'string',
          required: true,
          enum: ['hours', 'weeks', 'months', 'years'],
          description: 'Duration unit'
        },
        isPublished: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Whether program is published to learners'
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
            id: 'ObjectId',
            name: 'string',
            code: 'string',
            description: 'string',
            department: 'ObjectId',
            credential: 'certificate|diploma|degree',
            duration: 'number',
            durationUnit: 'hours|weeks|months|years',
            isPublished: 'boolean',
            status: 'active',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 409, code: 'CODE_EXISTS', message: 'Program code already exists in this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department does not exist' }
      ]
    },

    example: {
      request: {
        name: 'Certified Business Technician',
        code: 'CBT-101',
        description: 'Comprehensive business technology certification program',
        department: '507f1f77bcf86cd799439012',
        credential: 'certificate',
        duration: 6,
        durationUnit: 'months',
        isPublished: false
      },
      response: {
        success: true,
        message: 'Program created successfully',
        data: {
          id: '507f1f77bcf86cd799439013',
          name: 'Certified Business Technician',
          code: 'CBT-101',
          description: 'Comprehensive business technology certification program',
          department: '507f1f77bcf86cd799439012',
          credential: 'certificate',
          duration: 6,
          durationUnit: 'months',
          isPublished: false,
          status: 'active',
          createdAt: '2026-01-08T00:00:00Z',
          updatedAt: '2026-01-08T00:00:00Z'
        }
      }
    },

    permissions: ['write:programs'],

    notes: `
      - Code must be unique within the department (different departments can have same code)
      - Department must exist and user must have access to it
      - Initial status is always 'active'
      - Auto-generates slug from name
      - isPublished=false means program exists but not visible to learners for enrollment
      - User must have write:programs permission in the specified department
    `
  },

  /**
   * Get Program Details
   * GET /api/v2/programs/:id
   */
  getById: {
    endpoint: '/api/v2/programs/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific program',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Program ID'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'ObjectId',
            name: 'string',
            code: 'string',
            description: 'string',
            department: {
              id: 'ObjectId',
              name: 'string',
              code: 'string'
            },
            credential: 'certificate|diploma|degree',
            duration: 'number',
            durationUnit: 'hours|weeks|months|years',
            isPublished: 'boolean',
            status: 'active|inactive|archived',
            levels: [
              {
                id: 'ObjectId',
                name: 'string',
                levelNumber: 'number',
                courseCount: 'number'
              }
            ],
            statistics: {
              totalLevels: 'number',
              totalCourses: 'number',
              totalEnrollments: 'number',
              activeEnrollments: 'number',
              completedEnrollments: 'number',
              completionRate: 'number'
            },
            createdAt: 'Date',
            updatedAt: 'Date',
            createdBy: {
              id: 'ObjectId',
              firstName: 'string',
              lastName: 'string'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439013',
          name: 'Certified Business Technician',
          code: 'CBT-101',
          description: 'Comprehensive business technology certification program covering fundamentals through advanced topics',
          department: {
            id: '507f1f77bcf86cd799439012',
            name: 'Business Technology',
            code: 'BT'
          },
          credential: 'certificate',
          duration: 6,
          durationUnit: 'months',
          isPublished: true,
          status: 'active',
          levels: [
            {
              id: '507f1f77bcf86cd799439014',
              name: 'Level 1 - Foundations',
              levelNumber: 1,
              courseCount: 4
            },
            {
              id: '507f1f77bcf86cd799439015',
              name: 'Level 2 - Intermediate',
              levelNumber: 2,
              courseCount: 4
            },
            {
              id: '507f1f77bcf86cd799439016',
              name: 'Level 3 - Advanced',
              levelNumber: 3,
              courseCount: 4
            }
          ],
          statistics: {
            totalLevels: 3,
            totalCourses: 12,
            totalEnrollments: 120,
            activeEnrollments: 45,
            completedEnrollments: 68,
            completionRate: 0.567
          },
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-12-15T10:30:00Z',
          createdBy: {
            id: '507f1f77bcf86cd799439010',
            firstName: 'Jane',
            lastName: 'Smith'
          }
        }
      }
    },

    permissions: ['read:programs'],

    notes: `
      - Returns full program details including levels and statistics
      - Statistics are computed in real-time
      - completionRate = completedEnrollments / totalEnrollments
      - User must have access to the program's department
      - Levels are returned in order by levelNumber
    `
  },

  /**
   * Update Program
   * PUT /api/v2/programs/:id
   */
  update: {
    endpoint: '/api/v2/programs/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update program information',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Program ID'
        }
      },
      body: {
        name: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 200,
          description: 'Program name'
        },
        code: {
          type: 'string',
          required: false,
          pattern: '^[A-Z0-9-]+$',
          minLength: 2,
          maxLength: 20,
          description: 'Program code'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Program description'
        },
        credential: {
          type: 'string',
          required: false,
          enum: ['certificate', 'diploma', 'degree'],
          description: 'Type of credential'
        },
        duration: {
          type: 'number',
          required: false,
          min: 1,
          description: 'Expected program duration'
        },
        durationUnit: {
          type: 'string',
          required: false,
          enum: ['hours', 'weeks', 'months', 'years'],
          description: 'Duration unit'
        },
        isPublished: {
          type: 'boolean',
          required: false,
          description: 'Whether program is published'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'inactive', 'archived'],
          description: 'Program status'
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
            id: 'ObjectId',
            name: 'string',
            code: 'string',
            description: 'string',
            department: 'ObjectId',
            credential: 'certificate|diploma|degree',
            duration: 'number',
            durationUnit: 'hours|weeks|months|years',
            isPublished: 'boolean',
            status: 'active|inactive|archived',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' },
        { status: 409, code: 'CODE_EXISTS', message: 'Program code already exists in this department' }
      ]
    },

    example: {
      request: {
        name: 'Certified Business Technology Professional',
        description: 'Updated comprehensive business technology certification program',
        duration: 8,
        isPublished: true
      },
      response: {
        success: true,
        message: 'Program updated successfully',
        data: {
          id: '507f1f77bcf86cd799439013',
          name: 'Certified Business Technology Professional',
          code: 'CBT-101',
          description: 'Updated comprehensive business technology certification program',
          department: '507f1f77bcf86cd799439012',
          credential: 'certificate',
          duration: 8,
          durationUnit: 'months',
          isPublished: true,
          status: 'active',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2026-01-08T10:30:00Z'
        }
      }
    },

    permissions: ['write:programs'],

    notes: `
      - All fields are optional (partial update)
      - Code uniqueness is validated within department
      - Cannot change department via this endpoint (use PATCH /programs/:id/department)
      - Setting status='archived' prevents new enrollments
      - Setting isPublished=false hides program from learners but doesn't affect existing enrollments
      - User must have write:programs permission in the program's department
    `
  },

  /**
   * Delete Program
   * DELETE /api/v2/programs/:id
   */
  delete: {
    endpoint: '/api/v2/programs/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a program (soft delete)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Program ID'
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' },
        { status: 409, code: 'HAS_ACTIVE_ENROLLMENTS', message: 'Cannot delete program with active enrollments' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        message: 'Program deleted successfully'
      }
    },

    permissions: ['delete:programs'],

    notes: `
      - Soft delete: Sets status to 'archived' and isDeleted flag
      - Cannot delete programs with active enrollments
      - Must archive or complete all enrollments first
      - Associated levels and courses are not deleted
      - Can be restored by admin if needed
      - User must have delete:programs permission in the program's department
    `
  },

  /**
   * Get Program Levels
   * GET /api/v2/programs/:id/levels
   */
  getLevels: {
    endpoint: '/api/v2/programs/:id/levels',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all levels for a specific program',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Program ID'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            programId: 'ObjectId',
            programName: 'string',
            levels: [
              {
                id: 'ObjectId',
                name: 'string',
                levelNumber: 'number',
                description: 'string',
                courses: [
                  {
                    id: 'ObjectId',
                    title: 'string',
                    code: 'string',
                    isPublished: 'boolean'
                  }
                ],
                courseCount: 'number',
                createdAt: 'Date',
                updatedAt: 'Date'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          programId: '507f1f77bcf86cd799439013',
          programName: 'Certified Business Technician',
          levels: [
            {
              id: '507f1f77bcf86cd799439014',
              name: 'Level 1 - Foundations',
              levelNumber: 1,
              description: 'Foundation courses covering basic business technology concepts',
              courses: [
                {
                  id: '507f1f77bcf86cd799439020',
                  title: 'Introduction to Business Systems',
                  code: 'CBT-C1',
                  isPublished: true
                },
                {
                  id: '507f1f77bcf86cd799439021',
                  title: 'Computer Fundamentals',
                  code: 'CBT-C2',
                  isPublished: true
                }
              ],
              courseCount: 2,
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-06-15T10:30:00Z'
            }
          ]
        }
      }
    },

    permissions: ['read:programs'],

    notes: `
      - Returns levels in order by levelNumber
      - Each level includes associated courses
      - Courses are returned in creation order
      - Empty programs return empty levels array
      - User must have access to the program's department
    `
  },

  /**
   * Create Program Level
   * POST /api/v2/programs/:id/levels
   */
  createLevel: {
    endpoint: '/api/v2/programs/:id/levels',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new level in a program',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Program ID'
        }
      },
      body: {
        name: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 200,
          description: 'Level name (e.g., "Level 1 - Foundations")'
        },
        levelNumber: {
          type: 'number',
          required: true,
          min: 1,
          description: 'Sequential level number (1, 2, 3...)'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Level description'
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
            id: 'ObjectId',
            name: 'string',
            levelNumber: 'number',
            description: 'string',
            program: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' },
        { status: 409, code: 'LEVEL_NUMBER_EXISTS', message: 'Level number already exists in this program' }
      ]
    },

    example: {
      request: {
        name: 'Level 1 - Foundations',
        levelNumber: 1,
        description: 'Foundation courses covering basic business technology concepts'
      },
      response: {
        success: true,
        message: 'Program level created successfully',
        data: {
          id: '507f1f77bcf86cd799439014',
          name: 'Level 1 - Foundations',
          levelNumber: 1,
          description: 'Foundation courses covering basic business technology concepts',
          program: '507f1f77bcf86cd799439013',
          createdAt: '2026-01-08T00:00:00Z',
          updatedAt: '2026-01-08T00:00:00Z'
        }
      }
    },

    permissions: ['write:programs'],

    notes: `
      - levelNumber must be unique within the program
      - Level numbers should be sequential but don't have to be contiguous (can have 1, 2, 5)
      - Courses can be assigned to levels after creation
      - User must have write:programs permission in the program's department
    `
  },

  /**
   * Get Program Courses
   * GET /api/v2/programs/:id/courses
   */
  getCourses: {
    endpoint: '/api/v2/programs/:id/courses',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all courses in a specific program',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Program ID'
        }
      },
      query: {
        level: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by program level ID'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['published', 'draft', 'archived'],
          description: 'Filter by course status'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            programId: 'ObjectId',
            programName: 'string',
            courses: [
              {
                id: 'ObjectId',
                title: 'string',
                code: 'string',
                description: 'string',
                level: {
                  id: 'ObjectId',
                  name: 'string',
                  levelNumber: 'number'
                },
                isPublished: 'boolean',
                status: 'published|draft|archived',
                moduleCount: 'number',
                enrollmentCount: 'number',
                createdAt: 'Date',
                updatedAt: 'Date'
              }
            ],
            totalCourses: 'number'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' }
      ]
    },

    example: {
      request: {
        query: {
          level: '507f1f77bcf86cd799439014'
        }
      },
      response: {
        success: true,
        data: {
          programId: '507f1f77bcf86cd799439013',
          programName: 'Certified Business Technician',
          courses: [
            {
              id: '507f1f77bcf86cd799439020',
              title: 'Introduction to Business Systems',
              code: 'CBT-C1',
              description: 'Overview of modern business information systems',
              level: {
                id: '507f1f77bcf86cd799439014',
                name: 'Level 1 - Foundations',
                levelNumber: 1
              },
              isPublished: true,
              status: 'published',
              moduleCount: 8,
              enrollmentCount: 45,
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-12-10T14:20:00Z'
            }
          ],
          totalCourses: 1
        }
      }
    },

    permissions: ['read:programs', 'read:courses'],

    notes: `
      - Returns all courses associated with the program
      - Can filter by specific level or course status
      - Courses are grouped by level and ordered by creation date
      - Learners only see published courses
      - Staff see all courses regardless of status
      - User must have access to the program's department
    `
  },

  /**
   * Get Program Enrollments
   * GET /api/v2/programs/:id/enrollments
   */
  getEnrollments: {
    endpoint: '/api/v2/programs/:id/enrollments',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all enrollments for a specific program',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Program ID'
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
          default: 20,
          min: 1,
          max: 100
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'completed', 'withdrawn'],
          description: 'Filter by enrollment status'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by learner name or email'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            programId: 'ObjectId',
            programName: 'string',
            enrollments: [
              {
                id: 'ObjectId',
                learner: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string',
                  email: 'string',
                  studentId: 'string'
                },
                credentialGoal: 'certificate|diploma|degree',
                status: 'active|completed|withdrawn',
                progress: 'number',
                enrolledAt: 'Date',
                completedAt: 'Date | null',
                withdrawnAt: 'Date | null',
                coursesCompleted: 'number',
                coursesTotal: 'number'
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' }
      ]
    },

    example: {
      request: {
        query: {
          status: 'active',
          page: 1,
          limit: 20
        }
      },
      response: {
        success: true,
        data: {
          programId: '507f1f77bcf86cd799439013',
          programName: 'Certified Business Technician',
          enrollments: [
            {
              id: '507f1f77bcf86cd799439030',
              learner: {
                id: '507f1f77bcf86cd799439031',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                studentId: 'STU-2025-001'
              },
              credentialGoal: 'certificate',
              status: 'active',
              progress: 0.65,
              enrolledAt: '2025-09-01T00:00:00Z',
              completedAt: null,
              withdrawnAt: null,
              coursesCompleted: 8,
              coursesTotal: 12
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 45,
            totalPages: 3,
            hasNext: true,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:enrollments'],

    notes: `
      - Only accessible by staff with appropriate department permissions
      - Learners cannot view other learners' enrollments
      - Progress is calculated as coursesCompleted / coursesTotal
      - Search operates on learner name and email
      - Status filter: active (in progress), completed (finished), withdrawn (dropped out)
      - User must have read:enrollments permission in the program's department
    `
  },

  /**
   * Move Program to Different Department
   * PATCH /api/v2/programs/:id/department
   */
  moveDepartment: {
    endpoint: '/api/v2/programs/:id/department',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Move a program to a different department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Program ID'
        }
      },
      body: {
        department: {
          type: 'ObjectId',
          required: true,
          description: 'New department ID'
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
            id: 'ObjectId',
            name: 'string',
            code: 'string',
            department: {
              id: 'ObjectId',
              name: 'string'
            },
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid department ID' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Target department not found' },
        { status: 409, code: 'CODE_CONFLICT', message: 'Program code already exists in target department' }
      ]
    },

    example: {
      request: {
        department: '507f1f77bcf86cd799439099'
      },
      response: {
        success: true,
        message: 'Program moved to new department successfully',
        data: {
          id: '507f1f77bcf86cd799439013',
          name: 'Certified Business Technician',
          code: 'CBT-101',
          department: {
            id: '507f1f77bcf86cd799439099',
            name: 'Information Technology'
          },
          updatedAt: '2026-01-08T10:30:00Z'
        }
      }
    },

    permissions: ['admin:programs'],

    notes: `
      - Requires admin-level permissions
      - Validates program code uniqueness in target department
      - All associated courses remain assigned to the program
      - Existing enrollments are not affected
      - User must have admin:programs permission in BOTH source and target departments
      - This is a sensitive operation typically reserved for global admins
    `
  }
};

// Type exports for consumers
export type ProgramsContractType = typeof ProgramsContract;

// Request/Response type helpers
export type ListProgramsRequest = {
  query: typeof ProgramsContract.list.request.query;
};
export type ListProgramsResponse = typeof ProgramsContract.list.example.response;

export type CreateProgramRequest = typeof ProgramsContract.create.example.request;
export type CreateProgramResponse = typeof ProgramsContract.create.example.response;

export type GetProgramResponse = typeof ProgramsContract.getById.example.response;

export type UpdateProgramRequest = typeof ProgramsContract.update.example.request;
export type UpdateProgramResponse = typeof ProgramsContract.update.example.response;

export type GetProgramLevelsResponse = typeof ProgramsContract.getLevels.example.response;

export type CreateProgramLevelRequest = typeof ProgramsContract.createLevel.example.request;
export type CreateProgramLevelResponse = typeof ProgramsContract.createLevel.example.response;

export type GetProgramCoursesResponse = typeof ProgramsContract.getCourses.example.response;

export type GetProgramEnrollmentsResponse = typeof ProgramsContract.getEnrollments.example.response;

export type MoveProgramDepartmentRequest = typeof ProgramsContract.moveDepartment.example.request;
export type MoveProgramDepartmentResponse = typeof ProgramsContract.moveDepartment.example.response;
