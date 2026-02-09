/**
 * Unit Tests: S3StorageProvider.putObject
 *
 * Tests for the putObject method added to S3StorageProvider
 * for server-side buffer uploads.
 */

import { S3StorageProvider } from '@/services/storage/s3-storage.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockSend
  })),
  PutObjectCommand: jest.fn().mockImplementation((params) => params),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  CopyObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn()
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn()
}));

jest.mock('@/config/storage.config', () => ({
  storageConfig: {
    s3: {
      bucket: 'test-bucket',
      region: 'us-east-1',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      cdnUrl: 'https://cdn.test.com'
    }
  }
}));

describe('S3StorageProvider.putObject', () => {
  let provider: S3StorageProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new S3StorageProvider();
  });

  it('should upload buffer to S3 and return public URL', async () => {
    const key = 'certificates/cert-456.pdf';
    const buffer = Buffer.from('fake pdf content');
    const contentType = 'application/pdf';

    mockSend.mockResolvedValue({});

    const result = await provider.putObject(key, buffer, contentType);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: key,
        Body: buffer,
        ContentType: contentType
      })
    );
    expect(result).toContain(key);
  });

  it('should throw ApiError when S3 upload fails', async () => {
    const key = 'test/file.pdf';
    const buffer = Buffer.from('content');

    mockSend.mockRejectedValue(new Error('S3 upload failed'));

    await expect(
      provider.putObject(key, buffer, 'application/pdf')
    ).rejects.toThrow('Failed to upload object: S3 upload failed');
  });
});
