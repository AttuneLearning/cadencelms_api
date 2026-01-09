/**
 * Classes (Course Instances) API Contracts
 * Version: 1.0.0
 *
 * These contracts define the class management endpoints for the LMS API.
 * A class is a specific instance of a course with schedules, instructors, and enrolled learners.
 * Both backend and UI teams use these as the source of truth.
 */

export const ClassesContract = {
  /**
   * List Classes
   */
  list: {
    endpoint: '/api/v2/classes',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all classes with optional filtering',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
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
          default: 10,
          min: 1,
          max: 100,
          description: 'Number of results per page'
        },
        course: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by course ID'
        },
        program: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by program ID'
        },
        instructor: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by instructor (staff user ID)'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['upcoming', 'active', 'completed', 'cancelled'],
          description: 'Filter by class status'
        },
        department: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department ID'
        },
        term: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by academic term ID'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by class name'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-startDate',
          description: 'Sort field (prefix with - for descending)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            classes: [
              {
                id: 'ObjectId',
                name: 'string',
                course: {
                  id: 'ObjectId',
                  title: 'string',
                  code: 'string'
                },
                program: {
                  id: 'ObjectId',
                  name: 'string'
                },
                programLevel: {
                  id: 'ObjectId',
                  name: 'string',
                  levelNumber: 'number'
                },
                instructors: [
                  {
                    id: 'ObjectId',
                    firstName: 'string',
                    lastName: 'string',
                    email: 'string',
                    role: 'primary|secondary'
                  }
                ],
                startDate: 'Date',
                endDate: 'Date',
                duration: 'number',
                capacity: 'number | null',
                enrolledCount: 'number',
                academicTerm: {
                  id: 'ObjectId',
                  name: 'string'
                },
                status: 'upcoming|active|completed|cancelled',
                department: {
                  id: 'ObjectId',
                  name: 'string'
                },
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' }
      ]
    },

    example: {
      request: {
        query: {
          program: '507f1f77bcf86cd799439015',
          status: 'active',
          page: 1,
          limit: 10
        }
      },
      response: {
        success: true,
        data: {
          classes: [
            {
              id: '507f1f77bcf86cd799439020',
              name: 'CBT Fundamentals - Spring 2026',
              course: {
                id: '507f1f77bcf86cd799439018',
                title: 'CBT Fundamentals',
                code: 'CBT101'
              },
              program: {
                id: '507f1f77bcf86cd799439015',
                name: 'Cognitive Behavioral Therapy Certificate'
              },
              programLevel: {
                id: '507f1f77bcf86cd799439016',
                name: 'Level 1',
                levelNumber: 1
              },
              instructors: [
                {
                  id: '507f1f77bcf86cd799439012',
                  firstName: 'Dr. Sarah',
                  lastName: 'Johnson',
                  email: 'sarah.johnson@example.com',
                  role: 'primary'
                }
              ],
              startDate: '2026-02-01T00:00:00Z',
              endDate: '2026-05-15T00:00:00Z',
              duration: 14,
              capacity: 30,
              enrolledCount: 25,
              academicTerm: {
                id: '507f1f77bcf86cd799439021',
                name: 'Spring 2026'
              },
              status: 'active',
              department: {
                id: '507f1f77bcf86cd799439013',
                name: 'Clinical Psychology'
              },
              createdAt: '2025-12-01T00:00:00Z',
              updatedAt: '2026-01-08T00:00:00Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:classes', 'staff with department access'],

    notes: `
      - Global admins can see all classes
      - Staff users can only see classes in their assigned departments
      - Learners can only see classes they are enrolled in (use /enrollments endpoint)
      - Status is automatically calculated based on current date:
        - upcoming: current date < startDate
        - active: startDate <= current date <= endDate
        - completed: current date > endDate
        - cancelled: manually set
      - enrolledCount is dynamically calculated from class enrollments
      - Results are paginated (default 10 per page)
      - Sort by: startDate, endDate, createdAt, name (prefix with - for descending)
    `
  },

  /**
   * Create Class
   */
  create: {
    endpoint: '/api/v2/classes',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new class (course instance)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        name: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 200,
          description: 'Class name (e.g., "CBT Fundamentals - Spring 2026")'
        },
        course: {
          type: 'ObjectId',
          required: true,
          description: 'Course ID this class is based on'
        },
        program: {
          type: 'ObjectId',
          required: true,
          description: 'Program ID this class belongs to'
        },
        programLevel: {
          type: 'ObjectId',
          required: false,
          description: 'Program level ID (optional)'
        },
        instructors: {
          type: 'Array<{userId: ObjectId, role: "primary"|"secondary"}>',
          required: true,
          minLength: 1,
          description: 'At least one instructor required'
        },
        startDate: {
          type: 'Date',
          required: true,
          description: 'Class start date'
        },
        endDate: {
          type: 'Date',
          required: true,
          description: 'Class end date'
        },
        duration: {
          type: 'number',
          required: false,
          description: 'Duration in weeks (auto-calculated if not provided)'
        },
        capacity: {
          type: 'number',
          required: false,
          min: 1,
          description: 'Maximum number of learners (null for unlimited)'
        },
        academicTerm: {
          type: 'ObjectId',
          required: false,
          description: 'Academic term ID'
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
            name: 'string',
            course: {
              id: 'ObjectId',
              title: 'string',
              code: 'string'
            },
            program: {
              id: 'ObjectId',
              name: 'string'
            },
            programLevel: {
              id: 'ObjectId',
              name: 'string',
              levelNumber: 'number'
            },
            instructors: [
              {
                id: 'ObjectId',
                firstName: 'string',
                lastName: 'string',
                email: 'string',
                role: 'primary|secondary'
              }
            ],
            startDate: 'Date',
            endDate: 'Date',
            duration: 'number',
            capacity: 'number | null',
            enrolledCount: 'number',
            academicTerm: {
              id: 'ObjectId',
              name: 'string'
            },
            status: 'upcoming',
            department: {
              id: 'ObjectId',
              name: 'string'
            },
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to create classes' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' },
        { status: 400, code: 'INVALID_DATE_RANGE', message: 'End date must be after start date' },
        { status: 400, code: 'INVALID_INSTRUCTOR', message: 'One or more instructors not found or not staff' },
        { status: 409, code: 'DUPLICATE_CLASS', message: 'A class with this name already exists for this course and term' }
      ]
    },

    example: {
      request: {
        name: 'CBT Fundamentals - Spring 2026',
        course: '507f1f77bcf86cd799439018',
        program: '507f1f77bcf86cd799439015',
        programLevel: '507f1f77bcf86cd799439016',
        instructors: [
          {
            userId: '507f1f77bcf86cd799439012',
            role: 'primary'
          }
        ],
        startDate: '2026-02-01T00:00:00Z',
        endDate: '2026-05-15T00:00:00Z',
        capacity: 30,
        academicTerm: '507f1f77bcf86cd799439021'
      },
      response: {
        success: true,
        message: 'Class created successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          name: 'CBT Fundamentals - Spring 2026',
          course: {
            id: '507f1f77bcf86cd799439018',
            title: 'CBT Fundamentals',
            code: 'CBT101'
          },
          program: {
            id: '507f1f77bcf86cd799439015',
            name: 'Cognitive Behavioral Therapy Certificate'
          },
          programLevel: {
            id: '507f1f77bcf86cd799439016',
            name: 'Level 1',
            levelNumber: 1
          },
          instructors: [
            {
              id: '507f1f77bcf86cd799439012',
              firstName: 'Dr. Sarah',
              lastName: 'Johnson',
              email: 'sarah.johnson@example.com',
              role: 'primary'
            }
          ],
          startDate: '2026-02-01T00:00:00Z',
          endDate: '2026-05-15T00:00:00Z',
          duration: 14,
          capacity: 30,
          enrolledCount: 0,
          academicTerm: {
            id: '507f1f77bcf86cd799439021',
            name: 'Spring 2026'
          },
          status: 'upcoming',
          department: {
            id: '507f1f77bcf86cd799439013',
            name: 'Clinical Psychology'
          },
          createdAt: '2026-01-08T00:00:00Z',
          updatedAt: '2026-01-08T00:00:00Z'
        }
      }
    },

    permissions: ['write:classes', 'staff with department access'],

    notes: `
      - User must have write:classes permission or be staff in the course's department
      - Course must exist and be published
      - Program must exist and be active
      - All instructors must be valid staff users with appropriate department access
      - At least one instructor with role='primary' is required
      - End date must be after start date
      - Duration is auto-calculated in weeks if not provided
      - Status is auto-set to 'upcoming' on creation
      - Department is inherited from the course
      - Validation:
        - name: 1-200 characters
        - capacity: positive integer or null for unlimited
        - instructors: at least one required
        - dates: valid date format and logical range
    `
  },

  /**
   * Get Class Details
   */
  getById: {
    endpoint: '/api/v2/classes/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific class',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Class ID'
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
            name: 'string',
            course: {
              id: 'ObjectId',
              title: 'string',
              code: 'string',
              description: 'string',
              credits: 'number'
            },
            program: {
              id: 'ObjectId',
              name: 'string',
              code: 'string'
            },
            programLevel: {
              id: 'ObjectId',
              name: 'string',
              levelNumber: 'number'
            },
            instructors: [
              {
                id: 'ObjectId',
                firstName: 'string',
                lastName: 'string',
                email: 'string',
                role: 'primary|secondary',
                profileImage: 'string | null'
              }
            ],
            startDate: 'Date',
            endDate: 'Date',
            duration: 'number',
            capacity: 'number | null',
            enrolledCount: 'number',
            waitlistCount: 'number',
            academicTerm: {
              id: 'ObjectId',
              name: 'string',
              startDate: 'Date',
              endDate: 'Date'
            },
            status: 'upcoming|active|completed|cancelled',
            department: {
              id: 'ObjectId',
              name: 'string',
              code: 'string'
            },
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this class' },
        { status: 404, code: 'CLASS_NOT_FOUND', message: 'Class not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439020'
        }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439020',
          name: 'CBT Fundamentals - Spring 2026',
          course: {
            id: '507f1f77bcf86cd799439018',
            title: 'CBT Fundamentals',
            code: 'CBT101',
            description: 'Introduction to Cognitive Behavioral Therapy principles and practices',
            credits: 3
          },
          program: {
            id: '507f1f77bcf86cd799439015',
            name: 'Cognitive Behavioral Therapy Certificate',
            code: 'CBT-CERT'
          },
          programLevel: {
            id: '507f1f77bcf86cd799439016',
            name: 'Level 1',
            levelNumber: 1
          },
          instructors: [
            {
              id: '507f1f77bcf86cd799439012',
              firstName: 'Dr. Sarah',
              lastName: 'Johnson',
              email: 'sarah.johnson@example.com',
              role: 'primary',
              profileImage: 'https://cdn.example.com/profiles/sarah.jpg'
            }
          ],
          startDate: '2026-02-01T00:00:00Z',
          endDate: '2026-05-15T00:00:00Z',
          duration: 14,
          capacity: 30,
          enrolledCount: 25,
          waitlistCount: 0,
          academicTerm: {
            id: '507f1f77bcf86cd799439021',
            name: 'Spring 2026',
            startDate: '2026-01-15T00:00:00Z',
            endDate: '2026-05-31T00:00:00Z'
          },
          status: 'active',
          department: {
            id: '507f1f77bcf86cd799439013',
            name: 'Clinical Psychology',
            code: 'PSYCH-CLIN'
          },
          createdAt: '2025-12-01T00:00:00Z',
          updatedAt: '2026-01-08T00:00:00Z'
        }
      }
    },

    permissions: ['read:classes', 'staff with department access', 'enrolled learner'],

    notes: `
      - Global admins can view any class
      - Staff can view classes in their assigned departments
      - Learners can only view classes they are enrolled in
      - Returns expanded/populated references for course, program, instructors, etc.
      - waitlistCount is included if waitlist feature is enabled
      - Status is dynamically calculated based on dates
    `
  },

  /**
   * Update Class
   */
  update: {
    endpoint: '/api/v2/classes/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update class information',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Class ID'
        }
      },
      body: {
        name: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 200
        },
        instructors: {
          type: 'Array<{userId: ObjectId, role: "primary"|"secondary"}>',
          required: false,
          minLength: 1,
          description: 'Updated instructor assignments'
        },
        startDate: {
          type: 'Date',
          required: false
        },
        endDate: {
          type: 'Date',
          required: false
        },
        duration: {
          type: 'number',
          required: false
        },
        capacity: {
          type: 'number | null',
          required: false,
          min: 1,
          description: 'Maximum learners (null for unlimited)'
        },
        academicTerm: {
          type: 'ObjectId',
          required: false
        },
        status: {
          type: 'string',
          required: false,
          enum: ['upcoming', 'active', 'completed', 'cancelled'],
          description: 'Manually override status'
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
            /* Same structure as getById response */
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update this class' },
        { status: 404, code: 'CLASS_NOT_FOUND', message: 'Class not found' },
        { status: 400, code: 'INVALID_DATE_RANGE', message: 'End date must be after start date' },
        { status: 400, code: 'CAPACITY_EXCEEDED', message: 'Cannot reduce capacity below current enrollment count' },
        { status: 400, code: 'INVALID_INSTRUCTOR', message: 'One or more instructors not found or not staff' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439020'
        },
        body: {
          capacity: 35,
          instructors: [
            {
              userId: '507f1f77bcf86cd799439012',
              role: 'primary'
            },
            {
              userId: '507f1f77bcf86cd799439014',
              role: 'secondary'
            }
          ]
        }
      },
      response: {
        success: true,
        message: 'Class updated successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          name: 'CBT Fundamentals - Spring 2026',
          capacity: 35,
          instructors: [
            {
              id: '507f1f77bcf86cd799439012',
              firstName: 'Dr. Sarah',
              lastName: 'Johnson',
              email: 'sarah.johnson@example.com',
              role: 'primary',
              profileImage: 'https://cdn.example.com/profiles/sarah.jpg'
            },
            {
              id: '507f1f77bcf86cd799439014',
              firstName: 'Dr. Michael',
              lastName: 'Chen',
              email: 'michael.chen@example.com',
              role: 'secondary',
              profileImage: 'https://cdn.example.com/profiles/michael.jpg'
            }
          ]
          /* ... rest of class data ... */
        }
      }
    },

    permissions: ['write:classes', 'staff with department access'],

    notes: `
      - User must have write:classes permission or be staff in the course's department
      - Cannot change course or program after creation (must create new class)
      - Cannot reduce capacity below current enrollment count
      - Must maintain at least one primary instructor
      - Dates can be updated but must maintain logical order
      - Status can be manually overridden (e.g., to cancel a class)
      - All fields are optional (partial update)
      - Validation same as create endpoint
    `
  },

  /**
   * Delete Class
   */
  delete: {
    endpoint: '/api/v2/classes/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a class (soft delete if enrollments exist)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Class ID'
        }
      },
      query: {
        force: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Force hard delete even with enrollments (admin only)'
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
            deleted: 'boolean',
            deletedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete this class' },
        { status: 404, code: 'CLASS_NOT_FOUND', message: 'Class not found' },
        { status: 400, code: 'HAS_ENROLLMENTS', message: 'Cannot delete class with active enrollments. Set status to cancelled instead.' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439020'
        }
      },
      response: {
        success: true,
        message: 'Class deleted successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          deleted: true,
          deletedAt: '2026-01-08T10:30:00Z'
        }
      }
    },

    permissions: ['delete:classes', 'staff with department access'],

    notes: `
      - Only classes without enrollments can be deleted
      - If class has enrollments, set status to 'cancelled' instead
      - Global admins can force delete with ?force=true (cascade deletes enrollments)
      - Soft delete preserves data for audit purposes
      - Related enrollments are NOT deleted automatically (orphaned prevention)
      - Use with caution - deleted classes cannot be restored
    `
  },

  /**
   * Get Class Enrollments
   */
  getEnrollments: {
    endpoint: '/api/v2/classes/:id/enrollments',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all enrollments for a class',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Class ID'
        }
      },
      query: {
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'withdrawn', 'completed'],
          description: 'Filter by enrollment status'
        },
        page: {
          type: 'number',
          required: false,
          default: 1,
          min: 1
        },
        limit: {
          type: 'number',
          required: false,
          default: 50,
          min: 1,
          max: 200
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            classId: 'ObjectId',
            enrollments: [
              {
                id: 'ObjectId',
                learner: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string',
                  email: 'string',
                  studentId: 'string | null'
                },
                enrolledAt: 'Date',
                status: 'active|withdrawn|completed',
                withdrawnAt: 'Date | null',
                completedAt: 'Date | null'
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view enrollments' },
        { status: 404, code: 'CLASS_NOT_FOUND', message: 'Class not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439020'
        },
        query: {
          status: 'active',
          page: 1,
          limit: 50
        }
      },
      response: {
        success: true,
        data: {
          classId: '507f1f77bcf86cd799439020',
          enrollments: [
            {
              id: '507f1f77bcf86cd799439025',
              learner: {
                id: '507f1f77bcf86cd799439030',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                studentId: 'STU-2026-001'
              },
              enrolledAt: '2026-01-05T09:00:00Z',
              status: 'active',
              withdrawnAt: null,
              completedAt: null
            },
            {
              id: '507f1f77bcf86cd799439026',
              learner: {
                id: '507f1f77bcf86cd799439031',
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com',
                studentId: 'STU-2026-002'
              },
              enrolledAt: '2026-01-05T10:30:00Z',
              status: 'active',
              withdrawnAt: null,
              completedAt: null
            }
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 25,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:enrollments', 'instructor of class', 'staff with department access'],

    notes: `
      - Instructors can view enrollments for their assigned classes
      - Staff can view enrollments for classes in their departments
      - Returns basic learner information (not full profiles)
      - Filter by status to see active, withdrawn, or completed enrollments
      - Results are paginated (default 50 per page, max 200)
      - Sorted by enrolledAt ascending (earliest first)
    `
  },

  /**
   * Enroll Learners in Class
   */
  enrollLearners: {
    endpoint: '/api/v2/classes/:id/enrollments',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Enroll one or more learners in a class',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Class ID'
        }
      },
      body: {
        learnerIds: {
          type: 'ObjectId[]',
          required: true,
          minLength: 1,
          description: 'Array of learner user IDs to enroll'
        },
        enrolledAt: {
          type: 'Date',
          required: false,
          description: 'Enrollment date (defaults to now)'
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
            classId: 'ObjectId',
            enrollments: [
              {
                id: 'ObjectId',
                learner: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string',
                  email: 'string'
                },
                enrolledAt: 'Date',
                status: 'active'
              }
            ],
            successCount: 'number',
            failedCount: 'number',
            errors: [
              {
                learnerId: 'ObjectId',
                reason: 'string'
              }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid learner IDs' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to enroll learners' },
        { status: 404, code: 'CLASS_NOT_FOUND', message: 'Class not found' },
        { status: 400, code: 'CLASS_FULL', message: 'Class has reached capacity' },
        { status: 409, code: 'ALREADY_ENROLLED', message: 'One or more learners already enrolled in this class' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439020'
        },
        body: {
          learnerIds: [
            '507f1f77bcf86cd799439030',
            '507f1f77bcf86cd799439031'
          ]
        }
      },
      response: {
        success: true,
        message: '2 learners enrolled successfully',
        data: {
          classId: '507f1f77bcf86cd799439020',
          enrollments: [
            {
              id: '507f1f77bcf86cd799439025',
              learner: {
                id: '507f1f77bcf86cd799439030',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com'
              },
              enrolledAt: '2026-01-08T10:30:00Z',
              status: 'active'
            },
            {
              id: '507f1f77bcf86cd799439026',
              learner: {
                id: '507f1f77bcf86cd799439031',
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com'
              },
              enrolledAt: '2026-01-08T10:30:00Z',
              status: 'active'
            }
          ],
          successCount: 2,
          failedCount: 0,
          errors: []
        }
      }
    },

    permissions: ['write:enrollments', 'instructor of class', 'staff with department access'],

    notes: `
      - Supports bulk enrollment (multiple learners at once)
      - Checks class capacity before enrolling
      - Prevents duplicate enrollments (learner already in class)
      - All learner IDs must exist and be valid learner accounts
      - Returns partial success if some enrollments fail
      - Enrollment status defaults to 'active'
      - Sends enrollment confirmation notifications to learners
      - Updates class enrolledCount automatically
      - Validation:
        - learnerIds: at least one required
        - Must not exceed class capacity
        - Learners must not be already enrolled
    `
  },

  /**
   * Drop Learner from Class
   */
  dropEnrollment: {
    endpoint: '/api/v2/classes/:id/enrollments/:enrollmentId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Remove a learner enrollment from a class',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Class ID'
        },
        enrollmentId: {
          type: 'ObjectId',
          required: true,
          description: 'Class enrollment ID'
        }
      },
      query: {
        reason: {
          type: 'string',
          required: false,
          maxLength: 500,
          description: 'Reason for withdrawal'
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
            enrollmentId: 'ObjectId',
            status: 'withdrawn',
            withdrawnAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to drop enrollment' },
        { status: 404, code: 'ENROLLMENT_NOT_FOUND', message: 'Enrollment not found' },
        { status: 400, code: 'ALREADY_WITHDRAWN', message: 'Enrollment already withdrawn' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439020',
          enrollmentId: '507f1f77bcf86cd799439025'
        },
        query: {
          reason: 'Student requested withdrawal'
        }
      },
      response: {
        success: true,
        message: 'Enrollment withdrawn successfully',
        data: {
          enrollmentId: '507f1f77bcf86cd799439025',
          status: 'withdrawn',
          withdrawnAt: '2026-01-08T10:30:00Z'
        }
      }
    },

    permissions: ['write:enrollments', 'instructor of class', 'staff with department access'],

    notes: `
      - Soft delete - sets enrollment status to 'withdrawn'
      - Preserves enrollment record for audit purposes
      - Updates class enrolledCount automatically
      - Cannot withdraw already completed enrollments
      - Sends withdrawal notification to learner
      - Optional reason field for documentation
      - Related progress data is preserved but inactive
    `
  },

  /**
   * Get Class Roster
   */
  getRoster: {
    endpoint: '/api/v2/classes/:id/roster',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get class roster with learner details and progress',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Class ID'
        }
      },
      query: {
        includeProgress: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include progress/attendance data'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'withdrawn', 'completed'],
          description: 'Filter by enrollment status'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            classId: 'ObjectId',
            className: 'string',
            totalEnrolled: 'number',
            roster: [
              {
                enrollmentId: 'ObjectId',
                learner: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string',
                  email: 'string',
                  studentId: 'string | null',
                  profileImage: 'string | null'
                },
                enrolledAt: 'Date',
                status: 'active|withdrawn|completed',
                progress: {
                  completionPercent: 'number',
                  modulesCompleted: 'number',
                  modulesTotal: 'number',
                  currentScore: 'number | null',
                  lastAccessedAt: 'Date | null'
                },
                attendance: {
                  sessionsAttended: 'number',
                  totalSessions: 'number',
                  attendanceRate: 'number'
                }
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view roster' },
        { status: 404, code: 'CLASS_NOT_FOUND', message: 'Class not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439020'
        },
        query: {
          includeProgress: true,
          status: 'active'
        }
      },
      response: {
        success: true,
        data: {
          classId: '507f1f77bcf86cd799439020',
          className: 'CBT Fundamentals - Spring 2026',
          totalEnrolled: 25,
          roster: [
            {
              enrollmentId: '507f1f77bcf86cd799439025',
              learner: {
                id: '507f1f77bcf86cd799439030',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                studentId: 'STU-2026-001',
                profileImage: 'https://cdn.example.com/profiles/john.jpg'
              },
              enrolledAt: '2026-01-05T09:00:00Z',
              status: 'active',
              progress: {
                completionPercent: 65,
                modulesCompleted: 3,
                modulesTotal: 5,
                currentScore: 85,
                lastAccessedAt: '2026-01-08T08:30:00Z'
              },
              attendance: {
                sessionsAttended: 8,
                totalSessions: 10,
                attendanceRate: 0.8
              }
            },
            {
              enrollmentId: '507f1f77bcf86cd799439026',
              learner: {
                id: '507f1f77bcf86cd799439031',
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com',
                studentId: 'STU-2026-002',
                profileImage: null
              },
              enrolledAt: '2026-01-05T10:30:00Z',
              status: 'active',
              progress: {
                completionPercent: 45,
                modulesCompleted: 2,
                modulesTotal: 5,
                currentScore: 78,
                lastAccessedAt: '2026-01-07T14:20:00Z'
              },
              attendance: {
                sessionsAttended: 9,
                totalSessions: 10,
                attendanceRate: 0.9
              }
            }
          ]
        }
      }
    },

    permissions: ['read:enrollments', 'instructor of class', 'staff with department access'],

    notes: `
      - Provides comprehensive view for instructors and staff
      - Includes learner progress from course enrollment data
      - Attendance data requires attendance tracking feature enabled
      - Progress data aggregated from course content attempts
      - Sorted by learner lastName, firstName
      - Set includeProgress=false for faster response without progress data
      - currentScore is average across all completed assessments
      - lastAccessedAt shows most recent activity in any course module
    `
  },

  /**
   * Get Class Progress Summary
   */
  getProgress: {
    endpoint: '/api/v2/classes/:id/progress',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get class-wide progress statistics and analytics',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Class ID'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            classId: 'ObjectId',
            className: 'string',
            totalLearners: 'number',
            activeEnrollments: 'number',
            averageProgress: 'number',
            averageScore: 'number',
            completedCount: 'number',
            inProgressCount: 'number',
            notStartedCount: 'number',
            averageTimeSpent: 'number',
            byModule: [
              {
                moduleId: 'ObjectId',
                title: 'string',
                order: 'number',
                completedCount: 'number',
                inProgressCount: 'number',
                notStartedCount: 'number',
                averageScore: 'number | null',
                averageAttempts: 'number',
                averageTimeSpent: 'number'
              }
            ],
            progressDistribution: {
              '0-25': 'number',
              '26-50': 'number',
              '51-75': 'number',
              '76-100': 'number'
            },
            scoreDistribution: {
              'A (90-100)': 'number',
              'B (80-89)': 'number',
              'C (70-79)': 'number',
              'D (60-69)': 'number',
              'F (0-59)': 'number'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view progress' },
        { status: 404, code: 'CLASS_NOT_FOUND', message: 'Class not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439020'
        }
      },
      response: {
        success: true,
        data: {
          classId: '507f1f77bcf86cd799439020',
          className: 'CBT Fundamentals - Spring 2026',
          totalLearners: 25,
          activeEnrollments: 25,
          averageProgress: 0.68,
          averageScore: 78.5,
          completedCount: 15,
          inProgressCount: 8,
          notStartedCount: 2,
          averageTimeSpent: 14400,
          byModule: [
            {
              moduleId: '507f1f77bcf86cd799439040',
              title: 'Introduction to CBT',
              order: 1,
              completedCount: 23,
              inProgressCount: 2,
              notStartedCount: 0,
              averageScore: 85,
              averageAttempts: 1.2,
              averageTimeSpent: 3600
            },
            {
              moduleId: '507f1f77bcf86cd799439041',
              title: 'Cognitive Techniques',
              order: 2,
              completedCount: 20,
              inProgressCount: 3,
              notStartedCount: 2,
              averageScore: 78,
              averageAttempts: 1.5,
              averageTimeSpent: 4200
            },
            {
              moduleId: '507f1f77bcf86cd799439042',
              title: 'Behavioral Interventions',
              order: 3,
              completedCount: 15,
              inProgressCount: 5,
              notStartedCount: 5,
              averageScore: 72,
              averageAttempts: 1.8,
              averageTimeSpent: 3800
            }
          ],
          progressDistribution: {
            '0-25': 3,
            '26-50': 5,
            '51-75': 7,
            '76-100': 10
          },
          scoreDistribution: {
            'A (90-100)': 5,
            'B (80-89)': 8,
            'C (70-79)': 7,
            'D (60-69)': 3,
            'F (0-59)': 2
          }
        }
      }
    },

    permissions: ['read:analytics', 'instructor of class', 'staff with department access'],

    notes: `
      - Provides aggregate statistics for instructors to monitor class performance
      - averageProgress is a decimal from 0-1 (percentage / 100)
      - averageScore is calculated from all completed assessments
      - averageTimeSpent is in seconds
      - Module-level breakdown helps identify difficult content
      - Distribution charts help visualize class performance
      - Data is cached and updated periodically (not real-time)
      - notStartedCount includes enrolled learners who haven't accessed course yet
      - Excludes withdrawn enrollments from calculations
    `
  }
};

// Type exports for consumers
export type ClassesContractType = typeof ClassesContract;
export type ListClassesRequest = typeof ClassesContract.list.request;
export type ListClassesResponse = typeof ClassesContract.list.example.response;
export type CreateClassRequest = typeof ClassesContract.create.example.request;
export type CreateClassResponse = typeof ClassesContract.create.example.response;
export type GetClassResponse = typeof ClassesContract.getById.example.response;
export type UpdateClassRequest = typeof ClassesContract.update.example.request;
export type UpdateClassResponse = typeof ClassesContract.update.example.response;
export type EnrollLearnersRequest = typeof ClassesContract.enrollLearners.example.request;
export type EnrollLearnersResponse = typeof ClassesContract.enrollLearners.example.response;
export type ClassRosterResponse = typeof ClassesContract.getRoster.example.response;
export type ClassProgressResponse = typeof ClassesContract.getProgress.example.response;
