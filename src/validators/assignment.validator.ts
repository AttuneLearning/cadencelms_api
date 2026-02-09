import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

// ── Assignment Schemas ──

const createAssignmentSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.empty': 'title is required',
      'string.min': 'title is required',
      'string.max': 'title cannot exceed 200 characters',
      'any.required': 'title is required'
    }),
  instructions: Joi.string()
    .min(1)
    .max(10000)
    .required()
    .trim()
    .messages({
      'string.empty': 'instructions is required',
      'string.min': 'instructions is required',
      'string.max': 'instructions cannot exceed 10000 characters',
      'any.required': 'instructions is required'
    }),
  submissionType: Joi.string()
    .valid('text', 'file', 'text_and_file')
    .required()
    .messages({
      'any.only': 'submissionType must be text, file, or text_and_file',
      'any.required': 'submissionType is required'
    }),
  allowedFileTypes: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .messages({
      'array.base': 'allowedFileTypes must be an array of strings'
    }),
  maxFileSize: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'maxFileSize cannot be negative'
    }),
  maxFiles: Joi.number()
    .min(1)
    .max(20)
    .optional()
    .messages({
      'number.min': 'maxFiles must be at least 1',
      'number.max': 'maxFiles cannot exceed 20'
    }),
  maxScore: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'maxScore cannot be negative',
      'any.required': 'maxScore is required'
    }),
  maxResubmissions: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'maxResubmissions cannot be negative'
    }),
  courseId: objectIdSchema.required().messages({
    'any.required': 'courseId is required'
  }),
  moduleId: objectIdSchema.optional()
});

const updateAssignmentSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .trim()
    .messages({
      'string.empty': 'title cannot be empty',
      'string.max': 'title cannot exceed 200 characters'
    }),
  instructions: Joi.string()
    .min(1)
    .max(10000)
    .trim()
    .messages({
      'string.empty': 'instructions cannot be empty',
      'string.max': 'instructions cannot exceed 10000 characters'
    }),
  submissionType: Joi.string()
    .valid('text', 'file', 'text_and_file')
    .messages({
      'any.only': 'submissionType must be text, file, or text_and_file'
    }),
  allowedFileTypes: Joi.array()
    .items(Joi.string().trim())
    .messages({
      'array.base': 'allowedFileTypes must be an array of strings'
    }),
  maxFileSize: Joi.number()
    .min(0)
    .messages({
      'number.min': 'maxFileSize cannot be negative'
    }),
  maxFiles: Joi.number()
    .min(1)
    .max(20)
    .messages({
      'number.min': 'maxFiles must be at least 1',
      'number.max': 'maxFiles cannot exceed 20'
    }),
  maxScore: Joi.number()
    .min(0)
    .messages({
      'number.min': 'maxScore cannot be negative'
    }),
  maxResubmissions: Joi.number()
    .min(0)
    .allow(null)
    .messages({
      'number.min': 'maxResubmissions cannot be negative'
    }),
  isPublished: Joi.boolean(),
  moduleId: objectIdSchema.allow(null)
}).min(1).messages({
  'object.min': 'At least one field must be provided'
});

// ── Submission Schemas ──

const fileSchema = Joi.object({
  fileId: objectIdSchema.required(),
  fileName: Joi.string().required(),
  fileUrl: Joi.string().required(),
  fileSize: Joi.number().min(0).required(),
  mimeType: Joi.string().required()
});

const createSubmissionSchema = Joi.object({
  textContent: Joi.string()
    .max(50000)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': 'textContent cannot exceed 50000 characters'
    }),
  files: Joi.array()
    .items(fileSchema)
    .optional()
    .messages({
      'array.base': 'files must be an array'
    }),
  enrollmentId: objectIdSchema.required().messages({
    'any.required': 'enrollmentId is required'
  })
});

const updateDraftSchema = Joi.object({
  textContent: Joi.string()
    .max(50000)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': 'textContent cannot exceed 50000 characters'
    }),
  files: Joi.array()
    .items(fileSchema)
    .optional()
    .messages({
      'array.base': 'files must be an array'
    })
}).min(1).messages({
  'object.min': 'At least one field (textContent or files) must be provided'
});

const gradeSubmissionSchema = Joi.object({
  grade: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'grade cannot be negative',
      'any.required': 'grade is required'
    }),
  feedback: Joi.string()
    .max(5000)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': 'feedback cannot exceed 5000 characters'
    })
});

const returnSubmissionSchema = Joi.object({
  returnReason: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .trim()
    .messages({
      'string.empty': 'returnReason is required',
      'string.min': 'returnReason is required',
      'string.max': 'returnReason cannot exceed 2000 characters',
      'any.required': 'returnReason is required'
    })
});

const listSubmissionsSchema = Joi.object({
  assignmentId: objectIdSchema.optional(),
  learnerId: objectIdSchema.optional(),
  status: Joi.string()
    .valid('draft', 'submitted', 'graded', 'returned')
    .optional(),
  page: Joi.number().min(1).optional().messages({
    'number.min': 'page must be at least 1'
  }),
  limit: Joi.number().min(1).max(100).optional().messages({
    'number.min': 'limit must be at least 1',
    'number.max': 'limit cannot exceed 100'
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

export const validateCreateAssignment = validate(createAssignmentSchema);
export const validateUpdateAssignment = validate(updateAssignmentSchema);
export const validateCreateSubmission = validate(createSubmissionSchema);
export const validateUpdateDraft = validate(updateDraftSchema);
export const validateGradeSubmission = validate(gradeSubmissionSchema);
export const validateReturnSubmission = validate(returnSubmissionSchema);
export const validateListSubmissions = validate(listSubmissionsSchema, 'query');
