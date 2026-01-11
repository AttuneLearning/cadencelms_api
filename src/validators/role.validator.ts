import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';

/**
 * Valid role names for the system
 *
 * Includes all learner, staff, and global admin roles
 */
const VALID_ROLES = [
  // Learner roles
  'course-taker',
  'auditor',
  'learner-supervisor',
  // Staff roles
  'instructor',
  'department-admin',
  'content-admin',
  'billing-admin',
  // Global admin roles
  'system-admin',
  'enrollment-admin',
  'course-admin',
  'theme-admin',
  'financial-admin'
] as const;

/**
 * Valid user types
 */
const VALID_USER_TYPES = ['learner', 'staff', 'global-admin'] as const;

/**
 * Validator for updating role access rights
 *
 * Validates PUT /api/v2/roles/:name/access-rights
 *
 * Requirements:
 * - Role name must be a valid role from the system
 * - Access rights must be an array of strings
 * - Array must not be empty
 * - Each access right should follow the pattern: domain:resource:action
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 * @throws {ApiError} Throws 400 error if validation fails
 */
export const validateUpdateRoleAccessRights = (req: Request, _res: Response, next: NextFunction) => {
  // Validate params (role name)
  const paramsSchema = Joi.object({
    name: Joi.string()
      .required()
      .valid(...VALID_ROLES)
      .messages({
        'string.empty': 'Role name cannot be empty',
        'any.required': 'Role name is required',
        'any.only': 'Role name must be one of: ' + VALID_ROLES.join(', ')
      })
  });

  // Validate body (access rights array)
  const bodySchema = Joi.object({
    accessRights: Joi.array()
      .items(
        Joi.string().pattern(/^[a-z-]+:[a-z-]+:[a-z-]+$/).messages({
          'string.pattern.base': 'Each access right must follow the format: domain:resource:action (e.g., content:courses:manage)'
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one access right is required',
        'array.base': 'Access rights must be an array',
        'any.required': 'Access rights are required'
      })
  });

  // Validate params
  const paramsValidation = paramsSchema.validate(req.params, { abortEarly: false });
  if (paramsValidation.error) {
    const errors = paramsValidation.error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw ApiError.badRequest('Validation failed', errors as any);
  }

  // Validate body
  const bodyValidation = bodySchema.validate(req.body, { abortEarly: false });
  if (bodyValidation.error) {
    const errors = bodyValidation.error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw ApiError.badRequest('Validation failed', errors as any);
  }

  next();
};

/**
 * Validator for getting a specific role by name
 *
 * Validates GET /api/v2/roles/:name
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 * @throws {ApiError} Throws 400 error if validation fails
 */
export const validateGetRoleByName = (req: Request, _res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string()
      .required()
      .valid(...VALID_ROLES)
      .messages({
        'string.empty': 'Role name cannot be empty',
        'any.required': 'Role name is required',
        'any.only': 'Role name must be one of: ' + VALID_ROLES.join(', ')
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

/**
 * Validator for getting roles by user type
 *
 * Validates GET /api/v2/roles/user-type/:type
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 * @throws {ApiError} Throws 400 error if validation fails
 */
export const validateGetRolesByUserType = (req: Request, _res: Response, next: NextFunction) => {
  const schema = Joi.object({
    type: Joi.string()
      .required()
      .valid(...VALID_USER_TYPES)
      .messages({
        'string.empty': 'User type cannot be empty',
        'any.required': 'User type is required',
        'any.only': 'User type must be one of: ' + VALID_USER_TYPES.join(', ')
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

/**
 * Validator for creating a new role definition
 *
 * Validates POST /api/v2/roles
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 * @throws {ApiError} Throws 400 error if validation fails
 */
export const validateCreateRole = (req: Request, _res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string()
      .required()
      .pattern(/^[a-z-]+$/)
      .messages({
        'string.empty': 'Role name cannot be empty',
        'string.pattern.base': 'Role name must contain only lowercase letters and hyphens',
        'any.required': 'Role name is required'
      }),
    userType: Joi.string()
      .required()
      .valid(...VALID_USER_TYPES)
      .messages({
        'string.empty': 'User type cannot be empty',
        'any.required': 'User type is required',
        'any.only': 'User type must be one of: ' + VALID_USER_TYPES.join(', ')
      }),
    description: Joi.string().optional().messages({
      'string.base': 'Description must be a string'
    }),
    accessRights: Joi.array()
      .items(
        Joi.string().pattern(/^[a-z-]+:[a-z-]+:[a-z-]+$/).messages({
          'string.pattern.base': 'Each access right must follow the format: domain:resource:action'
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one access right is required',
        'array.base': 'Access rights must be an array',
        'any.required': 'Access rights are required'
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
