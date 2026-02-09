import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import * as messageController from '@/controllers/messaging/message.controller';

const router = Router();

/**
 * Messages Routes
 * Base path: /api/v2/messages
 *
 * All routes require authentication
 * All routes are self-scoped (users only see their own messages)
 */

router.use(isAuthenticated);

router.get('/', messageController.listMessages);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/:id', messageController.getMessageById);
router.post('/', messageController.sendMessage);
router.patch('/mark-read', messageController.markAsRead);
router.patch('/archive', messageController.archiveMessages);
router.delete('/:id', messageController.deleteMessage);

export default router;
