import { Request, Response, NextFunction } from 'express';
import {
  validateCreateDefinition,
  validateUpdateDefinition,
  validateDeprecateDefinition,
  validateAddRequirement
} from '@/validators/certificateDefinition.validator';
import { ApiError } from '@/utils/ApiError';

const VALID_ID = '507f1f77bcf86cd799439011';

describe('Certificate Definition Validator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { body: {}, params: {}, query: {} };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateCreateDefinition', () => {
    const validBody = () => ({
      credentialGroupId: VALID_ID,
      title: 'Web Development Certificate',
      description: 'Certificate for completing the web dev program'
    });

    it('should pass with valid data', () => {
      mockRequest.body = validBody();
      validateCreateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without credentialGroupId', () => {
      mockRequest.body = { ...validBody(), credentialGroupId: undefined };
      validateCreateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without title', () => {
      mockRequest.body = { ...validBody(), title: undefined };
      validateCreateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without description', () => {
      mockRequest.body = { ...validBody(), description: undefined };
      validateCreateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should pass with optional fields', () => {
      mockRequest.body = {
        ...validBody(),
        isCompatible: true,
        autoIssue: true,
        expiresAfterMonths: 24
      };
      validateCreateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with expiresAfterMonths below 1', () => {
      mockRequest.body = { ...validBody(), expiresAfterMonths: 0 };
      validateCreateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with expiresAfterMonths above 1200', () => {
      mockRequest.body = { ...validBody(), expiresAfterMonths: 1201 };
      validateCreateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with title exceeding 200 chars', () => {
      mockRequest.body = { ...validBody(), title: 'a'.repeat(201) };
      validateCreateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('validateUpdateDefinition', () => {
    it('should pass with empty body', () => {
      mockRequest.body = {};
      validateUpdateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with partial update', () => {
      mockRequest.body = { title: 'Updated Title' };
      validateUpdateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with empty title', () => {
      mockRequest.body = { title: '' };
      validateUpdateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('validateDeprecateDefinition', () => {
    it('should pass with empty body', () => {
      mockRequest.body = {};
      validateDeprecateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with reason', () => {
      mockRequest.body = { reason: 'Superseded by new version' };
      validateDeprecateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with reason exceeding 500 chars', () => {
      mockRequest.body = { reason: 'a'.repeat(501) };
      validateDeprecateDefinition(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('validateAddRequirement', () => {
    it('should pass with valid courseVersionId', () => {
      mockRequest.body = { courseVersionId: VALID_ID };
      validateAddRequirement(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without courseVersionId', () => {
      mockRequest.body = {};
      validateAddRequirement(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should pass with optional fields', () => {
      mockRequest.body = {
        courseVersionId: VALID_ID,
        isRequired: true,
        minimumScore: 70,
        order: 1
      };
      validateAddRequirement(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with minimumScore above 100', () => {
      mockRequest.body = { courseVersionId: VALID_ID, minimumScore: 101 };
      validateAddRequirement(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with negative order', () => {
      mockRequest.body = { courseVersionId: VALID_ID, order: -1 };
      validateAddRequirement(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });
});
