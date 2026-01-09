import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as reportsController from '@/controllers/reporting/reports.controller';

const router = Router();

/**
 * Reports Routes
 * Base path: /api/v2/reports
 *
 * All routes require authentication
 * Comprehensive reporting and analytics for completion, performance, and transcripts
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/reports/completion
 * Get completion report with filtering and aggregation
 * Query params:
 *   - programId: ObjectId (optional)
 *   - courseId: ObjectId (optional)
 *   - classId: ObjectId (optional)
 *   - departmentId: ObjectId (optional)
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 *   - status: string (optional) - not_started|in_progress|completed|withdrawn
 *   - learnerId: ObjectId (optional)
 *   - groupBy: string (optional) - program|course|department|status|month
 *   - includeDetails: boolean (optional)
 *   - page: number (optional)
 *   - limit: number (optional)
 */
router.get('/completion', reportsController.getCompletionReport);

/**
 * GET /api/v2/reports/performance
 * Get performance report with scores, grades, and analytics
 * Query params:
 *   - programId: ObjectId (optional)
 *   - courseId: ObjectId (optional)
 *   - classId: ObjectId (optional)
 *   - departmentId: ObjectId (optional)
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 *   - learnerId: ObjectId (optional)
 *   - minScore: number (optional) - 0-100
 *   - includeRankings: boolean (optional)
 *   - page: number (optional)
 *   - limit: number (optional)
 */
router.get('/performance', reportsController.getPerformanceReport);

/**
 * GET /api/v2/reports/transcript/:learnerId
 * Get official transcript for a learner
 * Params:
 *   - learnerId: ObjectId (required)
 * Query params:
 *   - programId: ObjectId (optional) - filter by specific program
 *   - includeInProgress: boolean (optional) - include in-progress courses
 */
router.get('/transcript/:learnerId', reportsController.getLearnerTranscript);

/**
 * POST /api/v2/reports/transcript/:learnerId/generate
 * Generate PDF transcript for a learner
 * Params:
 *   - learnerId: ObjectId (required)
 * Body:
 *   - programId: ObjectId (optional)
 *   - includeInProgress: boolean (optional)
 *   - officialFormat: boolean (optional)
 *   - watermark: string (optional) - none|unofficial|draft
 */
router.post('/transcript/:learnerId/generate', reportsController.generatePDFTranscript);

/**
 * GET /api/v2/reports/course/:courseId
 * Get comprehensive course-level report with all learners
 * Params:
 *   - courseId: ObjectId (required)
 * Query params:
 *   - classId: ObjectId (optional) - filter by specific class instance
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 *   - includeModules: boolean (optional) - include module-level breakdown
 */
router.get('/course/:courseId', reportsController.getCourseReport);

/**
 * GET /api/v2/reports/program/:programId
 * Get comprehensive program-level report
 * Params:
 *   - programId: ObjectId (required)
 * Query params:
 *   - academicYearId: ObjectId (optional)
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 */
router.get('/program/:programId', reportsController.getProgramReport);

/**
 * GET /api/v2/reports/department/:departmentId
 * Get comprehensive department-level report
 * Params:
 *   - departmentId: ObjectId (required)
 * Query params:
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 *   - includeSubDepartments: boolean (optional)
 */
router.get('/department/:departmentId', reportsController.getDepartmentReport);

/**
 * GET /api/v2/reports/export
 * Export report data in multiple formats
 * Query params:
 *   - reportType: string (required) - completion|performance|course|program|department
 *   - format: string (required) - csv|xlsx|pdf|json
 *   - programId: ObjectId (optional)
 *   - courseId: ObjectId (optional)
 *   - classId: ObjectId (optional)
 *   - departmentId: ObjectId (optional)
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 *   - learnerId: ObjectId (optional)
 *   - includeDetails: boolean (optional)
 */
router.get('/export', reportsController.exportReport);

export default router;
