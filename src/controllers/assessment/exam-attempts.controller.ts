import { Request, Response } from 'express';
import { ExamAttemptsService } from '@/services/assessment/exam-attempts.service';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Exam Attempts Controller
 * Handles all exam attempt endpoints
 */

/**
 * GET /api/v2/exam-attempts
 * List exam attempts with filters
 */
export const listAttempts = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  const filters = {
    learnerId: req.query.learnerId as string | undefined,
    examId: req.query.examId as string | undefined,
    status: req.query.status as string | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate status if provided
  const validStatuses = ['started', 'in_progress', 'submitted', 'grading', 'graded'];
  if (filters.status && !validStatuses.includes(filters.status)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  const result = await ExamAttemptsService.listAttempts(filters, user.userId);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * POST /api/v2/exam-attempts
 * Create a new exam attempt
 */
export const createAttempt = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { examId } = req.body;

  // Validate required fields
  if (!examId || typeof examId !== 'string') {
    throw ApiError.badRequest('examId is required and must be a string');
  }

  const data = { examId };

  const result = await ExamAttemptsService.createAttempt(data, user.userId);

  res.status(201).json({
    success: true,
    message: 'Exam attempt started successfully',
    data: result
  });
});

/**
 * GET /api/v2/exam-attempts/:id
 * Get exam attempt details by ID
 */
export const getAttempt = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Attempt ID is required');
  }

  const result = await ExamAttemptsService.getAttemptById(id, user.userId);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * POST /api/v2/exam-attempts/:id/answers
 * Submit answers for questions
 */
export const submitAnswers = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { answers } = req.body;

  // Validate required fields
  if (!id) {
    throw ApiError.badRequest('Attempt ID is required');
  }

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    throw ApiError.badRequest('answers is required and must be a non-empty array');
  }

  // Validate each answer
  for (const answer of answers) {
    if (!answer.questionId || typeof answer.questionId !== 'string') {
      throw ApiError.badRequest('Each answer must have a valid questionId string');
    }

    if (answer.answer === undefined || answer.answer === null) {
      throw ApiError.badRequest('Each answer must have an answer value');
    }

    // Validate answer format (string or array of strings)
    if (typeof answer.answer !== 'string' && !Array.isArray(answer.answer)) {
      throw ApiError.badRequest('Answer must be a string or array of strings');
    }

    if (Array.isArray(answer.answer)) {
      for (const item of answer.answer) {
        if (typeof item !== 'string') {
          throw ApiError.badRequest('All items in answer array must be strings');
        }
      }
    }
  }

  const data = { answers };

  const result = await ExamAttemptsService.submitAnswers(id, data, user.userId);

  res.status(200).json({
    success: true,
    message: 'Answers saved successfully',
    data: result
  });
});

/**
 * POST /api/v2/exam-attempts/:id/submit
 * Submit exam for grading
 */
export const submitExam = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { confirmSubmit } = req.body;

  if (!id) {
    throw ApiError.badRequest('Attempt ID is required');
  }

  // Validate confirmSubmit if provided
  if (confirmSubmit !== undefined && typeof confirmSubmit !== 'boolean') {
    throw ApiError.badRequest('confirmSubmit must be a boolean');
  }

  // Default to true if not provided
  const confirmed = confirmSubmit !== undefined ? confirmSubmit : true;

  if (!confirmed) {
    throw ApiError.badRequest('Submission must be confirmed');
  }

  const result = await ExamAttemptsService.submitExam(id, user.userId);

  res.status(200).json({
    success: true,
    message: 'Exam submitted successfully',
    data: result
  });
});

/**
 * GET /api/v2/exam-attempts/:id/results
 * Get exam results with feedback
 */
export const getResults = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Attempt ID is required');
  }

  const result = await ExamAttemptsService.getResults(id, user.userId);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * POST /api/v2/exam-attempts/:id/grade
 * Manual grading by instructor
 */
export const gradeExam = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { questionGrades, overallFeedback, notifyLearner } = req.body;

  // Validate required fields
  if (!id) {
    throw ApiError.badRequest('Attempt ID is required');
  }

  if (!questionGrades || !Array.isArray(questionGrades) || questionGrades.length === 0) {
    throw ApiError.badRequest('questionGrades is required and must be a non-empty array');
  }

  // Validate each question grade
  for (const grade of questionGrades) {
    if (!grade.questionId || typeof grade.questionId !== 'string') {
      throw ApiError.badRequest('Each grade must have a valid questionId string');
    }

    if (typeof grade.scoreEarned !== 'number' || grade.scoreEarned < 0) {
      throw ApiError.badRequest('scoreEarned must be a non-negative number');
    }

    if (grade.feedback !== undefined && typeof grade.feedback !== 'string') {
      throw ApiError.badRequest('feedback must be a string');
    }

    if (grade.feedback && grade.feedback.length > 2000) {
      throw ApiError.badRequest('feedback cannot exceed 2000 characters');
    }
  }

  // Validate overallFeedback if provided
  if (overallFeedback !== undefined) {
    if (typeof overallFeedback !== 'string') {
      throw ApiError.badRequest('overallFeedback must be a string');
    }
    if (overallFeedback.length > 5000) {
      throw ApiError.badRequest('overallFeedback cannot exceed 5000 characters');
    }
  }

  // Validate notifyLearner if provided
  if (notifyLearner !== undefined && typeof notifyLearner !== 'boolean') {
    throw ApiError.badRequest('notifyLearner must be a boolean');
  }

  const data = {
    questionGrades,
    overallFeedback,
    notifyLearner: notifyLearner !== undefined ? notifyLearner : true
  };

  const result = await ExamAttemptsService.gradeExam(id, data, user.userId);

  res.status(200).json({
    success: true,
    message: 'Exam attempt graded successfully',
    data: result
  });
});

/**
 * GET /api/v2/exam-attempts/exam/:examId
 * List all attempts for a specific exam
 */
export const listByExam = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { examId } = req.params;

  if (!examId) {
    throw ApiError.badRequest('Exam ID is required');
  }

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    status: req.query.status as string | undefined,
    passed: req.query.passed as string | undefined,
    sort: req.query.sort as string | undefined
  };

  // Validate status if provided
  const validStatuses = ['started', 'in_progress', 'submitted', 'grading', 'graded'];
  if (filters.status && !validStatuses.includes(filters.status)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  const result = await ExamAttemptsService.listByExam(examId, filters, user.userId);

  res.status(200).json({
    success: true,
    data: result
  });
});
