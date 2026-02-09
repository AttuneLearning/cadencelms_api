import { Request, Response } from 'express';
import { AssignmentSubmissionService } from '@/services/assignment/assignmentSubmission.service';
import { authorize } from '@/middlewares/authorize';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

export const createSubmission = asyncHandler(async (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  const user = (req as any).user;
  const { enrollmentId, ...rest } = req.body;

  const submission = await AssignmentSubmissionService.createSubmission(
    assignmentId,
    rest,
    user.userId,
    enrollmentId
  );
  res.status(201).json(ApiResponse.success(submission, 'Submission created successfully'));
});

export const updateDraft = asyncHandler(async (req: Request, res: Response) => {
  const { submissionId } = req.params;
  const user = (req as any).user;

  const submission = await AssignmentSubmissionService.updateDraft(submissionId, req.body, user.userId);
  res.status(200).json(ApiResponse.success(submission, 'Draft updated successfully'));
});

export const submitSubmission = asyncHandler(async (req: Request, res: Response) => {
  const { submissionId } = req.params;
  const user = (req as any).user;

  const submission = await AssignmentSubmissionService.submitSubmission(submissionId, user.userId);
  res.status(200).json(ApiResponse.success(submission, 'Submission submitted successfully'));
});

export const getSubmission = asyncHandler(async (req: Request, res: Response) => {
  const { submissionId } = req.params;
  const user = (req as any).user;

  const submission = await AssignmentSubmissionService.getSubmission(submissionId);

  // Staff can view any submission; learners can only view their own
  const canManage = await authorize.check(user, 'content:courses:manage');
  if (!canManage && submission.learnerId.toString() !== user.userId) {
    throw ApiError.forbidden('You do not have permission to view this submission');
  }

  res.status(200).json(ApiResponse.success(submission));
});

export const listSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  const filters = {
    learnerId: req.query.learnerId as string,
    status: req.query.status as string,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20
  };

  const result = await AssignmentSubmissionService.listSubmissions(assignmentId, filters);
  res.status(200).json(ApiResponse.success(result));
});

export const gradeSubmission = asyncHandler(async (req: Request, res: Response) => {
  const { submissionId } = req.params;
  const user = (req as any).user;

  const submission = await AssignmentSubmissionService.gradeSubmission(
    submissionId,
    req.body,
    user.userId
  );
  res.status(200).json(ApiResponse.success(submission, 'Submission graded successfully'));
});

export const returnSubmission = asyncHandler(async (req: Request, res: Response) => {
  const { submissionId } = req.params;
  const user = (req as any).user;

  const submission = await AssignmentSubmissionService.returnSubmission(
    submissionId,
    req.body,
    user.userId
  );
  res.status(200).json(ApiResponse.success(submission, 'Submission returned successfully'));
});
