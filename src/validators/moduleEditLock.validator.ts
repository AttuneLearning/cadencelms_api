/**
 * ModuleEditLock Validators
 *
 * Request validation for module edit lock endpoints.
 * Most endpoints only require the module ID from params, which is validated
 * at the controller/service level.
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

// Helper for MongoDB ObjectId validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

/**
 * Validate module ID parameter
 * Used for all edit-lock endpoints
 */
const moduleIdParamSchema = Joi.object({
  id: objectIdSchema.required().messages({
    'any.required': 'Module ID is required',
    'string.pattern.base': 'Module ID must be a valid ObjectId'
  })
});

/**
 * Validate module ID in route params
 */
export const validateModuleIdParam = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = moduleIdParamSchema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(400, errorMessage));
  }

  next();
};
