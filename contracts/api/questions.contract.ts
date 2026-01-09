/**
 * Questions API Contracts
 * Version: 1.0.0
 *
 * These contracts define the question bank management endpoints for the LMS API.
 * Both backend and UI teams use these as the source of truth.
 *
 * Phase 3: Content & Templates (High Priority)
 */

export const QuestionsContracts = {
  /**
   * List Questions from Question Bank
   */
  list: {
    endpoint: '/api/v2/questions',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Retrieve paginated list of questions from question bank with filtering',

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
        questionType: {
          type: 'string',
          required: false,
          enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'],
          description: 'Filter by question type (can be comma-separated for multiple types)'
        },
        tag: {
          type: 'string',
          required: false,
          description: 'Filter by tag'
        },
        difficulty: {
          type: 'string',
          required: false,
          enum: ['easy', 'medium', 'hard'],
          description: 'Filter by difficulty level'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search in question text'
        },
        department: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-createdAt',
          description: 'Sort field (prefix with - for desc). Options: createdAt, difficulty, points, questionType'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            questions: [
              {
                id: 'ObjectId',
                questionText: 'string',
                questionType: 'multiple_choice|true_false|short_answer|essay|fill_blank',
                options: [
                  {
                    text: 'string',
                    isCorrect: 'boolean'
                  }
                ],
                correctAnswer: 'string | string[]',
                points: 'number',
                difficulty: 'easy|medium|hard',
                tags: 'string[]',
                explanation: 'string | null',
                department: 'ObjectId | null',
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
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid query parameters' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' }
      ]
    },

    example: {
      request: {
        query: {
          questionType: 'multiple_choice',
          difficulty: 'medium',
          department: '507f1f77bcf86cd799439012',
          page: 1,
          limit: 10
        }
      },
      response: {
        success: true,
        data: {
          questions: [
            {
              id: '507f1f77bcf86cd799439020',
              questionText: 'What is the capital of France?',
              questionType: 'multiple_choice',
              options: [
                { text: 'London', isCorrect: false },
                { text: 'Paris', isCorrect: true },
                { text: 'Berlin', isCorrect: false },
                { text: 'Madrid', isCorrect: false }
              ],
              correctAnswer: 'Paris',
              points: 1,
              difficulty: 'medium',
              tags: ['geography', 'europe', 'capitals'],
              explanation: 'Paris is the capital and most populous city of France.',
              department: '507f1f77bcf86cd799439012',
              createdBy: '507f1f77bcf86cd799439011',
              createdAt: '2026-01-01T00:00:00.000Z',
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

    permissions: ['read:questions'],

    notes: `
      - Returns questions accessible to the authenticated user (department-scoped)
      - Global admins see all questions
      - Staff see questions from their departments
      - Multiple question types can be requested: ?questionType=multiple_choice,essay
      - Search performs case-insensitive search on questionText field
      - Options array only populated for multiple_choice and true_false types
      - Tags are useful for categorizing questions by topic, subject, or difficulty
      - Pagination defaults: page=1, limit=10
    `
  },

  /**
   * Create New Question
   */
  create: {
    endpoint: '/api/v2/questions',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new question in the question bank',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        questionText: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 2000,
          description: 'The question text'
        },
        questionType: {
          type: 'string',
          required: true,
          enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'],
          description: 'Type of question'
        },
        options: {
          type: 'array',
          required: false,
          description: 'Answer options (required for multiple_choice and true_false)',
          items: {
            text: {
              type: 'string',
              required: true,
              minLength: 1,
              maxLength: 500
            },
            isCorrect: {
              type: 'boolean',
              required: true
            }
          }
        },
        correctAnswer: {
          type: 'string | string[]',
          required: false,
          description: 'Correct answer(s). Required for short_answer, essay, fill_blank'
        },
        points: {
          type: 'number',
          required: true,
          min: 0.1,
          description: 'Point value for the question'
        },
        difficulty: {
          type: 'string',
          required: false,
          enum: ['easy', 'medium', 'hard'],
          default: 'medium',
          description: 'Difficulty level'
        },
        tags: {
          type: 'array',
          required: false,
          description: 'Tags for categorization',
          items: {
            type: 'string',
            minLength: 1,
            maxLength: 50
          }
        },
        explanation: {
          type: 'string',
          required: false,
          maxLength: 1000,
          description: 'Explanation shown after answering'
        },
        department: {
          type: 'ObjectId',
          required: false,
          description: 'Department ID (defaults to user\'s department)'
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
            questionText: 'string',
            questionType: 'string',
            options: 'array',
            correctAnswer: 'string | string[]',
            points: 'number',
            difficulty: 'string',
            tags: 'string[]',
            explanation: 'string | null',
            department: 'ObjectId | null',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'NO_CORRECT_ANSWER', message: 'Multiple choice questions must have at least one correct answer' },
        { status: 400, code: 'INVALID_OPTIONS', message: 'Options required for multiple_choice and true_false questions' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        questionText: 'Which of the following are programming languages?',
        questionType: 'multiple_choice',
        options: [
          { text: 'Python', isCorrect: true },
          { text: 'HTML', isCorrect: false },
          { text: 'JavaScript', isCorrect: true },
          { text: 'CSS', isCorrect: false }
        ],
        points: 2,
        difficulty: 'easy',
        tags: ['programming', 'fundamentals'],
        explanation: 'Python and JavaScript are programming languages, while HTML and CSS are markup/styling languages.',
        department: '507f1f77bcf86cd799439012'
      },
      response: {
        success: true,
        message: 'Question created successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          questionText: 'Which of the following are programming languages?',
          questionType: 'multiple_choice',
          options: [
            { text: 'Python', isCorrect: true },
            { text: 'HTML', isCorrect: false },
            { text: 'JavaScript', isCorrect: true },
            { text: 'CSS', isCorrect: false }
          ],
          correctAnswer: ['Python', 'JavaScript'],
          points: 2,
          difficulty: 'easy',
          tags: ['programming', 'fundamentals'],
          explanation: 'Python and JavaScript are programming languages, while HTML and CSS are markup/styling languages.',
          department: '507f1f77bcf86cd799439012',
          createdBy: '507f1f77bcf86cd799439011',
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:questions'],

    notes: `
      - Question type determines required fields:
        - multiple_choice: options array required, at least one isCorrect=true
        - true_false: options array required with exactly 2 options
        - short_answer: correctAnswer string required
        - essay: correctAnswer optional (graded manually)
        - fill_blank: correctAnswer string or array required
      - Points must be greater than 0
      - Options array required for multiple_choice and true_false
      - Multiple correct answers supported for multiple_choice
      - Department defaults to user's primary department if not specified
      - Tags are normalized to lowercase
      - createdBy automatically set to authenticated user
    `
  },

  /**
   * Get Question Details
   */
  getById: {
    endpoint: '/api/v2/questions/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Retrieve detailed information for a specific question',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Question ID'
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
            questionText: 'string',
            questionType: 'string',
            options: 'array',
            correctAnswer: 'string | string[]',
            points: 'number',
            difficulty: 'string',
            tags: 'string[]',
            explanation: 'string | null',
            department: 'ObjectId | null',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date',
            usageCount: 'number',
            lastUsed: 'Date | null'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions or access to this department' },
        { status: 404, code: 'QUESTION_NOT_FOUND', message: 'Question not found' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439020',
          questionText: 'What is the capital of France?',
          questionType: 'multiple_choice',
          options: [
            { text: 'London', isCorrect: false },
            { text: 'Paris', isCorrect: true },
            { text: 'Berlin', isCorrect: false },
            { text: 'Madrid', isCorrect: false }
          ],
          correctAnswer: 'Paris',
          points: 1,
          difficulty: 'medium',
          tags: ['geography', 'europe', 'capitals'],
          explanation: 'Paris is the capital and most populous city of France.',
          department: '507f1f77bcf86cd799439012',
          createdBy: '507f1f77bcf86cd799439011',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z',
          usageCount: 15,
          lastUsed: '2026-01-07T00:00:00.000Z'
        }
      }
    },

    permissions: ['read:questions'],

    notes: `
      - Returns full question details including correctAnswer
      - Includes usage statistics (usageCount, lastUsed)
      - Staff can only view questions from their departments
      - Global admins can view all questions
      - usageCount tracks how many exams/assessments use this question
      - lastUsed shows when question was last included in an assessment
    `
  },

  /**
   * Update Question
   */
  update: {
    endpoint: '/api/v2/questions/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update an existing question',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Question ID'
        }
      },
      body: {
        questionText: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 2000
        },
        questionType: {
          type: 'string',
          required: false,
          enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'],
          description: 'Changing type requires updating options/correctAnswer accordingly'
        },
        options: {
          type: 'array',
          required: false,
          description: 'Answer options (required for multiple_choice and true_false)',
          items: {
            text: {
              type: 'string',
              required: true,
              minLength: 1,
              maxLength: 500
            },
            isCorrect: {
              type: 'boolean',
              required: true
            }
          }
        },
        correctAnswer: {
          type: 'string | string[]',
          required: false
        },
        points: {
          type: 'number',
          required: false,
          min: 0.1
        },
        difficulty: {
          type: 'string',
          required: false,
          enum: ['easy', 'medium', 'hard']
        },
        tags: {
          type: 'array',
          required: false,
          items: {
            type: 'string',
            minLength: 1,
            maxLength: 50
          }
        },
        explanation: {
          type: 'string',
          required: false,
          maxLength: 1000
        },
        department: {
          type: 'ObjectId',
          required: false
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
            questionText: 'string',
            questionType: 'string',
            options: 'array',
            correctAnswer: 'string | string[]',
            points: 'number',
            difficulty: 'string',
            tags: 'string[]',
            explanation: 'string | null',
            department: 'ObjectId | null',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 400, code: 'NO_CORRECT_ANSWER', message: 'Multiple choice questions must have at least one correct answer' },
        { status: 400, code: 'QUESTION_IN_USE', message: 'Question is currently in use in active assessments' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions or access to this department' },
        { status: 404, code: 'QUESTION_NOT_FOUND', message: 'Question not found' }
      ]
    },

    example: {
      request: {
        questionText: 'What is the capital city of France?',
        difficulty: 'easy',
        tags: ['geography', 'europe', 'capitals', 'france'],
        explanation: 'Paris has been the capital of France since the 12th century.'
      },
      response: {
        success: true,
        message: 'Question updated successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          questionText: 'What is the capital city of France?',
          questionType: 'multiple_choice',
          options: [
            { text: 'London', isCorrect: false },
            { text: 'Paris', isCorrect: true },
            { text: 'Berlin', isCorrect: false },
            { text: 'Madrid', isCorrect: false }
          ],
          correctAnswer: 'Paris',
          points: 1,
          difficulty: 'easy',
          tags: ['geography', 'europe', 'capitals', 'france'],
          explanation: 'Paris has been the capital of France since the 12th century.',
          department: '507f1f77bcf86cd799439012',
          createdBy: '507f1f77bcf86cd799439011',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:questions'],

    notes: `
      - Only updates provided fields (partial update)
      - Validates consistency between questionType and options/correctAnswer
      - Cannot update questions that are in use in active assessments (returns 400)
      - User must have access to the question's department
      - Changing questionType requires updating options/correctAnswer to match
      - updatedAt automatically updated
      - Tags are normalized to lowercase
    `
  },

  /**
   * Delete Question
   */
  delete: {
    endpoint: '/api/v2/questions/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a question from the question bank',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Question ID'
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
        { status: 400, code: 'QUESTION_IN_USE', message: 'Cannot delete question that is in use in assessments' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions or access to this department' },
        { status: 404, code: 'QUESTION_NOT_FOUND', message: 'Question not found' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        message: 'Question deleted successfully'
      }
    },

    permissions: ['write:questions'],

    notes: `
      - Soft delete (marks as deleted but preserves data)
      - Cannot delete questions that are currently in use in assessments
      - User must have access to the question's department
      - Deleted questions remain in database for audit/recovery
      - To force delete a question in use, must first remove from all assessments
      - Global admins can delete any question (with same constraints)
    `
  },

  /**
   * Bulk Import Questions
   */
  bulkImport: {
    endpoint: '/api/v2/questions/bulk',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Bulk import multiple questions (CSV or JSON format)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        format: {
          type: 'string',
          required: true,
          enum: ['json', 'csv'],
          description: 'Import format'
        },
        questions: {
          type: 'array',
          required: true,
          description: 'Array of questions to import',
          items: {
            questionText: {
              type: 'string',
              required: true,
              minLength: 1,
              maxLength: 2000
            },
            questionType: {
              type: 'string',
              required: true,
              enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank']
            },
            options: {
              type: 'array',
              required: false,
              items: {
                text: 'string',
                isCorrect: 'boolean'
              }
            },
            correctAnswer: {
              type: 'string | string[]',
              required: false
            },
            points: {
              type: 'number',
              required: true,
              min: 0.1
            },
            difficulty: {
              type: 'string',
              required: false,
              enum: ['easy', 'medium', 'hard'],
              default: 'medium'
            },
            tags: {
              type: 'array',
              required: false,
              items: {
                type: 'string'
              }
            },
            explanation: {
              type: 'string',
              required: false,
              maxLength: 1000
            }
          }
        },
        department: {
          type: 'ObjectId',
          required: false,
          description: 'Department for all imported questions (defaults to user\'s department)'
        },
        overwriteExisting: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'If true, updates existing questions with same text'
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
            imported: 'number',
            failed: 'number',
            updated: 'number',
            results: [
              {
                index: 'number',
                status: 'success|error',
                questionId: 'ObjectId | null',
                error: 'string | null'
              }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid import data format' },
        { status: 400, code: 'EMPTY_IMPORT', message: 'No questions provided for import' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' }
      ]
    },

    example: {
      request: {
        format: 'json',
        department: '507f1f77bcf86cd799439012',
        overwriteExisting: false,
        questions: [
          {
            questionText: 'What is 2 + 2?',
            questionType: 'multiple_choice',
            options: [
              { text: '3', isCorrect: false },
              { text: '4', isCorrect: true },
              { text: '5', isCorrect: false }
            ],
            points: 1,
            difficulty: 'easy',
            tags: ['math', 'arithmetic']
          },
          {
            questionText: 'The Earth is round.',
            questionType: 'true_false',
            options: [
              { text: 'True', isCorrect: true },
              { text: 'False', isCorrect: false }
            ],
            points: 1,
            difficulty: 'easy',
            tags: ['science', 'geography']
          },
          {
            questionText: 'Explain photosynthesis.',
            questionType: 'essay',
            points: 5,
            difficulty: 'medium',
            tags: ['biology', 'science'],
            explanation: 'Should include: sunlight, chlorophyll, carbon dioxide, water, glucose, oxygen'
          }
        ]
      },
      response: {
        success: true,
        message: 'Bulk import completed',
        data: {
          imported: 3,
          failed: 0,
          updated: 0,
          results: [
            {
              index: 0,
              status: 'success',
              questionId: '507f1f77bcf86cd799439021',
              error: null
            },
            {
              index: 1,
              status: 'success',
              questionId: '507f1f77bcf86cd799439022',
              error: null
            },
            {
              index: 2,
              status: 'success',
              questionId: '507f1f77bcf86cd799439023',
              error: null
            }
          ]
        }
      }
    },

    permissions: ['write:questions'],

    notes: `
      - Accepts JSON array or CSV format
      - CSV format should have headers: questionText, questionType, options, correctAnswer, points, difficulty, tags, explanation
      - For CSV multiple_choice: options format: "option1(correct)|option2|option3(correct)"
      - For CSV tags: comma-separated values
      - Validates each question individually
      - Continues processing even if some questions fail
      - Returns detailed results for each question
      - overwriteExisting=true will update questions with matching questionText
      - All questions assigned to same department (user's department or specified)
      - Maximum 1000 questions per bulk import
      - Duplicate detection based on questionText (case-insensitive)
      - Failed imports don't rollback successful ones
    `
  }
};

// Type exports for consumers
export type QuestionsContractType = typeof QuestionsContracts;
export type QuestionListRequest = typeof QuestionsContracts.list.request.query;
export type QuestionListResponse = typeof QuestionsContracts.list.example.response;
export type QuestionCreateRequest = typeof QuestionsContracts.create.example.request;
export type QuestionCreateResponse = typeof QuestionsContracts.create.example.response;
export type QuestionDetailsResponse = typeof QuestionsContracts.getById.example.response;
export type QuestionUpdateRequest = typeof QuestionsContracts.update.example.request;
export type QuestionBulkImportRequest = typeof QuestionsContracts.bulkImport.example.request;
export type QuestionBulkImportResponse = typeof QuestionsContracts.bulkImport.example.response;
