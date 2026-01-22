/**
 * Modules API Contracts
 * Version: 1.0.0
 *
 * These contracts define the Module entity - logical groupings of learning units within a course.
 * Modules organize course content into chapters/sections with completion criteria and presentation rules.
 *
 * Nested under /courses/:courseId/modules
 */

export const ModulesContracts = {
  /**
   * List Modules
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
        includeLearningUnits: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include learning units count and summary'
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
                prerequisites: 'ObjectId[]',
                completionCriteria: {
                  type: 'all_required | percentage | gate_learning_unit | points',
                  percentageRequired: 'number | null',
                  pointsRequired: 'number | null',
                  gateLearningUnitScore: 'number | null',
                  requireAllExpositions: 'boolean'
                },
                gateLearningUnitId: 'ObjectId | null',
                presentationRules: {
                  presentationMode: 'prescribed | learner_choice | random',
                  repetitionMode: 'none | until_passed | until_mastery | spaced',
                  masteryThreshold: 'number | null',
                  maxRepetitions: 'number | null',
                  showAllAvailable: 'boolean',
                  allowSkip: 'boolean'
                },
                isPublished: 'boolean',
                availableFrom: 'Date | null',
                availableUntil: 'Date | null',
                estimatedDuration: 'number',
                objectives: 'string[]',
                learningUnitCount: 'number | null',
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
        query: { includeUnpublished: false, includeLearningUnits: true }
      },
      response: {
        success: true,
        data: {
          courseId: '507f1f77bcf86cd799439011',
          courseTitle: 'Introduction to Computer Science',
          modules: [
            {
              id: '507f1f77bcf86cd799439012',
              title: 'Chapter 1: Programming Basics',
              description: 'Learn fundamental programming concepts',
              order: 1,
              prerequisites: [],
              completionCriteria: {
                type: 'all_required',
                percentageRequired: null,
                pointsRequired: null,
                gateLearningUnitScore: null,
                requireAllExpositions: true
              },
              gateLearningUnitId: null,
              presentationRules: {
                presentationMode: 'learner_choice',
                repetitionMode: 'until_passed',
                masteryThreshold: 80,
                maxRepetitions: 3,
                showAllAvailable: true,
                allowSkip: false
              },
              isPublished: true,
              availableFrom: null,
              availableUntil: null,
              estimatedDuration: 120,
              objectives: ['Understand variables', 'Write basic functions'],
              learningUnitCount: 5,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-05T00:00:00.000Z'
            }
          ],
          totalModules: 1
        }
      }
    },

    permissions: ['read:courses'],

    notes: `
      - Returns modules in order (ascending by order field)
      - Learners only see published modules (isPublished: true)
      - Staff can see all modules if includeUnpublished=true
      - Prerequisites array contains Module IDs that must be completed first
      - learningUnitCount only included if includeLearningUnits=true
      - estimatedDuration is in minutes
    `
  },

  /**
   * Create Module
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
          required: false,
          min: 1,
          description: 'Module order (auto-assigned if not provided)'
        },
        prerequisites: {
          type: 'array',
          required: false,
          items: { type: 'ObjectId' },
          description: 'Module IDs that must be completed first'
        },
        completionCriteria: {
          type: 'object',
          required: false,
          properties: {
            type: {
              type: 'string',
              enum: ['all_required', 'percentage', 'gate_learning_unit', 'points'],
              default: 'all_required'
            },
            percentageRequired: { type: 'number', min: 0, max: 100 },
            pointsRequired: { type: 'number', min: 0 },
            gateLearningUnitScore: { type: 'number', min: 0, max: 100 },
            requireAllExpositions: { type: 'boolean', default: false }
          }
        },
        gateLearningUnitId: {
          type: 'ObjectId',
          required: false,
          description: 'LearningUnit ID for gate_learning_unit completion type'
        },
        presentationRules: {
          type: 'object',
          required: false,
          properties: {
            presentationMode: {
              type: 'string',
              enum: ['prescribed', 'learner_choice', 'random'],
              default: 'learner_choice'
            },
            prescribedOrder: { type: 'array', items: { type: 'ObjectId' } },
            repetitionMode: {
              type: 'string',
              enum: ['none', 'until_passed', 'until_mastery', 'spaced'],
              default: 'none'
            },
            masteryThreshold: { type: 'number', min: 0, max: 100 },
            maxRepetitions: { type: 'number', min: 1 },
            cooldownBetweenRepetitions: { type: 'number', min: 0 },
            repeatOn: {
              type: 'object',
              properties: {
                failedAttempt: { type: 'boolean', default: true },
                belowMastery: { type: 'boolean', default: true },
                learnerRequest: { type: 'boolean', default: false }
              }
            },
            repeatableCategories: {
              type: 'array',
              items: { type: 'string', enum: ['exposition', 'practice', 'assessment'] }
            },
            showAllAvailable: { type: 'boolean', default: true },
            allowSkip: { type: 'boolean', default: false }
          }
        },
        isPublished: {
          type: 'boolean',
          required: false,
          default: false
        },
        availableFrom: {
          type: 'Date',
          required: false,
          description: 'Date when module becomes available'
        },
        availableUntil: {
          type: 'Date',
          required: false,
          description: 'Date when module becomes unavailable'
        },
        estimatedDuration: {
          type: 'number',
          required: false,
          default: 0,
          min: 0,
          description: 'Estimated duration in minutes'
        },
        objectives: {
          type: 'array',
          required: false,
          items: { type: 'string' },
          description: 'Learning objectives for this module'
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
            prerequisites: 'ObjectId[]',
            completionCriteria: 'object',
            gateLearningUnitId: 'ObjectId | null',
            presentationRules: 'object',
            isPublished: 'boolean',
            availableFrom: 'Date | null',
            availableUntil: 'Date | null',
            estimatedDuration: 'number',
            objectives: 'string[]',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'CIRCULAR_PREREQUISITE', message: 'Prerequisites would create circular dependency' },
        { status: 400, code: 'INVALID_PREREQUISITE', message: 'Prerequisite module does not exist in this course' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to create modules' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    example: {
      request: {
        params: { courseId: '507f1f77bcf86cd799439011' },
        body: {
          title: 'Chapter 2: Data Structures',
          description: 'Learn about arrays, lists, and trees',
          prerequisites: ['507f1f77bcf86cd799439012'],
          completionCriteria: {
            type: 'percentage',
            percentageRequired: 80,
            requireAllExpositions: true
          },
          presentationRules: {
            presentationMode: 'learner_choice',
            repetitionMode: 'until_mastery',
            masteryThreshold: 85,
            maxRepetitions: 5,
            repeatOn: {
              failedAttempt: true,
              belowMastery: true,
              learnerRequest: true
            },
            repeatableCategories: ['practice', 'assessment'],
            showAllAvailable: true,
            allowSkip: false
          },
          estimatedDuration: 180,
          objectives: ['Understand arrays', 'Implement linked lists', 'Traverse binary trees']
        }
      },
      response: {
        success: true,
        message: 'Module created successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          courseId: '507f1f77bcf86cd799439011',
          title: 'Chapter 2: Data Structures',
          description: 'Learn about arrays, lists, and trees',
          order: 2,
          prerequisites: ['507f1f77bcf86cd799439012'],
          completionCriteria: {
            type: 'percentage',
            percentageRequired: 80,
            pointsRequired: null,
            gateLearningUnitScore: null,
            requireAllExpositions: true
          },
          gateLearningUnitId: null,
          presentationRules: {
            presentationMode: 'learner_choice',
            prescribedOrder: [],
            repetitionMode: 'until_mastery',
            masteryThreshold: 85,
            maxRepetitions: 5,
            cooldownBetweenRepetitions: 0,
            repeatOn: {
              failedAttempt: true,
              belowMastery: true,
              learnerRequest: true
            },
            repeatableCategories: ['practice', 'assessment'],
            showAllAvailable: true,
            allowSkip: false
          },
          isPublished: false,
          availableFrom: null,
          availableUntil: null,
          estimatedDuration: 180,
          objectives: ['Understand arrays', 'Implement linked lists', 'Traverse binary trees'],
          createdBy: '507f1f77bcf86cd799439030',
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Order auto-assigned as max(existing) + 1 if not provided
      - Prerequisites must be existing Module IDs within same course
      - Prerequisites are validated for circular dependencies
      - Default completionCriteria.type is 'all_required'
      - Default presentationRules.presentationMode is 'learner_choice'
      - estimatedDuration is in minutes
      - New modules are unpublished by default
    `
  },

  /**
   * Get Module Details
   * GET /modules/:moduleId
   */
  getOne: {
    endpoint: '/api/v2/modules/:moduleId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        moduleId: { type: 'ObjectId', required: true, description: 'Module ID' }
      },
      query: {
        includeLearningUnits: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include full learning units list'
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
            courseId: 'ObjectId',
            courseTitle: 'string',
            title: 'string',
            description: 'string | null',
            order: 'number',
            prerequisites: [
              {
                id: 'ObjectId',
                title: 'string'
              }
            ],
            completionCriteria: {
              type: 'string',
              percentageRequired: 'number | null',
              pointsRequired: 'number | null',
              gateLearningUnitScore: 'number | null',
              requireAllExpositions: 'boolean'
            },
            gateLearningUnitId: 'ObjectId | null',
            presentationRules: {
              presentationMode: 'string',
              prescribedOrder: 'ObjectId[]',
              repetitionMode: 'string',
              masteryThreshold: 'number | null',
              maxRepetitions: 'number | null',
              cooldownBetweenRepetitions: 'number',
              repeatOn: {
                failedAttempt: 'boolean',
                belowMastery: 'boolean',
                learnerRequest: 'boolean'
              },
              repeatableCategories: 'string[]',
              showAllAvailable: 'boolean',
              allowSkip: 'boolean'
            },
            isPublished: 'boolean',
            availableFrom: 'Date | null',
            availableUntil: 'Date | null',
            estimatedDuration: 'number',
            objectives: 'string[]',
            learningUnits: 'array | null',
            statistics: {
              learnerCount: 'number',
              completionRate: 'number',
              averageScore: 'number | null'
            },
            createdBy: {
              id: 'ObjectId',
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
        { status: 403, code: 'FORBIDDEN', message: 'No permission to view this module' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found' }
      ]
    },

    example: {
      request: {
        params: { moduleId: '507f1f77bcf86cd799439012' },
        query: { includeLearningUnits: true }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439012',
          courseId: '507f1f77bcf86cd799439011',
          courseTitle: 'Introduction to Computer Science',
          title: 'Chapter 1: Programming Basics',
          description: 'Learn fundamental programming concepts',
          order: 1,
          prerequisites: [],
          completionCriteria: {
            type: 'all_required',
            percentageRequired: null,
            pointsRequired: null,
            gateLearningUnitScore: null,
            requireAllExpositions: true
          },
          gateLearningUnitId: null,
          presentationRules: {
            presentationMode: 'learner_choice',
            prescribedOrder: [],
            repetitionMode: 'until_passed',
            masteryThreshold: 80,
            maxRepetitions: 3,
            cooldownBetweenRepetitions: 0,
            repeatOn: {
              failedAttempt: true,
              belowMastery: true,
              learnerRequest: false
            },
            repeatableCategories: ['practice', 'assessment'],
            showAllAvailable: true,
            allowSkip: false
          },
          isPublished: true,
          availableFrom: null,
          availableUntil: null,
          estimatedDuration: 120,
          objectives: ['Understand variables', 'Write basic functions'],
          learningUnits: [
            {
              id: '507f1f77bcf86cd799439040',
              title: 'Introduction to Variables',
              category: 'exposition',
              type: 'video',
              sequence: 1,
              isRequired: true
            }
          ],
          statistics: {
            learnerCount: 150,
            completionRate: 0.78,
            averageScore: 82.5
          },
          createdBy: {
            id: '507f1f77bcf86cd799439030',
            firstName: 'Jane',
            lastName: 'Smith'
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z'
        }
      }
    },

    permissions: ['read:courses'],

    notes: `
      - Returns detailed module information
      - Prerequisites are populated with title for display
      - learningUnits only included if includeLearningUnits=true
      - Statistics included for staff users only
      - Learners can only view published modules
    `
  },

  /**
   * Update Module
   * PUT /modules/:moduleId
   */
  update: {
    endpoint: '/api/v2/modules/:moduleId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update an existing module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        moduleId: { type: 'ObjectId', required: true, description: 'Module ID' }
      },
      body: {
        title: { type: 'string', required: false, minLength: 1, maxLength: 200 },
        description: { type: 'string', required: false, maxLength: 2000 },
        prerequisites: { type: 'array', required: false, items: { type: 'ObjectId' } },
        completionCriteria: { type: 'object', required: false },
        gateLearningUnitId: { type: 'ObjectId', required: false },
        presentationRules: { type: 'object', required: false },
        isPublished: { type: 'boolean', required: false },
        availableFrom: { type: 'Date', required: false },
        availableUntil: { type: 'Date', required: false },
        estimatedDuration: { type: 'number', required: false, min: 0 },
        objectives: { type: 'array', required: false, items: { type: 'string' } }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: 'Module object'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'CIRCULAR_PREREQUISITE', message: 'Prerequisites would create circular dependency' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to update modules' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found' }
      ]
    },

    permissions: ['write:courses'],

    notes: `
      - Only provided fields are updated (partial update)
      - Order cannot be changed via PUT (use reorder endpoint)
      - Prerequisites validated for circular dependencies
      - Cannot unpublish module if learners have active progress
    `
  },

  /**
   * Delete Module
   * DELETE /modules/:moduleId
   */
  delete: {
    endpoint: '/api/v2/modules/:moduleId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a module from a course',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        moduleId: { type: 'ObjectId', required: true, description: 'Module ID' }
      },
      query: {
        force: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Force delete even with learner progress'
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
            learningUnitsRemoved: 'number'
          }
        }
      },
      errors: [
        { status: 400, code: 'HAS_PROGRESS', message: 'Cannot delete module with learner progress (use force=true)' },
        { status: 400, code: 'IS_PREREQUISITE', message: 'Cannot delete module that is prerequisite for other modules' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to delete modules' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found' }
      ]
    },

    permissions: ['write:courses', 'delete:courses'],

    notes: `
      - Cascades to delete all learning units in the module
      - Cannot delete if module is prerequisite for other modules
      - force=true archives progress instead of preventing deletion
      - Remaining modules are reordered automatically
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
          items: { type: 'ObjectId' }
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
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'MISSING_MODULES', message: 'Not all course modules included' },
        { status: 400, code: 'INVALID_MODULE', message: 'Module does not belong to this course' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to reorder modules' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    permissions: ['write:courses'],

    notes: `
      - Must include ALL modules in the course
      - Array order determines new order (1-indexed)
      - Prerequisites are not affected by reordering
      - Learner progress is maintained
    `
  }
};

// Type exports for consumers
export type ModulesContractType = typeof ModulesContracts;
export type ListModulesRequest = typeof ModulesContracts.list.example.request;
export type ListModulesResponse = typeof ModulesContracts.list.example.response;
export type CreateModuleRequest = typeof ModulesContracts.create.example.request;
export type CreateModuleResponse = typeof ModulesContracts.create.example.response;
export type GetModuleRequest = typeof ModulesContracts.getOne.example.request;
export type GetModuleResponse = typeof ModulesContracts.getOne.example.response;
