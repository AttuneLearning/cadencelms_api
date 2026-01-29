/**
 * Media Controller
 *
 * Handles HTTP requests for media upload and management endpoints.
 * Follows the presigned URL pattern for direct uploads.
 */

import { Request, Response } from 'express';
import { MediaService } from '@/services/content/media.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { LocalStorageProvider } from '@/services/storage/local-storage.service';
import { getLocalStorageProvider, isLocalProvider } from '@/services/storage';
import { storageConfig } from '@/config/storage.config';
import type { MediaPurpose } from '@/models/content/MediaAttachment.model';

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
 */
export const requestUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { filename, mimeType, fileSize, purpose, entityType, entityId, departmentId } = req.body;

  // Validate required fields
  if (!filename || typeof filename !== 'string') {
    throw ApiError.badRequest('filename is required and must be a string');
  }

  if (!mimeType || typeof mimeType !== 'string') {
    throw ApiError.badRequest('mimeType is required and must be a string');
  }

  if (fileSize === undefined || typeof fileSize !== 'number' || fileSize <= 0) {
    throw ApiError.badRequest('fileSize is required and must be a positive number');
  }

  if (!purpose || typeof purpose !== 'string') {
    throw ApiError.badRequest('purpose is required and must be a string');
  }

  const validPurposes = ['flashcard', 'question', 'content', 'thumbnail', 'avatar', 'certificate', 'general'];
  if (!validPurposes.includes(purpose)) {
    throw ApiError.badRequest(`purpose must be one of: ${validPurposes.join(', ')}`);
  }

  // Validate filename length
  if (filename.length > 255) {
    throw ApiError.badRequest('filename cannot exceed 255 characters');
  }

  const result = await MediaService.requestUploadUrl({
    filename,
    mimeType,
    fileSize,
    purpose: purpose as MediaPurpose,
    entityType,
    entityId,
    departmentId,
    userId: user.userId
  });

  res.status(200).json(
    ApiResponse.success(
      { data: result },
      'Upload URL generated successfully'
    )
  );
});

/**
 * POST /api/v2/media/confirm
 * Confirm a completed upload and create the MediaAttachment
 *
 * Body:
 * - uploadId: string (required)
 * - width?: number
 * - height?: number
 * - duration?: number
 * - altText?: string
 * - metadata?: object
 */
export const confirmUpload = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { uploadId, width, height, duration, altText, metadata } = req.body;

  // Validate required fields
  if (!uploadId || typeof uploadId !== 'string') {
    throw ApiError.badRequest('uploadId is required and must be a string');
  }

  // Validate optional numeric fields
  if (width !== undefined && (typeof width !== 'number' || width < 0)) {
    throw ApiError.badRequest('width must be a non-negative number');
  }

  if (height !== undefined && (typeof height !== 'number' || height < 0)) {
    throw ApiError.badRequest('height must be a non-negative number');
  }

  if (duration !== undefined && (typeof duration !== 'number' || duration < 0)) {
    throw ApiError.badRequest('duration must be a non-negative number');
  }

  // Validate altText
  if (altText !== undefined && typeof altText !== 'string') {
    throw ApiError.badRequest('altText must be a string');
  }

  if (altText && altText.length > 500) {
    throw ApiError.badRequest('altText cannot exceed 500 characters');
  }

  // Validate metadata
  if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata))) {
    throw ApiError.badRequest('metadata must be an object');
  }

  const media = await MediaService.confirmUpload({
    uploadId,
    userId: user.userId,
    width,
    height,
    duration,
    altText,
    metadata
  });

  res.status(201).json(
    ApiResponse.success(
      {
        data: {
          id: media._id.toString(),
          type: media.type,
          storageKey: media.storageKey,
          cdnUrl: media.cdnUrl,
          filename: media.filename,
          mimeType: media.mimeType,
          fileSize: media.fileSize,
          width: media.width,
          height: media.height,
          duration: media.duration,
          altText: media.altText,
          purpose: media.purpose,
          uploadedAt: media.uploadedAt,
          createdAt: media.createdAt
        }
      },
      'Upload confirmed successfully'
    )
  );
});

/**
 * GET /api/v2/media/:mediaId
 * Get media attachment details
 */
export const getMedia = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { mediaId } = req.params;

  const media = await MediaService.getMediaById(mediaId, user.userId);

  res.status(200).json(
    ApiResponse.success({
      data: {
        id: media._id.toString(),
        type: media.type,
        storageProvider: media.storageProvider,
        storageKey: media.storageKey,
        cdnUrl: media.cdnUrl,
        filename: media.filename,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        width: media.width,
        height: media.height,
        duration: media.duration,
        altText: media.altText,
        purpose: media.purpose,
        entityType: media.entityType,
        entityId: media.entityId?.toString(),
        departmentId: media.departmentId?.toString(),
        uploadedBy: media.uploadedBy.toString(),
        uploadedAt: media.uploadedAt,
        metadata: media.metadata,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt
      }
    })
  );
});

/**
 * GET /api/v2/media
 * List media attachments with filters
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
 */
