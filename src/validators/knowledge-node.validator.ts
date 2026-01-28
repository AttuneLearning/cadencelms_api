import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { ApiError } from '@/utils/ApiError';

/**
 * Knowledge Node Validator
 *
 * Provides Joi validation schemas for knowledge node management endpoints.
 * Validates department-scoped node creation, update, and query operations.
 *
 * Related contract: contracts/api/knowledge-nodes.contract.ts
 */

// ============================================
// CONSTANTS
// ============================================

/**
 * Slug pattern: lowercase alphanumeric with hyphens only
 */
const SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Custom Joi validator for MongoDB ObjectId
 */
const objectIdValidator = (value: string, helpers: Joi.CustomHelpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('string.objectId');
  }
  return value;
};

// ============================================
// SUB-SCHEMAS
// ============================================

/**
 * Depth range schema for cognitive depth level bounds
 */
const depthRangeSchema = Joi.object({
  min: Joi.string()
    .lowercase()
    .trim()
    .pattern(SLUG_PATTERN)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Minimum depth is required',
      'string.pattern.base': 'Minimum depth must be a valid slug',
      'any.required': 'Minimum depth is required'
    }),
  max: Joi.string()
    .lowercase()
    .trim()
    .pattern(SLUG_PATTERN)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Maximum depth is required',
      'string.pattern.base': 'Maximum depth must be a valid slug',
      'any.required': 'Maximum depth is required'
    })
});

// ============================================
// MAIN SCHEMAS
// ============================================

/**
 * Schema for creating a knowledge node
 */
const createKnowledgeNodeSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(200)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.max': 'Name cannot exceed 200 characters',
      'any.required': 'Name is required'
    }),

  slug: Joi.string()
    .lowercase()
    .trim()
    .pattern(SLUG_PATTERN)
    .max(100)
    .optional()
    .messages({
      'string.pattern.base': 'Slug must be lowercase alphanumeric with hyphens only',
      'string.max': 'Slug cannot exceed 100 characters'
    }),

  description: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 2000 characters'
    }),

  parentNodeId: Joi.string()
    .custom(objectIdValidator, 'ObjectId validation')
    .optional()
    .allow(null)
    .messages({
      'string.objectId': 'Parent node ID must be a valid ObjectId'
    }),

  prerequisiteNodeIds: Joi.array()
    .items(
      Joi.string()
        .custom(objectIdValidator, 'ObjectId validation')
        .messages({
          'string.objectId': 'Each prerequisite node ID must be a valid ObjectId'
        })
    )
    .optional()
    .default([])
    .messages({
      'array.base': 'Prerequisite node IDs must be an array'
    }),

  relatedNodeIds: Joi.array()
    .items(
      Joi.string()
        .custom(objectIdValidator, 'ObjectId validation')
        .messages({
          'string.objectId': 'Each related node ID must be a valid ObjectId'
        })
    )
    .optional()
    .default([])
    .messages({
      'array.base': 'Related node IDs must be an array'
    }),

  depthRange: depthRangeSchema.optional(),

  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .optional()
    .default([])
    .messages({
      'array.base': 'Tags must be an array',
      'array.max': 'Cannot have more than 20 tags'
    })
});

/**
 * Schema for updating a knowledge node
 *
 * All fields are optional for partial updates.
 * At least one field must be provided.
 * Note: slug cannot be updated (used as identifier for questions)
 */
const updateKnowledgeNodeSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.max': 'Name cannot exceed 200 characters'
    }),

  description: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 2000 characters'
    }),

  parentNodeId: Joi.alternatives()
    .try(
      Joi.string()
        .custom(objectIdValidator, 'ObjectId validation')
        .messages({
          'string.objectId': 'Parent node ID must be a valid ObjectId'
        }),
      Joi.valid(null)
    )
    .optional()
    .messages({
      'alternatives.types': 'Parent node ID must be a valid ObjectId or null'
    }),

  prerequisiteNodeIds: Joi.array()
    .items(
      Joi.string()
        .custom(objectIdValidator, 'ObjectId validation')
        .messages({
          'string.objectId': 'Each prerequisite node ID must be a valid ObjectId'
        })
    )
    .optional()
    .messages({
      'array.base': 'Prerequisite node IDs must be an array'
    }),

  relatedNodeIds: Joi.array()
    .items(
      Joi.string()
        .custom(objectIdValidator, 'ObjectId validation')
        .messages({
          'string.objectId': 'Each related node ID must be a valid ObjectId'
        })
    )
    .optional()
    .messages({
      'array.base': 'Related node IDs must be an array'
    }),

  depthRange: depthRangeSchema.optional(),

  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .optional()
    .messages({
      'array.base': 'Tags must be an array',
      'array.max': 'Cannot have more than 20 tags'
    }),

  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Schema for listing knowledge nodes query parameters
 */
