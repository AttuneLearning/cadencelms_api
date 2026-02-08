import { Request, Response, NextFunction } from 'express';
import {
  validateAddModule,
  validateReorderModules,
  validateUpdateModuleSettings
} from '@/validators/courseVersionModule.validator';
import { ApiError } from '@/utils/ApiError';

const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_ID_2 = '507f1f77bcf86cd799439012';

describe('Course Version Module Validator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { body: {}, params: {}, query: {} };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateAddModule', () => {
    it('should pass with valid moduleId', () => {
      mockRequest.body = { moduleId: VALID_ID };
      validateAddModule(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with all optional fields', () => {
      mockRequest.body = {
        moduleId: VALID_ID,
        order: 2,
        isRequired: false,
        availableFrom: '2026-01-01T00:00:00.000Z',
        availableUntil: '2026-06-30T00:00:00.000Z'
      };
      validateAddModule(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without moduleId', () => {
      mockRequest.body = {};
      validateAddModule(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with invalid moduleId', () => {
      mockRequest.body = { moduleId: 'not-valid' };
      validateAddModule(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with negative order', () => {
      mockRequest.body = { moduleId: VALID_ID, order: -1 };
      validateAddModule(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should accept null availableFrom', () => {
      mockRequest.body = { moduleId: VALID_ID, availableFrom: null };
      validateAddModule(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateReorderModules', () => {
    it('should pass with valid moduleOrder array', () => {
      mockRequest.body = { moduleOrder: [VALID_ID, VALID_ID_2] };
      validateReorderModules(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without moduleOrder', () => {
      mockRequest.body = {};
      validateReorderModules(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with empty moduleOrder', () => {
      mockRequest.body = { moduleOrder: [] };
      validateReorderModules(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with invalid IDs in moduleOrder', () => {
      mockRequest.body = { moduleOrder: ['bad-id'] };
      validateReorderModules(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('validateUpdateModuleSettings', () => {
    it('should pass with empty body', () => {
      mockRequest.body = {};
      validateUpdateModuleSettings(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with isRequired', () => {
      mockRequest.body = { isRequired: false };
      validateUpdateModuleSettings(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with null availableFrom', () => {
      mockRequest.body = { availableFrom: null };
      validateUpdateModuleSettings(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should strip unknown fields', () => {
      mockRequest.body = { isRequired: true, unknownField: 'value' };
      validateUpdateModuleSettings(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).not.toHaveProperty('unknownField');
    });
  });
});