export const listMedia = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  const filters = {
    type: req.query.type as 'image' | 'video' | 'audio' | undefined,
    purpose: req.query.purpose as any,
    entityType: req.query.entityType as string | undefined,
    entityId: req.query.entityId as string | undefined,
    departmentId: req.query.departmentId as string | undefined,
    search: req.query.search as string | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate type if provided
  if (filters.type && !['image', 'video', 'audio'].includes(filters.type)) {
    throw ApiError.badRequest('type must be one of: image, video, audio');
  }

  // Validate purpose if provided
  const validPurposes = ['flashcard', 'question', 'content', 'thumbnail', 'avatar', 'certificate', 'general'];
  if (filters.purpose && !validPurposes.includes(filters.purpose)) {
    throw ApiError.badRequest(`purpose must be one of: ${validPurposes.join(', ')}`);
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('limit must be between 1 and 100');
  }

  const result = await MediaService.listMedia(filters, user.userId);

  res.status(200).json(
    ApiResponse.success({
      data: {
        media: result.media.map((m: any) => ({
          id: m._id.toString(),
          type: m.type,
          cdnUrl: m.cdnUrl,
          filename: m.filename,
          mimeType: m.mimeType,
          fileSize: m.fileSize,
          width: m.width,
          height: m.height,
          duration: m.duration,
          altText: m.altText,
          purpose: m.purpose,
          uploadedAt: m.uploadedAt,
          createdAt: m.createdAt
        })),
        pagination: result.pagination
      }
    })
  );
});

/**
 * PUT /api/v2/media/:mediaId
 * Update media metadata
 *
 * Body:
 * - altText?: string
 * - metadata?: object
 */
export const updateMedia = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { mediaId } = req.params;
  const { altText, metadata } = req.body;

  // Validate altText
  if (altText !== undefined && typeof altText !== 'string') {
    throw ApiError.badRequest('altText must be a string');
  }

  if (altText && altText.length > 500) {
    throw ApiError.badRequest('altText cannot exceed 500 characters');
  }

  // Validate metadata
  if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata))) {
    throw ApiError.badRequest('metadata must be an object');
  }

  const media = await MediaService.updateMedia(
    mediaId,
    { altText, metadata },
    user.userId
  );

  res.status(200).json(
    ApiResponse.success(
      {
        data: {
          id: media._id.toString(),
          altText: media.altText,
          metadata: media.metadata,
          updatedAt: media.updatedAt
        }
      },
      'Media updated successfully'
    )
  );
});

/**
 * DELETE /api/v2/media/:mediaId
 * Delete media attachment
 *
 * Query params:
 * - hard: boolean (default: false) - if true, also delete from storage
 */
export const deleteMedia = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { mediaId } = req.params;
  const hardDelete = req.query.hard === 'true';

  await MediaService.deleteMedia(mediaId, user.userId, hardDelete);

  res.status(200).json(
    ApiResponse.success(null, 'Media deleted successfully')
  );
});

/**
 * GET /api/v2/media/pending
 * Get pending uploads for the current user
 */
export const getPendingUploads = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  const pending = await MediaService.getPendingUploads(user.userId);

  res.status(200).json(
    ApiResponse.success({
      data: {
        uploads: pending.map((u: any) => ({
          uploadId: u.uploadId,
          filename: u.filename,
          mimeType: u.mimeType,
          fileSize: u.fileSize,
          purpose: u.purpose,
          expiresAt: u.expiresAt,
          requestedAt: u.requestedAt
        }))
      }
    })
  );
});

/**
 * DELETE /api/v2/media/pending/:uploadId
 * Cancel a pending upload
 */
export const cancelUpload = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { uploadId } = req.params;

  await MediaService.cancelUpload(uploadId, user.userId);

  res.status(200).json(
    ApiResponse.success(null, 'Upload cancelled successfully')
  );
});

/**
 * PUT /api/v2/media/local-upload/:uploadId
 * Local upload endpoint for development
 *
 * This endpoint receives the actual file data when using local storage.
 * Only enabled when STORAGE_PROVIDER is 'local'.
 */
export const localUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!isLocalProvider()) {
    throw ApiError.notFound('Local upload endpoint not available');
  }

  const { uploadId } = req.params;

  // Validate the upload token
  const tokenData = LocalStorageProvider.validateUploadToken(uploadId);
  if (!tokenData) {
    throw ApiError.badRequest('Invalid or expired upload token');
  }

  // Get the file data from the request body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const fileData = Buffer.concat(chunks);

  // Validate file size
  if (tokenData.contentLength && fileData.length > tokenData.contentLength * 1.1) {
    throw ApiError.badRequest('File size exceeds expected size');
  }

  // Write the file
  const localStorage = getLocalStorageProvider();
  await localStorage.writeFile(tokenData.key, fileData);

  res.status(200).json(
    ApiResponse.success(
      {
        data: {
          key: tokenData.key,
          size: fileData.length
        }
      },
      'File uploaded successfully'
    )
  );
});

/**
 * GET /api/v2/media/config
 * Get media upload configuration (constraints, allowed types, etc.)
 */
export const getMediaConfig = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(
    ApiResponse.success({
      data: {
        provider: storageConfig.provider,
        constraints: {
          image: {
            maxSize: storageConfig.constraints.image.maxSize,
            maxSizeMB: Math.round(storageConfig.constraints.image.maxSize / (1024 * 1024)),
            allowedTypes: storageConfig.constraints.image.types
          },
          video: {
            maxSize: storageConfig.constraints.video.maxSize,
            maxSizeMB: Math.round(storageConfig.constraints.video.maxSize / (1024 * 1024)),
            allowedTypes: storageConfig.constraints.video.types
          },
          audio: {
            maxSize: storageConfig.constraints.audio.maxSize,
            maxSizeMB: Math.round(storageConfig.constraints.audio.maxSize / (1024 * 1024)),
            allowedTypes: storageConfig.constraints.audio.types
          }
        },
        purposes: ['flashcard', 'question', 'content', 'thumbnail', 'avatar', 'certificate', 'general'],
        presignedUrlExpiry: storageConfig.presignedUrlExpiry
      }
    })
  );
});
