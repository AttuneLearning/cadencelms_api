import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import {
  validateCreateAssignment,
  validateUpdateAssignment,
  validateCreateSubmission,
  validateUpdateDraft,
  validateGradeSubmission,
  validateReturnSubmission,
  validateListSubmissions
} from '@/validators/assignment.validator';
import * as assignmentController from '@/controllers/assignment/assignment.controller';
import * as submissionController from '@/controllers/assignment/assignmentSubmission.controller';

/**
 * Assignment Routes
 *
 * Two routers:
 * 1. assignmentRouter - /api/v2/assignments
 * 2. submissionRouter - /api/v2/submissions
 *
 * Permissions:
 * - content:courses:manage — assignment CRUD (staff)
 * - content:courses:read — submission creation/viewing (learners)
 */

// ── Assignment endpoints ──
export const assignmentRouter = Router();
assignmentRouter.use(isAuthenticated);

assignmentRouter.post(
  '/',
  authorize('content:courses:manage'),
  validateCreateAssignment,
  assignmentController.createAssignment
);

assignmentRouter.get(
  '/:assignmentId',
  authorize('content:courses:read'),
  assignmentController.getAssignment
);

assignmentRouter.put(
  '/:assignmentId',
  authorize('content:courses:manage'),
  validateUpdateAssignment,
  assignmentController.updateAssignment
);

assignmentRouter.delete(
  '/:assignmentId',
  authorize('content:courses:manage'),
  assignmentController.deleteAssignment
);

// Nested submissions under assignment
assignmentRouter.get(
  '/:assignmentId/submissions',
  authorize('content:courses:read'),
  validateListSubmissions,
  submissionController.listSubmissions
);

assignmentRouter.post(
  '/:assignmentId/submissions',
  authorize('content:courses:read'),
  validateCreateSubmission,
  submissionController.createSubmission
);

// ── Submission-level endpoints ──
export const submissionRouter = Router();
submissionRouter.use(isAuthenticated);

submissionRouter.get(
  '/:submissionId',
  authorize('content:courses:read'),
  submissionController.getSubmission
);

submissionRouter.put(
  '/:submissionId',
  authorize('content:courses:read'),
  validateUpdateDraft,
  submissionController.updateDraft
);

submissionRouter.post(
  '/:submissionId/submit',
  authorize('content:courses:read'),
  submissionController.submitSubmission
);

submissionRouter.post(
  '/:submissionId/grade',
  authorize('content:courses:manage'),
  validateGradeSubmission,
  submissionController.gradeSubmission
);

submissionRouter.post(
  '/:submissionId/return',
  authorize('content:courses:manage'),
  validateReturnSubmission,
  submissionController.returnSubmission
);
