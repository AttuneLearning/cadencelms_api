import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as adaptiveSelectionController from '@/controllers/progress/adaptive-selection.controller';

const router = Router();

/**
 * Adaptive Question Selection Routes
 * Base path: /api/v2/adaptive
 *
 * Provides intelligent, adaptive question selection based on learner proficiency,
 * question difficulty, and mastery-based learning principles.
 *
 * All routes require authentication.
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * POST /api/v2/adaptive/select-question
 * Select a single question adaptively based on learner proficiency
 *
 * Uses learner's current mastery level and question difficulty ratings to
 * select an appropriately challenging question. Implements spaced repetition
 * principles to optimize learning outcomes.
 *
 * Body:
 * - learnerId: string (required) - The learner's ID
 * - learningUnitId: string (required) - The learning unit (exercise/assessment) ID
 * - questionBankIds: string[] (optional) - Specific question banks to select from
 * - excludeQuestionIds: string[] (optional) - Questions to exclude from selection
 * - targetDifficulty: number (optional) - Override automatic difficulty selection (0-1)
 *
 * Returns:
 * - question: Question object with full details
 * - selectionReason: string explaining why this question was selected
 * - estimatedDifficulty: number (0-1) relative to learner's current level
 *
 * Permissions:
 * - learner:own:read - Learners selecting questions for themselves
 * - content:department:read - Staff selecting questions on behalf of learners
 */
router.post(
  '/select-question',
  authorize.anyOf(['learner:own:read', 'content:department:read']),
  adaptiveSelectionController.selectQuestion
);

/**
 * POST /api/v2/adaptive/select-questions
 * Select multiple questions adaptively for a learning session
 *
 * Selects a batch of questions with varying difficulty levels to create
 * a balanced learning experience. Considers question variety, topic coverage,
 * and progressive difficulty scaling.
 *
 * Body:
 * - learnerId: string (required) - The learner's ID
 * - learningUnitId: string (required) - The learning unit (exercise/assessment) ID
 * - count: number (required) - Number of questions to select (1-50)
 * - questionBankIds: string[] (optional) - Specific question banks to select from
 * - excludeQuestionIds: string[] (optional) - Questions to exclude from selection
 * - difficultyDistribution: object (optional) - Custom difficulty distribution
 *   - easy: number (percentage 0-100)
 *   - medium: number (percentage 0-100)
 *   - hard: number (percentage 0-100)
 *
 * Returns:
 * - questions: Question[] array with full details
 * - selectionMetadata: object containing:
 *   - totalAvailable: number of questions available after filtering
 *   - difficultyBreakdown: actual difficulty distribution of selected questions
 *   - topicCoverage: topics represented in selection
 *
 * Permissions:
 * - learner:own:read - Learners selecting questions for themselves
 * - content:department:read - Staff selecting questions on behalf of learners
 */
router.post(
  '/select-questions',
  authorize.anyOf(['learner:own:read', 'content:department:read']),
  adaptiveSelectionController.selectMultiple
);

/**
 * POST /api/v2/adaptive/record-response
 * Record a question response and update learner progress
 *
 * Records the learner's answer to a question, updates mastery tracking,
 * and adjusts difficulty calibration for future question selection.
 * Supports real-time progress updates during learning sessions.
 *
 * Body:
 * - learnerId: string (required) - The learner's ID
 * - learningUnitId: string (required) - The learning unit ID
 * - questionId: string (required) - The question being answered
 * - isCorrect: boolean (required) - Whether the answer was correct
 * - attemptId: string (optional) - Assessment attempt ID for tracking
 * - timeSpent: number (optional) - Time spent on question in seconds
 * - selectedAnswer: string (optional) - The answer the learner selected
 *
 * Returns:
 * - progress: Updated learner question progress record
 * - masteryUpdate: object containing:
 *   - previousMastery: number (0-1) before this response
 *   - currentMastery: number (0-1) after this response
 *   - masteryChange: number indicating improvement or decline
 * - nextRecommendation: object with suggested next action
 *
 * Permissions:
 * - learner:own:read - Learners recording their own responses
 * - content:department:read - Staff recording responses on behalf of learners
 */
router.post(
  '/record-response',
  authorize.anyOf(['learner:own:read', 'content:department:read']),
  adaptiveSelectionController.recordResponse
);

export default router;
