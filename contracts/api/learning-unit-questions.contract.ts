/**
 * Learning Unit Questions API Contracts
 * Version: 1.0.0
 *
 * These contracts define the endpoints for linking questions from Question Banks
 * to Learning Units (Exercise/Assessment types), and learner progress tracking.
 *
 * Base paths:
 * - /api/v2/learning-units/:learningUnitId/questions (Question linking)
 * - /api/v2/learning-units/:learningUnitId/progress/:learnerId/questions (Progress tracking)
 * - /api/v2/learning-units/:learningUnitId/ai-quiz (AI Quiz - shell)
 *
 * Related: UI-ISS-068 (Learning Activity Flow)
 */

export const LearningUnitQuestionsContracts = {
  // ============================================
  // QUESTION LINKING
  // ============================================

  /**
   * List Questions Linked to Learning Unit
   */
  listLinked: {
    endpoint: '/api/v2/learning-units/:learningUnitId/questions',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all questions linked to a learning unit',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
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
            learningUnitId: 'ObjectId',
            learningUnitTitle: 'string',
            questions: [
              {
                id: 'ObjectId (link ID)',
                questionId: 'ObjectId',
                learningUnitId: 'ObjectId',
                sequence: 'number',
                pointsOverride: 'number | null',
                question: {
                  id: 'ObjectId',
                  type: 'string',
                  text: 'string',
                  difficulty: 'string',
                  points: 'number (original)',
                  tags: 'string[]',
                  options: 'array | null'
                }
              }
            ],
            totalQuestions: 'number',
            totalPoints: 'number'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this learning unit' },
        { status: 404, code: 'NOT_FOUND', message: 'Learning unit not found' }
      ]
    },

    permissions: ['content:assessments:manage', 'content:lessons:read'],

    notes: `
      - Returns questions in sequence order
      - pointsOverride=null means use question's original points
      - Includes expanded question data for display
    `
  },

  /**
   * Link Question to Learning Unit
   */
  linkQuestion: {
    endpoint: '/api/v2/learning-units/:learningUnitId/questions',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Link a question from question bank to learning unit',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        learningUnitId: { type: 'ObjectId', required: true }
      },
      body: {
        questionId: { type: 'ObjectId', required: true, description: 'Question to link' },
        sequence: { type: 'number', required: false, description: 'Order in assessment (auto-assigned if not provided)' },
        pointsOverride: { type: 'number', required: false, description: 'Override default points (null = use question default)' }
      }
    },

    response: {
      success: {
        status: 201,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            id: 'ObjectId (link ID)',
            questionId: 'ObjectId',
            learningUnitId: 'ObjectId',
            sequence: 'number',
            pointsOverride: 'number | null'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'ALREADY_LINKED', message: 'Question already linked to this learning unit' },
        { status: 400, code: 'INVALID_UNIT_TYPE', message: 'Learning unit type does not support questions' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this learning unit' },
        { status: 404, code: 'NOT_FOUND', message: 'Learning unit or question not found' }
      ]
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - Only learning units of type 'exercise' or 'assessment' support questions
      - Question must be from same department as learning unit's course
      - Sequence auto-increments if not provided
    `
  },

  /**
   * Bulk Link Questions
   */
  bulkLink: {
    endpoint: '/api/v2/learning-units/:learningUnitId/questions/bulk',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Link multiple questions to learning unit at once',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        learningUnitId: { type: 'ObjectId', required: true }
      },
      body: {
        questions: {
          type: 'array',
          required: true,
          description: 'Questions to link',
          items: {
            questionId: 'ObjectId',
            sequence: 'number (optional)',
            pointsOverride: 'number | null (optional)'
          }
        },
        replaceExisting: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'If true, removes existing links before adding new ones'
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
            linked: 'number',
            skipped: 'number (already linked)',
            removed: 'number (if replaceExisting)',
            links: [
              { questionId: 'ObjectId', linkId: 'ObjectId', sequence: 'number' }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'EMPTY_ARRAY', message: 'Questions array cannot be empty' },
        { status: 400, code: 'INVALID_UNIT_TYPE', message: 'Learning unit type does not support questions' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this learning unit' },
        { status: 404, code: 'NOT_FOUND', message: 'Learning unit or questions not found' }
      ]
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - Efficient for linking multiple questions at once
      - If sequence not provided, questions are appended in array order
      - replaceExisting=true is useful for "save all" operations
      - Skips already-linked questions (unless replaceExisting)
    `
  },

  /**
   * Update Question Link
   */
  updateLink: {
    endpoint: '/api/v2/learning-units/:learningUnitId/questions/:linkId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update sequence or points override for a linked question',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        learningUnitId: { type: 'ObjectId', required: true },
        linkId: { type: 'ObjectId', required: true, description: 'Link ID (not question ID)' }
      },
      body: {
        sequence: { type: 'number', required: false },
        pointsOverride: { type: 'number | null', required: false }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: '{ ...updated link }'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this learning unit' },
        { status: 404, code: 'NOT_FOUND', message: 'Link not found' }
      ]
    },

    permissions: ['content:assessments:manage']
  },

  /**
   * Unlink Question
   */
  unlinkQuestion: {
    endpoint: '/api/v2/learning-units/:learningUnitId/questions/:linkId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Remove question link from learning unit',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        learningUnitId: { type: 'ObjectId', required: true },
        linkId: { type: 'ObjectId', required: true }
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
        { status: 403, code: 'FORBIDDEN', message: 'No access to this learning unit' },
        { status: 404, code: 'NOT_FOUND', message: 'Link not found' }
      ]
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - Does not delete the question itself, only the link
      - Question remains in question bank
    `
  },

  // ============================================
  // QUESTION SELECTION SETTINGS (Learning Unit Extension)
  // ============================================

  /**
   * Question Selection Settings
   * These fields extend the Learning Unit settings object
   */
  questionSelectionSettings: {
    description: 'Extended settings for learning units with questions (exercise/assessment types)',
    fields: {
      questionSelection: {
        mode: {
          type: 'string',
          enum: ['manual', 'random', 'adaptive'],
          default: 'manual',
          description: 'How questions are selected for each attempt'
        },
        randomCount: {
          type: 'number | null',
          description: 'Number of questions to randomly select (random mode)'
        },
        filters: {
          type: 'object | null',
          description: 'Filters for random selection',
          properties: {
            type: 'string | string[]',
            difficulty: 'string | string[]',
            tags: 'string[]',
            bankId: 'ObjectId | ObjectId[]'
          }
        },
        randomizationLevel: {
          type: 'string',
          enum: ['in_order', 'by_difficulty', 'completely_random'],
          default: 'in_order',
          description: 'How to order questions within attempt'
        },
        repetitionThreshold: {
          type: 'number | null',
          description: 'Correct answers before question is "mastered" for this attempt cycle'
        },
        allowUserRandomizationChoice: {
          type: 'boolean',
          default: false,
          description: 'Allow learner to choose randomization level'
        }
      },
      adaptiveConfig: {
        type: 'object | null',
        description: 'Configuration for adaptive mode',
        properties: {
          skipRelatedOnCorrect: { type: 'boolean', default: true },
          repeatWrongAnswers: { type: 'boolean', default: true },
          repeatDelay: { type: 'number', default: 3, description: 'Questions between repeat' },
          difficultyProgression: {
            type: 'string',
            enum: ['increase_on_correct', 'decrease_on_wrong', 'maintain'],
            default: 'maintain'
          },
          maxDifficultyJump: { type: 'number', default: 1 },
          conceptMastery: {
            correctThreshold: { type: 'number', default: 3 },
            action: { type: 'string', enum: ['skip_related', 'reduce_weight', 'complete'] }
          }
        }
      }
    }
  },

  // ============================================
  // LEARNER PROGRESS TRACKING
  // ============================================

  /**
   * Get Learner Question Progress
   */
  getLearnerProgress: {
    endpoint: '/api/v2/learning-units/:learningUnitId/progress/:learnerId/questions',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get learner progress on questions in a learning unit',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        learningUnitId: { type: 'ObjectId', required: true },
        learnerId: { type: 'ObjectId', required: true }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            learnerId: 'ObjectId',
            learningUnitId: 'ObjectId',
            progress: [
              {
                questionId: 'ObjectId',
                correctCount: 'number',
                incorrectCount: 'number',
                lastAttemptAt: 'Date | null',
                isActive: 'boolean (still in rotation)',
                masteredAt: 'Date | null'
              }
            ],
            sessionStats: {
              questionsAnswered: 'number',
              correctThisSession: 'number',
              masteredThisSession: 'number',
              activeQuestionCount: 'number'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to view this progress' },
        { status: 404, code: 'NOT_FOUND', message: 'Learning unit or learner not found' }
      ]
    },

    permissions: ['content:assessments:manage', 'learner:progress:read'],

    notes: `
      - Staff can view any learner's progress
      - Learners can view their own progress
      - isActive=false when question is "mastered" based on repetitionThreshold
    `
  },

  /**
   * Update Question Progress (Internal - called by assessment engine)
   */
  updateQuestionProgress: {
    endpoint: '/api/v2/learning-units/:learningUnitId/progress/:learnerId/questions/:questionId',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Record learner answer to question (typically called by assessment engine)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        learningUnitId: { type: 'ObjectId', required: true },
        learnerId: { type: 'ObjectId', required: true },
        questionId: { type: 'ObjectId', required: true }
      },
      body: {
        isCorrect: { type: 'boolean', required: true },
        attemptId: { type: 'ObjectId', required: false, description: 'Assessment attempt ID' },
        timeSpent: { type: 'number', required: false, description: 'Seconds spent on question' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            questionId: 'ObjectId',
            correctCount: 'number',
            incorrectCount: 'number',
            isActive: 'boolean',
            masteredAt: 'Date | null',
            message: 'string (e.g., "Question mastered!")'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot update progress for this learner' },
        { status: 404, code: 'NOT_FOUND', message: 'Learning unit, learner, or question not found' }
      ]
    },

    permissions: ['content:assessments:manage', 'take:assessments'],

    notes: `
      - Increments correctCount or incorrectCount
      - Updates lastAttemptAt
      - Sets masteredAt when correctCount reaches repetitionThreshold
      - Sets isActive=false when mastered
    `
  },

  // ============================================
  // AI QUIZ (SHELL - LOW PRIORITY)
  // ============================================

  /**
   * Start AI Quiz Session (Shell)
   */
  aiQuizStart: {
    endpoint: '/api/v2/learning-units/:learningUnitId/ai-quiz/start',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Start an AI-assisted quiz session (SHELL - returns 501 until implemented)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        learningUnitId: { type: 'ObjectId', required: true }
      },
      body: {
        aiConfig: {
          type: 'object',
          required: false,
          properties: {
            enabled: { type: 'boolean', default: true },
            model: { type: 'string', default: 'default' },
            adaptationLevel: { type: 'string', enum: ['minimal', 'moderate', 'aggressive'], default: 'moderate' },
            allowQuestionGeneration: { type: 'boolean', default: false },
            questionBankScope: { type: 'ObjectId[]', description: 'Bank IDs to pull from' }
          }
        }
      }
    },

    response: {
      success: {
        status: 501,
        body: {
          success: false,
          error: 'NOT_IMPLEMENTED',
          message: 'AI Quiz feature is not yet implemented'
        }
      },
      errors: [
        { status: 501, code: 'NOT_IMPLEMENTED', message: 'AI Quiz feature is not yet implemented' }
      ]
    },

    permissions: ['take:assessments'],

    notes: `
      - LOW PRIORITY - Returns 501 Not Implemented until LLM integration ready
      - Shell endpoint allows UI to be built against expected contract
    `
  },

  /**
   * Submit AI Quiz Answer (Shell)
   */
  aiQuizAnswer: {
    endpoint: '/api/v2/learning-units/:learningUnitId/ai-quiz/:sessionId/answer',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Submit answer in AI quiz session (SHELL - returns 501 until implemented)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        learningUnitId: { type: 'ObjectId', required: true },
        sessionId: { type: 'ObjectId', required: true }
      },
      body: {
        questionId: { type: 'ObjectId', required: true },
        answer: { type: 'any', required: true },
        timeSpent: { type: 'number', required: false }
      }
    },

    response: {
      success: {
        status: 501,
        body: {
          success: false,
          error: 'NOT_IMPLEMENTED',
          message: 'AI Quiz feature is not yet implemented'
        }
      },
      errors: [
        { status: 501, code: 'NOT_IMPLEMENTED', message: 'AI Quiz feature is not yet implemented' }
      ]
    },

    permissions: ['take:assessments']
  },

  /**
   * Get AI Quiz Analytics (Shell)
   */
  aiQuizAnalytics: {
    endpoint: '/api/v2/learning-units/:learningUnitId/ai-quiz/analytics',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get AI quiz analytics (SHELL - returns 501 until implemented)',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        learningUnitId: { type: 'ObjectId', required: true }
      }
    },

    response: {
      success: {
        status: 501,
        body: {
          success: false,
          error: 'NOT_IMPLEMENTED',
          message: 'AI Quiz analytics not yet implemented'
        }
      },
      errors: [
        { status: 501, code: 'NOT_IMPLEMENTED', message: 'AI Quiz analytics not yet implemented' }
      ]
    },

    permissions: ['content:assessments:manage']
  }
};

// Type exports
export type LearningUnitQuestionsContractType = typeof LearningUnitQuestionsContracts;
