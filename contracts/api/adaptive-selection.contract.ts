/**
 * Adaptive Selection API Contracts
 * Version: 1.0.0
 *
 * These contracts define the adaptive learning question selection endpoints.
 * Adaptive selection uses learner progress and cognitive depth levels to
 * intelligently select questions that optimize learning.
 *
 * Design:
 * - Questions are selected based on learner's current mastery and cognitive depth
 * - Selection considers knowledge node prerequisites and relationships
 * - Responses are recorded and automatically update learner progress
 * - Three selection strategies: advancing (new material), reinforcing (current level), reviewing (previous levels)
 *
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md, knowledge-nodes.contract.ts, learner-knowledge-progress.contract.ts
 */

export const AdaptiveSelectionContracts = {
  // ============================================
  // QUESTION SELECTION
  // ============================================

  /**
   * Select Single Question
   */
  selectQuestion: {
    endpoint: '/api/v2/adaptive/select-question',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Select a single adaptive question for a learner',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        },
        knowledgeNodeId: {
          type: 'ObjectId',
          required: false,
          description: 'Specific knowledge node to select from (optional, system selects if omitted)'
        },
        departmentId: {
          type: 'ObjectId',
          required: true,
          description: 'Department context for question selection'
        },
        questionBankIds: {
          type: 'ObjectId[]',
          required: false,
          description: 'Limit selection to specific question banks'
        },
        excludeQuestionIds: {
          type: 'ObjectId[]',
          required: false,
          description: 'Questions to exclude (recently seen, etc.)'
        },
        preferredStrategy: {
          type: 'string',
          required: false,
          enum: ['advancing', 'reinforcing', 'reviewing'],
          description: 'Preferred selection strategy (system may override based on progress)'
        },
        contextType: {
          type: 'string',
          required: false,
          enum: ['exercise', 'assessment', 'practice', 'review'],
          default: 'practice',
          description: 'Context for question selection (affects difficulty weighting)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            question: {
              id: 'ObjectId',
              questionText: 'string',
              questionTypes: 'string[]',
              options: '[{ id, text, ... }] (for multiple choice)',
              points: 'number',
              cognitiveDepth: 'string | null',
              knowledgeNodeId: 'ObjectId | null',
              knowledgeNode: {
                id: 'ObjectId',
                name: 'string',
                slug: 'string'
              },
              difficulty: 'string',
              hints: 'string[] | null',
              explanation: 'string | null (not returned until after response)',
              mediaUrls: 'string[]',
              tags: 'string[]'
            },
            presentationType: 'string (question type for rendering)',
            cognitiveDepth: 'string (depth level for this question)',
            selectionReason: 'advancing | reinforcing | reviewing',
            adaptiveMetadata: {
              currentMastery: 'number (0-100)',
              targetDepth: 'string (depth being targeted)',
              progressToNextDepth: 'number (0-100)',
              prerequisitesMet: 'boolean',
              knowledgeNodeName: 'string',
              selectionConfidence: 'number (0-1, algorithm confidence)'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'NO_QUESTIONS_AVAILABLE', message: 'No eligible questions found for selection criteria' },
        { status: 400, code: 'PREREQUISITES_NOT_MET', message: 'Learner has not met prerequisites for specified node' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot select questions for this learner' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' },
        { status: 404, code: 'NODE_NOT_FOUND', message: 'Knowledge node not found' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        learnerId: '507f1f77bcf86cd799439020',
        departmentId: '507f1f77bcf86cd799439012',
        knowledgeNodeId: '507f1f77bcf86cd799439030',
        excludeQuestionIds: ['507f1f77bcf86cd799439100', '507f1f77bcf86cd799439101'],
        preferredStrategy: 'advancing',
        contextType: 'practice'
      },
      response: {
        success: true,
        data: {
          question: {
            id: '507f1f77bcf86cd799439105',
            questionText: 'Why does the sky appear blue during the day?',
            questionTypes: ['multiple-choice'],
            options: [
              { id: 'a', text: 'Blue light is absorbed by the atmosphere' },
              { id: 'b', text: 'Blue light is scattered more than other wavelengths' },
              { id: 'c', text: 'The ocean reflects blue light into the sky' },
              { id: 'd', text: 'The sun emits primarily blue light' }
            ],
            points: 10,
            cognitiveDepth: 'proficiency',
            knowledgeNodeId: '507f1f77bcf86cd799439030',
            knowledgeNode: {
              id: '507f1f77bcf86cd799439030',
              name: 'Light Scattering',
              slug: 'light-scattering'
            },
            difficulty: 'medium',
            hints: ['Think about Rayleigh scattering', 'Consider the wavelength of blue light'],
            explanation: null,
            mediaUrls: [],
            tags: ['physics', 'optics', 'atmosphere']
          },
          presentationType: 'multiple-choice',
          cognitiveDepth: 'proficiency',
          selectionReason: 'advancing',
          adaptiveMetadata: {
            currentMastery: 78,
            targetDepth: 'proficiency',
            progressToNextDepth: 75,
            prerequisitesMet: true,
            knowledgeNodeName: 'Light Scattering',
            selectionConfidence: 0.85
          }
        }
      }
    },

    permissions: ['read:questions', 'adaptive:select'],

    notes: `
      - Selection algorithm considers:
        1. Learner's current cognitive depth for the node
        2. Mastery score and progress toward next depth
        3. Prerequisite completion status
        4. Question difficulty relative to learner level
        5. Recently seen questions (excluded)
      - selectionReason indicates why this question was chosen:
        - 'advancing': Learner ready to progress to next depth level
        - 'reinforcing': Strengthening current depth level mastery
        - 'reviewing': Revisiting previous depth to maintain mastery
      - explanation is withheld until response is recorded (prevents cheating)
      - If knowledgeNodeId is omitted, algorithm selects optimal node based on:
        - Nodes close to advancement threshold
        - Nodes with decaying mastery
        - Prerequisite completion enabling new nodes
    `
  },

  /**
   * Select Multiple Questions
   */
  selectQuestions: {
    endpoint: '/api/v2/adaptive/select-questions',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Select multiple adaptive questions for a learner (e.g., for an exercise set)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        },
        departmentId: {
          type: 'ObjectId',
          required: true,
          description: 'Department context'
        },
        count: {
          type: 'number',
          required: true,
          min: 1,
          max: 50,
          description: 'Number of questions to select'
        },
        knowledgeNodeIds: {
          type: 'ObjectId[]',
          required: false,
          description: 'Limit selection to specific knowledge nodes'
        },
        questionBankIds: {
          type: 'ObjectId[]',
          required: false,
          description: 'Limit selection to specific question banks'
        },
        excludeQuestionIds: {
          type: 'ObjectId[]',
          required: false,
          description: 'Questions to exclude'
        },
        strategyDistribution: {
          type: 'object',
          required: false,
          description: 'Target distribution of selection strategies',
          properties: {
            advancing: { type: 'number', min: 0, max: 1, description: 'Proportion of advancing questions' },
            reinforcing: { type: 'number', min: 0, max: 1, description: 'Proportion of reinforcing questions' },
            reviewing: { type: 'number', min: 0, max: 1, description: 'Proportion of reviewing questions' }
          }
        },
        contextType: {
          type: 'string',
          required: false,
          enum: ['exercise', 'assessment', 'practice', 'review'],
          default: 'practice',
          description: 'Context for question selection'
        },
        diversityWeight: {
          type: 'number',
          required: false,
          min: 0,
          max: 1,
          default: 0.3,
          description: 'Weight given to selecting from diverse nodes (0 = focus, 1 = spread)'
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
                question: '{...question object}',
                presentationType: 'string',
                cognitiveDepth: 'string',
                selectionReason: 'advancing | reinforcing | reviewing',
                adaptiveMetadata: {
                  currentMastery: 'number',
                  targetDepth: 'string',
                  progressToNextDepth: 'number',
                  prerequisitesMet: 'boolean',
                  knowledgeNodeName: 'string',
                  selectionConfidence: 'number'
                }
              }
            ],
            selectionSummary: {
              totalRequested: 'number',
              totalSelected: 'number',
              strategyBreakdown: {
                advancing: 'number',
                reinforcing: 'number',
                reviewing: 'number'
              },
              nodeBreakdown: '[{ nodeId, nodeName, count }]',
              depthBreakdown: '{ [depthSlug]: number }',
              averageConfidence: 'number'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'INSUFFICIENT_QUESTIONS', message: 'Not enough eligible questions to meet count (partial results returned)' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot select questions for this learner' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        learnerId: '507f1f77bcf86cd799439020',
        departmentId: '507f1f77bcf86cd799439012',
        count: 10,
        knowledgeNodeIds: ['507f1f77bcf86cd799439030', '507f1f77bcf86cd799439031'],
        strategyDistribution: {
          advancing: 0.4,
          reinforcing: 0.4,
          reviewing: 0.2
        },
        contextType: 'exercise',
        diversityWeight: 0.5
      },
      response: {
        success: true,
        data: {
          questions: [
            {
              question: {
                id: '507f1f77bcf86cd799439105',
                questionText: 'Why does the sky appear blue during the day?',
                questionTypes: ['multiple-choice'],
                options: [
                  { id: 'a', text: 'Blue light is absorbed by the atmosphere' },
                  { id: 'b', text: 'Blue light is scattered more than other wavelengths' },
                  { id: 'c', text: 'The ocean reflects blue light into the sky' },
                  { id: 'd', text: 'The sun emits primarily blue light' }
                ],
                points: 10,
                cognitiveDepth: 'proficiency',
                knowledgeNodeId: '507f1f77bcf86cd799439030',
                difficulty: 'medium'
              },
              presentationType: 'multiple-choice',
              cognitiveDepth: 'proficiency',
              selectionReason: 'advancing',
              adaptiveMetadata: {
                currentMastery: 78,
                targetDepth: 'proficiency',
                progressToNextDepth: 75,
                prerequisitesMet: true,
                knowledgeNodeName: 'Light Scattering',
                selectionConfidence: 0.85
              }
            }
          ],
          selectionSummary: {
            totalRequested: 10,
            totalSelected: 10,
            strategyBreakdown: {
              advancing: 4,
              reinforcing: 4,
              reviewing: 2
            },
            nodeBreakdown: [
              { nodeId: '507f1f77bcf86cd799439030', nodeName: 'Light Scattering', count: 6 },
              { nodeId: '507f1f77bcf86cd799439031', nodeName: 'Color Theory', count: 4 }
            ],
            depthBreakdown: {
              practice: 3,
              proficiency: 5,
              mastery: 2
            },
            averageConfidence: 0.82
          }
        }
      }
    },

    permissions: ['read:questions', 'adaptive:select'],

    notes: `
      - Selects multiple questions optimized for learning progression
      - strategyDistribution allows control over question mix:
        - Default (if omitted): algorithm determines optimal mix
        - Sum should equal 1.0, proportions adjusted if not
      - diversityWeight controls spread across nodes:
        - 0 = focus on nodes closest to advancement
        - 1 = spread evenly across all eligible nodes
      - INSUFFICIENT_QUESTIONS returned with partial results if can't meet count
      - Questions are ordered for optimal learning flow (not random)
      - Useful for generating exercise sets or practice sessions
    `
  },

  // ============================================
  // RESPONSE RECORDING
  // ============================================

  /**
   * Record Question Response
   */
  recordResponse: {
    endpoint: '/api/v2/adaptive/record-response',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Record learner response to an adaptive question and update progress',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        },
        questionId: {
          type: 'ObjectId',
          required: true,
          description: 'Question ID'
        },
        knowledgeNodeId: {
          type: 'ObjectId',
          required: true,
          description: 'Knowledge node context for this response'
        },
        cognitiveDepth: {
          type: 'string',
          required: true,
          description: 'Cognitive depth level of the question (from selection response)'
        },
        response: {
          type: 'object',
          required: true,
          description: 'Learner response data',
          properties: {
            selectedOptionId: { type: 'string', description: 'For multiple choice' },
            selectedOptionIds: { type: 'string[]', description: 'For multi-select' },
            textResponse: { type: 'string', description: 'For free text' },
            numericResponse: { type: 'number', description: 'For numeric entry' },
            matchingPairs: { type: 'object', description: 'For matching questions' },
            orderingSequence: { type: 'string[]', description: 'For ordering questions' }
          }
        },
        timeSpentMs: {
          type: 'number',
          required: false,
          description: 'Time spent on question in milliseconds'
        },
        hintsUsed: {
          type: 'number',
          required: false,
          default: 0,
          description: 'Number of hints viewed'
        },
        attemptContext: {
          type: 'object',
          required: false,
          description: 'Additional context about the attempt',
          properties: {
            exerciseId: { type: 'ObjectId', description: 'Exercise this question is part of' },
            assessmentId: { type: 'ObjectId', description: 'Assessment this question is part of' },
            sessionId: { type: 'string', description: 'Learning session identifier' }
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
            isCorrect: 'boolean',
            pointsEarned: 'number',
            pointsPossible: 'number',
            correctAnswer: '{...correct answer details}',
            explanation: 'string | null',
            progressUpdated: 'boolean',
            newMasteryScore: 'number (0-100)',
            levelAdvanced: 'boolean',
            newDepth: 'string | null (if levelAdvanced)',
            previousDepth: 'string',
            isNodeComplete: 'boolean',
            feedback: {
              message: 'string',
              encouragement: 'string | null',
              nextSteps: 'string | null'
            },
            adaptiveInsights: {
              streakCount: 'number (consecutive correct)',
              recentAccuracy: 'number (last 10 questions)',
              depthProgress: 'number (0-100, progress toward next depth)',
              estimatedQuestionsToAdvance: 'number | null'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'INVALID_RESPONSE_FORMAT', message: 'Response format does not match question type' },
        { status: 400, code: 'DUPLICATE_RESPONSE', message: 'Response already recorded for this question in this context' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot record response for this learner' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' },
        { status: 404, code: 'QUESTION_NOT_FOUND', message: 'Question not found' },
        { status: 404, code: 'NODE_NOT_FOUND', message: 'Knowledge node not found' }
      ]
    },

    example: {
      request: {
        learnerId: '507f1f77bcf86cd799439020',
        questionId: '507f1f77bcf86cd799439105',
        knowledgeNodeId: '507f1f77bcf86cd799439030',
        cognitiveDepth: 'proficiency',
        response: {
          selectedOptionId: 'b'
        },
        timeSpentMs: 45000,
        hintsUsed: 1,
        attemptContext: {
          exerciseId: '507f1f77bcf86cd799439200',
          sessionId: 'sess_abc123'
        }
      },
      response: {
        success: true,
        data: {
          isCorrect: true,
          pointsEarned: 10,
          pointsPossible: 10,
          correctAnswer: {
            optionId: 'b',
            text: 'Blue light is scattered more than other wavelengths'
          },
          explanation: 'This phenomenon is known as Rayleigh scattering. Shorter wavelengths (blue) scatter more than longer wavelengths (red), which is why the sky appears blue during the day.',
          progressUpdated: true,
          newMasteryScore: 80,
          levelAdvanced: false,
          newDepth: null,
          previousDepth: 'proficiency',
          isNodeComplete: false,
          feedback: {
            message: 'Correct! You understand Rayleigh scattering.',
            encouragement: 'Great work! You\'re making excellent progress.',
            nextSteps: 'Continue practicing at this level to advance to mastery.'
          },
          adaptiveInsights: {
            streakCount: 3,
            recentAccuracy: 80,
            depthProgress: 82,
            estimatedQuestionsToAdvance: 2
          }
        }
      }
    },

    permissions: ['write:progress', 'adaptive:record'],

    notes: `
      - Records the response and automatically updates learner progress
      - Progress update logic:
        1. Increment attempt counters for node and depth level
        2. Update mastery score based on weighted recent performance
        3. Check if advancement threshold met for current depth
        4. If met and minAttempts satisfied, advance to next depth
        5. If all depth levels mastered, mark node complete
      - pointsEarned may be reduced if hints were used
      - correctAnswer and explanation only returned after response recorded
      - feedback.message is tailored based on correctness and learner history
      - adaptiveInsights provides context for UI feedback
      - estimatedQuestionsToAdvance is null if insufficient data for estimate
      - Duplicate detection prevents recording same question twice in same context
    `
  }
};

// Type exports
export type AdaptiveSelectionContractType = typeof AdaptiveSelectionContracts;

// Individual endpoint types for consumers
export type SelectQuestionRequest = typeof AdaptiveSelectionContracts.selectQuestion.example.request;
export type SelectQuestionResponse = typeof AdaptiveSelectionContracts.selectQuestion.example.response;
export type SelectQuestionsRequest = typeof AdaptiveSelectionContracts.selectQuestions.example.request;
export type SelectQuestionsResponse = typeof AdaptiveSelectionContracts.selectQuestions.example.response;
export type RecordResponseRequest = typeof AdaptiveSelectionContracts.recordResponse.example.request;
export type RecordResponseResponse = typeof AdaptiveSelectionContracts.recordResponse.example.response;

// Enums for consumers
export const SelectionReason = {
  ADVANCING: 'advancing' as const,
  REINFORCING: 'reinforcing' as const,
  REVIEWING: 'reviewing' as const
};

export const ContextType = {
  EXERCISE: 'exercise' as const,
  ASSESSMENT: 'assessment' as const,
  PRACTICE: 'practice' as const,
  REVIEW: 'review' as const
};
