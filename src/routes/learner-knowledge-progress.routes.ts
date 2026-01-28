import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as learnerKnowledgeProgressController from '@/controllers/progress/learner-knowledge-progress.controller';

const router = Router();

/**
 * Learner Knowledge Progress Routes
 * Base path: /api/v2
 *
 * All routes require authentication
 * Tracks learner progress through knowledge/skill nodes
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/learners/:learnerId/knowledge-progress
 * Get all knowledge progress records for a learner
 * Access: learner:grades:read (staff viewing learner), grades:own:read (learner viewing own)
 */
router.get('/learners/:learnerId/knowledge-progress',
  authorize.anyOf(['learner:grades:read', 'grades:own:read']),
  learnerKnowledgeProgressController.getAll
);

/**
 * GET /api/v2/learners/:learnerId/knowledge-progress/summary
 * Get aggregated progress summary for a learner
 * Returns overall mastery level, node counts by status, recent activity
 * Access: learner:grades:read (staff viewing learner), grades:own:read (learner viewing own)
 * Note: This route must be defined before :nodeId to avoid matching "summary" as a nodeId
 */
router.get('/learners/:learnerId/knowledge-progress/summary',
  authorize.anyOf(['learner:grades:read', 'grades:own:read']),
  learnerKnowledgeProgressController.getSummary
);

/**
 * GET /api/v2/learners/:learnerId/knowledge-progress/:nodeId
 * Get progress for a specific knowledge node
 * Returns mastery level, attempts, history for the node
 * Access: learner:grades:read (staff viewing learner), grades:own:read (learner viewing own)
 */
router.get('/learners/:learnerId/knowledge-progress/:nodeId',
  authorize.anyOf(['learner:grades:read', 'grades:own:read']),
  learnerKnowledgeProgressController.getForNode
);

/**
 * DELETE /api/v2/learners/:learnerId/knowledge-progress/:nodeId
 * Reset progress for a specific knowledge node
 * Clears mastery level and attempt history for the node
 * Access: grades:department:manage (department admin only)
 */
router.delete('/learners/:learnerId/knowledge-progress/:nodeId',
  authorize.anyOf(['grades:department:manage']),
  learnerKnowledgeProgressController.resetProgress
);

/**
 * GET /api/v2/departments/:departmentId/learners/:learnerId/knowledge-map
 * Get knowledge map visualization data for a learner within a department
 * Returns hierarchical structure of knowledge nodes with progress overlay
 * Access: learner:grades:read (staff viewing learner), grades:own:read (learner viewing own)
 */
router.get('/departments/:departmentId/learners/:learnerId/knowledge-map',
  authorize.anyOf(['learner:grades:read', 'grades:own:read']),
  learnerKnowledgeProgressController.getKnowledgeMap
);

export default router;
