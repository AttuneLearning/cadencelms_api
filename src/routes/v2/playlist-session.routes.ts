import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import * as controller from '@/controllers/progress/playlist-session.controller';

const router = Router({ mergeParams: true });

// All playlist session routes require authentication
// Self-scoped: service verifies enrollment belongs to authenticated user
router.use(isAuthenticated);

// POST /api/v2/enrollments/:enrollmentId/playlist-session
router.post('/', controller.createSession);

// GET /api/v2/enrollments/:enrollmentId/playlist-session?moduleId=xxx
router.get('/', controller.getSession);

// PUT /api/v2/enrollments/:enrollmentId/playlist-session/:sessionId
router.put('/:sessionId', controller.updateSession);

export default router;
