import { Request, Response } from 'express';
import { ExercisesService } from '@/services/content/exercises.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Exercises Controller
 * Handles all /api/v2/content/exercises endpoints
 */

/**
 * GET /api/v2/content/exercises
 * List exercises with optional filtering and pagination
 */
export const listExercises = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
    type: req.query.type as 'quiz' | 'exam' | 'practice' | 'assessment' | undefined,
    department: req.query.department as string | undefined,
    difficulty: req.query.difficulty as 'easy' | 'medium' | 'hard' | undefined,
    search: req.query.search as string | undefined,
    sort: req.query.sort as string | undefined,
    status: req.query.status as 'draft' | 'published' | 'archived' | undefined
  };

  // Validate pagination
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate type
  if (filters.type && !['quiz', 'exam', 'practice', 'assessment'].includes(filters.type)) {
    throw ApiError.badRequest('Invalid type. Must be one of: quiz, exam, practice, assessment');
  }

  // Validate difficulty
  if (filters.difficulty && !['easy', 'medium', 'hard'].includes(filters.difficulty)) {
    throw ApiError.badRequest('Invalid difficulty. Must be one of: easy, medium, hard');
  }

  // Validate status
  if (filters.status && !['draft', 'published', 'archived'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: draft, published, archived');
  }

  const result = await ExercisesService.listExercises(filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/content/exercises
 * Create a new exercise
 */
export const createExercise = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    type,
    department,
    difficulty,
    timeLimit,
    passingScore,
    shuffleQuestions,
    showFeedback,
    allowReview,
    instructions
  } = req.body;

  // Validate required fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw ApiError.badRequest('Title is required');
  }

  if (title.length > 200) {
    throw ApiError.badRequest('Title cannot exceed 200 characters');
  }

  if (!type || !['quiz', 'exam', 'practice', 'assessment'].includes(type)) {
    throw ApiError.badRequest('Valid type is required (quiz, exam, practice, assessment)');
  }

  if (!department || typeof department !== 'string') {
    throw ApiError.badRequest('Department ID is required');
  }

  // Validate optional fields
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      throw ApiError.badRequest('Description must be a string');
    }
    if (description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }
  }

  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    throw ApiError.badRequest('Invalid difficulty. Must be one of: easy, medium, hard');
  }

  if (timeLimit !== undefined) {
    const timeLimitNum = parseInt(timeLimit as any, 10);
    if (isNaN(timeLimitNum) || timeLimitNum < 0) {
      throw ApiError.badRequest('Time limit must be a non-negative number');
    }
  }

  if (passingScore !== undefined) {
    const passingScoreNum = parseInt(passingScore as any, 10);
    if (isNaN(passingScoreNum) || passingScoreNum < 0 || passingScoreNum > 100) {
      throw ApiError.badRequest('Passing score must be between 0 and 100');
    }
  }

  // Get user ID from request (set by auth middleware)
  const createdBy = (req as any).user?.id || (req as any).user?._id;
  if (!createdBy) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const exerciseData = {
    title: title.trim(),
    description: description?.trim(),
    type,
    department,
    difficulty,
    timeLimit: timeLimit !== undefined ? parseInt(timeLimit as any, 10) : undefined,
    passingScore: passingScore !== undefined ? parseInt(passingScore as any, 10) : undefined,
    shuffleQuestions,
    showFeedback,
    allowReview,
    instructions: instructions?.trim(),
    createdBy: createdBy.toString()
  };

  const result = await ExercisesService.createExercise(exerciseData);
  res.status(201).json(ApiResponse.success(result, 'Exercise created successfully'));
});

/**
 * GET /api/v2/content/exercises/:id
 * Get exercise details by ID
 */
export const getExerciseById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  const result = await ExercisesService.getExerciseById(id);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/content/exercises/:id
 * Update exercise information
 */
export const updateExercise = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    title,
    description,
    type,
    difficulty,
    timeLimit,
    passingScore,
    shuffleQuestions,
    showFeedback,
    allowReview,
    instructions,
    status
  } = req.body;

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  // Validate title if provided
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw ApiError.badRequest('Title cannot be empty');
    }
    if (title.length > 200) {
      throw ApiError.badRequest('Title cannot exceed 200 characters');
    }
  }

  // Validate description if provided
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      throw ApiError.badRequest('Description must be a string');
    }
    if (description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }
  }

  // Validate type if provided
  if (type && !['quiz', 'exam', 'practice', 'assessment'].includes(type)) {
    throw ApiError.badRequest('Invalid type. Must be one of: quiz, exam, practice, assessment');
  }

  // Validate difficulty if provided
  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    throw ApiError.badRequest('Invalid difficulty. Must be one of: easy, medium, hard');
  }

  // Validate timeLimit if provided
  if (timeLimit !== undefined) {
    const timeLimitNum = parseInt(timeLimit as any, 10);
    if (isNaN(timeLimitNum) || timeLimitNum < 0) {
      throw ApiError.badRequest('Time limit must be a non-negative number');
    }
  }

  // Validate passingScore if provided
  if (passingScore !== undefined) {
    const passingScoreNum = parseInt(passingScore as any, 10);
    if (isNaN(passingScoreNum) || passingScoreNum < 0 || passingScoreNum > 100) {
      throw ApiError.badRequest('Passing score must be between 0 and 100');
    }
  }

  // Validate status if provided
  if (status && !['draft', 'published', 'archived'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: draft, published, archived');
  }

  const updateData: any = {};
  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description?.trim();
  if (type !== undefined) updateData.type = type;
  if (difficulty !== undefined) updateData.difficulty = difficulty;
  if (timeLimit !== undefined) updateData.timeLimit = parseInt(timeLimit as any, 10);
  if (passingScore !== undefined) updateData.passingScore = parseInt(passingScore as any, 10);
  if (shuffleQuestions !== undefined) updateData.shuffleQuestions = shuffleQuestions;
  if (showFeedback !== undefined) updateData.showFeedback = showFeedback;
  if (allowReview !== undefined) updateData.allowReview = allowReview;
  if (instructions !== undefined) updateData.instructions = instructions?.trim();
  if (status !== undefined) updateData.status = status;

  const result = await ExercisesService.updateExercise(id, updateData);
  res.status(200).json(ApiResponse.success(result, 'Exercise updated successfully'));
});

