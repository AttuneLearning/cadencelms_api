/**
 * Media Upload API Contracts
 * Version: 1.0.0
 *
 * These contracts define the media upload and management endpoints.
 * Supports direct-to-storage uploads via presigned URLs with local
 * storage fallback for development.
 *
 * See: ADR-CONTENT-001-CONTENT-DELIVERY-ARCHITECTURE
 */

import { MediaAttachment, MediaConstraints, StorageProvider } from '../types/media-types';

// ============================================================================
// Media Upload Contracts
// ============================================================================

export const MediaUploadContracts = {
  /**
   * Request presigned upload URL
   */
  requestUploadUrl: {
    endpoint: '/api/v2/media/upload-url',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Request a presigned URL for direct upload to storage',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        filename: {
          type: 'string',
          required: true,
          description: 'Original filename'
        },
        mimeType: {
          type: 'string',
          required: true,
          description: 'MIME type of the file'
        },
        fileSize: {
          type: 'number',
          required: true,
          description: 'File size in bytes'
        },
        purpose: {
          type: 'string',
          required: true,
          enum: ['flashcard', 'question', 'answer', 'hint', 'explanation', 'content', 'thumbnail'],
          description: 'What this media is for'
        },
        entityId: {
          type: 'string',
          required: false,
          description: 'Associated entity ID (exercise, module, etc.)'
        },
        entityType: {
          type: 'string',
          required: false,
          enum: ['exercise', 'module', 'course', 'question', 'flashcard'],
          description: 'Type of associated entity'
        },
        altText: {
          type: 'string',
          required: false,
          description: 'Alt text for accessibility (images)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            uploadId: 'string',
            uploadUrl: 'string',
            storageKey: 'string',
            expiresAt: 'Date',
            fields: 'object|null',
            method: 'PUT|POST',
            provider: 'local|aws_s3|digitalocean_spaces|cloudflare_r2'
          }
        }
      },
      errors: [
        { status: 400, code: 'INVALID_MIME_TYPE', message: 'File type not allowed' },
        { status: 400, code: 'FILE_TOO_LARGE', message: 'File exceeds maximum size limit' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to upload media' }
      ]
    },

    example: {
      request: {
        body: {
          filename: 'cell-diagram.png',
          mimeType: 'image/png',
          fileSize: 524288,
          purpose: 'flashcard',
          entityType: 'module',
          entityId: '507f1f77bcf86cd799439013',
          altText: 'Diagram of a plant cell'
        }
      },
      response: {
        success: true,
        data: {
          uploadId: 'upload_abc123',
          uploadUrl: 'https://cadencelms-content.s3.amazonaws.com/...',
          storageKey: 'media/images/upload_abc123.png',
          expiresAt: '2026-01-28T11:00:00.000Z',
          fields: {
            'key': 'media/images/upload_abc123.png',
            'policy': 'eyJleHBpcmF0aW9uIjoiMjAyNi0wMS...',
            'x-amz-algorithm': 'AWS4-HMAC-SHA256',
            'x-amz-credential': '...',
            'x-amz-date': '20260128T100000Z',
            'x-amz-signature': '...'
          },
          method: 'POST',
          provider: 'aws_s3'
        }
      }
    },

    permissions: ['write:media'],

    notes: `
      - Client uploads directly to storage using the presigned URL
      - For S3: use POST with form-data including fields
      - For local dev: use PUT to the upload URL
      - URL expires in 15 minutes by default
      - After upload, call /api/v2/media/confirm to process
      - See MediaConstraints for file size/type limits
    `
  },

  /**
   * Confirm upload and process media
   */
  confirmUpload: {
    endpoint: '/api/v2/media/confirm',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Confirm upload completed and trigger processing',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        uploadId: {
          type: 'string',
          required: true,
          description: 'Upload ID from requestUploadUrl'
        },
        storageKey: {
          type: 'string',
          required: true,
          description: 'Storage key from requestUploadUrl'
        },
        altText: {
          type: 'string',
          required: false,
          description: 'Alt text for accessibility'
        },
        transcript: {
          type: 'string',
          required: false,
          description: 'Transcript for audio/video'
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
            attachment: 'MediaAttachment'
          }
        }
      },
      errors: [
        { status: 400, code: 'UPLOAD_NOT_FOUND', message: 'Upload ID not found or expired' },
        { status: 400, code: 'FILE_NOT_FOUND', message: 'File not found at storage key' },
        { status: 400, code: 'PROCESSING_FAILED', message: 'Failed to process media file' }
      ]
    },

    example: {
      request: {
        body: {
          uploadId: 'upload_abc123',
          storageKey: 'media/images/upload_abc123.png',
          altText: 'Diagram of a plant cell'
        }
      },
      response: {
        success: true,
        message: 'Media processed successfully',
        data: {
          attachment: {
            id: 'media_xyz789',
            type: 'image',
            storageKey: 'media/images/upload_abc123.png',
            cdnUrl: 'https://cdn.cadencelms.com/media/images/upload_abc123.png',
            filename: 'cell-diagram.png',
            mimeType: 'image/png',
            fileSize: 524288,
            width: 800,
            height: 600,
            altText: 'Diagram of a plant cell',
            uploadedBy: '507f1f77bcf86cd799439011',
            uploadedAt: '2026-01-28T10:05:00.000Z'
          }
        }
      }
    },

    permissions: ['write:media'],

    notes: `
      - Verifies file exists at storage location
      - Extracts metadata (dimensions, duration)
      - Generates thumbnails for images (if configured)
      - Queues video transcoding (if configured)
      - Returns full MediaAttachment for use in content
    `
  },

  /**
   * Get media details
   */
  getById: {
    endpoint: '/api/v2/media/:mediaId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get media attachment details',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        mediaId: { type: 'string', required: true }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'MediaAttachment'
        }
      },
      errors: [
        { status: 404, code: 'NOT_FOUND', message: 'Media not found' }
      ]
    },

    permissions: ['read:media']
  },

  /**
   * Delete media
   */
  delete: {
    endpoint: '/api/v2/media/:mediaId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete media attachment',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      params: {
        mediaId: { type: 'string', required: true }
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
        { status: 403, code: 'FORBIDDEN', message: 'Can only delete own uploads or must be admin' },
        { status: 404, code: 'NOT_FOUND', message: 'Media not found' },
        { status: 409, code: 'MEDIA_IN_USE', message: 'Media is referenced by active content' }
      ]
    },

    permissions: ['delete:media'],

    notes: `
      - Users can delete their own uploads
      - Admins can delete any media
      - Cannot delete media that is referenced by active content
      - Soft delete: marks as inactive but retains for audit
    `
  },

  /**
   * List media for entity
   */
  listByEntity: {
    endpoint: '/api/v2/media',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List media attachments for an entity or user',

    request: {
      headers: { 'Authorization': 'Bearer <token>' },
      query: {
        entityType: {
          type: 'string',
          required: false,
          enum: ['exercise', 'module', 'course', 'question', 'flashcard'],
          description: 'Filter by entity type'
        },
        entityId: {
          type: 'string',
          required: false,
          description: 'Filter by entity ID'
        },
        uploadedBy: {
          type: 'string',
          required: false,
          description: 'Filter by uploader (defaults to self)'
        },
        type: {
          type: 'string',
          required: false,
          enum: ['image', 'video', 'audio'],
          description: 'Filter by media type'
        },
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
            media: ['MediaAttachment'],
            pagination: {
              page: 'number',
              limit: 'number',
              total: 'number',
              totalPages: 'number'
            }
          }
        }
      }
    },

    permissions: ['read:media'],

    notes: `
      - Without filters, returns user's own uploads
      - Admins can view all media
      - Results ordered by uploadedAt desc
    `
  }
};

