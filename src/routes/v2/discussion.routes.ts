import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import {
  validateCreateThread,
  validateUpdateThread,
  validatePinThread,
  validateLockThread,
  validateSearchThreads,
  validateCreateReply,
  validateUpdateReply,
  validateMarkAnswer
} from '@/validators/discussion.validator';
import * as threadController from '@/controllers/discussion/discussionThread.controller';
import * as replyController from '@/controllers/discussion/discussionReply.controller';

/**
 * Discussion Routes
 *
 * Three routers:
 * 1. courseDiscussionRouter - /api/v2/courses/:courseId/discussions
 * 2. threadRouter - /api/v2/discussions
 * 3. replyRouter - /api/v2/replies
 *
 * Permissions:
 * - content:courses:read — read access (all enrolled learners have this)
 * - content:discussions:moderate — pin, lock, mark answer
 */

// ── Course-scoped discussion endpoints ──
export const courseDiscussionRouter = Router({ mergeParams: true });
courseDiscussionRouter.use(isAuthenticated);

courseDiscussionRouter.get(
  '/',
  authorize('content:courses:read'),
  threadController.listThreads
);

courseDiscussionRouter.post(
  '/',
  authorize('content:courses:read'),
  validateCreateThread,
  threadController.createThread
);

courseDiscussionRouter.get(
  '/search',
  authorize('content:courses:read'),
  validateSearchThreads,
  threadController.searchThreads
);

// ── Thread-level endpoints ──
export const threadRouter = Router();
threadRouter.use(isAuthenticated);

threadRouter.get(
  '/:threadId',
  authorize('content:courses:read'),
  threadController.getThread
);

threadRouter.put(
  '/:threadId',
  authorize('content:courses:read'),
  validateUpdateThread,
  threadController.updateThread
);

threadRouter.delete(
  '/:threadId',
  authorize('content:courses:read'),
  threadController.deleteThread
);

threadRouter.put(
  '/:threadId/pin',
  authorize('content:discussions:moderate'),
  validatePinThread,
  threadController.pinThread
);

threadRouter.put(
  '/:threadId/lock',
  authorize('content:discussions:moderate'),
  validateLockThread,
  threadController.lockThread
);

threadRouter.get(
  '/:threadId/replies',
  authorize('content:courses:read'),
  replyController.listReplies
);

threadRouter.post(
  '/:threadId/replies',
  authorize('content:courses:read'),
  validateCreateReply,
  replyController.createReply
);

// ── Reply-level endpoints ──
export const replyRouter = Router();
replyRouter.use(isAuthenticated);

replyRouter.put(
  '/:replyId',
  authorize('content:courses:read'),
  validateUpdateReply,
  replyController.updateReply
);

replyRouter.delete(
  '/:replyId',
  authorize('content:courses:read'),
  replyController.deleteReply
);

replyRouter.put(
  '/:replyId/mark-answer',
  authorize('content:discussions:moderate'),
  validateMarkAnswer,
  replyController.markAnswer
);
