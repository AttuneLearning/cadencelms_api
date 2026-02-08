import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

// Helper for MongoDB ObjectId validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

// Access duration schema
const accessDurationSchema = Joi.object({
  type: Joi.string()
    .valid('months', 'years', 'perpetual', 'custom')
    .required()
    .messages({
      'any.only': 'type must be one of: months, years, perpetual, custom',
      'any.required': 'type is required'
    }),
  value: Joi.number()
    .min(0)
    .when('type', {
      is: Joi.string().valid('months', 'years', 'custom'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'number.min': 'value must be at least 0',
      'any.required': 'value is required for non-perpetual duration types'
    })
});

// Notification settings schema
const notificationSettingsSchema = Joi.object({
  notifyBeforeExpiration: Joi.boolean().optional(),
  daysBeforeExpirationNotification: Joi.number()
    .min(1)
    .optional()
    .messages({
      'number.min': 'daysBeforeExpirationNotification must be at least 1'
    }),
  notifyOnNewVersion: Joi.boolean().optional(),
  notifyOnCertificateUpgrade: Joi.boolean().optional(),
  notifyAdminOnExtensionRequest: Joi.boolean().optional()
});

// Department access policy update schema
const departmentAccessPolicySchema = Joi.object({
  defaultAccessDuration: accessDurationSchema.optional(),
  allowNewVersionAccess: Joi.boolean().optional(),
  newVersionAccessWindow: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'newVersionAccessWindow must be at least 0'
    }),
  allowCertificateUpgrade: Joi.boolean().optional(),
  certificateUpgradeWindow: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'certificateUpgradeWindow must be at least 0'
    }),
  allowCourseRetakes: Joi.boolean().optional(),
  maxRetakesPerCourse: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'maxRetakesPerCourse must be at least 0'
    }),
  retakeCooldownDays: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'retakeCooldownDays must be at least 0'
    }),
  notifications: notificationSettingsSchema.optional()
});

// Program access override update schema (allows null to clear overrides)
const programAccessOverrideSchema = Joi.object({
  accessDuration: Joi.alternatives()
    .try(accessDurationSchema, Joi.valid(null))
    .optional(),
  allowNewVersionAccess: Joi.boolean().allow(null).optional(),
  newVersionAccessWindow: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'newVersionAccessWindow must be at least 0'
    }),
  allowCertificateUpgrade: Joi.boolean().allow(null).optional(),
  certificateUpgradeWindow: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'certificateUpgradeWindow must be at least 0'
    }),
  allowCourseRetakes: Joi.boolean().allow(null).optional(),
  maxRetakesPerCourse: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'maxRetakesPerCourse must be at least 0'
    }),
  retakeCooldownDays: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'retakeCooldownDays must be at least 0'
    }),
  requireSequentialCompletion: Joi.boolean().optional(),
  notifications: Joi.alternatives()
    .try(notificationSettingsSchema, Joi.valid(null))
    .optional()
});

// Requested extension schema
const requestedExtensionSchema = Joi.object({
  type: Joi.string()
    .valid('days', 'months', 'perpetual')
    .required()
    .messages({
      'any.only': 'type must be one of: days, months, perpetual',
      'any.required': 'type is required'
    }),
  value: Joi.number()
    .min(1)
    .when('type', {
      is: Joi.string().valid('days', 'months'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'number.min': 'value must be at least 1',
      'any.required': 'value is required for non-perpetual extension types'
    })
});

// Extension request create schema
const extensionRequestCreateSchema = Joi.object({
  requestedExtension: requestedExtensionSchema.required().messages({
    'any.required': 'requestedExtension is required'
  }),
  requestReason: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .trim()
    .messages({
      'string.max': 'requestReason cannot exceed 2000 characters'
    })
});

// Extension request review schema
const extensionRequestReviewSchema = Joi.object({
  status: Joi.string()
    .valid('approved', 'denied')
    .required()
    .messages({
      'any.only': 'status must be one of: approved, denied',
      'any.required': 'status is required'
    }),
  reviewNotes: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .trim()
    .messages({
      'string.max': 'reviewNotes cannot exceed 2000 characters'
    }),
  grantedExtension: requestedExtensionSchema
    .optional()
    .when('status', {
      is: 'approved',
      then: Joi.optional(),
      otherwise: Joi.forbidden().messages({
        'any.unknown': 'grantedExtension can only be provided when approving'
      })
    })
});

// Direct extend schema
const directExtendSchema = Joi.object({
  extension: requestedExtensionSchema.required().messages({
    'any.required': 'extension is required'
  }),
  reason: Joi.string()
    .min(1)
    .max(500)
    .required()
    .trim()
    .messages({
      'string.empty': 'reason is required',
      'string.min': 'reason is required',
      'string.max': 'reason cannot exceed 500 characters',
      'any.required': 'reason is required'
    })
});

// Extension request list filters schema
const extensionRequestFiltersSchema = Joi.object({
  departmentId: objectIdSchema.optional(),
  learnerId: objectIdSchema.optional(),
  enrollmentId: objectIdSchema.optional(),
  status: Joi.string()
    .valid('pending', 'approved', 'denied')
    .optional()
    .messages({
      'any.only': 'status must be one of: pending, approved, denied'
    }),
  page: Joi.number().min(1).optional().messages({
    'number.min': 'page must be at least 1'
  }),
  limit: Joi.number().min(1).max(100).optional().messages({
    'number.min': 'limit must be at least 1',
    'number.max': 'limit cannot exceed 100'
  }),
  sort: Joi.string().optional()
});

/**
 * Validate department access policy update
 */
export const validateDepartmentAccessPolicy = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = departmentAccessPolicySchema.validate(req.body, {
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
 * Validate program access override update
 */
export const validateProgramAccessOverride = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = programAccessOverrideSchema.validate(req.body, {
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
 * Validate extension request creation
 */
export const validateExtensionRequestCreate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = extensionRequestCreateSchema.validate(req.body, {
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
 * Validate extension request review
 */
export const validateExtensionRequestReview = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = extensionRequestReviewSchema.validate(req.body, {
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
 * Validate direct extend request
 */
export const validateDirectExtend = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = directExtendSchema.validate(req.body, {
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
 * Validate extension request list filters
 */
export const validateExtensionRequestFilters = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = extensionRequestFiltersSchema.validate(req.query, {
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
