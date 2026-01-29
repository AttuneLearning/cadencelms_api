import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { ApiError } from '@/utils/ApiError';

/**
 * Department Question Validator
 *
 * Provides Joi validation schemas for department-scoped question management endpoints.
 * Supports multiple question types with type-specific field validation.
 *
 * Related contract: contracts/api/question-banks.contract.ts
 */

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid question types (snake_case)
 */
const questionTypes = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'short_answer',
  'long_answer',
  'matching',
  'flashcard',
  'fill_in_blank'
] as const;

/**
 * Valid difficulty levels
 */
const difficulties = ['easy', 'medium', 'hard'] as const;

// ============================================
// HELPER VALIDATORS
// ============================================

/**
 * Custom Joi validator for MongoDB ObjectId
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

// ============================================
// SUB-SCHEMAS
// ============================================

/**
 * Option schema for choice-type questions (multiple_choice, multiple_select, true_false)
 */
const optionSchema = Joi.object({
  id: Joi.string()
    .optional()
    .messages({
      'string.base': 'option.id must be a string'
    }),
  text: Joi.string()
    .required()
    .messages({
      'string.empty': 'option.text is required',
      'any.required': 'option.text is required'
    }),
  isCorrect: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'option.isCorrect must be a boolean',
      'any.required': 'option.isCorrect is required'
    })
});

/**
 * Pair schema for matching questions
 */
const pairSchema = Joi.object({
  left: Joi.string()
    .required()
    .messages({
      'string.empty': 'pair.left is required',
      'any.required': 'pair.left is required'
    }),
  right: Joi.string()
    .required()
    .messages({
      'string.empty': 'pair.right is required',
      'any.required': 'pair.right is required'
    })
});

/**
 * Card schema for flashcard questions
 */
const cardSchema = Joi.object({
  front: Joi.string()
    .required()
    .messages({
      'string.empty': 'card.front is required',
      'any.required': 'card.front is required'
    }),
  back: Joi.string()
    .required()
    .messages({
      'string.empty': 'card.back is required',
      'any.required': 'card.back is required'
    }),
  hint: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'card.hint must be a string'
    })
});

/**
 * Blank schema for fill-in-blank questions
 */
const blankSchema = Joi.object({
  position: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'blank.position must be a number',
      'number.integer': 'blank.position must be an integer',
      'number.min': 'blank.position must be at least 0',
      'any.required': 'blank.position is required'
    }),
  acceptedAnswers: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.base': 'blank.acceptedAnswers must be an array',
      'array.min': 'blank.acceptedAnswers must contain at least 1 answer',
      'any.required': 'blank.acceptedAnswers is required'
    }),
  matchThreshold: Joi.number()
    .min(0)
    .max(100)
    .default(80)
    .messages({
      'number.base': 'blank.matchThreshold must be a number',
      'number.min': 'blank.matchThreshold must be at least 0',
      'number.max': 'blank.matchThreshold cannot exceed 100'
    })
});

// ============================================
// NEW MONOLITHIC DESIGN SUB-SCHEMAS
// ============================================

/**
 * Media attachment reference schema
 */
const mediaAttachmentRefSchema = Joi.object({
  mediaId: Joi.string()
    .custom(objectIdValidator, 'ObjectId validation')
    .optional()
    .messages({
      'string.objectId': 'mediaId must be a valid ObjectId'
    }),
  url: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'url must be a valid URI'
    }),
  altText: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'altText cannot exceed 500 characters'
    })
});

/**
 * Flashcard prompt schema
 */
const flashcardPromptSchema = Joi.object({
  text: Joi.string()
    .required()
    .messages({
      'string.empty': 'prompt.text is required',
      'any.required': 'prompt.text is required'
    }),
  media: mediaAttachmentRefSchema.optional()
});

/**
 * Flashcard data schema (new monolithic design)
 */
