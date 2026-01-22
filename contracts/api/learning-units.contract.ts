/**
 * Learning Units API Contracts
 * Version: 1.0.0
 *
 * These contracts define the LearningUnit entity - individual pieces of content/activities within modules.
 * Learning units are categorized as exposition (instructional), practice, or assessment.
 *
 * Nested under /modules/:moduleId/learning-units
 */

export const LearningUnitsContracts = {
  /**
   * List Learning Units
   * GET /modules/:moduleId/learning-units
   */
  list: {
    endpoint: '/api/v2/modules/:moduleId/learning-units',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all learning units in a module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        moduleId: { type: 'ObjectId', required: true, description: 'Module ID' }
      },
      query: {
        category: {
          type: 'string',
          required: false,
          enum: ['exposition', 'practice', 'assessment'],
          description: 'Filter by category'
        },
        type: {
          type: 'string',
          required: false,
          enum: ['scorm', 'custom', 'exercise', 'video', 'document', 'assessment'],
          description: 'Filter by content type'
        },
        isRequired: {
          type: 'boolean',
          required: false,
          description: 'Filter by required status'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            moduleId: 'ObjectId',
            moduleTitle: 'string',
            learningUnits: [
              {
                id: 'ObjectId',
                title: 'string',
                description: 'string | null',
                type: 'scorm | custom | exercise | video | document | assessment',
                contentId: 'ObjectId | null',
                category: 'exposition | practice | assessment',
                isRequired: 'boolean',
                isReplayable: 'boolean',
                weight: 'number',
                sequence: 'number',
                estimatedDuration: 'number | null',
                isActive: 'boolean',
                createdAt: 'Date',
                updatedAt: 'Date'
              }
            ],
            totalCount: 'number',
            categoryCounts: {
              exposition: 'number',
              practice: 'number',
              assessment: 'number'
            }
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
        query: { category: 'exposition' }
      },
      response: {
        success: true,
        data: {
          moduleId: '507f1f77bcf86cd799439012',
          moduleTitle: 'Chapter 1: Programming Basics',
          learningUnits: [
            {
              id: '507f1f77bcf86cd799439040',
              title: 'Introduction to Variables',
              description: 'Learn about variable types and declarations',
              type: 'video',
              contentId: '507f1f77bcf86cd799439050',
              category: 'exposition',
              isRequired: true,
              isReplayable: true,
              weight: 10,
              sequence: 1,
              estimatedDuration: 15,
              isActive: true,
              createdAt: '2026-01-02T00:00:00.000Z',
              updatedAt: '2026-01-02T00:00:00.000Z'
            }
          ],
          totalCount: 1,
          categoryCounts: {
            exposition: 1,
            practice: 0,
            assessment: 0
          }
        }
      }
    },

    permissions: ['read:courses'],

    notes: `
      - Returns learning units in sequence order
      - Learners only see active learning units
      - Category filters: exposition (instructional), practice (exercises), assessment (quizzes/exams)
      - weight is used for module completion calculation (0-100)
      - estimatedDuration is in minutes
    `
  },

  /**
   * Create Learning Unit
   * POST /modules/:moduleId/learning-units
   */
  create: {
    endpoint: '/api/v2/modules/:moduleId/learning-units',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new learning unit in a module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        moduleId: { type: 'ObjectId', required: true, description: 'Module ID' }
      },
      body: {
        title: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 200,
          description: 'Learning unit title'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Learning unit description'
        },
        type: {
          type: 'string',
          required: true,
          enum: ['scorm', 'custom', 'exercise', 'video', 'document', 'assessment'],
          description: 'Content type'
        },
        contentId: {
          type: 'ObjectId',
          required: false,
          description: 'Reference to content/exercise/assessment'
        },
        category: {
          type: 'string',
          required: true,
          enum: ['exposition', 'practice', 'assessment'],
          description: 'Learning unit category'
        },
        isRequired: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Whether completion is required for module completion'
        },
        isReplayable: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Whether learner can replay after completion'
        },
        weight: {
          type: 'number',
          required: false,
          default: 0,
          min: 0,
          max: 100,
          description: 'Weight for module completion calculation'
        },
        sequence: {
          type: 'number',
          required: false,
          min: 1,
          description: 'Display sequence (auto-assigned if not provided)'
        },
        settings: {
          type: 'object',
          required: false,
          properties: {
            allowMultipleAttempts: { type: 'boolean', default: true },
            maxAttempts: { type: 'number' },
            timeLimit: { type: 'number', description: 'Time limit in minutes' },
            showFeedback: { type: 'boolean', default: true },
            shuffleQuestions: { type: 'boolean', default: false },
            passingScore: { type: 'number', min: 0, max: 100 }
          }
        },
        estimatedDuration: {
          type: 'number',
          required: false,
          min: 0,
          description: 'Estimated duration in minutes'
        },
        availableFrom: {
          type: 'Date',
          required: false
        },
        availableUntil: {
          type: 'Date',
          required: false
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
            moduleId: 'ObjectId',
            title: 'string',
            description: 'string | null',
            type: 'string',
            contentId: 'ObjectId | null',
            category: 'string',
            isRequired: 'boolean',
            isReplayable: 'boolean',
            weight: 'number',
            sequence: 'number',
            settings: 'object',
            estimatedDuration: 'number | null',
            availableFrom: 'Date | null',
            availableUntil: 'Date | null',
            isActive: 'boolean',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'CONTENT_NOT_FOUND', message: 'Referenced content does not exist' },
        { status: 400, code: 'TYPE_MISMATCH', message: 'Content type does not match learning unit type' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to create learning units' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found' }
      ]
    },

    example: {
      request: {
        params: { moduleId: '507f1f77bcf86cd799439012' },
        body: {
          title: 'Variables Quiz',
          description: 'Test your knowledge of variables',
          type: 'exercise',
          contentId: '507f1f77bcf86cd799439060',
          category: 'assessment',
          isRequired: true,
          isReplayable: false,
          weight: 30,
          settings: {
            allowMultipleAttempts: true,
            maxAttempts: 3,
            timeLimit: 30,
            showFeedback: true,
            shuffleQuestions: true,
            passingScore: 70
          },
          estimatedDuration: 30
        }
      },
      response: {
        success: true,
        message: 'Learning unit created successfully',
        data: {
          id: '507f1f77bcf86cd799439041',
          moduleId: '507f1f77bcf86cd799439012',
          title: 'Variables Quiz',
          description: 'Test your knowledge of variables',
          type: 'exercise',
          contentId: '507f1f77bcf86cd799439060',
          category: 'assessment',
          isRequired: true,
          isReplayable: false,
          weight: 30,
          sequence: 2,
          settings: {
            allowMultipleAttempts: true,
            maxAttempts: 3,
            timeLimit: 30,
            showFeedback: true,
            shuffleQuestions: true,
            passingScore: 70
          },
          estimatedDuration: 30,
          availableFrom: null,
          availableUntil: null,
          isActive: true,
          createdBy: '507f1f77bcf86cd799439030',
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:courses'],

    notes: `
      - Sequence auto-assigned as max(existing) + 1 if not provided
      - Type must match contentId if provided
      - Category determines how this contributes to module completion
      - weight must be 0-100, used for percentage-based completion
      - For assessment category, settings.passingScore is recommended
      - estimatedDuration is in minutes
    `
  },

  /**
   * Get Learning Unit Details
   * GET /learning-units/:learningUnitId
   */
  getOne: {
    endpoint: '/api/v2/learning-units/:learningUnitId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific learning unit',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        learningUnitId: { type: 'ObjectId', required: true, description: 'Learning Unit ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'ObjectId',
            moduleId: 'ObjectId',
            moduleTitle: 'string',
            courseId: 'ObjectId',
            courseTitle: 'string',
            title: 'string',
            description: 'string | null',
            type: 'string',
            contentId: 'ObjectId | null',
            content: 'object | null',
            category: 'string',
            isRequired: 'boolean',
            isReplayable: 'boolean',
            weight: 'number',
            sequence: 'number',
            settings: 'object',
            estimatedDuration: 'number | null',
            availableFrom: 'Date | null',
            availableUntil: 'Date | null',
            isActive: 'boolean',
            statistics: {
              completionCount: 'number',
              averageScore: 'number | null',
              averageTimeSeconds: 'number | null'
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
        { status: 403, code: 'FORBIDDEN', message: 'No permission to view this learning unit' },
        { status: 404, code: 'LEARNING_UNIT_NOT_FOUND', message: 'Learning unit not found' }
      ]
    },

    permissions: ['read:courses'],

    notes: `
      - Returns content object populated if contentId exists
      - Statistics included for staff users only
      - Learners can only view active learning units
    `
  },

  /**
   * Update Learning Unit
   * PUT /learning-units/:learningUnitId
   */
  update: {
    endpoint: '/api/v2/learning-units/:learningUnitId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update an existing learning unit',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        learningUnitId: { type: 'ObjectId', required: true, description: 'Learning Unit ID' }
      },
      body: {
        title: { type: 'string', required: false, minLength: 1, maxLength: 200 },
        description: { type: 'string', required: false, maxLength: 2000 },
        type: { type: 'string', required: false, enum: ['scorm', 'custom', 'exercise', 'video', 'document', 'assessment'] },
        contentId: { type: 'ObjectId', required: false },
        category: { type: 'string', required: false, enum: ['exposition', 'practice', 'assessment'] },
        isRequired: { type: 'boolean', required: false },
        isReplayable: { type: 'boolean', required: false },
        weight: { type: 'number', required: false, min: 0, max: 100 },
        settings: { type: 'object', required: false },
        estimatedDuration: { type: 'number', required: false, min: 0 },
        availableFrom: { type: 'Date', required: false },
        availableUntil: { type: 'Date', required: false },
        isActive: { type: 'boolean', required: false }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: 'LearningUnit object'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'CONTENT_NOT_FOUND', message: 'Referenced content does not exist' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to update learning units' },
        { status: 404, code: 'LEARNING_UNIT_NOT_FOUND', message: 'Learning unit not found' }
      ]
    },

    permissions: ['write:courses'],

    notes: `
      - Only provided fields are updated (partial update)
      - Sequence cannot be changed via PUT (use reorder endpoint)
      - Cannot change category if learners have progress on this unit
    `
  },

  /**
   * Delete Learning Unit
   * DELETE /learning-units/:learningUnitId
   */
  delete: {
    endpoint: '/api/v2/learning-units/:learningUnitId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a learning unit from a module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        learningUnitId: { type: 'ObjectId', required: true, description: 'Learning Unit ID' }
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
            deletedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'HAS_PROGRESS', message: 'Cannot delete learning unit with learner progress (use force=true)' },
        { status: 400, code: 'IS_GATE_UNIT', message: 'Cannot delete learning unit that is module gate' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to delete learning units' },
        { status: 404, code: 'LEARNING_UNIT_NOT_FOUND', message: 'Learning unit not found' }
      ]
    },

    permissions: ['write:courses', 'delete:courses'],

    notes: `
      - Cannot delete if learning unit is gateLearningUnitId for module
      - force=true archives progress instead of preventing deletion
      - Remaining learning units are resequenced automatically
    `
  },

  /**
   * Reorder Learning Units
   * PATCH /modules/:moduleId/learning-units/reorder
   */
  reorder: {
    endpoint: '/api/v2/modules/:moduleId/learning-units/reorder',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Reorder learning units within a module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        moduleId: { type: 'ObjectId', required: true, description: 'Module ID' }
      },
      body: {
        learningUnitIds: {
          type: 'array',
          required: true,
          description: 'Array of learning unit IDs in desired order',
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
            moduleId: 'ObjectId',
            learningUnits: [
              {
                id: 'ObjectId',
                title: 'string',
                oldSequence: 'number',
                newSequence: 'number'
              }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'MISSING_UNITS', message: 'Not all learning units included' },
        { status: 400, code: 'INVALID_UNIT', message: 'Learning unit does not belong to this module' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to reorder learning units' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found' }
      ]
    },

    permissions: ['write:courses'],

    notes: `
      - Must include ALL learning units in the module
      - Array order determines new sequence (1-indexed)
      - Used when module.presentationRules.presentationMode is 'prescribed'
    `
  },

  /**
   * Move Learning Unit to Another Module
   * POST /learning-units/:learningUnitId/move
   */
  move: {
    endpoint: '/api/v2/learning-units/:learningUnitId/move',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Move a learning unit to a different module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        learningUnitId: { type: 'ObjectId', required: true, description: 'Learning Unit ID' }
      },
      body: {
        targetModuleId: {
          type: 'ObjectId',
          required: true,
          description: 'Destination module ID'
        },
        sequence: {
          type: 'number',
          required: false,
          description: 'Desired sequence in target module'
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
            learningUnitId: 'ObjectId',
            sourceModuleId: 'ObjectId',
            targetModuleId: 'ObjectId',
            newSequence: 'number'
          }
        }
      },
      errors: [
        { status: 400, code: 'SAME_MODULE', message: 'Learning unit already in target module' },
        { status: 400, code: 'DIFFERENT_COURSE', message: 'Cannot move to module in different course' },
        { status: 400, code: 'HAS_PROGRESS', message: 'Cannot move learning unit with learner progress' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No permission to move learning units' },
        { status: 404, code: 'LEARNING_UNIT_NOT_FOUND', message: 'Learning unit not found' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Target module not found' }
      ]
    },

    permissions: ['write:courses'],

    notes: `
      - Can only move within the same course
      - Cannot move if learners have progress on this unit
      - Source module sequences are updated after move
      - If sequence not provided, appended to end of target module
    `
  }
};

// Type exports for consumers
export type LearningUnitsContractType = typeof LearningUnitsContracts;
export type ListLearningUnitsRequest = typeof LearningUnitsContracts.list.example.request;
export type ListLearningUnitsResponse = typeof LearningUnitsContracts.list.example.response;
export type CreateLearningUnitRequest = typeof LearningUnitsContracts.create.example.request;
export type CreateLearningUnitResponse = typeof LearningUnitsContracts.create.example.response;
