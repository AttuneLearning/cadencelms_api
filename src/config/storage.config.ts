/**
 * Storage Configuration
 *
 * Configuration for storage providers (S3, local filesystem).
 * Reads from environment variables with sensible defaults.
 */

export interface StorageConfig {
  /** Active storage provider: 'aws_s3' or 'local' */
  provider: 'aws_s3' | 'local';

  /** Local filesystem storage configuration */
  local: {
    /** Path to store files (relative or absolute) */
    path: string;
    /** Base URL for accessing stored files */
    url: string;
  };

  /** AWS S3 storage configuration */
  s3: {
    /** S3 bucket name */
    bucket?: string;
    /** AWS region */
    region: string;
    /** CDN URL (CloudFront, etc.) for serving files */
    cdnUrl?: string;
    /** AWS access key ID (optional if using IAM roles) */
    accessKeyId?: string;
    /** AWS secret access key (optional if using IAM roles) */
    secretAccessKey?: string;
    /** Custom endpoint for S3-compatible storage (MinIO, LocalStack) */
    endpoint?: string;
    /** Use path-style URLs instead of virtual-hosted style */
    forcePathStyle?: boolean;
  };

  /** File upload constraints by media type */
  constraints: {
    image: MediaConstraints;
    video: MediaConstraints;
    audio: MediaConstraints;
  };

  /** Default presigned URL expiration in seconds */
  presignedUrlExpiry: number;

  /** Upload request expiration in seconds (for tracking pending uploads) */
  uploadRequestExpiry: number;
}

export interface MediaConstraints {
  /** Maximum file size in bytes */
  maxSize: number;
  /** Allowed MIME types */
  types: string[];
}

/**
 * Get storage provider from environment
 */
function getStorageProvider(): 'aws_s3' | 'local' {
  const provider = process.env.STORAGE_PROVIDER?.toLowerCase();
  if (provider === 'aws_s3' || provider === 's3') {
    return 'aws_s3';
  }
  return 'local';
}

/**
 * Parse file size from environment variable
 * Supports formats: "10MB", "100MB", "1GB", or raw bytes
 */
function parseFileSize(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;

  const match = value.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?$/i);
  if (!match) return defaultValue;

  const num = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();

  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024
  };

  return Math.floor(num * (multipliers[unit] || 1));
}

export const storageConfig: StorageConfig = {
  provider: getStorageProvider(),

  local: {
    path: process.env.LOCAL_STORAGE_PATH || './uploads',
    url: process.env.LOCAL_STORAGE_URL || 'http://localhost:3000/uploads'
  },

  s3: {
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_S3_REGION || 'us-east-1',
    cdnUrl: process.env.CDN_URL,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true'
  },

  constraints: {
    image: {
      maxSize: parseFileSize(process.env.MAX_IMAGE_SIZE, 10 * 1024 * 1024), // 10MB default
      types: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
      ]
    },
    video: {
      maxSize: parseFileSize(process.env.MAX_VIDEO_SIZE, 100 * 1024 * 1024), // 100MB default
      types: [
        'video/mp4',
        'video/webm',
        'video/quicktime'
      ]
    },
    audio: {
      maxSize: parseFileSize(process.env.MAX_AUDIO_SIZE, 20 * 1024 * 1024), // 20MB default
      types: [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/webm'
      ]
    }
  },

  // 15 minutes default for presigned URLs
  presignedUrlExpiry: parseInt(process.env.PRESIGNED_URL_EXPIRY || '900', 10),

  // 15 minutes default for upload request tracking
  uploadRequestExpiry: parseInt(process.env.UPLOAD_REQUEST_EXPIRY || '900', 10)
};

/**
 * Get media type from MIME type
 */
export function getMediaTypeFromMime(mimeType: string): 'image' | 'video' | 'audio' | null {
  if (storageConfig.constraints.image.types.includes(mimeType)) {
    return 'image';
  }
  if (storageConfig.constraints.video.types.includes(mimeType)) {
    return 'video';
  }
  if (storageConfig.constraints.audio.types.includes(mimeType)) {
    return 'audio';
  }
  return null;
}

/**
 * Validate file type and size against constraints
 */
export function validateMediaFile(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string; mediaType?: 'image' | 'video' | 'audio' } {
  const mediaType = getMediaTypeFromMime(mimeType);

  if (!mediaType) {
    const allTypes = [
      ...storageConfig.constraints.image.types,
      ...storageConfig.constraints.video.types,
      ...storageConfig.constraints.audio.types
    ];
    return {
      valid: false,
      error: `File type '${mimeType}' is not supported. Allowed types: ${allTypes.join(', ')}`
    };
  }

  const constraints = storageConfig.constraints[mediaType];
  if (fileSize > constraints.maxSize) {
    const maxSizeMB = Math.round(constraints.maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB for ${mediaType} files`
    };
  }

  return { valid: true, mediaType };
}

/**
 * Generate a storage key for a media file
 */
export function generateStorageKey(
  purpose: string,
  filename: string,
  entityType?: string,
  entityId?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);

  // Structure: purpose/[entityType/entityId/]timestamp-random-filename
  const parts = ['media', purpose];

  if (entityType) {
    parts.push(entityType);
  }
  if (entityId) {
    parts.push(entityId);
  }

  parts.push(`${timestamp}-${random}-${sanitizedFilename}`);

  return parts.join('/');
}