const flashcardDataSchema = Joi.object({
  prompts: Joi.array()
    .items(flashcardPromptSchema)
    .optional()
    .messages({
      'array.base': 'flashcardData.prompts must be an array'
    }),
  frontMedia: mediaAttachmentRefSchema.optional(),
  backMedia: mediaAttachmentRefSchema.optional()
});

/**
 * Matching data schema (new monolithic design)
 */
const matchingDataSchema = Joi.object({
  columnAMedia: mediaAttachmentRefSchema.optional(),
  columnBMedia: mediaAttachmentRefSchema.optional(),
  pairExplanation: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'matchingData.pairExplanation must be a string'
    })
});

/**
 * True/false data schema (new monolithic design)
 */
const trueFalseDataSchema = Joi.object({
  correctValue: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'trueFalseData.correctValue must be a boolean',
      'any.required': 'trueFalseData.correctValue is required'
    }),
  trueExplanation: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'trueFalseData.trueExplanation must be a string'
    }),
  falseExplanation: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'trueFalseData.falseExplanation must be a string'
    })
});

/**
 * Short answer data schema (new monolithic design)
 */
const shortAnswerDataSchema = Joi.object({
  alternateAccepted: Joi.array()
    .items(Joi.string())
    .optional()
    .default([])
    .messages({
      'array.base': 'shortAnswerData.alternateAccepted must be an array of strings'
    }),
  matchThreshold: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .default(80)
    .messages({
      'number.base': 'shortAnswerData.matchThreshold must be a number',
      'number.min': 'shortAnswerData.matchThreshold must be at least 0',
      'number.max': 'shortAnswerData.matchThreshold cannot exceed 100'
    }),
  caseSensitive: Joi.boolean()
    .optional()
    .default(false)
    .messages({
      'boolean.base': 'shortAnswerData.caseSensitive must be a boolean'
    })
});

/**
 * Long answer data schema (new monolithic design)
 */
const longAnswerDataSchema = Joi.object({
  rubric: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'longAnswerData.rubric must be a string'
    }),
  sampleAnswer: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'longAnswerData.sampleAnswer must be a string'
    }),
  minWords: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'longAnswerData.minWords must be a number',
      'number.integer': 'longAnswerData.minWords must be an integer',
      'number.min': 'longAnswerData.minWords must be at least 0'
    }),
  maxWords: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'longAnswerData.maxWords must be a number',
      'number.integer': 'longAnswerData.maxWords must be an integer',
      'number.min': 'longAnswerData.maxWords must be at least 1'
    }),
  requiresHumanGrading: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'longAnswerData.requiresHumanGrading must be a boolean'
    })
});

/**
 * Fill-in-blank blank schema (new monolithic design)
 */
const fillBlankBlankSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'string.empty': 'fillBlankData.blanks[].id is required',
      'any.required': 'fillBlankData.blanks[].id is required'
    }),
  acceptedAnswers: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.base': 'fillBlankData.blanks[].acceptedAnswers must be an array',
      'array.min': 'fillBlankData.blanks[].acceptedAnswers must contain at least 1 answer',
      'any.required': 'fillBlankData.blanks[].acceptedAnswers is required'
    }),
  matchThreshold: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .default(80)
    .messages({
      'number.base': 'fillBlankData.blanks[].matchThreshold must be a number',
      'number.min': 'fillBlankData.blanks[].matchThreshold must be at least 0',
      'number.max': 'fillBlankData.blanks[].matchThreshold cannot exceed 100'
    })
});

/**
 * Fill-in-blank data schema (new monolithic design)
 */
const fillBlankDataSchema = Joi.object({
  textWithBlanks: Joi.string()
    .required()
    .pattern(/\{\{[a-zA-Z0-9_]+\}\}/)
    .messages({
      'string.empty': 'fillBlankData.textWithBlanks is required',
      'any.required': 'fillBlankData.textWithBlanks is required',
      'string.pattern.base': 'fillBlankData.textWithBlanks must contain at least one {{blank_id}} placeholder'
    }),
  blanks: Joi.array()
    .items(fillBlankBlankSchema)
    .min(1)
    .required()
    .messages({
      'array.base': 'fillBlankData.blanks must be an array',
      'array.min': 'fillBlankData.blanks must contain at least 1 blank definition',
      'any.required': 'fillBlankData.blanks is required'
    })
});

