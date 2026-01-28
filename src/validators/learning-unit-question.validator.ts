import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { ApiError } from '@/utils/ApiError';

/**
 * Learning Unit Question Validator
 *
 * Validation schemas and middleware for learning unit question linking
 * and learner progress tracking endpoints.
 *
 * Related contract: contracts/api/learning-unit-questions.contract.ts
 */

/**
 * Custom Joi validator for MongoDB ObjectId
 *
 * Validates that a string is a valid MongoDB ObjectId format
 *
 * @param value - The value to validate
 * @param helpers - Joi helpers object
 * @returns The validated value or throws validation error
 */
const objectIdValidator = (value: string, helpers: Joi.CustomHelpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('string.objectId');
  }
  return value;
};

// ============================================
// QUESTION LINKING SCHEMAS
// ============================================

/**
 * Schema for linking a single question to a learning unit
 *
 * Validates:
 * - questionId: required, valid ObjectId
 * - sequence: optional, non-negative integer
 * - pointsOverride: optional, non-negative integer or null
 */
export const linkQuestionSchema = Joi.object({
  questionId: Joi.string().required().custom(objectIdValidator, 'ObjectId validation').messages({
    'string.empty': 'Question ID is required',
    'string.objectId': 'Question ID must be a valid MongoDB ObjectId',
    'any.required': 'Question ID is required',
  }),

  sequence: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Sequence must be a number',
    'number.integer': 'Sequence must be an integer',
    'number.min': 'Sequence must be at least 0',
  }),

  pointsOverride: Joi.number().integer().min(0).optional().allow(null).messages({
    'number.base': 'Points override must be a number or null',
    'number.integer': 'Points override must be an integer',
    'number.min': 'Points override must be at least 0',
  }),
});

/**
 * Schema for bulk linking questions to a learning unit
 *
 * Validates:
 * - questions: required, array of question objects (min 1)
 * - replaceExisting: optional, boolean (default false)
 */
export const bulkLinkQuestionsSchema = Joi.object({
  questions: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string()
          .required()
          .custom(objectIdValidator, 'ObjectId validation')
          .messages({
            'string.empty': 'Question ID is required',
            'string.objectId': 'Question ID must be a valid MongoDB ObjectId',
            'any.required': 'Question ID is required',
          }),

        sequence: Joi.number().integer().min(0).optional().messages({
          'number.base': 'Sequence must be a number',
          'number.integer': 'Sequence must be an integer',
          'number.min': 'Sequence must be at least 0',
        }),

        pointsOverride: Joi.number().integer().min(0).optional().allow(null).messages({
          'number.base': 'Points override must be a number or null',
          'number.integer': 'Points override must be an integer',
          'number.min': 'Points override must be at least 0',
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.base': 'Questions must be an array',
      'array.min': 'At least one question is required',
      'any.required': 'Questions array is required',
    }),

  replaceExisting: Joi.boolean().optional().default(false).messages({
    'boolean.base': 'replaceExisting must be a boolean',
  }),
});

/**
 * Schema for updating an existing question link
 *
 * Validates:
 * - sequence: optional, non-negative integer
 * - pointsOverride: optional, non-negative integer or null
 * - At least one field must be provided
 */
export const updateLinkSchema = Joi.object({
  sequence: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Sequence must be a number',
    'number.integer': 'Sequence must be an integer',
    'number.min': 'Sequence must be at least 0',
  }),

  pointsOverride: Joi.number().integer().min(0).optional().allow(null).messages({
    'number.base': 'Points override must be a number or null',
    'number.integer': 'Points override must be an integer',
    'number.min': 'Points override must be at least 0',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

/**
 * Schema for learning unit question route parameters
 *
 * Validates:
 * - learningUnitId: required, valid ObjectId
 * - linkId: optional, valid ObjectId (used for update/delete)
 */
export const learningUnitQuestionParamsSchema = Joi.object({
  learningUnitId: Joi.string()
    .required()
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.empty': 'Learning unit ID is required',
      'string.objectId': 'Learning unit ID must be a valid MongoDB ObjectId',
      'any.required': 'Learning unit ID is required',
    }),

  linkId: Joi.string().optional().custom(objectIdValidator, 'ObjectId validation').messages({
    'string.objectId': 'Link ID must be a valid MongoDB ObjectId',
  }),
});