// ============================================================================
// Local Storage Endpoints (Development)
// ============================================================================

export const LocalStorageContracts = {
  /**
   * Direct upload endpoint (local storage only)
   */
  directUpload: {
    endpoint: '/api/v2/media/local-upload/:uploadId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Direct upload endpoint for local storage (development only)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': '<mime-type>'
      },
      params: {
        uploadId: { type: 'string', required: true }
      },
      body: 'binary'
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            storageKey: 'string'
          }
        }
      },
      errors: [
        { status: 400, code: 'UPLOAD_NOT_FOUND', message: 'Upload ID not found or expired' },
        { status: 400, code: 'FILE_TOO_LARGE', message: 'File exceeds maximum size' },
        { status: 503, code: 'LOCAL_STORAGE_DISABLED', message: 'Local storage not enabled' }
      ]
    },

    notes: `
      - Only available when STORAGE_PROVIDER=local
      - For development/testing without S3
      - Files stored in ./uploads/ directory
      - Auto-cleanup of files older than 24 hours
    `
  },

  /**
   * Serve local files
   */
  serveFile: {
    endpoint: '/uploads/*',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Serve uploaded files from local storage',

    notes: `
      - Static file serving for local development
      - In production, files served via CDN
      - Path maps to ./uploads/ directory
    `
  }
};

// ============================================================================
// Media Processing Webhooks (Internal)
// ============================================================================

export const MediaProcessingContracts = {
  /**
   * Video transcoding complete webhook
   */
  transcodingComplete: {
    endpoint: '/api/v2/media/webhooks/transcoding-complete',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Webhook called when video transcoding completes (internal)',

    request: {
      headers: {
        'X-Webhook-Secret': '<secret>'
      },
      body: {
        jobId: 'string',
        status: 'completed|failed',
        outputs: {
          hls: 'string',
          thumbnail: 'string',
          duration: 'number',
          width: 'number',
          height: 'number'
        },
        error: 'string|null'
      }
    },

    notes: `
      - Internal webhook from MediaConvert/transcoding service
      - Updates media record with HLS URLs
      - Notifies UI if websocket connected
    `
  }
};

// ============================================================================
// Type Exports
// ============================================================================

export type MediaUploadContractType = typeof MediaUploadContracts;
export type LocalStorageContractType = typeof LocalStorageContracts;