// ============================================
// HIERARCHY SCHEMA
// ============================================

/**
 * Hierarchy schema for adaptive testing relationships
 */
const hierarchySchema = Joi.object({
  parentQuestionId: Joi.string()
    .optional()
    .allow(null)
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.objectId': 'hierarchy.parentQuestionId must be a valid ObjectId'
    }),
  relatedQuestionIds: Joi.array()
    .items(
      Joi.string()
        .custom(objectIdValidator, 'ObjectId validation')
        .messages({
          'string.objectId': 'Each relatedQuestionId must be a valid ObjectId'
        })
    )
    .optional()
    .default([])
    .messages({
      'array.base': 'hierarchy.relatedQuestionIds must be an array'
    }),
  prerequisiteQuestionIds: Joi.array()
    .items(
      Joi.string()
        .custom(objectIdValidator, 'ObjectId validation')
        .messages({
          'string.objectId': 'Each prerequisiteQuestionId must be a valid ObjectId'
        })
    )
    .optional()
    .default([])
    .messages({
      'array.base': 'hierarchy.prerequisiteQuestionIds must be an array'
    }),
  conceptTag: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'hierarchy.conceptTag must be a string'
    }),
  difficultyProgression: Joi.number()
    .optional()
    .allow(null)
    .messages({
      'number.base': 'hierarchy.difficultyProgression must be a number'
    })
});

// ============================================
// MAIN SCHEMAS
// ============================================

/**
 * Schema for creating a department question
 *
 * Validates all question fields with type-specific conditional requirements:
 * - multiple_choice: requires options array with min 2 items
 * - multiple_select: requires options array with min 2 items
 * - true_false: requires options array with exactly 2 items
 * - short_answer: uses acceptedAnswers and matchThreshold
 * - long_answer: uses sampleAnswer and rubric
 * - matching: requires pairs array
 * - flashcard: requires cards array
 * - fill_in_blank: requires blanks array
 */
