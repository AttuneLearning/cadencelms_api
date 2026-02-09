/**
 * Unit Tests: LocalStorageProvider.putObject
 *
 * Tests for the putObject method added to LocalStorageProvider
 * for server-side buffer uploads.
 */

import fs from 'fs-extra';
import path from 'path';
import { LocalStorageProvider } from '@/services/storage/local-storage.service';

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  ensureDirSync: jest.fn(),
  writeFile: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(true),
  remove: jest.fn().mockResolvedValue(undefined),
  copy: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ size: 100 })
}));
jest.mock('@/config/storage.config', () => ({
  storageConfig: {
    local: {
      path: '/tmp/test-storage',
      url: 'http://localhost:5150/uploads'
    }
  }
}));

describe('LocalStorageProvider.putObject', () => {
  let provider: LocalStorageProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new LocalStorageProvider();
  });

  it('should write buffer to file and return public URL', async () => {
    const key = 'certificates/cert-123.pdf';
    const buffer = Buffer.from('fake pdf content');
    const contentType = 'application/pdf';

    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    const result = await provider.putObject(key, buffer, contentType);

    expect(fs.ensureDir).toHaveBeenCalledWith(
      path.dirname(path.join('/tmp/test-storage', key))
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('/tmp/test-storage', key),
      buffer
    );
    expect(result).toContain(key);
  });

  it('should ensure directory exists before writing', async () => {
    const key = 'deep/nested/path/file.pdf';
    const buffer = Buffer.from('content');

    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    await provider.putObject(key, buffer, 'application/pdf');

    expect(fs.ensureDir).toHaveBeenCalledTimes(1);
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should throw ApiError when write fails', async () => {
    const key = 'test/file.pdf';
    const buffer = Buffer.from('content');

    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'));

    await expect(
      provider.putObject(key, buffer, 'application/pdf')
    ).rejects.toThrow('Failed to upload file: Disk full');
  });
});
