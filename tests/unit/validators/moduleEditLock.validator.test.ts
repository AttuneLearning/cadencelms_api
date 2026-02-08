import { Request, Response, NextFunction } from 'express';
import { validateModuleIdParam } from '@/validators/moduleEditLock.validator';
import { ApiError } from '@/utils/ApiError';

describe('ModuleEditLock Validator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { body: {}, params: {}, query: {} };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateModuleIdParam', () => {
    it('should pass with valid ObjectId param', () => {
      mockRequest.params = { id: '507f1f77bcf86cd799439011' };
      validateModuleIdParam(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with invalid ObjectId', () => {
      mockRequest.params = { id: 'not-an-object-id' };
      validateModuleIdParam(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without id param', () => {
      mockRequest.params = {};
      validateModuleIdParam(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with empty string id', () => {
      mockRequest.params = { id: '' };
      validateModuleIdParam(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });
});
