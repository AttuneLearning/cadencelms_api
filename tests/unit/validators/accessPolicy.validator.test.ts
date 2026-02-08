import { Request, Response, NextFunction } from 'express';
import {
  validateDepartmentAccessPolicy,
  validateProgramAccessOverride,
  validateExtensionRequestCreate,
  validateExtensionRequestReview,
  validateDirectExtend,
  validateExtensionRequestFilters
} from '@/validators/accessPolicy.validator';
import { ApiError } from '@/utils/ApiError';

const VALID_ID = '507f1f77bcf86cd799439011';

describe('Access Policy Validator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { body: {}, params: {}, query: {} };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateDepartmentAccessPolicy', () => {
    it('should pass with empty body', () => {
      mockRequest.body = {};
      validateDepartmentAccessPolicy(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with valid defaultAccessDuration', () => {
      mockRequest.body = {
        defaultAccessDuration: { type: 'months', value: 12 }
      };
      validateDepartmentAccessPolicy(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with perpetual duration (no value needed)', () => {
      mockRequest.body = {
        defaultAccessDuration: { type: 'perpetual' }
      };
      validateDepartmentAccessPolicy(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with invalid duration type', () => {
      mockRequest.body = {
        defaultAccessDuration: { type: 'invalid', value: 1 }
      };
      validateDepartmentAccessPolicy(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should pass with boolean fields', () => {
      mockRequest.body = {
        allowNewVersionAccess: true,
        allowCertificateUpgrade: false,
        allowCourseRetakes: true
      };
      validateDepartmentAccessPolicy(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with notification settings', () => {
      mockRequest.body = {
        notifications: {
          notifyBeforeExpiration: true,
          daysBeforeExpirationNotification: 30
        }
      };
      validateDepartmentAccessPolicy(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateProgramAccessOverride', () => {
    it('should pass with empty body', () => {
      mockRequest.body = {};
      validateProgramAccessOverride(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with null to clear overrides', () => {
      mockRequest.body = { accessDuration: null, allowNewVersionAccess: null };
      validateProgramAccessOverride(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with valid override', () => {
      mockRequest.body = {
        accessDuration: { type: 'years', value: 2 },
        allowCourseRetakes: true,
        maxRetakesPerCourse: 3
      };
      validateProgramAccessOverride(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateExtensionRequestCreate', () => {
    it('should pass with valid days extension', () => {
      mockRequest.body = {
        requestedExtension: { type: 'days', value: 30 },
        requestReason: 'Need more time'
      };
      validateExtensionRequestCreate(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with perpetual extension', () => {
      mockRequest.body = {
        requestedExtension: { type: 'perpetual' }
      };
      validateExtensionRequestCreate(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without requestedExtension', () => {
      mockRequest.body = {};
      validateExtensionRequestCreate(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with invalid extension type', () => {
      mockRequest.body = {
        requestedExtension: { type: 'invalid', value: 1 }
      };
      validateExtensionRequestCreate(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('validateExtensionRequestReview', () => {
    it('should pass with approved status', () => {
      mockRequest.body = { status: 'approved' };
      validateExtensionRequestReview(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with denied status', () => {
      mockRequest.body = { status: 'denied', reviewNotes: 'Not eligible' };
      validateExtensionRequestReview(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without status', () => {
      mockRequest.body = {};
      validateExtensionRequestReview(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with invalid status', () => {
      mockRequest.body = { status: 'pending' };
      validateExtensionRequestReview(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('validateDirectExtend', () => {
    it('should pass with valid extension and reason', () => {
      mockRequest.body = {
        extension: { type: 'months', value: 3 },
        reason: 'Administrative override'
      };
      validateDirectExtend(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without extension', () => {
      mockRequest.body = { reason: 'Test' };
      validateDirectExtend(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without reason', () => {
      mockRequest.body = { extension: { type: 'days', value: 30 } };
      validateDirectExtend(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with reason exceeding 500 chars', () => {
      mockRequest.body = {
        extension: { type: 'days', value: 30 },
        reason: 'a'.repeat(501)
      };
      validateDirectExtend(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('validateExtensionRequestFilters', () => {
    it('should pass with no filters', () => {
      mockRequest.query = {};
      validateExtensionRequestFilters(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with valid filters', () => {
      mockRequest.query = {
        departmentId: VALID_ID,
        status: 'pending',
        page: '1' as any,
        limit: '20' as any
      };
      validateExtensionRequestFilters(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with invalid status', () => {
      mockRequest.query = { status: 'invalid' };
      validateExtensionRequestFilters(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with invalid departmentId', () => {
      mockRequest.query = { departmentId: 'bad' };
      validateExtensionRequestFilters(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });
});
