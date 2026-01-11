import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';

/**
 * Validator for escalation endpoint
 *
 * Validates that the escalation password meets minimum requirements.
 * Used when a user with global-admin privileges wants to escalate
 * to admin mode for sensitive operations.
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 * @throws {ApiError} Throws 400 error if validation fails
 */
export const validateEscalate = (req: Request, _res: Response, next: NextFunction) => {
  const schema = Joi.object({
    escalationPassword: Joi.string().min(8).required().messages({
      'string.min': 'Escalation password must be at least 8 characters',
      'string.empty': 'Escalation password cannot be empty',
      'any.required': 'Escalation password is required'
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
 * Validator for setting/updating escalation password
 *
 * Validates the new escalation password with strict requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 * @throws {ApiError} Throws 400 error if validation fails
 */
export const validateSetEscalationPassword = (req: Request, _res: Response, next: NextFunction) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const schema = Joi.object({
    currentPassword: Joi.string().required().messages({
      'string.empty': 'Current password cannot be empty',
      'any.required': 'Current password is required'
    }),
    newEscalationPassword: Joi.string().min(8).pattern(passwordRegex).required().messages({
      'string.min': 'Escalation password must be at least 8 characters',
      'string.pattern.base': 'Escalation password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.empty': 'New escalation password cannot be empty',
      'any.required': 'New escalation password is required'
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
