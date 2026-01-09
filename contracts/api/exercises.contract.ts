/**
 * Exercises & Exams API Contracts
 * Version: 1.0.0
 *
 * These contracts define the custom exercises and exam endpoints for the LMS API.
 * Covers creation, management, and question bank integration for custom assessments.
 * Both backend and UI teams use these as the source of truth.
 */

export const ExercisesContracts = {
  /**
   * List Exercises/Exams
   */
  list: {
    endpoint: '/api/v2/content/exercises',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all exercises/exams with filtering and pagination',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        page: { type: 'number', required: false, default: 1, min: 1 },
        limit: { type: 'number', required: false, default: 10, min: 1, max: 100 },
        type: {
          type: 'string',
          required: false,
          enum: ['quiz', 'exam', 'practice', 'assessment'],
          description: 'Filter by exercise type'
        },
        department: {
          type: 'string',
          required: false,
          description: 'Filter by department ID'
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
          description: 'Search by title or description'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-createdAt',
          description: 'Sort field (prefix with - for desc). Examples: title, -createdAt, difficulty'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['draft', 'published', 'archived'],
          description: 'Filter by publication status'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            exercises: [
              {
                id: 'string',
                title: 'string',
                description: 'string',
                type: 'quiz|exam|practice|assessment',
                department: 'ObjectId',
                difficulty: 'easy|medium|hard',
                timeLimit: 'number',
                passingScore: 'number',
                totalPoints: 'number',
                questionCount: 'number',
                shuffleQuestions: 'boolean',
                showFeedback: 'boolean',
                allowReview: 'boolean',
                status: 'draft|published|archived',
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view exercises' }
      ]
    },

    example: {
      request: {
        query: {
          type: 'quiz',
          department: '507f1f77bcf86cd799439012',
          page: 1,
          limit: 20,
          sort: '-createdAt'
        }
      },
      response: {
        success: true,
        data: {
          exercises: [
            {
              id: '507f1f77bcf86cd799439013',
              title: 'Introduction to CBT - Module 1 Quiz',
              description: 'Assessment covering basic concepts from Module 1',
              type: 'quiz',
              department: '507f1f77bcf86cd799439012',
              difficulty: 'easy',
              timeLimit: 1800,
              passingScore: 70,
              totalPoints: 100,
              questionCount: 10,
              shuffleQuestions: true,
              showFeedback: true,
              allowReview: true,
              status: 'published',
              createdBy: '507f1f77bcf86cd799439011',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-05T00:00:00.000Z'
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

    permissions: ['read:exercises'],

    notes: `
      - Returns exercises scoped to user's accessible departments
      - Global admins see all exercises
      - Staff see exercises from their departments only
      - Learners only see published exercises
      - questionCount is the number of questions associated with the exercise
      - totalPoints is sum of all question points
      - timeLimit is in seconds (0 = unlimited)
      - Supports full-text search on title and description
    `
  },

  /**
   * Create Exercise
   */
  create: {
    endpoint: '/api/v2/content/exercises',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new exercise or exam',

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
          description: 'Exercise title'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Detailed description or instructions'
        },
        type: {
          type: 'string',
          required: true,
          enum: ['quiz', 'exam', 'practice', 'assessment'],
          description: 'Type of exercise'
        },
        department: {
          type: 'ObjectId',
          required: true,
          description: 'Department ID this exercise belongs to'
        },
        difficulty: {
          type: 'string',
          required: false,
          enum: ['easy', 'medium', 'hard'],
          default: 'medium',
          description: 'Difficulty level'
        },
        timeLimit: {
          type: 'number',
          required: false,
          default: 0,
          min: 0,
          description: 'Time limit in seconds (0 = unlimited)'
        },
        passingScore: {
          type: 'number',
          required: false,
          default: 70,
          min: 0,
          max: 100,
          description: 'Passing score percentage (0-100)'
        },
        shuffleQuestions: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Randomize question order for each attempt'
        },
        showFeedback: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Show feedback after submission'
        },
        allowReview: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Allow learners to review answers after completion'
        },
        instructions: {
          type: 'string',
          required: false,
          description: 'Instructions displayed before starting the exercise'
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
            description: 'string',
            type: 'string',
            department: 'ObjectId',
            difficulty: 'string',
            timeLimit: 'number',
            passingScore: 'number',
            totalPoints: 'number',
            questionCount: 'number',
            shuffleQuestions: 'boolean',
            showFeedback: 'boolean',
            allowReview: 'boolean',
            instructions: 'string',
            status: 'draft',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to create exercises' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department does not exist' }
      ]
    },

    example: {
      request: {
        title: 'Introduction to CBT - Module 1 Quiz',
        description: 'Assessment covering basic concepts from Module 1',
        type: 'quiz',
        department: '507f1f77bcf86cd799439012',
        difficulty: 'easy',
        timeLimit: 1800,
        passingScore: 70,
        shuffleQuestions: true,
        showFeedback: true,
        allowReview: true,
        instructions: 'Read each question carefully. You have 30 minutes to complete this quiz.'
      },
      response: {
        success: true,
        message: 'Exercise created successfully',
        data: {
          id: '507f1f77bcf86cd799439013',
          title: 'Introduction to CBT - Module 1 Quiz',
          description: 'Assessment covering basic concepts from Module 1',
          type: 'quiz',
          department: '507f1f77bcf86cd799439012',
          difficulty: 'easy',
          timeLimit: 1800,
          passingScore: 70,
          totalPoints: 0,
          questionCount: 0,
          shuffleQuestions: true,
          showFeedback: true,
          allowReview: true,
          instructions: 'Read each question carefully. You have 30 minutes to complete this quiz.',
          status: 'draft',
          createdBy: '507f1f77bcf86cd799439011',
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:exercises'],

    notes: `
      - User must have write:exercises permission for the target department
      - Exercise starts in 'draft' status
      - No questions initially (questionCount: 0, totalPoints: 0)
      - Add questions using POST /exercises/:id/questions
      - timeLimit validation: 0 or positive integer (seconds)
      - passingScore validation: 0-100 (percentage)
      - Title must be unique within department
    `
  },

  /**
   * Get Exercise Details
   */
  getById: {
    endpoint: '/api/v2/content/exercises/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific exercise',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exercise ID'
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
            description: 'string',
            type: 'string',
            department: {
              id: 'string',
              name: 'string'
            },
            difficulty: 'string',
            timeLimit: 'number',
            passingScore: 'number',
            totalPoints: 'number',
            questionCount: 'number',
            shuffleQuestions: 'boolean',
            showFeedback: 'boolean',
            allowReview: 'boolean',
            instructions: 'string',
            status: 'string',
            createdBy: {
              id: 'string',
              firstName: 'string',
              lastName: 'string'
            },
            createdAt: 'Date',
            updatedAt: 'Date',
            statistics: {
              totalAttempts: 'number',
              averageScore: 'number',
              passRate: 'number'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this exercise' },
        { status: 404, code: 'NOT_FOUND', message: 'Exercise not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439013' }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439013',
          title: 'Introduction to CBT - Module 1 Quiz',
          description: 'Assessment covering basic concepts from Module 1',
          type: 'quiz',
          department: {
            id: '507f1f77bcf86cd799439012',
            name: 'Computer-Based Training'
          },
          difficulty: 'easy',
          timeLimit: 1800,
          passingScore: 70,
          totalPoints: 100,
          questionCount: 10,
          shuffleQuestions: true,
          showFeedback: true,
          allowReview: true,
          instructions: 'Read each question carefully. You have 30 minutes to complete this quiz.',
          status: 'published',
          createdBy: {
            id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Doe'
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z',
          statistics: {
            totalAttempts: 125,
            averageScore: 82.5,
            passRate: 0.89
          }
        }
      }
    },

    permissions: ['read:exercises'],

    notes: `
      - Returns populated department and creator information
      - Statistics included for staff users only
      - Learners only see published exercises
      - Staff can see draft exercises from their departments
      - Global admins see all exercises regardless of status
    `
  },

  /**
   * Update Exercise
   */
  update: {
    endpoint: '/api/v2/content/exercises/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update exercise details',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exercise ID'
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
        type: {
          type: 'string',
          required: false,
          enum: ['quiz', 'exam', 'practice', 'assessment']
        },
        difficulty: {
          type: 'string',
          required: false,
          enum: ['easy', 'medium', 'hard']
        },
        timeLimit: {
          type: 'number',
          required: false,
          min: 0
        },
        passingScore: {
          type: 'number',
          required: false,
          min: 0,
          max: 100
        },
        shuffleQuestions: {
          type: 'boolean',
          required: false
        },
        showFeedback: {
          type: 'boolean',
          required: false
        },
        allowReview: {
          type: 'boolean',
          required: false
        },
        instructions: {
          type: 'string',
          required: false
        },
        status: {
          type: 'string',
          required: false,
          enum: ['draft', 'published', 'archived'],
          description: 'Publication status'
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
            title: 'string',
            description: 'string',
            type: 'string',
            department: 'ObjectId',
            difficulty: 'string',
            timeLimit: 'number',
            passingScore: 'number',
            totalPoints: 'number',
            questionCount: 'number',
            shuffleQuestions: 'boolean',
            showFeedback: 'boolean',
            allowReview: 'boolean',
            instructions: 'string',
            status: 'string',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update this exercise' },
        { status: 404, code: 'NOT_FOUND', message: 'Exercise not found' },
        { status: 409, code: 'TITLE_EXISTS', message: 'Exercise with this title already exists in department' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439013' },
        body: {
          title: 'Introduction to CBT - Module 1 Quiz (Updated)',
          timeLimit: 2400,
          passingScore: 75,
          status: 'published'
        }
      },
      response: {
        success: true,
        message: 'Exercise updated successfully',
        data: {
          id: '507f1f77bcf86cd799439013',
          title: 'Introduction to CBT - Module 1 Quiz (Updated)',
          description: 'Assessment covering basic concepts from Module 1',
          type: 'quiz',
          department: '507f1f77bcf86cd799439012',
          difficulty: 'easy',
          timeLimit: 2400,
          passingScore: 75,
          totalPoints: 100,
          questionCount: 10,
          shuffleQuestions: true,
          showFeedback: true,
          allowReview: true,
          instructions: 'Read each question carefully. You have 30 minutes to complete this quiz.',
          status: 'published',
          createdBy: '507f1f77bcf86cd799439011',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-08T10:30:00.000Z'
        }
      }
    },

    permissions: ['write:exercises'],

    notes: `
      - User must have write:exercises permission for the exercise's department
      - Cannot change department via this endpoint
      - Validates passingScore: 0-100
      - Validates timeLimit: >= 0
      - Title uniqueness checked within department
      - Publishing requires at least one question
      - Cannot publish if questionCount === 0
      - Updating published exercise does not affect in-progress attempts
    `
  },

  /**
   * Delete Exercise
   */
  delete: {
    endpoint: '/api/v2/content/exercises/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete an exercise (soft delete)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exercise ID'
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete this exercise' },
        { status: 404, code: 'NOT_FOUND', message: 'Exercise not found' },
        { status: 409, code: 'CONFLICT', message: 'Cannot delete exercise with active attempts' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439013' }
      },
      response: {
        success: true,
        message: 'Exercise deleted successfully'
      }
    },

    permissions: ['write:exercises', 'delete:exercises'],

    notes: `
      - Soft delete: sets status to 'archived' instead of removing
      - Cannot delete if there are active (in_progress) attempts
      - Can delete if all attempts are completed
      - Associated questions remain in question bank
      - Learners lose access to archived exercises
      - Staff can still view archived exercises
      - Hard delete restricted to global admins only (separate endpoint)
    `
  },

  /**
   * Get Questions in Exercise
   */
  getQuestions: {
    endpoint: '/api/v2/content/exercises/:id/questions',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all questions associated with an exercise',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exercise ID'
        }
      },
      query: {
        includeAnswers: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include correct answers (staff only)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            exerciseId: 'string',
            exerciseTitle: 'string',
            questionCount: 'number',
            totalPoints: 'number',
            questions: [
              {
                id: 'string',
                questionText: 'string',
                questionType: 'multiple_choice|true_false|short_answer|essay|matching',
                order: 'number',
                points: 'number',
                options: ['array of strings'],
                correctAnswer: 'string|string[]',
                explanation: 'string',
                difficulty: 'easy|medium|hard',
                tags: ['array of strings'],
                createdAt: 'Date'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view exercise questions' },
        { status: 404, code: 'NOT_FOUND', message: 'Exercise not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439013' },
        query: { includeAnswers: true }
      },
      response: {
        success: true,
        data: {
          exerciseId: '507f1f77bcf86cd799439013',
          exerciseTitle: 'Introduction to CBT - Module 1 Quiz',
          questionCount: 10,
          totalPoints: 100,
          questions: [
            {
              id: '507f1f77bcf86cd799439014',
              questionText: 'What does CBT stand for?',
              questionType: 'multiple_choice',
              order: 1,
              points: 10,
              options: [
                'Computer-Based Training',
                'Cognitive Behavioral Therapy',
                'Core Business Technology',
                'Certified Business Trainer'
              ],
              correctAnswer: 'Computer-Based Training',
              explanation: 'CBT stands for Computer-Based Training in the context of educational technology.',
              difficulty: 'easy',
              tags: ['terminology', 'basics'],
              createdAt: '2026-01-02T00:00:00.000Z'
            }
          ]
        }
      }
    },

    permissions: ['read:exercises'],

    notes: `
      - Questions returned in order (ascending)
      - correctAnswer field only included if:
        - includeAnswers=true AND user has write:exercises permission, OR
        - Exercise status is 'draft' AND user is creator
      - Learners never see correctAnswer field before completing attempt
      - totalPoints is sum of all question points
      - Options array only present for multiple_choice and matching types
      - Empty questions array if exercise has no questions yet
    `
  },

  /**
   * Add Question to Exercise
   */
  addQuestion: {
    endpoint: '/api/v2/content/exercises/:id/questions',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Add a new question or link existing question to exercise',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exercise ID'
        }
      },
      body: {
        questionId: {
          type: 'ObjectId',
          required: false,
          description: 'Existing question ID from question bank (if linking existing)'
        },
        questionText: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 2000,
          description: 'Question text (required if creating new question)'
        },
        questionType: {
          type: 'string',
          required: false,
          enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'matching'],
          description: 'Question type (required if creating new question)'
        },
        options: {
          type: 'array',
          required: false,
          description: 'Answer options (required for multiple_choice and matching)'
        },
        correctAnswer: {
          type: 'string|array',
          required: false,
          description: 'Correct answer(s)'
        },
        points: {
          type: 'number',
          required: false,
          default: 10,
          min: 0,
          description: 'Points for this question'
        },
        order: {
          type: 'number',
          required: false,
          description: 'Display order (auto-assigned if not provided)'
        },
        explanation: {
          type: 'string',
          required: false,
          description: 'Explanation shown after answer submission'
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
          description: 'Tags for categorization'
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
            exerciseId: 'string',
            question: {
              id: 'string',
              questionText: 'string',
              questionType: 'string',
              order: 'number',
              points: 'number',
              options: ['array'],
              correctAnswer: 'string|array',
              explanation: 'string',
              difficulty: 'string',
              tags: ['array'],
              createdAt: 'Date'
            },
            updatedTotals: {
              questionCount: 'number',
              totalPoints: 'number'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid question data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to add questions' },
        { status: 404, code: 'NOT_FOUND', message: 'Exercise or question not found' },
        { status: 409, code: 'QUESTION_EXISTS', message: 'Question already added to this exercise' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439013' },
        body: {
          questionText: 'What does CBT stand for?',
          questionType: 'multiple_choice',
          options: [
            'Computer-Based Training',
            'Cognitive Behavioral Therapy',
            'Core Business Technology',
            'Certified Business Trainer'
          ],
          correctAnswer: 'Computer-Based Training',
          points: 10,
          explanation: 'CBT stands for Computer-Based Training in the context of educational technology.',
          difficulty: 'easy',
          tags: ['terminology', 'basics']
        }
      },
      response: {
        success: true,
        message: 'Question added successfully',
        data: {
          exerciseId: '507f1f77bcf86cd799439013',
          question: {
            id: '507f1f77bcf86cd799439014',
            questionText: 'What does CBT stand for?',
            questionType: 'multiple_choice',
            order: 1,
            points: 10,
            options: [
              'Computer-Based Training',
              'Cognitive Behavioral Therapy',
              'Core Business Technology',
              'Certified Business Trainer'
            ],
            correctAnswer: 'Computer-Based Training',
            explanation: 'CBT stands for Computer-Based Training in the context of educational technology.',
            difficulty: 'easy',
            tags: ['terminology', 'basics'],
            createdAt: '2026-01-08T10:30:00.000Z'
          },
          updatedTotals: {
            questionCount: 1,
            totalPoints: 10
          }
        }
      }
    },

    permissions: ['write:exercises'],

    notes: `
      - Two modes: create new question OR link existing question
      - If questionId provided: links existing question from question bank
      - If questionId NOT provided: creates new question and links it
      - Order auto-assigned as max(existing orders) + 1 if not provided
      - For multiple_choice: options array required, must have 2-10 options
      - For true_false: correctAnswer must be 'true' or 'false'
      - For essay: correctAnswer optional (manual grading)
      - Question saved to global question bank for reuse
      - Cannot add questions to published exercises with active attempts
      - Automatically recalculates exercise totalPoints
    `
  },

  /**
   * Bulk Add Questions
   */
  bulkAddQuestions: {
    endpoint: '/api/v2/content/exercises/:id/questions/bulk',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Add multiple questions to exercise in one operation',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exercise ID'
        }
      },
      body: {
        questions: {
          type: 'array',
          required: true,
          minItems: 1,
          maxItems: 100,
          description: 'Array of question objects (same structure as single add)'
        },
        mode: {
          type: 'string',
          required: false,
          enum: ['append', 'replace'],
          default: 'append',
          description: 'append: add to existing questions, replace: remove all existing first'
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
            exerciseId: 'string',
            added: 'number',
            failed: 'number',
            errors: [
              {
                index: 'number',
                error: 'string'
              }
            ],
            updatedTotals: {
              questionCount: 'number',
              totalPoints: 'number'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid questions data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to add questions' },
        { status: 404, code: 'NOT_FOUND', message: 'Exercise not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439013' },
        body: {
          mode: 'append',
          questions: [
            {
              questionText: 'What does CBT stand for?',
              questionType: 'multiple_choice',
              options: ['Computer-Based Training', 'Cognitive Behavioral Therapy', 'Core Business Technology'],
              correctAnswer: 'Computer-Based Training',
              points: 10,
              difficulty: 'easy'
            },
            {
              questionText: 'CBT is used in corporate training. True or False?',
              questionType: 'true_false',
              correctAnswer: 'true',
              points: 5,
              difficulty: 'easy'
            }
          ]
        }
      },
      response: {
        success: true,
        message: '2 questions added successfully',
        data: {
          exerciseId: '507f1f77bcf86cd799439013',
          added: 2,
          failed: 0,
          errors: [],
          updatedTotals: {
            questionCount: 10,
            totalPoints: 100
          }
        }
      }
    },

    permissions: ['write:exercises'],

    notes: `
      - Processes all questions in a single transaction
      - If any question fails validation, entire operation rolls back
      - mode='replace': removes all existing questions first (cannot undo)
      - Orders assigned sequentially starting from 1
      - Maximum 100 questions per bulk operation
      - Returns detailed error information for failed questions
      - All questions saved to question bank for reuse
      - Cannot bulk add to exercises with active attempts
      - Useful for importing questions from external sources
    `
  },

  /**
   * Remove Question from Exercise
   */
  removeQuestion: {
    endpoint: '/api/v2/content/exercises/:id/questions/:questionId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Remove a question from an exercise',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exercise ID'
        },
        questionId: {
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
          message: 'string',
          data: {
            exerciseId: 'string',
            removedQuestionId: 'string',
            updatedTotals: {
              questionCount: 'number',
              totalPoints: 'number'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to remove questions' },
        { status: 404, code: 'NOT_FOUND', message: 'Exercise or question not found' },
        { status: 409, code: 'CONFLICT', message: 'Cannot remove question from published exercise with active attempts' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439013',
          questionId: '507f1f77bcf86cd799439014'
        }
      },
      response: {
        success: true,
        message: 'Question removed from exercise',
        data: {
          exerciseId: '507f1f77bcf86cd799439013',
          removedQuestionId: '507f1f77bcf86cd799439014',
          updatedTotals: {
            questionCount: 9,
            totalPoints: 90
          }
        }
      }
    },

    permissions: ['write:exercises'],

    notes: `
      - Removes association between exercise and question
      - Question remains in question bank (not deleted)
      - Automatically recalculates exercise totalPoints and questionCount
      - Reorders remaining questions to fill gaps
      - Cannot remove from published exercise with active attempts
      - If last question removed, exercise status changes to 'draft'
      - Consider using PATCH to update question order after removal
    `
  },

  /**
   * Reorder Questions
   */
  reorderQuestions: {
    endpoint: '/api/v2/content/exercises/:id/questions/reorder',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Update the order of questions in an exercise',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exercise ID'
        }
      },
      body: {
        questionIds: {
          type: 'array',
          required: true,
          description: 'Ordered array of question IDs (must include all questions)'
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
            exerciseId: 'string',
            questionCount: 'number',
            updatedOrder: [
              {
                questionId: 'string',
                order: 'number'
              }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid question IDs or missing questions' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to reorder questions' },
        { status: 404, code: 'NOT_FOUND', message: 'Exercise not found' },
        { status: 409, code: 'CONFLICT', message: 'Cannot reorder questions in exercise with active attempts' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439013' },
        body: {
          questionIds: [
            '507f1f77bcf86cd799439016',
            '507f1f77bcf86cd799439014',
            '507f1f77bcf86cd799439015'
          ]
        }
      },
      response: {
        success: true,
        message: 'Questions reordered successfully',
        data: {
          exerciseId: '507f1f77bcf86cd799439013',
          questionCount: 3,
          updatedOrder: [
            { questionId: '507f1f77bcf86cd799439016', order: 1 },
            { questionId: '507f1f77bcf86cd799439014', order: 2 },
            { questionId: '507f1f77bcf86cd799439015', order: 3 }
          ]
        }
      }
    },

    permissions: ['write:exercises'],

    notes: `
      - Must include ALL question IDs currently in exercise
      - Array order determines new question order (1-indexed)
      - Validates that all provided IDs exist in exercise
      - Validates no duplicate IDs in array
      - Cannot reorder during active attempts
      - Reordering does not affect completed attempts
      - Order is automatically applied on next attempt
      - If shuffleQuestions is enabled, this defines base order before shuffling
    `
  }
};

// Type exports for consumers
export type ExercisesContractType = typeof ExercisesContracts;
export type ExerciseListRequest = typeof ExercisesContracts.list.example.request;
export type ExerciseListResponse = typeof ExercisesContracts.list.example.response;
export type ExerciseCreateRequest = typeof ExercisesContracts.create.example.request;
export type ExerciseCreateResponse = typeof ExercisesContracts.create.example.response;
export type ExerciseDetailsResponse = typeof ExercisesContracts.getById.example.response;
export type ExerciseQuestionsResponse = typeof ExercisesContracts.getQuestions.example.response;
export type AddQuestionRequest = typeof ExercisesContracts.addQuestion.example.request;
export type BulkAddQuestionsRequest = typeof ExercisesContracts.bulkAddQuestions.example.request;
