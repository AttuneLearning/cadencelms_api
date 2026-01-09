/**
 * Academic Calendar API Contracts
 * Version: 1.0.0
 *
 * These contracts define the academic calendar management endpoints for the LMS API.
 * Covers academic years, terms, and cohorts (year groups).
 * Both backend and UI teams use these as the source of truth.
 */

export const AcademicCalendarContracts = {
  /**
   * =====================
   * ACADEMIC YEARS
   * =====================
   */

  /**
   * List Academic Years
   */
  listYears: {
    endpoint: '/api/v2/calendar/years',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all academic years',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        isCurrent: { type: 'boolean', required: false, description: 'Filter by current year' },
        status: { type: 'string', required: false, enum: ['active', 'past', 'future'], description: 'Filter by status' },
        sort: { type: 'string', required: false, default: '-startDate', description: 'Sort field (prefix with - for desc)' },
        page: { type: 'number', required: false, default: 1, min: 1 },
        limit: { type: 'number', required: false, default: 10, min: 1, max: 100 }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            years: [
              {
                id: 'string',
                name: 'string',
                startDate: 'Date',
                endDate: 'Date',
                isCurrent: 'boolean',
                status: 'active|past|future',
                termCount: 'number',
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
          sort: '-startDate',
          limit: 20
        }
      },
      response: {
        success: true,
        data: {
          years: [
            {
              id: '507f1f77bcf86cd799439011',
              name: '2025-2026 Academic Year',
              startDate: '2025-09-01T00:00:00.000Z',
              endDate: '2026-08-31T23:59:59.999Z',
              isCurrent: true,
              status: 'active',
              termCount: 3,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439012',
              name: '2024-2025 Academic Year',
              startDate: '2024-09-01T00:00:00.000Z',
              endDate: '2025-08-31T23:59:59.999Z',
              isCurrent: false,
              status: 'past',
              termCount: 3,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-12-31T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['admin', 'staff'],

    notes: `
      - Returns all academic years ordered by start date (newest first by default)
      - Status is computed based on current date vs startDate/endDate
      - Only ONE year can have isCurrent=true at a time
      - Staff can view all years, but only admins can create/modify
      - termCount is a computed field showing number of terms in this year
      - Pagination is optional (default: page=1, limit=10)
    `
  },

  /**
   * Create Academic Year
   */
  createYear: {
    endpoint: '/api/v2/calendar/years',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new academic year',

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
          maxLength: 100,
          description: 'Year name (e.g., "2025-2026 Academic Year")'
        },
        startDate: {
          type: 'Date',
          required: true,
          description: 'Academic year start date (ISO 8601)'
        },
        endDate: {
          type: 'Date',
          required: true,
          description: 'Academic year end date (ISO 8601)'
        },
        isCurrent: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Mark as current academic year'
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
            name: 'string',
            startDate: 'Date',
            endDate: 'Date',
            isCurrent: 'boolean',
            status: 'active|past|future',
            termCount: 'number',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions - admin only' },
        { status: 409, code: 'YEAR_EXISTS', message: 'Academic year with this name already exists' },
        { status: 409, code: 'DATE_OVERLAP', message: 'Academic year dates overlap with existing year' }
      ]
    },

    example: {
      request: {
        name: '2026-2027 Academic Year',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2027-08-31T23:59:59.999Z',
        isCurrent: false
      },
      response: {
        success: true,
        message: 'Academic year created successfully',
        data: {
          id: '507f1f77bcf86cd799439013',
          name: '2026-2027 Academic Year',
          startDate: '2026-09-01T00:00:00.000Z',
          endDate: '2027-08-31T23:59:59.999Z',
          isCurrent: false,
          status: 'future',
          termCount: 0,
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['admin'],

    notes: `
      - Admin permission required
      - Name must be unique
      - endDate must be after startDate
      - Date ranges cannot overlap with existing years
      - If isCurrent=true, system automatically sets current year's isCurrent=false
      - Only ONE year can be current at a time
      - Status is auto-computed based on current date
      - Validation rules:
        - name: 1-100 characters, unique
        - startDate: valid ISO 8601 date
        - endDate: valid ISO 8601 date, after startDate
        - No date overlap with existing years
    `
  },

  /**
   * Get Academic Year Details
   */
  getYear: {
    endpoint: '/api/v2/calendar/years/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get details of a specific academic year',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'string', required: true, description: 'Academic year ID' }
      },
      query: {
        includeTerms: { type: 'boolean', required: false, default: false, description: 'Include terms for this year' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'string',
            name: 'string',
            startDate: 'Date',
            endDate: 'Date',
            isCurrent: 'boolean',
            status: 'active|past|future',
            termCount: 'number',
            terms: [
              {
                id: 'string',
                name: 'string',
                startDate: 'Date',
                endDate: 'Date',
                termType: 'string'
              }
            ],
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'NOT_FOUND', message: 'Academic year not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        query: {
          includeTerms: true
        }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439011',
          name: '2025-2026 Academic Year',
          startDate: '2025-09-01T00:00:00.000Z',
          endDate: '2026-08-31T23:59:59.999Z',
          isCurrent: true,
          status: 'active',
          termCount: 3,
          terms: [
            {
              id: '507f1f77bcf86cd799439021',
              name: 'Fall 2025',
              startDate: '2025-09-01T00:00:00.000Z',
              endDate: '2025-12-20T23:59:59.999Z',
              termType: 'fall'
            },
            {
              id: '507f1f77bcf86cd799439022',
              name: 'Spring 2026',
              startDate: '2026-01-15T00:00:00.000Z',
              endDate: '2026-05-15T23:59:59.999Z',
              termType: 'spring'
            },
            {
              id: '507f1f77bcf86cd799439023',
              name: 'Summer 2026',
              startDate: '2026-06-01T00:00:00.000Z',
              endDate: '2026-08-31T23:59:59.999Z',
              termType: 'summer'
            }
          ],
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z'
        }
      }
    },

    permissions: ['admin', 'staff'],

    notes: `
      - Returns complete year details
      - terms array only populated if includeTerms=true
      - Terms are ordered by startDate ascending
      - Staff can view all years
    `
  },

  /**
   * Update Academic Year
   */
  updateYear: {
    endpoint: '/api/v2/calendar/years/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update an academic year',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true, description: 'Academic year ID' }
      },
      body: {
        name: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100
        },
        startDate: {
          type: 'Date',
          required: false
        },
        endDate: {
          type: 'Date',
          required: false
        },
        isCurrent: {
          type: 'boolean',
          required: false
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
            id: 'string',
            name: 'string',
            startDate: 'Date',
            endDate: 'Date',
            isCurrent: 'boolean',
            status: 'active|past|future',
            termCount: 'number',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions - admin only' },
        { status: 404, code: 'NOT_FOUND', message: 'Academic year not found' },
        { status: 409, code: 'YEAR_EXISTS', message: 'Academic year with this name already exists' },
        { status: 409, code: 'DATE_OVERLAP', message: 'Updated dates overlap with existing year' },
        { status: 409, code: 'TERMS_CONFLICT', message: 'Date changes would create conflicts with existing terms' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        body: {
          name: '2025-2026 Academic Year (Updated)',
          isCurrent: true
        }
      },
      response: {
        success: true,
        message: 'Academic year updated successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          name: '2025-2026 Academic Year (Updated)',
          startDate: '2025-09-01T00:00:00.000Z',
          endDate: '2026-08-31T23:59:59.999Z',
          isCurrent: true,
          status: 'active',
          termCount: 3,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['admin'],

    notes: `
      - Admin permission required
      - All fields are optional (partial update)
      - If updating dates, must validate against existing terms
      - Cannot change dates if it would make existing terms fall outside range
      - If setting isCurrent=true, system automatically updates previous current year
      - Name must be unique if changed
      - Date range must not overlap with other years
    `
  },

  /**
   * Delete Academic Year
   */
  deleteYear: {
    endpoint: '/api/v2/calendar/years/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete an academic year',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'string', required: true, description: 'Academic year ID' }
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions - admin only' },
        { status: 404, code: 'NOT_FOUND', message: 'Academic year not found' },
        { status: 409, code: 'HAS_TERMS', message: 'Cannot delete year with existing terms' },
        { status: 409, code: 'IS_CURRENT', message: 'Cannot delete current academic year' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439013'
        }
      },
      response: {
        success: true,
        message: 'Academic year deleted successfully'
      }
    },

    permissions: ['admin'],

    notes: `
      - Admin permission required
      - Cannot delete if year has associated terms (must delete terms first)
      - Cannot delete current academic year (change current year first)
      - This is a hard delete (consider soft delete in implementation)
      - Consider implementing cascade rules or blocking deletes with dependencies
    `
  },

  /**
   * =====================
   * ACADEMIC TERMS
   * =====================
   */

  /**
   * List Academic Terms
   */
  listTerms: {
    endpoint: '/api/v2/calendar/terms',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all academic terms',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        academicYear: { type: 'string', required: false, description: 'Filter by academic year ID' },
        termType: {
          type: 'string',
          required: false,
          enum: ['fall', 'spring', 'summer', 'winter', 'quarter1', 'quarter2', 'quarter3', 'quarter4', 'custom'],
          description: 'Filter by term type'
        },
        status: { type: 'string', required: false, enum: ['active', 'past', 'future'], description: 'Filter by status' },
        sort: { type: 'string', required: false, default: '-startDate', description: 'Sort field' },
        page: { type: 'number', required: false, default: 1, min: 1 },
        limit: { type: 'number', required: false, default: 10, min: 1, max: 100 }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            terms: [
              {
                id: 'string',
                name: 'string',
                academicYear: {
                  id: 'string',
                  name: 'string'
                },
                startDate: 'Date',
                endDate: 'Date',
                termType: 'string',
                status: 'active|past|future',
                classCount: 'number',
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
          academicYear: '507f1f77bcf86cd799439011',
          sort: 'startDate'
        }
      },
      response: {
        success: true,
        data: {
          terms: [
            {
              id: '507f1f77bcf86cd799439021',
              name: 'Fall 2025',
              academicYear: {
                id: '507f1f77bcf86cd799439011',
                name: '2025-2026 Academic Year'
              },
              startDate: '2025-09-01T00:00:00.000Z',
              endDate: '2025-12-20T23:59:59.999Z',
              termType: 'fall',
              status: 'active',
              classCount: 15,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439022',
              name: 'Spring 2026',
              academicYear: {
                id: '507f1f77bcf86cd799439011',
                name: '2025-2026 Academic Year'
              },
              startDate: '2026-01-15T00:00:00.000Z',
              endDate: '2026-05-15T23:59:59.999Z',
              termType: 'spring',
              status: 'future',
              classCount: 0,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['admin', 'staff'],

    notes: `
      - Returns all terms with populated academic year reference
      - Status computed based on current date vs term dates
      - termType helps categorize semesters, quarters, etc.
      - classCount shows number of classes scheduled in this term
      - Can filter by academicYear to get terms for specific year
      - Staff can view all terms
    `
  },

  /**
   * Create Academic Term
   */
  createTerm: {
    endpoint: '/api/v2/calendar/terms',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new academic term',

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
          maxLength: 100,
          description: 'Term name (e.g., "Fall 2025")'
        },
        academicYear: {
          type: 'string',
          required: true,
          description: 'Academic year ID this term belongs to'
        },
        startDate: {
          type: 'Date',
          required: true,
          description: 'Term start date'
        },
        endDate: {
          type: 'Date',
          required: true,
          description: 'Term end date'
        },
        termType: {
          type: 'string',
          required: true,
          enum: ['fall', 'spring', 'summer', 'winter', 'quarter1', 'quarter2', 'quarter3', 'quarter4', 'custom'],
          description: 'Type of term'
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
            name: 'string',
            academicYear: {
              id: 'string',
              name: 'string'
            },
            startDate: 'Date',
            endDate: 'Date',
            termType: 'string',
            status: 'active|past|future',
            classCount: 'number',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions - admin only' },
        { status: 404, code: 'YEAR_NOT_FOUND', message: 'Academic year not found' },
        { status: 409, code: 'TERM_EXISTS', message: 'Term with this name already exists in this year' },
        { status: 409, code: 'DATE_OVERLAP', message: 'Term dates overlap with existing term in this year' },
        { status: 409, code: 'OUTSIDE_YEAR', message: 'Term dates must be within academic year dates' }
      ]
    },

    example: {
      request: {
        name: 'Fall 2026',
        academicYear: '507f1f77bcf86cd799439013',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-12-20T23:59:59.999Z',
        termType: 'fall'
      },
      response: {
        success: true,
        message: 'Academic term created successfully',
        data: {
          id: '507f1f77bcf86cd799439024',
          name: 'Fall 2026',
          academicYear: {
            id: '507f1f77bcf86cd799439013',
            name: '2026-2027 Academic Year'
          },
          startDate: '2026-09-01T00:00:00.000Z',
          endDate: '2026-12-20T23:59:59.999Z',
          termType: 'fall',
          status: 'future',
          classCount: 0,
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['admin'],

    notes: `
      - Admin permission required
      - Academic year must exist
      - Term name must be unique within the academic year
      - endDate must be after startDate
      - Term dates must fall within academic year's startDate and endDate
      - Term dates cannot overlap with other terms in the same year
      - termType helps organize semester vs quarter vs custom schedules
      - Validation rules:
        - name: 1-100 characters, unique within year
        - startDate/endDate: valid dates, within academic year range
        - No overlap with existing terms in same year
    `
  },

  /**
   * Get Academic Term Details
   */
  getTerm: {
    endpoint: '/api/v2/calendar/terms/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get details of a specific academic term',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'string', required: true, description: 'Academic term ID' }
      },
      query: {
        includeClasses: { type: 'boolean', required: false, default: false, description: 'Include classes for this term' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'string',
            name: 'string',
            academicYear: {
              id: 'string',
              name: 'string',
              startDate: 'Date',
              endDate: 'Date'
            },
            startDate: 'Date',
            endDate: 'Date',
            termType: 'string',
            status: 'active|past|future',
            classCount: 'number',
            classes: [
              {
                id: 'string',
                name: 'string',
                course: { id: 'string', title: 'string' },
                startDate: 'Date',
                endDate: 'Date'
              }
            ],
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'NOT_FOUND', message: 'Academic term not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439021'
        },
        query: {
          includeClasses: true
        }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439021',
          name: 'Fall 2025',
          academicYear: {
            id: '507f1f77bcf86cd799439011',
            name: '2025-2026 Academic Year',
            startDate: '2025-09-01T00:00:00.000Z',
            endDate: '2026-08-31T23:59:59.999Z'
          },
          startDate: '2025-09-01T00:00:00.000Z',
          endDate: '2025-12-20T23:59:59.999Z',
          termType: 'fall',
          status: 'active',
          classCount: 2,
          classes: [
            {
              id: '507f1f77bcf86cd799439031',
              name: 'Math 101 - Section A',
              course: {
                id: '507f1f77bcf86cd799439041',
                title: 'Introduction to Mathematics'
              },
              startDate: '2025-09-01T00:00:00.000Z',
              endDate: '2025-12-20T23:59:59.999Z'
            }
          ],
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z'
        }
      }
    },

    permissions: ['admin', 'staff'],

    notes: `
      - Returns complete term details with academic year
      - classes array only populated if includeClasses=true
      - Classes are ordered by start date
      - Staff can view all terms
    `
  },

  /**
   * Update Academic Term
   */
  updateTerm: {
    endpoint: '/api/v2/calendar/terms/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update an academic term',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true, description: 'Academic term ID' }
      },
      body: {
        name: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100
        },
        startDate: {
          type: 'Date',
          required: false
        },
        endDate: {
          type: 'Date',
          required: false
        },
        termType: {
          type: 'string',
          required: false,
          enum: ['fall', 'spring', 'summer', 'winter', 'quarter1', 'quarter2', 'quarter3', 'quarter4', 'custom']
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
            id: 'string',
            name: 'string',
            academicYear: {
              id: 'string',
              name: 'string'
            },
            startDate: 'Date',
            endDate: 'Date',
            termType: 'string',
            status: 'active|past|future',
            classCount: 'number',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions - admin only' },
        { status: 404, code: 'NOT_FOUND', message: 'Academic term not found' },
        { status: 409, code: 'TERM_EXISTS', message: 'Term with this name already exists in this year' },
        { status: 409, code: 'DATE_OVERLAP', message: 'Updated dates overlap with existing term' },
        { status: 409, code: 'OUTSIDE_YEAR', message: 'Updated dates must be within academic year dates' },
        { status: 409, code: 'CLASSES_CONFLICT', message: 'Date changes would create conflicts with existing classes' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439021'
        },
        body: {
          name: 'Fall 2025 (Extended)',
          endDate: '2025-12-23T23:59:59.999Z'
        }
      },
      response: {
        success: true,
        message: 'Academic term updated successfully',
        data: {
          id: '507f1f77bcf86cd799439021',
          name: 'Fall 2025 (Extended)',
          academicYear: {
            id: '507f1f77bcf86cd799439011',
            name: '2025-2026 Academic Year'
          },
          startDate: '2025-09-01T00:00:00.000Z',
          endDate: '2025-12-23T23:59:59.999Z',
          termType: 'fall',
          status: 'active',
          classCount: 15,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['admin'],

    notes: `
      - Admin permission required
      - All fields are optional (partial update)
      - Cannot change academicYear (delete and recreate instead)
      - If updating dates, must validate against existing classes
      - Cannot change dates if it would make existing classes fall outside range
      - Name must be unique within academic year if changed
      - Dates must remain within academic year boundaries
      - Dates cannot overlap with other terms in same year
    `
  },

  /**
   * Delete Academic Term
   */
  deleteTerm: {
    endpoint: '/api/v2/calendar/terms/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete an academic term',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'string', required: true, description: 'Academic term ID' }
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions - admin only' },
        { status: 404, code: 'NOT_FOUND', message: 'Academic term not found' },
        { status: 409, code: 'HAS_CLASSES', message: 'Cannot delete term with existing classes' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439024'
        }
      },
      response: {
        success: true,
        message: 'Academic term deleted successfully'
      }
    },

    permissions: ['admin'],

    notes: `
      - Admin permission required
      - Cannot delete if term has associated classes (must delete classes first)
      - This is a hard delete (consider soft delete in implementation)
      - Consider implementing cascade rules or blocking deletes with dependencies
    `
  },

  /**
   * =====================
   * COHORTS / YEAR GROUPS
   * =====================
   */

  /**
   * List Cohorts
   */
  listCohorts: {
    endpoint: '/api/v2/calendar/cohorts',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all cohorts/year groups',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        academicYear: { type: 'string', required: false, description: 'Filter by academic year ID' },
        program: { type: 'string', required: false, description: 'Filter by program ID' },
        level: { type: 'string', required: false, description: 'Filter by program level' },
        status: { type: 'string', required: false, enum: ['active', 'graduated', 'inactive'], description: 'Filter by status' },
        sort: { type: 'string', required: false, default: '-startYear', description: 'Sort field' },
        page: { type: 'number', required: false, default: 1, min: 1 },
        limit: { type: 'number', required: false, default: 10, min: 1, max: 100 }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            cohorts: [
              {
                id: 'string',
                name: 'string',
                code: 'string',
                academicYear: {
                  id: 'string',
                  name: 'string'
                },
                program: {
                  id: 'string',
                  name: 'string'
                },
                level: 'string',
                startYear: 'number',
                endYear: 'number',
                status: 'active|graduated|inactive',
                learnerCount: 'number',
                description: 'string',
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
          academicYear: '507f1f77bcf86cd799439011',
          status: 'active'
        }
      },
      response: {
        success: true,
        data: {
          cohorts: [
            {
              id: '507f1f77bcf86cd799439051',
              name: 'Class of 2026',
              code: 'COH-2026',
              academicYear: {
                id: '507f1f77bcf86cd799439011',
                name: '2025-2026 Academic Year'
              },
              program: {
                id: '507f1f77bcf86cd799439061',
                name: 'Computer Science Degree'
              },
              level: 'Year 2',
              startYear: 2024,
              endYear: 2026,
              status: 'active',
              learnerCount: 45,
              description: 'Second year computer science students',
              createdAt: '2024-09-01T00:00:00.000Z',
              updatedAt: '2025-09-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439052',
              name: 'Class of 2027',
              code: 'COH-2027',
              academicYear: {
                id: '507f1f77bcf86cd799439011',
                name: '2025-2026 Academic Year'
              },
              program: {
                id: '507f1f77bcf86cd799439061',
                name: 'Computer Science Degree'
              },
              level: 'Year 1',
              startYear: 2025,
              endYear: 2027,
              status: 'active',
              learnerCount: 52,
              description: 'First year computer science students',
              createdAt: '2025-09-01T00:00:00.000Z',
              updatedAt: '2025-09-01T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['admin', 'staff'],

    notes: `
      - Cohorts represent groups of learners progressing through a program together
      - Often called "year groups" or "graduating class"
      - Useful for organizing learners by entry year and graduation year
      - learnerCount shows current number of enrolled learners
      - Status transitions: active -> graduated (or inactive if discontinued)
      - Can filter by program to see all cohorts in a program
      - Staff can view all cohorts
    `
  },

  /**
   * Create Cohort
   */
  createCohort: {
    endpoint: '/api/v2/calendar/cohorts',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new cohort/year group',

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
          maxLength: 100,
          description: 'Cohort name (e.g., "Class of 2026")'
        },
        code: {
          type: 'string',
          required: true,
          pattern: '^[A-Z0-9-]+$',
          description: 'Unique cohort code (e.g., "COH-2026")'
        },
        academicYear: {
          type: 'string',
          required: true,
          description: 'Current academic year ID for this cohort'
        },
        program: {
          type: 'string',
          required: true,
          description: 'Program ID this cohort belongs to'
        },
        level: {
          type: 'string',
          required: false,
          description: 'Current level/year in program (e.g., "Year 2")'
        },
        startYear: {
          type: 'number',
          required: true,
          description: 'Year cohort started (e.g., 2024)'
        },
        endYear: {
          type: 'number',
          required: true,
          description: 'Expected graduation year (e.g., 2026)'
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 500,
          description: 'Cohort description'
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
            name: 'string',
            code: 'string',
            academicYear: {
              id: 'string',
              name: 'string'
            },
            program: {
              id: 'string',
              name: 'string'
            },
            level: 'string',
            startYear: 'number',
            endYear: 'number',
            status: 'active',
            learnerCount: 'number',
            description: 'string',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions - admin only' },
        { status: 404, code: 'YEAR_NOT_FOUND', message: 'Academic year not found' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' },
        { status: 409, code: 'CODE_EXISTS', message: 'Cohort with this code already exists' }
      ]
    },

    example: {
      request: {
        name: 'Class of 2028',
        code: 'COH-2028',
        academicYear: '507f1f77bcf86cd799439011',
        program: '507f1f77bcf86cd799439061',
        level: 'Year 1',
        startYear: 2026,
        endYear: 2028,
        description: 'First year intake for 2026-2027'
      },
      response: {
        success: true,
        message: 'Cohort created successfully',
        data: {
          id: '507f1f77bcf86cd799439053',
          name: 'Class of 2028',
          code: 'COH-2028',
          academicYear: {
            id: '507f1f77bcf86cd799439011',
            name: '2025-2026 Academic Year'
          },
          program: {
            id: '507f1f77bcf86cd799439061',
            name: 'Computer Science Degree'
          },
          level: 'Year 1',
          startYear: 2026,
          endYear: 2028,
          status: 'active',
          learnerCount: 0,
          description: 'First year intake for 2026-2027',
          createdAt: '2026-01-08T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['admin'],

    notes: `
      - Admin permission required
      - Academic year and program must exist
      - Code must be unique across all cohorts
      - endYear must be after or equal to startYear
      - New cohorts start with status 'active'
      - learnerCount starts at 0, increases as learners are assigned
      - Validation rules:
        - name: 1-100 characters
        - code: uppercase letters, numbers, hyphens only, unique
        - startYear/endYear: valid 4-digit years, endYear >= startYear
        - description: max 500 characters
    `
  },

  /**
   * Get Cohort Details
   */
  getCohort: {
    endpoint: '/api/v2/calendar/cohorts/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get details of a specific cohort',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'string', required: true, description: 'Cohort ID' }
      },
      query: {
        includeLearners: { type: 'boolean', required: false, default: false, description: 'Include learner list' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'string',
            name: 'string',
            code: 'string',
            academicYear: {
              id: 'string',
              name: 'string',
              startDate: 'Date',
              endDate: 'Date'
            },
            program: {
              id: 'string',
              name: 'string',
              department: { id: 'string', name: 'string' }
            },
            level: 'string',
            startYear: 'number',
            endYear: 'number',
            status: 'active|graduated|inactive',
            learnerCount: 'number',
            learners: [
              {
                id: 'string',
                firstName: 'string',
                lastName: 'string',
                email: 'string',
                studentId: 'string',
                enrolledAt: 'Date'
              }
            ],
            description: 'string',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'NOT_FOUND', message: 'Cohort not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439051'
        },
        query: {
          includeLearners: true
        }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439051',
          name: 'Class of 2026',
          code: 'COH-2026',
          academicYear: {
            id: '507f1f77bcf86cd799439011',
            name: '2025-2026 Academic Year',
            startDate: '2025-09-01T00:00:00.000Z',
            endDate: '2026-08-31T23:59:59.999Z'
          },
          program: {
            id: '507f1f77bcf86cd799439061',
            name: 'Computer Science Degree',
            department: {
              id: '507f1f77bcf86cd799439071',
              name: 'Computer Science Department'
            }
          },
          level: 'Year 2',
          startYear: 2024,
          endYear: 2026,
          status: 'active',
          learnerCount: 2,
          learners: [
            {
              id: '507f1f77bcf86cd799439081',
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane.smith@example.com',
              studentId: 'STU-2024-001',
              enrolledAt: '2024-09-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439082',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              studentId: 'STU-2024-002',
              enrolledAt: '2024-09-01T00:00:00.000Z'
            }
          ],
          description: 'Second year computer science students',
          createdAt: '2024-09-01T00:00:00.000Z',
          updatedAt: '2025-09-01T00:00:00.000Z'
        }
      }
    },

    permissions: ['admin', 'staff'],

    notes: `
      - Returns complete cohort details with academic year and program
      - learners array only populated if includeLearners=true
      - Learners are ordered by lastName, firstName
      - Staff can view all cohorts and their learners
    `
  },

  /**
   * Update Cohort
   */
  updateCohort: {
    endpoint: '/api/v2/calendar/cohorts/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update a cohort',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true, description: 'Cohort ID' }
      },
      body: {
        name: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100
        },
        code: {
          type: 'string',
          required: false,
          pattern: '^[A-Z0-9-]+$'
        },
        academicYear: {
          type: 'string',
          required: false
        },
        level: {
          type: 'string',
          required: false
        },
        endYear: {
          type: 'number',
          required: false,
          description: 'Update expected graduation year'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'graduated', 'inactive']
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 500
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
            id: 'string',
            name: 'string',
            code: 'string',
            academicYear: {
              id: 'string',
              name: 'string'
            },
            program: {
              id: 'string',
              name: 'string'
            },
            level: 'string',
            startYear: 'number',
            endYear: 'number',
            status: 'string',
            learnerCount: 'number',
            description: 'string',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions - admin only' },
        { status: 404, code: 'NOT_FOUND', message: 'Cohort not found' },
        { status: 404, code: 'YEAR_NOT_FOUND', message: 'Academic year not found' },
        { status: 409, code: 'CODE_EXISTS', message: 'Cohort with this code already exists' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439051'
        },
        body: {
          level: 'Year 3',
          status: 'active',
          description: 'Now in their final year'
        }
      },
      response: {
        success: true,
        message: 'Cohort updated successfully',
        data: {
          id: '507f1f77bcf86cd799439051',
          name: 'Class of 2026',
          code: 'COH-2026',
          academicYear: {
            id: '507f1f77bcf86cd799439011',
            name: '2025-2026 Academic Year'
          },
          program: {
            id: '507f1f77bcf86cd799439061',
            name: 'Computer Science Degree'
          },
          level: 'Year 3',
          startYear: 2024,
          endYear: 2026,
          status: 'active',
          learnerCount: 45,
          description: 'Now in their final year',
          createdAt: '2024-09-01T00:00:00.000Z',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['admin'],

    notes: `
      - Admin permission required
      - All fields are optional (partial update)
      - Cannot change program or startYear (these are immutable)
      - Update academicYear as cohort progresses through years
      - Update level as cohort advances (Year 1 -> Year 2, etc.)
      - Set status to 'graduated' when cohort completes program
      - Set status to 'inactive' if cohort is discontinued
      - Code must be unique if changed
    `
  },

  /**
   * Delete Cohort
   */
  deleteCohort: {
    endpoint: '/api/v2/calendar/cohorts/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a cohort',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'string', required: true, description: 'Cohort ID' }
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions - admin only' },
        { status: 404, code: 'NOT_FOUND', message: 'Cohort not found' },
        { status: 409, code: 'HAS_LEARNERS', message: 'Cannot delete cohort with enrolled learners' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439053'
        }
      },
      response: {
        success: true,
        message: 'Cohort deleted successfully'
      }
    },

    permissions: ['admin'],

    notes: `
      - Admin permission required
      - Cannot delete if cohort has enrolled learners (remove learners first or set status to 'inactive')
      - Consider using status='inactive' instead of deleting for historical records
      - This is a hard delete (consider soft delete in implementation)
      - Consider implementing cascade rules or blocking deletes with dependencies
    `
  }
};

