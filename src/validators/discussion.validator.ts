import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

// ── Thread Schemas ──

const createThreadSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(300)
    .required()
    .trim()
    .messages({
      'string.empty': 'title is required',
      'string.min': 'title is required',
      'string.max': 'title cannot exceed 300 characters',
      'any.required': 'title is required'
    }),
  body: Joi.string()
    .min(1)
    .max(10000)
    .required()
    .trim()
    .messages({
      'string.empty': 'body is required',
      'string.min': 'body is required',
      'string.max': 'body cannot exceed 10000 characters',
      'any.required': 'body is required'
    }),
  moduleId: objectIdSchema.optional(),
  lessonId: objectIdSchema.optional()
});

const updateThreadSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(300)
    .trim()
    .messages({
      'string.empty': 'title cannot be empty',
      'string.max': 'title cannot exceed 300 characters'
    }),
  body: Joi.string()
    .min(1)
    .max(10000)
    .trim()
    .messages({
      'string.empty': 'body cannot be empty',
      'string.max': 'body cannot exceed 10000 characters'
    })
}).min(1).messages({
  'object.min': 'At least one field (title or body) must be provided'
});

const pinThreadSchema = Joi.object({
  isPinned: Joi.boolean()
    .required()
    .messages({
      'any.required': 'isPinned is required',
      'boolean.base': 'isPinned must be a boolean'
    })
});

const lockThreadSchema = Joi.object({
  isLocked: Joi.boolean()
    .required()
    .messages({
      'any.required': 'isLocked is required',
      'boolean.base': 'isLocked must be a boolean'
    })
});

const searchThreadsSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Search query is required',
      'string.max': 'Search query cannot exceed 200 characters',
      'any.required': 'Search query is required'
    }),
  page: Joi.number().min(1).optional().messages({
    'number.min': 'page must be at least 1'
  }),
  limit: Joi.number().min(1).max(50).optional().messages({
    'number.min': 'limit must be at least 1',
    'number.max': 'limit cannot exceed 50'
  })
});

// ── Reply Schemas ──

const createReplySchema = Joi.object({
  body: Joi.string()
    .min(1)
    .max(10000)
    .required()
    .trim()
    .messages({
      'string.empty': 'body is required',
      'string.min': 'body is required',
      'string.max': 'body cannot exceed 10000 characters',
      'any.required': 'body is required'
    }),
  parentReplyId: objectIdSchema.optional()
});

const updateReplySchema = Joi.object({
  body: Joi.string()
    .min(1)
    .max(10000)
    .required()
    .trim()
    .messages({
      'string.empty': 'body is required',
      'string.min': 'body is required',
      'string.max': 'body cannot exceed 10000 characters',
      'any.required': 'body is required'
    })
});

const markAnswerSchema = Joi.object({
  isInstructorAnswer: Joi.boolean()
    .required()
    .messages({
      'any.required': 'isInstructorAnswer is required',
      'boolean.base': 'isInstructorAnswer must be a boolean'
    })
});

// ── Middleware Exports ──

function validate(schema: Joi.ObjectSchema, source: 'body' | 'query' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new ApiError(422, errorMessage));
    }

    req[source] = value;
    next();
  };
}

export const validateCreateThread = validate(createThreadSchema);
export const validateUpdateThread = validate(updateThreadSchema);
export const validatePinThread = validate(pinThreadSchema);
export const validateLockThread = validate(lockThreadSchema);
export const validateSearchThreads = validate(searchThreadsSchema, 'query');
export const validateCreateReply = validate(createReplySchema);
export const validateUpdateReply = validate(updateReplySchema);
export const validateMarkAnswer = validate(markAnswerSchema);
