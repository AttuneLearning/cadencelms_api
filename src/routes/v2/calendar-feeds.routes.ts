import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { validateCalendarFeedQuery } from '@/validators/calendar-feeds.validator';
import * as controller from '@/controllers/calendar/calendar-feeds.controller';

const router = Router();

// All calendar feed routes require authentication
router.use(isAuthenticated);

// All feed routes share the same date range validation
router.use(validateCalendarFeedQuery);

// GET /api/v2/calendar/learner?startDate=...&endDate=...
// Self-scoped: returns only the authenticated user's enrollment events
router.get('/learner', controller.getLearnerFeed);

// GET /api/v2/calendar/staff?startDate=...&endDate=...
// Self-scoped: returns only the authenticated user's teaching assignments
router.get('/staff', controller.getStaffFeed);

// GET /api/v2/calendar/system?startDate=...&endDate=...
// Admin/staff: returns system-wide academic dates
// Uses academic:calendar:view — falls back to userTypes check if right not seeded
router.get('/system', authorize.anyOf(['academic:calendar:view', 'academic:years:read']), controller.getSystemFeed);

export default router;
