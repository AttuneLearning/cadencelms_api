/**
 * S3 Storage Provider
 *
 * Implementation of IStorageProvider for AWS S3 and S3-compatible storage.
 * Supports presigned URL generation for direct client uploads.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ApiError } from '@/utils/ApiError';
import {
  IStorageProvider,
  PresignedUrlResult,
  ObjectMetadata,
  PresignedUrlOptions
} from './storage.interface';
import { storageConfig } from '@/config/storage.config';

export class S3StorageProvider implements IStorageProvider {
  readonly providerName = 'aws_s3' as const;

  private client: S3Client;
  private bucket: string;
  private region: string;
  private cdnUrl?: string;

  constructor() {
    const config = storageConfig.s3;

    if (!config.bucket) {
      throw new Error('AWS_S3_BUCKET environment variable is required for S3 storage');
    }

    this.bucket = config.bucket;
    this.region = config.region;
    this.cdnUrl = config.cdnUrl;

    // Initialize S3 client
    this.client = new S3Client({
      region: this.region,
      // Credentials are automatically loaded from environment variables or IAM role
      ...(config.accessKeyId && config.secretAccessKey && {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        }
      }),
      // Support for custom endpoints (MinIO, LocalStack, etc.)
      ...(config.endpoint && {
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle ?? true
      })
    });
  }

  /**
   * Generate a presigned URL for direct file upload
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    options: PresignedUrlOptions = {}
  ): Promise<PresignedUrlResult> {
    const expiresIn = options.expiresIn ?? 900; // 15 minutes default

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ...(options.contentLength && { ContentLength: options.contentLength }),
      ...(options.metadata && { Metadata: options.metadata })
    });

    try {
      const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
      const publicUrl = this.getPublicUrl(key);
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        uploadUrl,
        publicUrl,
        key,
        expiresAt
      };
    } catch (error: any) {
      throw ApiError.internal(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Get the public URL for a stored object
   * Uses CDN URL if configured, otherwise falls back to S3 URL
   */
  getPublicUrl(key: string): string {
    if (this.cdnUrl) {
      // Use CDN URL (CloudFront, etc.)
      return `${this.cdnUrl.replace(/\/$/, '')}/${key}`;
    }

    // Default S3 URL format
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Delete an object from S3
   */
  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.client.send(command);
    } catch (error: any) {
      throw ApiError.internal(`Failed to delete object: ${error.message}`);
    }
  }

  /**
   * Check if an object exists in S3
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw ApiError.internal(`Failed to check object existence: ${error.message}`);
    }
  }

  /**
   * Get metadata for a stored object
   */
  async getObjectMetadata(key: string): Promise<ObjectMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const response = await this.client.send(command);

      return {
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw ApiError.notFound('Object not found in storage');
      }
      throw ApiError.internal(`Failed to get object metadata: ${error.message}`);
    }
  }

  /**
   * Copy an object within S3
   */
  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey
      });

      await this.client.send(command);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw ApiError.notFound('Source object not found');
      }
      throw ApiError.internal(`Failed to copy object: ${error.message}`);
    }
  }

  /**
   * Upload a buffer directly to S3 (server-side upload)
   */
  async putObject(key: string, buffer: Buffer, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType
      });

      await this.client.send(command);
      return this.getPublicUrl(key);
    } catch (error: any) {
      throw ApiError.internal(`Failed to upload object: ${error.message}`);
    }
  }

  /**
   * Generate a presigned URL for reading an object (for private buckets)
   * Useful for generating temporary download links
   */
  async generatePresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error: any) {
      throw ApiError.internal(`Failed to generate download URL: ${error.message}`);
    }
  }
}
