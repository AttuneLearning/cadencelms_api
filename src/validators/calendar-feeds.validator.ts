import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

const MAX_RANGE_DAYS = 90;

const calendarFeedQuerySchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .required()
    .messages({
      'date.format': 'startDate must be a valid ISO date (YYYY-MM-DD)',
      'any.required': 'startDate is required'
    }),
  endDate: Joi.date()
    .iso()
    .required()
    .min(Joi.ref('startDate'))
    .messages({
      'date.format': 'endDate must be a valid ISO date (YYYY-MM-DD)',
      'any.required': 'endDate is required',
      'date.min': 'endDate must be on or after startDate'
    })
});

/**
 * Validate startDate and endDate query params for calendar feed endpoints.
 */
export const validateCalendarFeedQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = calendarFeedQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  // Check maximum range
  const start = new Date(value.startDate);
  const end = new Date(value.endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > MAX_RANGE_DAYS) {
    return next(new ApiError(422, `Date range cannot exceed ${MAX_RANGE_DAYS} days`));
  }

  req.query = value;
  next();
};
