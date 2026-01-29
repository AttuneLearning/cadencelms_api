import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as flashcardController from '@/controllers/assessment/flashcard.controller';

const router = Router({ mergeParams: true });

/**
 * Flashcard Routes
 *
 * Base path: /api/v2/courses/:courseId/flashcard-*
 *
 * Implements flashcard-based spaced repetition learning using the SM-2 algorithm.
 * Flashcards are built from Questions with 'flashcard' in their questionTypes array.
 *
 * All routes require authentication.
 *
 * @see API-ISS-010 Flashcard System Implementation
 * @see dev_communication/specs/learning/FLASHCARD_FLOW_SPEC.md
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// ============================================
// CONFIGURATION ENDPOINTS
// ============================================

/**
 * GET /api/v2/courses/:courseId/flashcard-config
 *
 * Get flashcard configuration for a course.
 * Returns default values if no custom configuration exists.
 *
 * Access Rights: content:courses:read
 *
 * Response:
 * - courseId: string
 * - enabled: boolean
 * - flashcardsPerCheck: number
 * - failureThreshold: number
 * - checkFrequency: string
 * - checkFrequencyValue?: number
 * - selectionMethod: string
 * - requireContentReview: boolean
 * - requireFinalRetake: boolean
 * - includeOnlyCompletedModules: boolean
 * - masteryThreshold: number
 * - masteryIntervalDays: number
 * - defaultSessionSize: number
 * - maxSessionSize: number
 */
router.get(
  '/flashcard-config',
  authorize('content:courses:read'),
  flashcardController.getCourseConfig
);

/**
 * PUT /api/v2/courses/:courseId/flashcard-config
 *
 * Update flashcard configuration for a course.
 * Creates configuration if it doesn't exist.
 *
 * Access Rights: content:courses:manage
 *
 * Body (all fields optional):
 * - enabled: boolean
 * - flashcardsPerCheck: number (0-50)
 * - failureThreshold: number (1-10)
 * - checkFrequency: 'every_module' | 'every_n_modules' | 'custom'
 * - checkFrequencyValue: number (1-100)
 * - selectionMethod: 'random' | 'weighted_by_difficulty' | 'sm2_priority'
 * - requireContentReview: boolean
 * - requireFinalRetake: boolean
 * - includeOnlyCompletedModules: boolean
 * - masteryThreshold: number (1-10)
 * - masteryIntervalDays: number (1-365)
 * - defaultSessionSize: number (1-100)
 * - maxSessionSize: number (1-100)
 */
router.put(
  '/flashcard-config',
  authorize('content:courses:manage'),
  flashcardController.updateCourseConfig
);

// ============================================
// SESSION ENDPOINTS
// ============================================

/**
 * GET /api/v2/courses/:courseId/flashcard-session
 *
 * Get a flashcard practice session for the current user.
 * Selects cards based on SM-2 priority (due cards first).
 *
 * Access Rights: content:courses:read
 *
 * Query params:
 * - moduleId?: ObjectId (filter cards by module)
 * - sessionSize?: number (override default, max from config)
 *
 * Response:
 * - courseId: string
 * - moduleId?: string
 * - sessionSize: number
 * - cards: Array<{
 *     questionId: string
 *     promptIndex: number
 *     front: { text: string, media?: object }
 *     back: { text: string, media?: object }
 *     explanation?: string
 *     hints?: string[]
 *     difficulty?: string
 *     progress?: {
 *       timesCorrect: number
 *       timesIncorrect: number
 *       lastReviewed: Date | null
 *       mastered: boolean
 *     }
 *   }>
 * - stats: {
 *     totalCards: number
 *     dueCards: number
 *     masteredCards: number
 *     newCards: number
 *   }
 */
router.get(
  '/flashcard-session',
  authorize('content:courses:read'),
  flashcardController.getFlashcardSession
);

// ============================================
// RESULT RECORDING ENDPOINTS
// ============================================

/**
 * POST /api/v2/courses/:courseId/flashcard-result
 *
 * Record the result of a flashcard review.
 * Updates learner progress using SM-2 algorithm.
 *
 * Access Rights: content:courses:read
 *
 * Body:
 * - questionId: ObjectId (required)
 * - promptIndex: number (required, which prompt variation was shown)
 * - isCorrect: boolean (required)
 * - quality?: number (0-5, optional SM-2 quality rating)
 *
 * Response:
 * - questionId: string
 * - promptIndex: number
 * - isCorrect: boolean
 * - newInterval: number (days until next review)
 * - nextReviewDate: Date
 * - mastered: boolean
 * - masteredAt?: Date
 */
router.post(
  '/flashcard-result',
  authorize('content:courses:read'),
  flashcardController.recordFlashcardResult
);

// ============================================
// PROGRESS ENDPOINTS
// ============================================

/**
 * GET /api/v2/courses/:courseId/flashcard-progress
 *
 * Get flashcard progress summary for the current user.
 *
 * Access Rights: content:courses:read
 *
 * Response:
 * - courseId: string
 * - learnerId: string
 * - totalCards: number
 * - masteredCards: number
 * - dueCards: number
 * - totalReviews: number
 * - accuracy: number (percentage)
 * - streakDays: number
 * - lastStudied: Date | null
 * - cardProgress: Array<{
 *     questionId: string
 *     promptIndex: number
 *     timesCorrect: number
 *     timesIncorrect: number
 *     interval: number
 *     nextReviewDate: Date | null
 *     mastered: boolean
 *   }>
 */
router.get(
  '/flashcard-progress',
  authorize('content:courses:read'),
  flashcardController.getFlashcardProgress
);

/**
 * DELETE /api/v2/courses/:courseId/flashcard-progress
 *
 * Reset flashcard progress for the current user.
 * This clears all progress and allows starting fresh.
 *
 * Access Rights: content:courses:read
 *
 * Query params:
 * - questionId?: ObjectId (optional, reset only specific question)
 *
 * Response:
 * - deletedCount: number
 */
router.delete(
  '/flashcard-progress',
  authorize('content:courses:read'),
  flashcardController.resetFlashcardProgress
);

export default router;
