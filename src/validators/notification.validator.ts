import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '@/models/notification/Notification.model';

/**
 * Notification Validators
 *
 * Joi validation schemas for notification endpoints.
 */

// Helper for MongoDB ObjectId validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

// Time format validation (HH:mm)
const timeFormatPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Schema for listing notifications (query params)
 */
const listNotificationsSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .default(20)
    .custom((value) => Math.min(value, 100), 'cap limit to 100'),
  type: Joi.string()
    .valid(...NOTIFICATION_TYPES)
    .messages({
      'any.only': 'type must be one of: ' + NOTIFICATION_TYPES.join(', ')
    }),
  priority: Joi.string()
    .valid(...NOTIFICATION_PRIORITIES)
    .messages({
      'any.only': 'priority must be one of: ' + NOTIFICATION_PRIORITIES.join(', ')
    }),
  readStatus: Joi.string()
    .valid('read', 'unread', 'all')
    .default('all')
    .messages({
      'any.only': 'readStatus must be one of: read, unread, all'
    }),
  includeDismissed: Joi.string()
    .valid('true', 'false')
    .default('false'),
  sort: Joi.string()
    .pattern(/^-?(createdAt|updatedAt|priority|type)$/)
    .default('-createdAt')
    .messages({
      'string.pattern.base': 'sort must be one of: createdAt, updatedAt, priority, type (prefix with - for descending)'
    })
});

/**
 * Schema for notification preferences update
 */
const updatePreferencesSchema = Joi.object({
  emailNotifications: Joi.boolean(),
  inAppNotifications: Joi.boolean(),
  preferences: Joi.object()
    .pattern(
      Joi.string().valid(...NOTIFICATION_TYPES),
      Joi.boolean()
    )
    .messages({
      'object.pattern.match': 'preferences keys must be valid notification types'
    }),
  quietHours: Joi.object({
    enabled: Joi.boolean(),
    start: Joi.string()
      .pattern(timeFormatPattern)
      .messages({
        'string.pattern.base': 'start time must be in HH:mm format (24-hour)'
      }),
    end: Joi.string()
      .pattern(timeFormatPattern)
      .messages({
        'string.pattern.base': 'end time must be in HH:mm format (24-hour)'
      })
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Schema for notification ID param
 */
const notificationIdSchema = Joi.object({
  id: objectIdSchema.required().messages({
    'any.required': 'Notification ID is required'
  })
});

/**
 * Validate list notifications query params
 */
export const validateListNotifications = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = listNotificationsSchema.validate(req.query, {
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
 * Validate update preferences request body
 */
export const validateUpdatePreferences = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = updatePreferencesSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  // Additional validation: check for invalid notification types in preferences
  // (Joi stripUnknown removes them silently, so we check the original request)
  if (req.body.preferences && typeof req.body.preferences === 'object') {
    const invalidTypes = Object.keys(req.body.preferences).filter(
      key => !NOTIFICATION_TYPES.includes(key as any)
    );
    if (invalidTypes.length > 0) {
      return next(new ApiError(422, `Invalid notification types: ${invalidTypes.join(', ')}`));
    }
  }

  req.body = value;
  next();
};

/**
 * Validate notification ID param
 */
export const validateNotificationId = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = notificationIdSchema.validate(req.params, {
    abortEarly: false
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  next();
};
