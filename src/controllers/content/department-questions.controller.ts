import { Request, Response } from 'express';
import { DepartmentQuestionsService } from '@/services/content/department-questions.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';

/**
 * Department Questions Controller
 *
 * Handles department-scoped question management endpoints.
 * Base path: /api/v2/departments/:departmentId/questions
 *
 * Related: Question Banks Contract (listDepartmentQuestions, createDepartmentQuestion, etc.)
 */

/**
 * GET /api/v2/departments/:departmentId/questions
 * List all questions in a department with filtering
 * Access Rights: content:assessments:manage, content:lessons:read
 *
 * Query params:
 * - type: string (multiple_choice, multiple_select, true_false, short_answer, long_answer, matching, flashcard, fill_in_blank)
 * - difficulty: string (easy, medium, hard)
 * - tags: string (comma-separated)
 * - search: string (search question text)
 * - bankId: ObjectId (filter by question bank)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const { type, difficulty, tags, search, bankId, page, limit, sort } = req.query;

  const result = await DepartmentQuestionsService.list(departmentId, {
    type: type as string | undefined,
    difficulty: difficulty as 'easy' | 'medium' | 'hard' | undefined,
    tags: tags as string | undefined,
    search: search as string | undefined,
    bankId: bankId as string | undefined,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
    sort: sort as string | undefined
  });

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/departments/:departmentId/questions
 * Create a new question in a department
 * Access Right: content:assessments:manage
 *
 * Body:
 * - questionBankIds: ObjectId[] (optional - question banks to add to)
 * - type: string (required)
 * - text: string (required, max 5000 chars)
 * - difficulty: string (optional, default: medium)
 * - tags: string[] (optional)
 * - points: number (required, min 1)
 * - explanation: string (optional, max 2000 chars)
 * - options: array (for choice types)
 * - acceptedAnswers: string[] (for short_answer)
 * - matchThreshold: number (for short_answer)
 * - sampleAnswer: string (for long_answer)
 * - rubric: string (for long_answer)
 * - pairs: array (for matching)
 * - cards: array (for flashcard)
 * - blanks: array (for fill_in_blank)
 * - hierarchy: object (optional - question relationships)
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const userId = (req as any).user?.id || (req as any).user?.userId;

  const result = await DepartmentQuestionsService.create(departmentId, req.body, userId);

  res.status(201).json(ApiResponse.success(result, 'Question created successfully'));
});

/**
 * GET /api/v2/departments/:departmentId/questions/:questionId
 * Get detailed information for a question
 * Access Rights: content:assessments:manage, content:lessons:read
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, questionId } = req.params;

  const result = await DepartmentQuestionsService.getById(departmentId, questionId);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/departments/:departmentId/questions/:questionId
 * Update an existing question
 * Access Right: content:assessments:manage
 *
 * Body: (all fields optional, same as create)
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, questionId } = req.params;

  const result = await DepartmentQuestionsService.update(departmentId, questionId, req.body);

  res.status(200).json(ApiResponse.success(result, 'Question updated successfully'));
});

/**
 * DELETE /api/v2/departments/:departmentId/questions/:questionId
 * Delete a question (soft delete)
 * Access Right: content:assessments:manage
 *
 * Note: Returns error with dependency list if question is linked to learning units
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, questionId } = req.params;

  await DepartmentQuestionsService.delete(departmentId, questionId);

  res.status(200).json(ApiResponse.success(null, 'Question deleted successfully'));
});

/**
 * PATCH /api/v2/departments/:departmentId/questions/bulk
 * Bulk update cognitive depth for multiple questions
 * Access Right: content:department:manage
 *
 * Body:
 * - questionIds: string[] (required - array of question IDs)
 * - updates: { cognitiveDepth: string } (required)
 */
export const bulkUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const { questionIds, updates } = req.body;

  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    res.status(400).json(ApiResponse.error('questionIds array is required', undefined, 'VALIDATION_ERROR'));
    return;
  }

  if (!updates || !updates.cognitiveDepth) {
    res.status(400).json(ApiResponse.error('updates.cognitiveDepth is required', undefined, 'VALIDATION_ERROR'));
    return;
  }

  const result = await DepartmentQuestionsService.bulkUpdateCognitiveDepth(
    departmentId,
    questionIds,
    updates.cognitiveDepth
  );

  res.status(200).json(ApiResponse.success(result));
});
