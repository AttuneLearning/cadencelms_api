/**
 * Knowledge Nodes API Contracts
 * Version: 1.0.0
 *
 * These contracts define the knowledge node management endpoints.
 * Knowledge Nodes organize questions by conceptual topic for adaptive learning.
 *
 * Design:
 * - Knowledge Nodes are separate from Question Banks (administrative vs conceptual)
 * - Questions can optionally be linked to a Knowledge Node
 * - Knowledge Nodes form a graph with parent, prerequisite, and related relationships
 * - Adaptive learning uses nodes to track learner progress through knowledge areas
 *
 * Current Status: OPTIONAL ENHANCEMENT
 * - Question Banks work without Knowledge Nodes
 * - Adding Knowledge Node linkage enables future adaptive features
 *
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md
 */

export const KnowledgeNodesContracts = {
  // ============================================
  // KNOWLEDGE NODE CRUD
  // ============================================

  /**
   * List Knowledge Nodes in Department
   */
  list: {
    endpoint: '/api/v2/departments/:departmentId/knowledge-nodes',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all knowledge nodes in a department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true, description: 'Department ID' }
      },
      query: {
        search: { type: 'string', required: false, description: 'Search by name/description' },
        tags: { type: 'string', required: false, description: 'Comma-separated tag filter' },
        parentNodeId: { type: 'ObjectId', required: false, description: 'Filter by parent node' },
        hasQuestions: { type: 'boolean', required: false, description: 'Filter nodes with/without linked questions' },
        page: { type: 'number', required: false, default: 1 },
        limit: { type: 'number', required: false, default: 50, max: 200 },
        sort: { type: 'string', required: false, default: 'name' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            nodes: [
              {
                id: 'ObjectId',
                departmentId: 'ObjectId',
                name: 'string',
                slug: 'string',
                description: 'string | null',
                parentNodeId: 'ObjectId | null',
                prerequisiteNodeIds: 'ObjectId[]',
                relatedNodeIds: 'ObjectId[]',
                depthRange: {
                  min: 'string (cognitive depth slug)',
                  max: 'string (cognitive depth slug)'
                },
                tags: 'string[]',
                questionCount: 'number',
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
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        query: {
          search: 'light',
          page: 1,
          limit: 20
        }
      },
      response: {
        success: true,
        data: {
          nodes: [
            {
              id: '507f1f77bcf86cd799439030',
              departmentId: '507f1f77bcf86cd799439012',
              name: 'Light Scattering',
              slug: 'light-scattering',
              description: 'Understanding how light interacts with particles in the atmosphere',
              parentNodeId: '507f1f77bcf86cd799439029',
              prerequisiteNodeIds: ['507f1f77bcf86cd799439028'],
              relatedNodeIds: ['507f1f77bcf86cd799439031'],
              depthRange: {
                min: 'exposure',
                max: 'mastery'
              },
              tags: ['physics', 'optics', 'atmosphere'],
              questionCount: 24,
              isActive: true,
              createdAt: '2026-01-20T00:00:00.000Z',
              updatedAt: '2026-01-24T00:00:00.000Z'
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

    permissions: ['content:assessments:manage', 'content:lessons:read'],

    notes: `
      - Returns knowledge nodes accessible in department
      - questionCount is computed from linked questions
      - depthRange shows the min/max cognitive depth levels with questions
      - Use parentNodeId filter to get children of a specific node
      - Tags allow categorization by subject, topic, skill area
    `
  },

  /**
   * List Knowledge Nodes as Tree
   */
  listAsTree: {
    endpoint: '/api/v2/departments/:departmentId/knowledge-nodes/tree',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List knowledge nodes in hierarchical tree structure',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true }
      },
      query: {
        rootOnly: { type: 'boolean', required: false, default: false, description: 'Only return root nodes (no parent)' },
        maxDepth: { type: 'number', required: false, default: 5, description: 'Maximum tree depth to return' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            tree: [
              {
                id: 'ObjectId',
                name: 'string',
                slug: 'string',
                questionCount: 'number',
                children: '[ ...recursive node structure ]'
              }
            ],
            totalNodes: 'number'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    permissions: ['content:assessments:manage', 'content:lessons:read'],

    notes: `
      - Returns hierarchical structure based on parentNodeId relationships
      - Useful for UI tree views and navigation
      - Does not include prerequisite/related relationships (use getGraph for those)
      - Limited to maxDepth to prevent performance issues
    `
  },

  /**
   * Create Knowledge Node
   */
  create: {
    endpoint: '/api/v2/departments/:departmentId/knowledge-nodes',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new knowledge node in a department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true }
      },
      body: {
        name: {
          type: 'string',
          required: true,
          maxLength: 200,
          description: 'Node name'
        },
        slug: {
          type: 'string',
          required: false,
          pattern: '^[a-z0-9-]+$',
          maxLength: 100,
          description: 'URL-friendly identifier (auto-generated from name if not provided)'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Detailed description of this knowledge area'
        },
        parentNodeId: {
          type: 'ObjectId',
          required: false,
          description: 'Parent node for hierarchy'
        },
        prerequisiteNodeIds: {
          type: 'ObjectId[]',
          required: false,
          description: 'Nodes that should be mastered before this one'
        },
        relatedNodeIds: {
          type: 'ObjectId[]',
          required: false,
          description: 'Related nodes (not prerequisites)'
        },
        depthRange: {
          type: 'object',
          required: false,
          description: 'Expected cognitive depth range for questions',
          properties: {
            min: { type: 'string', description: 'Minimum depth slug' },
            max: { type: 'string', description: 'Maximum depth slug' }
          }
        },
        tags: {
          type: 'string[]',
          required: false,
          maxItems: 20,
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
            id: 'ObjectId',
            departmentId: 'ObjectId',
            name: 'string',
            slug: 'string',
            description: 'string | null',
            parentNodeId: 'ObjectId | null',
            prerequisiteNodeIds: 'ObjectId[]',
            relatedNodeIds: 'ObjectId[]',
            depthRange: {
              min: 'string',
              max: 'string'
            },
            tags: 'string[]',
            questionCount: 'number (0 for new)',
            isActive: 'boolean',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'DUPLICATE_SLUG', message: 'Node with this slug already exists in department' },
        { status: 400, code: 'CIRCULAR_PREREQUISITE', message: 'Prerequisite would create circular dependency' },
        { status: 400, code: 'INVALID_DEPTH_SLUG', message: 'Cognitive depth slug not found' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' },
        { status: 404, code: 'PARENT_NODE_NOT_FOUND', message: 'Parent node not found' },
        { status: 404, code: 'PREREQUISITE_NODE_NOT_FOUND', message: 'Prerequisite node not found' }
      ]
    },

    example: {
      request: {
        name: 'Light Scattering in Atmosphere',
        description: 'Understanding how sunlight interacts with atmospheric particles',
        parentNodeId: '507f1f77bcf86cd799439029',
        prerequisiteNodeIds: ['507f1f77bcf86cd799439028'],
        depthRange: {
          min: 'exposure',
          max: 'mastery'
        },
        tags: ['physics', 'optics', 'atmosphere']
      },
      response: {
        success: true,
        message: 'Knowledge node created successfully',
        data: {
          id: '507f1f77bcf86cd799439030',
          departmentId: '507f1f77bcf86cd799439012',
          name: 'Light Scattering in Atmosphere',
          slug: 'light-scattering-in-atmosphere',
          description: 'Understanding how sunlight interacts with atmospheric particles',
          parentNodeId: '507f1f77bcf86cd799439029',
          prerequisiteNodeIds: ['507f1f77bcf86cd799439028'],
          relatedNodeIds: [],
          depthRange: {
            min: 'exposure',
            max: 'mastery'
          },
          tags: ['physics', 'optics', 'atmosphere'],
          questionCount: 0,
          isActive: true,
          createdBy: '507f1f77bcf86cd799439011',
          createdAt: '2026-01-24T00:00:00.000Z',
          updatedAt: '2026-01-24T00:00:00.000Z'
        }
      }
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - Slug auto-generated from name if not provided
      - Circular prerequisite detection prevents dependency loops
      - depthRange.min/max are validated against CognitiveDepthLevel collection
      - Parent node must belong to same department
      - Prerequisite nodes must belong to same department
    `
  },

  /**
   * Get Knowledge Node Details
   */
  getById: {
    endpoint: '/api/v2/departments/:departmentId/knowledge-nodes/:nodeId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information for a knowledge node',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        nodeId: { type: 'ObjectId', required: true }
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
            name: 'string',
            slug: 'string',
            description: 'string | null',
            parentNodeId: 'ObjectId | null',
            parentNode: '{ id, name, slug } | null (populated)',
            prerequisiteNodeIds: 'ObjectId[]',
            prerequisiteNodes: '[{ id, name, slug }] (populated)',
            relatedNodeIds: 'ObjectId[]',
            relatedNodes: '[{ id, name, slug }] (populated)',
            depthRange: {
              min: 'string',
              max: 'string'
            },
            tags: 'string[]',
            questionCount: 'number',
            questionCountByDepth: '{ [depthSlug]: number }',
            isActive: 'boolean',
            createdBy: 'ObjectId',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Knowledge node not found' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439030',
          departmentId: '507f1f77bcf86cd799439012',
          name: 'Light Scattering',
          slug: 'light-scattering',
          description: 'Understanding how light interacts with particles',
          parentNodeId: '507f1f77bcf86cd799439029',
          parentNode: { id: '507f1f77bcf86cd799439029', name: 'Atmospheric Science', slug: 'atmospheric-science' },
          prerequisiteNodeIds: ['507f1f77bcf86cd799439028'],
          prerequisiteNodes: [{ id: '507f1f77bcf86cd799439028', name: 'Wave Properties', slug: 'wave-properties' }],
          relatedNodeIds: ['507f1f77bcf86cd799439031'],
          relatedNodes: [{ id: '507f1f77bcf86cd799439031', name: 'Color Theory', slug: 'color-theory' }],
          depthRange: { min: 'exposure', max: 'mastery' },
          tags: ['physics', 'optics'],
          questionCount: 24,
          questionCountByDepth: {
            exposure: 8,
            practice: 10,
            proficiency: 4,
            mastery: 2
          },
          isActive: true,
          createdBy: '507f1f77bcf86cd799439011',
          createdAt: '2026-01-20T00:00:00.000Z',
          updatedAt: '2026-01-24T00:00:00.000Z'
        }
      }
    },

    permissions: ['content:assessments:manage', 'content:lessons:read'],

    notes: `
      - Returns full node details with populated relationships
      - questionCountByDepth shows distribution of questions by cognitive depth
      - Useful for understanding node readiness for adaptive learning
    `
  },

  /**
   * Update Knowledge Node
   */
  update: {
    endpoint: '/api/v2/departments/:departmentId/knowledge-nodes/:nodeId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update a knowledge node',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        nodeId: { type: 'ObjectId', required: true }
      },
      body: {
        name: { type: 'string', required: false, maxLength: 200 },
        description: { type: 'string', required: false, maxLength: 2000 },
        parentNodeId: { type: 'ObjectId | null', required: false },
        prerequisiteNodeIds: { type: 'ObjectId[]', required: false },
        relatedNodeIds: { type: 'ObjectId[]', required: false },
        depthRange: {
          type: 'object',
          required: false,
          properties: {
            min: { type: 'string' },
            max: { type: 'string' }
          }
        },
        tags: { type: 'string[]', required: false },
        isActive: { type: 'boolean', required: false }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: '{ ...updated node }'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'CIRCULAR_PREREQUISITE', message: 'Prerequisite would create circular dependency' },
        { status: 400, code: 'CIRCULAR_PARENT', message: 'Parent would create circular hierarchy' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Knowledge node not found' }
      ]
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - Slug cannot be changed (would orphan question references)
      - Circular dependency detection for prerequisites and parent
      - Partial updates supported
      - Setting isActive=false soft-deletes the node
    `
  },

  /**
   * Delete Knowledge Node
   */
  delete: {
    endpoint: '/api/v2/departments/:departmentId/knowledge-nodes/:nodeId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a knowledge node',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        nodeId: { type: 'ObjectId', required: true }
      },
      query: {
        force: { type: 'boolean', required: false, default: false, description: 'Force delete even with linked questions' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            deleted: 'boolean',
            questionsUnlinked: 'number',
            childNodesOrphaned: 'number'
          }
        }
      },
      errors: [
        { status: 400, code: 'NODE_HAS_QUESTIONS', message: 'Cannot delete node with linked questions. Use force=true or unlink questions first.' },
        { status: 400, code: 'NODE_HAS_CHILDREN', message: 'Cannot delete node with child nodes. Delete or reparent children first.' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Knowledge node not found' }
      ]
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - Soft delete (marks as inactive) by default
      - Cannot delete if node has child nodes
      - With force=true, questions are unlinked (knowledgeNodeId set to null)
      - Learner progress records for this node are preserved but marked inactive
    `
  },

  // ============================================
  // RELATIONSHIP MANAGEMENT
  // ============================================

  /**
   * Get Knowledge Node Graph
   */
  getGraph: {
    endpoint: '/api/v2/departments/:departmentId/knowledge-nodes/:nodeId/graph',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get the relationship graph for a knowledge node',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        nodeId: { type: 'ObjectId', required: true }
      },
      query: {
        depth: { type: 'number', required: false, default: 2, max: 5, description: 'How many levels of relationships to include' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            node: '{ id, name, slug }',
            parent: '{ id, name, slug } | null',
            children: '[{ id, name, slug, questionCount }]',
            prerequisites: '[{ id, name, slug, questionCount }]',
            dependents: '[{ id, name, slug }] (nodes that require this one)',
            related: '[{ id, name, slug }]'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Knowledge node not found' }
      ]
    },

    permissions: ['content:assessments:manage', 'content:lessons:read'],

    notes: `
      - Returns all relationship types for visualization
      - 'dependents' are nodes that list this node as a prerequisite
      - Useful for understanding learning paths and dependencies
      - depth parameter controls how far to traverse (default 2)
    `
  },

  /**
   * Add Prerequisite Relationship
   */
  addPrerequisite: {
    endpoint: '/api/v2/departments/:departmentId/knowledge-nodes/:nodeId/prerequisites',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Add a prerequisite relationship to a knowledge node',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        nodeId: { type: 'ObjectId', required: true }
      },
      body: {
        prerequisiteNodeId: { type: 'ObjectId', required: true, description: 'Node to add as prerequisite' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            nodeId: 'ObjectId',
            prerequisiteNodeIds: 'ObjectId[]'
          }
        }
      },
      errors: [
        { status: 400, code: 'CIRCULAR_PREREQUISITE', message: 'Would create circular dependency' },
        { status: 400, code: 'ALREADY_PREREQUISITE', message: 'Node is already a prerequisite' },
        { status: 400, code: 'SELF_REFERENCE', message: 'Node cannot be its own prerequisite' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Knowledge node not found' },
        { status: 404, code: 'PREREQUISITE_NOT_FOUND', message: 'Prerequisite node not found' }
      ]
    },

    permissions: ['content:assessments:manage']
  },

  /**
   * Remove Prerequisite Relationship
   */
  removePrerequisite: {
    endpoint: '/api/v2/departments/:departmentId/knowledge-nodes/:nodeId/prerequisites/:prereqId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Remove a prerequisite relationship from a knowledge node',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        nodeId: { type: 'ObjectId', required: true },
        prereqId: { type: 'ObjectId', required: true, description: 'Prerequisite node ID to remove' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            nodeId: 'ObjectId',
            prerequisiteNodeIds: 'ObjectId[]'
          }
        }
      },
      errors: [
        { status: 400, code: 'NOT_A_PREREQUISITE', message: 'Node is not a prerequisite' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Knowledge node not found' }
      ]
    },

    permissions: ['content:assessments:manage']
  },

  // ============================================
  // QUESTIONS FOR NODE
  // ============================================

  /**
   * Get Questions for Knowledge Node
   */
  getQuestions: {
    endpoint: '/api/v2/departments/:departmentId/knowledge-nodes/:nodeId/questions',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get questions linked to a knowledge node',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        nodeId: { type: 'ObjectId', required: true }
      },
      query: {
        cognitiveDepth: { type: 'string', required: false, description: 'Filter by cognitive depth slug' },
        questionTypes: { type: 'string[]', required: false, description: 'Filter by question types' },
        page: { type: 'number', required: false, default: 1 },
        limit: { type: 'number', required: false, default: 20, max: 100 }
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
                questionTypes: 'string[]',
                cognitiveDepth: 'string | null',
                difficulty: 'string',
                points: 'number',
                questionBankIds: 'ObjectId[]',
                tags: 'string[]'
              }
            ],
            pagination: {
              page: 'number',
              limit: 'number',
              total: 'number',
              totalPages: 'number'
            },
            depthSummary: {
              exposure: 'number',
              practice: 'number',
              proficiency: 'number',
              mastery: 'number'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Knowledge node not found' }
      ]
    },

    permissions: ['content:assessments:manage', 'content:lessons:read'],

    notes: `
      - Returns questions that have knowledgeNodeId set to this node
      - depthSummary shows question count by cognitive depth level
      - Useful for content planning - see gaps in depth coverage
    `
  }
};

// Type exports
export type KnowledgeNodesContractType = typeof KnowledgeNodesContracts;
