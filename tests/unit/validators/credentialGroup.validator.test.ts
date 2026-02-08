import { Request, Response, NextFunction } from 'express';
import {
  validateCreateCredentialGroup,
  validateUpdateCredentialGroup
} from '@/validators/credentialGroup.validator';
import { ApiError } from '@/utils/ApiError';

const VALID_ID = '507f1f77bcf86cd799439011';

describe('Credential Group Validator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { body: {}, params: {}, query: {} };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateCreateCredentialGroup', () => {
    const validBody = () => ({
      name: 'Web Development Certificate',
      code: 'WEB-DEV',
      description: 'Certificate for completing web development program',
      type: 'certificate',
      departmentId: VALID_ID
    });

    it('should pass with valid data', () => {
      mockRequest.body = validBody();
      validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without name', () => {
      mockRequest.body = { ...validBody(), name: undefined };
      validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without code', () => {
      mockRequest.body = { ...validBody(), code: undefined };
      validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without description', () => {
      mockRequest.body = { ...validBody(), description: undefined };
      validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without type', () => {
      mockRequest.body = { ...validBody(), type: undefined };
      validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without departmentId', () => {
      mockRequest.body = { ...validBody(), departmentId: undefined };
      validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with invalid type', () => {
      mockRequest.body = { ...validBody(), type: 'invalid' };
      validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should accept valid badge types', () => {
      for (const type of ['certificate', 'diploma', 'degree', 'badge']) {
        mockRequest.body = { ...validBody(), type };
        mockNext = jest.fn();
        validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
      }
    });

    it('should accept valid badgeColor', () => {
      mockRequest.body = { ...validBody(), badgeColor: '#FF5733' };
      validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with invalid badgeColor', () => {
      mockRequest.body = { ...validBody(), badgeColor: 'red' };
      validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should uppercase the code', () => {
      mockRequest.body = { ...validBody(), code: 'web-dev' };
      validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body.code).toBe('WEB-DEV');
    });

    it('should fail with name exceeding 200 chars', () => {
      mockRequest.body = { ...validBody(), name: 'a'.repeat(201) };
      validateCreateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('validateUpdateCredentialGroup', () => {
    it('should pass with empty body', () => {
      mockRequest.body = {};
      validateUpdateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with partial update', () => {
      mockRequest.body = { name: 'Updated Name' };
      validateUpdateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with isActive', () => {
      mockRequest.body = { isActive: false };
      validateUpdateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail with invalid type', () => {
      mockRequest.body = { type: 'invalid' };
      validateUpdateCredentialGroup(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });
});
