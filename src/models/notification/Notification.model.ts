import mongoose, { Schema, Document } from 'mongoose';

/**
 * Notification types array (for validation)
 */
export const NOTIFICATION_TYPES = [
  'access_expiring',
  'access_expired',
  'new_version_available',
  'certificate_upgrade_available',
  'certificate_issued',
  'certificate_expiring',
  'extension_approved',
  'extension_denied'
] as const;

/**
 * Notification types
 */
export type NotificationType = typeof NOTIFICATION_TYPES[number];

/**
 * Notification priority levels array (for validation)
 */
export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

/**
 * Notification priority levels
 */
export type NotificationPriority = typeof NOTIFICATION_PRIORITIES[number];

/**
 * Related entity types
 */
export type RelatedEntityType =
  | 'enrollment'
  | 'course'
  | 'courseVersion'
  | 'certificate'
  | 'certificateIssuance'
  | 'extensionRequest';

/**
 * Related entity reference
 */
export interface IRelatedEntity {
  type: RelatedEntityType;
  id: mongoose.Types.ObjectId;
}

/**
 * Notification interface
 */
export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  relatedEntity?: IRelatedEntity;
  readAt: Date | null;
  dismissedAt: Date | null;
  expiresAt: Date | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'access_expiring',
        'access_expired',
        'new_version_available',
        'certificate_upgrade_available',
        'certificate_issued',
        'certificate_expiring',
        'extension_approved',
        'extension_denied'
      ],
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    relatedEntity: {
      type: {
        type: String,
        enum: [
          'enrollment',
          'course',
          'courseVersion',
          'certificate',
          'certificateIssuance',
          'extensionRequest'
        ]
      },
      id: {
        type: Schema.Types.ObjectId
      }
    },
    readAt: {
      type: Date,
      default: null
    },
    dismissedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null,
      index: { expireAfterSeconds: 0 } // TTL index for auto-cleanup
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for common queries
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, dismissedAt: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
