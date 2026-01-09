import { Request, Response } from 'express';
import { QuestionsService } from '@/services/content/questions.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Questions Controller
 * Handles all question bank management endpoints
 */

/**
 * GET /api/v2/questions
 * List questions with filtering and pagination
 */
export const listQuestions = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    questionType: req.query.questionType as string | undefined,
    tag: req.query.tag as string | undefined,
    difficulty: req.query.difficulty as 'easy' | 'medium' | 'hard' | undefined,
    search: req.query.search as string | undefined,
    department: req.query.department as string | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate questionType if provided
  if (filters.questionType) {
    const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'];
    const types = filters.questionType.split(',').map(t => t.trim());
    for (const type of types) {
      if (!validTypes.includes(type)) {
        throw ApiError.badRequest(`Invalid question type: ${type}. Must be one of: ${validTypes.join(', ')}`);
      }
    }
  }

  // Validate difficulty if provided
  if (filters.difficulty && !['easy', 'medium', 'hard'].includes(filters.difficulty)) {
    throw ApiError.badRequest('Invalid difficulty. Must be one of: easy, medium, hard');
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate sort field
  if (filters.sort) {
    const validSortFields = ['createdAt', 'difficulty', 'points', 'questionType'];
    const sortField = filters.sort.replace(/^-/, '');
    if (!validSortFields.includes(sortField)) {
      throw ApiError.badRequest(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`);
    }
  }

  // Get user info from auth middleware
  const user = (req as any).user;
  const userId = user.id;
  const userRole = user.role;
  const userDepartments = user.departments || [];

  const result = await QuestionsService.listQuestions(filters, userId, userRole, userDepartments);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/questions
 * Create a new question
 */
export const createQuestion = asyncHandler(async (req: Request, res: Response) => {
  const {
    questionText,
    questionType,
    options,
    correctAnswer,
    points,
    difficulty,
    tags,
    explanation,
    department
  } = req.body;

  // Validate required fields
  if (!questionText || typeof questionText !== 'string' || questionText.trim().length === 0) {
    throw ApiError.badRequest('Question text is required and must be a non-empty string');
  }

  if (questionText.length > 2000) {
    throw ApiError.badRequest('Question text cannot exceed 2000 characters');
  }

  if (!questionType || typeof questionType !== 'string') {
    throw ApiError.badRequest('Question type is required');
  }

  const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'];
  if (!validTypes.includes(questionType)) {
    throw ApiError.badRequest(`Invalid question type. Must be one of: ${validTypes.join(', ')}`);
  }

  if (points === undefined || typeof points !== 'number' || points < 0.1) {
    throw ApiError.badRequest('Points is required and must be at least 0.1');
  }

  // Validate options if provided
  if (options !== undefined) {
    if (!Array.isArray(options)) {
      throw ApiError.badRequest('Options must be an array');
    }

    for (const option of options) {
      if (!option.text || typeof option.text !== 'string' || option.text.trim().length === 0) {
        throw ApiError.badRequest('Each option must have a non-empty text field');
      }
      if (option.text.length > 500) {
        throw ApiError.badRequest('Option text cannot exceed 500 characters');
      }
      if (typeof option.isCorrect !== 'boolean') {
        throw ApiError.badRequest('Each option must have an isCorrect boolean field');
      }
    }
  }

  // Validate difficulty if provided
  if (difficulty !== undefined) {
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw ApiError.badRequest('Invalid difficulty. Must be one of: easy, medium, hard');
    }
  }

  // Validate tags if provided
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      throw ApiError.badRequest('Tags must be an array');
    }

    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        throw ApiError.badRequest('Each tag must be a non-empty string');
      }
      if (tag.length > 50) {
        throw ApiError.badRequest('Tag cannot exceed 50 characters');
      }
    }
  }

  // Validate explanation if provided
  if (explanation !== undefined) {
    if (typeof explanation !== 'string') {
      throw ApiError.badRequest('Explanation must be a string');
    }
    if (explanation.length > 1000) {
      throw ApiError.badRequest('Explanation cannot exceed 1000 characters');
    }
  }

  // Get user info from auth middleware
  const user = (req as any).user;
  const userId = user.id;

  const questionData = {
    questionText: questionText.trim(),
    questionType: questionType as any,
    options,
    correctAnswer,
    points,
    difficulty,
    tags,
    explanation,
    department,
    createdBy: userId
  };

  const result = await QuestionsService.createQuestion(questionData);
  res.status(201).json(ApiResponse.success(result, 'Question created successfully'));
});

/**
 * GET /api/v2/questions/:id
 * Get details of a specific question
 */
export const getQuestionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Get user info from auth middleware
  const user = (req as any).user;
  const userId = user.id;
  const userRole = user.role;
  const userDepartments = user.departments || [];

  const result = await QuestionsService.getQuestionById(id, userId, userRole, userDepartments);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/questions/:id
 * Update an existing question
 */
export const updateQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    questionText,
    questionType,
    options,
    correctAnswer,
    points,
    difficulty,
    tags,
    explanation,
    department
  } = req.body;

  // Validate questionText if provided
  if (questionText !== undefined) {
    if (typeof questionText !== 'string' || questionText.trim().length === 0) {
      throw ApiError.badRequest('Question text must be a non-empty string');
    }
    if (questionText.length > 2000) {
      throw ApiError.badRequest('Question text cannot exceed 2000 characters');
    }
  }

  // Validate questionType if provided
  if (questionType !== undefined) {
    if (typeof questionType !== 'string') {
      throw ApiError.badRequest('Question type must be a string');
    }
    const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'];
    if (!validTypes.includes(questionType)) {
      throw ApiError.badRequest(`Invalid question type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  // Validate options if provided
  if (options !== undefined) {
    if (!Array.isArray(options)) {
      throw ApiError.badRequest('Options must be an array');
    }

    for (const option of options) {
      if (!option.text || typeof option.text !== 'string' || option.text.trim().length === 0) {
        throw ApiError.badRequest('Each option must have a non-empty text field');
      }
      if (option.text.length > 500) {
        throw ApiError.badRequest('Option text cannot exceed 500 characters');
      }
      if (typeof option.isCorrect !== 'boolean') {
        throw ApiError.badRequest('Each option must have an isCorrect boolean field');
      }
    }
  }

  // Validate points if provided
  if (points !== undefined) {
    if (typeof points !== 'number' || points < 0.1) {
      throw ApiError.badRequest('Points must be at least 0.1');
    }
  }

  // Validate difficulty if provided
  if (difficulty !== undefined) {
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw ApiError.badRequest('Invalid difficulty. Must be one of: easy, medium, hard');
    }
  }

  // Validate tags if provided
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      throw ApiError.badRequest('Tags must be an array');
    }

    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        throw ApiError.badRequest('Each tag must be a non-empty string');
      }
      if (tag.length > 50) {
        throw ApiError.badRequest('Tag cannot exceed 50 characters');
      }
    }
  }

  // Validate explanation if provided
  if (explanation !== undefined) {
    if (typeof explanation !== 'string') {
      throw ApiError.badRequest('Explanation must be a string');
    }
    if (explanation.length > 1000) {
      throw ApiError.badRequest('Explanation cannot exceed 1000 characters');
    }
  }

  // Get user info from auth middleware
  const user = (req as any).user;
  const userId = user.id;
  const userRole = user.role;
  const userDepartments = user.departments || [];

  const updateData = {
    questionText: questionText !== undefined ? questionText.trim() : undefined,
    questionType,
    options,
    correctAnswer,
    points,
    difficulty,
    tags,
    explanation,
    department
  };

  const result = await QuestionsService.updateQuestion(id, updateData, userId, userRole, userDepartments);
  res.status(200).json(ApiResponse.success(result, 'Question updated successfully'));
});

