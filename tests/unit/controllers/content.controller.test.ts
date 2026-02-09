import { Request, Response, NextFunction } from 'express';
import { ContentService } from '@/services/content/content.service';
import * as contentController from '@/controllers/content/content.controller';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/services/content/content.service');

const MockedContentService = ContentService as jest.Mocked<typeof ContentService>;

describe('Content Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {
      query: {},
      params: {},
      body: {}
    } as any;
    (mockReq as any).user = { userId: 'user-123' };
    mockRes = {
      status: mockStatus,
      json: mockJson
    } as any;
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('listContent', () => {
    it('should return result directly without double-nesting', async () => {
      const serviceResult = {
        items: [
          { _id: 'content-1', title: 'Test Content', type: 'scorm' },
          { _id: 'content-2', title: 'Test Media', type: 'media' }
        ],
        total: 2,
        page: 1,
        limit: 20
      };

      (MockedContentService.listAllContent as jest.Mock).mockResolvedValue(serviceResult);

      const handler = contentController.listContent;
      await handler(mockReq as Request, mockRes as Response, mockNext);

      // Verify status 200
      expect(mockStatus).toHaveBeenCalledWith(200);

      // Verify the response shape: data should be the service result directly
      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall).toEqual({
        status: 'success',
        success: true,
        data: serviceResult
      });

      // Critical: data must NOT be double-nested as { data: { items: [...] } }
      expect(jsonCall.data).toBe(serviceResult);
      expect(jsonCall.data).not.toHaveProperty('data');
    });

    it('should pass filters and userId to service', async () => {
      mockReq.query = {
        type: 'scorm',
        departmentId: 'dept-1',
        status: 'published',
        search: 'test',
        sort: 'title',
        page: '2',
        limit: '10'
      };

      (MockedContentService.listAllContent as jest.Mock).mockResolvedValue({ items: [], total: 0 });

      await contentController.listContent(mockReq as Request, mockRes as Response, mockNext);

      expect(MockedContentService.listAllContent).toHaveBeenCalledWith(
        {
          type: 'scorm',
          departmentId: 'dept-1',
          status: 'published',
          search: 'test',
          sort: 'title',
          page: 2,
          limit: 10
        },
        'user-123'
      );
    });

    it('should throw 400 for invalid content type', async () => {
      mockReq.query = { type: 'invalid' };

      await contentController.listContent(mockReq as Request, mockRes as Response, mockNext);

      // asyncHandler catches the error and passes to next
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid type')
        })
      );
    });

    it('should throw 400 for invalid status', async () => {
      mockReq.query = { status: 'invalid' };

      await contentController.listContent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid status')
        })
      );
    });

    it('should throw 400 for invalid page value', async () => {
      mockReq.query = { page: '0' };

      await contentController.listContent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Page must be a positive number')
        })
      );
    });

    it('should throw 400 for limit over 100', async () => {
      mockReq.query = { limit: '101' };

      await contentController.listContent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Limit must be between 1 and 100')
        })
      );
    });
  });

  describe('getContent', () => {
    it('should return result directly without double-nesting', async () => {
      const serviceResult = {
        _id: 'content-1',
        title: 'Test Content',
        type: 'scorm',
        status: 'published'
      };

      mockReq.params = { id: 'content-1' };

      (MockedContentService.getContentById as jest.Mock).mockResolvedValue(serviceResult);

      await contentController.getContent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(200);

      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall).toEqual({
        status: 'success',
        success: true,
        data: serviceResult
      });

      // Critical: data must be the service result directly, not double-nested
      expect(jsonCall.data).toBe(serviceResult);
      expect(jsonCall.data).not.toHaveProperty('data');
    });

    it('should pass id and userId to service', async () => {
      mockReq.params = { id: 'content-abc' };

      (MockedContentService.getContentById as jest.Mock).mockResolvedValue({});

      await contentController.getContent(mockReq as Request, mockRes as Response, mockNext);

      expect(MockedContentService.getContentById).toHaveBeenCalledWith('content-abc', 'user-123');
    });
  });

  describe('listScorm', () => {
    it('should return result directly without double-nesting', async () => {
      const serviceResult = {
        items: [
          { _id: 'scorm-1', title: 'SCORM Package 1', version: '1.2' }
        ],
        total: 1,
        page: 1,
        limit: 20
      };

      (MockedContentService.listScormPackages as jest.Mock).mockResolvedValue(serviceResult);

      await contentController.listScorm(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(200);

      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall).toEqual({
        status: 'success',
        success: true,
        data: serviceResult
      });

      // Critical: no double-nesting
      expect(jsonCall.data).toBe(serviceResult);
      expect(jsonCall.data).not.toHaveProperty('data');
    });

    it('should pass filters and userId to service', async () => {
      mockReq.query = {
        departmentId: 'dept-2',
        status: 'draft',
        version: '2004',
        search: 'safety',
        sort: '-createdAt',
        page: '1',
        limit: '25'
      };

      (MockedContentService.listScormPackages as jest.Mock).mockResolvedValue({ items: [], total: 0 });

      await contentController.listScorm(mockReq as Request, mockRes as Response, mockNext);

      expect(MockedContentService.listScormPackages).toHaveBeenCalledWith(
        {
          departmentId: 'dept-2',
          status: 'draft',
          version: '2004',
          search: 'safety',
          sort: '-createdAt',
          page: 1,
          limit: 25
        },
        'user-123'
      );
    });

    it('should throw 400 for invalid SCORM version', async () => {
      mockReq.query = { version: '3.0' };

      await contentController.listScorm(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid version')
        })
      );
    });

    it('should throw 400 for invalid status in SCORM list', async () => {
      mockReq.query = { status: 'deleted' };

      await contentController.listScorm(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid status')
        })
      );
    });

    it('should throw 400 for negative page', async () => {
      mockReq.query = { page: '-1' };

      await contentController.listScorm(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Page must be a positive number')
        })
      );
    });

    it('should throw 400 for limit of 0', async () => {
      mockReq.query = { limit: '0' };

      await contentController.listScorm(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Limit must be between 1 and 100')
        })
      );
    });
  });

  describe('getScorm', () => {
    it('should return result directly without double-nesting', async () => {
      const serviceResult = {
        _id: 'scorm-1',
        title: 'SCORM Package',
        version: '1.2',
        status: 'published'
      };

      mockReq.params = { id: 'scorm-1' };

      (MockedContentService.getScormPackageById as jest.Mock).mockResolvedValue(serviceResult);

      await contentController.getScorm(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(200);

      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall.data).toBe(serviceResult);
      expect(jsonCall.data).not.toHaveProperty('data');
    });
  });

  describe('listMedia', () => {
    it('should return result directly without double-nesting', async () => {
      const serviceResult = {
        items: [
          { _id: 'media-1', title: 'Video 1', type: 'video' }
        ],
        total: 1,
        page: 1,
        limit: 20
      };

      (MockedContentService.listMediaFiles as jest.Mock).mockResolvedValue(serviceResult);

      await contentController.listMedia(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(200);

      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall).toEqual({
        status: 'success',
        success: true,
        data: serviceResult
      });

      expect(jsonCall.data).toBe(serviceResult);
      expect(jsonCall.data).not.toHaveProperty('data');
    });

    it('should throw 400 for invalid media type', async () => {
      mockReq.query = { type: 'spreadsheet' };

      await contentController.listMedia(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid type')
        })
      );
    });
  });

  describe('getMedia', () => {
    it('should return result directly without double-nesting', async () => {
      const serviceResult = {
        _id: 'media-1',
        title: 'Training Video',
        type: 'video',
        url: 'https://example.com/video.mp4'
      };

      mockReq.params = { id: 'media-1' };

      (MockedContentService.getMediaFileById as jest.Mock).mockResolvedValue(serviceResult);

      await contentController.getMedia(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(200);

      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall.data).toBe(serviceResult);
      expect(jsonCall.data).not.toHaveProperty('data');
    });
  });
});