/**
 * DELETE /api/v2/content/exercises/:id
 * Delete exercise (soft delete)
 */
export const deleteExercise = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  await ExercisesService.deleteExercise(id);
  res.status(200).json(ApiResponse.success(null, 'Exercise deleted successfully'));
});

/**
 * GET /api/v2/content/exercises/:id/questions
 * Get all questions in an exercise
 */
export const getExerciseQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const includeAnswers = req.query.includeAnswers === 'true';

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  const result = await ExercisesService.getExerciseQuestions(id, includeAnswers);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/content/exercises/:id/questions
 * Add a question to an exercise
 */
export const addQuestionToExercise = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    questionId,
    questionText,
    questionType,
    options,
    correctAnswer,
    points,
    order,
    explanation,
    difficulty,
    tags
  } = req.body;

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  // Validate points if provided
  if (points !== undefined) {
    const pointsNum = parseInt(points as any, 10);
    if (isNaN(pointsNum) || pointsNum < 0) {
      throw ApiError.badRequest('Points must be a non-negative number');
    }
  }

  // Validate order if provided
  if (order !== undefined) {
    const orderNum = parseInt(order as any, 10);
    if (isNaN(orderNum) || orderNum < 1) {
      throw ApiError.badRequest('Order must be at least 1');
    }
  }

  // Get department from user or request
  const user = (req as any).user;
  const departmentId = user?.departmentId || user?.department;

  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  const questionData = {
    questionId,
    questionText,
    questionType,
    options,
    correctAnswer,
    points: points !== undefined ? parseInt(points as any, 10) : undefined,
    order: order !== undefined ? parseInt(order as any, 10) : undefined,
    explanation,
    difficulty,
    tags
  };

  const result = await ExercisesService.addQuestionToExercise(
    id,
    questionData,
    departmentId.toString()
  );
  res.status(201).json(ApiResponse.success(result, 'Question added successfully'));
});

/**
 * POST /api/v2/content/exercises/:id/questions/bulk
 * Bulk add questions to an exercise
 */
export const bulkAddQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { questions, mode } = req.body;

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  if (!Array.isArray(questions)) {
    throw ApiError.badRequest('Questions must be an array');
  }

  if (questions.length === 0) {
    throw ApiError.badRequest('Questions array cannot be empty');
  }

  if (questions.length > 100) {
    throw ApiError.badRequest('Cannot add more than 100 questions at once');
  }

  if (mode && !['append', 'replace'].includes(mode)) {
    throw ApiError.badRequest('Invalid mode. Must be one of: append, replace');
  }

  // Get department from user
  const user = (req as any).user;
  const departmentId = user?.departmentId || user?.department;

  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  const bulkData = {
    questions,
    mode: mode || 'append'
  };

  const result = await ExercisesService.bulkAddQuestions(id, bulkData, departmentId.toString());

  const message = result.failed > 0
    ? `${result.added} questions added successfully, ${result.failed} failed`
    : `${result.added} questions added successfully`;

  res.status(201).json(ApiResponse.success(result, message));
});

/**
 * DELETE /api/v2/content/exercises/:id/questions/:questionId
 * Remove a question from an exercise
 */
export const removeQuestionFromExercise = asyncHandler(async (req: Request, res: Response) => {
  const { id, questionId } = req.params;

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  if (!questionId) {
    throw ApiError.badRequest('Question ID is required');
  }

  const result = await ExercisesService.removeQuestionFromExercise(id, questionId);
  res.status(200).json(ApiResponse.success(result, 'Question removed from exercise'));
});

/**
 * PATCH /api/v2/content/exercises/:id/questions/reorder
 * Reorder questions in an exercise
 */
export const reorderExerciseQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { questionIds } = req.body;

  if (!id) {
    throw ApiError.badRequest('Exercise ID is required');
  }

  if (!Array.isArray(questionIds)) {
    throw ApiError.badRequest('questionIds must be an array');
  }

  if (questionIds.length === 0) {
    throw ApiError.badRequest('questionIds array cannot be empty');
  }

  const result = await ExercisesService.reorderExerciseQuestions(id, questionIds);
  res.status(200).json(ApiResponse.success(result, 'Questions reordered successfully'));
});
