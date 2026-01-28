import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { ApiError } from '@/utils/ApiError';

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
// QUESTION BANK SCHEMAS
// ============================================

/**
 * Schema for creating a question bank
 */
export const createQuestionBankSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 1 character',
      'string.max': 'Name must be at most 200 characters',
      'any.required': 'Name is required'
    }),

  description: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description must be at most 2000 characters'
    }),

  tags: Joi.array()
    .items(Joi.string().trim().max(100))
    .optional()
    .messages({
      'array.base': 'Tags must be an array of strings'
    })
});

/**
 * Schema for updating a question bank (all fields optional, at least one required)
 */
export const updateQuestionBankSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.min': 'Name must be at least 1 character',
      'string.max': 'Name must be at most 200 characters'
    }),

  description: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description must be at most 2000 characters'
    }),

  tags: Joi.array()
    .items(Joi.string().trim().max(100))
    .optional()
    .messages({
      'array.base': 'Tags must be an array of strings'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Schema for listing question banks (query params)
 */
export const listQuestionBanksQuerySchema = Joi.object({
  search: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Search term must be at most 200 characters'
    }),

  tags: Joi.string()
    .trim()
    .optional()
    .messages({
      'string.base': 'Tags must be a comma-separated string'
    }),

  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  sort: Joi.string()
    .trim()
    .optional()
    .default('-createdAt')
    .messages({
      'string.base': 'Sort must be a string'
    })
});

/**
 * Schema for question bank route params
 */
export const questionBankParamsSchema = Joi.object({
  departmentId: Joi.string()
    .required()
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.empty': 'Department ID is required',
      'string.objectId': 'Department ID must be a valid ObjectId',
      'any.required': 'Department ID is required'
    }),

  bankId: Joi.string()
    .optional()
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.objectId': 'Bank ID must be a valid ObjectId'
    })
});

/**
 * Schema for delete question bank query params
 */
export const deleteQuestionBankQuerySchema = Joi.object({
  force: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Force must be a boolean'
    })
});

// ============================================
// QUESTION BANK MIDDLEWARE VALIDATORS
// ============================================

/**
 * Validate create question bank request
 *
 * Validates:
 * - name: required, 1-200 characters
 * - description: optional, max 2000 characters
 * - tags: optional, array of strings
 */
export const validateCreateQuestionBank = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = createQuestionBankSchema.validate(req.body, {
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
 * Validate update question bank request
 *
 * All fields are optional, but at least one must be provided.
 */
export const validateUpdateQuestionBank = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = updateQuestionBankSchema.validate(req.body, {
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
 * Validate list question banks query params
 *
 * Validates:
 * - search: optional, max 200 characters
 * - tags: optional, comma-separated string
 * - page: optional, integer >= 1, default 1
 * - limit: optional, integer 1-100, default 20
 * - sort: optional, string, default '-createdAt'
 */
export const validateListQuestionBanksQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = listQuestionBanksQuerySchema.validate(req.query, {
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
 * Validate question bank route params
 *
 * Validates:
 * - departmentId: required, valid ObjectId
 * - bankId: optional, valid ObjectId (for specific bank routes)
 */
export const validateQuestionBankParams = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = questionBankParamsSchema.validate(req.params, {
    abortEarly: false,
    stripUnknown: false
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  next();
};

/**
 * Validate delete question bank query params
 *
 * Validates:
 * - force: optional, boolean, default false
 */
export const validateDeleteQuestionBankQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = deleteQuestionBankQuerySchema.validate(req.query, {
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
