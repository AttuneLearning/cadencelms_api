/**
 * Flashcards API Contracts
 * Version: 1.0.0
 *
 * These contracts define the flashcard system endpoints including:
 * - Flashcard authoring (module-level)
 * - Course flashcard configuration
 * - Learner flashcard sessions and progress
 * - Retention checks and remediation
 *
 * See: dev_communication/specs/learning/FLASHCARD_FLOW_SPEC.md
 */

import { MediaContent } from '../types/media-types';

// ============================================================================
// Type Definitions
// ============================================================================

export type FlashcardDifficulty = 'easy' | 'medium' | 'hard';
export type CheckFrequency = 'every_module' | 'every_n_modules' | 'custom';
export type SelectionMethod = 'random' | 'weighted_by_difficulty' | 'sm2_priority';
export type RemediationStatus = 'pending' | 'content_reviewed' | 'final_retaken' | 'completed';

// ============================================================================
// Flashcard Item (Authoring)
// ============================================================================

export const FlashcardAuthoringContracts = {
  /**
   * List flashcards in a module
   */
  listByModule: {
    endpoint: '/api/v2/modules/:moduleId/flashcards',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all flashcards in a module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        moduleId: {
          type: 'ObjectId',
          required: true,
          description: 'Module ID'
        }
      },
      query: {
        difficulty: {
          type: 'string',
          required: false,
          enum: ['easy', 'medium', 'hard'],
          description: 'Filter by difficulty'
        },
        tags: {
          type: 'string',
          required: false,
          description: 'Comma-separated tags to filter by'
        },
        includeInactive: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include inactive flashcards'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            moduleId: 'string',
            moduleName: 'string',
            courseId: 'string',
            flashcards: [
              {
                id: 'string',
                front: 'MediaContent',
                back: 'MediaContent',
                tags: ['string'],
                difficulty: 'easy|medium|hard',
                order: 'number',
                isActive: 'boolean',
                createdBy: 'ObjectId',
                createdAt: 'Date',
                updatedAt: 'Date'
              }
            ],
            totalCount: 'number'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view flashcards' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found' }
      ]
    },

    permissions: ['read:modules'],

    notes: `
      - Returns flashcards ordered by 'order' field
      - Staff see all flashcards including inactive
      - Learners only see active flashcards for enrolled courses
      - MediaContent includes resolved CDN URLs for media
    `
  },

  /**
   * Create a flashcard
   */
  create: {
    endpoint: '/api/v2/modules/:moduleId/flashcards',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new flashcard in a module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        moduleId: {
          type: 'ObjectId',
          required: true,
          description: 'Module ID'
        }
      },
      body: {
        front: {
          type: 'MediaContent',
          required: true,
          description: 'Front of card (question/prompt)'
        },
        back: {
          type: 'MediaContent',
          required: true,
          description: 'Back of card (answer/explanation)'
        },
        tags: {
          type: 'array',
          required: false,
          description: 'Tags for categorization'
        },
        difficulty: {
          type: 'string',
          required: false,
          enum: ['easy', 'medium', 'hard'],
          default: 'medium',
          description: 'Difficulty level'
        },
        order: {
          type: 'number',
          required: false,
          description: 'Display order (auto-assigned if not provided)'
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
            moduleId: 'string',
            courseId: 'string',
            front: 'MediaContent',
            back: 'MediaContent',
            tags: ['string'],
            difficulty: 'string',
            order: 'number',
            isActive: 'boolean',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid flashcard data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to create flashcards' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found' }
      ]
    },

    example: {
      request: {
        params: { moduleId: '507f1f77bcf86cd799439013' },
        body: {
          front: {
            text: 'What is the powerhouse of the cell?',
            layout: 'text_only'
          },
          back: {
            text: 'The **mitochondria** is the powerhouse of the cell. It produces ATP through cellular respiration.',
            layout: 'text_only'
          },
          tags: ['biology', 'cell-structure'],
          difficulty: 'easy'
        }
      },
      response: {
        success: true,
        message: 'Flashcard created successfully',
        data: {
          id: '507f1f77bcf86cd799439014',
          moduleId: '507f1f77bcf86cd799439013',
          courseId: '507f1f77bcf86cd799439012',
          front: {
            text: 'What is the powerhouse of the cell?',
            layout: 'text_only'
          },
          back: {
            text: 'The **mitochondria** is the powerhouse of the cell. It produces ATP through cellular respiration.',
            layout: 'text_only'
          },
          tags: ['biology', 'cell-structure'],
          difficulty: 'easy',
          order: 1,
          isActive: true,
          createdBy: '507f1f77bcf86cd799439011',
          createdAt: '2026-01-28T10:00:00.000Z',
          updatedAt: '2026-01-28T10:00:00.000Z'
        }
      }
    },

    permissions: ['write:modules'],

    notes: `
      - MediaContent supports text with optional media attachments
      - Markdown supported in text fields
      - Media must be uploaded first via /api/v2/media/upload-url
      - Order auto-assigned as max(existing orders) + 1 if not provided
    `
  },

  /**
   * Update a flashcard
   */
  update: {
    endpoint: '/api/v2/modules/:moduleId/flashcards/:cardId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update a flashcard',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        moduleId: { type: 'ObjectId', required: true },
        cardId: { type: 'string', required: true }
      },
      body: {
        front: { type: 'MediaContent', required: false },
        back: { type: 'MediaContent', required: false },
        tags: { type: 'array', required: false },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], required: false },
        isActive: { type: 'boolean', required: false }
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
            moduleId: 'string',
            courseId: 'string',
            front: 'MediaContent',
            back: 'MediaContent',
            tags: ['string'],
            difficulty: 'string',
            order: 'number',
            isActive: 'boolean',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid flashcard data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'NOT_FOUND', message: 'Flashcard not found' }
      ]
    },

    permissions: ['write:modules']
  },

  /**
   * Delete a flashcard
   */
  delete: {
    endpoint: '/api/v2/modules/:moduleId/flashcards/:cardId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a flashcard (soft delete)',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        moduleId: { type: 'ObjectId', required: true },
        cardId: { type: 'string', required: true }
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
        { status: 404, code: 'NOT_FOUND', message: 'Flashcard not found' }
      ]
    },

    permissions: ['delete:modules'],

    notes: `
      - Soft delete: sets isActive to false
      - Preserves learner progress data
      - Can be restored by updating isActive to true
    `
  },

  /**
   * Bulk create flashcards
   */
  bulkCreate: {
    endpoint: '/api/v2/modules/:moduleId/flashcards/bulk',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Bulk create flashcards in a module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        moduleId: { type: 'ObjectId', required: true }
      },
      body: {
        flashcards: {
          type: 'array',
          required: true,
          minItems: 1,
          maxItems: 100,
          description: 'Array of flashcard objects'
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
            created: 'number',
            failed: 'number',
            flashcards: ['FlashcardItem'],
            errors: [{ index: 'number', error: 'string' }]
          }
        }
      }
    },

    permissions: ['write:modules'],

    notes: `
      - Maximum 100 flashcards per request
      - Partial success possible - check errors array
      - Orders assigned sequentially
    `
  },

  /**
   * Reorder flashcards
   */
  reorder: {
    endpoint: '/api/v2/modules/:moduleId/flashcards/reorder',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Update the order of flashcards in a module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        moduleId: { type: 'ObjectId', required: true }
      },
      body: {
        cardIds: {
          type: 'array',
          required: true,
          description: 'Ordered array of flashcard IDs'
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
            updatedOrder: [{ cardId: 'string', order: 'number' }]
          }
        }
      }
    },

    permissions: ['write:modules']
  }
};

