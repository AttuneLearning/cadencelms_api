/**
 * Module Access API Contracts
 * Version: 1.0.0
 *
 * These contracts define the ModuleAccess entity - tracking learner access
 * and engagement at the module level for analytics and progress tracking.
 *
 * Used for identifying drop-off points and understanding learner behavior.
 */

export const ModuleAccessContracts = {
  /**
   * Record Module Access
   * POST /module-access
   */
  recordAccess: {
    endpoint: '/api/v2/module-access',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Record that a learner has accessed a module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        moduleId: {
          type: 'ObjectId',
          required: true,
          description: 'Module ID'
        },
        enrollmentId: {
          type: 'ObjectId',
          required: true,
          description: 'Class enrollment ID'
        },
        courseId: {
          type: 'ObjectId',
          required: true,
          description: 'Course ID'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            moduleAccessId: 'ObjectId',
            moduleId: 'ObjectId',
            learnerId: 'ObjectId',
            enrollmentId: 'ObjectId',
            courseId: 'ObjectId',
            firstAccessedAt: 'Date',
            lastAccessedAt: 'Date',
            accessCount: 'number',
            hasStartedLearningUnit: 'boolean',
            status: 'accessed | in_progress | completed',
            isNewAccess: 'boolean'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Not enrolled in this course' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found' },
        { status: 404, code: 'ENROLLMENT_NOT_FOUND', message: 'Enrollment not found' }
      ]
    },

    example: {
      request: {
        body: {
          moduleId: '507f1f77bcf86cd799439012',
          courseId: '507f1f77bcf86cd799439011',
          enrollmentId: '507f1f77bcf86cd799439100'
        }
      },
      response: {
        success: true,
        data: {
          moduleAccessId: '507f1f77bcf86cd799439300',
          moduleId: '507f1f77bcf86cd799439012',
          learnerId: '507f1f77bcf86cd799439050',
          enrollmentId: '507f1f77bcf86cd799439100',
          courseId: '507f1f77bcf86cd799439011',
          firstAccessedAt: '2026-01-08T10:00:00.000Z',
          lastAccessedAt: '2026-01-08T10:00:00.000Z',
          accessCount: 1,
          hasStartedLearningUnit: false,
          status: 'accessed',
          isNewAccess: true
        }
      }
    },

    permissions: ['read:courses'],

    notes: `
      - Called when learner navigates to a module
      - Creates new record on first access, updates on subsequent
      - accessCount increments on each call
      - lastAccessedAt updated on each call
      - isNewAccess true if this was first time accessing
      - status starts as 'accessed', changes to 'in_progress' when learning unit started
    `
  },

  /**
   * Get Module Access by Enrollment
   * GET /module-access?enrollmentId=...
   */
  getByEnrollment: {
    endpoint: '/api/v2/module-access',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all module access records for an enrollment',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        enrollmentId: { type: 'ObjectId', required: true, description: 'Enrollment ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            enrollmentId: 'ObjectId',
            courseId: 'ObjectId',
            courseTitle: 'string',
            learnerId: 'ObjectId',
            moduleAccess: [
              {
                moduleAccessId: 'ObjectId',
                moduleId: 'ObjectId',
                moduleTitle: 'string',
                moduleOrder: 'number',
                firstAccessedAt: 'Date | null',
                lastAccessedAt: 'Date | null',
                accessCount: 'number',
                hasStartedLearningUnit: 'boolean',
                firstLearningUnitStartedAt: 'Date | null',
                learningUnitsCompleted: 'number',
                learningUnitsTotal: 'number',
                status: 'not_accessed | accessed | in_progress | completed',
                completedAt: 'Date | null'
              }
            ],
            summary: {
              totalModules: 'number',
              modulesAccessed: 'number',
              modulesInProgress: 'number',
              modulesCompleted: 'number',
              overallProgress: 'number'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Not authorized to view this enrollment' },
        { status: 404, code: 'ENROLLMENT_NOT_FOUND', message: 'Enrollment not found' }
      ]
    },

    example: {
      request: {
        query: { enrollmentId: '507f1f77bcf86cd799439100' }
      },
      response: {
        success: true,
        data: {
          enrollmentId: '507f1f77bcf86cd799439100',
          courseId: '507f1f77bcf86cd799439011',
          courseTitle: 'Introduction to Computer Science',
          learnerId: '507f1f77bcf86cd799439050',
          moduleAccess: [
            {
              moduleAccessId: '507f1f77bcf86cd799439300',
              moduleId: '507f1f77bcf86cd799439012',
              moduleTitle: 'Chapter 1: Programming Basics',
              moduleOrder: 1,
              firstAccessedAt: '2026-01-08T10:00:00.000Z',
              lastAccessedAt: '2026-01-08T14:30:00.000Z',
              accessCount: 5,
              hasStartedLearningUnit: true,
              firstLearningUnitStartedAt: '2026-01-08T10:05:00.000Z',
              learningUnitsCompleted: 3,
              learningUnitsTotal: 5,
              status: 'in_progress',
              completedAt: null
            },
            {
              moduleAccessId: null,
              moduleId: '507f1f77bcf86cd799439020',
              moduleTitle: 'Chapter 2: Data Structures',
              moduleOrder: 2,
              firstAccessedAt: null,
              lastAccessedAt: null,
              accessCount: 0,
              hasStartedLearningUnit: false,
              firstLearningUnitStartedAt: null,
              learningUnitsCompleted: 0,
              learningUnitsTotal: 8,
              status: 'not_accessed',
              completedAt: null
            }
          ],
          summary: {
            totalModules: 2,
            modulesAccessed: 1,
            modulesInProgress: 1,
            modulesCompleted: 0,
            overallProgress: 0.3
          }
        }
      }
    },

    permissions: ['read:enrollments', 'read:progress'],

    notes: `
      - Returns all modules in course with access status
      - Modules not yet accessed have null moduleAccessId
      - status 'not_accessed' for modules never opened
      - overallProgress is weighted by learning units completed
      - Useful for learner dashboard and progress tracking
    `
  },

  /**
   * Get Module Access Analytics
   * GET /module-access?moduleId=...
   */
  getByModule: {
    endpoint: '/api/v2/module-access',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all learner access records for a module (analytics)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        moduleId: { type: 'ObjectId', required: true, description: 'Module ID' },
        hasStartedLearningUnit: {
          type: 'boolean',
          required: false,
          description: 'Filter by whether learner started any learning unit'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['accessed', 'in_progress', 'completed'],
          description: 'Filter by status'
        },
        page: { type: 'number', required: false, default: 1 },
        limit: { type: 'number', required: false, default: 50 }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            moduleId: 'ObjectId',
            moduleTitle: 'string',
            courseId: 'ObjectId',
            accessRecords: [
              {
                moduleAccessId: 'ObjectId',
                learnerId: 'ObjectId',
                learnerName: 'string',
                enrollmentId: 'ObjectId',
                firstAccessedAt: 'Date',
                lastAccessedAt: 'Date',
                accessCount: 'number',
                hasStartedLearningUnit: 'boolean',
                firstLearningUnitStartedAt: 'Date | null',
                learningUnitsCompleted: 'number',
                learningUnitsTotal: 'number',
                status: 'string',
                completedAt: 'Date | null'
              }
            ],
            analytics: {
              totalAccessed: 'number',
              startedLearningUnit: 'number',
              completed: 'number',
              dropOffRate: 'number',
              averageAccessCount: 'number',
              averageTimeToFirstUnit: 'number | null'
            },
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
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found' }
      ]
    },

    example: {
      request: {
        query: { moduleId: '507f1f77bcf86cd799439012', hasStartedLearningUnit: false, page: 1, limit: 20 }
      },
      response: {
        success: true,
        data: {
          moduleId: '507f1f77bcf86cd799439012',
          moduleTitle: 'Chapter 1: Programming Basics',
          courseId: '507f1f77bcf86cd799439011',
          accessRecords: [
            {
              moduleAccessId: '507f1f77bcf86cd799439310',
              learnerId: '507f1f77bcf86cd799439060',
              learnerName: 'John Doe',
              enrollmentId: '507f1f77bcf86cd799439110',
              firstAccessedAt: '2026-01-07T09:00:00.000Z',
              lastAccessedAt: '2026-01-07T09:05:00.000Z',
              accessCount: 2,
              hasStartedLearningUnit: false,
              firstLearningUnitStartedAt: null,
              learningUnitsCompleted: 0,
              learningUnitsTotal: 5,
              status: 'accessed',
              completedAt: null
            }
          ],
          analytics: {
            totalAccessed: 150,
            startedLearningUnit: 120,
            completed: 95,
            dropOffRate: 0.2,
            averageAccessCount: 4.5,
            averageTimeToFirstUnit: 180
          },
          pagination: {
            page: 1,
            limit: 20,
            total: 30,
            totalPages: 2
          }
        }
      }
    },

    permissions: ['read:analytics'],

    notes: `
      - Staff-only endpoint for analytics
      - Filter hasStartedLearningUnit=false to find drop-offs
      - dropOffRate = (accessed - startedLearningUnit) / accessed
      - averageTimeToFirstUnit in seconds
      - Useful for identifying engagement issues
    `
  },

  /**
   * Get Course Module Access Summary
   * GET /module-access/analytics/drop-off
   */
  getSummary: {
    endpoint: '/api/v2/module-access/analytics/drop-off',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get aggregated module access summary for a course',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        courseId: { type: 'ObjectId', required: true, description: 'Course ID' },
        classId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by specific class'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            courseId: 'ObjectId',
            courseTitle: 'string',
            totalEnrollments: 'number',
            modules: [
              {
                moduleId: 'ObjectId',
                moduleTitle: 'string',
                moduleOrder: 'number',
                metrics: {
                  totalAccessed: 'number',
                  accessedPercent: 'number',
                  startedLearningUnit: 'number',
                  startedPercent: 'number',
                  completed: 'number',
                  completedPercent: 'number',
                  dropOffCount: 'number',
                  dropOffPercent: 'number'
                }
              }
            ],
            funnel: {
              enrolled: 'number',
              startedCourse: 'number',
              reachedMidpoint: 'number',
              completedCourse: 'number'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    example: {
      request: {
        query: { courseId: '507f1f77bcf86cd799439011' },
      },
      response: {
        success: true,
        data: {
          courseId: '507f1f77bcf86cd799439011',
          metrics: {
            totalModules: 12,
            totalAccess: 180,
            accessedOnly: 30,
            inProgress: 55,
            completed: 95,
            dropOffRate: 0.166,
            dropOffPercentage: 17
          },
          insights: {
            learnersNotStartingContent: 30,
            learnersStuckInProgress: 55,
            completionRate: 53
          }
        }
      }
    },

    permissions: ['read:analytics'],

    notes: `
      - Runtime analytics summary endpoint under /module-access/analytics/drop-off
      - Requires courseId query parameter
      - Returns drop-off focused aggregate metrics + insights
      - Filter by classId for class-specific metrics
    `
  },

  /**
   * Mark Learning Unit Started
   * PUT /module-access/:accessId
   */
  markLearningUnitStarted: {
    endpoint: '/api/v2/module-access/:accessId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Mark that learner has started a learning unit in the module',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        accessId: { type: 'ObjectId', required: true, description: 'Module Access ID' }
      },
      body: {
        action: {
          type: 'string',
          required: true,
          enum: ['mark_learning_unit_started'],
          description: 'Update action'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            moduleAccessId: 'ObjectId',
            hasStartedLearningUnit: true,
            firstLearningUnitStartedAt: 'Date',
            status: 'in_progress'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Not your module access record' },
        { status: 404, code: 'NOT_FOUND', message: 'Module access record not found' }
      ]
    },

    permissions: ['read:courses'],

    notes: `
      - Called when learner starts first learning unit in module
      - Uses update action payload on canonical PUT /module-access/:accessId endpoint
      - Sets status to 'in_progress'
      - Records timestamp for time-to-first-unit analytics
    `
  },

  /**
   * Update Progress
   * PUT /module-access/:accessId
   */
  updateProgress: {
    endpoint: '/api/v2/module-access/:accessId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update learning unit completion progress',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        accessId: { type: 'ObjectId', required: true, description: 'Module Access ID' }
      },
      body: {
        action: {
          type: 'string',
          required: true,
          enum: ['update_progress'],
          description: 'Update action'
        },
        learningUnitsCompleted: {
          type: 'number',
          required: true,
          min: 0,
          description: 'Number of learning units completed'
        },
        learningUnitsTotal: {
          type: 'number',
          required: true,
          min: 0,
          description: 'Total learning units in module'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            moduleAccessId: 'ObjectId',
            learningUnitsCompleted: 'number',
            learningUnitsTotal: 'number',
            progress: 'number',
            status: 'string',
            completedAt: 'Date | null'
          }
        }
      },
      errors: [
        { status: 400, code: 'INVALID_PROGRESS', message: 'Completed cannot exceed total' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Not authorized' },
        { status: 404, code: 'NOT_FOUND', message: 'Module access record not found' }
      ]
    },

    permissions: ['read:courses'],

    notes: `
      - Called when learner completes a learning unit
      - Uses update action payload on canonical PUT /module-access/:accessId endpoint
      - progress = learningUnitsCompleted / learningUnitsTotal
      - status changes to 'completed' when all required units done
      - completedAt set when status becomes 'completed'
    `
  }
};

// Type exports for consumers
export type ModuleAccessContractType = typeof ModuleAccessContracts;
export type RecordAccessRequest = typeof ModuleAccessContracts.recordAccess.example.request;
export type RecordAccessResponse = typeof ModuleAccessContracts.recordAccess.example.response;
export type GetByEnrollmentResponse = typeof ModuleAccessContracts.getByEnrollment.example.response;
export type GetByModuleResponse = typeof ModuleAccessContracts.getByModule.example.response;
export type GetSummaryResponse = typeof ModuleAccessContracts.getSummary.example.response;
