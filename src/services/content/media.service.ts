/**
 * Media Service
 *
 * Business logic for media upload management.
 * Handles presigned URL generation, upload confirmation, and media lifecycle.
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import MediaAttachment, {
  IMediaAttachment,
  MediaType,
  MediaPurpose
} from '@/models/content/MediaAttachment.model';
import MediaUploadRequest, {
  IMediaUploadRequest
} from '@/models/content/MediaUploadRequest.model';
import { ApiError } from '@/utils/ApiError';
import { getStorageProvider } from '@/services/storage';
import {
  storageConfig,
  validateMediaFile,
  generateStorageKey
} from '@/config/storage.config';

/**
 * Parameters for requesting an upload URL
 */
export interface RequestUploadUrlParams {
  /** Original filename */
  filename: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  fileSize: number;
  /** Purpose of the upload */
  purpose: MediaPurpose;
  /** Optional entity type this upload is for */
  entityType?: string;
  /** Optional entity ID this upload is for */
  entityId?: string;
  /** Optional department ID for access control */
  departmentId?: string;
  /** User requesting the upload */
  userId: string;
}

/**
 * Result of requesting an upload URL
 */
export interface UploadUrlResult {
  /** Unique upload ID to use when confirming */
  uploadId: string;
  /** URL to upload the file to (PUT request) */
  uploadUrl: string;
  /** Public URL where the file will be accessible after confirmation */
  publicUrl: string;
  /** Storage key for the file */
  storageKey: string;
  /** When the upload URL expires */
  expiresAt: Date;
  /** Expected content type for the upload */
  contentType: string;
}

/**
 * Parameters for confirming an upload
 */
export interface ConfirmUploadParams {
  /** Upload ID from requestUploadUrl */
  uploadId: string;
  /** User confirming the upload */
  userId: string;
  /** Optional width for images/videos */
  width?: number;
  /** Optional height for images/videos */
  height?: number;
  /** Optional duration for audio/video */
  duration?: number;
  /** Optional alt text for accessibility */
  altText?: string;
  /** Optional additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Filters for listing media
 */
export interface ListMediaFilters {
  /** Filter by media type */
  type?: MediaType;
  /** Filter by purpose */
  purpose?: MediaPurpose;
  /** Filter by entity type */
  entityType?: string;
  /** Filter by entity ID */
  entityId?: string;
  /** Filter by department ID */
  departmentId?: string;
  /** Filter by uploader */
  uploadedBy?: string;
  /** Search in filename and alt text */
  search?: string;
  /** Sort field (prefix with - for descending) */
  sort?: string;
  /** Page number */
  page?: number;
  /** Items per page */
  limit?: number;
}

export class MediaService {
  /**
   * Request a presigned URL for uploading media
   *
   * Creates a MediaUploadRequest to track the upload and returns
   * a presigned URL for direct upload to storage.
   */
  static async requestUploadUrl(params: RequestUploadUrlParams): Promise<UploadUrlResult> {
    // Validate file type and size
    const validation = validateMediaFile(params.mimeType, params.fileSize);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error!);
    }

    const mediaType = validation.mediaType!;

    // Generate unique upload ID and storage key
    const uploadId = crypto.randomUUID();
    const storageKey = generateStorageKey(
      params.purpose,
      params.filename,
      params.entityType,
      params.entityId
    );

    // Get storage provider and generate presigned URL
    const storage = getStorageProvider();
    const presignedResult = await storage.generatePresignedUploadUrl(
      storageKey,
      params.mimeType,
      {
        expiresIn: storageConfig.presignedUrlExpiry,
        contentLength: params.fileSize
      }
    );

    // Create upload request record
    const uploadRequest = await MediaUploadRequest.create({
      uploadId,
      storageKey,
      storageProvider: storage.providerName,
      filename: params.filename,
      mimeType: params.mimeType,
      fileSize: params.fileSize,
      mediaType,
      purpose: params.purpose,
      entityType: params.entityType,
      entityId: params.entityId ? new mongoose.Types.ObjectId(params.entityId) : undefined,
      departmentId: params.departmentId ? new mongoose.Types.ObjectId(params.departmentId) : undefined,
      requestedBy: new mongoose.Types.ObjectId(params.userId),
      requestedAt: new Date(),
      expiresAt: presignedResult.expiresAt,
      status: 'pending',
      uploadUrl: presignedResult.uploadUrl,
      publicUrl: presignedResult.publicUrl
    });

