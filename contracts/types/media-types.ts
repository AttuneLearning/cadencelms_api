/**
 * Media Types - Rich media content support
 * Version: 1.0.0
 *
 * These types define the structure for rich media content
 * used in flashcards, exercises, and other learning content.
 */

// ============================================================================
// Media Types
// ============================================================================

export type MediaType = 'text' | 'image' | 'video' | 'audio' | 'document';

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
 * How to display media relative to text
 */
export type MediaLayout =
  | 'text_only'           // No media, text only
  | 'media_only'          // No text, media only
  | 'media_above'         // Media above text
  | 'media_below'         // Media below text
  | 'media_left'          // Media left, text right (side by side)
  | 'media_right'         // Media right, text left (side by side)
  | 'media_background';   // Media as background with text overlay

// ============================================================================
// Media Attachment
// ============================================================================

/**
 * Individual media attachment
 */
export interface MediaAttachment {
  id: string;
  type: MediaType;

  // Storage reference
  storageKey: string;            // Key in S3/local storage
  cdnUrl: string;                // Public CDN URL for delivery (or local URL)

  // Metadata
  filename: string;
  title?: string;
  description?: string;
  mimeType: string;
  fileSize: number;              // In bytes

  // Dimensions (for image/video)
  width?: number;
  height?: number;

  // Duration (for video/audio)
  duration?: number;             // In seconds

  // Accessibility
  altText?: string;              // For images
  transcript?: string;           // For video/audio
  captions?: CaptionTrack[];     // For video

  // Upload metadata
  uploadedBy: string;            // User ID
  uploadedAt: string;            // ISO 8601 date
}

/**
 * Caption track for video
 */
export interface CaptionTrack {
  language: string;              // ISO 639-1 code (e.g., 'en', 'es')
  label: string;                 // Display name (e.g., 'English', 'Spanish')
  storageKey: string;            // VTT file in storage
  cdnUrl: string;
  isDefault: boolean;
}

// ============================================================================
// Media Content (Rich Content Container)
// ============================================================================

/**
 * Media content that can be attached to any question/prompt/card
 * At least one of text or media must be provided
 */
export interface MediaContent {
  // Primary content
  text?: string;                 // Text content (markdown supported)

  // Media attachments (zero or more)
  media?: MediaAttachment[];

  // Layout preference
  layout: MediaLayout;
}

// ============================================================================
// Media Upload Types
// ============================================================================

/**
 * Request to get a presigned upload URL
 */
export interface MediaUploadRequest {
  filename: string;
  mimeType: string;
  fileSize: number;
  purpose: MediaPurpose;
  entityId?: string;             // Associated entity (exercise, module, etc.)
  entityType?: string;           // Entity type
  altText?: string;
}

/**
 * Response with presigned upload URL
 */
export interface MediaUploadResponse {
  uploadId: string;
  uploadUrl: string;             // Presigned URL for direct upload
  storageKey: string;            // Where the file will be stored
  expiresAt: string;             // ISO 8601 - when the presigned URL expires
  fields?: Record<string, string>; // Additional fields for S3 POST
}

/**
 * Request to confirm upload and process media
 */
export interface MediaConfirmRequest {
  uploadId: string;
  storageKey: string;
  altText?: string;
  transcript?: string;
}

/**
 * Full media attachment after processing
 */
export interface MediaConfirmResponse {
  attachment: MediaAttachment;
}

// ============================================================================
// Media Constraints
// ============================================================================

export const MediaConstraints = {
  image: {
    maxFileSize: 10 * 1024 * 1024,  // 10 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxDimensions: { width: 4096, height: 4096 }
  },
  video: {
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    maxDuration: 5 * 60,            // 5 minutes
    allowedMimeTypes: ['video/mp4', 'video/webm']
  },
  audio: {
    maxFileSize: 20 * 1024 * 1024,  // 20 MB
    maxDuration: 5 * 60,            // 5 minutes
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
  },
  document: {
    maxFileSize: 25 * 1024 * 1024,  // 25 MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ]
  }
} as const;

// ============================================================================
// Storage Provider Types
// ============================================================================

export const STORAGE_PROVIDERS = ['local', 'aws_s3'] as const;
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

export interface StorageConfig {
  provider: StorageProvider;
  bucket?: string;
  region?: string;
  cdnUrl?: string;
  basePath: string;              // e.g., 'flashcards/media'
  publicAccess: boolean;
  signedUrlExpiry: number;       // Seconds for signed URLs
}
