import mongoose from 'mongoose';
import Notification, {
  INotification,
  NotificationType,
  NotificationPriority,
  RelatedEntityType
} from '@/models/notification/Notification.model';
import NotificationPreferences, {
  INotificationPreferences
} from '@/models/notification/NotificationPreferences.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Create notification input
 */
export interface ICreateNotificationInput {
  userId: string;
  departmentId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  relatedEntity?: {
    type: RelatedEntityType;
    id: string;
  };
  expiresAt?: Date | null;
  metadata?: Record<string, any>;
}

/**
 * Notification list filters
 */
export interface INotificationListFilters {
  type?: NotificationType;
  priority?: NotificationPriority;
  readStatus?: 'read' | 'unread' | 'all';
  includeDismissed?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

// Alias for controller compatibility
export type NotificationFilters = INotificationListFilters;

/**
 * Notification Service
 */
export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(
    input: ICreateNotificationInput
  ): Promise<INotification> {
    // Check user preferences first
    const preferences = await this.getOrCreatePreferences(input.userId);
    
    // Skip if user has disabled in-app notifications
    if (!preferences.inAppNotifications) {
      throw ApiError.badRequest('User has disabled in-app notifications');
    }
    
    // Check if this notification type is enabled
    const typeEnabled = preferences.preferences.get(input.type);
    if (typeEnabled === false) {
      throw ApiError.badRequest(`User has disabled ${input.type} notifications`);
    }

    // Set default expiration (30 days)
    const expiresAt = input.expiresAt !== undefined 
      ? input.expiresAt 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const notification = new Notification({
      userId: new mongoose.Types.ObjectId(input.userId),
      departmentId: new mongoose.Types.ObjectId(input.departmentId),
      type: input.type,
      title: input.title,
      message: input.message,
      priority: input.priority || 'normal',
      relatedEntity: input.relatedEntity ? {
        type: input.relatedEntity.type,
        id: new mongoose.Types.ObjectId(input.relatedEntity.id)
      } : undefined,
      expiresAt,
      metadata: input.metadata || {}
    });

    await notification.save();
    return notification;
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(
    userId: string,
    filters: INotificationListFilters
  ): Promise<{
    notifications: INotification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw ApiError.badRequest('Invalid user ID');
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {
      userId: new mongoose.Types.ObjectId(userId)
    };

    // Handle dismissed filter
    if (!filters.includeDismissed) {
      query.dismissedAt = null;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    // Handle read status filter
    if (filters.readStatus === 'read') {
      query.readAt = { $ne: null };
    } else if (filters.readStatus === 'unread') {
      query.readAt = null;
    }

    // Determine sort order
    let sortField = 'createdAt';
    let sortOrder: 1 | -1 = -1;
    if (filters.sort) {
      const desc = filters.sort.startsWith('-');
      sortField = desc ? filters.sort.slice(1) : filters.sort;
      sortOrder = desc ? -1 : 1;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean<INotification[]>(),
      Notification.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get a single notification by ID
   */
  static async getNotificationById(
    userId: string,
    notificationId: string
  ): Promise<INotification> {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw ApiError.badRequest('Invalid notification ID');
    }

    const notification = await Notification.findOne({
      _id: new mongoose.Types.ObjectId(notificationId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    return notification;
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<INotification> {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw ApiError.badRequest('Invalid notification ID');
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        userId: new mongoose.Types.ObjectId(userId)
      },
      { readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    return notification;
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw ApiError.badRequest('Invalid user ID');
    }

    const result = await Notification.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        readAt: null,
        dismissedAt: null
      },
      { readAt: new Date() }
    );

    return result.modifiedCount;
  }

  /**
   * Dismiss a notification
   */
  static async dismissNotification(
    userId: string,
    notificationId: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw ApiError.badRequest('Invalid notification ID');
    }

    const result = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        userId: new mongoose.Types.ObjectId(userId)
      },
      { dismissedAt: new Date() }
    );

    if (!result) {
      throw ApiError.notFound('Notification not found');
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw ApiError.badRequest('Invalid user ID');
    }

    return Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      readAt: null,
      dismissedAt: null
    });
  }

  /**
   * Get or create notification preferences
   */
  static async getOrCreatePreferences(
    userId: string
  ): Promise<INotificationPreferences> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw ApiError.badRequest('Invalid user ID');
    }

    let preferences = await NotificationPreferences.findOne({
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!preferences) {
      preferences = new NotificationPreferences({
        userId: new mongoose.Types.ObjectId(userId)
      });
      await preferences.save();
    }

    return preferences;
  }

  /**
   * Get preferences (alias for getOrCreatePreferences for controller compatibility)
   */
  static async getPreferences(userId: string): Promise<INotificationPreferences> {
    return this.getOrCreatePreferences(userId);
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(
    userId: string,
    updates: {
      emailNotifications?: boolean;
      inAppNotifications?: boolean;
      preferences?: Record<string, boolean>;
      quietHours?: {
        enabled?: boolean;
        start?: string;
        end?: string;
      };
    }
  ): Promise<INotificationPreferences> {
    const preferences = await this.getOrCreatePreferences(userId);

    if (updates.emailNotifications !== undefined) {
      preferences.emailNotifications = updates.emailNotifications;
    }

    if (updates.inAppNotifications !== undefined) {
      preferences.inAppNotifications = updates.inAppNotifications;
    }

    if (updates.preferences) {
      for (const [key, value] of Object.entries(updates.preferences)) {
        preferences.preferences.set(key, value);
      }
    }

    if (updates.quietHours) {
      if (updates.quietHours.enabled !== undefined) {
        preferences.quietHours.enabled = updates.quietHours.enabled;
      }
      if (updates.quietHours.start !== undefined) {
        preferences.quietHours.start = updates.quietHours.start;
      }
      if (updates.quietHours.end !== undefined) {
        preferences.quietHours.end = updates.quietHours.end;
      }
    }

    await preferences.save();
    return preferences;
  }

  /**
   * Delete expired notifications (backup for TTL index)
   */
  static async deleteExpiredNotifications(): Promise<number> {
    const result = await Notification.deleteMany({
      expiresAt: { $lte: new Date() }
    });

    return result.deletedCount;
  }

  /**
   * Create notification silently (doesn't throw on preference opt-out)
   */
  static async createNotificationSilent(
    input: ICreateNotificationInput
  ): Promise<INotification | null> {
    try {
      return await this.createNotification(input);
    } catch {
      // User opted out - silently skip
      return null;
    }
  }
}
