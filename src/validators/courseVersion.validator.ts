import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

/**
 * Course Version Validators
 *
 * Joi validation schemas for course versioning endpoints.
 */

// Helper for MongoDB ObjectId validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

/**
 * Course settings schema for validation
 */
const courseSettingsSchema = Joi.object({
  allowSelfEnrollment: Joi.boolean().optional().messages({
    'boolean.base': 'allowSelfEnrollment must be a boolean'
  }),
  passingScore: Joi.number().min(0).max(100).optional().messages({
    'number.base': 'passingScore must be a number',
    'number.min': 'passingScore must be at least 0',
    'number.max': 'passingScore cannot exceed 100'
  }),
  maxAttempts: Joi.number().min(1).allow(null).optional().messages({
    'number.base': 'maxAttempts must be a number or null',
    'number.min': 'maxAttempts must be at least 1'
  }),
  certificateEnabled: Joi.boolean().optional().messages({
    'boolean.base': 'certificateEnabled must be a boolean'
  }),
  enforcePrerequisites: Joi.boolean().optional().messages({
    'boolean.base': 'enforcePrerequisites must be a boolean'
  }),
  showProgressBar: Joi.boolean().optional().messages({
    'boolean.base': 'showProgressBar must be a boolean'
  }),
  allowModuleSkipping: Joi.boolean().optional().messages({
    'boolean.base': 'allowModuleSkipping must be a boolean'
  })
});

/**
 * Schema for creating a new version
 *
 * POST /api/v2/courses/:id/versions
 */
const createVersionSchema = Joi.object({
  changeNotes: Joi.string()
    .max(2000)
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.max': 'changeNotes cannot exceed 2000 characters'
    })
});

/**
 * Schema for updating a draft version
 *
 * PATCH /api/v2/course-versions/:id
 */
const updateDraftSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .optional()
    .trim()
    .messages({
      'string.empty': 'title cannot be empty',
      'string.min': 'title must be at least 1 character',
      'string.max': 'title cannot exceed 200 characters'
    }),
  description: Joi.string()
    .max(2000)
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.max': 'description cannot exceed 2000 characters'
    }),
  credits: Joi.number()
    .min(0)
    .max(10)
    .optional()
    .messages({
      'number.base': 'credits must be a number',
      'number.min': 'credits cannot be negative',
      'number.max': 'credits cannot exceed 10'
    }),
  duration: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'duration must be a number',
      'number.min': 'duration cannot be negative'
    }),
  settings: courseSettingsSchema.optional(),
  instructorIds: Joi.array()
    .items(objectIdSchema)
    .optional()
    .messages({
      'array.base': 'instructorIds must be an array of ObjectIds'
    }),
  changeNotes: Joi.string()
    .max(2000)
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.max': 'changeNotes cannot exceed 2000 characters'
    })
});

/**
 * Schema for locking a version
 *
 * POST /api/v2/course-versions/:id/lock
 */
const lockVersionSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.max': 'reason cannot exceed 500 characters'
    })
});

/**
 * Validate create version request
 *
 * Validates:
 * - changeNotes (optional, max 2000 chars)
 */
export const validateCreateVersion = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = createVersionSchema.validate(req.body, {
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
 * Validate update draft request
 *
 * All fields are optional for partial updates.
 *
 * Validates:
 * - title (optional, 1-200 chars)
 * - description (optional, max 2000 chars)
 * - credits (optional, 0-10)
 * - duration (optional, non-negative)
 * - settings (optional, partial CourseSettings)
 * - instructorIds (optional, array of ObjectIds)
 * - changeNotes (optional, max 2000 chars)
 */
export const validateUpdateDraft = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = updateDraftSchema.validate(req.body, {
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
 * Validate lock version request
 *
 * Validates:
 * - reason (optional, max 500 chars)
 */
export const validateLockVersion = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = lockVersionSchema.validate(req.body, {
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
