import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as questionsController from '@/controllers/content/questions.controller';

const router = Router();

/**
 * Questions Routes
 * Base path: /api/v2/questions
 *
 * All routes require authentication
 * Permissions: read:questions, write:questions
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/questions
 * List questions with filtering and pagination
 * Permissions: read:questions
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 100)
 * - questionType: string (multiple_choice, true_false, short_answer, essay, fill_blank)
 * - tag: string
 * - difficulty: string (easy, medium, hard)
 * - search: string
 * - department: ObjectId
 * - sort: string (default: -createdAt)
 */
router.get('/', questionsController.listQuestions);

/**
 * POST /api/v2/questions/bulk
 * Bulk import questions (must be before /:id to avoid route conflict)
 * Permissions: write:questions
 *
 * Body:
 * - format: string (json, csv)
 * - questions: array
 * - department: ObjectId (optional)
 * - overwriteExisting: boolean (optional, default: false)
 */
router.post('/bulk', questionsController.bulkImportQuestions);

/**
 * POST /api/v2/questions
 * Create a new question
 * Permissions: write:questions
 *
 * Body:
 * - questionText: string (required, max 2000 chars)
 * - questionType: string (required)
 * - options: array (required for multiple_choice and true_false)
 * - correctAnswer: string | string[] (required for some types)
 * - points: number (required, min 0.1)
 * - difficulty: string (optional, default: medium)
 * - tags: string[] (optional)
 * - explanation: string (optional, max 1000 chars)
 * - department: ObjectId (optional)
 */
router.post('/', questionsController.createQuestion);

/**
 * GET /api/v2/questions/:id
 * Get details of a specific question
 * Permissions: read:questions
 *
 * Response includes:
 * - All question details
 * - usageCount: number of question banks using this question
 * - lastUsed: date when question was last included in an assessment
 */
router.get('/:id', questionsController.getQuestionById);

/**
 * PUT /api/v2/questions/:id
 * Update an existing question
 * Permissions: write:questions
 *
 * Body: (all fields optional)
 * - questionText: string
 * - questionType: string
 * - options: array
 * - correctAnswer: string | string[]
 * - points: number
 * - difficulty: string
 * - tags: string[]
 * - explanation: string
 * - department: ObjectId
 *
 * Note: Cannot update questions in use in active assessments
 */
router.put('/:id', questionsController.updateQuestion);

/**
 * DELETE /api/v2/questions/:id
 * Delete a question (soft delete)
 * Permissions: write:questions
 *
 * Note: Cannot delete questions in use in assessments
 */
router.delete('/:id', questionsController.deleteQuestion);

export default router;
