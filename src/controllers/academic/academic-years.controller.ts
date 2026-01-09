import { Request, Response } from 'express';
import { AcademicYearsService } from '@/services/academic/academic-years.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Academic Years Controller
 * Handles all academic calendar endpoints (years, terms, cohorts)
 */

/**
 * =====================
 * ACADEMIC YEARS
 * =====================
 */

/**
 * GET /api/v2/calendar/years
 * List all academic years
 */
export const listYears = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    isCurrent: req.query.isCurrent === 'true' ? true : req.query.isCurrent === 'false' ? false : undefined,
    status: req.query.status as 'active' | 'past' | 'future' | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate status if provided
  if (filters.status && !['active', 'past', 'future'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, past, future');
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  const result = await AcademicYearsService.listAcademicYears(filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/calendar/years
 * Create a new academic year
 */
export const createYear = asyncHandler(async (req: Request, res: Response) => {
  const { name, startDate, endDate, isCurrent } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw ApiError.badRequest('Name is required and must be a non-empty string');
  }

  if (name.length > 100) {
    throw ApiError.badRequest('Name cannot exceed 100 characters');
  }

  if (!startDate) {
    throw ApiError.badRequest('Start date is required');
  }

  if (!endDate) {
    throw ApiError.badRequest('End date is required');
  }

  // Validate dates
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  if (isNaN(startDateObj.getTime())) {
    throw ApiError.badRequest('Start date must be a valid ISO 8601 date');
  }

  if (isNaN(endDateObj.getTime())) {
    throw ApiError.badRequest('End date must be a valid ISO 8601 date');
  }

  // Validate isCurrent if provided
  if (isCurrent !== undefined && typeof isCurrent !== 'boolean') {
    throw ApiError.badRequest('isCurrent must be a boolean');
  }

  const yearData = {
    name: name.trim(),
    startDate: startDateObj,
    endDate: endDateObj,
    isCurrent
  };

  const result = await AcademicYearsService.createAcademicYear(yearData);
  res.status(201).json(ApiResponse.success(result, 'Academic year created successfully'));
});

/**
 * GET /api/v2/calendar/years/:id
 * Get details of a specific academic year
 */
export const getYear = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const includeTerms = req.query.includeTerms === 'true';

  const result = await AcademicYearsService.getAcademicYearById(id, includeTerms);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/calendar/years/:id
 * Update an academic year
 */
export const updateYear = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, startDate, endDate, isCurrent } = req.body;

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw ApiError.badRequest('Name must be a non-empty string');
    }
    if (name.length > 100) {
      throw ApiError.badRequest('Name cannot exceed 100 characters');
    }
  }

  // Validate dates if provided
  let startDateObj: Date | undefined;
  let endDateObj: Date | undefined;

  if (startDate !== undefined) {
    startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      throw ApiError.badRequest('Start date must be a valid ISO 8601 date');
    }
  }

  if (endDate !== undefined) {
    endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      throw ApiError.badRequest('End date must be a valid ISO 8601 date');
    }
  }

  // Validate isCurrent if provided
  if (isCurrent !== undefined && typeof isCurrent !== 'boolean') {
    throw ApiError.badRequest('isCurrent must be a boolean');
  }

  const updateData = {
    name: name !== undefined ? name.trim() : undefined,
    startDate: startDateObj,
    endDate: endDateObj,
    isCurrent
  };

  const result = await AcademicYearsService.updateAcademicYear(id, updateData);
  res.status(200).json(ApiResponse.success(result, 'Academic year updated successfully'));
});

/**
 * DELETE /api/v2/calendar/years/:id
 * Delete an academic year
 */
export const deleteYear = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await AcademicYearsService.deleteAcademicYear(id);
  res.status(200).json(ApiResponse.success(null, 'Academic year deleted successfully'));
});

/**
 * =====================
 * ACADEMIC TERMS
 * =====================
 */

/**
 * GET /api/v2/calendar/terms
 * List all academic terms
 */
