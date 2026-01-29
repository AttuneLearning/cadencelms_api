/**
 * Media Routes
 *
 * API routes for media upload and management using presigned URLs.
 * Base path: /api/v2/media
 *
 * Flow:
 * 1. Client calls POST /upload-url to get a presigned URL
 * 2. Client uploads directly to storage (S3 or local)
 * 3. Client calls POST /confirm to finalize the upload
 * 4. Server creates the MediaAttachment record
 */

import { Router, raw } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as mediaController from '@/controllers/content/media.controller';

const router = Router();

/**
 * =====================
 * PUBLIC/CONFIG ROUTES
 * =====================
 */

/**
 * GET /api/v2/media/config
 * Get media upload configuration
 * Public endpoint - no authentication required
 */
router.get('/config', mediaController.getMediaConfig);

// All other routes require authentication
router.use(isAuthenticated);

/**
 * =====================
 * UPLOAD FLOW ROUTES
 * =====================
 */

/**
 * POST /api/v2/media/upload-url
 * Request a presigned URL for uploading media
 *
 * Body:
 * - filename: string (required)
 * - mimeType: string (required)
 * - fileSize: number (required, bytes)
 * - purpose: string (required)
 * - entityType?: string
 * - entityId?: string
 * - departmentId?: string
 *
 * Access Right: content:courses:manage
 * Roles: instructor, content-admin, department-admin
 */
router.post(
  '/upload-url',
  authorize('content:courses:manage'),
  mediaController.requestUploadUrl
);

/**
 * POST /api/v2/media/confirm
 * Confirm a completed upload
 *
 * Body:
 * - uploadId: string (required)
 * - width?: number
 * - height?: number
 * - duration?: number
 * - altText?: string
 * - metadata?: object
 *
 * Access Right: content:courses:manage
 * Roles: instructor, content-admin, department-admin
 */
router.post(
  '/confirm',
  authorize('content:courses:manage'),
  mediaController.confirmUpload
);

/**
 * PUT /api/v2/media/local-upload/:uploadId
 * Local upload endpoint for development
 *
 * This endpoint receives the actual file data when using local storage.
 * Only available when STORAGE_PROVIDER is 'local'.
 *
 * Note: Uses raw body parser to handle binary data.
 *
 * Access Right: content:courses:manage
 */
router.put(
  '/local-upload/:uploadId',
  authorize('content:courses:manage'),
  raw({ type: '*/*', limit: '100mb' }),
  mediaController.localUpload
);

/**
 * =====================
 * PENDING UPLOADS ROUTES
 * =====================
 */

/**
 * GET /api/v2/media/pending
 * Get pending uploads for the current user
 *
 * Access Right: content:courses:manage
 */
router.get(
  '/pending',
  authorize('content:courses:manage'),
  mediaController.getPendingUploads
);

/**
 * DELETE /api/v2/media/pending/:uploadId
 * Cancel a pending upload
 *
 * Access Right: content:courses:manage
 */
router.delete(
  '/pending/:uploadId',
  authorize('content:courses:manage'),
  mediaController.cancelUpload
);

/**
 * =====================
 * MEDIA CRUD ROUTES
 * =====================
 */

/**
 * GET /api/v2/media
 * List media attachments
 *
 * Query params:
 * - type: 'image' | 'video' | 'audio'
 * - purpose: MediaPurpose
 * - entityType: string
 * - entityId: string
 * - departmentId: string
 * - search: string
 * - sort: string (default: -createdAt)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * Access Right: content:courses:read
 * Roles: course-taker, auditor, instructor, content-admin, department-admin
 */
router.get(
  '/',
  authorize('content:courses:read'),
  mediaController.listMedia
);

/**
 * GET /api/v2/media/:mediaId
 * Get media attachment details
 *
 * Access Right: content:courses:read
 */
router.get(
  '/:mediaId',
  authorize('content:courses:read'),
  mediaController.getMedia
);

/**
 * PUT /api/v2/media/:mediaId
 * Update media metadata
 *
 * Body:
 * - altText?: string
 * - metadata?: object
 *
 * Access Right: content:courses:manage
 */
router.put(
  '/:mediaId',
  authorize('content:courses:manage'),
  mediaController.updateMedia
);

/**
 * DELETE /api/v2/media/:mediaId
 * Delete media attachment
 *
 * Query params:
 * - hard: boolean (if true, also delete from storage)
 *
 * Access Right: content:courses:manage
 */
router.delete(
  '/:mediaId',
  authorize('content:courses:manage'),
  mediaController.deleteMedia
);

export default router;