const createDepartmentQuestionSchema = Joi.object({
  // Question bank associations
  questionBankIds: Joi.array()
    .items(
      Joi.string()
        .custom(objectIdValidator, 'ObjectId validation')
        .messages({
          'string.objectId': 'Each questionBankId must be a valid ObjectId'
        })
    )
    .optional()
    .messages({
      'array.base': 'questionBankIds must be an array'
    }),

  // Core fields
  types: Joi.array()
    .items(Joi.string().valid(...questionTypes))
    .min(1)
    .required()
    .messages({
      'array.base': 'Question types must be an array',
      'array.min': 'At least one question type is required',
      'any.only': `Each question type must be one of: ${questionTypes.join(', ')}`,
      'any.required': 'Question types is required'
    }),

  text: Joi.string()
    .max(5000)
    .required()
    .messages({
      'string.empty': 'Question text is required',
      'string.max': 'Question text cannot exceed 5000 characters',
      'any.required': 'Question text is required'
    }),

  difficulty: Joi.string()
    .valid(...difficulties)
    .default('medium')
    .messages({
      'any.only': `Difficulty must be one of: ${difficulties.join(', ')}`
    }),

  tags: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .messages({
      'array.base': 'Tags must be an array of strings'
    }),

  points: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Points must be a number',
      'number.integer': 'Points must be an integer',
      'number.min': 'Points must be at least 1',
      'any.required': 'Points is required'
    }),

  explanation: Joi.string()
    .max(2000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Explanation cannot exceed 2000 characters'
    }),

  // Type-specific fields
  options: Joi.array()
    .items(optionSchema)
    .optional()
    .messages({
      'array.base': 'Options must be an array'
    }),

  acceptedAnswers: Joi.array()
    .items(Joi.string())
    .optional()
    .messages({
      'array.base': 'acceptedAnswers must be an array of strings'
    }),

  matchThreshold: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.base': 'matchThreshold must be a number',
      'number.min': 'matchThreshold must be at least 0',
      'number.max': 'matchThreshold cannot exceed 100'
    }),

  sampleAnswer: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'sampleAnswer must be a string'
    }),

  rubric: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'rubric must be a string'
    }),

  pairs: Joi.array()
    .items(pairSchema)
    .optional()
    .messages({
      'array.base': 'Pairs must be an array'
    }),

  cards: Joi.array()
    .items(cardSchema)
    .optional()
    .messages({
      'array.base': 'Cards must be an array'
    }),

  blanks: Joi.array()
    .items(blankSchema)
    .optional()
    .messages({
      'array.base': 'Blanks must be an array'
    }),

  // ============================================
  // NEW MONOLITHIC DESIGN FIELDS
  // ============================================

  /**
   * Distractors (wrong answers) - separate from options
   * For multiple_choice and multiple_select types
   */
  distractors: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .messages({
      'array.base': 'distractors must be an array of strings'
    }),

  /**
   * Type-specific sub-documents for the monolithic design
   */
  flashcardData: flashcardDataSchema.optional(),
  matchingData: matchingDataSchema.optional(),
  trueFalseData: trueFalseDataSchema.optional(),
  shortAnswerData: shortAnswerDataSchema.optional(),
  longAnswerData: longAnswerDataSchema.optional(),
  fillBlankData: fillBlankDataSchema.optional(),

  // Hierarchy for adaptive testing
  hierarchy: hierarchySchema.optional(),

  // Adaptive learning fields (optional)
  knowledgeNodeId: Joi.string()
    .custom(objectIdValidator, 'ObjectId validation')
    .optional()
    .allow(null)
    .messages({
      'string.objectId': 'knowledgeNodeId must be a valid ObjectId'
    }),

  cognitiveDepth: Joi.string()
    .lowercase()
    .trim()
    .max(50)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'cognitiveDepth cannot exceed 50 characters'
    })
}).custom((value, helpers) => {
  // Custom validation: ensure answer data exists for each type in the types array
  // Supports both legacy (options, cards, blanks) and new monolithic design (distractors, *Data fields)
  const types: string[] = value.types || [];
  const errors: string[] = [];

  for (const type of types) {
    switch (type) {
      case 'multiple_choice':
      case 'multiple_select':
        // Accept either legacy options OR new distractors design
        const hasLegacyOptions = value.options && Array.isArray(value.options) && value.options.length >= 2;
        const hasDistractors = value.distractors && Array.isArray(value.distractors) && value.distractors.length >= 1;
        if (!hasLegacyOptions && !hasDistractors) {
          errors.push(`${type} requires at least 2 options OR at least 1 distractor`);
        }
        break;
      case 'true_false':
        // Accept either legacy options OR new trueFalseData design
        const hasTrueFalseOptions = value.options && Array.isArray(value.options) && value.options.length === 2;
        const hasTrueFalseData = value.trueFalseData && typeof value.trueFalseData.correctValue === 'boolean';
        if (!hasTrueFalseOptions && !hasTrueFalseData) {
          errors.push('true_false requires exactly 2 options OR trueFalseData.correctValue');
        }
        break;
      case 'matching':
        // Accept either legacy pairs OR new matchingData design (or neither for manual setup)
        if (!value.pairs || !Array.isArray(value.pairs) || value.pairs.length < 2) {
          // Only error if no matchingData either - matching can be set up without pairs
          // errors.push('matching requires at least 2 pairs');
        }
        break;
      case 'flashcard':
        // Accept either legacy cards OR new flashcardData design
        // No strict requirement - questionText can serve as the answer
        // Both formats are valid: cards[], flashcardData.prompts[], or just questionText
        break;
      case 'fill_in_blank':
        // Accept either legacy blanks OR new fillBlankData design
        const hasLegacyBlanks = value.blanks && Array.isArray(value.blanks) && value.blanks.length >= 1;
        const hasFillBlankData = value.fillBlankData && value.fillBlankData.blanks && value.fillBlankData.blanks.length >= 1;
        if (!hasLegacyBlanks && !hasFillBlankData) {
          errors.push('fill_in_blank requires at least 1 blank OR fillBlankData');
        }
        break;
      // short_answer and long_answer don't strictly require answer data (can be graded manually)
    }
  }

  if (errors.length > 0) {
    return helpers.error('any.custom', { message: errors.join('; ') });
  }

  return value;
}, 'type-specific validation');