const listKnowledgeNodesQuerySchema = Joi.object({
  search: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Search query cannot exceed 200 characters'
    }),

  tags: Joi.string()
    .optional()
    .messages({
      'string.base': 'Tags must be a comma-separated string'
    }),

  parentNodeId: Joi.string()
    .optional()
    .custom((value, helpers) => {
      // Allow 'null' string, empty string, or valid ObjectId
      if (value === 'null' || value === '') {
        return value;
      }
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('string.objectId');
      }
      return value;
    })
    .messages({
      'string.objectId': 'parentNodeId must be a valid ObjectId or "null"'
    }),

  hasQuestions: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'hasQuestions must be a boolean'
    }),

  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(200)
    .default(50)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 200'
    }),

  sort: Joi.string()
    .valid('name', 'createdAt', 'updatedAt', '-name', '-createdAt', '-updatedAt')
    .default('name')
    .messages({
      'any.only': 'Sort must be one of: name, createdAt, updatedAt (prefix with - for descending)'
    })
});

/**
 * Schema for adding a prerequisite
 */
const addPrerequisiteSchema = Joi.object({
  prerequisiteNodeId: Joi.string()
    .custom(objectIdValidator, 'ObjectId validation')
    .required()
    .messages({
      'string.objectId': 'Prerequisite node ID must be a valid ObjectId',
      'any.required': 'Prerequisite node ID is required'
    })
});

/**
 * Schema for tree query parameters
 */
const treeQuerySchema = Joi.object({
  rootOnly: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'rootOnly must be a boolean'
    }),

  maxDepth: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .default(5)
    .messages({
      'number.base': 'maxDepth must be a number',
      'number.integer': 'maxDepth must be an integer',
      'number.min': 'maxDepth must be at least 1',
      'number.max': 'maxDepth cannot exceed 10'
    })
});

/**
 * Schema for graph query parameters
 */
const graphQuerySchema = Joi.object({
  depth: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .default(2)
    .messages({
      'number.base': 'depth must be a number',
      'number.integer': 'depth must be an integer',
      'number.min': 'depth must be at least 1',
      'number.max': 'depth cannot exceed 5'
    })
});

// ============================================
// MIDDLEWARE VALIDATORS
// ============================================

/**
 * Validate create knowledge node request
 */
export const validateCreateKnowledgeNode = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = createKnowledgeNodeSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};

/**
 * Validate update knowledge node request
 */
export const validateUpdateKnowledgeNode = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = updateKnowledgeNodeSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};

/**
 * Validate list knowledge nodes query parameters
 */
export const validateListKnowledgeNodesQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = listKnowledgeNodesQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.query = value;
  next();
};

/**
 * Validate add prerequisite request
 */
export const validateAddPrerequisite = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = addPrerequisiteSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};

/**
 * Validate tree query parameters
 */
export const validateTreeQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = treeQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.query = value;
  next();
};

/**
 * Validate graph query parameters
 */
export const validateGraphQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = graphQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.query = value;
  next();
};

// ============================================
// EXPORTED SCHEMAS (for testing)
// ============================================

export {
  createKnowledgeNodeSchema,
  updateKnowledgeNodeSchema,
  listKnowledgeNodesQuerySchema,
  addPrerequisiteSchema,
  treeQuerySchema,
  graphQuerySchema,
  depthRangeSchema,
  SLUG_PATTERN
};
