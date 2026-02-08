import { Request, Response, NextFunction } from 'express';
import {
  validateCreateVersion,
  validateUpdateDraft,
  validateLockVersion
} from '@/validators/courseVersion.validator';
import { ApiError } from '@/utils/ApiError';

describe('Course Version Validator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { body: {}, params: {}, query: {} };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateCreateVersion', () => {
    it('should pass with empty body', () => {
      mockRequest.body = {};
      validateCreateVersion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with valid changeNotes', () => {
      mockRequest.body = { changeNotes: 'Initial version' };
      validateCreateVersion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with changeNotes exceeding 2000 chars', () => {
      mockRequest.body = { changeNotes: 'a'.repeat(2001) };
      validateCreateVersion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should strip unknown fields', () => {
      mockRequest.body = { changeNotes: 'test', unknownField: 'value' };
      validateCreateVersion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).not.toHaveProperty('unknownField');
    });
  });

  describe('validateUpdateDraft', () => {
    it('should pass with valid title', () => {
      mockRequest.body = { title: 'New Title' };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with empty title', () => {
      mockRequest.body = { title: '' };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with title exceeding 200 chars', () => {
      mockRequest.body = { title: 'a'.repeat(201) };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should pass with valid credits', () => {
      mockRequest.body = { credits: 3 };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with negative credits', () => {
      mockRequest.body = { credits: -1 };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with credits exceeding 10', () => {
      mockRequest.body = { credits: 11 };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should pass with valid duration', () => {
      mockRequest.body = { duration: 60 };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with negative duration', () => {
      mockRequest.body = { duration: -1 };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should pass with valid settings', () => {
      mockRequest.body = { settings: { passingScore: 80, allowSelfEnrollment: true } };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with invalid passingScore in settings', () => {
      mockRequest.body = { settings: { passingScore: 101 } };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should pass with valid instructorIds', () => {
      mockRequest.body = { instructorIds: ['507f1f77bcf86cd799439011'] };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with invalid instructorIds', () => {
      mockRequest.body = { instructorIds: ['not-an-id'] };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should pass with description null', () => {
      mockRequest.body = { description: null };
      validateUpdateDraft(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateLockVersion', () => {
    it('should pass with empty body', () => {
      mockRequest.body = {};
      validateLockVersion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with valid reason', () => {
      mockRequest.body = { reason: 'No longer needed' };
      validateLockVersion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with reason exceeding 500 chars', () => {
      mockRequest.body = { reason: 'a'.repeat(501) };
      validateLockVersion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });
});
