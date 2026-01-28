/**
 * Learner Knowledge Progress API Contracts
 * Version: 1.0.0
 *
 * These contracts define the learner knowledge progress tracking endpoints.
 * Progress tracks learner mastery of Knowledge Nodes through cognitive depth levels.
 *
 * Design:
 * - Progress is tracked per learner per Knowledge Node
 * - Each node tracks mastery through cognitive depth levels
 * - Progress is updated automatically via adaptive question responses
 * - Manual reset is available for administrative purposes
 *
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md, knowledge-nodes.contract.ts
 */

export const LearnerKnowledgeProgressContracts = {
  // ============================================
  // LEARNER PROGRESS ENDPOINTS
  // ============================================

  /**
   * Get All Progress for Learner
   */
  getAllProgress: {
    endpoint: '/api/v2/learners/:learnerId/knowledge-progress',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all knowledge progress records for a learner',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        }
      },
      query: {
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department'
        },
        isComplete: {
          type: 'boolean',
          required: false,
          description: 'Filter by completion status'
        },
        minMastery: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Filter nodes with mastery >= this value'
        },
        maxMastery: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Filter nodes with mastery <= this value'
        },
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
          default: 50,
          min: 1,
          max: 200,
          description: 'Number of items per page'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-lastAttemptAt',
          description: 'Sort field (prefix with - for desc). Examples: masteryScore, -lastAttemptAt, currentDepth'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            progress: [
              {
                id: 'ObjectId',
                learnerId: 'ObjectId',
                knowledgeNodeId: 'ObjectId',
                knowledgeNode: {
                  id: 'ObjectId',
                  name: 'string',
                  slug: 'string'
                },
                departmentId: 'ObjectId',
                currentDepth: 'string (cognitive depth slug)',
                masteryScore: 'number (0-100)',
                totalAttempts: 'number',
                correctAttempts: 'number',
                lastAttemptAt: 'Date | null',
                lastCorrectAt: 'Date | null',
                depthProgress: {
                  '[depthSlug]': {
                    attempts: 'number',
                    correct: 'number',
                    mastered: 'boolean',
                    masteredAt: 'Date | null'
                  }
                },
                isComplete: 'boolean',
                isActive: 'boolean',
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
        { status: 403, code: 'FORBIDDEN', message: 'Cannot access this learner\'s progress' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' }
      ]
    },

    example: {
      request: {
        query: {
          departmentId: '507f1f77bcf86cd799439012',
          minMastery: 50,
          page: 1,
          limit: 20,
          sort: '-masteryScore'
        }
      },
      response: {
        success: true,
        data: {
          progress: [
            {
              id: '507f1f77bcf86cd799439050',
              learnerId: '507f1f77bcf86cd799439020',
              knowledgeNodeId: '507f1f77bcf86cd799439030',
              knowledgeNode: {
                id: '507f1f77bcf86cd799439030',
                name: 'Light Scattering',
                slug: 'light-scattering'
              },
              departmentId: '507f1f77bcf86cd799439012',
              currentDepth: 'proficiency',
              masteryScore: 78,
              totalAttempts: 25,
              correctAttempts: 20,
              lastAttemptAt: '2026-01-24T10:30:00.000Z',
              lastCorrectAt: '2026-01-24T10:30:00.000Z',
              depthProgress: {
                exposure: {
                  attempts: 5,
                  correct: 4,
                  mastered: true,
                  masteredAt: '2026-01-20T00:00:00.000Z'
                },
                practice: {
                  attempts: 10,
                  correct: 8,
                  mastered: true,
                  masteredAt: '2026-01-22T00:00:00.000Z'
                },
                proficiency: {
                  attempts: 10,
                  correct: 8,
                  mastered: false,
                  masteredAt: null
                },
                mastery: {
                  attempts: 0,
                  correct: 0,
                  mastered: false,
                  masteredAt: null
                }
              },
              isComplete: false,
              isActive: true,
              createdAt: '2026-01-20T00:00:00.000Z',
              updatedAt: '2026-01-24T10:30:00.000Z'
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

    permissions: ['read:learners', 'admin', 'staff'],

    notes: `
      - Learners can view their own progress
      - Staff/Admin can view any learner's progress
      - currentDepth indicates the highest cognitive depth level reached
      - masteryScore is calculated as (correctAttempts / totalAttempts) * 100
      - isComplete is true when learner has mastered all depth levels for the node
      - depthProgress tracks attempts/correct at each cognitive depth level
      - Progress records are created automatically on first question attempt
    `
  },

  /**
   * Get Progress Summary for Learner
   */
  getProgressSummary: {
    endpoint: '/api/v2/learners/:learnerId/knowledge-progress/summary',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get summary statistics of learner knowledge progress',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        }
      },
      query: {
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            summary: {
              totalNodes: 'number',
              nodesStarted: 'number',
              nodesInProgress: 'number',
              nodesCompleted: 'number',
              averageMastery: 'number (0-100)',
              totalAttempts: 'number',
              totalCorrect: 'number',
              overallAccuracy: 'number (0-100)',
              depthDistribution: {
                '[depthSlug]': {
                  count: 'number (nodes at this depth)',
                  averageMastery: 'number'
                }
              },
              recentActivity: {
                lastAttemptAt: 'Date | null',
                attemptsLast7Days: 'number',
                nodesProgressedLast7Days: 'number'
              },
              strengths: '[{ nodeId, nodeName, masteryScore }] (top 5 mastered nodes)',
              improvements: '[{ nodeId, nodeName, masteryScore }] (lowest 5 in-progress nodes)'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot access this learner\'s progress' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' }
      ]
    },

    example: {
      request: {
        query: {
          departmentId: '507f1f77bcf86cd799439012'
        }
      },
      response: {
        success: true,
        data: {
          summary: {
            totalNodes: 25,
            nodesStarted: 18,
            nodesInProgress: 12,
            nodesCompleted: 6,
            averageMastery: 65.5,
            totalAttempts: 450,
            totalCorrect: 342,
            overallAccuracy: 76.0,
            depthDistribution: {
              exposure: {
                count: 3,
                averageMastery: 45.0
              },
              practice: {
                count: 5,
                averageMastery: 62.0
              },
              proficiency: {
                count: 4,
                averageMastery: 78.0
              },
              mastery: {
                count: 6,
                averageMastery: 92.0
              }
            },
            recentActivity: {
              lastAttemptAt: '2026-01-24T10:30:00.000Z',
              attemptsLast7Days: 85,
              nodesProgressedLast7Days: 4
            },
            strengths: [
              { nodeId: '507f1f77bcf86cd799439031', nodeName: 'Wave Properties', masteryScore: 95 },
              { nodeId: '507f1f77bcf86cd799439032', nodeName: 'Color Theory', masteryScore: 92 },
              { nodeId: '507f1f77bcf86cd799439033', nodeName: 'Basic Optics', masteryScore: 90 },
              { nodeId: '507f1f77bcf86cd799439034', nodeName: 'Sound Waves', masteryScore: 88 },
              { nodeId: '507f1f77bcf86cd799439035', nodeName: 'Energy Transfer', masteryScore: 85 }
            ],
            improvements: [
              { nodeId: '507f1f77bcf86cd799439036', nodeName: 'Quantum Mechanics', masteryScore: 35 },
              { nodeId: '507f1f77bcf86cd799439037', nodeName: 'Thermodynamics', masteryScore: 42 },
              { nodeId: '507f1f77bcf86cd799439038', nodeName: 'Electromagnetic Fields', masteryScore: 48 },
              { nodeId: '507f1f77bcf86cd799439039', nodeName: 'Nuclear Physics', masteryScore: 52 },
              { nodeId: '507f1f77bcf86cd799439040', nodeName: 'Relativity', masteryScore: 55 }
            ]
          }
        }
      }
    },

    permissions: ['read:learners', 'admin', 'staff'],

    notes: `
      - Provides aggregated view of learner's knowledge progress
      - totalNodes is count of all active knowledge nodes in scope
      - nodesStarted includes any node with at least one attempt
      - nodesInProgress are started but not completed
      - depthDistribution shows how many nodes are at each cognitive depth level
      - strengths shows top 5 highest mastery nodes (completed first)
      - improvements shows 5 lowest mastery in-progress nodes (areas needing work)
      - Useful for dashboards and learning analytics
    `
  },

  /**
   * Get Progress for Specific Node
   */
  getProgressForNode: {
    endpoint: '/api/v2/learners/:learnerId/knowledge-progress/:nodeId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed progress for a specific knowledge node',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        },
        nodeId: {
          type: 'ObjectId',
          required: true,
          description: 'Knowledge node ID'
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
            learnerId: 'ObjectId',
            knowledgeNodeId: 'ObjectId',
            knowledgeNode: {
              id: 'ObjectId',
              name: 'string',
              slug: 'string',
              description: 'string | null',
              prerequisiteNodes: '[{ id, name, slug }]',
              depthRange: {
                min: 'string',
                max: 'string'
              }
            },
            departmentId: 'ObjectId',
            currentDepth: 'string (cognitive depth slug)',
            masteryScore: 'number (0-100)',
            totalAttempts: 'number',
            correctAttempts: 'number',
            lastAttemptAt: 'Date | null',
            lastCorrectAt: 'Date | null',
            depthProgress: {
              '[depthSlug]': {
                attempts: 'number',
                correct: 'number',
                mastered: 'boolean',
                masteredAt: 'Date | null',
                advanceThreshold: 'number (from cognitive depth level)',
                minAttempts: 'number (from cognitive depth level)',
                progressToAdvance: 'number (0-100, % toward next level)'
              }
            },
            prerequisiteProgress: '[{ nodeId, nodeName, masteryScore, isComplete }]',
            isComplete: 'boolean',
            isActive: 'boolean',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot access this learner\'s progress' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' },
        { status: 404, code: 'NODE_NOT_FOUND', message: 'Knowledge node not found' },
        { status: 404, code: 'PROGRESS_NOT_FOUND', message: 'No progress record for this node (learner has not attempted questions)' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439050',
          learnerId: '507f1f77bcf86cd799439020',
          knowledgeNodeId: '507f1f77bcf86cd799439030',
          knowledgeNode: {
            id: '507f1f77bcf86cd799439030',
            name: 'Light Scattering',
            slug: 'light-scattering',
            description: 'Understanding how light interacts with particles in the atmosphere',
            prerequisiteNodes: [
              { id: '507f1f77bcf86cd799439028', name: 'Wave Properties', slug: 'wave-properties' }
            ],
            depthRange: {
              min: 'exposure',
              max: 'mastery'
            }
          },
          departmentId: '507f1f77bcf86cd799439012',
          currentDepth: 'proficiency',
          masteryScore: 78,
          totalAttempts: 25,
          correctAttempts: 20,
          lastAttemptAt: '2026-01-24T10:30:00.000Z',
          lastCorrectAt: '2026-01-24T10:30:00.000Z',
          depthProgress: {
            exposure: {
              attempts: 5,
              correct: 4,
              mastered: true,
              masteredAt: '2026-01-20T00:00:00.000Z',
              advanceThreshold: 0.70,
              minAttempts: 2,
              progressToAdvance: 100
            },
            practice: {
              attempts: 10,
              correct: 8,
              mastered: true,
              masteredAt: '2026-01-22T00:00:00.000Z',
              advanceThreshold: 0.80,
              minAttempts: 3,
              progressToAdvance: 100
            },
            proficiency: {
              attempts: 10,
              correct: 8,
              mastered: false,
              masteredAt: null,
              advanceThreshold: 0.85,
              minAttempts: 4,
              progressToAdvance: 75
            },
            mastery: {
              attempts: 0,
              correct: 0,
              mastered: false,
              masteredAt: null,
              advanceThreshold: 0.90,
              minAttempts: 5,
              progressToAdvance: 0
            }
          },
          prerequisiteProgress: [
            {
              nodeId: '507f1f77bcf86cd799439028',
              nodeName: 'Wave Properties',
              masteryScore: 95,
              isComplete: true
            }
          ],
          isComplete: false,
          isActive: true,
          createdAt: '2026-01-20T00:00:00.000Z',
          updatedAt: '2026-01-24T10:30:00.000Z'
        }
      }
    },

    permissions: ['read:learners', 'admin', 'staff'],

    notes: `
      - Returns detailed progress for a specific knowledge node
      - Includes cognitive depth level thresholds for context
      - progressToAdvance shows percentage toward advancing to next depth level
      - prerequisiteProgress shows mastery status of prerequisite nodes
      - Returns 404 PROGRESS_NOT_FOUND if learner has never attempted this node
      - Useful for detailed learner feedback and adaptive UI
    `
  },

  /**
   * Reset Progress for Node
   */
  resetProgress: {
    endpoint: '/api/v2/learners/:learnerId/knowledge-progress/:nodeId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Reset learner progress for a specific knowledge node',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        },
        nodeId: {
          type: 'ObjectId',
          required: true,
          description: 'Knowledge node ID'
        }
      },
      query: {
        reason: {
          type: 'string',
          required: false,
          maxLength: 500,
          description: 'Optional reason for reset (logged in audit)'
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
            learnerId: 'ObjectId',
            nodeId: 'ObjectId',
            nodeName: 'string',
            previousMastery: 'number',
            previousDepth: 'string',
            resetAt: 'Date',
            resetBy: 'ObjectId'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to reset progress' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' },
        { status: 404, code: 'NODE_NOT_FOUND', message: 'Knowledge node not found' },
        { status: 404, code: 'PROGRESS_NOT_FOUND', message: 'No progress record to reset' }
      ]
    },

    example: {
      request: {
        query: {
          reason: 'Learner requested fresh start after extended absence'
        }
      },
      response: {
        success: true,
        message: 'Progress reset successfully',
        data: {
          learnerId: '507f1f77bcf86cd799439020',
          nodeId: '507f1f77bcf86cd799439030',
          nodeName: 'Light Scattering',
          previousMastery: 78,
          previousDepth: 'proficiency',
          resetAt: '2026-01-24T12:00:00.000Z',
          resetBy: '507f1f77bcf86cd799439001'
        }
      }
    },

    permissions: ['admin', 'staff'],

    notes: `
      - Requires staff or admin permissions (learners cannot reset their own progress)
      - Soft delete: marks progress as inactive, preserves history
      - New progress record created on next question attempt
      - Reset is logged in audit trail with optional reason
      - Previous progress data retained for reporting/compliance
      - Consider implications: resets all depth progress for this node
    `
  },

  // ============================================
  // DEPARTMENT-SCOPED KNOWLEDGE MAP
  // ============================================

  /**
   * Get Knowledge Map for Learner in Department
   */
  getKnowledgeMap: {
    endpoint: '/api/v2/departments/:departmentId/learners/:learnerId/knowledge-map',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get visual knowledge map showing learner progress across all department nodes',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: {
          type: 'ObjectId',
          required: true,
          description: 'Department ID'
        },
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        }
      },
      query: {
        includeInactive: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include inactive knowledge nodes'
        },
        rootNodeId: {
          type: 'ObjectId',
          required: false,
          description: 'Start map from specific node (subtree only)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            learner: {
              id: 'ObjectId',
              firstName: 'string',
              lastName: 'string'
            },
            department: {
              id: 'ObjectId',
              name: 'string'
            },
            map: {
              nodes: [
                {
                  id: 'ObjectId',
                  name: 'string',
                  slug: 'string',
                  parentNodeId: 'ObjectId | null',
                  prerequisiteNodeIds: 'ObjectId[]',
                  questionCount: 'number',
                  progress: {
                    currentDepth: 'string | null (null if not started)',
                    masteryScore: 'number (0-100)',
                    isComplete: 'boolean',
                    isStarted: 'boolean',
                    isLocked: 'boolean (prerequisites not met)'
                  }
                }
              ],
              edges: [
                {
                  from: 'ObjectId',
                  to: 'ObjectId',
                  type: 'parent | prerequisite | related'
                }
              ],
              statistics: {
                totalNodes: 'number',
                nodesStarted: 'number',
                nodesCompleted: 'number',
                nodesLocked: 'number',
                averageMastery: 'number'
              }
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department or learner' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' }
      ]
    },

    example: {
      request: {
        query: {
          includeInactive: false
        }
      },
      response: {
        success: true,
        data: {
          learner: {
            id: '507f1f77bcf86cd799439020',
            firstName: 'Jane',
            lastName: 'Doe'
          },
          department: {
            id: '507f1f77bcf86cd799439012',
            name: 'Physics'
          },
          map: {
            nodes: [
              {
                id: '507f1f77bcf86cd799439028',
                name: 'Wave Properties',
                slug: 'wave-properties',
                parentNodeId: null,
                prerequisiteNodeIds: [],
                questionCount: 30,
                progress: {
                  currentDepth: 'mastery',
                  masteryScore: 95,
                  isComplete: true,
                  isStarted: true,
                  isLocked: false
                }
              },
              {
                id: '507f1f77bcf86cd799439030',
                name: 'Light Scattering',
                slug: 'light-scattering',
                parentNodeId: '507f1f77bcf86cd799439029',
                prerequisiteNodeIds: ['507f1f77bcf86cd799439028'],
                questionCount: 24,
                progress: {
                  currentDepth: 'proficiency',
                  masteryScore: 78,
                  isComplete: false,
                  isStarted: true,
                  isLocked: false
                }
              },
              {
                id: '507f1f77bcf86cd799439041',
                name: 'Advanced Optics',
                slug: 'advanced-optics',
                parentNodeId: null,
                prerequisiteNodeIds: ['507f1f77bcf86cd799439030'],
                questionCount: 20,
                progress: {
                  currentDepth: null,
                  masteryScore: 0,
                  isComplete: false,
                  isStarted: false,
                  isLocked: true
                }
              }
            ],
            edges: [
              { from: '507f1f77bcf86cd799439029', to: '507f1f77bcf86cd799439030', type: 'parent' },
              { from: '507f1f77bcf86cd799439028', to: '507f1f77bcf86cd799439030', type: 'prerequisite' },
              { from: '507f1f77bcf86cd799439030', to: '507f1f77bcf86cd799439041', type: 'prerequisite' }
            ],
            statistics: {
              totalNodes: 25,
              nodesStarted: 18,
              nodesCompleted: 6,
              nodesLocked: 4,
              averageMastery: 65.5
            }
          }
        }
      }
    },

    permissions: ['read:learners', 'admin', 'staff'],

    notes: `
      - Returns graph structure suitable for visualization
      - nodes array contains all knowledge nodes with progress overlay
      - edges array defines relationships for graph rendering
      - isLocked indicates prerequisite nodes are not yet mastered
      - Useful for learning path visualization and gamification
      - Can be filtered to a subtree using rootNodeId parameter
      - Statistics provide quick summary for dashboard display
    `
  }
};

// Type exports
export type LearnerKnowledgeProgressContractType = typeof LearnerKnowledgeProgressContracts;

// Individual endpoint types for consumers
export type GetAllProgressRequest = typeof LearnerKnowledgeProgressContracts.getAllProgress.request;
export type GetAllProgressResponse = typeof LearnerKnowledgeProgressContracts.getAllProgress.example.response;
export type GetProgressSummaryResponse = typeof LearnerKnowledgeProgressContracts.getProgressSummary.example.response;
export type GetProgressForNodeResponse = typeof LearnerKnowledgeProgressContracts.getProgressForNode.example.response;
export type ResetProgressResponse = typeof LearnerKnowledgeProgressContracts.resetProgress.example.response;
export type GetKnowledgeMapResponse = typeof LearnerKnowledgeProgressContracts.getKnowledgeMap.example.response;