// ============================================================================
// Course Flashcard Configuration
// ============================================================================

export const CourseFlashcardConfigContracts = {
  /**
   * Get course flashcard configuration
   */
  get: {
    endpoint: '/api/v2/courses/:courseId/flashcard-config',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get flashcard configuration for a course',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        courseId: { type: 'ObjectId', required: true }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            courseId: 'string',
            enabled: 'boolean',
            flashcardsPerCheck: 'number',
            failureThreshold: 'number',
            checkFrequency: 'every_module|every_n_modules|custom',
            checkFrequencyValue: 'number|null',
            selectionMethod: 'random|weighted_by_difficulty|sm2_priority',
            requireContentReview: 'boolean',
            requireFinalRetake: 'boolean',
            includeOnlyCompletedModules: 'boolean',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      }
    },

    example: {
      response: {
        success: true,
        data: {
          courseId: '507f1f77bcf86cd799439012',
          enabled: true,
          flashcardsPerCheck: 3,
          failureThreshold: 2,
          checkFrequency: 'every_module',
          checkFrequencyValue: null,
          selectionMethod: 'random',
          requireContentReview: true,
          requireFinalRetake: true,
          includeOnlyCompletedModules: true,
          createdAt: '2026-01-28T10:00:00.000Z',
          updatedAt: '2026-01-28T10:00:00.000Z'
        }
      }
    },

    permissions: ['read:courses'],

    notes: `
      - Returns default values if no config exists
      - flashcardsPerCheck = 0 disables retention checks entirely
      - checkFrequencyValue only used when checkFrequency = 'every_n_modules'
    `
  },

  /**
   * Update course flashcard configuration
   */
  update: {
    endpoint: '/api/v2/courses/:courseId/flashcard-config',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update flashcard configuration for a course',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        courseId: { type: 'ObjectId', required: true }
      },
      body: {
        enabled: { type: 'boolean', required: false },
        flashcardsPerCheck: {
          type: 'number',
          required: false,
          min: 0,
          max: 20,
          description: 'Cards per retention check (0 = disabled)'
        },
        failureThreshold: {
          type: 'number',
          required: false,
          min: 1,
          max: 20,
          description: 'Incorrect answers before remediation'
        },
        checkFrequency: {
          type: 'string',
          required: false,
          enum: ['every_module', 'every_n_modules', 'custom']
        },
        checkFrequencyValue: {
          type: 'number',
          required: false,
          min: 1,
          description: 'For every_n_modules: check every N modules'
        },
        selectionMethod: {
          type: 'string',
          required: false,
          enum: ['random', 'weighted_by_difficulty', 'sm2_priority']
        },
        requireContentReview: { type: 'boolean', required: false },
        requireFinalRetake: { type: 'boolean', required: false },
        includeOnlyCompletedModules: { type: 'boolean', required: false }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: 'CourseFlashcardConfig'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid configuration' },
        { status: 400, code: 'INVALID_THRESHOLD', message: 'failureThreshold must be <= flashcardsPerCheck' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    permissions: ['write:courses'],

    notes: `
      - failureThreshold must be <= flashcardsPerCheck
      - Changes apply to future retention checks only
      - Does not affect in-progress retention checks or remediations
    `
  }
};

