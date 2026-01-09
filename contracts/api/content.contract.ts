/**
 * Content Library API Contracts
 * Version: 1.0.0
 *
 * These contracts define the content library management endpoints for the LMS API.
 * Covers SCORM packages, media library, and content overview.
 * Both backend and UI teams use these as the source of truth.
 */

export const ContentContracts = {
  /**
   * Get Content Library Overview
   * Lists all content items (SCORM, media, exercises) across the library
   */
  list: {
    endpoint: '/api/v2/content',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all content items in the library',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        page: { type: 'number', required: false, default: 1, min: 1 },
        limit: { type: 'number', required: false, default: 20, min: 1, max: 100 },
        type: {
          type: 'string',
          required: false,
          enum: ['scorm', 'media', 'exercise'],
          description: 'Filter by content type'
        },
        departmentId: {
          type: 'string',
          required: false,
          description: 'Filter by department (staff only)'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['draft', 'published', 'archived'],
          description: 'Filter by publication status'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by title or description'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-createdAt',
          description: 'Sort field (prefix with - for desc)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            content: [
              {
                id: 'string',
                title: 'string',
                type: 'scorm|media|exercise',
                status: 'draft|published|archived',
                departmentId: 'string | null',
                department: { id: 'string', name: 'string' },
                thumbnailUrl: 'string | null',
                description: 'string | null',
                createdAt: 'Date',
                updatedAt: 'Date',
                createdBy: { id: 'string', name: 'string' }
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view content' }
      ]
    },

    example: {
      request: {
        query: {
          type: 'scorm',
          status: 'published',
          page: 1,
          limit: 20
        }
      },
      response: {
        success: true,
        data: {
          content: [
            {
              id: '507f1f77bcf86cd799439011',
              title: 'Introduction to Safety Training',
              type: 'scorm',
              status: 'published',
              departmentId: '507f1f77bcf86cd799439012',
              department: { id: '507f1f77bcf86cd799439012', name: 'Safety Department' },
              thumbnailUrl: 'https://cdn.example.com/thumbnails/safety-101.jpg',
              description: 'Comprehensive workplace safety training module',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-05T00:00:00.000Z',
              createdBy: { id: '507f1f77bcf86cd799439013', name: 'John Doe' }
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 45,
            totalPages: 3,
            hasNext: true,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:content'],

    notes: `
      - Returns unified view of all content types
      - Staff see content from their departments only (unless global-admin)
      - Global-admin sees all content across all departments
      - Search performs full-text search on title and description
      - Department filter only works for staff with appropriate permissions
    `
  },

  /**
   * Get Content Details
   * Retrieve detailed information about a specific content item
   */
  getById: {
    endpoint: '/api/v2/content/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a content item',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'string', required: true, description: 'Content ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'string',
            title: 'string',
            type: 'scorm|media|exercise',
            status: 'draft|published|archived',
            departmentId: 'string | null',
            department: { id: 'string', name: 'string' },
            description: 'string | null',
            thumbnailUrl: 'string | null',
            metadata: 'object',
            usageCount: 'number',
            createdAt: 'Date',
            updatedAt: 'Date',
            createdBy: { id: 'string', name: 'string', email: 'string' },
            updatedBy: { id: 'string', name: 'string', email: 'string' }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this content' },
        { status: 404, code: 'NOT_FOUND', message: 'Content not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439011' }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439011',
          title: 'Introduction to Safety Training',
          type: 'scorm',
          status: 'published',
          departmentId: '507f1f77bcf86cd799439012',
          department: { id: '507f1f77bcf86cd799439012', name: 'Safety Department' },
          description: 'Comprehensive workplace safety training module covering all essential protocols',
          thumbnailUrl: 'https://cdn.example.com/thumbnails/safety-101.jpg',
          metadata: {
            scormVersion: '1.2',
            duration: 3600,
            fileSize: 15728640
          },
          usageCount: 12,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z',
          createdBy: { id: '507f1f77bcf86cd799439013', name: 'John Doe', email: 'john@example.com' },
          updatedBy: { id: '507f1f77bcf86cd799439013', name: 'John Doe', email: 'john@example.com' }
        }
      }
    },

    permissions: ['read:content'],

    notes: `
      - Returns detailed information including metadata and usage statistics
      - Department access rules apply
      - usageCount indicates how many courses/modules use this content
    `
  },

  /**
   * ============================================
   * SCORM PACKAGE MANAGEMENT
   * ============================================
   */

  /**
   * List SCORM Packages
   */
  listScorm: {
    endpoint: '/api/v2/content/scorm',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all SCORM packages',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        page: { type: 'number', required: false, default: 1, min: 1 },
        limit: { type: 'number', required: false, default: 20, min: 1, max: 100 },
        departmentId: {
          type: 'string',
          required: false,
          description: 'Filter by department'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['draft', 'published', 'archived'],
          description: 'Filter by publication status'
        },
        version: {
          type: 'string',
          required: false,
          enum: ['1.2', '2004'],
          description: 'Filter by SCORM version'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by title or identifier'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-createdAt'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            packages: [
              {
                id: 'string',
                title: 'string',
                identifier: 'string',
                version: '1.2|2004',
                status: 'draft|published|archived',
                isPublished: 'boolean',
                departmentId: 'string | null',
                department: { id: 'string', name: 'string' },
                packagePath: 'string',
                launchUrl: 'string',
                thumbnailUrl: 'string | null',
                description: 'string | null',
                fileSize: 'number',
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
          status: 'published',
          version: '1.2',
          page: 1,
          limit: 20
        }
      },
      response: {
        success: true,
        data: {
          packages: [
            {
              id: '507f1f77bcf86cd799439011',
              title: 'Workplace Safety Training',
              identifier: 'com.example.safety-2024',
              version: '1.2',
              status: 'published',
              isPublished: true,
              departmentId: '507f1f77bcf86cd799439012',
              department: { id: '507f1f77bcf86cd799439012', name: 'Safety Department' },
              packagePath: '/scorm-packages/safety-2024/imsmanifest.xml',
              launchUrl: '/scorm-player/507f1f77bcf86cd799439011',
              thumbnailUrl: 'https://cdn.example.com/thumbnails/safety-2024.jpg',
              description: 'Comprehensive workplace safety training',
              fileSize: 15728640,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-05T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 8,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:content'],

    notes: `
      - Returns only SCORM packages
      - Department filtering applies based on user permissions
      - launchUrl is the player endpoint for this package
      - fileSize in bytes
    `
  },

  /**
   * Upload SCORM Package
   */
  uploadScorm: {
    endpoint: '/api/v2/content/scorm',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Upload a new SCORM package',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'multipart/form-data'
      },
      body: {
        file: {
          type: 'File',
          required: true,
          description: 'SCORM package ZIP file',
          accept: '.zip'
        },
        title: {
          type: 'string',
          required: false,
          description: 'Override title (uses manifest title if not provided)'
        },
        description: {
          type: 'string',
          required: false
        },
        departmentId: {
          type: 'string',
          required: false,
          description: 'Assign to department'
        },
        thumbnail: {
          type: 'File',
          required: false,
          description: 'Package thumbnail image',
          accept: 'image/jpeg,image/png,image/webp'
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
            identifier: 'string',
            version: '1.2|2004',
            status: 'draft',
            isPublished: false,
            departmentId: 'string | null',
            packagePath: 'string',
            launchUrl: 'string',
            manifestData: {
              schemaVersion: 'string',
              metadata: 'object',
              organizations: 'array',
              resources: 'array'
            },
            fileSize: 'number',
            createdAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid SCORM package or missing manifest' },
        { status: 400, code: 'FILE_TOO_LARGE', message: 'Package exceeds maximum size limit (100MB)' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to upload content' },
        { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE', message: 'File must be a ZIP archive' }
      ]
    },

    example: {
      request: {
        body: {
          file: '[BINARY SCORM ZIP FILE]',
          title: 'Workplace Safety Training',
          description: 'Updated safety protocols for 2026',
          departmentId: '507f1f77bcf86cd799439012'
        }
      },
      response: {
        success: true,
        message: 'SCORM package uploaded and extracted successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          title: 'Workplace Safety Training',
          identifier: 'com.example.safety-2024',
          version: '1.2',
          status: 'draft',
          isPublished: false,
          departmentId: '507f1f77bcf86cd799439012',
          packagePath: '/scorm-packages/507f1f77bcf86cd799439011/imsmanifest.xml',
          launchUrl: '/scorm-player/507f1f77bcf86cd799439011',
          manifestData: {
            schemaVersion: '1.2',
            metadata: {
              title: 'Workplace Safety Training',
              description: 'Comprehensive safety training',
              duration: 'PT1H'
            },
            organizations: [],
            resources: []
          },
          fileSize: 15728640,
          createdAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:content'],

    notes: `
      - Accepts ZIP files containing SCORM 1.2 or SCORM 2004 packages
      - Package is extracted and validated on upload
      - imsmanifest.xml must be present in ZIP root
      - Maximum file size: 100MB
      - Package starts in 'draft' status
      - If title not provided, uses title from manifest metadata
      - manifestData contains parsed manifest for inspection
      - Department assignment optional (null = available to all departments)
    `
  },

  /**
   * Get SCORM Package Details
   */
  getScorm: {
    endpoint: '/api/v2/content/scorm/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a SCORM package',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'string', required: true, description: 'SCORM package ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'string',
            title: 'string',
            identifier: 'string',
            version: '1.2|2004',
            status: 'draft|published|archived',
            isPublished: 'boolean',
            departmentId: 'string | null',
            department: { id: 'string', name: 'string' },
            packagePath: 'string',
            launchUrl: 'string',
            thumbnailUrl: 'string | null',
            description: 'string | null',
            manifestData: {
              schemaVersion: 'string',
              metadata: 'object',
              organizations: 'array',
              resources: 'array'
            },
            fileSize: 'number',
            usageCount: 'number',
            totalAttempts: 'number',
            averageScore: 'number | null',
            createdAt: 'Date',
            updatedAt: 'Date',
            createdBy: { id: 'string', name: 'string', email: 'string' },
            publishedAt: 'Date | null',
            publishedBy: { id: 'string', name: 'string' }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this SCORM package' },
        { status: 404, code: 'NOT_FOUND', message: 'SCORM package not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439011' }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439011',
          title: 'Workplace Safety Training',
          identifier: 'com.example.safety-2024',
          version: '1.2',
          status: 'published',
          isPublished: true,
          departmentId: '507f1f77bcf86cd799439012',
          department: { id: '507f1f77bcf86cd799439012', name: 'Safety Department' },
          packagePath: '/scorm-packages/507f1f77bcf86cd799439011/imsmanifest.xml',
          launchUrl: '/scorm-player/507f1f77bcf86cd799439011',
          thumbnailUrl: 'https://cdn.example.com/thumbnails/safety-2024.jpg',
          description: 'Comprehensive workplace safety training covering all essential protocols',
          manifestData: {
            schemaVersion: '1.2',
            metadata: {
              title: 'Workplace Safety Training',
              description: 'Comprehensive safety training',
              duration: 'PT1H',
              keywords: ['safety', 'workplace', 'training']
            },
            organizations: [],
            resources: []
          },
          fileSize: 15728640,
          usageCount: 5,
          totalAttempts: 243,
          averageScore: 87.5,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z',
          createdBy: { id: '507f1f77bcf86cd799439013', name: 'John Doe', email: 'john@example.com' },
          publishedAt: '2026-01-03T00:00:00.000Z',
          publishedBy: { id: '507f1f77bcf86cd799439013', name: 'John Doe' }
        }
      }
    },

    permissions: ['read:content'],

    notes: `
      - Returns complete SCORM package details including manifest
      - manifestData contains parsed imsmanifest.xml structure
      - usageCount shows how many courses use this package
      - totalAttempts and averageScore provide usage analytics
      - Department access rules apply
    `
  },

  /**
   * Update SCORM Package Metadata
   */
  updateScorm: {
    endpoint: '/api/v2/content/scorm/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update SCORM package metadata (does not re-upload package)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true, description: 'SCORM package ID' }
      },
      body: {
        title: { type: 'string', required: false, minLength: 1, maxLength: 200 },
        description: { type: 'string', required: false, maxLength: 2000 },
        departmentId: {
          type: 'string | null',
          required: false,
          description: 'Update department assignment (null = available to all)'
        },
        thumbnailUrl: { type: 'string', required: false }
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
            title: 'string',
            description: 'string | null',
            departmentId: 'string | null',
            thumbnailUrl: 'string | null',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update this package' },
        { status: 404, code: 'NOT_FOUND', message: 'SCORM package not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439011' },
        body: {
          title: 'Workplace Safety Training 2026',
          description: 'Updated safety protocols for 2026 compliance',
          departmentId: '507f1f77bcf86cd799439012'
        }
      },
      response: {
        success: true,
        message: 'SCORM package metadata updated successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          title: 'Workplace Safety Training 2026',
          description: 'Updated safety protocols for 2026 compliance',
          departmentId: '507f1f77bcf86cd799439012',
          thumbnailUrl: 'https://cdn.example.com/thumbnails/safety-2024.jpg',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:content'],

    notes: `
      - Updates only metadata fields (title, description, department, thumbnail)
      - Does NOT re-upload or modify the SCORM package files
      - To update package files, delete and re-upload
      - Cannot update if package is currently in use by active learner sessions
      - Department access rules apply
    `
  },

  /**
   * Delete SCORM Package
   */
  deleteScorm: {
    endpoint: '/api/v2/content/scorm/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a SCORM package',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'string', required: true, description: 'SCORM package ID' }
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete this package' },
        { status: 404, code: 'NOT_FOUND', message: 'SCORM package not found' },
        { status: 409, code: 'CONFLICT', message: 'Cannot delete package that is in use by courses' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439011' }
      },
      response: {
        success: true,
        message: 'SCORM package deleted successfully'
      }
    },

    permissions: ['write:content', 'delete:content'],

    notes: `
      - Soft deletes the package (sets status to 'archived')
      - Cannot delete if package is used in any published courses
      - Cannot delete if there are active learner attempts
      - Physical files remain on server for data retention
      - To permanently delete, use admin endpoint (not covered in this contract)
    `
  },

  /**
   * Launch SCORM Player
   */
  launchScorm: {
    endpoint: '/api/v2/content/scorm/:id/launch',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Launch SCORM player and create new attempt session',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true, description: 'SCORM package ID' }
      },
      body: {
        courseContentId: {
          type: 'string',
          required: false,
          description: 'Associated course content/module ID (if launching from course)'
        },
        resumeAttempt: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Resume last incomplete attempt instead of creating new'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            playerUrl: 'string',
            attemptId: 'string',
            sessionToken: 'string',
            isResumed: 'boolean',
            scormVersion: '1.2|2004',
            launchData: {
              entryPoint: 'string',
              parameters: 'object'
            },
            expiresAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this SCORM package' },
        { status: 404, code: 'NOT_FOUND', message: 'SCORM package not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439011' },
        body: {
          courseContentId: '507f1f77bcf86cd799439020',
          resumeAttempt: true
        }
      },
      response: {
        success: true,
        data: {
          playerUrl: 'https://lms.example.com/scorm-player/507f1f77bcf86cd799439011?session=abc123',
          attemptId: '507f1f77bcf86cd799439030',
          sessionToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          isResumed: true,
          scormVersion: '1.2',
          launchData: {
            entryPoint: '/scorm-packages/507f1f77bcf86cd799439011/index.html',
            parameters: {
              student_id: 'learner-123',
              student_name: 'Jane Smith',
              credit: 'credit',
              mode: 'normal'
            }
          },
          expiresAt: '2026-01-08T04:00:00.000Z'
        }
      }
    },

    permissions: ['read:content'],

    notes: `
      - Creates new ContentAttempt record or resumes existing one
      - sessionToken is used for SCORM API authentication
      - playerUrl includes session token for secure access
      - Session expires after 4 hours of inactivity
      - If resumeAttempt=true, resumes last incomplete attempt
      - If resumeAttempt=false or no incomplete attempts, creates new attempt
      - launchData includes SCORM-specific initialization parameters
      - courseContentId links attempt to course module (optional for standalone launch)
    `
  },

  /**
   * Publish SCORM Package
   */
  publishScorm: {
    endpoint: '/api/v2/content/scorm/:id/publish',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Publish SCORM package to make it available for courses',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true, description: 'SCORM package ID' }
      },
      body: {
        publishedAt: {
          type: 'Date',
          required: false,
          description: 'Schedule publish time (defaults to now)'
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
            status: 'published',
            isPublished: true,
            publishedAt: 'Date',
            publishedBy: { id: 'string', name: 'string' }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Package cannot be published (invalid manifest or missing files)' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to publish content' },
        { status: 404, code: 'NOT_FOUND', message: 'SCORM package not found' },
        { status: 409, code: 'ALREADY_PUBLISHED', message: 'Package is already published' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439011' },
        body: {
          publishedAt: '2026-01-10T00:00:00.000Z'
        }
      },
      response: {
        success: true,
        message: 'SCORM package published successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          status: 'published',
          isPublished: true,
          publishedAt: '2026-01-10T00:00:00.000Z',
          publishedBy: { id: '507f1f77bcf86cd799439013', name: 'John Doe' }
        }
      }
    },

    permissions: ['publish:content'],

    notes: `
      - Changes status from 'draft' to 'published'
      - Validates package integrity before publishing
      - Checks manifest is valid and all referenced resources exist
      - Can schedule future publish with publishedAt parameter
      - Published packages become available for course assignment
      - Cannot unpublish if already in use by courses with active learners
    `
  },

  /**
   * Unpublish SCORM Package
   */
  unpublishScorm: {
    endpoint: '/api/v2/content/scorm/:id/unpublish',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Unpublish SCORM package to prevent new course assignments',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true, description: 'SCORM package ID' }
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
            status: 'draft',
            isPublished: false,
            unpublishedAt: 'Date',
            unpublishedBy: { id: 'string', name: 'string' }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to unpublish content' },
        { status: 404, code: 'NOT_FOUND', message: 'SCORM package not found' },
        { status: 409, code: 'CONFLICT', message: 'Cannot unpublish package with active learner sessions' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439011' }
      },
      response: {
        success: true,
        message: 'SCORM package unpublished successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          status: 'draft',
          isPublished: false,
          unpublishedAt: '2026-01-08T00:00:00.000Z',
          unpublishedBy: { id: '507f1f77bcf86cd799439013', name: 'John Doe' }
        }
      }
    },

    permissions: ['publish:content'],

    notes: `
      - Changes status from 'published' to 'draft'
      - Existing course assignments remain but are hidden from learners
      - Active learner sessions can continue but no new launches allowed
      - Cannot unpublish if there are active learner sessions (must wait for completion)
      - Prevents new course assignments until republished
    `
  },

  /**
   * ============================================
   * MEDIA LIBRARY MANAGEMENT
   * ============================================
   */

  /**
   * List Media Files
   */
  listMedia: {
    endpoint: '/api/v2/content/media',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all media files in the library',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        page: { type: 'number', required: false, default: 1, min: 1 },
        limit: { type: 'number', required: false, default: 20, min: 1, max: 100 },
        type: {
          type: 'string',
          required: false,
          enum: ['video', 'audio', 'image', 'document'],
          description: 'Filter by media type'
        },
        departmentId: {
          type: 'string',
          required: false,
          description: 'Filter by department'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by title or filename'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-createdAt'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            media: [
              {
                id: 'string',
                title: 'string',
                filename: 'string',
                type: 'video|audio|image|document',
                mimeType: 'string',
                url: 'string',
                thumbnailUrl: 'string | null',
                size: 'number',
                duration: 'number | null',
                departmentId: 'string | null',
                department: { id: 'string', name: 'string' },
                createdAt: 'Date',
                createdBy: { id: 'string', name: 'string' }
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view media' }
      ]
    },

    example: {
      request: {
        query: {
          type: 'video',
          page: 1,
          limit: 20
        }
      },
      response: {
        success: true,
        data: {
          media: [
            {
              id: '507f1f77bcf86cd799439040',
              title: 'Safety Training Introduction Video',
              filename: 'safety-intro-2026.mp4',
              type: 'video',
              mimeType: 'video/mp4',
              url: 'https://cdn.example.com/media/safety-intro-2026.mp4',
              thumbnailUrl: 'https://cdn.example.com/thumbnails/safety-intro-2026.jpg',
              size: 52428800,
              duration: 300,
              departmentId: '507f1f77bcf86cd799439012',
              department: { id: '507f1f77bcf86cd799439012', name: 'Safety Department' },
              createdAt: '2026-01-01T00:00:00.000Z',
              createdBy: { id: '507f1f77bcf86cd799439013', name: 'John Doe' }
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 15,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:content'],

    notes: `
      - Returns all media types (video, audio, image, document)
      - size in bytes
      - duration in seconds (null for non-media files)
      - url is CDN URL for direct access
      - thumbnailUrl auto-generated for videos and images
      - Department filtering applies based on user permissions
    `
  },

  /**
   * Upload Media File
   */
  uploadMedia: {
    endpoint: '/api/v2/content/media',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Upload a new media file to the library',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'multipart/form-data'
      },
      body: {
        file: {
          type: 'File',
          required: true,
          description: 'Media file to upload',
          accept: 'video/*,audio/*,image/*,application/pdf,.doc,.docx,.ppt,.pptx'
        },
        title: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 200
        },
        description: {
          type: 'string',
          required: false,
          maxLength: 2000
        },
        departmentId: {
          type: 'string',
          required: false,
          description: 'Assign to department (null = available to all)'
        },
        type: {
          type: 'string',
          required: true,
          enum: ['video', 'audio', 'image', 'document'],
          description: 'Media type classification'
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
            filename: 'string',
            type: 'video|audio|image|document',
            mimeType: 'string',
            url: 'string',
            thumbnailUrl: 'string | null',
            size: 'number',
            duration: 'number | null',
            departmentId: 'string | null',
            createdAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid file type or missing required fields' },
        { status: 400, code: 'FILE_TOO_LARGE', message: 'File exceeds maximum size limit' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to upload media' },
        { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE', message: 'File type not supported' }
      ]
    },

    example: {
      request: {
        body: {
          file: '[BINARY VIDEO FILE]',
          title: 'Safety Training Introduction Video',
          description: 'Overview of workplace safety protocols',
          departmentId: '507f1f77bcf86cd799439012',
          type: 'video'
        }
      },
      response: {
        success: true,
        message: 'Media file uploaded successfully',
        data: {
          id: '507f1f77bcf86cd799439040',
          title: 'Safety Training Introduction Video',
          filename: 'safety-intro-2026.mp4',
          type: 'video',
          mimeType: 'video/mp4',
          url: 'https://cdn.example.com/media/safety-intro-2026.mp4',
          thumbnailUrl: 'https://cdn.example.com/thumbnails/safety-intro-2026.jpg',
          size: 52428800,
          duration: 300,
          departmentId: '507f1f77bcf86cd799439012',
          createdAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:content'],

    notes: `
      - Supported video formats: MP4, WebM, MOV
      - Supported audio formats: MP3, WAV, OGG
      - Supported image formats: JPEG, PNG, GIF, WebP, SVG
      - Supported document formats: PDF, DOC, DOCX, PPT, PPTX
      - Maximum file sizes:
        - Video: 500MB
        - Audio: 100MB
        - Image: 10MB
        - Document: 50MB
      - Video/image files auto-generate thumbnails
      - Video/audio files extract duration metadata
      - Files uploaded to CDN for optimal delivery
      - Department assignment optional (null = available to all departments)
    `
  },

  /**
   * Get Media File Details
   */
  getMedia: {
    endpoint: '/api/v2/content/media/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a media file',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'string', required: true, description: 'Media file ID' }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'string',
            title: 'string',
            filename: 'string',
            description: 'string | null',
            type: 'video|audio|image|document',
            mimeType: 'string',
            url: 'string',
            thumbnailUrl: 'string | null',
            size: 'number',
            duration: 'number | null',
            metadata: {
              width: 'number | null',
              height: 'number | null',
              bitrate: 'number | null',
              codec: 'string | null'
            },
            departmentId: 'string | null',
            department: { id: 'string', name: 'string' },
            usageCount: 'number',
            createdAt: 'Date',
            updatedAt: 'Date',
            createdBy: { id: 'string', name: 'string', email: 'string' }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'No access to this media file' },
        { status: 404, code: 'NOT_FOUND', message: 'Media file not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439040' }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439040',
          title: 'Safety Training Introduction Video',
          filename: 'safety-intro-2026.mp4',
          description: 'Overview of workplace safety protocols',
          type: 'video',
          mimeType: 'video/mp4',
          url: 'https://cdn.example.com/media/safety-intro-2026.mp4',
          thumbnailUrl: 'https://cdn.example.com/thumbnails/safety-intro-2026.jpg',
          size: 52428800,
          duration: 300,
          metadata: {
            width: 1920,
            height: 1080,
            bitrate: 5000000,
            codec: 'h264'
          },
          departmentId: '507f1f77bcf86cd799439012',
          department: { id: '507f1f77bcf86cd799439012', name: 'Safety Department' },
          usageCount: 3,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z',
          createdBy: { id: '507f1f77bcf86cd799439013', name: 'John Doe', email: 'john@example.com' }
        }
      }
    },

    permissions: ['read:content'],

    notes: `
      - Returns complete media file details including technical metadata
      - metadata includes format-specific information (dimensions, bitrate, codec)
      - usageCount shows how many courses/modules reference this media
      - Department access rules apply
    `
  },

  /**
   * Update Media Metadata
   */
  updateMedia: {
    endpoint: '/api/v2/content/media/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update media file metadata (does not replace the file)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true, description: 'Media file ID' }
      },
      body: {
        title: { type: 'string', required: false, minLength: 1, maxLength: 200 },
        description: { type: 'string', required: false, maxLength: 2000 },
        departmentId: {
          type: 'string | null',
          required: false,
          description: 'Update department assignment (null = available to all)'
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
            title: 'string',
            description: 'string | null',
            departmentId: 'string | null',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update this media' },
        { status: 404, code: 'NOT_FOUND', message: 'Media file not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439040' },
        body: {
          title: 'Safety Training Introduction Video 2026',
          description: 'Updated overview of 2026 workplace safety protocols',
          departmentId: '507f1f77bcf86cd799439012'
        }
      },
      response: {
        success: true,
        message: 'Media metadata updated successfully',
        data: {
          id: '507f1f77bcf86cd799439040',
          title: 'Safety Training Introduction Video 2026',
          description: 'Updated overview of 2026 workplace safety protocols',
          departmentId: '507f1f77bcf86cd799439012',
          updatedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['write:content'],

    notes: `
      - Updates only metadata fields (title, description, department)
      - Does NOT replace the actual media file
      - To replace file, delete and re-upload
      - Department access rules apply
    `
  },

  /**
   * Delete Media File
   */
  deleteMedia: {
    endpoint: '/api/v2/content/media/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a media file from the library',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: { type: 'string', required: true, description: 'Media file ID' }
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete this media' },
        { status: 404, code: 'NOT_FOUND', message: 'Media file not found' },
        { status: 409, code: 'CONFLICT', message: 'Cannot delete media that is in use by courses' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439040' }
      },
      response: {
        success: true,
        message: 'Media file deleted successfully'
      }
    },

    permissions: ['write:content', 'delete:content'],

    notes: `
      - Soft deletes the media file (marks as deleted but keeps on CDN)
      - Cannot delete if media is referenced in any published courses
      - Physical file remains on CDN for 30 days (data retention)
      - After 30 days, file is permanently removed from CDN
      - Department access rules apply
    `
  }
};

// Type exports for consumers
export type ContentContractType = typeof ContentContracts;

// Request/Response type exports
export type ContentListRequest = typeof ContentContracts.list.example.request;
export type ContentListResponse = typeof ContentContracts.list.example.response;

export type ScormListRequest = typeof ContentContracts.listScorm.example.request;
export type ScormListResponse = typeof ContentContracts.listScorm.example.response;

export type ScormUploadRequest = typeof ContentContracts.uploadScorm.example.request;
export type ScormUploadResponse = typeof ContentContracts.uploadScorm.example.response;

export type ScormDetailsRequest = typeof ContentContracts.getScorm.example.request;
export type ScormDetailsResponse = typeof ContentContracts.getScorm.example.response;

export type ScormUpdateRequest = typeof ContentContracts.updateScorm.example.request;
export type ScormUpdateResponse = typeof ContentContracts.updateScorm.example.response;

export type ScormLaunchRequest = typeof ContentContracts.launchScorm.example.request;
export type ScormLaunchResponse = typeof ContentContracts.launchScorm.example.response;

export type ScormPublishRequest = typeof ContentContracts.publishScorm.example.request;
export type ScormPublishResponse = typeof ContentContracts.publishScorm.example.response;

export type MediaListRequest = typeof ContentContracts.listMedia.example.request;
export type MediaListResponse = typeof ContentContracts.listMedia.example.response;

export type MediaUploadRequest = typeof ContentContracts.uploadMedia.example.request;
export type MediaUploadResponse = typeof ContentContracts.uploadMedia.example.response;

export type MediaDetailsRequest = typeof ContentContracts.getMedia.example.request;
export type MediaDetailsResponse = typeof ContentContracts.getMedia.example.response;

export type MediaUpdateRequest = typeof ContentContracts.updateMedia.example.request;
export type MediaUpdateResponse = typeof ContentContracts.updateMedia.example.response;
