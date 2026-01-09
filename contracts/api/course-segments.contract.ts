/**
 * Course Segments (Modules) API Contracts
 * Version: 1.0.0
 *
 * These contracts define the course module/segment management endpoints.
 * Course modules are the building blocks of courses and can be various types
 * of content (SCORM, custom exercises, video, documents).
 *
 * Nested under /courses/:courseId/modules
 */

export const CourseSegmentsContracts = {
  /**
   * List Course Modules
   * GET /courses/:courseId/modules
   */
  list: {
    endpoint: '/api/v2/courses/:courseId/modules',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all modules in a course',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        courseId: { type: 'ObjectId', required: true, description: 'Course ID' }
      },
      query: {
        includeUnpublished: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include unpublished modules (staff only)'
        },
        sort: {
          type: 'string',
          required: false,
          default: 'order',
          description: 'Sort field (order, title, createdAt)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            courseId: 'ObjectId',
            courseTitle: 'string',
            modules: [
              {
                id: 'ObjectId',
                title: 'string',
                description: 'string | null',
                order: 'number',
                type: 'scorm | custom | exercise | video | document',
                contentId: 'ObjectId | null',
                settings: {
                  allowMultipleAttempts: 'boolean',
                  maxAttempts: 'number | null',
                  timeLimit: 'number | null',
                  showFeedback: 'boolean',
                  shuffleQuestions: 'boolean'
                },
                isPublished: 'boolean',
                passingScore: 'number | null',
                duration: 'number | null',
                createdAt: 'Date',
                updatedAt: 'Date'
              }
            ],
            totalModules: 'number'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to view this course' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    example: {
      request: {
        params: { courseId: '507f1f77bcf86cd799439011' },
        query: { includeUnpublished: false }
      },
      response: {
        success: true,
        data: {
          courseId: '507f1f77bcf86cd799439011',
          courseTitle: 'Introduction to Computer Science',
          modules: [
            {
              id: '507f1f77bcf86cd799439012',
              title: 'Module 1: Programming Basics',
              description: 'Learn fundamental programming concepts',
              order: 1,
              type: 'scorm',
              contentId: '507f1f77bcf86cd799439013',
              settings: {
                allowMultipleAttempts: true,
                maxAttempts: 3,
                timeLimit: null,
                showFeedback: true,
                shuffleQuestions: false
              },
              isPublished: true,
              passingScore: 70,
              duration: 3600,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-05T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439014',
              title: 'Module 2: Data Structures',
              description: 'Introduction to arrays, lists, and trees',
              order: 2,
              type: 'custom',
              contentId: '507f1f77bcf86cd799439015',
              settings: {
                allowMultipleAttempts: true,
                maxAttempts: null,
                timeLimit: 7200,
                showFeedback: true,
                shuffleQuestions: true
              },
              isPublished: true,
              passingScore: 75,
              duration: 5400,
              createdAt: '2026-01-02T00:00:00.000Z',
              updatedAt: '2026-01-06T00:00:00.000Z'
            }
          ],
          totalModules: 2
        }
      }
    },

    permissions: ['read:courses'],

    notes: `
      - Returns modules in order (ascending by default)
      - Learners only see published modules (isPublished: true)
      - Staff can see all modules if includeUnpublished=true
      - Module types must match available content types
      - Settings object contains module-specific configuration
      - Duration is in seconds, can be null for self-paced content
    `
  },

  /**
   * Create Course Module
   * POST /courses/:courseId/modules
   */
  create: {
    endpoint: '/api/v2/courses/:courseId/modules',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new module in a course',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        courseId: { type: 'ObjectId', required: true, description: 'Course ID' }
      },
      body: {
        title: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 200,
          description: 'Module title'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Module description'
        },
        order: {
          type: 'number',
          required: true,
          min: 1,
          description: 'Module order in sequence (must be sequential within course)'
        },
        type: {
          type: 'string',
          required: true,
          enum: ['scorm', 'custom', 'exercise', 'video', 'document'],
          description: 'Module content type'
        },
        contentId: {
          type: 'ObjectId',
          required: false,
          description: 'Reference to content in content library'
        },
        settings: {
          type: 'object',
          required: false,
          properties: {
            allowMultipleAttempts: { type: 'boolean', default: true },
            maxAttempts: { type: 'number', required: false, description: 'Maximum attempts allowed (null for unlimited)' },
            timeLimit: { type: 'number', required: false, description: 'Time limit in seconds (null for no limit)' },
            showFeedback: { type: 'boolean', default: true },
            shuffleQuestions: { type: 'boolean', default: false }
          }
        },
        isPublished: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Whether module is visible to learners'
        },
        passingScore: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Minimum score to pass (percentage)'
        },
        duration: {
          type: 'number',
          required: false,
          min: 0,
          description: 'Expected duration in seconds'
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
            courseId: 'ObjectId',
            title: 'string',
            description: 'string | null',
            order: 'number',
            type: 'string',
            contentId: 'ObjectId | null',
            settings: 'object',
            isPublished: 'boolean',
            passingScore: 'number | null',
            duration: 'number | null',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'DUPLICATE_TITLE', message: 'Module title must be unique within course' },
        { status: 400, code: 'INVALID_ORDER', message: 'Module order must be sequential' },
        { status: 400, code: 'CONTENT_NOT_FOUND', message: 'Referenced content does not exist' },
        { status: 400, code: 'TYPE_MISMATCH', message: 'Module type does not match content type' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to create modules' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    example: {
      request: {
        params: { courseId: '507f1f77bcf86cd799439011' },
        body: {
          title: 'Module 3: Advanced Algorithms',
          description: 'Deep dive into sorting and searching algorithms',
          order: 3,
          type: 'exercise',
          contentId: '507f1f77bcf86cd799439020',
          settings: {
            allowMultipleAttempts: true,
            maxAttempts: 2,
            timeLimit: 5400,
            showFeedback: true,
            shuffleQuestions: true
          },
          isPublished: false,
          passingScore: 80,
          duration: 7200
        }
      },
      response: {
        success: true,
        message: 'Module created successfully',
        data: {
          id: '507f1f77bcf86cd799439021',
          courseId: '507f1f77bcf86cd799439011',
          title: 'Module 3: Advanced Algorithms',
          description: 'Deep dive into sorting and searching algorithms',
          order: 3,
          type: 'exercise',
          contentId: '507f1f77bcf86cd799439020',
          settings: {
            allowMultipleAttempts: true,
            maxAttempts: 2,
            timeLimit: 5400,
            showFeedback: true,
            shuffleQuestions: false
          },
          isPublished: false,
          passingScore: 80,
          duration: 7200,
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Module title must be unique within the course
      - Order must be sequential (no gaps: 1, 2, 3...)
      - If order conflicts with existing module, existing modules are shifted
      - Content type must match contentId if provided
      - Validation checks:
        - Title: 1-200 characters, unique within course
        - Order: positive integer, sequential within course
        - Type: must be one of allowed types
        - ContentId: must exist in content library if provided
        - PassingScore: 0-100 if provided
        - Duration: positive number in seconds if provided
      - Default settings applied if not provided
      - New modules are unpublished by default
    `
  },

  /**
   * Get Module Details
   * GET /courses/:courseId/modules/:moduleId
   */
  getOne: {
    endpoint: '/api/v2/courses/:courseId/modules/:moduleId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        courseId: { type: 'ObjectId', required: true, description: 'Course ID' },
        moduleId: { type: 'ObjectId', required: true, description: 'Module ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'ObjectId',
            courseId: 'ObjectId',
            courseTitle: 'string',
            title: 'string',
            description: 'string | null',
            order: 'number',
            type: 'scorm | custom | exercise | video | document',
            contentId: 'ObjectId | null',
            content: 'object | null' as any,
            settings: {
              allowMultipleAttempts: 'boolean',
              maxAttempts: 'number | null',
              timeLimit: 'number | null',
              showFeedback: 'boolean',
              shuffleQuestions: 'boolean'
            },
            isPublished: 'boolean',
            passingScore: 'number | null',
            duration: 'number | null',
            prerequisites: 'ObjectId[]',
            completionCount: 'number',
            averageScore: 'number | null',
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
        { status: 403, code: 'FORBIDDEN', message: 'No permission to view this module' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found in this course' }
      ]
    },

    example: {
      request: {
        params: {
          courseId: '507f1f77bcf86cd799439011',
          moduleId: '507f1f77bcf86cd799439012'
        }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439012',
          courseId: '507f1f77bcf86cd799439011',
          courseTitle: 'Introduction to Computer Science',
          title: 'Module 1: Programming Basics',
          description: 'Learn fundamental programming concepts',
          order: 1,
          type: 'scorm',
          contentId: '507f1f77bcf86cd799439013',
          content: {
            id: '507f1f77bcf86cd799439013',
            title: 'Programming Basics SCORM Package',
            type: 'scorm',
            metadata: {
              version: '1.2',
              duration: 3600
            }
          },
          settings: {
            allowMultipleAttempts: true,
            maxAttempts: 3,
            timeLimit: null,
            showFeedback: true,
            shuffleQuestions: false
          },
          isPublished: true,
          passingScore: 70,
          duration: 3600,
          prerequisites: [],
          completionCount: 45,
          averageScore: 82.5,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z',
          createdBy: {
            id: '507f1f77bcf86cd799439030',
            firstName: 'Jane',
            lastName: 'Smith'
          }
        }
      }
    },

    permissions: ['read:courses'],

    notes: `
      - Returns detailed module information including content reference
      - Includes statistics (completionCount, averageScore) for staff
      - Learners can only view published modules
      - Content object populated if contentId exists
      - Prerequisites array shows required modules that must be completed first
    `
  },

  /**
   * Update Module
   * PUT /courses/:courseId/modules/:moduleId
   */
  update: {
    endpoint: '/api/v2/courses/:courseId/modules/:moduleId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update an existing module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        courseId: { type: 'ObjectId', required: true, description: 'Course ID' },
        moduleId: { type: 'ObjectId', required: true, description: 'Module ID' }
      },
      body: {
        title: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 200,
          description: 'Module title'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Module description'
        },
        type: {
          type: 'string',
          required: false,
          enum: ['scorm', 'custom', 'exercise', 'video', 'document'],
          description: 'Module content type'
        },
        contentId: {
          type: 'ObjectId',
          required: false,
          description: 'Reference to content in content library'
        },
        settings: {
          type: 'object',
          required: false,
          properties: {
            allowMultipleAttempts: { type: 'boolean', required: false },
            maxAttempts: { type: 'number', required: false },
            timeLimit: { type: 'number', required: false },
            showFeedback: { type: 'boolean', required: false },
            shuffleQuestions: { type: 'boolean', required: false }
          }
        },
        isPublished: {
          type: 'boolean',
          required: false,
          description: 'Whether module is visible to learners'
        },
        passingScore: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Minimum score to pass (percentage)'
        },
        duration: {
          type: 'number',
          required: false,
          min: 0,
          description: 'Expected duration in seconds'
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
            courseId: 'ObjectId',
            title: 'string',
            description: 'string | null',
            order: 'number',
            type: 'string',
            contentId: 'ObjectId | null',
            settings: 'object',
            isPublished: 'boolean',
            passingScore: 'number | null',
            duration: 'number | null',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'DUPLICATE_TITLE', message: 'Module title must be unique within course' },
        { status: 400, code: 'CONTENT_NOT_FOUND', message: 'Referenced content does not exist' },
        { status: 400, code: 'TYPE_MISMATCH', message: 'Module type does not match content type' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to update modules' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found in this course' }
      ]
    },

    example: {
      request: {
        params: {
          courseId: '507f1f77bcf86cd799439011',
          moduleId: '507f1f77bcf86cd799439012'
        },
        body: {
          title: 'Module 1: Programming Fundamentals (Updated)',
          description: 'Comprehensive introduction to programming concepts',
          isPublished: true,
          passingScore: 75,
          settings: {
            allowMultipleAttempts: true,
            maxAttempts: 5,
            timeLimit: null,
            showFeedback: true,
            shuffleQuestions: false
          }
        }
      },
      response: {
        success: true,
        message: 'Module updated successfully',
        data: {
          id: '507f1f77bcf86cd799439012',
          courseId: '507f1f77bcf86cd799439011',
          title: 'Module 1: Programming Fundamentals (Updated)',
          description: 'Comprehensive introduction to programming concepts',
          order: 1,
          type: 'scorm',
          contentId: '507f1f77bcf86cd799439013',
          settings: {
            allowMultipleAttempts: true,
            maxAttempts: 5,
            timeLimit: null,
            showFeedback: true,
            shuffleQuestions: false
          },
          isPublished: true,
          passingScore: 75,
          duration: 3600,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-08T12:30:00.000Z'
        }
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Only provided fields are updated (partial update)
      - Order cannot be changed via PUT (use PATCH /reorder endpoint)
      - Module title must remain unique within course
      - Content type must match contentId if both are provided
      - Validation:
        - Title: 1-200 characters if provided
        - PassingScore: 0-100 if provided
        - Duration: positive number if provided
        - ContentId: must exist if provided
      - Cannot change module type if learners have started attempts
      - Settings are merged with existing settings
    `
  },

  /**
   * Delete Module
   * DELETE /courses/:courseId/modules/:moduleId
   */
  delete: {
    endpoint: '/api/v2/courses/:courseId/modules/:moduleId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a module from a course',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        courseId: { type: 'ObjectId', required: true, description: 'Course ID' },
        moduleId: { type: 'ObjectId', required: true, description: 'Module ID' }
      },
      query: {
        force: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Force delete even with existing attempts'
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
            title: 'string',
            deletedAt: 'Date',
            affectedModules: 'number',
            reorderedModules: [
              {
                id: 'ObjectId',
                title: 'string',
                oldOrder: 'number',
                newOrder: 'number'
              }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'HAS_ATTEMPTS', message: 'Cannot delete module with existing attempts (use force=true)' },
        { status: 400, code: 'IS_PREREQUISITE', message: 'Cannot delete module that is prerequisite for other modules' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to delete modules' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found in this course' }
      ]
    },

    example: {
      request: {
        params: {
          courseId: '507f1f77bcf86cd799439011',
          moduleId: '507f1f77bcf86cd799439014'
        },
        query: { force: false }
      },
      response: {
        success: true,
        message: 'Module deleted successfully and subsequent modules reordered',
        data: {
          id: '507f1f77bcf86cd799439014',
          title: 'Module 2: Data Structures',
          deletedAt: '2026-01-08T12:45:00.000Z',
          affectedModules: 2,
          reorderedModules: [
            {
              id: '507f1f77bcf86cd799439021',
              title: 'Module 3: Advanced Algorithms',
              oldOrder: 3,
              newOrder: 2
            },
            {
              id: '507f1f77bcf86cd799439022',
              title: 'Module 4: Final Assessment',
              oldOrder: 4,
              newOrder: 3
            }
          ]
        }
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Soft delete by default (marked as deleted but data preserved)
      - Subsequent modules are automatically reordered to maintain sequence
      - Cannot delete if:
        - Module has existing learner attempts (unless force=true)
        - Module is prerequisite for other modules
        - Course is published and has active enrollments (unless force=true)
      - Force delete:
        - Archives existing attempts instead of deleting
        - Removes prerequisite relationships
        - Should be used with caution
      - Returns list of reordered modules after deletion
    `
  },

  /**
   * Reorder Modules
   * PATCH /courses/:courseId/modules/reorder
   */
  reorder: {
    endpoint: '/api/v2/courses/:courseId/modules/reorder',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Reorder modules within a course',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        courseId: { type: 'ObjectId', required: true, description: 'Course ID' }
      },
      body: {
        moduleIds: {
          type: 'array',
          required: true,
          description: 'Array of module IDs in desired order',
          items: {
            type: 'ObjectId'
          },
          minLength: 1
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
            courseId: 'ObjectId',
            modules: [
              {
                id: 'ObjectId',
                title: 'string',
                oldOrder: 'number',
                newOrder: 'number'
              }
            ],
            totalReordered: 'number'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'MISSING_MODULES', message: 'Not all course modules included in reorder' },
        { status: 400, code: 'INVALID_MODULE', message: 'One or more modules do not belong to this course' },
        { status: 400, code: 'DUPLICATE_MODULE', message: 'Duplicate module IDs in request' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to reorder modules' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    example: {
      request: {
        params: { courseId: '507f1f77bcf86cd799439011' },
        body: {
          moduleIds: [
            '507f1f77bcf86cd799439014',
            '507f1f77bcf86cd799439012',
            '507f1f77bcf86cd799439021'
          ]
        }
      },
      response: {
        success: true,
        message: 'Modules reordered successfully',
        data: {
          courseId: '507f1f77bcf86cd799439011',
          modules: [
            {
              id: '507f1f77bcf86cd799439014',
              title: 'Module 2: Data Structures',
              oldOrder: 2,
              newOrder: 1
            },
            {
              id: '507f1f77bcf86cd799439012',
              title: 'Module 1: Programming Basics',
              oldOrder: 1,
              newOrder: 2
            },
            {
              id: '507f1f77bcf86cd799439021',
              title: 'Module 3: Advanced Algorithms',
              oldOrder: 3,
              newOrder: 3
            }
          ],
          totalReordered: 2
        }
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Must include ALL modules in the course (no partial reordering)
      - Module IDs are applied to orders 1, 2, 3... in array sequence
      - Validation:
        - All module IDs must exist and belong to this course
        - No duplicate module IDs
        - Must include every module currently in the course
        - Array cannot be empty
      - Updates order field for all affected modules
      - Returns summary of which modules changed order
      - Prerequisites are not affected by reordering
      - Learner progress is maintained regardless of order changes
    `
  }
};

// Type exports for consumers
export type CourseSegmentsContractType = typeof CourseSegmentsContracts;
export type ListModulesRequest = typeof CourseSegmentsContracts.list.example.request;
export type ListModulesResponse = typeof CourseSegmentsContracts.list.example.response;
export type CreateModuleRequest = typeof CourseSegmentsContracts.create.example.request;
export type CreateModuleResponse = typeof CourseSegmentsContracts.create.example.response;
export type GetModuleRequest = typeof CourseSegmentsContracts.getOne.example.request;
export type GetModuleResponse = typeof CourseSegmentsContracts.getOne.example.response;
export type UpdateModuleRequest = typeof CourseSegmentsContracts.update.example.request;
export type UpdateModuleResponse = typeof CourseSegmentsContracts.update.example.response;
export type DeleteModuleRequest = typeof CourseSegmentsContracts.delete.example.request;
export type DeleteModuleResponse = typeof CourseSegmentsContracts.delete.example.response;
export type ReorderModulesRequest = typeof CourseSegmentsContracts.reorder.example.request;
export type ReorderModulesResponse = typeof CourseSegmentsContracts.reorder.example.response;
