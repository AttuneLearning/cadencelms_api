import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import * as assessmentAttemptsController from '@/controllers/progress/assessment-attempts.controller';
import { validateGradeQuestion } from '@/validators/assessment-attempt.validator';

const router = Router();

/**
 * Assessment Attempts Global Routes
 * Base path: /api/v2/assessment-attempts
 *
 * Canonical staff-facing aggregate and attemptId-only grading/detail endpoints.
 */

router.use(isAuthenticated);

/**
 * GET /api/v2/assessment-attempts
 * Staff aggregate attempt list/search/filter across assessments.
 */
router.get('/', assessmentAttemptsController.listAttemptSummaries);

/**
 * GET /api/v2/assessment-attempts/:attemptId
 * Staff attempt detail by attemptId.
 */
router.get('/:attemptId', assessmentAttemptsController.getAttemptById);

/**
 * POST /api/v2/assessment-attempts/:attemptId/grade
 * Staff grading action by attemptId.
 */
router.post('/:attemptId/grade', validateGradeQuestion, assessmentAttemptsController.gradeAttemptById);

export default router;
