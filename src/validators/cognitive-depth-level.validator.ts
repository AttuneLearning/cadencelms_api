import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

/**
 * Cognitive Depth Level Validator
 *
 * Provides Joi validation schemas for cognitive depth level management endpoints.
 * Validates department-scoped level creation, update, and query operations.
 *
 * Related contract: contracts/api/cognitive-depth-levels.contract.ts
 */

// ============================================
// CONSTANTS
// ============================================

/**
 * Slug pattern: lowercase alphanumeric with hyphens only
 */
const SLUG_PATTERN = /^[a-z0-9-]+$/;

// ============================================
// MAIN SCHEMAS
// ============================================

/**
 * Schema for creating a cognitive depth level
 *
 * Validates:
 * - slug: required, lowercase alphanumeric with hyphens, max 50 chars
 * - name: required, max 100 chars
 * - description: optional, max 500 chars
 * - order: required, positive number (min 0.1 for fractional ordering)
 * - advanceThreshold: required, 0.0-1.0 (percentage as decimal)
 * - minAttempts: required, 1-100
 */
const createCognitiveDepthLevelSchema = Joi.object({
  slug: Joi.string()
    .lowercase()
    .trim()
    .pattern(SLUG_PATTERN)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Slug is required',
      'string.pattern.base': 'Slug must be lowercase alphanumeric with hyphens only',
      'string.max': 'Slug cannot exceed 50 characters',
      'any.required': 'Slug is required'
    }),

  name: Joi.string()
    .trim()
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),

  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),

  order: Joi.number()
    .min(0.1)
    .required()
    .messages({
      'number.base': 'Order must be a number',
      'number.min': 'Order must be at least 0.1',
      'any.required': 'Order is required'
    }),

  advanceThreshold: Joi.number()
    .min(0)
    .max(1)
    .required()
    .messages({
      'number.base': 'Advance threshold must be a number',
      'number.min': 'Advance threshold must be at least 0',
      'number.max': 'Advance threshold cannot exceed 1',
      'any.required': 'Advance threshold is required'
    }),

  minAttempts: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
    .messages({
      'number.base': 'Minimum attempts must be a number',
      'number.integer': 'Minimum attempts must be an integer',
      'number.min': 'Minimum attempts must be at least 1',
      'number.max': 'Minimum attempts cannot exceed 100',
      'any.required': 'Minimum attempts is required'
    })
});

/**
 * Schema for updating a cognitive depth level
 *
 * All fields are optional for partial updates.
 * At least one field must be provided.
 * Note: slug cannot be updated (used as identifier)
 */
const updateCognitiveDepthLevelSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.max': 'Name cannot exceed 100 characters'
    }),

  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),

  order: Joi.number()
    .min(0.1)
    .optional()
    .messages({
      'number.base': 'Order must be a number',
      'number.min': 'Order must be at least 0.1'
    }),

  advanceThreshold: Joi.number()
    .min(0)
    .max(1)
    .optional()
    .messages({
      'number.base': 'Advance threshold must be a number',
      'number.min': 'Advance threshold must be at least 0',
      'number.max': 'Advance threshold cannot exceed 1'
    }),

  minAttempts: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.base': 'Minimum attempts must be a number',
      'number.integer': 'Minimum attempts must be an integer',
      'number.min': 'Minimum attempts must be at least 1',
      'number.max': 'Minimum attempts cannot exceed 100'
    }),

  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Schema for slug path parameter validation
 */
const slugParamSchema = Joi.object({
  slug: Joi.string()
    .lowercase()
    .trim()
    .pattern(SLUG_PATTERN)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Slug is required',
      'string.pattern.base': 'Slug must be lowercase alphanumeric with hyphens only',
      'string.max': 'Slug cannot exceed 50 characters',
      'any.required': 'Slug is required'
    })
});

// ============================================
// MIDDLEWARE VALIDATORS
// ============================================

/**
 * Validate create cognitive depth level request
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 */
export const validateCreateCognitiveDepthLevel = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = createCognitiveDepthLevelSchema.validate(req.body, {
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
 * Validate update cognitive depth level request
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 */
export const validateUpdateCognitiveDepthLevel = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = updateCognitiveDepthLevelSchema.validate(req.body, {
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
 * Validate slug path parameter
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 */
export const validateSlugParam = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = slugParamSchema.validate({ slug: req.params.slug }, {
    abortEarly: false
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.params.slug = value.slug;
  next();
};

// ============================================
// EXPORTED SCHEMAS (for testing)
// ============================================

export {
  createCognitiveDepthLevelSchema,
  updateCognitiveDepthLevelSchema,
  slugParamSchema,
  SLUG_PATTERN
};
