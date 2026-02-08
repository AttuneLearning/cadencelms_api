import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

/**
 * Certificate Issuance Validators
 *
 * Joi validation schemas for certificate issuance endpoints.
 */

// Helper for MongoDB ObjectId validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

// Verification code pattern - matches the generation alphabet (used in validateVerificationCode)

/**
 * Schema for manually issuing a certificate
 *
 * POST /api/v2/certificate-issuances
 */
const manualIssuanceSchema = Joi.object({
  certificateDefinitionId: objectIdSchema
    .required()
    .messages({
      'any.required': 'certificateDefinitionId is required'
    }),
  learnerId: objectIdSchema
    .required()
    .messages({
      'any.required': 'learnerId is required'
    }),
  completedRequirements: Joi.array()
    .items(
      Joi.object({
        courseVersionId: objectIdSchema.required(),
        courseTitle: Joi.string()
          .min(1)
          .max(200)
          .required()
          .trim()
          .messages({
            'string.empty': 'courseTitle is required',
            'string.max': 'courseTitle cannot exceed 200 characters'
          }),
        completedAt: Joi.date()
          .iso()
          .required()
          .messages({
            'date.format': 'completedAt must be a valid ISO date',
            'any.required': 'completedAt is required'
          }),
        finalScore: Joi.number()
          .min(0)
          .max(100)
          .allow(null)
          .messages({
            'number.min': 'finalScore must be at least 0',
            'number.max': 'finalScore cannot exceed 100'
          }),
        enrollmentId: objectIdSchema.required()
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one completed requirement is required',
      'any.required': 'completedRequirements is required'
    }),
  expiresAt: Joi.date()
    .iso()
    .optional()
    .allow(null)
    .messages({
      'date.format': 'expiresAt must be a valid ISO date'
    }),
  metadata: Joi.object()
    .optional()
    .default({})
});

/**
 * Schema for revoking a certificate
 *
 * POST /api/v2/certificate-issuances/:id/revoke
 */
const revokeIssuanceSchema = Joi.object({
  reason: Joi.string()
    .min(1)
    .max(500)
    .required()
    .trim()
    .messages({
      'string.empty': 'reason is required',
      'string.max': 'reason cannot exceed 500 characters',
      'any.required': 'reason is required'
    })
});

// Note: Verification code validation is done inline in validateVerificationCode
// as it's a URL parameter, not a request body

/**
 * Validate manual issuance request
 */
export const validateManualIssuance = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = manualIssuanceSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};

/**
 * Validate revoke issuance request
 */
export const validateRevokeIssuance = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = revokeIssuanceSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};

/**
 * Validate verification code param (lightweight, no body modification needed)
 */
export const validateVerificationCode = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const code = req.params.code;

  if (!code) {
    return next(new ApiError(400, 'Verification code is required'));
  }

  // Basic validation - more permissive to allow for case-insensitive lookup
  const normalizedCode = code.toUpperCase().trim();
  if (normalizedCode.length !== 12) {
    return next(new ApiError(400, 'Verification code must be 12 characters'));
  }

  // The service will handle the full validation and return appropriate status
  next();
};
