import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as learnersController from '@/controllers/users/learners.controller';

const router = Router();

/**
 * Learners Routes
 * Base path: /api/v2/users/learners
 *
 * All routes require authentication and staff/admin permissions
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/users/learners
 * List all learners with filtering and pagination
 * Permissions: read:learners, admin, staff
 */
router.get('/', learnersController.listLearners);

/**
 * POST /api/v2/users/learners
 * Register a new learner account
 * Permissions: write:learners, admin, staff
 */
router.post('/', learnersController.registerLearner);

/**
 * GET /api/v2/users/learners/:id
 * Get detailed learner profile by ID
 * Permissions: read:learners, admin, staff
 */
router.get('/:id', learnersController.getLearnerById);

/**
 * PUT /api/v2/users/learners/:id
 * Update learner profile information
 * Permissions: write:learners, admin, staff
 */
router.put('/:id', learnersController.updateLearner);

/**
 * DELETE /api/v2/users/learners/:id
 * Soft delete learner account (sets status to withdrawn)
 * Permissions: delete:learners, admin
 */
router.delete('/:id', learnersController.deleteLearner);

export default router;