export const listTerms = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    academicYear: req.query.academicYear as string | undefined,
    termType: req.query.termType as string | undefined,
    status: req.query.status as 'active' | 'past' | 'future' | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate termType if provided
  const validTermTypes = ['fall', 'spring', 'summer', 'winter', 'quarter1', 'quarter2', 'quarter3', 'quarter4', 'custom'];
  if (filters.termType && !validTermTypes.includes(filters.termType)) {
    throw ApiError.badRequest(`Invalid term type. Must be one of: ${validTermTypes.join(', ')}`);
  }

  // Validate status if provided
  if (filters.status && !['active', 'past', 'future'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, past, future');
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  const result = await AcademicYearsService.listAcademicTerms(filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/calendar/terms
 * Create a new academic term
 */
export const createTerm = asyncHandler(async (req: Request, res: Response) => {
  const { name, academicYear, startDate, endDate, termType } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw ApiError.badRequest('Name is required and must be a non-empty string');
  }

  if (name.length > 100) {
    throw ApiError.badRequest('Name cannot exceed 100 characters');
  }

  if (!academicYear || typeof academicYear !== 'string') {
    throw ApiError.badRequest('Academic year ID is required');
  }

  if (!startDate) {
    throw ApiError.badRequest('Start date is required');
  }

  if (!endDate) {
    throw ApiError.badRequest('End date is required');
  }

  if (!termType || typeof termType !== 'string') {
    throw ApiError.badRequest('Term type is required');
  }

  // Validate termType
  const validTermTypes = ['fall', 'spring', 'summer', 'winter', 'quarter1', 'quarter2', 'quarter3', 'quarter4', 'custom'];
  if (!validTermTypes.includes(termType)) {
    throw ApiError.badRequest(`Invalid term type. Must be one of: ${validTermTypes.join(', ')}`);
  }

  // Validate dates
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  if (isNaN(startDateObj.getTime())) {
    throw ApiError.badRequest('Start date must be a valid ISO 8601 date');
  }

  if (isNaN(endDateObj.getTime())) {
    throw ApiError.badRequest('End date must be a valid ISO 8601 date');
  }

  const termData = {
    name: name.trim(),
    academicYear,
    startDate: startDateObj,
    endDate: endDateObj,
    termType
  };

  const result = await AcademicYearsService.createAcademicTerm(termData);
  res.status(201).json(ApiResponse.success(result, 'Academic term created successfully'));
});

/**
 * GET /api/v2/calendar/terms/:id
 * Get details of a specific academic term
 */
export const getTerm = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const includeClasses = req.query.includeClasses === 'true';

  const result = await AcademicYearsService.getAcademicTermById(id, includeClasses);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/calendar/terms/:id
 * Update an academic term
 */
export const updateTerm = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, startDate, endDate, termType } = req.body;

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw ApiError.badRequest('Name must be a non-empty string');
    }
    if (name.length > 100) {
      throw ApiError.badRequest('Name cannot exceed 100 characters');
    }
  }

  // Validate termType if provided
  if (termType !== undefined) {
    const validTermTypes = ['fall', 'spring', 'summer', 'winter', 'quarter1', 'quarter2', 'quarter3', 'quarter4', 'custom'];
    if (!validTermTypes.includes(termType)) {
      throw ApiError.badRequest(`Invalid term type. Must be one of: ${validTermTypes.join(', ')}`);
    }
  }

  // Validate dates if provided
  let startDateObj: Date | undefined;
  let endDateObj: Date | undefined;

  if (startDate !== undefined) {
    startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      throw ApiError.badRequest('Start date must be a valid ISO 8601 date');
    }
  }

  if (endDate !== undefined) {
    endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      throw ApiError.badRequest('End date must be a valid ISO 8601 date');
    }
  }

  const updateData = {
    name: name !== undefined ? name.trim() : undefined,
    startDate: startDateObj,
    endDate: endDateObj,
    termType
  };

  const result = await AcademicYearsService.updateAcademicTerm(id, updateData);
  res.status(200).json(ApiResponse.success(result, 'Academic term updated successfully'));
});

/**
 * DELETE /api/v2/calendar/terms/:id
 * Delete an academic term
 */
export const deleteTerm = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await AcademicYearsService.deleteAcademicTerm(id);
  res.status(200).json(ApiResponse.success(null, 'Academic term deleted successfully'));
});

/**
 * =====================
 * COHORTS
 * =====================
 */

/**
 * GET /api/v2/calendar/cohorts
 * List all cohorts
 */
