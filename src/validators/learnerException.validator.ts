import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

const createExceptionSchema = Joi.object({
  type: Joi.string()
    .valid('extra_attempts', 'extended_access', 'module_unlock', 'grade_override', 'excuse_content')
    .required()
    .messages({
      'any.only': 'type must be one of: extra_attempts, extended_access, module_unlock, grade_override, excuse_content',
      'any.required': 'type is required'
    }),
  reason: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .trim()
    .messages({
      'string.empty': 'reason is required',
      'string.min': 'reason is required',
      'string.max': 'reason cannot exceed 2000 characters',
      'any.required': 'reason is required'
    }),
  expiresAt: Joi.date().iso().optional().allow(null).messages({
    'date.format': 'expiresAt must be a valid ISO date'
  }),
  metadata: Joi.object()
    .when('type', {
      is: 'extra_attempts',
      then: Joi.object({
        assessmentId: objectIdSchema.required().messages({
          'any.required': 'metadata.assessmentId is required for extra_attempts'
        }),
        additionalAttempts: Joi.number().integer().min(1).max(100).required().messages({
          'number.min': 'additionalAttempts must be at least 1',
          'number.max': 'additionalAttempts cannot exceed 100',
          'any.required': 'metadata.additionalAttempts is required for extra_attempts'
        })
      }).required()
    })
    .when('type', {
      is: 'extended_access',
      then: Joi.object({
        newExpiryDate: Joi.date().iso().greater('now').required().messages({
          'date.greater': 'newExpiryDate must be in the future',
          'any.required': 'metadata.newExpiryDate is required for extended_access'
        })
      }).required()
    })
    .when('type', {
      is: 'module_unlock',
      then: Joi.object({
        moduleId: objectIdSchema.required().messages({
          'any.required': 'metadata.moduleId is required for module_unlock'
        })
      }).required()
    })
    .when('type', {
      is: 'grade_override',
      then: Joi.object({
        assessmentId: objectIdSchema.required().messages({
          'any.required': 'metadata.assessmentId is required for grade_override'
        }),
        attemptId: objectIdSchema.required().messages({
          'any.required': 'metadata.attemptId is required for grade_override'
        }),
        newGrade: Joi.number().min(0).max(100).required().messages({
          'number.min': 'newGrade must be at least 0',
          'number.max': 'newGrade cannot exceed 100',
          'any.required': 'metadata.newGrade is required for grade_override'
        })
      }).required()
    })
    .when('type', {
      is: 'excuse_content',
      then: Joi.object({
        contentId: objectIdSchema.required().messages({
          'any.required': 'metadata.contentId is required for excuse_content'
        }),
        contentType: Joi.string().valid('lesson', 'exercise', 'module').required().messages({
          'any.only': 'contentType must be one of: lesson, exercise, module',
          'any.required': 'metadata.contentType is required for excuse_content'
        })
      }).required()
    })
    .required()
    .messages({
      'any.required': 'metadata is required'
    })
});

const revokeExceptionSchema = Joi.object({
  reason: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .trim()
    .messages({
      'string.empty': 'reason is required',
      'string.min': 'reason is required',
      'string.max': 'reason cannot exceed 2000 characters',
      'any.required': 'reason is required'
    })
});

const listExceptionsFiltersSchema = Joi.object({
  type: Joi.string()
    .valid('extra_attempts', 'extended_access', 'module_unlock', 'grade_override', 'excuse_content')
    .optional()
    .messages({
      'any.only': 'type must be one of: extra_attempts, extended_access, module_unlock, grade_override, excuse_content'
    }),
  isActive: Joi.string()
    .valid('true', 'false')
    .optional(),
  page: Joi.number().min(1).optional().messages({
    'number.min': 'page must be at least 1'
  }),
  limit: Joi.number().min(1).max(100).optional().messages({
    'number.min': 'limit must be at least 1',
    'number.max': 'limit cannot exceed 100'
  })
});

/**
 * Validate create exception request body
 */
export const validateCreateException = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = createExceptionSchema.validate(req.body, {
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
 * Validate revoke exception request body
 */
export const validateRevokeException = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = revokeExceptionSchema.validate(req.body, {
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
 * Validate list exceptions query params
 */
export const validateListExceptionsFilters = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = listExceptionsFiltersSchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.query = value;
  next();
};
