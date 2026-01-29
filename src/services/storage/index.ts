/**
 * Storage Module
 *
 * Exports all storage-related interfaces, providers, and utilities.
 */

// Interfaces
export type {
  IStorageProvider,
  PresignedUrlResult,
  ObjectMetadata,
  PresignedUrlOptions
} from './storage.interface';

// Providers
export { S3StorageProvider } from './s3-storage.service';
export { LocalStorageProvider } from './local-storage.service';

// Factory
export {
  getStorageProvider,
  getLocalStorageProvider,
  getS3StorageProvider,
  isS3Provider,
  isLocalProvider,
  resetProviders
} from './storage.factory';
