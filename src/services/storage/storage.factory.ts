/**
 * Storage Factory
 *
 * Factory function to get the appropriate storage provider based on configuration.
 * Implements a singleton pattern to reuse provider instances.
 */

import { IStorageProvider } from './storage.interface';
import { S3StorageProvider } from './s3-storage.service';
import { LocalStorageProvider } from './local-storage.service';
import { storageConfig } from '@/config/storage.config';

// Singleton instances
let s3Provider: S3StorageProvider | null = null;
let localProvider: LocalStorageProvider | null = null;

/**
 * Get the configured storage provider
 *
 * Returns a singleton instance of the appropriate storage provider
 * based on the STORAGE_PROVIDER environment variable.
 *
 * @returns Storage provider instance
 */
export function getStorageProvider(): IStorageProvider {
  const provider = storageConfig.provider;

  if (provider === 'aws_s3') {
    if (!s3Provider) {
      try {
        s3Provider = new S3StorageProvider();
      } catch (error: any) {
        // If S3 configuration is missing, fall back to local with a warning
        console.warn(
          `[Storage] Failed to initialize S3 provider: ${error.message}. Falling back to local storage.`
        );
        return getLocalProvider();
      }
    }
    return s3Provider;
  }

  return getLocalProvider();
}

/**
 * Get the local storage provider
 *
 * @returns Local storage provider instance
 */
function getLocalProvider(): LocalStorageProvider {
  if (!localProvider) {
    localProvider = new LocalStorageProvider();
  }
  return localProvider;
}

/**
 * Get the local storage provider explicitly
 * Useful for the local upload endpoint
 *
 * @returns Local storage provider instance
 */
export function getLocalStorageProvider(): LocalStorageProvider {
  return getLocalProvider();
}

/**
 * Get S3 storage provider explicitly
 * Throws if S3 is not configured
 *
 * @returns S3 storage provider instance
 * @throws Error if S3 configuration is missing
 */
export function getS3StorageProvider(): S3StorageProvider {
  if (!s3Provider) {
    s3Provider = new S3StorageProvider();
  }
  return s3Provider;
}

/**
 * Check if the current provider is S3
 */
export function isS3Provider(): boolean {
  return storageConfig.provider === 'aws_s3';
}

/**
 * Check if the current provider is local
 */
export function isLocalProvider(): boolean {
  return storageConfig.provider === 'local';
}

/**
 * Reset providers (for testing)
 */
export function resetProviders(): void {
  s3Provider = null;
  localProvider = null;
}
