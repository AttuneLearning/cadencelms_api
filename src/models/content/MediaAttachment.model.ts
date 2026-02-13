/**
 * MediaAttachment Model
 *
 * Represents a media file (image, video, audio, document) stored in the system.
 * Used for flashcards, questions, content thumbnails, and other media needs.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Media type categories
 */
export const MEDIA_TYPES = ['image', 'video', 'audio', 'document'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

/**
 * Storage provider types
 */
export const STORAGE_PROVIDERS = ['local', 'aws_s3'] as const;
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

/**
 * Purpose of the media attachment
 */
export const MEDIA_PURPOSES = [
  'flashcard',
  'question',
  'content',
  'thumbnail',
  'avatar',
  'certificate',
  'assignment',
  'general'
] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

/**
 * MediaAttachment interface
 */
export interface IMediaAttachment extends Document {
  _id: mongoose.Types.ObjectId;

  /** Type of media: image, video, or audio */
  type: MediaType;

  /** Storage provider used: local or aws_s3 */
  storageProvider: StorageProvider;

  /** Storage key (path) in the provider */
  storageKey: string;

  /** CDN/public URL for accessing the media */
  cdnUrl: string;

  /** Original filename from upload */
  filename: string;

  /** Display title for media library UX */
  title?: string;

  /** Optional description for media library UX */
  description?: string;

  /** MIME type of the file */
  mimeType: string;

  /** File size in bytes */
  fileSize: number;

  /** Width in pixels (for images and videos) */
  width?: number;

  /** Height in pixels (for images and videos) */
  height?: number;

  /** Duration in seconds (for audio and video) */
  duration?: number;

  /** Alternative text for accessibility */
  altText?: string;

  /** Purpose of this media attachment */
  purpose: MediaPurpose;

  /** Type of entity this media is attached to (e.g., 'question', 'flashcard') */
  entityType?: string;

  /** ID of the entity this media is attached to */
  entityId?: mongoose.Types.ObjectId;

  /** Department this media belongs to (for access control) */
  departmentId?: mongoose.Types.ObjectId;

  /** User who uploaded the media */
  uploadedBy: mongoose.Types.ObjectId;

  /** Timestamp when the file was uploaded */
  uploadedAt: Date;

  /** Whether this media is active (not soft-deleted) */
  isActive: boolean;

  /** Additional metadata (codec, bitrate, etc.) */
  metadata?: Record<string, any>;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MediaAttachment static methods
 */
export interface IMediaAttachmentModel extends Model<IMediaAttachment> {
  /**
   * Find media by entity
   */
  findByEntity(entityType: string, entityId: string): Promise<IMediaAttachment[]>;

  /**
   * Find media by purpose
   */
  findByPurpose(purpose: MediaPurpose, departmentId?: string): Promise<IMediaAttachment[]>;

  /**
   * Count references to a media attachment
   */
  countReferences(mediaId: string): Promise<number>;
}

const mediaAttachmentSchema = new Schema<IMediaAttachment>(
  {
    type: {
      type: String,
      required: [true, 'Media type is required'],
      enum: {
        values: [...MEDIA_TYPES],
        message: '{VALUE} is not a valid media type'
      }
    },

    storageProvider: {
      type: String,
      required: [true, 'Storage provider is required'],
      enum: {
        values: [...STORAGE_PROVIDERS],
        message: '{VALUE} is not a valid storage provider'
      }
    },

    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      trim: true,
      maxlength: [500, 'Storage key cannot exceed 500 characters']
    },

    cdnUrl: {
      type: String,
      required: [true, 'CDN URL is required'],
      trim: true,
      maxlength: [1000, 'CDN URL cannot exceed 1000 characters']
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

    width: {
      type: Number,
      min: [0, 'Width cannot be negative']
    },

    height: {
      type: Number,
      min: [0, 'Height cannot be negative']
    },

    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative']
    },

    altText: {
      type: String,
      trim: true,
      maxlength: [500, 'Alt text cannot exceed 500 characters']
    },

    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      enum: {
        values: [...MEDIA_PURPOSES],
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

    uploadedBy: {
      type: Schema.Types.ObjectId,
      required: [true, 'Uploaded by is required'],
      ref: 'User'
    },

    uploadedAt: {
      type: Date,
      required: true,
      default: Date.now
    },

    isActive: {
      type: Boolean,
      default: true
    },

    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    collection: 'media_attachments'
  }
);

// Indexes for common queries
mediaAttachmentSchema.index({ storageKey: 1 }, { unique: true });
mediaAttachmentSchema.index({ entityType: 1, entityId: 1 });
mediaAttachmentSchema.index({ purpose: 1, departmentId: 1 });
mediaAttachmentSchema.index({ uploadedBy: 1 });
mediaAttachmentSchema.index({ type: 1, isActive: 1 });
mediaAttachmentSchema.index({ departmentId: 1, isActive: 1 });
mediaAttachmentSchema.index({ createdAt: -1 });

// Static methods
mediaAttachmentSchema.statics.findByEntity = async function (
  entityType: string,
  entityId: string
): Promise<IMediaAttachment[]> {
  return this.find({
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
    isActive: true
  }).sort({ createdAt: -1 });
};

mediaAttachmentSchema.statics.findByPurpose = async function (
  purpose: MediaPurpose,
  departmentId?: string
): Promise<IMediaAttachment[]> {
  const query: any = { purpose, isActive: true };
  if (departmentId) {
    query.departmentId = new mongoose.Types.ObjectId(departmentId);
  }
  return this.find(query).sort({ createdAt: -1 });
};

mediaAttachmentSchema.statics.countReferences = async function (
  _mediaId: string
): Promise<number> {
  // TODO: Implement reference counting across related models
  // This would check Question, Flashcard, Content, etc. for references
  return 0;
};

// Virtual for display-friendly file size
mediaAttachmentSchema.virtual('fileSizeFormatted').get(function () {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for duration formatted as MM:SS
mediaAttachmentSchema.virtual('durationFormatted').get(function () {
  if (!this.duration) return null;
  const minutes = Math.floor(this.duration / 60);
  const seconds = Math.floor(this.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Ensure virtuals are included in JSON output
mediaAttachmentSchema.set('toJSON', { virtuals: true });
mediaAttachmentSchema.set('toObject', { virtuals: true });

const MediaAttachment = mongoose.model<IMediaAttachment, IMediaAttachmentModel>(
  'MediaAttachment',
  mediaAttachmentSchema
);

export default MediaAttachment;
