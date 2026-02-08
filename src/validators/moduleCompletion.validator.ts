import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

/**
 * Module Completion Validators
 *
 * Joi validation schemas for module completion endpoints.
 */

// Helper for MongoDB ObjectId validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

/**
 * Schema for recording a module completion
 *
 * POST /api/v2/module-completions
 */
const recordCompletionSchema = Joi.object({
  learnerId: objectIdSchema
    .optional()
    .messages({
      'string.pattern.base': 'learnerId must be a valid ObjectId'
    }),

  moduleId: objectIdSchema
    .required()
    .messages({
      'any.required': 'moduleId is required',
      'string.pattern.base': 'moduleId must be a valid ObjectId'
    }),

  courseVersionId: objectIdSchema
    .required()
    .messages({
      'any.required': 'courseVersionId is required',
      'string.pattern.base': 'courseVersionId must be a valid ObjectId'
    }),

  enrollmentId: objectIdSchema
    .required()
    .messages({
      'any.required': 'enrollmentId is required',
      'string.pattern.base': 'enrollmentId must be a valid ObjectId'
    }),

  score: Joi.number()
    .min(0)
    .max(100)
    .allow(null)
    .optional()
    .messages({
      'number.base': 'score must be a number',
      'number.min': 'score must be at least 0',
      'number.max': 'score cannot exceed 100'
    }),

  isGlobalCompletion: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'isGlobalCompletion must be a boolean'
    })
});

/**
 * Schema for querying learner completions
 *
 * GET /api/v2/learners/:id/module-completions
 */
const getLearnerCompletionsSchema = Joi.object({
  moduleId: objectIdSchema
    .optional()
    .messages({
      'string.pattern.base': 'moduleId must be a valid ObjectId'
    }),

  isGlobalCompletion: Joi.string()
    .valid('true', 'false')
    .optional()
    .messages({
      'any.only': 'isGlobalCompletion must be "true" or "false"'
    }),

  completedAfter: Joi.string()
    .isoDate()
    .optional()
    .messages({
      'string.isoDate': 'completedAfter must be a valid ISO date'
    }),

  completedBefore: Joi.string()
    .isoDate()
    .optional()
    .messages({
      'string.isoDate': 'completedBefore must be a valid ISO date'
    }),

  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'page must be a number',
      'number.integer': 'page must be an integer',
      'number.min': 'page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.base': 'limit must be a number',
      'number.integer': 'limit must be an integer',
      'number.min': 'limit must be at least 1',
      'number.max': 'limit cannot exceed 100'
    })
});

/**
 * Schema for checking bulk completions
 *
 * GET /api/v2/module-completions/check
 */
const checkCompletionsSchema = Joi.object({
  moduleIds: Joi.string()
    .required()
    .custom((value, helpers) => {
      const ids = value.split(',').map((id: string) => id.trim());
      if (ids.length === 0) {
        return helpers.error('any.invalid');
      }
      if (ids.length > 50) {
        return helpers.error('array.max');
      }
      for (const id of ids) {
        if (!objectIdPattern.test(id)) {
          return helpers.error('string.pattern.base');
        }
      }
      return value;
    })
    .messages({
      'any.required': 'moduleIds is required',
      'any.invalid': 'At least one moduleId is required',
      'array.max': 'Cannot check more than 50 modules at once',
      'string.pattern.base': 'All moduleIds must be valid ObjectIds'
    })
});

/**
 * Schema for department modules query
 *
 * GET /api/v2/departments/:id/modules
 */
const getDepartmentModulesSchema = Joi.object({
  isShared: Joi.string()
    .valid('true', 'false')
    .optional()
    .messages({
      'any.only': 'isShared must be "true" or "false"'
    }),

  isPublished: Joi.string()
    .valid('true', 'false')
    .optional()
    .messages({
      'any.only': 'isPublished must be "true" or "false"'
    }),

  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'page must be a number',
      'number.integer': 'page must be an integer',
      'number.min': 'page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.base': 'limit must be a number',
      'number.integer': 'limit must be an integer',
      'number.min': 'limit must be at least 1',
      'number.max': 'limit cannot exceed 100'
    })
});

/**
 * Validate record completion request
 */
export const validateRecordCompletion = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = recordCompletionSchema.validate(req.body, {
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
 * Validate get learner completions request
 */
export const validateGetLearnerCompletions = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = getLearnerCompletionsSchema.validate(req.query, {
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

/**
 * Validate check completions request
 */
export const validateCheckCompletions = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = checkCompletionsSchema.validate(req.query, {
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

/**
 * Validate get department modules request
 */
export const validateGetDepartmentModules = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = getDepartmentModulesSchema.validate(req.query, {
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