/**
 * DELETE /api/v2/questions/:id
 * Delete a question (soft delete)
 */
export const deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Get user info from auth middleware
  const user = (req as any).user;
  const userId = user.id;
  const userRole = user.role;
  const userDepartments = user.departments || [];

  await QuestionsService.deleteQuestion(id, userId, userRole, userDepartments);
  res.status(200).json(ApiResponse.success(null, 'Question deleted successfully'));
});

/**
 * POST /api/v2/questions/bulk
 * Bulk import questions
 */
export const bulkImportQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { format, questions, department, overwriteExisting } = req.body;

  // Validate format
  if (!format || typeof format !== 'string') {
    throw ApiError.badRequest('Format is required');
  }

  if (!['json', 'csv'].includes(format)) {
    throw ApiError.badRequest('Invalid format. Must be one of: json, csv');
  }

  // Validate questions array
  if (!questions || !Array.isArray(questions)) {
    throw ApiError.badRequest('Questions must be an array');
  }

  if (questions.length === 0) {
    throw ApiError.badRequest('No questions provided for import');
  }

  if (questions.length > 1000) {
    throw ApiError.badRequest('Maximum 1000 questions per bulk import');
  }

  // Validate each question in the array
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    if (!q.questionText || typeof q.questionText !== 'string' || q.questionText.trim().length === 0) {
      throw ApiError.badRequest(`Question at index ${i}: questionText is required`);
    }

    if (q.questionText.length > 2000) {
      throw ApiError.badRequest(`Question at index ${i}: questionText cannot exceed 2000 characters`);
    }

    if (!q.questionType || typeof q.questionType !== 'string') {
      throw ApiError.badRequest(`Question at index ${i}: questionType is required`);
    }

    const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'];
    if (!validTypes.includes(q.questionType)) {
      throw ApiError.badRequest(`Question at index ${i}: invalid questionType`);
    }

    if (q.points === undefined || typeof q.points !== 'number' || q.points < 0.1) {
      throw ApiError.badRequest(`Question at index ${i}: points is required and must be at least 0.1`);
    }

    // Validate options if provided
    if (q.options !== undefined) {
      if (!Array.isArray(q.options)) {
        throw ApiError.badRequest(`Question at index ${i}: options must be an array`);
      }

      for (const option of q.options) {
        if (!option.text || typeof option.text !== 'string') {
          throw ApiError.badRequest(`Question at index ${i}: each option must have a text field`);
        }
        if (typeof option.isCorrect !== 'boolean') {
          throw ApiError.badRequest(`Question at index ${i}: each option must have an isCorrect field`);
        }
      }
    }

    // Validate difficulty if provided
    if (q.difficulty !== undefined && !['easy', 'medium', 'hard'].includes(q.difficulty)) {
      throw ApiError.badRequest(`Question at index ${i}: invalid difficulty level`);
    }

    // Validate tags if provided
    if (q.tags !== undefined) {
      if (!Array.isArray(q.tags)) {
        throw ApiError.badRequest(`Question at index ${i}: tags must be an array`);
      }
    }

    // Validate explanation if provided
    if (q.explanation !== undefined) {
      if (typeof q.explanation !== 'string') {
        throw ApiError.badRequest(`Question at index ${i}: explanation must be a string`);
      }
      if (q.explanation.length > 1000) {
        throw ApiError.badRequest(`Question at index ${i}: explanation cannot exceed 1000 characters`);
      }
    }
  }

  // Validate overwriteExisting if provided
  if (overwriteExisting !== undefined && typeof overwriteExisting !== 'boolean') {
    throw ApiError.badRequest('overwriteExisting must be a boolean');
  }

  // Get user info from auth middleware
  const user = (req as any).user;
  const userId = user.id;
  const userRole = user.role;
  const userDepartments = user.departments || [];

  const result = await QuestionsService.bulkImportQuestions(
    format as 'csv' | 'json',
    questions,
    department,
    overwriteExisting || false,
    userId,
    userRole,
    userDepartments
  );

  res.status(201).json(ApiResponse.success(result, 'Bulk import completed'));
});
