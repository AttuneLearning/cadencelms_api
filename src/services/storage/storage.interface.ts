/**
 * Storage Provider Interface
 *
 * Abstraction layer for storage providers (S3, local filesystem, etc.)
 * Enables presigned URL uploads for direct client-to-storage uploads.
 */

/**
 * Result of generating a presigned upload URL
 */
export interface PresignedUrlResult {
  /** URL the client should PUT/POST the file to */
  uploadUrl: string;
  /** Public URL where the file will be accessible after upload */
  publicUrl: string;
  /** Storage key (path) for the uploaded file */
  key: string;
  /** When the presigned URL expires */
  expiresAt: Date;
}

/**
 * Metadata about a stored object
 */
export interface ObjectMetadata {
  /** MIME type of the object */
  contentType: string;
  /** Size in bytes */
  contentLength: number;
  /** Last modification timestamp */
  lastModified: Date;
  /** Optional ETag for cache validation */
  etag?: string;
}

/**
 * Options for generating presigned URLs
 */
export interface PresignedUrlOptions {
  /** Time in seconds until the URL expires (default: 900 = 15 minutes) */
  expiresIn?: number;
  /** Expected file size in bytes (for validation) */
  contentLength?: number;
  /** Additional metadata to attach to the object */
  metadata?: Record<string, string>;
}

/**
 * Storage provider interface
 *
 * Implementations should handle:
 * - S3-compatible storage (AWS S3, MinIO, etc.)
 * - Local filesystem storage (for development)
 */
export interface IStorageProvider {
  /**
   * Get the provider name (e.g., 'aws_s3', 'local')
   */
  readonly providerName: 'aws_s3' | 'local';

  /**
   * Generate a presigned URL for direct file upload
   *
   * @param key - The storage key (path) for the file
   * @param contentType - MIME type of the file being uploaded
   * @param options - Additional options
   * @returns Presigned URL result with upload and public URLs
   */
  generatePresignedUploadUrl(
    key: string,
    contentType: string,
    options?: PresignedUrlOptions
  ): Promise<PresignedUrlResult>;

  /**
   * Get the public URL for a stored object
   *
   * @param key - The storage key (path) of the file
   * @returns Public URL for accessing the file
   */
  getPublicUrl(key: string): string;

  /**
   * Delete an object from storage
   *
   * @param key - The storage key (path) of the file to delete
   * @throws ApiError if deletion fails
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Check if an object exists in storage
   *
   * @param key - The storage key (path) to check
   * @returns true if the object exists
   */
  objectExists(key: string): Promise<boolean>;

  /**
   * Get metadata for a stored object
   *
   * @param key - The storage key (path) of the file
   * @returns Object metadata
   * @throws ApiError if object doesn't exist
   */
  getObjectMetadata(key: string): Promise<ObjectMetadata>;

  /**
   * Copy an object within storage
   *
   * @param sourceKey - Source storage key
   * @param destinationKey - Destination storage key
   */
  copyObject(sourceKey: string, destinationKey: string): Promise<void>;
}
