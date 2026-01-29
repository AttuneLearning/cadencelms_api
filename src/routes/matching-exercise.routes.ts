import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import * as matchingExerciseController from '@/controllers/content/matching-exercise.controller';

const router = Router();

/**
 * Matching Exercise Routes
 * Base path: /api/v2/content/exercises
 *
 * These routes handle matching exercise specific operations.
 * General exercise CRUD is handled by exercises.routes.ts
 *
 * All routes require authentication.
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * POST /api/v2/content/exercises/matching
 * Create a new matching exercise
 *
 * Body: {
 *   title: string (required)
 *   description?: string
 *   department: string (required)
 *   instructions?: string
 *   passingScore?: number (0-100, default 70)
 *   difficulty?: 'easy' | 'medium' | 'hard'
 *   questionIds: string[] (required, min 2)
 *   shuffleColumnB?: boolean (default true)
 *   allowPartialCredit?: boolean (default true)
 *   showFeedbackOnDrop?: boolean (default false)
 *   maxAttempts?: number (null = unlimited)
 *   timeLimit?: number (seconds, null = unlimited)
 *   columnALabel?: string
 *   columnBLabel?: string
 * }
 */
router.post('/matching', matchingExerciseController.createMatchingExercise);

/**
 * PUT /api/v2/content/exercises/:id/matching
 * Update a matching exercise
 *
 * Body: (all fields optional)
 *   Same as create, plus:
 *   status?: 'draft' | 'published' | 'archived'
 */
router.put('/:id/matching', matchingExerciseController.updateMatchingExercise);

/**
 * GET /api/v2/content/exercises/:id/matching-session
 * Get a matching session for the exercise
 *
 * Creates a new session if none exists, or returns existing active session.
 * Returns shuffled Column B for the learner to match.
 *
 * Response: {
 *   sessionId: string
 *   exerciseId: string
 *   title: string
 *   instructions: string | null
 *   timeLimit: number | null
 *   attemptsRemaining: number | null
 *   columnALabel: string | null
 *   columnBLabel: string | null
 *   columnA: Array<{ id, text, media }>
 *   columnB: Array<{ id, text, media }> (shuffled)
 *   showFeedbackOnDrop: boolean
 *   startedAt: string
 *   expiresAt: string
 * }
 */
router.get('/:id/matching-session', matchingExerciseController.getMatchingSession);

/**
 * POST /api/v2/content/exercises/:id/matching-result
 * Submit matching result
 *
 * Body: {
 *   sessionId: string (required)
 *   matches: Array<{ columnAId: string, columnBId: string }> (required)
 *   timeSpent: number (seconds, required)
 * }
 *
 * Response: {
 *   attemptId: string
 *   score: number
 *   passed: boolean
 *   correctCount: number
 *   totalPairs: number
 *   results: Array<{
 *     columnAId: string
 *     matchedColumnBId: string
 *     correctColumnBId: string
 *     correct: boolean
 *     columnAText: string
 *     matchedText: string
 *     correctText: string
 *     explanation: string | null
 *   }>
 *   attemptsRemaining: number | null
 * }
 */
router.post('/:id/matching-result', matchingExerciseController.submitMatchingResult);

/**
 * GET /api/v2/content/exercises/:id/matching-attempts
 * Get matching attempt history for the current learner
 *
 * Query: page, limit
 *
 * Response: {
 *   exerciseId: string
 *   exerciseTitle: string
 *   learnerId: string
 *   totalAttempts: number
 *   bestScore: number | null
 *   hasPassed: boolean
 *   attemptsRemaining: number | null
 *   attempts: Array<{
 *     attemptId, attemptNumber, score, correctCount, totalPairs, passed, timeSpent, submittedAt
 *   }>
 *   pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 * }
 */
router.get('/:id/matching-attempts', matchingExerciseController.getMatchingAttempts);

/**
 * GET /api/v2/content/exercises/matching-attempts/:attemptId
 * Get detailed results for a specific attempt
 *
 * Response: {
 *   attemptId, exerciseId, exerciseTitle, attemptNumber, score, correctCount,
 *   totalPairs, passed, allowPartialCredit, passingScore, timeSpent,
 *   startedAt, submittedAt, results: [...]
 * }
 */
router.get('/matching-attempts/:attemptId', matchingExerciseController.getAttemptDetails);

/**
 * DELETE /api/v2/content/exercises/matching-sessions/:sessionId
 * Abandon an active matching session
 */
router.delete('/matching-sessions/:sessionId', matchingExerciseController.abandonMatchingSession);

export default router;
