/**
 * Program Levels API Contracts
 * Version: 1.0.0
 *
 * These contracts define the program levels endpoints for the LMS API.
 * Program levels represent sequential stages within academic programs (e.g., Level 1, Level 2).
 * Both backend and UI teams use these as the source of truth.
 */

export const ProgramLevelsContracts = {
  /**
   * Get Level Details (Direct Access)
   * Shortcut endpoint for accessing level without going through parent program
   */
  getLevel: {
    endpoint: '/api/v2/program-levels/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get program level details by ID',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'ObjectId', required: true, description: 'Program level ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'ObjectId',
            name: 'string',
            order: 'number',
            programId: 'ObjectId',
            program: {
              id: 'ObjectId',
              name: 'string',
              code: 'string',
              departmentId: 'ObjectId'
            },
            description: 'string | null',
            requiredCredits: 'number | null',
            courses: 'ObjectId[]',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view level' },
        { status: 404, code: 'NOT_FOUND', message: 'Program level not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439011',
          name: 'Level 1: Foundation',
          order: 1,
          programId: '507f1f77bcf86cd799439012',
          program: {
            id: '507f1f77bcf86cd799439012',
            name: 'Certificate in Business Technology',
            code: 'CBT-101',
            departmentId: '507f1f77bcf86cd799439013'
          },
          description: 'Foundation courses covering basic business and technology concepts',
          requiredCredits: 15,
          courses: [
            '507f1f77bcf86cd799439014',
            '507f1f77bcf86cd799439015',
            '507f1f77bcf86cd799439016'
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-05T10:30:00.000Z'
        }
      }
    },

    permissions: ['read:programs', 'dept-scoped'],

    notes: `
      - Requires authentication
      - Admin sees all levels
      - Staff see levels in their assigned departments only
      - Learners see levels in programs they're enrolled in
      - Includes populated program reference for context
      - Order is 1-indexed (1, 2, 3...)
      - requiredCredits can be null if program doesn't use credit system
      - courses array contains course IDs associated with this level
    `
  },

  /**
   * Update Level
   */
  updateLevel: {
    endpoint: '/api/v2/program-levels/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update program level details',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'ObjectId', required: true, description: 'Program level ID' }
      },
      body: {
        name: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 200,
          description: 'Level name'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000,
          description: 'Level description'
        },
        requiredCredits: {
          type: 'number',
          required: false,
          min: 0,
          description: 'Required credits for level completion'
        },
        courses: {
          type: 'ObjectId[]',
          required: false,
          description: 'Array of course IDs for this level'
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
            id: 'ObjectId',
            name: 'string',
            order: 'number',
            programId: 'ObjectId',
            description: 'string | null',
            requiredCredits: 'number | null',
            courses: 'ObjectId[]',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update level' },
        { status: 404, code: 'NOT_FOUND', message: 'Program level not found' },
        { status: 409, code: 'DUPLICATE_NAME', message: 'Level name already exists in this program' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        body: {
          name: 'Level 1: Core Foundation',
          description: 'Updated foundation courses with enhanced core curriculum',
          requiredCredits: 18,
          courses: [
            '507f1f77bcf86cd799439014',
            '507f1f77bcf86cd799439015',
            '507f1f77bcf86cd799439016',
            '507f1f77bcf86cd799439017'
          ]
        }
      },
      response: {
        success: true,
        message: 'Program level updated successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          name: 'Level 1: Core Foundation',
          order: 1,
          programId: '507f1f77bcf86cd799439012',
          description: 'Updated foundation courses with enhanced core curriculum',
          requiredCredits: 18,
          courses: [
            '507f1f77bcf86cd799439014',
            '507f1f77bcf86cd799439015',
            '507f1f77bcf86cd799439016',
            '507f1f77bcf86cd799439017'
          ],
          updatedAt: '2026-01-08T12:45:00.000Z'
        }
      }
    },

    permissions: ['write:programs', 'dept-scoped'],

    notes: `
      - Requires authentication and write:programs permission
      - Admin can update any level
      - Staff can only update levels in their assigned departments
      - Cannot change the 'order' field via this endpoint (use reorder endpoint)
      - Cannot change the 'programId' (level belongs to program)
      - Name must be unique within the program
      - Validation:
        - name: 1-200 characters, required
        - description: 0-2000 characters, optional
        - requiredCredits: >= 0 or null
        - courses: must be valid ObjectIds
      - Adding courses array associates courses with this level
      - Removing course from array doesn't delete course, just disassociates
    `
  },

  /**
   * Delete Level
   */
  deleteLevel: {
    endpoint: '/api/v2/program-levels/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete program level',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'ObjectId', required: true, description: 'Program level ID' }
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete level' },
        { status: 404, code: 'NOT_FOUND', message: 'Program level not found' },
        { status: 409, code: 'HAS_ENROLLMENTS', message: 'Cannot delete level with active enrollments' },
        { status: 409, code: 'HAS_COURSES', message: 'Cannot delete level with associated courses' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        }
      },
      response: {
        success: true,
        message: 'Program level deleted successfully'
      }
    },

    permissions: ['delete:programs', 'dept-scoped'],

    notes: `
      - Requires authentication and delete:programs permission
      - Admin can delete any level
      - Staff can only delete levels in their assigned departments
      - Cannot delete level if:
        - Level has enrolled learners at that stage
        - Level has associated courses (must disassociate first)
        - Level is the only level in the program (programs need at least one level)
      - Deletion reorders remaining levels automatically
        - Example: Deleting Level 2 from [Level 1, Level 2, Level 3] results in [Level 1, Level 2]
      - This is a soft delete (sets deletedAt timestamp)
      - Deleted levels don't appear in queries unless specifically requested
    `
  },

  /**
   * Reorder Level in Sequence
   */
  reorderLevel: {
    endpoint: '/api/v2/program-levels/:id/reorder',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Reorder level within program sequence',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'ObjectId', required: true, description: 'Program level ID to reorder' }
      },
      body: {
        newOrder: {
          type: 'number',
          required: true,
          min: 1,
          description: 'New order position (1-indexed)'
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
            updatedLevels: [
              {
                id: 'ObjectId',
                name: 'string',
                order: 'number'
              }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid order value' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to reorder level' },
        { status: 404, code: 'NOT_FOUND', message: 'Program level not found' },
        { status: 409, code: 'INVALID_ORDER', message: 'Order value exceeds number of levels in program' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        body: {
          newOrder: 3
        }
      },
      response: {
        success: true,
        message: 'Program level reordered successfully',
        data: {
          updatedLevels: [
            { id: '507f1f77bcf86cd799439018', name: 'Level 1: Foundation', order: 1 },
            { id: '507f1f77bcf86cd799439019', name: 'Level 2: Intermediate', order: 2 },
            { id: '507f1f77bcf86cd799439011', name: 'Level 3: Advanced', order: 3 }
          ]
        }
      }
    },

    permissions: ['write:programs', 'dept-scoped'],

    notes: `
      - Requires authentication and write:programs permission
      - Admin can reorder any level
      - Staff can only reorder levels in their assigned departments
      - Order is 1-indexed (1, 2, 3, 4...)
      - newOrder must be between 1 and total number of levels in program
      - Reordering shifts other levels automatically:
        - Moving Level 3 to position 1: [L1, L2, L3, L4] → [L3, L1, L2, L4]
        - Moving Level 1 to position 3: [L1, L2, L3, L4] → [L2, L3, L1, L4]
      - Returns all updated levels with new order values
      - Order must be sequential with no gaps (1, 2, 3, not 1, 3, 5)
      - Order must be unique within program (no duplicate order values)
      - Updates are atomic (all levels updated together or none)
      - Cannot reorder if level has active enrollments and change would break progression
        - Example: Cannot move Level 1 after Level 2 if learners are enrolled in Level 1
        - This prevents breaking the academic progression logic
    `
  }
};

// Type exports for consumers
export type ProgramLevelsContractType = typeof ProgramLevelsContracts;
export type GetLevelResponse = typeof ProgramLevelsContracts.getLevel.example.response;
export type UpdateLevelRequest = typeof ProgramLevelsContracts.updateLevel.example.request.body;
export type UpdateLevelResponse = typeof ProgramLevelsContracts.updateLevel.example.response;
export type ReorderLevelRequest = typeof ProgramLevelsContracts.reorderLevel.example.request.body;
export type ReorderLevelResponse = typeof ProgramLevelsContracts.reorderLevel.example.response;
