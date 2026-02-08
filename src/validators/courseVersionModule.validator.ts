import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

/**
 * Course Version Module Validators
 *
 * Joi validation schemas for course version module management endpoints.
 */

// Helper for MongoDB ObjectId validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId',
});

/**
 * Schema for adding a module to a version
 *
 * POST /api/v2/course-versions/:id/modules
 */
const addModuleSchema = Joi.object({
  moduleId: objectIdSchema.required().messages({
    'any.required': 'moduleId is required',
    'string.pattern.base': 'moduleId must be a valid ObjectId',
  }),
  order: Joi.number().integer().min(0).optional().messages({
    'number.base': 'order must be a number',
    'number.integer': 'order must be an integer',
    'number.min': 'order cannot be negative',
  }),
  isRequired: Joi.boolean().optional().messages({
    'boolean.base': 'isRequired must be a boolean',
  }),
  availableFrom: Joi.date().iso().optional().allow(null).messages({
    'date.format': 'availableFrom must be a valid ISO date',
  }),
  availableUntil: Joi.date().iso().optional().allow(null).messages({
    'date.format': 'availableUntil must be a valid ISO date',
  }),
});

/**
 * Schema for reordering modules
 *
 * PATCH /api/v2/course-versions/:id/modules/reorder
 */
const reorderModulesSchema = Joi.object({
  moduleOrder: Joi.array().items(objectIdSchema).min(1).required().messages({
    'array.base': 'moduleOrder must be an array of ObjectIds',
    'array.min': 'moduleOrder must contain at least one module',
    'any.required': 'moduleOrder is required',
  }),
});

/**
 * Schema for updating module settings
 *
 * PATCH /api/v2/course-versions/:id/modules/:moduleId
 */
const updateModuleSettingsSchema = Joi.object({
  isRequired: Joi.boolean().optional().messages({
    'boolean.base': 'isRequired must be a boolean',
  }),
  availableFrom: Joi.date().iso().optional().allow(null).messages({
    'date.format': 'availableFrom must be a valid ISO date',
  }),
  availableUntil: Joi.date().iso().optional().allow(null).messages({
    'date.format': 'availableUntil must be a valid ISO date',
  }),
});

/**
 * Validate add module request
 *
 * Validates:
 * - moduleId (required, valid ObjectId)
 * - order (optional, non-negative integer)
 * - isRequired (optional, boolean)
 * - availableFrom (optional, ISO date or null)
 * - availableUntil (optional, ISO date or null)
 */
export const validateAddModule = (req: Request, _res: Response, next: NextFunction) => {
  const { error, value } = addModuleSchema.validate(req.body, {
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
 * Validate reorder modules request
 *
 * Validates:
 * - moduleOrder (required, array of valid ObjectIds)
 */
export const validateReorderModules = (req: Request, _res: Response, next: NextFunction) => {
  const { error, value } = reorderModulesSchema.validate(req.body, {
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
 * Validate update module settings request
 *
 * All fields are optional for partial updates.
 *
 * Validates:
 * - isRequired (optional, boolean)
 * - availableFrom (optional, ISO date or null)
 * - availableUntil (optional, ISO date or null)
 */
export const validateUpdateModuleSettings = (req: Request, _res: Response, next: NextFunction) => {
  const { error, value } = updateModuleSettingsSchema.validate(req.body, {
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
