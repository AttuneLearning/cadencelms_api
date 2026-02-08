import { Request, Response, NextFunction } from 'express';
import {
  validateManualIssuance,
  validateRevokeIssuance,
  validateVerificationCode
} from '@/validators/certificateIssuance.validator';
import { ApiError } from '@/utils/ApiError';

const VALID_ID = '507f1f77bcf86cd799439011';

describe('Certificate Issuance Validator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { body: {}, params: {}, query: {} };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateManualIssuance', () => {
    const validBody = () => ({
      certificateDefinitionId: VALID_ID,
      learnerId: VALID_ID,
      completedRequirements: [{
        courseVersionId: VALID_ID,
        courseTitle: 'Web Dev 101',
        completedAt: '2026-01-15T00:00:00.000Z',
        finalScore: 90,
        enrollmentId: VALID_ID
      }]
    });

    it('should pass with valid data', () => {
      mockRequest.body = validBody();
      validateManualIssuance(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without certificateDefinitionId', () => {
      mockRequest.body = { ...validBody(), certificateDefinitionId: undefined };
      validateManualIssuance(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without learnerId', () => {
      mockRequest.body = { ...validBody(), learnerId: undefined };
      validateManualIssuance(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail without completedRequirements', () => {
      mockRequest.body = { ...validBody(), completedRequirements: undefined };
      validateManualIssuance(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with empty completedRequirements', () => {
      mockRequest.body = { ...validBody(), completedRequirements: [] };
      validateManualIssuance(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with invalid certificateDefinitionId', () => {
      mockRequest.body = { ...validBody(), certificateDefinitionId: 'bad' };
      validateManualIssuance(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should accept optional expiresAt', () => {
      mockRequest.body = { ...validBody(), expiresAt: '2027-01-15T00:00:00.000Z' };
      validateManualIssuance(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateRevokeIssuance', () => {
    it('should pass with valid reason', () => {
      mockRequest.body = { reason: 'Academic dishonesty' };
      validateRevokeIssuance(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without reason', () => {
      mockRequest.body = {};
      validateRevokeIssuance(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with empty reason', () => {
      mockRequest.body = { reason: '' };
      validateRevokeIssuance(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with reason exceeding 500 chars', () => {
      mockRequest.body = { reason: 'a'.repeat(501) };
      validateRevokeIssuance(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('validateVerificationCode', () => {
    it('should pass with valid 12-char code', () => {
      mockRequest.params = { code: 'ABCDEF123456' };
      validateVerificationCode(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail without code', () => {
      mockRequest.params = {};
      validateVerificationCode(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should fail with code not 12 chars', () => {
      mockRequest.params = { code: 'SHORT' };
      validateVerificationCode(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should handle lowercase code (normalizes to uppercase)', () => {
      mockRequest.params = { code: 'abcdef123456' };
      validateVerificationCode(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
