import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as retentionCheckController from '@/controllers/assessment/retention-check.controller';

const router = Router({ mergeParams: true });

/**
 * Retention Check Routes
 *
 * Base path: /api/v2/courses/:courseId/retention-checks/*
 *            /api/v2/courses/:courseId/remediations/*
 *
 * Implements retention check and remediation functionality for the flashcard system.
 * Retention checks verify learner knowledge after module completion.
 * Remediations are triggered when learners fail retention checks.
 *
 * All routes require authentication.
 *
 * @see API-ISS-013 Retention Check & Remediation System
 * @see contracts/api/flashcards.contract.ts
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// ============================================
// RETENTION CHECK ENDPOINTS
// ============================================

/**
 * GET /api/v2/courses/:courseId/retention-checks/pending
 *
 * Get pending retention checks for the current learner.
 * Returns checks that need to be completed before continuing course.
 *
 * Access Rights: content:courses:read
 *
 * Response:
 * - pendingChecks: Array<{
 *     checkId: string,
 *     sourceModuleId: string,
 *     sourceModuleName?: string,
 *     cardCount: number,
 *     triggeredAt: Date,
 *     isBlocking: boolean
 *   }>
 * - totalPending: number
 */
router.get(
  '/retention-checks/pending',
  authorize('content:courses:read'),
  retentionCheckController.getPendingChecks
);

/**
 * GET /api/v2/courses/:courseId/retention-checks/history
 *
 * Get retention check history for the current learner.
 *
 * Access Rights: content:courses:read
 *
 * Query params:
 * - moduleId?: string (filter by source module)
 * - page?: number (default: 1)
 * - limit?: number (default: 20, max: 100)
 *
 * Response:
 * - history: Array<{
 *     checkId: string,
 *     sourceModuleId: string,
 *     completedAt: Date,
 *     passed: boolean,
 *     correctCount: number,
 *     incorrectCount: number,
 *     remediationRequired: boolean,
 *     remediationStatus?: string
 *   }>
 * - pagination: { page, limit, total, totalPages }
 */
router.get(
  '/retention-checks/history',
  authorize('content:courses:read'),
  retentionCheckController.getRetentionHistory
);

/**
 * GET /api/v2/courses/:courseId/retention-checks/:checkId
 *
 * Get retention check cards for answering.
 * Marks the check as in_progress if it was pending.
 *
 * Access Rights: content:courses:read
 *
 * Response:
 * - checkId: string
 * - sourceModuleId: string
 * - failureThreshold: number
 * - cards: Array<{
 *     questionId: string,
 *     promptIndex: number,
 *     front: { text: string, media?: object },
 *     back: { text: string, media?: object }
 *   }>
 * - startedAt: Date
 */
router.get(
  '/retention-checks/:checkId',
  authorize('content:courses:read'),
  retentionCheckController.getRetentionCheck
);

/**
 * POST /api/v2/courses/:courseId/retention-checks/:checkId/submit
 *
 * Submit answers for a retention check.
 * Evaluates pass/fail and creates remediation if needed.
 *
 * Access Rights: content:courses:read
 *
 * Body:
 * - answers: Array<{
 *     questionId: string,
 *     correct: boolean,
 *     quality?: number (0-5),
 *     timeSpent?: number (ms)
 *   }>
 *
 * Response:
 * - checkId: string
 * - sourceModuleId: string
 * - passed: boolean
 * - correctCount: number
 * - incorrectCount: number
 * - failureThreshold: number
 * - remediationRequired: boolean
 * - remediation?: {
 *     remediationId: string,
 *     requireContentReview: boolean,
 *     requireFinalRetake: boolean,
 *     moduleId: string
 *   }
 */
router.post(
  '/retention-checks/:checkId/submit',
  authorize('content:courses:read'),
  retentionCheckController.submitRetentionCheck
);

// ============================================
// REMEDIATION ENDPOINTS
// ============================================

/**
 * GET /api/v2/courses/:courseId/remediations/active
 *
 * Get active remediations for the current learner.
 * Returns remediations that are blocking course progression.
 *
 * Access Rights: content:courses:read
 *
 * Response:
 * - remediations: Array<{
 *     remediationId: string,
 *     moduleId: string,
 *     moduleName?: string,
 *     triggeredAt: Date,
 *     triggeredByCheckId: string,
 *     status: string,
 *     requireContentReview: boolean,
 *     requireFinalRetake: boolean,
 *     contentReviewedAt: Date | null,
 *     finalRetakenAt: Date | null
 *   }>
 * - totalActive: number
 * - isBlocking: boolean
 */
router.get(
  '/remediations/active',
  authorize('content:courses:read'),
  retentionCheckController.getActiveRemediations
);

/**
 * GET /api/v2/courses/:courseId/remediations/:remediationId/status
 *
 * Get detailed status of a remediation.
 * Shows progress through each required step.
 *
 * Access Rights: content:courses:read
 *
 * Response:
 * - remediationId: string
 * - moduleId: string
 * - status: string
 * - steps: {
 *     contentReview: {
 *       required: boolean,
 *       completed: boolean,
 *       completedAt: Date | null,
 *       contentItems?: Array<{ itemId, title?, viewed }>
 *     },
 *     finalRetake: {
 *       required: boolean,
 *       completed: boolean,
 *       completedAt: Date | null,
 *       passed: boolean | null,
 *       attemptId: string | null
 *     }
 *   }
 * - nextStep: string | null
 * - completedAt: Date | null
 */
router.get(
  '/remediations/:remediationId/status',
  authorize('content:courses:read'),
  retentionCheckController.getRemediationStatus
);

/**
 * POST /api/v2/courses/:courseId/remediations/:remediationId/content-reviewed
 *
 * Mark content as reviewed for a remediation.
 * This completes the content review step.
 *
 * Access Rights: content:courses:read
 *
 * Body (optional):
 * - itemsViewed?: string[] (content item IDs that were viewed)
 *
 * Response:
 * - remediationId: string
 * - status: string
 * - contentReviewedAt: Date
 * - nextStep: string | null
 */
router.post(
  '/remediations/:remediationId/content-reviewed',
  authorize('content:courses:read'),
  retentionCheckController.markContentReviewed
);

/**
 * POST /api/v2/courses/:courseId/remediations/:remediationId/final-retake
 *
 * Link a final retake attempt to a remediation.
 * Called when a learner completes a final assessment retake.
 *
 * Access Rights: content:courses:read
 *
 * Body:
 * - attemptId: string (the exam attempt ID)
 * - passed: boolean (whether the learner passed)
 *
 * Response:
 * - remediationId: string
 * - status: string
 * - finalRetakenAt: Date
 * - finalPassed: boolean
 * - completedAt: Date | null
 * - nextStep: string | null
 */
router.post(
  '/remediations/:remediationId/final-retake',
  authorize('content:courses:read'),
  retentionCheckController.linkFinalRetake
);

export default router;
