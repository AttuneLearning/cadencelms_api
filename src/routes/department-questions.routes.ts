import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as departmentQuestionsController from '@/controllers/content/department-questions.controller';

const router = Router({ mergeParams: true });

/**
 * Department Questions Routes
 * Base path: /api/v2/departments/:departmentId/questions
 *
 * Department-scoped question management endpoints.
 * Questions can belong to multiple question banks and are reusable across learning units.
 *
 * Related: Question Banks Contract (listDepartmentQuestions, createDepartmentQuestion, etc.)
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/departments/:departmentId/questions
 * List all questions in a department with filtering
 * Access Rights: content:assessments:manage OR content:lessons:read
 *
 * Query params:
 * - type: string (multiple_choice, multiple_select, true_false, short_answer, long_answer, matching, flashcard, fill_in_blank)
 * - difficulty: string (easy, medium, hard)
 * - tags: string (comma-separated)
 * - search: string (search question text)
 * - bankId: ObjectId (filter by question bank)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - sort: string (default: -createdAt)
 */
router.get('/',
  authorize.anyOf(['content:assessments:manage', 'content:lessons:read']),
  departmentQuestionsController.list
);

/**
 * POST /api/v2/departments/:departmentId/questions
 * Create a new question in a department
 * Access Right: content:assessments:manage
 *
 * Body:
 * - questionBankIds: ObjectId[] (optional - question banks to add to)
 * - type: string (required - multiple_choice, multiple_select, true_false, short_answer, long_answer, matching, flashcard, fill_in_blank)
 * - text: string (required, max 5000 chars)
 * - difficulty: string (optional - easy, medium, hard, default: medium)
 * - tags: string[] (optional)
 * - points: number (required, min 1)
 * - explanation: string (optional, max 2000 chars)
 * - options: array (required for multiple_choice, multiple_select, true_false)
 * - acceptedAnswers: string[] (required for short_answer)
 * - matchThreshold: number (optional for short_answer, default from settings)
 * - sampleAnswer: string (optional for long_answer)
 * - rubric: string (optional for long_answer)
 * - pairs: array (required for matching)
 * - cards: array (required for flashcard)
 * - blanks: array (required for fill_in_blank)
 * - hierarchy: object (optional - question relationships for adaptive testing)
 */
router.post('/',
  authorize('content:assessments:manage'),
  departmentQuestionsController.create
);

/**
 * GET /api/v2/departments/:departmentId/questions/:questionId
 * Get detailed information for a question
 * Access Rights: content:assessments:manage OR content:lessons:read
 */
router.get('/:questionId',
  authorize.anyOf(['content:assessments:manage', 'content:lessons:read']),
  departmentQuestionsController.getById
);

/**
 * PUT /api/v2/departments/:departmentId/questions/:questionId
 * Update an existing question
 * Access Right: content:assessments:manage
 *
 * Body: (all fields optional, same as create)
 */
router.put('/:questionId',
  authorize('content:assessments:manage'),
  departmentQuestionsController.update
);

/**
 * DELETE /api/v2/departments/:departmentId/questions/:questionId
 * Delete a question (soft delete)
 * Access Right: content:assessments:manage
 *
 * Note: Cannot delete questions linked to learning units.
 * Returns error with dependency list if question has dependencies.
 */
router.delete('/:questionId',
  authorize('content:assessments:manage'),
  departmentQuestionsController.remove
);

/**
 * PATCH /api/v2/departments/:departmentId/questions/bulk
 * Bulk update cognitive depth for multiple questions
 * Access Right: content:department:manage
 *
 * Body:
 * - questionIds: string[] (required - array of question IDs)
 * - updates: { cognitiveDepth: string } (required - cognitive depth slug)
 */
router.patch('/bulk',
  authorize('content:department:manage'),
  departmentQuestionsController.bulkUpdate
);

export default router;
