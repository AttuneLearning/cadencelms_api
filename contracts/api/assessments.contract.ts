/**
 * Assessments API Contracts
 * Version: 1.0.0
 *
 * These contracts define the Assessment entity - quiz and exam configurations
 * that can be used as learning unit content for evaluating learner knowledge.
 *
 * Assessments define question selection rules, timing, attempt limits, and scoring.
 */

export const AssessmentsContracts = {
  /**
   * List Assessments
   * GET /assessments
   */
  list: {
    endpoint: '/api/v2/assessments',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all assessments with filtering and pagination',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        page: { type: 'number', required: false, default: 1, min: 1 },
        limit: { type: 'number', required: false, default: 20, min: 1, max: 100 },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department'
        },
        style: {
          type: 'string',
          required: false,
          enum: ['quiz', 'exam'],
          description: 'Filter by assessment style'
        },
        isPublished: {
          type: 'boolean',
          required: false,
          description: 'Filter by publish status'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by title or description'
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
            assessments: [
              {
                id: 'ObjectId',
                departmentId: 'ObjectId',
                departmentName: 'string',
                title: 'string',
                description: 'string | null',
                style: 'quiz | exam',
                questionSelection: {
                  questionBankIds: 'string[]',
                  questionCount: 'number',
                  selectionMode: 'random | sequential | weighted'
                },
                timing: {
                  timeLimit: 'number | null',
                  showTimer: 'boolean',
                  autoSubmitOnExpiry: 'boolean'
                },
                attempts: {
                  maxAttempts: 'number | null',
                  cooldownMinutes: 'number | null',
                  retakePolicy: 'anytime | after_cooldown | instructor_unlock'
                },
                scoring: {
                  passingScore: 'number',
                  showScore: 'boolean',
                  showCorrectAnswers: 'never | after_submit | after_all_attempts',
                  partialCredit: 'boolean'
                },
                isPublished: 'boolean',
                isArchived: 'boolean',
                createdBy: 'ObjectId',
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view assessments' }
      ]
    },

    example: {
      request: {
        query: {
          departmentId: '507f1f77bcf86cd799439012',
          style: 'quiz',
          isPublished: true,
          page: 1,
          limit: 20
        }
      },
      response: {
        success: true,
        data: {
          assessments: [
            {
              id: '507f1f77bcf86cd799439070',
              departmentId: '507f1f77bcf86cd799439012',
              departmentName: 'Computer Science',
              title: 'Variables and Data Types Quiz',
              description: 'Test your understanding of basic variable concepts',
              style: 'quiz',
              questionSelection: {
                questionBankIds: ['bank-variables', 'bank-datatypes'],
                questionCount: 10,
                selectionMode: 'random'
              },
              timing: {
                timeLimit: 30,
                showTimer: true,
                autoSubmitOnExpiry: true
              },
              attempts: {
                maxAttempts: 3,
                cooldownMinutes: 60,
                retakePolicy: 'after_cooldown'
              },
              scoring: {
                passingScore: 70,
                showScore: true,
                showCorrectAnswers: 'after_submit',
                partialCredit: false
              },
              isPublished: true,
              isArchived: false,
              createdBy: '507f1f77bcf86cd799439030',
              createdAt: '2026-01-05T00:00:00.000Z',
              updatedAt: '2026-01-06T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:assessments'],

    notes: `
      - Returns assessments scoped to user's accessible departments
      - Staff see all assessments from their departments
      - Learners only see published assessments
      - timeLimit is in minutes (null = unlimited)
      - questionBankIds are string identifiers for question banks
    `
  },

  /**
   * Create Assessment
   * POST /assessments
   */
  create: {
    endpoint: '/api/v2/assessments',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new assessment (quiz or exam)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        departmentId: {
          type: 'ObjectId',
          required: true,
          description: 'Department this assessment belongs to'
        },
        title: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 200,
          description: 'Assessment title'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Assessment description/instructions'
        },
        style: {
          type: 'string',
          required: true,
          enum: ['quiz', 'exam'],
          description: 'Assessment style (quiz = lighter, exam = formal)'
        },
        questionSelection: {
          type: 'object',
          required: true,
          properties: {
            questionBankIds: {
              type: 'array',
              required: true,
              items: { type: 'string' },
              minItems: 1,
              description: 'Question bank IDs to select from'
            },
            questionCount: {
              type: 'number',
              required: true,
              min: 1,
              description: 'Number of questions to include'
            },
            selectionMode: {
              type: 'string',
              required: false,
              enum: ['random', 'sequential', 'weighted'],
              default: 'random',
              description: 'How questions are selected'
            },
            filterByTags: {
              type: 'array',
              required: false,
              items: { type: 'string' },
              description: 'Only select questions with these tags'
            },
            filterByDifficulty: {
              type: 'array',
              required: false,
              items: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
              description: 'Only select questions with these difficulty levels'
            }
          }
        },
        timing: {
          type: 'object',
          required: false,
          properties: {
            timeLimit: {
              type: 'number',
              required: false,
              min: 1,
              description: 'Time limit in minutes (null = unlimited)'
            },
            showTimer: {
              type: 'boolean',
              default: true,
              description: 'Show countdown timer to learner'
            },
            autoSubmitOnExpiry: {
              type: 'boolean',
              default: true,
              description: 'Automatically submit when time expires'
            }
          }
        },
        attempts: {
          type: 'object',
          required: false,
          properties: {
            maxAttempts: {
              type: 'number',
              required: false,
              min: 1,
              description: 'Maximum attempts allowed (null = unlimited)'
            },
            cooldownMinutes: {
              type: 'number',
              required: false,
              min: 0,
              description: 'Minutes to wait between attempts'
            },
            retakePolicy: {
              type: 'string',
              enum: ['anytime', 'after_cooldown', 'instructor_unlock'],
              default: 'anytime',
              description: 'Policy for retaking assessment'
            }
          }
        },
        scoring: {
          type: 'object',
          required: false,
          properties: {
            passingScore: {
              type: 'number',
              required: false,
              default: 70,
              min: 0,
              max: 100,
              description: 'Passing score percentage'
            },
            showScore: {
              type: 'boolean',
              default: true,
              description: 'Show score to learner after completion'
            },
            showCorrectAnswers: {
              type: 'string',
              enum: ['never', 'after_submit', 'after_all_attempts'],
              default: 'after_submit',
              description: 'When to show correct answers'
            },
            partialCredit: {
              type: 'boolean',
              default: false,
              description: 'Allow partial credit for multi-select questions'
            }
          }
        },
        feedback: {
          type: 'object',
          required: false,
          properties: {
            showFeedback: {
              type: 'boolean',
              default: true,
              description: 'Show feedback on answers'
            },
            feedbackTiming: {
              type: 'string',
              enum: ['immediate', 'after_submit', 'after_grading'],
              default: 'after_submit',
              description: 'When to show feedback'
            },
            showExplanations: {
              type: 'boolean',
              default: true,
              description: 'Show question explanations'
            }
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
            id: 'ObjectId',
            departmentId: 'ObjectId',
            title: 'string',
            description: 'string | null',
            style: 'string',
            questionSelection: 'object',
            timing: 'object',
            attempts: 'object',
            scoring: 'object',
            feedback: 'object',
            isPublished: 'boolean',
            isArchived: 'boolean',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'INVALID_QUESTION_BANK', message: 'One or more question banks do not exist' },
        { status: 400, code: 'INSUFFICIENT_QUESTIONS', message: 'Not enough questions in banks for requested count' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to create assessments' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department does not exist' }
      ]
    },

    example: {
      request: {
        body: {
          departmentId: '507f1f77bcf86cd799439012',
          title: 'Midterm Exam: Data Structures',
          description: 'Comprehensive exam covering arrays, lists, trees, and graphs',
          style: 'exam',
          questionSelection: {
            questionBankIds: ['bank-arrays', 'bank-lists', 'bank-trees', 'bank-graphs'],
            questionCount: 50,
            selectionMode: 'weighted',
            filterByDifficulty: ['intermediate', 'advanced']
          },
          timing: {
            timeLimit: 120,
            showTimer: true,
            autoSubmitOnExpiry: true
          },
          attempts: {
            maxAttempts: 1,
            retakePolicy: 'instructor_unlock'
          },
          scoring: {
            passingScore: 60,
            showScore: true,
            showCorrectAnswers: 'after_all_attempts',
            partialCredit: true
          },
          feedback: {
            showFeedback: true,
            feedbackTiming: 'after_grading',
            showExplanations: true
          }
        }
      },
      response: {
        success: true,
        message: 'Assessment created successfully',
        data: {
          id: '507f1f77bcf86cd799439080',
          departmentId: '507f1f77bcf86cd799439012',
          title: 'Midterm Exam: Data Structures',
          description: 'Comprehensive exam covering arrays, lists, trees, and graphs',
          style: 'exam',
          questionSelection: {
            questionBankIds: ['bank-arrays', 'bank-lists', 'bank-trees', 'bank-graphs'],
            questionCount: 50,
            selectionMode: 'weighted',
            filterByTags: [],
            filterByDifficulty: ['intermediate', 'advanced']
          },
          timing: {
            timeLimit: 120,
            showTimer: true,
            autoSubmitOnExpiry: true
          },
          attempts: {
            maxAttempts: 1,
            cooldownMinutes: null,
            retakePolicy: 'instructor_unlock'
          },
          scoring: {
            passingScore: 60,
            showScore: true,
            showCorrectAnswers: 'after_all_attempts',
            partialCredit: true
          },
          feedback: {
            showFeedback: true,
            feedbackTiming: 'after_grading',
            showExplanations: true
          },
          isPublished: false,
          isArchived: false,
          createdBy: '507f1f77bcf86cd799439030',
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:assessments'],

    notes: `
      - Assessment starts as unpublished (isPublished: false)
      - questionBankIds validated against existing question banks
      - questionCount must not exceed available questions in banks
      - style 'exam' typically has stricter settings (fewer attempts, longer time)
      - style 'quiz' typically has lenient settings (more attempts, shorter)
      - timeLimit is in minutes
    `
  },

  /**
   * Get Assessment Details
   * GET /assessments/:id
   */
  getOne: {
    endpoint: '/api/v2/assessments/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about an assessment',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'ObjectId', required: true, description: 'Assessment ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'ObjectId',
            departmentId: 'ObjectId',
            department: { id: 'ObjectId', name: 'string' },
            title: 'string',
            description: 'string | null',
            style: 'string',
            questionSelection: 'object',
            timing: 'object',
            attempts: 'object',
            scoring: 'object',
            feedback: 'object',
            isPublished: 'boolean',
            isArchived: 'boolean',
            statistics: {
              totalAttempts: 'number',
              averageScore: 'number',
              passRate: 'number',
              averageTimeMinutes: 'number'
            },
            usedInLearningUnits: 'number',
            createdBy: { id: 'ObjectId', firstName: 'string', lastName: 'string' },
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this assessment' },
        { status: 404, code: 'NOT_FOUND', message: 'Assessment not found' }
      ]
    },

    permissions: ['read:assessments'],

    notes: `
      - Statistics included for staff users only
      - usedInLearningUnits shows how many learning units reference this assessment
      - Learners only see published assessments
    `
  },

  /**
   * Update Assessment
   * PUT /assessments/:id
   */
  update: {
    endpoint: '/api/v2/assessments/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update an assessment',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'ObjectId', required: true, description: 'Assessment ID' }
      },
      body: {
        title: { type: 'string', required: false },
        description: { type: 'string', required: false },
        style: { type: 'string', required: false, enum: ['quiz', 'exam'] },
        questionSelection: { type: 'object', required: false },
        timing: { type: 'object', required: false },
        attempts: { type: 'object', required: false },
        scoring: { type: 'object', required: false },
        feedback: { type: 'object', required: false }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: 'Assessment object'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'HAS_ACTIVE_ATTEMPTS', message: 'Cannot modify assessment with active attempts' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update assessments' },
        { status: 404, code: 'NOT_FOUND', message: 'Assessment not found' }
      ]
    },

    permissions: ['write:assessments'],

    notes: `
      - Only provided fields are updated (partial update)
      - Cannot change departmentId
      - Some fields cannot be changed if there are active attempts
      - Changes to questionSelection may require re-validation
    `
  },

  /**
   * Publish Assessment
   * POST /assessments/:id/publish
   */
  publish: {
    endpoint: '/api/v2/assessments/:id/publish',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Publish an assessment to make it available',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'ObjectId', required: true, description: 'Assessment ID' }
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
            isPublished: true,
            publishedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'NO_QUESTIONS', message: 'Cannot publish assessment with no questions available' },
        { status: 400, code: 'ALREADY_PUBLISHED', message: 'Assessment is already published' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to publish assessments' },
        { status: 404, code: 'NOT_FOUND', message: 'Assessment not found' }
      ]
    },

    permissions: ['write:assessments'],

    notes: `
      - Validates that question banks have sufficient questions
      - After publishing, some fields become read-only
      - Can be unpublished later if no attempts exist
    `
  },

  /**
   * Archive Assessment
   * POST /assessments/:id/archive
   */
  archive: {
    endpoint: '/api/v2/assessments/:id/archive',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Archive an assessment (soft delete)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'ObjectId', required: true, description: 'Assessment ID' }
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
            isArchived: true,
            archivedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'HAS_ACTIVE_ATTEMPTS', message: 'Cannot archive assessment with in-progress attempts' },
        { status: 400, code: 'ALREADY_ARCHIVED', message: 'Assessment is already archived' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to archive assessments' },
        { status: 404, code: 'NOT_FOUND', message: 'Assessment not found' }
      ]
    },

    permissions: ['write:assessments'],

    notes: `
      - Soft delete - assessment data is preserved
      - Cannot be used in new learning units after archiving
      - Historical attempt data is preserved
      - Can be unarchived if needed
    `
  },

  /**
   * Delete Assessment
   * DELETE /assessments/:id
   */
  delete: {
    endpoint: '/api/v2/assessments/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Permanently delete an assessment',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'ObjectId', required: true, description: 'Assessment ID' }
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
        { status: 400, code: 'HAS_ATTEMPTS', message: 'Cannot delete assessment with existing attempts' },
        { status: 400, code: 'IN_USE', message: 'Cannot delete assessment used in learning units' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete assessments' },
        { status: 404, code: 'NOT_FOUND', message: 'Assessment not found' }
      ]
    },

    permissions: ['delete:assessments'],

    notes: `
      - Permanent deletion - use archive for soft delete
      - Only allowed if no attempts exist
      - Only allowed if not used in any learning units
      - Global admin override available
    `
  }
};

// Type exports for consumers
export type AssessmentsContractType = typeof AssessmentsContracts;
export type ListAssessmentsRequest = typeof AssessmentsContracts.list.example.request;
export type ListAssessmentsResponse = typeof AssessmentsContracts.list.example.response;
export type CreateAssessmentRequest = typeof AssessmentsContracts.create.example.request;
export type CreateAssessmentResponse = typeof AssessmentsContracts.create.example.response;
