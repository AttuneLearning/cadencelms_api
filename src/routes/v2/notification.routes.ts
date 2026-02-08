import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import {
  validateListNotifications,
  validateUpdatePreferences,
  validateNotificationId
} from '@/validators/notification.validator';
import * as notificationController from '@/controllers/notification/notification.controller';

/**
 * Notification Routes
 *
 * All notification routes are under /api/v2/users/me/ to indicate they
 * operate on the current authenticated user's data.
 *
 * Routes:
 * - GET /api/v2/users/me/notifications - List notifications
 * - GET /api/v2/users/me/notifications/count - Get unread count
 * - GET /api/v2/users/me/notifications/:id - Get single notification
 * - PATCH /api/v2/users/me/notifications/:id/read - Mark as read
 * - POST /api/v2/users/me/notifications/read-all - Mark all as read
 * - DELETE /api/v2/users/me/notifications/:id - Dismiss notification
 * - GET /api/v2/users/me/notification-preferences - Get preferences
 * - PUT /api/v2/users/me/notification-preferences - Update preferences
 *
 * No special access rights required - all users can manage their own notifications.
 */

export const notificationRouter = Router();

// Apply authentication middleware to all routes
notificationRouter.use(isAuthenticated);

/**
 * =====================================================
 * ROUTES: Notifications
 * =====================================================
 */

/**
 * GET /api/v2/users/me/notifications
 * List notifications for the current user.
 *
 * Query Parameters:
 * - page?: number - Page number (default: 1)
 * - limit?: number - Items per page (default: 20, max: 100)
 * - type?: string - Filter by notification type
 * - priority?: string - Filter by priority
 * - readStatus?: 'read' | 'unread' | 'all' - Filter by read status (default: 'all')
 * - includeDismissed?: boolean - Include dismissed notifications (default: false)
 * - sort?: string - Sort field (prefix with - for desc, default: -createdAt)
 */
notificationRouter.get(
  '/notifications',
  validateListNotifications,
  notificationController.listNotifications
);

/**
 * GET /api/v2/users/me/notifications/count
 * Get unread notification count for badge display.
 *
 * Returns: { count: number }
 */
notificationRouter.get(
  '/notifications/count',
  notificationController.getUnreadCount
);

/**
 * POST /api/v2/users/me/notifications/read-all
 * Mark all notifications as read.
 *
 * Returns: { modifiedCount: number }
 */
notificationRouter.post(
  '/notifications/read-all',
  notificationController.markAllAsRead
);

/**
 * GET /api/v2/users/me/notifications/:id
 * Get a single notification by ID.
 */
notificationRouter.get(
  '/notifications/:id',
  validateNotificationId,
  notificationController.getNotificationById
);

/**
 * PATCH /api/v2/users/me/notifications/:id/read
 * Mark a single notification as read.
 *
 * Returns: { id, isRead, readAt }
 */
notificationRouter.patch(
  '/notifications/:id/read',
  validateNotificationId,
  notificationController.markAsRead
);

/**
 * DELETE /api/v2/users/me/notifications/:id
 * Dismiss (soft delete) a notification.
 *
 * The notification is not permanently deleted, but marked as dismissed
 * and excluded from normal queries.
 */
notificationRouter.delete(
  '/notifications/:id',
  validateNotificationId,
  notificationController.dismissNotification
);

/**
 * =====================================================
 * ROUTES: Notification Preferences
 * =====================================================
 */

/**
 * GET /api/v2/users/me/notification-preferences
 * Get notification preferences for the current user.
 *
 * Returns default preferences if none have been set.
 */
notificationRouter.get(
  '/notification-preferences',
  notificationController.getPreferences
);

/**
 * PUT /api/v2/users/me/notification-preferences
 * Update notification preferences for the current user.
 *
 * Body (all fields optional):
 * - emailNotifications?: boolean - Enable/disable email notifications
 * - inAppNotifications?: boolean - Enable/disable in-app notifications
 * - preferences?: object - Per-type preferences (e.g., { "access_expiring": false })
 * - quietHours?: object - Quiet hours settings
 *   - enabled?: boolean
 *   - start?: string (HH:mm format)
 *   - end?: string (HH:mm format)
 */
notificationRouter.put(
  '/notification-preferences',
  validateUpdatePreferences,
  notificationController.updatePreferences
);

export default notificationRouter;
