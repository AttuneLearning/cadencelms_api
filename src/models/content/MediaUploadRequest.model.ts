/**
 * MediaUploadRequest Model
 *
 * Temporary tracking document for pending media uploads.
 * Created when a presigned URL is generated, used to validate and
 * track the upload completion. Documents expire automatically via TTL index.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { MediaPurpose, MediaType, StorageProvider } from './MediaAttachment.model';

/**
 * Upload request status
 */
export type UploadRequestStatus = 'pending' | 'completed' | 'expired' | 'failed';

/**
 * MediaUploadRequest interface
 */
export interface IMediaUploadRequest extends Document {
  _id: mongoose.Types.ObjectId;

  /** Unique upload ID (UUID) for client reference */
  uploadId: string;

  /** Storage key where the file will be/is stored */
  storageKey: string;

  /** Storage provider being used */
  storageProvider: StorageProvider;

  /** Original filename from the request */
  filename: string;

  /** Optional display title from client */
  title?: string;

  /** Optional description from client */
  description?: string;

  /** Expected MIME type */
  mimeType: string;

  /** Expected file size in bytes */
  fileSize: number;

  /** Expected media type */
  mediaType: MediaType;

  /** Purpose of the upload */
  purpose: MediaPurpose;

  /** Type of entity this upload is for */
  entityType?: string;

  /** ID of the entity this upload is for */
  entityId?: mongoose.Types.ObjectId;

  /** Department this upload belongs to */
  departmentId?: mongoose.Types.ObjectId;

  /** User who requested the upload */
  requestedBy: mongoose.Types.ObjectId;

  /** When the upload was requested */
  requestedAt: Date;

  /** When the presigned URL expires */
  expiresAt: Date;

  /** Current status of the upload request */
  status: UploadRequestStatus;

  /** ID of the created MediaAttachment (when completed) */
  mediaAttachmentId?: mongoose.Types.ObjectId;

  /** Error message if upload failed */
  errorMessage?: string;

  /** The presigned upload URL (stored for reference/debugging) */
  uploadUrl?: string;

  /** The public URL the file will be accessible at */
  publicUrl?: string;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MediaUploadRequest static methods
 */
export interface IMediaUploadRequestModel extends Model<IMediaUploadRequest> {
  /**
   * Find a pending upload request by upload ID
   */
  findPendingByUploadId(uploadId: string): Promise<IMediaUploadRequest | null>;

  /**
   * Mark an upload as completed
   */
  markCompleted(uploadId: string, mediaAttachmentId: mongoose.Types.ObjectId): Promise<IMediaUploadRequest | null>;

  /**
   * Mark an upload as failed
   */
  markFailed(uploadId: string, errorMessage: string): Promise<IMediaUploadRequest | null>;

  /**
   * Clean up expired requests
   */
  cleanupExpired(): Promise<number>;
}

const mediaUploadRequestSchema = new Schema<IMediaUploadRequest>(
  {
    uploadId: {
      type: String,
      required: [true, 'Upload ID is required'],
      unique: true,
      index: true
    },

    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      trim: true,
      maxlength: [500, 'Storage key cannot exceed 500 characters']
    },

    storageProvider: {
      type: String,
      required: [true, 'Storage provider is required'],
      enum: {
        values: ['local', 'aws_s3'],
        message: '{VALUE} is not a valid storage provider'
      }
    },

    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters']
    },

    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },

    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
      maxlength: [100, 'MIME type cannot exceed 100 characters']
    },

    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative']
    },

    mediaType: {
      type: String,
      required: [true, 'Media type is required'],
      enum: {
        values: ['image', 'video', 'audio', 'document'],
        message: '{VALUE} is not a valid media type'
      }
    },

    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      enum: {
        values: ['flashcard', 'question', 'content', 'thumbnail', 'avatar', 'certificate', 'assignment', 'general'],
        message: '{VALUE} is not a valid purpose'
      }
    },

    entityType: {
      type: String,
      trim: true,
      maxlength: [50, 'Entity type cannot exceed 50 characters']
    },

    entityId: {
      type: Schema.Types.ObjectId
    },

    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department'
    },

    requestedBy: {
      type: Schema.Types.ObjectId,
      required: [true, 'Requested by is required'],
      ref: 'User'
    },

    requestedAt: {
      type: Date,
      required: true,
      default: Date.now
    },

    expiresAt: {
      type: Date,
      required: [true, 'Expiration time is required']
    },

    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: {
        values: ['pending', 'completed', 'expired', 'failed'],
        message: '{VALUE} is not a valid status'
      }
    },

    mediaAttachmentId: {
      type: Schema.Types.ObjectId,
      ref: 'MediaAttachment'
    },

    errorMessage: {
      type: String,
      trim: true,
      maxlength: [500, 'Error message cannot exceed 500 characters']
    },

    uploadUrl: {
      type: String,
      trim: true,
      maxlength: [2000, 'Upload URL cannot exceed 2000 characters']
    },

    publicUrl: {
      type: String,
      trim: true,
      maxlength: [1000, 'Public URL cannot exceed 1000 characters']
    }
  },
  {
    timestamps: true,
    collection: 'media_upload_requests'
  }
);

// TTL index - automatically delete documents 15 minutes after expiration
// This gives time for debugging while still cleaning up old requests
mediaUploadRequestSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 900 } // 15 minutes after expiresAt
);

// Additional indexes for common queries
mediaUploadRequestSchema.index({ status: 1, requestedBy: 1 });
mediaUploadRequestSchema.index({ requestedBy: 1, createdAt: -1 });

// Static methods
mediaUploadRequestSchema.statics.findPendingByUploadId = async function (
  uploadId: string
): Promise<IMediaUploadRequest | null> {
  return this.findOne({
    uploadId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });
};

mediaUploadRequestSchema.statics.markCompleted = async function (
  uploadId: string,
  mediaAttachmentId: mongoose.Types.ObjectId
): Promise<IMediaUploadRequest | null> {
  return this.findOneAndUpdate(
    { uploadId, status: 'pending' },
    {
      status: 'completed',
      mediaAttachmentId,
      updatedAt: new Date()
    },
    { new: true }
  );
};

mediaUploadRequestSchema.statics.markFailed = async function (
  uploadId: string,
  errorMessage: string
): Promise<IMediaUploadRequest | null> {
  return this.findOneAndUpdate(
    { uploadId, status: 'pending' },
    {
      status: 'failed',
      errorMessage,
      updatedAt: new Date()
    },
    { new: true }
  );
};

mediaUploadRequestSchema.statics.cleanupExpired = async function (): Promise<number> {
  const result = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    {
      status: 'expired',
      updatedAt: new Date()
    }
  );
  return result.modifiedCount;
};

// Pre-save middleware to update timestamps
mediaUploadRequestSchema.pre('save', function (next) {
  if (this.isNew && !this.requestedAt) {
    this.requestedAt = new Date();
  }
  next();
});

const MediaUploadRequest = mongoose.model<IMediaUploadRequest, IMediaUploadRequestModel>(
  'MediaUploadRequest',
  mediaUploadRequestSchema
);

export default MediaUploadRequest;
