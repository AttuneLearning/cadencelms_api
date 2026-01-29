/**
 * Local Storage Provider
 *
 * Implementation of IStorageProvider for local filesystem storage.
 * Intended for development and testing environments.
 *
 * This provider simulates presigned URLs by generating tokens that
 * are validated by a local upload endpoint.
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { ApiError } from '@/utils/ApiError';
import {
  IStorageProvider,
  PresignedUrlResult,
  ObjectMetadata,
  PresignedUrlOptions
} from './storage.interface';
import { storageConfig } from '@/config/storage.config';

// In-memory store for upload tokens (in production, use Redis)
const uploadTokens = new Map<string, {
  key: string;
  contentType: string;
  expiresAt: Date;
  contentLength?: number;
}>();

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of uploadTokens.entries()) {
    if (data.expiresAt.getTime() < now) {
      uploadTokens.delete(token);
    }
  }
}, 60000); // Every minute

export class LocalStorageProvider implements IStorageProvider {
  readonly providerName = 'local' as const;

  private storagePath: string;
  private publicUrl: string;

  constructor() {
    const config = storageConfig.local;

    this.storagePath = path.resolve(config.path);
    this.publicUrl = config.url.replace(/\/$/, '');

    // Ensure storage directory exists
    fs.ensureDirSync(this.storagePath);
  }

  /**
   * Generate a mock "presigned" URL for local uploads
   *
   * For local storage, we generate a token-based URL that points to
   * our local upload endpoint. The token validates the upload request.
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    options: PresignedUrlOptions = {}
  ): Promise<PresignedUrlResult> {
    const expiresIn = options.expiresIn ?? 900; // 15 minutes default
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Generate a secure upload token
    const uploadToken = crypto.randomBytes(32).toString('hex');

    // Store token data for validation during upload
    uploadTokens.set(uploadToken, {
      key,
      contentType,
      expiresAt,
      contentLength: options.contentLength
    });

    // Ensure the directory structure exists
    const fullPath = path.join(this.storagePath, key);
    const dir = path.dirname(fullPath);
    await fs.ensureDir(dir);

    // Generate the upload URL pointing to our local endpoint
    const uploadUrl = `${this.publicUrl}/upload/${uploadToken}`;
    const publicUrlPath = this.getPublicUrl(key);

    return {
      uploadUrl,
      publicUrl: publicUrlPath,
      key,
      expiresAt
    };
  }

  /**
   * Get the public URL for a stored file
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Delete a file from local storage
   */
  async deleteObject(key: string): Promise<void> {
    const fullPath = path.join(this.storagePath, key);

    try {
      if (await fs.pathExists(fullPath)) {
        await fs.remove(fullPath);
      }
    } catch (error: any) {
      throw ApiError.internal(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Check if a file exists in local storage
   */
  async objectExists(key: string): Promise<boolean> {
    const fullPath = path.join(this.storagePath, key);
    return fs.pathExists(fullPath);
  }

  /**
   * Get metadata for a stored file
   */
  async getObjectMetadata(key: string): Promise<ObjectMetadata> {
    const fullPath = path.join(this.storagePath, key);

    try {
      const stats = await fs.stat(fullPath);

      // Try to determine content type from extension
      const ext = path.extname(key).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.pdf': 'application/pdf'
      };

      return {
        contentType: mimeTypes[ext] || 'application/octet-stream',
        contentLength: stats.size,
        lastModified: stats.mtime
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw ApiError.notFound('File not found in storage');
      }
      throw ApiError.internal(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Copy a file within local storage
   */
  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    const sourcePath = path.join(this.storagePath, sourceKey);
    const destPath = path.join(this.storagePath, destinationKey);

    try {
      // Ensure destination directory exists
      await fs.ensureDir(path.dirname(destPath));
      await fs.copy(sourcePath, destPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw ApiError.notFound('Source file not found');
      }
      throw ApiError.internal(`Failed to copy file: ${error.message}`);
    }
  }

  /**
   * Validate an upload token and get associated data
   * Used by the local upload endpoint
   */
  static validateUploadToken(token: string): {
    key: string;
    contentType: string;
    contentLength?: number;
  } | null {
    const data = uploadTokens.get(token);

    if (!data) {
      return null;
    }

    // Check if token has expired
    if (data.expiresAt.getTime() < Date.now()) {
      uploadTokens.delete(token);
      return null;
    }

    // Remove token after validation (single use)
    uploadTokens.delete(token);

    return {
      key: data.key,
      contentType: data.contentType,
      contentLength: data.contentLength
    };
  }

  /**
   * Write a file directly to local storage
   * Used by the local upload endpoint after token validation
   */
  async writeFile(key: string, data: Buffer): Promise<void> {
    const fullPath = path.join(this.storagePath, key);

    try {
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, data);
    } catch (error: any) {
      throw ApiError.internal(`Failed to write file: ${error.message}`);
    }
  }

  /**
   * Get the full filesystem path for a key
   * Used by the local upload endpoint
   */
  getFullPath(key: string): string {
    return path.join(this.storagePath, key);
  }
}
