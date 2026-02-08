import mongoose, { Schema, Document } from 'mongoose';

/**
 * Quiet hours configuration
 */
export interface IQuietHours {
  enabled: boolean;
  start: string;
  end: string;
}

/**
 * Notification preferences interface
 */
export interface INotificationPreferences extends Document {
  userId: mongoose.Types.ObjectId;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  preferences: Map<string, boolean>;
  quietHours: IQuietHours;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    inAppNotifications: {
      type: Boolean,
      default: true
    },
    preferences: {
      type: Map,
      of: Boolean,
      default: new Map([
        ['access_expiring', true],
        ['access_expired', true],
        ['new_version_available', true],
        ['certificate_upgrade_available', true],
        ['certificate_issued', true],
        ['certificate_expiring', true],
        ['extension_approved', true],
        ['extension_denied', true]
      ])
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '08:00' }
    }
  },
  { timestamps: true }
);

const NotificationPreferences = mongoose.model<INotificationPreferences>(
  'NotificationPreferences',
  NotificationPreferencesSchema
);

export default NotificationPreferences;
