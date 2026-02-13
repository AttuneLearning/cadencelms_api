/**
 * Matching Exercises API Contracts
 * Version: 1.0.0
 *
 * These contracts define the standalone matching exercise endpoints.
 * Matching exercises are drag-and-drop activities connecting items
 * from two columns. This is distinct from MatchingQuestion within quizzes.
 *
 * See: agent_coms/ui/specs/ENHANCED_EXERCISE_DELIVERY_SPEC.md
 */

import { MediaContent } from '../types/media-types';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * A pair of items to be matched
 */
export interface MatchingPair {
  id: string;
  columnA: MediaContent;         // The prompt (left side)
  columnB: MediaContent;         // The answer (right side)
  explanation?: string;          // Shown after matching
}

/**
 * Configuration for a matching exercise
 */
export interface MatchingExerciseConfig {
  pairs: MatchingPair[];
  shuffleColumnB: boolean;       // Randomize answer positions
  allowPartialCredit: boolean;   // Score based on correct matches
  showFeedbackOnDrop: boolean;   // Immediate feedback or after submit
  maxAttempts?: number;          // Per matching session (null = unlimited)
  timeLimit?: number;            // In seconds (null = unlimited)
}

/**
 * Result of a matching exercise attempt
 */
export interface MatchingAttemptResult {
  attemptId: string;
  exerciseId: string;
  learnerId: string;
  pairs: {
    pairId: string;
    matchedCorrectly: boolean;
    learnerAnswer: string;       // columnB ID they matched
  }[];
  score: number;                 // Percentage correct
  passed: boolean;
  timeSpent: number;             // Seconds
  completedAt: string;
}

// ============================================================================
// Matching Exercise Contracts
// ============================================================================