export const listCohorts = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    academicYear: req.query.academicYear as string | undefined,
    program: req.query.program as string | undefined,
    level: req.query.level as string | undefined,
    status: req.query.status as 'active' | 'graduated' | 'inactive' | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate status if provided
  if (filters.status && !['active', 'graduated', 'inactive'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, graduated, inactive');
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  const result = await AcademicYearsService.listCohorts(filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/calendar/cohorts
 * Create a new cohort
 */
export const createCohort = asyncHandler(async (req: Request, res: Response) => {
  const { name, code, academicYear, program, level, startYear, endYear, description } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw ApiError.badRequest('Name is required and must be a non-empty string');
  }

  if (name.length > 100) {
    throw ApiError.badRequest('Name cannot exceed 100 characters');
  }

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    throw ApiError.badRequest('Code is required and must be a non-empty string');
  }

  // Validate code pattern
  const codePattern = /^[A-Z0-9-]+$/;
  if (!codePattern.test(code)) {
    throw ApiError.badRequest('Code must contain only uppercase letters, numbers, and hyphens');
  }

  if (!academicYear || typeof academicYear !== 'string') {
    throw ApiError.badRequest('Academic year ID is required');
  }

  if (!program || typeof program !== 'string') {
    throw ApiError.badRequest('Program ID is required');
  }

  if (startYear === undefined || typeof startYear !== 'number') {
    throw ApiError.badRequest('Start year is required and must be a number');
  }

  if (startYear < 1900 || startYear > 2200) {
    throw ApiError.badRequest('Start year must be between 1900 and 2200');
  }

  if (endYear === undefined || typeof endYear !== 'number') {
    throw ApiError.badRequest('End year is required and must be a number');
  }

  if (endYear < 1900 || endYear > 2200) {
    throw ApiError.badRequest('End year must be between 1900 and 2200');
  }

  // Validate description if provided
  if (description !== undefined && typeof description !== 'string') {
    throw ApiError.badRequest('Description must be a string');
  }

  if (description && description.length > 500) {
    throw ApiError.badRequest('Description cannot exceed 500 characters');
  }

  const cohortData = {
    name: name.trim(),
    code: code.trim().toUpperCase(),
    academicYear,
    program,
    level: level !== undefined ? String(level).trim() : undefined,
    startYear,
    endYear,
    description: description !== undefined ? description.trim() : undefined
  };

  const result = await AcademicYearsService.createCohort(cohortData);
  res.status(201).json(ApiResponse.success(result, 'Cohort created successfully'));
});

/**
 * GET /api/v2/calendar/cohorts/:id
 * Get details of a specific cohort
 */
export const getCohort = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const includeLearners = req.query.includeLearners === 'true';

  const result = await AcademicYearsService.getCohortById(id, includeLearners);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/calendar/cohorts/:id
 * Update a cohort
 */
export const updateCohort = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code, academicYear, level, endYear, status, description } = req.body;

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw ApiError.badRequest('Name must be a non-empty string');
    }
    if (name.length > 100) {
      throw ApiError.badRequest('Name cannot exceed 100 characters');
    }
  }

  // Validate code if provided
  if (code !== undefined) {
    if (typeof code !== 'string' || code.trim().length === 0) {
      throw ApiError.badRequest('Code must be a non-empty string');
    }
    const codePattern = /^[A-Z0-9-]+$/;
    if (!codePattern.test(code)) {
      throw ApiError.badRequest('Code must contain only uppercase letters, numbers, and hyphens');
    }
  }

  // Validate academicYear if provided
  if (academicYear !== undefined && typeof academicYear !== 'string') {
    throw ApiError.badRequest('Academic year ID must be a string');
  }

  // Validate endYear if provided
  if (endYear !== undefined) {
    if (typeof endYear !== 'number') {
      throw ApiError.badRequest('End year must be a number');
    }
    if (endYear < 1900 || endYear > 2200) {
      throw ApiError.badRequest('End year must be between 1900 and 2200');
    }
  }

  // Validate status if provided
  if (status !== undefined && !['active', 'graduated', 'inactive'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, graduated, inactive');
  }

  // Validate description if provided
  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw ApiError.badRequest('Description must be a string');
    }
    if (description.length > 500) {
      throw ApiError.badRequest('Description cannot exceed 500 characters');
    }
  }

  const updateData = {
    name: name !== undefined ? name.trim() : undefined,
    code: code !== undefined ? code.trim().toUpperCase() : undefined,
    academicYear,
    level: level !== undefined ? String(level).trim() : undefined,
    endYear,
    status,
    description: description !== undefined ? description.trim() : undefined
  };

  const result = await AcademicYearsService.updateCohort(id, updateData);
  res.status(200).json(ApiResponse.success(result, 'Cohort updated successfully'));
});

/**
 * DELETE /api/v2/calendar/cohorts/:id
 * Delete a cohort
 */
export const deleteCohort = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await AcademicYearsService.deleteCohort(id);
  res.status(200).json(ApiResponse.success(null, 'Cohort deleted successfully'));
});
