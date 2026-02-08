import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

/**
 * Certificate Definition Validators
 *
 * Joi validation schemas for certificate definition endpoints.
 */

// Helper for MongoDB ObjectId validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

/**
 * Schema for creating a certificate definition
 *
 * POST /api/v2/certificate-definitions
 */
const createDefinitionSchema = Joi.object({
  credentialGroupId: objectIdSchema
    .required()
    .messages({
      'any.required': 'credentialGroupId is required'
    }),
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.empty': 'title is required',
      'string.min': 'title must be at least 1 character',
      'string.max': 'title cannot exceed 200 characters',
      'any.required': 'title is required'
    }),
  description: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .trim()
    .messages({
      'string.empty': 'description is required',
      'string.min': 'description must be at least 1 character',
      'string.max': 'description cannot exceed 2000 characters',
      'any.required': 'description is required'
    }),
  isCompatible: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'isCompatible must be a boolean'
    }),
  compatibilityBreakReason: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.max': 'compatibilityBreakReason cannot exceed 500 characters'
    }),
  validFrom: Joi.date()
    .optional()
    .allow(null)
    .iso()
    .messages({
      'date.format': 'validFrom must be a valid ISO date'
    }),
  validUntil: Joi.date()
    .optional()
    .allow(null)
    .iso()
    .greater(Joi.ref('validFrom'))
    .messages({
      'date.format': 'validUntil must be a valid ISO date',
      'date.greater': 'validUntil must be after validFrom'
    }),
  expiresAfterMonths: Joi.number()
    .optional()
    .allow(null)
    .min(1)
    .max(1200)
    .messages({
      'number.base': 'expiresAfterMonths must be a number',
      'number.min': 'expiresAfterMonths must be at least 1',
      'number.max': 'expiresAfterMonths cannot exceed 1200 (100 years)'
    }),
  autoIssue: Joi.boolean()
    .optional()
    .default(false)
    .messages({
      'boolean.base': 'autoIssue must be a boolean'
    })
});

/**
 * Schema for updating a certificate definition
 *
 * PATCH /api/v2/certificate-definitions/:id
 */
const updateDefinitionSchema = Joi.object({
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
    .min(1)
    .max(2000)
    .optional()
    .trim()
    .messages({
      'string.empty': 'description cannot be empty',
      'string.min': 'description must be at least 1 character',
      'string.max': 'description cannot exceed 2000 characters'
    }),
  isCompatible: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isCompatible must be a boolean'
    }),
  compatibilityBreakReason: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.max': 'compatibilityBreakReason cannot exceed 500 characters'
    }),
  validFrom: Joi.date()
    .optional()
    .allow(null)
    .iso()
    .messages({
      'date.format': 'validFrom must be a valid ISO date'
    }),
  validUntil: Joi.date()
    .optional()
    .allow(null)
    .iso()
    .messages({
      'date.format': 'validUntil must be a valid ISO date'
    }),
  expiresAfterMonths: Joi.number()
    .optional()
    .allow(null)
    .min(1)
    .max(1200)
    .messages({
      'number.base': 'expiresAfterMonths must be a number',
      'number.min': 'expiresAfterMonths must be at least 1',
      'number.max': 'expiresAfterMonths cannot exceed 1200 (100 years)'
    }),
  autoIssue: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'autoIssue must be a boolean'
    })
});

/**
 * Schema for deprecating a certificate definition
 *
 * POST /api/v2/certificate-definitions/:id/deprecate
 */
const deprecateDefinitionSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .optional()
    .trim()
    .messages({
      'string.max': 'reason cannot exceed 500 characters'
    })
});

/**
 * Schema for adding a requirement
 *
 * POST /api/v2/certificate-definitions/:id/requirements
 */
const addRequirementSchema = Joi.object({
  courseVersionId: objectIdSchema
    .required()
    .messages({
      'any.required': 'courseVersionId is required'
    }),
  isRequired: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'isRequired must be a boolean'
    }),
  minimumScore: Joi.number()
    .optional()
    .allow(null)
    .min(0)
    .max(100)
    .messages({
      'number.base': 'minimumScore must be a number',
      'number.min': 'minimumScore cannot be negative',
      'number.max': 'minimumScore cannot exceed 100'
    }),
  order: Joi.number()
    .optional()
    .min(0)
    .messages({
      'number.base': 'order must be a number',
      'number.min': 'order cannot be negative'
    }),
  electiveGroupId: Joi.string()
    .max(50)
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.max': 'electiveGroupId cannot exceed 50 characters'
    }),
  electiveGroupName: Joi.string()
    .max(100)
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.max': 'electiveGroupName cannot exceed 100 characters'
    }),
  electiveMinCount: Joi.number()
    .optional()
    .allow(null)
    .min(1)
    .messages({
      'number.base': 'electiveMinCount must be a number',
      'number.min': 'electiveMinCount must be at least 1'
    })
}).custom((value, helpers) => {
  // Validate elective group fields are all set or all null
  const hasGroupId = value.electiveGroupId && value.electiveGroupId !== '';
  const hasGroupName = value.electiveGroupName && value.electiveGroupName !== '';
  const hasMinCount = value.electiveMinCount !== null && value.electiveMinCount !== undefined;

  if (hasGroupId || hasGroupName || hasMinCount) {
    if (!(hasGroupId && hasGroupName && hasMinCount)) {
      return helpers.error('custom.electiveGroup', {
        message: 'Elective group settings must all be set together: electiveGroupId, electiveGroupName, and electiveMinCount'
      });
    }
    // Electives cannot be required
    if (value.isRequired) {
      return helpers.error('custom.electiveRequired', {
        message: 'Elective courses cannot be marked as required'
      });
    }
  }

  return value;
}, 'elective group validation').messages({
  'custom.electiveGroup': 'Elective group settings must all be set together: electiveGroupId, electiveGroupName, and electiveMinCount',
  'custom.electiveRequired': 'Elective courses cannot be marked as required'
});

/**
 * Validate create definition request
 */
export const validateCreateDefinition = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = createDefinitionSchema.validate(req.body, {
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
 * Validate update definition request
 */
export const validateUpdateDefinition = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = updateDefinitionSchema.validate(req.body, {
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
 * Validate deprecate definition request
 */
export const validateDeprecateDefinition = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = deprecateDefinitionSchema.validate(req.body, {
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
 * Validate add requirement request
 */
export const validateAddRequirement = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = addRequirementSchema.validate(req.body, {
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