// ============================================================================
// Learner Flashcard Sessions
// ============================================================================

export const LearnerFlashcardContracts = {
  /**
   * Get flashcard session for in-module practice
   */
  getSession: {
    endpoint: '/api/v2/courses/:courseId/flashcard-session',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get flashcards for in-module practice session',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        courseId: { type: 'ObjectId', required: true }
      },
      query: {
        moduleId: {
          type: 'ObjectId',
          required: false,
          description: 'Specific module (defaults to current module)'
        },
        sessionSize: {
          type: 'number',
          required: false,
          default: 10,
          min: 1,
          max: 50,
          description: 'Number of cards to include'
        },
        includeMastered: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include already mastered cards'
        },
        shuffle: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Randomize card order'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            sessionId: 'string',
            courseId: 'string',
            moduleId: 'string',
            cards: [
              {
                id: 'string',
                front: 'MediaContent',
                back: 'MediaContent',
                difficulty: 'string',
                tags: ['string']
              }
            ],
            totalCardsInModule: 'number',
            masteredCount: 'number',
            sessionSize: 'number'
          }
        }
      }
    },

    example: {
      response: {
        success: true,
        data: {
          sessionId: 'session_abc123',
          courseId: '507f1f77bcf86cd799439012',
          moduleId: '507f1f77bcf86cd799439013',
          cards: [
            {
              id: 'card_001',
              front: { text: 'What is photosynthesis?', layout: 'text_only' },
              back: { text: 'The process by which plants convert light energy to chemical energy.', layout: 'text_only' },
              difficulty: 'easy',
              tags: ['biology']
            }
          ],
          totalCardsInModule: 15,
          masteredCount: 5,
          sessionSize: 10
        }
      }
    },

    permissions: ['read:modules'],

    notes: `
      - Used for in-module practice (Phase 1 in spec)
      - Cards selected based on SM-2 priority by default
      - Mastered cards excluded unless includeMastered=true
      - Returns fewer cards if module has fewer than sessionSize
    `
  },

  /**
   * Record flashcard result
   */
  recordResult: {
    endpoint: '/api/v2/courses/:courseId/flashcard-result',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Record result for a flashcard (correct/incorrect)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        courseId: { type: 'ObjectId', required: true }
      },
      body: {
        sessionId: {
          type: 'string',
          required: false,
          description: 'Session ID (for analytics)'
        },
        cardId: {
          type: 'string',
          required: true,
          description: 'Flashcard ID'
        },
        correct: {
          type: 'boolean',
          required: true,
          description: 'Whether answer was correct'
        },
        quality: {
          type: 'number',
          required: false,
          min: 0,
          max: 5,
          description: 'SM-2 quality rating (0=blackout, 5=perfect). Defaults to 1 if incorrect, 4 if correct.'
        },
        timeSpent: {
          type: 'number',
          required: false,
          description: 'Milliseconds spent on this card'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            cardId: 'string',
            progress: {
              timesCorrect: 'number',
              timesIncorrect: 'number',
              easeFactor: 'number',
              interval: 'number',
              nextReviewDate: 'Date',
              mastered: 'boolean'
            }
          }
        }
      }
    },

    example: {
      request: {
        body: {
          cardId: 'card_001',
          correct: true,
          quality: 4,
          timeSpent: 5000
        }
      },
      response: {
        success: true,
        data: {
          cardId: 'card_001',
          progress: {
            timesCorrect: 3,
            timesIncorrect: 1,
            easeFactor: 2.5,
            interval: 6,
            nextReviewDate: '2026-02-03T10:00:00.000Z',
            mastered: true
          }
        }
      }
    },

    permissions: ['write:progress'],

    notes: `
      - Updates SM-2 algorithm fields for the card
      - Quality defaults to 1 (incorrect) or 4 (correct) if not provided
      - mastered set to true when repetitions >= masteryThreshold
      - Works for both in-module practice and retention checks
    `
  },

  /**
   * Get learner flashcard progress
   */
  getProgress: {
    endpoint: '/api/v2/courses/:courseId/flashcard-progress',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get learner flashcard progress for a course',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        courseId: { type: 'ObjectId', required: true }
      },
      query: {
        moduleId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by specific module'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            courseId: 'string',
            learnerId: 'string',
            summary: {
              totalCards: 'number',
              masteredCards: 'number',
              masteryPercentage: 'number',
              cardsNeedingReview: 'number',
              averageEaseFactor: 'number'
            },
            byModule: [
              {
                moduleId: 'string',
                moduleName: 'string',
                totalCards: 'number',
                masteredCards: 'number',
                masteryPercentage: 'number'
              }
            ],
            recentActivity: {
              lastReviewDate: 'Date|null',
              cardsReviewedToday: 'number',
              streakDays: 'number'
            }
          }
        }
      }
    },

    permissions: ['read:progress']
  },

  /**
   * Reset flashcard progress
   */
  resetProgress: {
    endpoint: '/api/v2/courses/:courseId/flashcard-progress',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Reset learner flashcard progress (admin/self)',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        courseId: { type: 'ObjectId', required: true }
      },
      query: {
        moduleId: {
          type: 'ObjectId',
          required: false,
          description: 'Reset only specific module (omit for all)'
        },
        learnerId: {
          type: 'ObjectId',
          required: false,
          description: 'Target learner (admin only, defaults to self)'
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
            cardsReset: 'number'
          }
        }
      }
    },

    permissions: ['write:progress', 'admin:progress'],

    notes: `
      - Learners can reset their own progress
      - Admins can reset any learner's progress
      - Does not affect retention check history
    `
  }
};

