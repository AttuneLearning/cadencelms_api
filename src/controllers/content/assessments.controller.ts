import { Request, Response } from 'express';
import { AssessmentsService } from '@/services/content/assessments.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import {
  validateCreateAssessment,
  validateUpdateAssessment
} from '@/validators/assessment.validator';

/**
 * Assessments Controller
 * Handles all assessment management endpoints (quizzes and exams)
 */

interface AssessmentAccessContext {
  userRole: string;
  userDepartments: string[];
}

function getAssessmentAccessContext(req: Request): AssessmentAccessContext {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('No authenticated user context');
  }

  const legacyDepartments = Array.isArray(user.departments)
    ? user.departments.map((departmentId: unknown) => String(departmentId))
    : [];

  const membershipDepartments = Array.isArray(user.departmentMemberships)
    ? user.departmentMemberships
      .map((membership: any) => membership?.departmentId)
      .filter((departmentId: unknown): departmentId is string => typeof departmentId === 'string')
    : [];

  const userDepartments = legacyDepartments.length > 0 ? legacyDepartments : membershipDepartments;
  const userRole = typeof user.role === 'string'
    ? user.role
    : Array.isArray(user.userTypes) && user.userTypes.includes('global-admin')
      ? 'admin'
      : 'staff';

  return { userRole, userDepartments };
}

/**
 * GET /api/v2/assessments
 * List assessments with filtering and pagination
 */
export const listAssessments = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    departmentId: req.query.departmentId as string | undefined,
    style: req.query.style as 'quiz' | 'exam' | undefined,
    isPublished: req.query.isPublished !== undefined
      ? req.query.isPublished === 'true'
      : undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    sort: req.query.sort as string | undefined
  };

  // Validate style if provided
  if (filters.style && !['quiz', 'exam'].includes(filters.style)) {
    throw ApiError.badRequest('Invalid style. Must be one of: quiz, exam');
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate sort field
  if (filters.sort) {
    const validSortFields = ['createdAt', 'title', 'style', 'updatedAt'];
    const sortField = filters.sort.replace(/^-/, '');
    if (!validSortFields.includes(sortField)) {
      throw ApiError.badRequest(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`);
    }
  }

  const { userRole, userDepartments } = getAssessmentAccessContext(req);

  const result = await AssessmentsService.listAssessments(filters, userRole, userDepartments);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/assessments/:assessmentId
 * Get details of a specific assessment
 */
export const getAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { assessmentId } = req.params;

  if (!assessmentId) {
    throw ApiError.badRequest('Assessment ID is required');
  }

  const { userRole, userDepartments } = getAssessmentAccessContext(req);

  const result = await AssessmentsService.getAssessment(assessmentId, userRole, userDepartments);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/assessments
 * Create a new assessment
 */
export const createAssessment = asyncHandler(async (req: Request, res: Response) => {
  const {
    departmentId,
    title,
    description,
    style,
    questionSelection,
    timing,
    attempts,
    scoring,
    feedback
  } = req.body;

  const user = (req as any).user;
  const userId = user.userId || user.id;

  const assessmentData = {
    departmentId,
    title,
    description,
    style,
    questionSelection,
    timing,
    attempts,
    scoring,
    feedback
  };

  const result = await AssessmentsService.createAssessment(assessmentData, userId);
  res.status(201).json(ApiResponse.success(result, 'Assessment created successfully'));
});

/**
 * PUT /api/v2/assessments/:assessmentId
 * Update an existing assessment
 */
export const updateAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { assessmentId } = req.params;
  const {
    title,
    description,
    style,
    questionSelection,
    timing,
    attempts,
    scoring,
    feedback
  } = req.body;

  if (!assessmentId) {
    throw ApiError.badRequest('Assessment ID is required');
  }

  const { userRole, userDepartments } = getAssessmentAccessContext(req);

  const updateData = {
    title,
    description,
    style,
    questionSelection,
    timing,
    attempts,
    scoring,
    feedback
  };

  const result = await AssessmentsService.updateAssessment(
    assessmentId,
    updateData,
    userRole,
    userDepartments
  );
  res.status(200).json(ApiResponse.success(result, 'Assessment updated successfully'));
});

/**
 * DELETE /api/v2/assessments/:assessmentId
 * Delete an assessment (soft delete)
 */
export const deleteAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { assessmentId } = req.params;

  if (!assessmentId) {
    throw ApiError.badRequest('Assessment ID is required');
  }

  const { userRole, userDepartments } = getAssessmentAccessContext(req);

  await AssessmentsService.deleteAssessment(assessmentId, userRole, userDepartments);
  res.status(200).json(ApiResponse.success(null, 'Assessment deleted successfully'));
});

/**
 * POST /api/v2/assessments/:assessmentId/publish
 * Publish an assessment to make it available
 */
export const publishAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { assessmentId } = req.params;

  if (!assessmentId) {
    throw ApiError.badRequest('Assessment ID is required');
  }

  const { userRole, userDepartments } = getAssessmentAccessContext(req);

  const result = await AssessmentsService.publishAssessment(assessmentId, userRole, userDepartments);
  res.status(200).json(ApiResponse.success(result, 'Assessment published successfully'));
});

/**
 * POST /api/v2/assessments/:assessmentId/archive
 * Archive an assessment (soft delete)
 */
export const archiveAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { assessmentId } = req.params;

  if (!assessmentId) {
    throw ApiError.badRequest('Assessment ID is required');
  }

  const { userRole, userDepartments } = getAssessmentAccessContext(req);

  const result = await AssessmentsService.archiveAssessment(assessmentId, userRole, userDepartments);
  res.status(200).json(ApiResponse.success(result, 'Assessment archived successfully'));
});

// Export validators for use in routes
export { validateCreateAssessment, validateUpdateAssessment };