    return {
      uploadId: uploadRequest.uploadId,
      uploadUrl: presignedResult.uploadUrl,
      publicUrl: presignedResult.publicUrl,
      storageKey,
      expiresAt: presignedResult.expiresAt,
      contentType: params.mimeType
    };
  }

  /**
   * Confirm an upload and create the MediaAttachment
   *
   * Verifies the upload exists in storage and creates the
   * permanent MediaAttachment record.
   */
  static async confirmUpload(params: ConfirmUploadParams): Promise<IMediaAttachment> {
    // Find the pending upload request
    const uploadRequest = await MediaUploadRequest.findPendingByUploadId(params.uploadId);

    if (!uploadRequest) {
      throw ApiError.notFound('Upload request not found or expired');
    }

    // Verify the user owns this upload request
    if (uploadRequest.requestedBy.toString() !== params.userId) {
      throw ApiError.forbidden('You do not have permission to confirm this upload');
    }

    // Verify the file exists in storage
    const storage = getStorageProvider();
    const exists = await storage.objectExists(uploadRequest.storageKey);

    if (!exists) {
      // Mark the request as failed
      await MediaUploadRequest.markFailed(
        params.uploadId,
        'File not found in storage. Upload may have failed or timed out.'
      );
      throw ApiError.badRequest('File not found in storage. Please retry the upload.');
    }

    // Get actual file metadata from storage
    const metadata = await storage.getObjectMetadata(uploadRequest.storageKey);

    // Verify file size matches (with some tolerance for encoding differences)
    const sizeTolerance = 0.1; // 10% tolerance
    const expectedSize = uploadRequest.fileSize;
    const actualSize = metadata.contentLength;
    const sizeDiff = Math.abs(actualSize - expectedSize) / expectedSize;

    if (sizeDiff > sizeTolerance && actualSize > expectedSize) {
      throw ApiError.badRequest(
        `Uploaded file size (${actualSize} bytes) exceeds expected size (${expectedSize} bytes)`
      );
    }

    // Create the MediaAttachment
    const mediaAttachment = await MediaAttachment.create({
      type: uploadRequest.mediaType,
      storageProvider: uploadRequest.storageProvider,
      storageKey: uploadRequest.storageKey,
      cdnUrl: storage.getPublicUrl(uploadRequest.storageKey),
      filename: uploadRequest.filename,
      mimeType: uploadRequest.mimeType,
      fileSize: actualSize,
      width: params.width,
      height: params.height,
      duration: params.duration,
      altText: params.altText,
      purpose: uploadRequest.purpose,
      entityType: uploadRequest.entityType,
      entityId: uploadRequest.entityId,
      departmentId: uploadRequest.departmentId,
      uploadedBy: uploadRequest.requestedBy,
      uploadedAt: new Date(),
      isActive: true,
      metadata: params.metadata
    });

    // Mark the upload request as completed
    await MediaUploadRequest.markCompleted(params.uploadId, mediaAttachment._id);

    return mediaAttachment;
  }

  /**
   * Get media attachment by ID
   */
  static async getMediaById(
    mediaId: string,
    _userId: string
  ): Promise<IMediaAttachment> {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      throw ApiError.notFound('Media not found');
    }

    const media = await MediaAttachment.findOne({
      _id: mediaId,
      isActive: true
    }).lean();

    if (!media) {
      throw ApiError.notFound('Media not found');
    }

    // TODO: Add department access control check

    return media as unknown as IMediaAttachment;
  }

  /**
   * List media attachments with filters
   */
  static async listMedia(
    filters: ListMediaFilters,
    _userId: string
  ): Promise<{
    media: IMediaAttachment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { isActive: true };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.purpose) {
      query.purpose = filters.purpose;
    }

    if (filters.entityType) {
      query.entityType = filters.entityType;
    }

    if (filters.entityId) {
      query.entityId = new mongoose.Types.ObjectId(filters.entityId);
    }

    if (filters.departmentId) {
      query.departmentId = new mongoose.Types.ObjectId(filters.departmentId);
    }

    if (filters.uploadedBy) {
      query.uploadedBy = new mongoose.Types.ObjectId(filters.uploadedBy);
    }

    if (filters.search) {
      query.$or = [
        { filename: { $regex: filters.search, $options: 'i' } },
        { altText: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Parse sort
    const sortField = filters.sort || '-createdAt';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [media, total] = await Promise.all([
      MediaAttachment.find(query)
        .populate('uploadedBy', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      MediaAttachment.countDocuments(query)
    ]);

    return {
      media: media as unknown as IMediaAttachment[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Update media attachment metadata
   */
  static async updateMedia(
    mediaId: string,
    updates: {
      altText?: string;
      metadata?: Record<string, any>;
    },
    _userId: string
  ): Promise<IMediaAttachment> {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      throw ApiError.notFound('Media not found');
    }

    const media = await MediaAttachment.findOne({
      _id: mediaId,
      isActive: true
    });

    if (!media) {
      throw ApiError.notFound('Media not found');
    }

    // TODO: Add permission check

    if (updates.altText !== undefined) {
      media.altText = updates.altText;
    }

    if (updates.metadata !== undefined) {
      media.metadata = { ...media.metadata, ...updates.metadata };
    }

    await media.save();
    return media;
  }

  /**
   * Delete media attachment
   *
   * Performs soft delete and optionally removes from storage.
   */
  static async deleteMedia(
    mediaId: string,
    _userId: string,
    hardDelete: boolean = false
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      throw ApiError.notFound('Media not found');
    }

    const media = await MediaAttachment.findOne({
      _id: mediaId,
      isActive: true
    });

    if (!media) {
      throw ApiError.notFound('Media not found');
    }

    // TODO: Add permission check

    // Check for references before deletion
    const referenceCount = await MediaAttachment.countReferences(mediaId);
    if (referenceCount > 0) {
      throw ApiError.conflict(
        `Cannot delete media that is referenced by ${referenceCount} other items`
      );
    }

    if (hardDelete) {
      // Delete from storage
      const storage = getStorageProvider();
      try {
        await storage.deleteObject(media.storageKey);
      } catch (error) {
        // Log but don't fail - the storage object may already be gone
        console.warn(`Failed to delete storage object ${media.storageKey}:`, error);
      }

      // Hard delete from database
      await MediaAttachment.deleteOne({ _id: mediaId });
    } else {
      // Soft delete
      media.isActive = false;
      await media.save();
    }
  }

  /**
   * Get pending uploads for a user
   */
  static async getPendingUploads(userId: string): Promise<IMediaUploadRequest[]> {
    const results = await MediaUploadRequest.find({
      requestedBy: new mongoose.Types.ObjectId(userId),
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return results as unknown as IMediaUploadRequest[];
  }

  /**
   * Cancel a pending upload
   */
  static async cancelUpload(uploadId: string, userId: string): Promise<void> {
    const uploadRequest = await MediaUploadRequest.findPendingByUploadId(uploadId);

    if (!uploadRequest) {
      throw ApiError.notFound('Upload request not found or already processed');
    }

    if (uploadRequest.requestedBy.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to cancel this upload');
    }

    // Mark as expired/cancelled
    await MediaUploadRequest.updateOne(
      { uploadId },
      { status: 'expired', errorMessage: 'Cancelled by user' }
    );

    // Try to clean up any partially uploaded file
    const storage = getStorageProvider();
    try {
      const exists = await storage.objectExists(uploadRequest.storageKey);
      if (exists) {
        await storage.deleteObject(uploadRequest.storageKey);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Cleanup expired upload requests and orphaned files
   */
  static async cleanupExpiredUploads(): Promise<{
    expiredRequests: number;
    orphanedFiles: number;
  }> {
    // Mark expired requests
    const expiredRequests = await MediaUploadRequest.cleanupExpired();

    // Find requests that were pending but never completed
    const orphanedRequests = await MediaUploadRequest.find({
      status: 'expired',
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Older than 24 hours
    }).lean();

    // Clean up orphaned storage objects
    let orphanedFiles = 0;
    const storage = getStorageProvider();

    for (const request of orphanedRequests) {
      try {
        const exists = await storage.objectExists(request.storageKey);
        if (exists) {
          await storage.deleteObject(request.storageKey);
          orphanedFiles++;
        }
      } catch (error) {
        // Continue with other files
      }
    }

    return { expiredRequests, orphanedFiles };
  }
}