// ============================================================================
// Retention Checks
// ============================================================================

export const RetentionCheckContracts = {
  /**
   * Get pending retention checks
   */
  getPending: {
    endpoint: '/api/v2/courses/:courseId/retention-checks/pending',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get pending retention checks for learner',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        courseId: { type: 'ObjectId', required: true }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            pendingChecks: [
              {
                checkId: 'string',
                sourceModuleId: 'string',
                sourceModuleName: 'string',
                cardCount: 'number',
                triggeredAt: 'Date',
                dueBy: 'Date|null',
                isBlocking: 'boolean'
              }
            ],
            totalPending: 'number'
          }
        }
      }
    },

    example: {
      response: {
        success: true,
        data: {
          pendingChecks: [
            {
              checkId: 'check_001',
              sourceModuleId: '507f1f77bcf86cd799439013',
              sourceModuleName: 'Cell Structure',
              cardCount: 3,
              triggeredAt: '2026-01-28T10:00:00.000Z',
              dueBy: null,
              isBlocking: true
            }
          ],
          totalPending: 1
        }
      }
    },

    permissions: ['read:progress'],

    notes: `
      - isBlocking indicates learner must complete before continuing
      - Returns checks in order they should be completed
    `
  },

  /**
   * Get retention check details (the cards to answer)
   */
  getCheck: {
    endpoint: '/api/v2/courses/:courseId/retention-checks/:checkId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get retention check cards',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        courseId: { type: 'ObjectId', required: true },
        checkId: { type: 'string', required: true }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            checkId: 'string',
            sourceModuleId: 'string',
            sourceModuleName: 'string',
            failureThreshold: 'number',
            cards: [
              {
                id: 'string',
                front: 'MediaContent',
                back: 'MediaContent'
              }
            ],
            startedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 404, code: 'CHECK_NOT_FOUND', message: 'Retention check not found' },
        { status: 409, code: 'CHECK_ALREADY_COMPLETED', message: 'This check has already been submitted' }
      ]
    },

    permissions: ['read:progress']
  },

  /**
   * Submit retention check answers
   */
  submitCheck: {
    endpoint: '/api/v2/courses/:courseId/retention-checks/:checkId/submit',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Submit answers for a retention check',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        courseId: { type: 'ObjectId', required: true },
        checkId: { type: 'string', required: true }
      },
      body: {
        answers: {
          type: 'array',
          required: true,
          description: 'Array of card responses',
          items: {
            cardId: { type: 'string', required: true },
            correct: { type: 'boolean', required: true },
            quality: { type: 'number', required: false, min: 0, max: 5 },
            timeSpent: { type: 'number', required: false }
          }
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            checkId: 'string',
            sourceModuleId: 'string',
            passed: 'boolean',
            correctCount: 'number',
            incorrectCount: 'number',
            failureThreshold: 'number',
            remediationRequired: 'boolean',
            remediation: {
              remediationId: 'string',
              requireContentReview: 'boolean',
              requireFinalRetake: 'boolean',
              moduleId: 'string',
              moduleName: 'string'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'INVALID_ANSWERS', message: 'Answers do not match check cards' },
        { status: 409, code: 'CHECK_ALREADY_COMPLETED', message: 'This check has already been submitted' }
      ]
    },

    example: {
      request: {
        body: {
          answers: [
            { cardId: 'card_001', correct: true, quality: 4 },
            { cardId: 'card_002', correct: false, quality: 1 },
            { cardId: 'card_003', correct: true, quality: 5 }
          ]
        }
      },
      response: {
        success: true,
        data: {
          checkId: 'check_001',
          sourceModuleId: '507f1f77bcf86cd799439013',
          passed: true,
          correctCount: 2,
          incorrectCount: 1,
          failureThreshold: 2,
          remediationRequired: false,
          remediation: null
        }
      }
    },

    permissions: ['write:progress'],

    notes: `
      - Must answer all cards in the check
      - Updates SM-2 progress for each card
      - If incorrectCount >= failureThreshold, remediation is triggered
      - Remediation details included if required
    `
  },

  /**
   * Get retention check history
   */
  getHistory: {
    endpoint: '/api/v2/courses/:courseId/retention-checks/history',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get retention check history for learner',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        courseId: { type: 'ObjectId', required: true }
      },
      query: {
        moduleId: { type: 'ObjectId', required: false },
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
            history: [
              {
                checkId: 'string',
                sourceModuleId: 'string',
                sourceModuleName: 'string',
                completedAt: 'Date',
                passed: 'boolean',
                correctCount: 'number',
                incorrectCount: 'number',
                remediationRequired: 'boolean',
                remediationStatus: 'string|null'
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
      }
    },

    permissions: ['read:progress']
  }
};

