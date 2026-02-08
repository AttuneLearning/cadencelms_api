import { Request, Response } from 'express';
import { NotificationService, NotificationFilters } from '@/services/notification/notification.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { NotificationType, NotificationPriority } from '@/models/notification/Notification.model';

/**
 * Notification Controller
 *
 * Handles all user notification endpoints.
 * All endpoints use the current user's ID from the auth token.
 */

/**
 * GET /api/v2/users/me/notifications
 * List notifications for the current user with filtering and pagination.
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
export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const filters: NotificationFilters = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    type: req.query.type as NotificationType | undefined,
    priority: req.query.priority as NotificationPriority | undefined,
    readStatus: req.query.readStatus as 'read' | 'unread' | 'all' | undefined,
    includeDismissed: req.query.includeDismissed === 'true',
    sort: req.query.sort as string | undefined
  };

  const result = await NotificationService.getNotifications(userId, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/users/me/notifications/count
 * Get the unread notification count for the current user.
 *
 * Returns: { count: number }
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const result = await NotificationService.getUnreadCount(userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/users/me/notifications/:id
 * Get a single notification by ID.
 */
export const getNotificationById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await NotificationService.getNotificationById(userId, id);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PATCH /api/v2/users/me/notifications/:id/read
 * Mark a notification as read.
 *
 * Returns: { id, isRead, readAt }
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await NotificationService.markAsRead(userId, id);
  res.status(200).json(ApiResponse.success(result, 'Notification marked as read'));
});

/**
 * POST /api/v2/users/me/notifications/read-all
 * Mark all notifications as read for the current user.
 *
 * Returns: { modifiedCount: number }
 */
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const result = await NotificationService.markAllAsRead(userId);
  res.status(200).json(ApiResponse.success(result, 'All notifications marked as read'));
});

/**
 * DELETE /api/v2/users/me/notifications/:id
 * Dismiss (soft delete) a notification.
 */
export const dismissNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  await NotificationService.dismissNotification(userId, id);
  res.status(200).json(ApiResponse.success(null, 'Notification dismissed'));
});

/**
 * GET /api/v2/users/me/notification-preferences
 * Get notification preferences for the current user.
 */
export const getPreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const result = await NotificationService.getPreferences(userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/users/me/notification-preferences
 * Update notification preferences for the current user.
 *
 * Body:
 * - emailNotifications?: boolean
 * - inAppNotifications?: boolean
 * - preferences?: Record<NotificationType, boolean>
 * - quietHours?: { enabled?: boolean, start?: string, end?: string }
 */
export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const result = await NotificationService.updatePreferences(userId, req.body);
  res.status(200).json(ApiResponse.success(result, 'Preferences updated'));
});
