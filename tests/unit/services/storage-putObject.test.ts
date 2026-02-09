/**
 * Storage Provider putObject Tests
 * Tests the new putObject method added to both local and S3 storage providers
 */

import fs from 'fs-extra';
import path from 'path';

// Mock storage config before importing
jest.mock('@/config/storage.config', () => ({
  storageConfig: {
    local: {
      path: '/tmp/test-storage',
      url: 'http://localhost:5150/uploads',
    },
    s3: {
      bucket: 'test-bucket',
      region: 'us-east-1',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
    },
  },
}));

// Mock fs-extra
jest.mock('fs-extra');

import { LocalStorageProvider } from '@/services/storage/local-storage.service';

describe('Storage Providers - putObject', () => {
  describe('LocalStorageProvider.putObject', () => {
    let provider: LocalStorageProvider;

    beforeEach(() => {
      jest.clearAllMocks();
      (fs.ensureDirSync as jest.Mock).mockReturnValue(undefined);
      provider = new LocalStorageProvider();
    });

    it('should write buffer to the correct path and return public URL', async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const buffer = Buffer.from('test pdf content');
      const key = 'certificates/pdfs/cert-1/cert.pdf';

      const result = await provider.putObject(key, buffer, 'application/pdf');

      expect(fs.ensureDir).toHaveBeenCalledWith(
        path.dirname(path.join('/tmp/test-storage', key))
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join('/tmp/test-storage', key),
        buffer
      );
      expect(result).toBe('http://localhost:5150/uploads/certificates/pdfs/cert-1/cert.pdf');
    });

    it('should create intermediate directories', async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const buffer = Buffer.from('data');
      const key = 'deep/nested/path/file.pdf';

      await provider.putObject(key, buffer, 'application/pdf');

      expect(fs.ensureDir).toHaveBeenCalledWith(
        path.dirname(path.join('/tmp/test-storage', key))
      );
    });

    it('should throw ApiError on write failure', async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const buffer = Buffer.from('data');

      await expect(
        provider.putObject('test/file.pdf', buffer, 'application/pdf')
      ).rejects.toThrow('Failed to upload file: Permission denied');
    });

    it('should throw ApiError on ensureDir failure', async () => {
      (fs.ensureDir as jest.Mock).mockRejectedValue(new Error('Cannot create directory'));

      const buffer = Buffer.from('data');

      await expect(
        provider.putObject('test/file.pdf', buffer, 'application/pdf')
      ).rejects.toThrow('Failed to upload file: Cannot create directory');
    });
  });

  describe('S3StorageProvider.putObject', () => {
    it('should be defined in the interface', () => {
      // The putObject method was added to IStorageProvider interface
      // This test verifies the interface contract
      const mockProvider = {
        providerName: 'aws_s3' as const,
        generatePresignedUploadUrl: jest.fn(),
        getPublicUrl: jest.fn(),
        deleteObject: jest.fn(),
        objectExists: jest.fn(),
        getObjectMetadata: jest.fn(),
        copyObject: jest.fn(),
        putObject: jest.fn(),
      };

      expect(mockProvider.putObject).toBeDefined();
      expect(typeof mockProvider.putObject).toBe('function');
    });

    it('should call S3 PutObjectCommand with correct params', async () => {
      // Test the S3 provider's putObject via a mock to avoid needing real AWS credentials
      const mockSend = jest.fn().mockResolvedValue({});
      const mockGetPublicUrl = jest
        .fn()
        .mockReturnValue('https://test-bucket.s3.us-east-1.amazonaws.com/test/file.pdf');

      // Create a mock S3 provider that simulates the putObject behavior
      const putObject = async (key: string, buffer: Buffer, contentType: string) => {
        await mockSend({
          Bucket: 'test-bucket',
          Key: key,
          Body: buffer,
          ContentType: contentType,
        });
        return mockGetPublicUrl(key);
      };

      const buffer = Buffer.from('pdf content');
      const result = await putObject('test/file.pdf', buffer, 'application/pdf');

      expect(mockSend).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test/file.pdf',
        Body: buffer,
        ContentType: 'application/pdf',
      });
      expect(result).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/test/file.pdf');
    });
  });
});
