/**
 * Report Jobs API Contract
 *
 * Version: 1.0.0
 * Date: 2026-01-15
 * Status: APPROVED
 *
 * This contract defines the Report Jobs API for creating, managing, and monitoring
 * report generation jobs in the queue-based report system.
 *
 * @module contracts/api/report-jobs
 */

import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * ObjectId validation
 */
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

/**
 * ISO 8601 date string validation
 */
const isoDateSchema = z.string().datetime();

/**
 * Report job parameters schema
 */
const reportParametersSchema = z.object({
  dateRange: z
    .object({
      startDate: isoDateSchema,
      endDate: isoDateSchema
    })
    .optional(),
  filters: z
    .object({
      departmentIds: z.array(objectIdSchema).optional(),
      courseIds: z.array(objectIdSchema).optional(),
      classIds: z.array(objectIdSchema).optional(),
      learnerIds: z.array(objectIdSchema).optional(),
      contentIds: z.array(objectIdSchema).optional(),
      eventTypes: z.array(z.string()).optional(),
      statuses: z.array(z.string()).optional()
    })
    .optional(),
  groupBy: z.array(z.string()).optional(),
  measures: z.array(z.string()).optional(),
  includeInactive: z.boolean().optional()
});

/**
 * Output configuration schema
 */
const outputConfigSchema = z.object({
  format: z.string().min(1, 'Output format is required'),
  filename: z.string().optional()
});

/**
 * Create report job request validation
 */
export const createReportJobSchema = z.object({
  body: z.object({
    reportType: z.string().min(1, 'Report type is required'),
    name: z.string().min(1, 'Name is required').max(200, 'Name cannot exceed 200 characters'),
    description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
    parameters: reportParametersSchema,
    output: outputConfigSchema,
    priority: z.string().optional(),
    visibility: z.string().optional(),
    scheduledFor: isoDateSchema.optional(),
    templateId: objectIdSchema.optional(),
    departmentId: objectIdSchema.optional()
  })
});

/**
 * List report jobs query validation
 */
export const listReportJobsSchema = z.object({
  query: z.object({
    status: z.union([z.string(), z.array(z.string())]).optional(),
    reportType: z.union([z.string(), z.array(z.string())]).optional(),
    requestedBy: objectIdSchema.optional(),
    departmentId: objectIdSchema.optional(),
    fromDate: isoDateSchema.optional(),
    toDate: isoDateSchema.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.enum(['createdAt', 'status', 'priority', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
});

/**
 * Get report job params validation
 */
export const getReportJobSchema = z.object({
  params: z.object({
    jobId: objectIdSchema
  })
});

/**
 * Cancel report job validation
 */
export const cancelReportJobSchema = z.object({
  params: z.object({
    jobId: objectIdSchema
  }),
  body: z.object({
    reason: z.string().max(500).optional()
  })
});

/**
 * Retry report job validation
 */
export const retryReportJobSchema = z.object({
  params: z.object({
    jobId: objectIdSchema
  })
});

/**
 * Download report validation
 */
export const downloadReportSchema = z.object({
  params: z.object({
    jobId: objectIdSchema
  })
});

// ============================================================================
// REQUEST INTERFACES
// ============================================================================

export interface CreateReportJobRequest {
  reportType: string;
  name: string;
  description?: string;
  parameters: {
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    filters?: {
      departmentIds?: string[];
      courseIds?: string[];
      classIds?: string[];
      learnerIds?: string[];
      contentIds?: string[];
      eventTypes?: string[];
      statuses?: string[];
    };
    groupBy?: string[];
    measures?: string[];
    includeInactive?: boolean;
  };
  output: {
    format: string;
    filename?: string;
  };
  priority?: string;
  visibility?: string;
  scheduledFor?: string;
  templateId?: string;
  departmentId?: string;
}

export interface ListReportJobsQuery {
  status?: string | string[];
  reportType?: string | string[];
  requestedBy?: string;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'status' | 'priority' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CancelReportJobRequest {
  reason?: string;
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

/**
 * Report job summary for list view
 */
export interface ReportJobSummary {
  id: string;
  name: string;
  description?: string;
  reportType: string;
  status: string;
  priority: string;
  visibility: string;
  progress?: {
    percentage: number;
    currentStep: string;
    recordsProcessed?: number;
    totalRecords?: number;
  };
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  output?: {
    format: string;
    downloadUrl?: string;
  };
}

/**
 * Report job detail response
 */
export interface ReportJobDetail extends ReportJobSummary {
  parameters: CreateReportJobRequest['parameters'];
  output: {
    format: string;
    filename?: string;
    storage?: {
      provider: string;
      path?: string;
      bucket?: string;
      key?: string;
      url?: string;
      expiresAt?: string;
    };
  };
  error?: {
    code?: string;
    message: string;
    stack?: string;
    retryCount?: number;
    lastRetryAt?: string;
  };
  scheduledFor?: string;
  templateId?: string;
  scheduleId?: string;
}

/**
 * Create report job response
 */
export interface CreateReportJobResponse {
  success: true;
  data: {
    id: string;
    status: string;
    estimatedWaitTime?: number;
    queuePosition?: number;
  };
  message: string;
}

/**
 * List report jobs response
 */
export interface ListReportJobsResponse {
  success: true;
  data: ReportJobSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Get report job response
 */
export interface GetReportJobResponse {
  success: true;
  data: ReportJobDetail;
}

/**
 * Cancel report job response
 */
export interface CancelReportJobResponse {
  success: true;
  data: {
    id: string;
    status: string;
    cancelledAt: string;
  };
  message: string;
}

/**
 * Retry report job response
 */
export interface RetryReportJobResponse {
  success: true;
  data: {
    id: string;
    status: string;
    retryCount: number;
  };
  message: string;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateReportJobInput = z.infer<typeof createReportJobSchema>['body'];
export type ListReportJobsInput = z.infer<typeof listReportJobsSchema>['query'];
export type GetReportJobInput = z.infer<typeof getReportJobSchema>['params'];
export type CancelReportJobInput = z.infer<typeof cancelReportJobSchema>;
export type RetryReportJobInput = z.infer<typeof retryReportJobSchema>['params'];
export type DownloadReportInput = z.infer<typeof downloadReportSchema>['params'];
