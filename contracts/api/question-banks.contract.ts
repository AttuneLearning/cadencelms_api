/**
 * Question Banks API Contracts
 * Version: 1.1.0
 *
 * These contracts define the department-scoped Question Bank management endpoints.
 * Question Banks are collections of reusable questions that can be linked to Learning Units.
 *
 * Base paths:
 * - /api/v2/departments/:departmentId/question-banks (CRUD)
 * - /api/v2/departments/:departmentId/questions (Department-scoped questions)
 * - /api/v2/admin/question-banks/copy (Cross-department copy)
 * - /api/v2/admin/questions/copy (Cross-department question copy)
 *
 * v1.1.0 Changes:
 * - Added optional knowledgeNodeId and cognitiveDepth fields to questions
 * - Question Banks are ADMINISTRATIVE groupings (by course, topic, exam)
 * - Knowledge Nodes are CONCEPTUAL groupings (by knowledge area for adaptive learning)
 * - A question belongs to ONE Question Bank but can link to ONE Knowledge Node
 * - Both systems work independently - adaptive learning is optional
 *
 * Related: UI-ISS-068 (Learning Activity Flow)
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md, knowledge-nodes.contract.ts
 */

export const QuestionBanksContracts = {
  // ============================================
  // QUESTION BANK CRUD
  // ============================================

  /**
   * List Question Banks in Department
   */
  list: {
    endpoint: '/api/v2/departments/:departmentId/question-banks',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all question banks in a department',

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
        page: { type: 'number', required: false, default: 1 },
        limit: { type: 'number', required: false, default: 20, max: 100 },
        sort: { type: 'string', required: false, default: '-createdAt' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            questionBanks: [
              {
                id: 'ObjectId',
                departmentId: 'ObjectId',
                name: 'string',
                description: 'string | null',
                questionCount: 'number',
                tags: 'string[]',
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

    permissions: ['content:assessments:manage', 'content:lessons:read'],

    notes: `
      - Returns question banks accessible to authenticated user in department
      - questionCount is computed from linked questions
      - Supports search, tag filtering, and pagination
    `
  },

  /**
   * Create Question Bank
   */
  create: {
    endpoint: '/api/v2/departments/:departmentId/question-banks',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new question bank in a department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true, description: 'Department ID' }
      },
      body: {
        name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
        description: { type: 'string', required: false, maxLength: 2000 },
        tags: { type: 'string[]', required: false }
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
            description: 'string | null',
            questionCount: 'number',
            tags: 'string[]',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'DUPLICATE_NAME', message: 'Question bank with this name already exists in department' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    permissions: ['content:assessments:manage']
  },

  /**
   * Get Question Bank Details
   */
  getById: {
    endpoint: '/api/v2/departments/:departmentId/question-banks/:bankId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information for a question bank',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        bankId: { type: 'ObjectId', required: true }
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
            description: 'string | null',
            questionCount: 'number',
            tags: 'string[]',
            usageCount: 'number (learning units using this bank)',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Question bank not found' }
      ]
    },

    permissions: ['content:assessments:manage', 'content:lessons:read']
  },

  /**
   * Update Question Bank
   */
  update: {
    endpoint: '/api/v2/departments/:departmentId/question-banks/:bankId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update a question bank',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        bankId: { type: 'ObjectId', required: true }
      },
      body: {
        name: { type: 'string', required: false, minLength: 1, maxLength: 200 },
        description: { type: 'string', required: false, maxLength: 2000 },
        tags: { type: 'string[]', required: false }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: '{ ...questionBank }'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'DUPLICATE_NAME', message: 'Question bank with this name already exists' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Question bank not found' }
      ]
    },

    permissions: ['content:assessments:manage']
  },

  /**
   * Delete Question Bank
   */
  delete: {
    endpoint: '/api/v2/departments/:departmentId/question-banks/:bankId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a question bank',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        bankId: { type: 'ObjectId', required: true }
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
          message: 'string'
        }
      },
      errors: [
        { status: 400, code: 'BANK_HAS_QUESTIONS', message: 'Cannot delete bank with linked questions. Use force=true or remove questions first.' },
        { status: 400, code: 'BANK_IN_USE', message: 'Cannot delete bank in use by learning units' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Question bank not found' }
      ]
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - Soft delete (marks as inactive)
      - Cannot delete if bank is in use by learning units (unless force=true)
      - When deleted, questions remain but are unlinked from this bank
    `
  },

  // ============================================
  // DEPARTMENT-SCOPED QUESTIONS
  // ============================================

  /**
   * List Questions in Department
   */
  listDepartmentQuestions: {
    endpoint: '/api/v2/departments/:departmentId/questions',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all questions in a department with filtering',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        departmentId: { type: 'ObjectId', required: true, description: 'Department ID' }
      },
      query: {
        type: {
          type: 'string',
          required: false,
          enum: ['multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'long_answer', 'matching', 'flashcard', 'fill_in_blank'],
          description: 'Filter by question type'
        },
        difficulty: {
          type: 'string',
          required: false,
          enum: ['easy', 'medium', 'hard'],
          description: 'Filter by difficulty'
        },
        tags: { type: 'string', required: false, description: 'Comma-separated tag filter' },
        search: { type: 'string', required: false, description: 'Search question text' },
        bankId: { type: 'ObjectId', required: false, description: 'Filter by question bank' },
        // Adaptive Learning Filters (Optional)
        knowledgeNodeId: { type: 'ObjectId', required: false, description: '[Adaptive] Filter by knowledge node' },
        cognitiveDepth: { type: 'string', required: false, description: '[Adaptive] Filter by cognitive depth slug' },
        hasKnowledgeNode: { type: 'boolean', required: false, description: '[Adaptive] Filter questions with/without knowledge node' },
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
                departmentId: 'ObjectId',
                questionBankIds: 'ObjectId[]',
                bankNames: 'string[] (populated bank names)',
                type: 'string',
                text: 'string',
                difficulty: 'string',
                tags: 'string[]',
                points: 'number',
                explanation: 'string | null',
                options: 'array | null (for choice types)',
                // Adaptive Learning Fields (Optional - null if not set)
                knowledgeNodeId: 'ObjectId | null',
                knowledgeNodeName: 'string | null (populated)',
                cognitiveDepth: 'string | null',
                hierarchy: {
                  parentQuestionId: 'ObjectId | null',
                  relatedQuestionIds: 'ObjectId[]',
                  prerequisiteQuestionIds: 'ObjectId[]',
                  conceptTag: 'string | null',
                  difficultyProgression: 'number | null'
                },
                usageCount: 'number',
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

    permissions: ['content:assessments:manage', 'content:lessons:read']
  },

  /**
   * Create Question in Department
   */
  createDepartmentQuestion: {
    endpoint: '/api/v2/departments/:departmentId/questions',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new question in a department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true }
      },
      body: {
        questionBankIds: { type: 'ObjectId[]', required: false, description: 'Question banks to add to (questions can belong to multiple banks)' },
        type: {
          type: 'string',
          required: true,
          enum: ['multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'long_answer', 'matching', 'flashcard', 'fill_in_blank']
        },
        text: { type: 'string', required: true, maxLength: 5000, description: 'Question text' },
        difficulty: { type: 'string', required: false, enum: ['easy', 'medium', 'hard'], default: 'medium' },
        tags: { type: 'string[]', required: false },
        points: { type: 'number', required: true, min: 1 },
        explanation: { type: 'string', required: false, maxLength: 2000 },

        // Type-specific fields
        options: {
          type: 'array',
          required: false,
          description: 'For multiple_choice, multiple_select, true_false',
          items: {
            id: 'string (auto-generated if not provided)',
            text: 'string',
            isCorrect: 'boolean'
          }
        },
        acceptedAnswers: { type: 'string[]', required: false, description: 'For short_answer' },
        matchThreshold: { type: 'number', required: false, default: 80, description: 'For short_answer fuzzy matching (0-100)' },
        sampleAnswer: { type: 'string', required: false, description: 'For long_answer/essay' },
        rubric: { type: 'string', required: false, description: 'For long_answer grading rubric' },
        pairs: {
          type: 'array',
          required: false,
          description: 'For matching type',
          items: { left: 'string', right: 'string' }
        },
        cards: {
          type: 'array',
          required: false,
          description: 'For flashcard type',
          items: { front: 'string', back: 'string', hint: 'string | null' }
        },
        blanks: {
          type: 'array',
          required: false,
          description: 'For fill_in_blank type',
          items: { position: 'number', acceptedAnswers: 'string[]', matchThreshold: 'number' }
        },

        // Hierarchy for adaptive testing (legacy - consider using Knowledge Nodes instead)
        hierarchy: {
          type: 'object',
          required: false,
          description: 'Question relationships for adaptive testing',
          properties: {
            parentQuestionId: 'ObjectId | null',
            relatedQuestionIds: 'ObjectId[]',
            prerequisiteQuestionIds: 'ObjectId[]',
            conceptTag: 'string | null',
            difficultyProgression: 'number | null'
          }
        },

        // Adaptive Learning Fields (Optional Enhancement)
        knowledgeNodeId: {
          type: 'ObjectId',
          required: false,
          description: '[Adaptive] Link question to a knowledge node for adaptive learning'
        },
        cognitiveDepth: {
          type: 'string',
          required: false,
          description: '[Adaptive] Cognitive depth level slug - validated against CognitiveDepthLevel'
        }
      }
    },

    response: {
      success: {
        status: 201,
        body: {
          success: 'boolean',
          message: 'string',
          data: '{ ...question }'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'INVALID_OPTIONS', message: 'Options required for choice-type questions' },
        { status: 400, code: 'NO_CORRECT_ANSWER', message: 'At least one correct option required' },
        { status: 400, code: 'INVALID_KNOWLEDGE_NODE', message: '[Adaptive] Knowledge node not found or not in department' },
        { status: 400, code: 'INVALID_COGNITIVE_DEPTH', message: '[Adaptive] Cognitive depth level not found' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' },
        { status: 404, code: 'BANK_NOT_FOUND', message: 'Question bank not found' }
      ]
    },

    permissions: ['content:assessments:manage'],

    notes: `
      ADAPTIVE LEARNING (Optional):
      - knowledgeNodeId links question to a conceptual topic for adaptive selection
      - cognitiveDepth stores the depth level slug
      - Both fields are OPTIONAL - questions work without them
      - Question Banks are ADMINISTRATIVE groupings (by course, exam)
      - Knowledge Nodes are CONCEPTUAL groupings (by knowledge area)
      - A question can be in a Question Bank AND linked to a Knowledge Node
    `
  },

  /**
   * Get Question Details
   */
  getDepartmentQuestion: {
    endpoint: '/api/v2/departments/:departmentId/questions/:questionId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information for a question',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        questionId: { type: 'ObjectId', required: true }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: '{ ...question with all fields }'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Question not found' }
      ]
    },

    permissions: ['content:assessments:manage', 'content:lessons:read']
  },

  /**
   * Update Question
   */
  updateDepartmentQuestion: {
    endpoint: '/api/v2/departments/:departmentId/questions/:questionId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update an existing question',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        questionId: { type: 'ObjectId', required: true }
      },
      body: '{ ...same fields as create, all optional }'
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: '{ ...updated question }'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Question not found' }
      ]
    },

    permissions: ['content:assessments:manage']
  },

  /**
   * Delete Question
   */
  deleteDepartmentQuestion: {
    endpoint: '/api/v2/departments/:departmentId/questions/:questionId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a question',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        departmentId: { type: 'ObjectId', required: true },
        questionId: { type: 'ObjectId', required: true }
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
        {
          status: 400,
          code: 'QUESTION_HAS_DEPENDENCIES',
          message: 'Cannot delete question. It is linked to learning units.',
          body: {
            error: 'QUESTION_HAS_DEPENDENCIES',
            message: 'Cannot delete question. It is linked to N learning units.',
            dependencies: [
              { learningUnitId: 'ObjectId', title: 'string' }
            ]
          }
        },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this department' },
        { status: 404, code: 'NOT_FOUND', message: 'Question not found' }
      ]
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - Returns error with dependency list if question is linked to learning units
      - User must unlink question from all learning units before deletion
      - No cascade delete - explicit unlinking required
    `
  },

  // ============================================
  // ADMIN COPY ENDPOINTS
  // ============================================

  /**
   * Copy Questions Between Departments (System Admin Only)
   */
  adminCopyQuestions: {
    endpoint: '/api/v2/admin/questions/copy',
    method: 'POST' as const,
    internalOnly: true,
    version: '1.0.0',
    description: 'Copy questions between departments (system admin only)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        questionIds: { type: 'ObjectId[]', required: true, description: 'Questions to copy' },
        sourceDepartmentId: { type: 'ObjectId', required: true },
        targetDepartmentId: { type: 'ObjectId', required: true },
        targetBankId: { type: 'ObjectId', required: false, description: 'Target bank (optional)' }
      }
    },

    response: {
      success: {
        status: 201,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            copied: 'number',
            newQuestionIds: 'ObjectId[]',
            mappings: [
              { sourceId: 'ObjectId', targetId: 'ObjectId' }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'System admin access required' },
        { status: 404, code: 'NOT_FOUND', message: 'Source questions, departments, or bank not found' }
      ]
    },

    permissions: ['system:*'],

    notes: `
      - System admin only
      - Creates deep copies of questions in target department
      - Optionally assigns to target bank
      - Returns mapping of source to target IDs
      - Hierarchy relationships are NOT copied (must be re-established)
    `
  },

  /**
   * Copy Question Bank Between Departments (System Admin Only)
   */
  adminCopyBank: {
    endpoint: '/api/v2/admin/question-banks/copy',
    method: 'POST' as const,
    internalOnly: true,
    version: '1.0.0',
    description: 'Copy entire question bank between departments (system admin only)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        bankId: { type: 'ObjectId', required: true, description: 'Source bank ID' },
        sourceDepartmentId: { type: 'ObjectId', required: true },
        targetDepartmentId: { type: 'ObjectId', required: true },
        newName: { type: 'string', required: false, description: 'Name for copied bank (defaults to "Original Name (Copy)")' }
      }
    },

    response: {
      success: {
        status: 201,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            newBankId: 'ObjectId',
            questionsCopied: 'number',
            questionMappings: [
              { sourceId: 'ObjectId', targetId: 'ObjectId' }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
        { status: 400, code: 'DUPLICATE_NAME', message: 'Bank with this name already exists in target department' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'System admin access required' },
        { status: 404, code: 'NOT_FOUND', message: 'Bank or departments not found' }
      ]
    },

    permissions: ['system:*'],

    notes: `
      - System admin only
      - Copies bank and all its questions
      - Questions are deep copied (new IDs)
      - Returns mapping of source to target question IDs
    `
  },

  // ============================================
  // QUESTION SETTINGS (Admin Configurable)
  // ============================================

  /**
   * Get Question Settings
   */
  getQuestionSettings: {
    endpoint: '/api/v2/settings/question',
    method: 'GET' as const,
    internalOnly: true,
    version: '1.0.0',
    description: 'Get admin-configurable question settings',

    request: {
      headers: { 'Authorization': 'Bearer <token>' }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            category: 'question',
            settings: {
              matchThreshold: {
                default: 'number (0-100, fuzzy match % for short_answer)',
                min: 'number (minimum allowed)',
                max: 'number (maximum allowed)'
              },
              bulkOperations: {
                maxItems: 'number (max questions per bulk link)',
                maxBanksPerCopy: 'number (max banks per admin copy)'
              }
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Admin access required' }
      ]
    },

    permissions: ['content:assessments:manage'],

    notes: `
      - Returns admin-configurable defaults for question operations
      - matchThreshold.default is used when creating short_answer questions without explicit threshold
      - bulkOperations.maxItems limits the questions array in bulk link operations
    `
  },

  /**
   * Update Question Settings
   */
  updateQuestionSettings: {
    endpoint: '/api/v2/settings/question',
    method: 'PUT' as const,
    internalOnly: true,
    version: '1.0.0',
    description: 'Update admin-configurable question settings',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        matchThreshold: {
          type: 'object',
          required: false,
          properties: {
            default: { type: 'number', min: 50, max: 100 },
            min: { type: 'number', min: 0, max: 100 },
            max: { type: 'number', min: 50, max: 100 }
          }
        },
        bulkOperations: {
          type: 'object',
          required: false,
          properties: {
            maxItems: { type: 'number', min: 1, max: 1000 },
            maxBanksPerCopy: { type: 'number', min: 1, max: 50 }
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
          data: '{ ...updated settings }'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid settings values' },
        { status: 400, code: 'BULK_LIMIT_EXCEEDED', message: 'Requested value exceeds allowed maximum' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'System admin access required' }
      ]
    },

    permissions: ['system:*'],

    notes: `
      - System admin only
      - Partial updates supported - only include fields to change
      - Changes take effect immediately for new operations
    `
  }
};

// Type exports
export type QuestionBanksContractType = typeof QuestionBanksContracts;
