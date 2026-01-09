import { Request, Response } from 'express';
import { TemplatesService } from '@/services/content/templates.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Templates Controller
 * Handles all /api/v2/templates endpoints
 */

/**
 * GET /api/v2/templates
 * List templates with optional filtering and pagination
 */
export const listTemplates = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
    type: req.query.type as 'master' | 'department' | 'custom' | undefined,
    department: req.query.department as string | undefined,
    status: req.query.status as 'active' | 'draft' | undefined,
    search: req.query.search as string | undefined,
    sort: req.query.sort as string | undefined
  };

  // Validate pagination
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate type
  if (filters.type && !['master', 'department', 'custom'].includes(filters.type)) {
    throw ApiError.badRequest('Invalid type. Must be one of: master, department, custom');
  }

  // Validate status
  if (filters.status && !['active', 'draft'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, draft');
  }

  // Get user ID from authenticated request (if available)
  const userId = (req as any).user?.id;

  const result = await TemplatesService.listTemplates(filters, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/templates
 * Create a new template
 */
export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { name, type, css, html, department, isGlobal, status } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw ApiError.badRequest('Template name is required');
  }

  if (name.length > 200) {
    throw ApiError.badRequest('Template name cannot exceed 200 characters');
  }

  if (!type || typeof type !== 'string') {
    throw ApiError.badRequest('Template type is required');
  }

  if (!['master', 'department', 'custom'].includes(type)) {
    throw ApiError.badRequest('Invalid template type. Must be one of: master, department, custom');
  }

  // Validate CSS length
  if (css !== undefined && css !== null) {
    if (typeof css !== 'string') {
      throw ApiError.badRequest('CSS must be a string');
    }
    if (css.length > 50000) {
      throw ApiError.badRequest('CSS content cannot exceed 50000 characters');
    }
  }

  // Validate HTML length
  if (html !== undefined && html !== null) {
    if (typeof html !== 'string') {
      throw ApiError.badRequest('HTML must be a string');
    }
    if (html.length > 100000) {
      throw ApiError.badRequest('HTML content cannot exceed 100000 characters');
    }
  }

  // Validate department for department templates
  if (type === 'department' && !department) {
    throw ApiError.badRequest('Department is required for department templates');
  }

  // Validate status
  if (status && !['active', 'draft'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, draft');
  }

  // Validate isGlobal
  if (isGlobal !== undefined && typeof isGlobal !== 'boolean') {
    throw ApiError.badRequest('isGlobal must be a boolean');
  }

  // Get user ID from authenticated request
  const userId = (req as any).user?.id;
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const templateData = {
    name: name.trim(),
    type: type as any,
    css,
    html,
    department,
    isGlobal,
    status: status || 'draft',
    createdBy: userId
  };

  const result = await TemplatesService.createTemplate(templateData);
  res.status(201).json(ApiResponse.success(result, 'Template created successfully'));
});

/**
 * GET /api/v2/templates/:id
 * Get template details by ID
 */
export const getTemplateById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Template ID is required');
  }

  const result = await TemplatesService.getTemplateById(id);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/templates/:id
 * Update template information
 */
export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, css, html, status, isGlobal } = req.body;

  if (!id) {
    throw ApiError.badRequest('Template ID is required');
  }

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw ApiError.badRequest('Template name cannot be empty');
    }
    if (name.length > 200) {
      throw ApiError.badRequest('Template name cannot exceed 200 characters');
    }
  }

  // Validate CSS length if provided
  if (css !== undefined && css !== null) {
    if (typeof css !== 'string') {
      throw ApiError.badRequest('CSS must be a string');
    }
    if (css.length > 50000) {
      throw ApiError.badRequest('CSS content cannot exceed 50000 characters');
    }
  }

  // Validate HTML length if provided
  if (html !== undefined && html !== null) {
    if (typeof html !== 'string') {
      throw ApiError.badRequest('HTML must be a string');
    }
    if (html.length > 100000) {
      throw ApiError.badRequest('HTML content cannot exceed 100000 characters');
    }
  }

  // Validate status if provided
  if (status && !['active', 'draft'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, draft');
  }

  // Validate isGlobal if provided
  if (isGlobal !== undefined && typeof isGlobal !== 'boolean') {
    throw ApiError.badRequest('isGlobal must be a boolean');
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name.trim();
  if (css !== undefined) updateData.css = css;
  if (html !== undefined) updateData.html = html;
  if (status !== undefined) updateData.status = status;
  if (isGlobal !== undefined) updateData.isGlobal = isGlobal;

  const result = await TemplatesService.updateTemplate(id, updateData);
  res.status(200).json(ApiResponse.success(result, 'Template updated successfully'));
});

/**
 * DELETE /api/v2/templates/:id
 * Delete template (soft delete)
 */
export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Template ID is required');
  }

  const force = req.query.force === 'true';

  const result = await TemplatesService.deleteTemplate(id, force);
  res.status(200).json(ApiResponse.success(result, 'Template deleted successfully'));
});

/**
 * POST /api/v2/templates/:id/duplicate
 * Duplicate an existing template
 */
export const duplicateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, type, department, status } = req.body;

  if (!id) {
    throw ApiError.badRequest('Template ID is required');
  }

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw ApiError.badRequest('Template name cannot be empty');
    }
    if (name.length > 200) {
      throw ApiError.badRequest('Template name cannot exceed 200 characters');
    }
  }

  // Validate type if provided
  if (type && !['master', 'department', 'custom'].includes(type)) {
    throw ApiError.badRequest('Invalid template type. Must be one of: master, department, custom');
  }

  // Validate status if provided
  if (status && !['active', 'draft'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, draft');
  }

  // Get user ID from authenticated request
  const userId = (req as any).user?.id;
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const options = {
    name,
    type: type as any,
    department,
    status,
    createdBy: userId
  };

  const result = await TemplatesService.duplicateTemplate(id, options);
  res.status(201).json(ApiResponse.success(result, 'Template duplicated successfully'));
});

/**
 * GET /api/v2/templates/:id/preview
 * Preview template with sample data
 */
export const previewTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Template ID is required');
  }

  const courseTitle = req.query.courseTitle as string | undefined;
  const courseCode = req.query.courseCode as string | undefined;
  const format = (req.query.format as 'html' | 'json') || 'html';

  // Validate format
  if (!['html', 'json'].includes(format)) {
    throw ApiError.badRequest('Invalid format. Must be one of: html, json');
  }

  const result = await TemplatesService.previewTemplate(id, courseTitle, courseCode, format);

  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(result);
  } else {
    res.status(200).json(ApiResponse.success(result));
  }
});
