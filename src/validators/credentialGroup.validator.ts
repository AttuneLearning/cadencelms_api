import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

/**
 * Credential Group Validators
 *
 * Joi validation schemas for credential group endpoints.
 */

// Helper for MongoDB ObjectId validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

// Hex color pattern
const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

/**
 * Schema for creating a credential group
 *
 * POST /api/v2/credential-groups
 */
const createCredentialGroupSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.empty': 'name is required',
      'string.min': 'name must be at least 1 character',
      'string.max': 'name cannot exceed 200 characters',
      'any.required': 'name is required'
    }),
  code: Joi.string()
    .min(2)
    .max(50)
    .required()
    .uppercase()
    .trim()
    .pattern(/^[A-Z0-9-]+$/)
    .messages({
      'string.empty': 'code is required',
      'string.min': 'code must be at least 2 characters',
      'string.max': 'code cannot exceed 50 characters',
      'string.pattern.base': 'code must contain only uppercase letters, numbers, and hyphens',
      'any.required': 'code is required'
    }),
  description: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .trim()
    .messages({
      'string.empty': 'description is required',
      'string.min': 'description must be at least 1 character',
      'string.max': 'description cannot exceed 2000 characters',
      'any.required': 'description is required'
    }),
  type: Joi.string()
    .valid('certificate', 'diploma', 'degree', 'badge')
    .required()
    .messages({
      'any.only': 'type must be one of: certificate, diploma, degree, badge',
      'any.required': 'type is required'
    }),
  badgeImageUrl: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .trim()
    .uri()
    .messages({
      'string.max': 'badgeImageUrl cannot exceed 500 characters',
      'string.uri': 'badgeImageUrl must be a valid URL'
    }),
  badgeColor: Joi.string()
    .optional()
    .allow(null, '')
    .trim()
    .pattern(hexColorPattern)
    .messages({
      'string.pattern.base': 'badgeColor must be a valid hex color (e.g., #FF5733)'
    }),
  departmentId: objectIdSchema
    .required()
    .messages({
      'any.required': 'departmentId is required'
    }),
  programId: objectIdSchema
    .optional()
    .allow(null)
});

/**
 * Schema for updating a credential group
 *
 * PATCH /api/v2/credential-groups/:id
 */
const updateCredentialGroupSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(200)
    .optional()
    .trim()
    .messages({
      'string.empty': 'name cannot be empty',
      'string.min': 'name must be at least 1 character',
      'string.max': 'name cannot exceed 200 characters'
    }),
  code: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .uppercase()
    .trim()
    .pattern(/^[A-Z0-9-]+$/)
    .messages({
      'string.empty': 'code cannot be empty',
      'string.min': 'code must be at least 2 characters',
      'string.max': 'code cannot exceed 50 characters',
      'string.pattern.base': 'code must contain only uppercase letters, numbers, and hyphens'
    }),
  description: Joi.string()
    .min(1)
    .max(2000)
    .optional()
    .trim()
    .messages({
      'string.empty': 'description cannot be empty',
      'string.min': 'description must be at least 1 character',
      'string.max': 'description cannot exceed 2000 characters'
    }),
  type: Joi.string()
    .valid('certificate', 'diploma', 'degree', 'badge')
    .optional()
    .messages({
      'any.only': 'type must be one of: certificate, diploma, degree, badge'
    }),
  badgeImageUrl: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.max': 'badgeImageUrl cannot exceed 500 characters'
    }),
  badgeColor: Joi.string()
    .optional()
    .allow(null, '')
    .trim()
    .pattern(hexColorPattern)
    .messages({
      'string.pattern.base': 'badgeColor must be a valid hex color (e.g., #FF5733)'
    }),
  programId: objectIdSchema
    .optional()
    .allow(null),
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean'
    })
});

/**
 * Validate create credential group request
 */
export const validateCreateCredentialGroup = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = createCredentialGroupSchema.validate(req.body, {
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
 * Validate update credential group request
 */
export const validateUpdateCredentialGroup = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = updateCredentialGroupSchema.validate(req.body, {
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
