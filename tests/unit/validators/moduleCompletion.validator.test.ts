import { Request, Response, NextFunction } from 'express';
import {
  validateRecordCompletion,
  validateGetLearnerCompletions,
  validateCheckCompletions,
  validateGetDepartmentModules
} from '@/validators/moduleCompletion.validator';
import { ApiError } from '@/utils/ApiError';

const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_ID_2 = '507f1f77bcf86cd799439012';

describe('Module Completion Validator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { body: {}, params: {}, query: {} };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateRecordCompletion', () => {
    const validBody = () => ({
      moduleId: VALID_ID,
      courseVersionId: VALID_ID,
      enrollmentId: VALID_ID
    });

    it('should pass with valid required fields', () => {
      mockRequest.body = validBody();
      validateRecordCompletion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with optional score', () => {
      mockRequest.body = { ...validBody(), score: 85 };
      validateRecordCompletion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without moduleId', () => {
      mockRequest.body = { courseVersionId: VALID_ID, enrollmentId: VALID_ID };
      validateRecordCompletion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without courseVersionId', () => {
      mockRequest.body = { moduleId: VALID_ID, enrollmentId: VALID_ID };
      validateRecordCompletion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without enrollmentId', () => {
      mockRequest.body = { moduleId: VALID_ID, courseVersionId: VALID_ID };
      validateRecordCompletion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with invalid moduleId', () => {
      mockRequest.body = { ...validBody(), moduleId: 'bad' };
      validateRecordCompletion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with score above 100', () => {
      mockRequest.body = { ...validBody(), score: 101 };
      validateRecordCompletion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with score below 0', () => {
      mockRequest.body = { ...validBody(), score: -1 };
      validateRecordCompletion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should accept null score', () => {
      mockRequest.body = { ...validBody(), score: null };
      validateRecordCompletion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should default isGlobalCompletion to true', () => {
      mockRequest.body = validBody();
      validateRecordCompletion(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockRequest.body.isGlobalCompletion).toBe(true);
    });
  });

  describe('validateGetLearnerCompletions', () => {
    it('should pass with no query params', () => {
      mockRequest.query = {};
      validateGetLearnerCompletions(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with valid moduleId filter', () => {
      mockRequest.query = { moduleId: VALID_ID };
      validateGetLearnerCompletions(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with invalid moduleId', () => {
      mockRequest.query = { moduleId: 'bad' };
      validateGetLearnerCompletions(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should pass with valid pagination', () => {
      mockRequest.query = { page: '1' as any, limit: '20' as any };
      validateGetLearnerCompletions(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with valid isGlobalCompletion filter', () => {
      mockRequest.query = { isGlobalCompletion: 'true' };
      validateGetLearnerCompletions(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with invalid isGlobalCompletion', () => {
      mockRequest.query = { isGlobalCompletion: 'maybe' };
      validateGetLearnerCompletions(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('validateCheckCompletions', () => {
    it('should pass with valid moduleIds', () => {
      mockRequest.query = { moduleIds: `${VALID_ID},${VALID_ID_2}` };
      validateCheckCompletions(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without moduleIds', () => {
      mockRequest.query = {};
      validateCheckCompletions(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with invalid moduleIds', () => {
      mockRequest.query = { moduleIds: 'bad-id,another-bad' };
      validateCheckCompletions(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('validateGetDepartmentModules', () => {
    it('should pass with no query params', () => {
      mockRequest.query = {};
      validateGetDepartmentModules(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with valid filters', () => {
      mockRequest.query = { isShared: 'true', isPublished: 'false' };
      validateGetDepartmentModules(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with invalid isShared', () => {
      mockRequest.query = { isShared: 'maybe' };
      validateGetDepartmentModules(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });
});
