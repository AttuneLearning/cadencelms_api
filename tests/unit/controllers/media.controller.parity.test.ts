import { Request, Response } from 'express';
import {
  requestUploadUrl,
  listMedia,
  updateMedia
} from '@/controllers/content/media.controller';
import { MediaService } from '@/services/content/media.service';

jest.mock('@/services/content/media.service');

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Media Controller Canonical Parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes title/description through requestUploadUrl', async () => {
    const req = {
      body: {
        filename: 'lesson-guide.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        purpose: 'content',
        title: 'Lesson Guide',
        description: 'Week 1 guide'
      },
      user: { userId: 'staff-1' }
    } as unknown as Request;
    const res = mockResponse();

    (MediaService.requestUploadUrl as jest.Mock).mockResolvedValue({
      uploadId: 'u1',
      uploadUrl: 'https://upload.example',
      publicUrl: 'https://cdn.example/file.pdf',
      storageKey: 'media/content/file.pdf',
      expiresAt: new Date(),
      contentType: 'application/pdf'
    });

    await requestUploadUrl(req, res, jest.fn());

    expect(MediaService.requestUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Lesson Guide',
        description: 'Week 1 guide'
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('accepts document type filter in listMedia', async () => {
    const req = {
      query: { type: 'document' },
      user: { userId: 'staff-1' }
    } as unknown as Request;
    const res = mockResponse();

    (MediaService.listMedia as jest.Mock).mockResolvedValue({
      media: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
    });

    await listMedia(req, res, jest.fn());

    expect(MediaService.listMedia).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'document' }),
      'staff-1'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('passes title/description in updateMedia', async () => {
    const req = {
      params: { mediaId: '507f1f77bcf86cd799439099' },
      body: {
        title: 'Updated Title',
        description: 'Updated Description',
        altText: 'Alt'
      },
      user: { userId: 'staff-1' }
    } as unknown as Request;
    const res = mockResponse();

    (MediaService.updateMedia as jest.Mock).mockResolvedValue({
      _id: '507f1f77bcf86cd799439099',
      title: 'Updated Title',
      description: 'Updated Description',
      altText: 'Alt',
      metadata: {},
      updatedAt: new Date()
    });

    await updateMedia(req, res, jest.fn());

    expect(MediaService.updateMedia).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439099',
      expect.objectContaining({
        title: 'Updated Title',
        description: 'Updated Description',
        altText: 'Alt'
      }),
      'staff-1'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