/**
 * Schema for updating a department question
 *
 * All fields are optional for partial updates.
 * Type-specific validation is still applied when type is provided.
 */
const updateDepartmentQuestionSchema = Joi.object({
  // Question bank associations
  questionBankIds: Joi.array()
    .items(
      Joi.string()
        .custom(objectIdValidator, 'ObjectId validation')
        .messages({
          'string.objectId': 'Each questionBankId must be a valid ObjectId'
        })
    )
    .optional()
    .messages({
      'array.base': 'questionBankIds must be an array'
    }),

  // Core fields
  types: Joi.array()
    .items(Joi.string().valid(...questionTypes))
    .min(1)
    .optional()
    .messages({
      'array.base': 'Question types must be an array',
      'array.min': 'At least one question type is required',
      'any.only': `Each question type must be one of: ${questionTypes.join(', ')}`
    }),

  text: Joi.string()
    .max(5000)
    .optional()
    .messages({
      'string.empty': 'Question text cannot be empty',
      'string.max': 'Question text cannot exceed 5000 characters'
    }),

  difficulty: Joi.string()
    .valid(...difficulties)
    .optional()
    .messages({
      'any.only': `Difficulty must be one of: ${difficulties.join(', ')}`
    }),

  tags: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .messages({
      'array.base': 'Tags must be an array of strings'
    }),

  points: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Points must be a number',
      'number.integer': 'Points must be an integer',
      'number.min': 'Points must be at least 1'
    }),

  explanation: Joi.string()
    .max(2000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Explanation cannot exceed 2000 characters'
    }),

  // Type-specific fields (all optional for updates)
  options: Joi.array()
    .items(optionSchema)
    .optional()
    .messages({
      'array.base': 'Options must be an array'
    }),

  acceptedAnswers: Joi.array()
    .items(Joi.string())
    .optional()
    .messages({
      'array.base': 'acceptedAnswers must be an array of strings'
    }),

  matchThreshold: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.base': 'matchThreshold must be a number',
      'number.min': 'matchThreshold must be at least 0',
      'number.max': 'matchThreshold cannot exceed 100'
    }),

  sampleAnswer: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'sampleAnswer must be a string'
    }),

  rubric: Joi.string()
    .optional()
    .allow('', null)
    .messages({
      'string.base': 'rubric must be a string'
    }),

  pairs: Joi.array()
    .items(pairSchema)
    .optional()
    .messages({
      'array.base': 'Pairs must be an array'
    }),

  cards: Joi.array()
    .items(cardSchema)
    .optional()
    .messages({
      'array.base': 'Cards must be an array'
    }),

  blanks: Joi.array()
    .items(blankSchema)
    .optional()
    .messages({
      'array.base': 'Blanks must be an array'
    }),

  // ============================================
  // NEW MONOLITHIC DESIGN FIELDS
  // ============================================

  /**
   * Distractors (wrong answers) - separate from options
   * For multiple_choice and multiple_select types
   */
  distractors: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .messages({
      'array.base': 'distractors must be an array of strings'
    }),

  /**
   * Type-specific sub-documents for the monolithic design
   */
  flashcardData: flashcardDataSchema.optional(),
  matchingData: matchingDataSchema.optional(),
  trueFalseData: trueFalseDataSchema.optional(),
  shortAnswerData: shortAnswerDataSchema.optional(),
  longAnswerData: longAnswerDataSchema.optional(),
  fillBlankData: fillBlankDataSchema.optional(),

  // Hierarchy for adaptive testing
  hierarchy: hierarchySchema.optional(),

  // Adaptive learning fields (optional)
  knowledgeNodeId: Joi.string()
    .custom(objectIdValidator, 'ObjectId validation')
    .optional()
    .allow(null)
    .messages({
      'string.objectId': 'knowledgeNodeId must be a valid ObjectId'
    }),

  cognitiveDepth: Joi.string()
    .lowercase()
    .trim()
    .max(50)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'cognitiveDepth cannot exceed 50 characters'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Schema for listing department questions with filters
 */