// Type exports for consumers
export type AcademicCalendarContractType = typeof AcademicCalendarContracts;

// Academic Year types
export type ListYearsRequest = typeof AcademicCalendarContracts.listYears.example.request;
export type ListYearsResponse = typeof AcademicCalendarContracts.listYears.example.response;
export type CreateYearRequest = typeof AcademicCalendarContracts.createYear.example.request;
export type CreateYearResponse = typeof AcademicCalendarContracts.createYear.example.response;
export type GetYearResponse = typeof AcademicCalendarContracts.getYear.example.response;
export type UpdateYearRequest = typeof AcademicCalendarContracts.updateYear.example.request;
export type UpdateYearResponse = typeof AcademicCalendarContracts.updateYear.example.response;

// Academic Term types
export type ListTermsRequest = typeof AcademicCalendarContracts.listTerms.example.request;
export type ListTermsResponse = typeof AcademicCalendarContracts.listTerms.example.response;
export type CreateTermRequest = typeof AcademicCalendarContracts.createTerm.example.request;
export type CreateTermResponse = typeof AcademicCalendarContracts.createTerm.example.response;
export type GetTermResponse = typeof AcademicCalendarContracts.getTerm.example.response;
export type UpdateTermRequest = typeof AcademicCalendarContracts.updateTerm.example.request;
export type UpdateTermResponse = typeof AcademicCalendarContracts.updateTerm.example.response;

// Cohort types
export type ListCohortsRequest = typeof AcademicCalendarContracts.listCohorts.example.request;
export type ListCohortsResponse = typeof AcademicCalendarContracts.listCohorts.example.response;
export type CreateCohortRequest = typeof AcademicCalendarContracts.createCohort.example.request;
export type CreateCohortResponse = typeof AcademicCalendarContracts.createCohort.example.response;
export type GetCohortResponse = typeof AcademicCalendarContracts.getCohort.example.response;
export type UpdateCohortRequest = typeof AcademicCalendarContracts.updateCohort.example.request;
export type UpdateCohortResponse = typeof AcademicCalendarContracts.updateCohort.example.response;
