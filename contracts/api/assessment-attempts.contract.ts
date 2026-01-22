/**
 * Assessment Attempts API Contracts
 * Version: 1.0.0
 *
 * These contracts define the AssessmentAttempt entity - tracking learner attempts
 * on assessments including questions, responses, timing, and scoring.
 */

export const AssessmentAttemptsContracts = {
  /**
   * Start Assessment Attempt
   * POST /assessments/:assessmentId/attempts
   */
  start: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Start a new attempt on an assessment',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        assessmentId: { type: 'ObjectId', required: true, description: 'Assessment ID' }
      },
      body: {
        enrollmentId: {
          type: 'ObjectId',
          required: true,
          description: 'Class enrollment ID for this attempt'
        },
        moduleId: {
          type: 'ObjectId',
          required: false,
          description: 'Module ID if assessment is part of a module'
        },
        learningUnitId: {
          type: 'ObjectId',
          required: false,
          description: 'Learning unit ID if assessment is a learning unit'
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
            attemptId: 'ObjectId',
            assessmentId: 'ObjectId',
            assessmentTitle: 'string',
            attemptNumber: 'number',
            status: 'in_progress',
            questions: [
              {
                index: 'number',
                questionId: 'ObjectId',
                questionText: 'string',
                questionType: 'multiple-choice | true-false | short-answer | essay | fill-blank | matching',
                options: 'string[] | null',
                matchingPairs: 'object | null',
                points: 'number',
                hints: 'string[] | null'
              }
            ],
            totalQuestions: 'number',
            totalPoints: 'number',
            timing: {
              startedAt: 'Date',
              timeLimitSeconds: 'number | null',
              expiresAt: 'Date | null'
            },
            settings: {
              showFeedback: 'boolean',
              feedbackTiming: 'immediate | after_submit | after_grading',
              allowSkip: 'boolean'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'MAX_ATTEMPTS_REACHED', message: 'Maximum attempts reached for this assessment' },
        { status: 400, code: 'COOLDOWN_ACTIVE', message: 'Must wait before starting new attempt' },
        { status: 400, code: 'ATTEMPT_IN_PROGRESS', message: 'You have an unfinished attempt' },
        { status: 400, code: 'INSTRUCTOR_UNLOCK_REQUIRED', message: 'Instructor must unlock retake' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Not enrolled in this course' },
        { status: 404, code: 'ASSESSMENT_NOT_FOUND', message: 'Assessment not found' },
        { status: 404, code: 'ENROLLMENT_NOT_FOUND', message: 'Enrollment not found' }
      ]
    },

    example: {
      request: {
        params: { assessmentId: '507f1f77bcf86cd799439070' },
        body: {
          enrollmentId: '507f1f77bcf86cd799439100',
          moduleId: '507f1f77bcf86cd799439012',
          learningUnitId: '507f1f77bcf86cd799439041'
        }
      },
      response: {
        success: true,
        message: 'Assessment attempt started',
        data: {
          attemptId: '507f1f77bcf86cd799439200',
          assessmentId: '507f1f77bcf86cd799439070',
          assessmentTitle: 'Variables and Data Types Quiz',
          attemptNumber: 1,
          status: 'in_progress',
          questions: [
            {
              index: 0,
              questionId: '507f1f77bcf86cd799439150',
              questionText: 'What is a variable?',
              questionType: 'multiple-choice',
              options: [
                'A container for storing data',
                'A type of function',
                'A loop construct',
                'A comment'
              ],
              matchingPairs: null,
              points: 10,
              hints: ['Think about what holds values in programming']
            }
          ],
          totalQuestions: 10,
          totalPoints: 100,
          timing: {
            startedAt: '2026-01-08T10:00:00.000Z',
            timeLimitSeconds: 1800,
            expiresAt: '2026-01-08T10:30:00.000Z'
          },
          settings: {
            showFeedback: true,
            feedbackTiming: 'after_submit',
            allowSkip: true
          }
        }
      }
    },

    permissions: ['take:assessments'],

    notes: `
      - Questions are selected based on assessment's questionSelection rules
      - Questions are shuffled if assessment has shuffleQuestions enabled
      - Correct answers are NOT included in response (graded server-side)
      - timeLimitSeconds from assessment timing configuration
      - expiresAt calculated from startedAt + timeLimitSeconds
      - hints only included if assessment allows hints
    `
  },

  /**
   * Get Current Attempt
   * GET /assessments/:assessmentId/attempts/current
   */
  getCurrent: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts/current',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get the current in-progress attempt for an assessment',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        assessmentId: { type: 'ObjectId', required: true, description: 'Assessment ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            attemptId: 'ObjectId',
            assessmentId: 'ObjectId',
            attemptNumber: 'number',
            status: 'in_progress',
            questions: 'array (same as start)',
            responses: [
              {
                questionIndex: 'number',
                response: 'any',
                savedAt: 'Date'
              }
            ],
            timing: {
              startedAt: 'Date',
              lastActivityAt: 'Date',
              timeLimitSeconds: 'number | null',
              expiresAt: 'Date | null',
              timeRemainingSeconds: 'number | null'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'NO_ACTIVE_ATTEMPT', message: 'No in-progress attempt found' },
        { status: 404, code: 'ASSESSMENT_NOT_FOUND', message: 'Assessment not found' }
      ]
    },

    permissions: ['take:assessments'],

    notes: `
      - Returns existing in-progress attempt if one exists
      - Includes any saved responses from auto-save
      - Calculates timeRemainingSeconds based on current time
      - Use to resume an interrupted attempt
    `
  },

  /**
   * Save Progress (Auto-save)
   * PUT /assessments/:assessmentId/attempts/:attemptId
   */
  saveProgress: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts/:attemptId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Save progress on an in-progress attempt (auto-save)',

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
              questionIndex: { type: 'number', required: true },
              response: { type: 'any', required: true }
            }
          },
          description: 'Array of responses to save'
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
        { status: 400, code: 'ATTEMPT_EXPIRED', message: 'Attempt has expired' },
        { status: 400, code: 'ATTEMPT_NOT_IN_PROGRESS', message: 'Attempt is not in progress' },
        { status: 400, code: 'INVALID_QUESTION_INDEX', message: 'Question index out of range' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'This is not your attempt' },
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
            { questionIndex: 0, response: 'A container for storing data' },
            { questionIndex: 1, response: true },
            { questionIndex: 2, response: 'let x = 5;' }
          ]
        }
      },
      response: {
        success: true,
        message: 'Progress saved',
        data: {
          attemptId: '507f1f77bcf86cd799439200',
          savedResponses: 3,
          lastActivityAt: '2026-01-08T10:15:00.000Z',
          timeRemainingSeconds: 900
        }
      }
    },

    permissions: ['take:assessments'],

    notes: `
      - Called periodically by UI for auto-save (recommended every 30s)
      - Partial saves allowed (don't need all responses)
      - Validates attempt is still in progress and not expired
      - Updates lastActivityAt timestamp
      - Response format depends on question type
    `
  },

  /**
   * Submit Attempt
   * POST /assessments/:assessmentId/attempts/:attemptId/submit
   */
  submit: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts/:attemptId/submit',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Submit an attempt for grading',

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
          description: 'Final responses (optional if already saved)'
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
              requiresManualGrading: 'boolean',
              autoGradedQuestions: 'number',
              manualGradedQuestions: 'number'
            },
            timing: {
              startedAt: 'Date',
              submittedAt: 'Date',
              timeSpentSeconds: 'number'
            },
            feedback: 'object | null',
            canViewResults: 'boolean',
            attemptsRemaining: 'number | null',
            nextAttemptAvailableAt: 'Date | null'
          }
        }
      },
      errors: [
        { status: 400, code: 'ALREADY_SUBMITTED', message: 'Attempt has already been submitted' },
        { status: 400, code: 'ATTEMPT_EXPIRED', message: 'Attempt has expired and was auto-submitted' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'This is not your attempt' },
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
            { questionIndex: 0, response: 'A container for storing data' },
            { questionIndex: 1, response: true },
            { questionIndex: 2, response: 'let x = 5;' }
          ]
        }
      },
      response: {
        success: true,
        message: 'Assessment submitted successfully',
        data: {
          attemptId: '507f1f77bcf86cd799439200',
          status: 'graded',
          submittedAt: '2026-01-08T10:25:00.000Z',
          scoring: {
            rawScore: 85,
            percentageScore: 85,
            passed: true,
            gradingComplete: true,
            requiresManualGrading: false,
            autoGradedQuestions: 10,
            manualGradedQuestions: 0
          },
          timing: {
            startedAt: '2026-01-08T10:00:00.000Z',
            submittedAt: '2026-01-08T10:25:00.000Z',
            timeSpentSeconds: 1500
          },
          feedback: null,
          canViewResults: true,
          attemptsRemaining: 2,
          nextAttemptAvailableAt: '2026-01-08T11:25:00.000Z'
        }
      }
    },

    permissions: ['take:assessments'],

    notes: `
      - Final responses can be included or use previously saved responses
      - Auto-grading runs for objective questions immediately
      - Essay/short-answer questions marked as requiresManualGrading
      - Status is 'graded' if all auto-gradeable, 'submitted' if needs manual grading
      - canViewResults based on assessment's showCorrectAnswers setting
      - nextAttemptAvailableAt based on cooldown settings
    `
  },

  /**
   * Get Attempt Results
   * GET /assessments/:assessmentId/attempts/:attemptId/results
   */
  getResults: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts/:attemptId/results',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed results for a completed attempt',

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
          data: {
            attemptId: 'ObjectId',
            assessmentId: 'ObjectId',
            assessmentTitle: 'string',
            attemptNumber: 'number',
            status: 'submitted | graded',
            scoring: {
              rawScore: 'number',
              percentageScore: 'number',
              passed: 'boolean',
              gradingComplete: 'boolean'
            },
            timing: {
              startedAt: 'Date',
              submittedAt: 'Date',
              timeSpentSeconds: 'number'
            },
            questions: [
              {
                index: 'number',
                questionText: 'string',
                questionType: 'string',
                response: 'any',
                isCorrect: 'boolean | null',
                correctAnswer: 'any | null',
                pointsEarned: 'number',
                pointsPossible: 'number',
                feedback: 'string | null',
                explanation: 'string | null'
              }
            ],
            overallFeedback: 'string | null'
          }
        }
      },
      errors: [
        { status: 400, code: 'ATTEMPT_NOT_COMPLETE', message: 'Attempt has not been submitted yet' },
        { status: 400, code: 'RESULTS_NOT_AVAILABLE', message: 'Results not available yet based on assessment settings' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Not authorized to view these results' },
        { status: 404, code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' }
      ]
    },

    permissions: ['take:assessments', 'read:assessments'],

    notes: `
      - correctAnswer only included based on assessment's showCorrectAnswers setting
      - If showCorrectAnswers is 'after_all_attempts', only shows after max attempts used
      - feedback based on assessment's feedback settings
      - explanation from question's explanation field
      - Staff can view any learner's results
      - Learners can only view their own results
    `
  },

  /**
   * List Attempts for Assessment
   * GET /assessments/:assessmentId/attempts
   */
  list: {
    endpoint: '/api/v2/assessments/:assessmentId/attempts',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all attempts for an assessment (learner sees own, staff sees all)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        assessmentId: { type: 'ObjectId', required: true, description: 'Assessment ID' }
      },
      query: {
        learnerId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by learner (staff only)'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['in_progress', 'submitted', 'graded', 'abandoned'],
          description: 'Filter by status'
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
            assessmentId: 'ObjectId',
            assessmentTitle: 'string',
            attempts: [
              {
                attemptId: 'ObjectId',
                learnerId: 'ObjectId',
                learnerName: 'string',
                attemptNumber: 'number',
                status: 'string',
                scoring: {
                  percentageScore: 'number | null',
                  passed: 'boolean | null'
                },
                timing: {
                  startedAt: 'Date',
                  submittedAt: 'Date | null',
                  timeSpentSeconds: 'number'
                }
              }
            ],
            pagination: {
              page: 'number',
              limit: 'number',
              total: 'number',
              totalPages: 'number'
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

    permissions: ['take:assessments', 'read:assessments'],

    notes: `
      - Learners see only their own attempts
      - Staff see all attempts (can filter by learnerId)
      - Useful for attempt history and progress tracking
    `
  },

  /**
   * Grade Essay Question (Manual Grading)
   * POST /assessment-attempts/:attemptId/grade-question
   */
  gradeQuestion: {
    endpoint: '/api/v2/assessment-attempts/:attemptId/grade-question',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Manually grade a question (essay, short-answer)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        attemptId: { type: 'ObjectId', required: true, description: 'Attempt ID' }
      },
      body: {
        questionIndex: {
          type: 'number',
          required: true,
          description: 'Index of question to grade'
        },
        pointsEarned: {
          type: 'number',
          required: true,
          min: 0,
          description: 'Points to award (max: question points)'
        },
        feedback: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Feedback for the learner'
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
            updatedScoring: {
              rawScore: 'number',
              percentageScore: 'number',
              passed: 'boolean',
              gradingComplete: 'boolean'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'INVALID_QUESTION_INDEX', message: 'Question index out of range' },
        { status: 400, code: 'NOT_MANUAL_GRADE', message: 'Question does not require manual grading' },
        { status: 400, code: 'ALREADY_GRADED', message: 'Question has already been graded' },
        { status: 400, code: 'POINTS_EXCEED_MAX', message: 'Points cannot exceed question maximum' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to grade' },
        { status: 404, code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' }
      ]
    },

    example: {
      request: {
        params: { attemptId: '507f1f77bcf86cd799439200' },
        body: {
          questionIndex: 5,
          pointsEarned: 8,
          feedback: 'Good explanation but missed the key point about memory allocation.'
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
          gradedAt: '2026-01-09T14:00:00.000Z',
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

    permissions: ['grade:assessments'],

    notes: `
      - Only for essay, short-answer, or other manual-grade questions
      - Updates attempt status to 'graded' when all questions graded
      - Triggers notification to learner when grading complete
      - Points must be between 0 and question's maximum points
    `
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