const listDepartmentQuestionsQuerySchema = Joi.object({
  types: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().valid(...questionTypes)),
      Joi.string().valid(...questionTypes)
    )
    .optional()
    .messages({
      'any.only': `Each type must be one of: ${questionTypes.join(', ')}`
    }),

  difficulty: Joi.string()
    .valid(...difficulties)
    .optional()
    .messages({
      'any.only': `Difficulty must be one of: ${difficulties.join(', ')}`
    }),

  tags: Joi.string()
    .optional()
    .messages({
      'string.base': 'Tags must be a comma-separated string'
    }),

  search: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Search query cannot exceed 200 characters'
    }),

  bankId: Joi.string()
    .optional()
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.objectId': 'bankId must be a valid ObjectId'
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
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  // Adaptive learning filters (optional)
  knowledgeNodeId: Joi.string()
    .optional()
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.objectId': 'knowledgeNodeId must be a valid ObjectId'
    }),

  cognitiveDepth: Joi.string()
    .lowercase()
    .trim()
    .max(50)
    .optional()
    .messages({
      'string.max': 'cognitiveDepth cannot exceed 50 characters'
    }),

  hasKnowledgeNode: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'hasKnowledgeNode must be a boolean'
    })
});

// ============================================
// MIDDLEWARE VALIDATORS
// ============================================

/**
 * Validate create department question request
 *
 * Validates:
 * - type: required, must be valid question type
 * - text: required, max 5000 characters
 * - difficulty: optional, defaults to 'medium'
 * - tags: optional array of strings
 * - points: required, integer >= 1
 * - explanation: optional, max 2000 characters
 * - Type-specific fields validated based on question type
 * - hierarchy: optional adaptive testing configuration
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 */
export const validateCreateDepartmentQuestion = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = createDepartmentQuestionSchema.validate(req.body, {
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
 * Validate update department question request
 *
 * All fields are optional for partial updates.
 * At least one field must be provided.
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 */
export const validateUpdateDepartmentQuestion = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = updateDepartmentQuestionSchema.validate(req.body, {
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
 * Validate list department questions query parameters
 *
 * Validates:
 * - type: optional, must be valid question type
 * - difficulty: optional, must be valid difficulty
 * - tags: optional, comma-separated string
 * - search: optional, max 200 characters
 * - bankId: optional, valid ObjectId
 * - page: optional, defaults to 1
 * - limit: optional, defaults to 20, max 100
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function
 */
export const validateListDepartmentQuestionsQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = listDepartmentQuestionsQuerySchema.validate(req.query, {
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

// ============================================
// EXPORTED SCHEMAS (for testing)
// ============================================

export {
  createDepartmentQuestionSchema,
  updateDepartmentQuestionSchema,
  listDepartmentQuestionsQuerySchema,
  // Legacy sub-schemas
  optionSchema,
  pairSchema,
  cardSchema,
  blankSchema,
  hierarchySchema,
  // New monolithic design sub-schemas
  mediaAttachmentRefSchema,
  flashcardPromptSchema,
  flashcardDataSchema,
  matchingDataSchema,
  trueFalseDataSchema,
  shortAnswerDataSchema,
  longAnswerDataSchema,
  fillBlankBlankSchema,
  fillBlankDataSchema,
  // Constants
  questionTypes,
  difficulties
};