// ============================================
// PROGRESS TRACKING SCHEMAS
// ============================================

/**
 * Schema for updating learner question progress
 *
 * Validates:
 * - isCorrect: required, boolean
 * - attemptId: optional, valid ObjectId
 * - timeSpent: optional, non-negative integer (seconds)
 */
export const updateProgressSchema = Joi.object({
  isCorrect: Joi.boolean().required().messages({
    'boolean.base': 'isCorrect must be a boolean',
    'any.required': 'isCorrect is required',
  }),

  attemptId: Joi.string().optional().custom(objectIdValidator, 'ObjectId validation').messages({
    'string.objectId': 'Attempt ID must be a valid MongoDB ObjectId',
  }),

  timeSpent: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Time spent must be a number',
    'number.integer': 'Time spent must be an integer',
    'number.min': 'Time spent must be at least 0',
  }),
});

/**
 * Schema for progress route parameters
 *
 * Validates:
 * - learningUnitId: required, valid ObjectId
 * - learnerId: required, valid ObjectId
 * - questionId: optional, valid ObjectId
 */
export const progressParamsSchema = Joi.object({
  learningUnitId: Joi.string()
    .required()
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.empty': 'Learning unit ID is required',
      'string.objectId': 'Learning unit ID must be a valid MongoDB ObjectId',
      'any.required': 'Learning unit ID is required',
    }),

  learnerId: Joi.string().required().custom(objectIdValidator, 'ObjectId validation').messages({
    'string.empty': 'Learner ID is required',
    'string.objectId': 'Learner ID must be a valid MongoDB ObjectId',
    'any.required': 'Learner ID is required',
  }),

  questionId: Joi.string().optional().custom(objectIdValidator, 'ObjectId validation').messages({
    'string.objectId': 'Question ID must be a valid MongoDB ObjectId',
  }),
});

// ============================================
// VALIDATION MIDDLEWARE FUNCTIONS
// ============================================

/**
 * Validate link question request body
 *
 * Validates:
 * - questionId: required, valid ObjectId
 * - sequence: optional, non-negative integer
 * - pointsOverride: optional, non-negative integer or null
 */
export const validateLinkQuestion = (req: Request, _res: Response, next: NextFunction) => {
  const { error, value } = linkQuestionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};

/**
 * Validate bulk link questions request body
 *
 * Validates:
 * - questions: required, array of question objects (min 1)
 * - replaceExisting: optional, boolean (default false)
 */
export const validateBulkLinkQuestions = (req: Request, _res: Response, next: NextFunction) => {
  const { error, value } = bulkLinkQuestionsSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};

/**
 * Validate update link request body
 *
 * Validates:
 * - sequence: optional, non-negative integer
 * - pointsOverride: optional, non-negative integer or null
 * - At least one field must be provided
 */
export const validateUpdateLink = (req: Request, _res: Response, next: NextFunction) => {
  const { error, value } = updateLinkSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};

/**
 * Validate learning unit question route parameters
 *
 * Validates:
 * - learningUnitId: required, valid ObjectId
 * - linkId: optional, valid ObjectId
 */
export const validateLearningUnitQuestionParams = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = learningUnitQuestionParamsSchema.validate(req.params, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  next();
};

/**
 * Validate update progress request body
 *
 * Validates:
 * - isCorrect: required, boolean
 * - attemptId: optional, valid ObjectId
 * - timeSpent: optional, non-negative integer (seconds)
 */
export const validateUpdateProgress = (req: Request, _res: Response, next: NextFunction) => {
  const { error, value } = updateProgressSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};

/**
 * Validate progress route parameters
 *
 * Validates:
 * - learningUnitId: required, valid ObjectId
 * - learnerId: required, valid ObjectId
 * - questionId: optional, valid ObjectId
 */
export const validateProgressParams = (req: Request, _res: Response, next: NextFunction) => {
  const { error } = progressParamsSchema.validate(req.params, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  next();
};
