import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
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

/**
 * Validator for department switch endpoint
 *
 * Validates that the departmentId is:
 * - Required
 * - A valid MongoDB ObjectId format
 * - A non-empty string
 *
 * Used when a user wants to switch their active department context
 * to access roles and permissions for a different department.
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 * @throws {ApiError} Throws 400 error if validation fails
 */
export const validateSwitchDepartment = (req: Request, _res: Response, next: NextFunction) => {
  const schema = Joi.object({
    departmentId: Joi.string()
      .required()
      .custom(objectIdValidator, 'ObjectId validation')
      .messages({
        'string.empty': 'Department ID cannot be empty',
        'string.objectId': 'Department ID must be a valid MongoDB ObjectId',
        'any.required': 'Department ID is required'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw ApiError.badRequest('Validation failed', errors as any);
  }

  next();
};

/**
 * Validator for getting roles for a specific department
 *
 * Validates that the departmentId parameter is a valid ObjectId.
 * Used in GET /api/v2/roles/me/department/:departmentId
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 * @throws {ApiError} Throws 400 error if validation fails
 */
export const validateDepartmentIdParam = (req: Request, _res: Response, next: NextFunction) => {
  const schema = Joi.object({
    departmentId: Joi.string()
      .required()
      .custom(objectIdValidator, 'ObjectId validation')
      .messages({
        'string.empty': 'Department ID cannot be empty',
        'string.objectId': 'Department ID must be a valid MongoDB ObjectId',
        'any.required': 'Department ID is required'
      })
  });

  const { error } = schema.validate(req.params, { abortEarly: false });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw ApiError.badRequest('Validation failed', errors as any);
  }

  next();
};
