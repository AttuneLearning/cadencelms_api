import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import {
  validateRecordCompletion,
  validateGetLearnerCompletions,
  validateCheckCompletions,
  validateGetDepartmentModules
} from '@/validators/moduleCompletion.validator';
import * as moduleCompletionController from '@/controllers/progress/module-completion.controller';

/**
 * Module Completion Routes
 *
 * These routes handle global module completion tracking.
 * When a learner completes a module in any course, the completion
 * is tracked globally so it can be recognized across all courses
 * containing that module.
 *
 * Endpoints:
 * - POST /api/v2/module-completions - Record a module completion
 * - GET /api/v2/module-completions/check - Check completion status for modules
 * - GET /api/v2/learners/:id/module-completions - Get learner's completions
 * - GET /api/v2/modules/:id/usage - Get courses using a module
 * - GET /api/v2/modules/:id/completion-stats - Get module completion statistics
 * - GET /api/v2/departments/:id/modules - List department-owned modules
 * - GET /api/v2/departments/:id/modules/available - List available modules
 */

// Router for /api/v2/module-completions
export const moduleCompletionsRouter = Router();

moduleCompletionsRouter.use(isAuthenticated);

/**
 * POST /api/v2/module-completions
 * Record a module completion
 *
 * Access Right: content:lessons:manage (staff) or self (learners)
 *
 * Body:
 * - moduleId: ObjectId (required)
 * - courseVersionId: ObjectId (required)
 * - enrollmentId: ObjectId (required)
 * - learnerId: ObjectId (optional, defaults to current user)
 * - score: number (optional, 0-100)
 * - isGlobalCompletion: boolean (optional, default: true)
 */
moduleCompletionsRouter.post(
  '/',
  authorize('content:lessons:manage'),
  validateRecordCompletion,
  moduleCompletionController.recordCompletion
);

/**
 * GET /api/v2/module-completions/check
 * Check if current user has completed specific modules
 *
 * Query Parameters:
 * - moduleIds: string (required, comma-separated ObjectIds)
 */
moduleCompletionsRouter.get(
  '/check',
  authorize('content:lessons:read'),
  validateCheckCompletions,
  moduleCompletionController.checkCompletions
);

// Router for learner module completions
// Mounted at /api/v2/learners/:id/module-completions in app.ts
export const learnerModuleCompletionsRouter = Router({ mergeParams: true });

learnerModuleCompletionsRouter.use(isAuthenticated);

/**
 * GET /api/v2/learners/:id/module-completions
 * Get global module completions for a learner
 *
 * Access Right: content:lessons:read (staff) or self (learners)
 *
 * Query Parameters:
 * - moduleId: ObjectId (optional)
 * - isGlobalCompletion: boolean (optional)
 * - completedAfter: ISO date (optional)
 * - completedBefore: ISO date (optional)
 * - page: number (optional, default: 1)
 * - limit: number (optional, default: 20, max: 100)
 */
learnerModuleCompletionsRouter.get(
  '/',
  authorize('content:lessons:read'),
  validateGetLearnerCompletions,
  moduleCompletionController.getLearnerCompletions
);

// Router for module usage and stats
// Mounted at /api/v2/modules in app.ts
export const moduleUsageRouter = Router({ mergeParams: true });

moduleUsageRouter.use(isAuthenticated);

/**
 * GET /api/v2/modules/:id/usage
 * Get all courses using a specific module
 *
 * Access Right: content:lessons:read
 */
moduleUsageRouter.get(
  '/:id/usage',
  authorize('content:lessons:read'),
  moduleCompletionController.getModuleUsage
);

/**
 * GET /api/v2/modules/:id/completion-stats
 * Get completion statistics for a module
 *
 * Access Right: reports:department:read
 */
moduleUsageRouter.get(
  '/:id/completion-stats',
  authorize('reports:department:read'),
  moduleCompletionController.getModuleCompletionStats
);

// Router for department modules
// Mounted at /api/v2/departments/:id/modules in app.ts
export const departmentModulesRouter = Router({ mergeParams: true });

departmentModulesRouter.use(isAuthenticated);

/**
 * GET /api/v2/departments/:id/modules
 * List modules owned by a department
 *
 * Access Right: content:lessons:read
 *
 * Query Parameters:
 * - isShared: boolean (optional)
 * - isPublished: boolean (optional)
 * - page: number (optional, default: 1)
 * - limit: number (optional, default: 20, max: 100)
 */
departmentModulesRouter.get(
  '/',
  authorize('content:lessons:read'),
  validateGetDepartmentModules,
  moduleCompletionController.getDepartmentModules
);

/**
 * GET /api/v2/departments/:id/modules/available
 * List modules available to a department (owned + shared)
 *
 * Access Right: content:lessons:read
 *
 * Query Parameters:
 * - isPublished: boolean (optional)
 * - page: number (optional, default: 1)
 * - limit: number (optional, default: 20, max: 100)
 */
departmentModulesRouter.get(
  '/available',
  authorize('content:lessons:read'),
  validateGetDepartmentModules,
  moduleCompletionController.getAvailableModules
);