export const MatchingExerciseContracts = {
  /**
   * Create matching exercise
   */
  create: {
    endpoint: '/api/v2/content/exercises',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new matching exercise',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        title: {
          type: 'string',
          required: true,
          maxLength: 200,
          description: 'Exercise title'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000
        },
        type: {
          type: 'string',
          required: true,
          enum: ['matching'],
          description: 'Exercise type (must be "matching")'
        },
        department: {
          type: 'ObjectId',
          required: true
        },
        difficulty: {
          type: 'string',
          required: false,
          enum: ['easy', 'medium', 'hard'],
          default: 'medium'
        },
        config: {
          type: 'MatchingExerciseConfig',
          required: true,
          description: 'Matching-specific configuration'
        },
        instructions: {
          type: 'string',
          required: false,
          description: 'Instructions shown before starting'
        },
        passingScore: {
          type: 'number',
          required: false,
          default: 70,
          min: 0,
          max: 100
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
            type: 'matching',
            department: 'ObjectId',
            difficulty: 'string',
            config: 'MatchingExerciseConfig',
            instructions: 'string',
            passingScore: 'number',
            status: 'draft',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid exercise data' },
        { status: 400, code: 'MIN_PAIRS_REQUIRED', message: 'At least 2 matching pairs required' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' }
      ]
    },

    example: {
      request: {
        body: {
          title: 'Cell Organelles Matching',
          description: 'Match each organelle to its function',
          type: 'matching',
          department: '507f1f77bcf86cd799439012',
          difficulty: 'medium',
          config: {
            pairs: [
              {
                id: 'pair_001',
                columnA: { text: 'Mitochondria', layout: 'text_only' },
                columnB: { text: 'Powerhouse of the cell - produces ATP', layout: 'text_only' },
                explanation: 'Mitochondria convert glucose into ATP through cellular respiration.'
              },
              {
                id: 'pair_002',
                columnA: { text: 'Ribosome', layout: 'text_only' },
                columnB: { text: 'Protein synthesis', layout: 'text_only' },
                explanation: 'Ribosomes translate mRNA into proteins.'
              },
              {
                id: 'pair_003',
                columnA: { text: 'Nucleus', layout: 'text_only' },
                columnB: { text: 'Contains genetic material (DNA)', layout: 'text_only' },
                explanation: 'The nucleus houses the cell\'s chromosomes and controls gene expression.'
              }
            ],
            shuffleColumnB: true,
            allowPartialCredit: true,
            showFeedbackOnDrop: false,
            maxAttempts: 3,
            timeLimit: 300
          },
          instructions: 'Drag items from the right column to match with the corresponding organelle on the left.',
          passingScore: 70
        }
      },
      response: {
        success: true,
        message: 'Matching exercise created successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          title: 'Cell Organelles Matching',
          description: 'Match each organelle to its function',
          type: 'matching',
          department: '507f1f77bcf86cd799439012',
          difficulty: 'medium',
          config: {
            pairs: [
              {
                id: 'pair_001',
                columnA: { text: 'Mitochondria', layout: 'text_only' },
                columnB: { text: 'Powerhouse of the cell - produces ATP', layout: 'text_only' },
                explanation: 'Mitochondria convert glucose into ATP through cellular respiration.'
              }
            ],
            shuffleColumnB: true,
            allowPartialCredit: true,
            showFeedbackOnDrop: false,
            maxAttempts: 3,
            timeLimit: 300
          },
          instructions: 'Drag items from the right column to match with the corresponding organelle on the left.',
          passingScore: 70,
          status: 'draft',
          createdBy: '507f1f77bcf86cd799439011',
          createdAt: '2026-01-28T10:00:00.000Z',
          updatedAt: '2026-01-28T10:00:00.000Z'
        }
      }
    },

    permissions: ['write:exercises'],

    notes: `
      - Minimum 2 pairs required
      - Maximum 20 pairs recommended for usability
      - MediaContent allows text, images, or mixed content
      - columnA items are fixed position, columnB items are draggable
      - If showFeedbackOnDrop=true, immediate visual feedback on match
      - If showFeedbackOnDrop=false, feedback shown after submit
    `
  },

  /**
   * Get matching exercise for learner (with shuffled answers)
   */
  getForLearner: {
    endpoint: '/api/v2/content/exercises/:id/matching-session',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get matching exercise formatted for learner attempt',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        id: { type: 'ObjectId', required: true }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            sessionId: 'string',
            exerciseId: 'string',
            title: 'string',
            instructions: 'string',
            timeLimit: 'number|null',
            maxAttempts: 'number|null',
            currentAttempt: 'number',
            columnA: [
              {
                id: 'string',
                content: 'MediaContent'
              }
            ],
            columnB: [
              {
                id: 'string',
                content: 'MediaContent'
              }
            ],
            showFeedbackOnDrop: 'boolean',
            allowPartialCredit: 'boolean'
          }
        }
      },
      errors: [
        { status: 404, code: 'NOT_FOUND', message: 'Exercise not found' },
        { status: 403, code: 'NOT_ENROLLED', message: 'Not enrolled in course' },
        { status: 409, code: 'MAX_ATTEMPTS_REACHED', message: 'Maximum attempts reached' }
      ]
    },

    permissions: ['read:exercises'],

    notes: `
      - columnB is shuffled if shuffleColumnB=true in config
      - Correct pairings are NOT included (prevent cheating)
      - sessionId used to track timing and submit results
      - currentAttempt indicates which attempt this is
    `
  },

  /**
   * Submit matching exercise answers
   */
  submitAnswers: {
    endpoint: '/api/v2/content/exercises/:id/matching-result',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Submit matching exercise answers',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'ObjectId', required: true }
      },
      body: {
        sessionId: {
          type: 'string',
          required: true,
          description: 'Session ID from getForLearner'
        },
        matches: {
          type: 'array',
          required: true,
          description: 'Array of matches made by learner',
          items: {
            columnAId: { type: 'string', required: true },
            columnBId: { type: 'string', required: true }
          }
        },
        timeSpent: {
          type: 'number',
          required: false,
          description: 'Time spent in seconds'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            attemptId: 'string',
            score: 'number',
            passed: 'boolean',
            correctCount: 'number',
            totalPairs: 'number',
            results: [
              {
                columnAId: 'string',
                columnBId: 'string',
                correct: 'boolean',
                correctColumnBId: 'string',
                explanation: 'string|null'
              }
            ],
            timeSpent: 'number',
            attemptsRemaining: 'number|null'
          }
        }
      },
      errors: [
        { status: 400, code: 'INVALID_SESSION', message: 'Invalid or expired session' },
        { status: 400, code: 'INCOMPLETE_MATCHES', message: 'All pairs must be matched' },
        { status: 409, code: 'ALREADY_SUBMITTED', message: 'This session already submitted' },
        { status: 409, code: 'TIME_EXPIRED', message: 'Time limit exceeded' }
      ]
    },

    example: {
      request: {
        body: {
          sessionId: 'session_abc123',
          matches: [
            { columnAId: 'pair_001', columnBId: 'pair_001' },
            { columnAId: 'pair_002', columnBId: 'pair_003' },
            { columnAId: 'pair_003', columnBId: 'pair_002' }
          ],
          timeSpent: 45
        }
      },
      response: {
        success: true,
        data: {
          attemptId: 'attempt_xyz789',
          score: 33.33,
          passed: false,
          correctCount: 1,
          totalPairs: 3,
          results: [
            {
              columnAId: 'pair_001',
              columnBId: 'pair_001',
              correct: true,
              correctColumnBId: 'pair_001',
              explanation: 'Mitochondria convert glucose into ATP through cellular respiration.'
            },
            {
              columnAId: 'pair_002',
              columnBId: 'pair_003',
              correct: false,
              correctColumnBId: 'pair_002',
              explanation: 'Ribosomes translate mRNA into proteins.'
            },
            {
              columnAId: 'pair_003',
              columnBId: 'pair_002',
              correct: false,
              correctColumnBId: 'pair_003',
              explanation: 'The nucleus houses the cell\'s chromosomes and controls gene expression.'
            }
          ],
          timeSpent: 45,
          attemptsRemaining: 2
        }
      }
    },

    permissions: ['write:progress'],

    notes: `
      - All pairs must be matched (no partial submission)
      - Score = (correctCount / totalPairs) * 100
      - If allowPartialCredit=false, score is 0 or 100 only
      - explanations shown for all pairs after submission
      - attemptsRemaining=null if unlimited attempts
    `
  },

  /**
   * Get matching exercise attempts history
   */
  getAttempts: {
    endpoint: '/api/v2/content/exercises/:id/matching-attempts',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get learner attempt history for matching exercise',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        id: { type: 'ObjectId', required: true }
      },
      query: {
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
          data: {
            exerciseId: 'string',
            learnerId: 'string',
            attempts: [
              {
                attemptId: 'string',
                attemptNumber: 'number',
                score: 'number',
                passed: 'boolean',
                correctCount: 'number',
                totalPairs: 'number',
                timeSpent: 'number',
                completedAt: 'Date'
              }
            ],
            bestScore: 'number',
            totalAttempts: 'number',
            attemptsRemaining: 'number|null'
          }
        }
      }
    },

    permissions: ['read:progress']
  },

  /**
   * Update matching exercise pairs
   */
  updatePairs: {
    endpoint: '/api/v2/content/exercises/:id/matching-pairs',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update matching pairs for an exercise',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'ObjectId', required: true }
      },
      body: {
        pairs: {
          type: 'array',
          required: true,
          description: 'Complete list of matching pairs (replaces existing)'
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
            pairCount: 'number',
            config: 'MatchingExerciseConfig'
          }
        }
      },
      errors: [
        { status: 400, code: 'MIN_PAIRS_REQUIRED', message: 'At least 2 pairs required' },
        { status: 409, code: 'EXERCISE_HAS_ATTEMPTS', message: 'Cannot modify pairs after attempts exist' }
      ]
    },

    permissions: ['write:exercises'],

    notes: `
      - Replaces all existing pairs
      - Cannot modify if exercise has existing attempts (preserves integrity)
      - Use PATCH for config-only updates
    `
  }
};

// ============================================================================
// Type Exports
// ============================================================================

export type MatchingExerciseContractType = typeof MatchingExerciseContracts;
