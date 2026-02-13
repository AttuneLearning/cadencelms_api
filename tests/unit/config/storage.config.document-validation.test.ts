import {
  getMediaTypeFromMime,
  validateMediaFile,
  storageConfig
} from '@/config/storage.config';

describe('Storage Config Document Validation', () => {
  it('classifies document MIME types correctly', () => {
    expect(getMediaTypeFromMime('application/pdf')).toBe('document');
    expect(getMediaTypeFromMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('document');
  });

  it('accepts valid document uploads within size limits', () => {
    const result = validateMediaFile('application/pdf', 1024 * 1024);
    expect(result.valid).toBe(true);
    expect(result.mediaType).toBe('document');
  });

  it('rejects oversized document uploads', () => {
    const result = validateMediaFile('application/pdf', storageConfig.constraints.document.maxSize + 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('maximum allowed size');
  });
});
