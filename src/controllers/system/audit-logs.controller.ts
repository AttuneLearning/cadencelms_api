import { Request, Response } from 'express';
import { AuditLogsService } from '@/services/system/audit-logs.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Audit Logs Controller
 * Handles all /api/v2/audit-logs endpoints
 */

/**
 * GET /api/v2/audit-logs
 * List audit logs with advanced filtering
 */
export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    userId: req.query.userId as string | undefined,
    action: req.query.action as string | undefined,
    entityType: req.query.entityType as string | undefined,
    entityId: req.query.entityId as string | undefined,
    departmentId: req.query.departmentId as string | undefined,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    ipAddress: req.query.ipAddress as string | undefined,
    statusCode: req.query.statusCode ? parseInt(req.query.statusCode as string, 10) : undefined,
    success: req.query.success !== undefined ? req.query.success === 'true' : undefined,
    search: req.query.search as string | undefined,
    sort: req.query.sort as string | undefined
  };

  // Validate pagination
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (filters.limit < 1 || filters.limit > 500) {
    throw ApiError.badRequest('Limit must be between 1 and 500');
  }

  // Validate action enum
  const validActions = [
    'create', 'read', 'update', 'delete',
    'login', 'logout', 'login_failed',
    'enroll', 'withdraw', 'complete',
    'grade', 'publish', 'unpublish',
    'archive', 'restore',
    'upload', 'download', 'export',
    'permission_change', 'role_change',
    'password_reset', 'password_change',
    'start_content', 'complete_content',
    'submit_assessment', 'grade_assessment'
  ];

  if (filters.action && !validActions.includes(filters.action)) {
    throw ApiError.badRequest('Invalid action type');
  }

  // Validate entityType enum
  const validEntityTypes = [
    'user', 'staff', 'learner',
    'course', 'class', 'program',
    'enrollment', 'class-enrollment',
    'content', 'scorm', 'exercise',
    'assessment', 'exam-result',
    'department', 'academic-year',
    'setting', 'permission'
  ];

  if (filters.entityType && !validEntityTypes.includes(filters.entityType)) {
    throw ApiError.badRequest('Invalid entity type');
  }

  // Validate dates
  if (filters.startDate && isNaN(filters.startDate.getTime())) {
    throw ApiError.badRequest('Invalid start date format');
  }

  if (filters.endDate && isNaN(filters.endDate.getTime())) {
    throw ApiError.badRequest('Invalid end date format');
  }

  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    throw ApiError.badRequest('Start date must be before end date');
  }

  const userId = (req as any).user?.id;
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await AuditLogsService.listAuditLogs(filters, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/audit-logs/:id
 * Get specific audit log entry
 */
export const getAuditLogById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Audit log ID is required');
  }

  // Validate ObjectId format
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw ApiError.badRequest('Invalid audit log ID format');
  }

  const userId = (req as any).user?.id;
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await AuditLogsService.getAuditLogById(id, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/audit-logs/user/:userId
 * Get user's activity audit trail
 */
export const getUserActivity = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    throw ApiError.badRequest('User ID is required');
  }

  // Validate ObjectId format
  if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
    throw ApiError.badRequest('Invalid user ID format');
  }

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    action: req.query.action as string | undefined,
    entityType: req.query.entityType as string | undefined,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    includeSystem: req.query.includeSystem === 'true',
    sort: req.query.sort as string | undefined
  };

  // Validate pagination
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (filters.limit < 1 || filters.limit > 200) {
    throw ApiError.badRequest('Limit must be between 1 and 200');
  }

  // Validate dates
  if (filters.startDate && isNaN(filters.startDate.getTime())) {
    throw ApiError.badRequest('Invalid start date format');
  }

  if (filters.endDate && isNaN(filters.endDate.getTime())) {
    throw ApiError.badRequest('Invalid end date format');
  }

  const requestingUserId = (req as any).user?.id;
  if (!requestingUserId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await AuditLogsService.getUserActivity(userId, filters, requestingUserId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/audit-logs/entity/:entityType/:entityId
 * Get entity audit history
 */
export const getEntityHistory = asyncHandler(async (req: Request, res: Response) => {
  const { entityType, entityId } = req.params;

  if (!entityType) {
    throw ApiError.badRequest('Entity type is required');
  }

  if (!entityId) {
    throw ApiError.badRequest('Entity ID is required');
  }

  // Validate entityType enum
  const validEntityTypes = [
    'user', 'staff', 'learner',
    'course', 'class', 'program',
    'enrollment', 'class-enrollment',
    'content', 'scorm', 'exercise',
    'assessment', 'exam-result',
    'department', 'academic-year'
  ];

  if (!validEntityTypes.includes(entityType)) {
    throw ApiError.badRequest('Invalid entity type specified');
  }

  // Validate ObjectId format
  if (!/^[0-9a-fA-F]{24}$/.test(entityId)) {
    throw ApiError.badRequest('Invalid entity ID format');
  }

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    action: req.query.action as string | undefined,
    userId: req.query.userId as string | undefined,
    includeRelated: req.query.includeRelated === 'true',
    sort: req.query.sort as string | undefined
  };

  // Validate pagination
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (filters.limit < 1 || filters.limit > 200) {
    throw ApiError.badRequest('Limit must be between 1 and 200');
  }

  // Validate userId if provided
  if (filters.userId && !/^[0-9a-fA-F]{24}$/.test(filters.userId)) {
    throw ApiError.badRequest('Invalid user ID format');
  }

  const requestingUserId = (req as any).user?.id;
  if (!requestingUserId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await AuditLogsService.getEntityHistory(entityType, entityId, filters, requestingUserId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/audit-logs/export
 * Export audit logs in various formats
 */
export const exportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const format = (req.query.format as string) || 'json';

  // Validate format
  const validFormats = ['json', 'csv', 'xlsx', 'pdf'];
  if (!validFormats.includes(format)) {
    throw ApiError.badRequest('Invalid format. Must be one of: json, csv, xlsx, pdf');
  }

  // Validate required dates
  if (!req.query.startDate) {
    throw ApiError.badRequest('Start date is required for exports');
  }

  if (!req.query.endDate) {
    throw ApiError.badRequest('End date is required for exports');
  }

  const startDate = new Date(req.query.startDate as string);
  const endDate = new Date(req.query.endDate as string);

  // Validate dates
  if (isNaN(startDate.getTime())) {
    throw ApiError.badRequest('Invalid start date format');
  }

  if (isNaN(endDate.getTime())) {
    throw ApiError.badRequest('Invalid end date format');
  }

  if (startDate > endDate) {
    throw ApiError.badRequest('Start date must be before end date');
  }

  const params = {
    format: format as 'json' | 'csv' | 'xlsx' | 'pdf',
    userId: req.query.userId as string | undefined,
    action: req.query.action as string | undefined,
    entityType: req.query.entityType as string | undefined,
    entityId: req.query.entityId as string | undefined,
    departmentId: req.query.departmentId as string | undefined,
    startDate,
    endDate,
    includeDetails: req.query.includeDetails === 'true',
    includeChanges: req.query.includeChanges !== 'false',
    maxRecords: req.query.maxRecords ? parseInt(req.query.maxRecords as string, 10) : 10000
  };

  // Validate maxRecords
  if (params.maxRecords < 1 || params.maxRecords > 50000) {
    throw ApiError.badRequest('Max records must be between 1 and 50000');
  }

  // Validate ObjectId formats
  if (params.userId && !/^[0-9a-fA-F]{24}$/.test(params.userId)) {
    throw ApiError.badRequest('Invalid user ID format');
  }

  if (params.entityId && !/^[0-9a-fA-F]{24}$/.test(params.entityId)) {
    throw ApiError.badRequest('Invalid entity ID format');
  }

  if (params.departmentId && !/^[0-9a-fA-F]{24}$/.test(params.departmentId)) {
    throw ApiError.badRequest('Invalid department ID format');
  }

  const userId = (req as any).user?.id;
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const result = await AuditLogsService.exportAuditLogs(params, userId);

  // Set response headers based on format
  const filename = `audit-logs-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}`;

  switch (format) {
    case 'json':
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.status(200).json(result);

    case 'csv':
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      // Convert to CSV format
      const csv = convertToCSV(result.data.logs || []);
      return res.status(200).send(csv);

    case 'xlsx':
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      // Note: In production, use a library like xlsx or exceljs
      return res.status(200).json({
        message: 'XLSX export not yet implemented. Use JSON or CSV format.',
        data: result
      });

    case 'pdf':
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      // Note: In production, use a library like pdfkit or puppeteer
      return res.status(200).json({
        message: 'PDF export not yet implemented. Use JSON or CSV format.',
        data: result
      });

    default:
      return res.status(200).json(ApiResponse.success(result));
  }
});

/**
 * Helper: Convert data to CSV format
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  // Convert each row
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      // Handle objects/arrays
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      // Handle strings with commas/quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}