// ============================================================================
// Remediation
// ============================================================================

export const RemediationContracts = {
  /**
   * Get active remediations
   */
  getActive: {
    endpoint: '/api/v2/courses/:courseId/remediations/active',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get active remediations for learner',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        courseId: { type: 'ObjectId', required: true }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            remediations: [
              {
                remediationId: 'string',
                moduleId: 'string',
                moduleName: 'string',
                triggeredAt: 'Date',
                triggeredByCheckId: 'string',
                status: 'pending|content_reviewed|final_retaken|completed',
                requireContentReview: 'boolean',
                requireFinalRetake: 'boolean',
                contentReviewedAt: 'Date|null',
                finalRetakenAt: 'Date|null'
              }
            ],
            totalActive: 'number',
            isBlocking: 'boolean'
          }
        }
      }
    },

    permissions: ['read:progress'],

    notes: `
      - isBlocking = true means learner cannot progress until remediation complete
      - Remediation complete when all required steps done
    `
  },

  /**
   * Mark content as reviewed
   */
  markContentReviewed: {
    endpoint: '/api/v2/courses/:courseId/remediations/:remediationId/content-reviewed',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Mark module content as reviewed for remediation',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        courseId: { type: 'ObjectId', required: true },
        remediationId: { type: 'string', required: true }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            remediationId: 'string',
            status: 'string',
            contentReviewedAt: 'Date',
            nextStep: 'string|null'
          }
        }
      },
      errors: [
        { status: 404, code: 'REMEDIATION_NOT_FOUND', message: 'Remediation not found' },
        { status: 409, code: 'CONTENT_ALREADY_REVIEWED', message: 'Content already marked as reviewed' },
        { status: 409, code: 'CONTENT_REVIEW_NOT_REQUIRED', message: 'This remediation does not require content review' }
      ]
    },

    permissions: ['write:progress'],

    notes: `
      - System should verify learner actually viewed content items
      - Or can be triggered by time-on-page threshold
      - After content review, learner may need to retake final
    `
  },

  /**
   * Get remediation status
   */
  getStatus: {
    endpoint: '/api/v2/courses/:courseId/remediations/:remediationId/status',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed status of a remediation',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        courseId: { type: 'ObjectId', required: true },
        remediationId: { type: 'string', required: true }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            remediationId: 'string',
            moduleId: 'string',
            moduleName: 'string',
            status: 'string',
            steps: {
              contentReview: {
                required: 'boolean',
                completed: 'boolean',
                completedAt: 'Date|null',
                contentItems: [
                  {
                    itemId: 'string',
                    title: 'string',
                    viewed: 'boolean'
                  }
                ]
              },
              finalRetake: {
                required: 'boolean',
                completed: 'boolean',
                completedAt: 'Date|null',
                passed: 'boolean|null',
                attemptId: 'string|null'
              }
            },
            completedAt: 'Date|null'
          }
        }
      }
    },

    permissions: ['read:progress']
  }
};

// ============================================================================
// Type Exports
// ============================================================================

export type FlashcardAuthoringContractType = typeof FlashcardAuthoringContracts;
export type CourseFlashcardConfigContractType = typeof CourseFlashcardConfigContracts;
export type LearnerFlashcardContractType = typeof LearnerFlashcardContracts;
export type RetentionCheckContractType = typeof RetentionCheckContracts;
export type RemediationContractType = typeof RemediationContracts;
