import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as classesController from '@/controllers/academic/classes.controller';

const router = Router();

/**
 * Classes Routes
 * Base path: /api/v2/classes
 *
 * All routes require authentication
 * Admin and staff can manage classes
 * Instructors can view and manage their assigned classes
 * Learners can view classes they are enrolled in
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * =====================
 * CLASS MANAGEMENT ROUTES
 * =====================
 */

/**
 * GET /api/v2/classes
 * List all classes with optional filtering
 * Permissions: admin, staff, instructors
 * Query params:
 * - course: ObjectId (filter by course)
 * - program: ObjectId (filter by program)
 * - instructor: ObjectId (filter by instructor)
 * - status: upcoming|active|completed|cancelled
 * - department: ObjectId (filter by department)
 * - term: ObjectId (filter by academic term)
 * - search: string (search by class name)
 * - sort: string (e.g., '-startDate', 'name')
 * - page: number (pagination)
 * - limit: number (results per page, max 100)
 */
router.get('/', classesController.listClasses);

/**
 * POST /api/v2/classes
 * Create a new class (course instance)
 * Permissions: admin, department-admin
 * Body:
 * - name: string (required)
 * - course: ObjectId (required)
 * - program: ObjectId (required)
 * - programLevel: ObjectId (optional)
 * - instructors: Array<{userId: ObjectId, role: "primary"|"secondary"}> (required, min 1)
 * - startDate: Date (required)
 * - endDate: Date (required)
 * - duration: number (optional, auto-calculated)
 * - capacity: number|null (optional, null for unlimited)
 * - academicTerm: ObjectId (optional)
 */
router.post('/', classesController.createClass);

/**
 * GET /api/v2/classes/:id
 * Get detailed information about a specific class
 * Permissions: admin, staff, instructor of class, enrolled learners
 */
router.get('/:id', classesController.getClass);

/**
 * PUT /api/v2/classes/:id
 * Update class information
 * Permissions: admin, department-admin
 * Body (all optional):
 * - name: string
 * - instructors: Array<{userId: ObjectId, role: "primary"|"secondary"}>
 * - startDate: Date
 * - endDate: Date
 * - duration: number
 * - capacity: number|null
 * - academicTerm: ObjectId
 * - status: upcoming|active|completed|cancelled
 */
router.put('/:id', classesController.updateClass);

/**
 * DELETE /api/v2/classes/:id
 * Delete a class (soft delete if enrollments exist)
 * Permissions: admin
 * Query params:
 * - force: boolean (force hard delete even with enrollments, admin only)
 */
router.delete('/:id', classesController.deleteClass);

/**
 * =====================
 * ENROLLMENT MANAGEMENT ROUTES
 * =====================
 */

/**
 * GET /api/v2/classes/:id/enrollments
 * Get all enrollments for a class
 * Permissions: admin, staff, instructor of class
 * Query params:
 * - status: active|withdrawn|completed (filter by enrollment status)
 * - page: number (pagination)
 * - limit: number (results per page, max 200)
 */
router.get('/:id/enrollments', classesController.getClassEnrollments);

/**
 * POST /api/v2/classes/:id/enrollments
 * Enroll one or more learners in a class (bulk enrollment)
 * Permissions: admin, department-admin, instructor of class
 * Body:
 * - learnerIds: ObjectId[] (required, min 1)
 * - enrolledAt: Date (optional, defaults to now)
 */
router.post('/:id/enrollments', classesController.enrollLearners);

/**
 * DELETE /api/v2/classes/:id/enrollments/:enrollmentId
 * Remove a learner enrollment from a class (soft delete)
 * Permissions: admin, department-admin, instructor of class
 * Query params:
 * - reason: string (optional, max 500 chars)
 */
router.delete('/:id/enrollments/:enrollmentId', classesController.dropEnrollment);

/**
 * =====================
 * ROSTER & ANALYTICS ROUTES
 * =====================
 */

/**
 * GET /api/v2/classes/:id/roster
 * Get class roster with learner details, progress, and attendance
 * Permissions: admin, staff, instructor of class
 * Query params:
 * - includeProgress: boolean (default true)
 * - status: active|withdrawn|completed (filter by enrollment status)
 */
router.get('/:id/roster', classesController.getClassRoster);

/**
 * GET /api/v2/classes/:id/progress
 * Get class-wide progress statistics and analytics
 * Permissions: admin, staff, instructor of class
 * Returns aggregate progress, scores, completion rates, and module-level breakdown
 */
router.get('/:id/progress', classesController.getClassProgress);

export default router;
