/**
 * Report Jobs Routes
 *
 * Defines routes for report job management including creation, listing,
 * viewing, canceling, downloading, and retrying report jobs.
 *
 * @module routes/reports/report-jobs
 */

import { Router } from 'express';
import * as controller from '@/controllers/reports/report-jobs.controller';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validateRequest } from '@/middlewares/validateRequest';
import {
  createReportJobSchema,
  listReportJobsSchema,
  getReportJobSchema,
  cancelReportJobSchema,
  retryReportJobSchema,
  downloadReportSchema
} from '@contracts/api/report-jobs.contract';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v2/reports/jobs
 * Create a new report generation job
 * Requires: reports:create permission
 */
router.post(
  '/',
  authorize('reports:create'),
  validateRequest(createReportJobSchema),
  controller.createReportJob
);

/**
 * GET /api/v2/reports/jobs
 * List report jobs with filters and pagination
 * Requires: reports:read permission
 */
router.get(
  '/',
  authorize('reports:read'),
  validateRequest(listReportJobsSchema),
  controller.listReportJobs
);

/**
 * GET /api/v2/reports/jobs/:jobId
 * Get detailed information about a specific job
 * Requires: reports:read permission
 */
router.get(
  '/:jobId',
  authorize('reports:read'),
  validateRequest(getReportJobSchema),
  controller.getReportJob
);

/**
 * POST /api/v2/reports/jobs/:jobId/cancel
 * Cancel a pending or running job
 * Requires: reports:cancel permission OR be the job owner
 */
router.post(
  '/:jobId/cancel',
  authorize('reports:cancel'),
  validateRequest(cancelReportJobSchema),
  controller.cancelReportJob
);

/**
 * GET /api/v2/reports/jobs/:jobId/download
 * Download the generated report file
 * Requires: reports:read permission
 */
router.get(
  '/:jobId/download',
  authorize('reports:read'),
  validateRequest(downloadReportSchema),
  controller.downloadReport
);

/**
 * POST /api/v2/reports/jobs/:jobId/retry
 * Retry a failed job
 * Requires: reports:create permission OR be the job owner
 */
router.post(
  '/:jobId/retry',
  authorize('reports:create'),
  validateRequest(retryReportJobSchema),
  controller.retryReportJob
);

export default router;
