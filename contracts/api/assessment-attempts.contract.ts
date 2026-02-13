/**
 * Assessment Attempts API Contracts
 * Version: 2.0.0
 *
 * Canonical contract:
 * - assessmentId is the authoritative attempt target.
 * - learningUnitId is optional launch context/provenance.
 * - If learningUnitId is provided, backend must validate
 *   learningUnit.contentId === assessmentId.
 */

export const AssessmentAttemptsContracts = {
  /**
   * Start Assessment Attempt
   * POST /assessments/:assessmentId/attempts/start
   */
  start: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts/start',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Start a new attempt on an assessment',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        assessmentId: { type: 'ObjectId', required: true, description: 'Assessment ID (authoritative attempt target)' }
      },
      body: {
        enrollmentId: {
          type: 'ObjectId',
          required: true,
          description: 'Enrollment ID for learner/course context'
        },
        moduleId: {
          type: 'ObjectId',
          required: false,
          description: 'Module context (optional provenance)'
        },
        learningUnitId: {
          type: 'ObjectId',
          required: false,
          description: 'Learning unit launch context; must resolve to the same assessment via learningUnit.contentId'
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
            _id: 'ObjectId',
            assessmentId: 'ObjectId',
            enrollmentId: 'ObjectId',
            moduleId: 'ObjectId | null',
            learningUnitId: 'ObjectId | null',
            attemptNumber: 'number',
            status: 'in_progress',
            questions: 'array',
            timing: 'object',
            scoring: 'object',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'LEARNING_UNIT_ASSESSMENT_MISMATCH', message: 'learningUnitId does not map to the provided assessmentId' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'ASSESSMENT_NOT_FOUND', message: 'Assessment not found or not published' },
        { status: 404, code: 'LEARNING_UNIT_NOT_FOUND', message: 'Learning unit not found' },
        { status: 409, code: 'ATTEMPT_IN_PROGRESS', message: 'An attempt is already in progress for this assessment' },
        { status: 409, code: 'MAX_ATTEMPTS_REACHED', message: 'Maximum attempts reached for this assessment' },
        { status: 422, code: 'VALIDATION_ERROR', message: 'enrollmentId is required and all IDs must be valid ObjectIds' },
        { status: 403, code: 'FORBIDDEN', message: 'Not permitted to start this attempt' },
        { status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected server error' }
      ]
    },

    example: {
      request: {
        params: { assessmentId: '507f1f77bcf86cd799439070' },
        body: {
          enrollmentId: '507f1f77bcf86cd799439100',
          learningUnitId: '507f1f77bcf86cd799439041'
        }
      },
      response: {
        success: true,
        message: 'Assessment attempt started',
        data: {
          _id: '507f1f77bcf86cd799439200',
          assessmentId: '507f1f77bcf86cd799439070',
          enrollmentId: '507f1f77bcf86cd799439100',
          moduleId: '507f1f77bcf86cd799439012',
          learningUnitId: '507f1f77bcf86cd799439041',
          attemptNumber: 1,
          status: 'in_progress',
          questions: [],
          timing: {
            startedAt: '2026-02-13T10:00:00.000Z',
            lastActivityAt: '2026-02-13T10:00:00.000Z',
            timeSpentSeconds: 0
          },
          scoring: {
            gradingComplete: false,
            requiresManualGrading: false
          },
          createdAt: '2026-02-13T10:00:00.000Z',
          updatedAt: '2026-02-13T10:00:00.000Z'
        }
      }
    },

    permissions: ['take:assessments'],

    notes: `
      - assessmentId is the canonical identifier for attempt lifecycle APIs
      - learningUnitId is optional and used for launch provenance/analytics
      - if learningUnitId is supplied, backend validates learningUnit.contentId === assessmentId
    `
  },

  /**
   * List Attempts for Assessment
   * GET /assessments/:assessmentId/attempts
   */
  list: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'List attempts for an assessment (own attempts for learner; filterable for staff)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        assessmentId: { type: 'ObjectId', required: true, description: 'Assessment ID' }
      },
      query: {
        learnerId: { type: 'ObjectId', required: false, description: 'Staff-only learner filter' },
        status: {
          type: 'string',
          required: false,
          enum: ['in_progress', 'submitted', 'graded', 'abandoned'],
          description: 'Attempt status'
        },
        page: { type: 'number', required: false, default: 1 },
        limit: { type: 'number', required: false, default: 20 }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            attempts: 'array',
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
        { status: 404, code: 'ASSESSMENT_NOT_FOUND', message: 'Assessment not found' }
      ]
    },

    permissions: ['take:assessments', 'read:assessments']
  },

  /**
   * List Attempts Across Assessments (Staff Aggregate)
   * GET /assessment-attempts
   */
  listAll: {
    endpoint: '/api/v2/assessment-attempts',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'Staff aggregate list/search/filter across assessment attempts',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        assessmentId: { type: 'ObjectId', required: false, description: 'Filter by assessment ID' },
        learnerId: { type: 'ObjectId', required: false, description: 'Filter by learner ID' },
        enrollmentId: { type: 'ObjectId', required: false, description: 'Filter by enrollment ID' },
        search: { type: 'string', required: false, description: 'Search by learner name/email, assessment title, status, or IDs' },
        status: {
          type: 'string',
          required: false,
          enum: ['in_progress', 'submitted', 'graded', 'abandoned'],
          description: 'Attempt status'
        },
        sort: { type: 'string', required: false, default: '-updatedAt' },
        page: { type: 'number', required: false, default: 1 },
        limit: { type: 'number', required: false, default: 20 }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            attempts: [
              {
                id: 'ObjectId',
                assessmentId: 'ObjectId',
                assessmentTitle: 'string | undefined',
                learnerId: 'ObjectId',
                learnerName: 'string | undefined',
                learnerEmail: 'string | undefined',
                enrollmentId: 'ObjectId',
                attemptNumber: 'number',
                status: 'in_progress | submitted | graded | abandoned',
                scoring: 'object',
                timing: 'object',
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
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid filters' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Only staff can access aggregate attempt queries' }
      ]
    },

    permissions: ['read:assessments', 'grade:assessments']
  },

  /**
   * List Current User Attempts
   * GET /assessments/:assessmentId/attempts/my
   */
  getCurrent: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts/my',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'List current authenticated user attempts for an assessment',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        assessmentId: { type: 'ObjectId', required: true, description: 'Assessment ID' }
      },
      query: {
        status: {
          type: 'string',
          required: false,
          enum: ['in_progress', 'submitted', 'graded', 'abandoned']
        },
        page: { type: 'number', required: false, default: 1 },
        limit: { type: 'number', required: false, default: 20 }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            attempts: 'array',
            pagination: 'object'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'ASSESSMENT_NOT_FOUND', message: 'Assessment not found' }
      ]
    },

    permissions: ['take:assessments']
  },

  /**
   * Get Attempt by ID
   * GET /assessments/:assessmentId/attempts/:attemptId
   */
  getResults: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts/:attemptId',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'Get attempt details/results by attempt ID',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        assessmentId: { type: 'ObjectId', required: true, description: 'Assessment ID' },
        attemptId: { type: 'ObjectId', required: true, description: 'Attempt ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'Attempt object with scoring/timing/questions'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Not authorized to view this attempt' },
        { status: 404, code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' }
      ]
    },

    permissions: ['take:assessments', 'read:assessments']
  },

  /**
   * Get Attempt by Attempt ID (Staff Aggregate Surface)
   * GET /assessment-attempts/:attemptId
   */
  getByAttemptId: {
    endpoint: '/api/v2/assessment-attempts/:attemptId',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'Staff attempt detail lookup by attemptId',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        attemptId: { type: 'ObjectId', required: true, description: 'Attempt ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'AssessmentAttempt with assessment and learner context'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Only staff can access attempt detail by attemptId' },
        { status: 404, code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' }
      ]
    },

    permissions: ['read:assessments', 'grade:assessments']
  },

  /**
   * Save Progress (Auto-save)
   * PUT /assessments/:assessmentId/attempts/:attemptId/save
   */
  saveProgress: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts/:attemptId/save',
    method: 'PUT' as const,
    version: '2.0.0',
    description: 'Save in-progress responses for an attempt',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        assessmentId: { type: 'ObjectId', required: true, description: 'Assessment ID' },
        attemptId: { type: 'ObjectId', required: true, description: 'Attempt ID' }
      },
      body: {
        responses: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            properties: {
              questionId: { type: 'ObjectId', required: true },
              response: { type: 'any', required: true }
            }
          },
          description: 'Question responses keyed by questionId'
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
            attemptId: 'ObjectId',
            savedResponses: 'number',
            lastActivityAt: 'Date',
            timeRemainingSeconds: 'number | null'
          }
        }
      },
      errors: [
        { status: 409, code: 'ATTEMPT_NOT_IN_PROGRESS', message: 'Attempt is not in progress' },
        { status: 409, code: 'TIME_LIMIT_EXCEEDED', message: 'Time limit exceeded' },
        { status: 422, code: 'VALIDATION_ERROR', message: 'responses must be a non-empty array of { questionId, response }' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' }
      ]
    },

    example: {
      request: {
        params: {
          assessmentId: '507f1f77bcf86cd799439070',
          attemptId: '507f1f77bcf86cd799439200'
        },
        body: {
          responses: [
            { questionId: '507f1f77bcf86cd799439150', response: 'A container for storing data' },
            { questionId: '507f1f77bcf86cd799439151', response: true }
          ]
        }
      },
      response: {
        success: true,
        message: 'Progress saved',
        data: {
          attemptId: '507f1f77bcf86cd799439200',
          savedResponses: 2,
          lastActivityAt: '2026-02-13T10:15:00.000Z',
          timeRemainingSeconds: 900
        }
      }
    },

    permissions: ['take:assessments']
  },

  /**
   * Submit Attempt
   * POST /assessments/:assessmentId/attempts/:attemptId/submit
   */
  submit: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts/:attemptId/submit',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Submit attempt for grading',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        assessmentId: { type: 'ObjectId', required: true, description: 'Assessment ID' },
        attemptId: { type: 'ObjectId', required: true, description: 'Attempt ID' }
      },
      body: {
        responses: {
          type: 'array',
          required: false,
          description: 'Optional final responses to save before submit',
          items: {
            type: 'object',
            properties: {
              questionId: { type: 'ObjectId', required: true },
              response: { type: 'any', required: true }
            }
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
            attemptId: 'ObjectId',
            status: 'submitted | graded',
            submittedAt: 'Date',
            scoring: {
              rawScore: 'number',
              percentageScore: 'number',
              passed: 'boolean',
              gradingComplete: 'boolean',
              requiresManualGrading: 'boolean'
            },
            timing: {
              startedAt: 'Date',
              submittedAt: 'Date',
              timeSpentSeconds: 'number'
            }
          }
        }
      },
      errors: [
        { status: 409, code: 'ALREADY_SUBMITTED', message: 'Attempt has already been submitted' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' }
      ]
    },

    example: {
      request: {
        params: {
          assessmentId: '507f1f77bcf86cd799439070',
          attemptId: '507f1f77bcf86cd799439200'
        },
        body: {
          responses: [
            { questionId: '507f1f77bcf86cd799439150', response: 'A container for storing data' }
          ]
        }
      },
      response: {
        success: true,
        message: 'Assessment submitted successfully',
        data: {
          attemptId: '507f1f77bcf86cd799439200',
          status: 'graded',
          submittedAt: '2026-02-13T10:25:00.000Z',
          scoring: {
            rawScore: 85,
            percentageScore: 85,
            passed: true,
            gradingComplete: true,
            requiresManualGrading: false
          },
          timing: {
            startedAt: '2026-02-13T10:00:00.000Z',
            submittedAt: '2026-02-13T10:25:00.000Z',
            timeSpentSeconds: 1500
          }
        }
      }
    },

    permissions: ['take:assessments']
  },

  /**
   * Grade Essay/Manual Question
   * POST /assessments/:assessmentId/attempts/:attemptId/grade
   */
  gradeQuestion: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts/:attemptId/grade',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Manually grade a question (essay, short-answer)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        assessmentId: { type: 'ObjectId', required: true, description: 'Assessment ID' },
        attemptId: { type: 'ObjectId', required: true, description: 'Attempt ID' }
      },
      body: {
        questionIndex: {
          type: 'number',
          required: true,
          description: 'Index of question to grade'
        },
        score: {
          type: 'number',
          required: true,
          min: 0,
          description: 'Score to award for this question'
        },
        feedback: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Feedback for learner'
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
            attemptId: 'ObjectId',
            questionIndex: 'number',
            pointsEarned: 'number',
            pointsPossible: 'number',
            gradedAt: 'Date',
            gradedBy: 'ObjectId',
            updatedScoring: 'object'
          }
        }
      },
      errors: [
        { status: 400, code: 'INVALID_QUESTION_INDEX', message: 'Question index out of range' },
        { status: 409, code: 'ATTEMPT_NOT_SUBMITTED', message: 'Attempt must be submitted before grading' },
        { status: 422, code: 'VALIDATION_ERROR', message: 'questionIndex and score are required; score must be >= 0' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' }
      ]
    },

    example: {
      request: {
        params: {
          assessmentId: '507f1f77bcf86cd799439070',
          attemptId: '507f1f77bcf86cd799439200'
        },
        body: {
          questionIndex: 5,
          score: 8,
          feedback: 'Good explanation but missed one key detail.'
        }
      },
      response: {
        success: true,
        message: 'Question graded successfully',
        data: {
          attemptId: '507f1f77bcf86cd799439200',
          questionIndex: 5,
          pointsEarned: 8,
          pointsPossible: 10,
          gradedAt: '2026-02-13T14:00:00.000Z',
          gradedBy: '507f1f77bcf86cd799439030',
          updatedScoring: {
            rawScore: 88,
            percentageScore: 88,
            passed: true,
            gradingComplete: true
          }
        }
      }
    },

    permissions: ['grade:assessments']
  },

  /**
   * Grade Question by Attempt ID (Staff Aggregate Surface)
   * POST /assessment-attempts/:attemptId/grade
   */
  gradeByAttemptId: {
    endpoint: '/api/v2/assessment-attempts/:attemptId/grade',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Manually grade a question using attemptId-only route',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        attemptId: { type: 'ObjectId', required: true, description: 'Attempt ID' }
      },
      body: {
        questionIndex: { type: 'number', required: true },
        score: { type: 'number', required: true, min: 0 },
        feedback: { type: 'string', required: false, maxLength: 2000 }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            attemptId: 'ObjectId',
            questionIndex: 'number',
            pointsEarned: 'number',
            pointsPossible: 'number',
            gradedAt: 'Date',
            gradedBy: 'ObjectId',
            updatedScoring: 'object'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'questionIndex and score are required; score must be >= 0' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Only staff can grade attempts' },
        { status: 404, code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' },
        { status: 409, code: 'ATTEMPT_NOT_SUBMITTED', message: 'Attempt must be submitted before grading' }
      ]
    },

    permissions: ['grade:assessments']
  }
};

// Type exports for consumers
export type AssessmentAttemptsContractType = typeof AssessmentAttemptsContracts;
export type StartAttemptRequest = typeof AssessmentAttemptsContracts.start.example.request;
export type StartAttemptResponse = typeof AssessmentAttemptsContracts.start.example.response;
export type SaveProgressRequest = typeof AssessmentAttemptsContracts.saveProgress.example.request;
export type SubmitAttemptRequest = typeof AssessmentAttemptsContracts.submit.example.request;
export type SubmitAttemptResponse = typeof AssessmentAttemptsContracts.submit.example.response;
export type GradeQuestionRequest = typeof AssessmentAttemptsContracts.gradeQuestion.example.request;
