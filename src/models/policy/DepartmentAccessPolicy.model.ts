import mongoose, { Schema, Document } from 'mongoose';

/**
 * Access Duration Type
 * - months: Fixed number of months from enrollment
 * - years: Fixed number of years from enrollment
 * - perpetual: No expiration
 * - custom: Custom duration in days
 */
export type AccessDurationType = 'months' | 'years' | 'perpetual' | 'custom';

/**
 * Access Duration Configuration
 */
export interface IAccessDuration {
  type: AccessDurationType;
  value?: number; // Required for months, years, custom (days for custom)
}

/**
 * Notification Settings for access-related events
 */
export interface IAccessNotificationSettings {
  /** Notify learner when access is about to expire */
  notifyBeforeExpiration: boolean;
  /** Days before expiration to send notification */
  daysBeforeExpirationNotification?: number;
  /** Notify learner when new course version is available */
  notifyOnNewVersion: boolean;
  /** Notify learner when certificate upgrade is available */
  notifyOnCertificateUpgrade: boolean;
  /** Notify admin when extension request is submitted */
  notifyAdminOnExtensionRequest: boolean;
}

/**
 * Department Access Policy Interface
 *
 * Defines default access policies at the department level.
 * Programs can override these settings via ProgramAccessOverride.
 */
export interface IDepartmentAccessPolicy extends Document {
  /** Department this policy applies to */
  departmentId: mongoose.Types.ObjectId;

  /** Default access duration for enrollments */
  defaultAccessDuration: IAccessDuration;

  /** Allow learners to access new course versions */
  allowNewVersionAccess: boolean;
  /** Days to access new version after release (null = same as original enrollment) */
  newVersionAccessWindow?: number;

  /** Allow certificate upgrade when new version includes updated cert requirements */
  allowCertificateUpgrade: boolean;
  /** Days to complete upgrade path (null = same as original enrollment) */
  certificateUpgradeWindow?: number;

  /** Allow learners to retake courses */
  allowCourseRetakes: boolean;
  /** Maximum retakes per course (null = unlimited) */
  maxRetakesPerCourse?: number;
  /** Cooldown period between retakes in days */
  retakeCooldownDays?: number;

  /** Notification settings */
  notifications: IAccessNotificationSettings;

  /** Soft delete flag */
  isActive: boolean;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

const AccessDurationSchema = new Schema<IAccessDuration>(
  {
    type: {
      type: String,
      required: [true, 'Access duration type is required'],
      enum: {
        values: ['months', 'years', 'perpetual', 'custom'],
        message: '{VALUE} is not a valid access duration type'
      }
    },
    value: {
      type: Number,
      min: [0, 'Access duration value cannot be negative'],
      validate: {
        validator: function(this: IAccessDuration, v: number | undefined) {
          // Value is required for non-perpetual types
          if (this.type !== 'perpetual' && (v === undefined || v === null)) {
            return false;
          }
          return true;
        },
        message: 'Access duration value is required for non-perpetual types'
      }
    }
  },
  { _id: false }
);

const AccessNotificationSettingsSchema = new Schema<IAccessNotificationSettings>(
  {
    notifyBeforeExpiration: {
      type: Boolean,
      default: true
    },
    daysBeforeExpirationNotification: {
      type: Number,
      min: [1, 'Days before expiration notification must be at least 1'],
      default: 30
    },
    notifyOnNewVersion: {
      type: Boolean,
      default: true
    },
    notifyOnCertificateUpgrade: {
      type: Boolean,
      default: true
    },
    notifyAdminOnExtensionRequest: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const DepartmentAccessPolicySchema = new Schema<IDepartmentAccessPolicy>(
  {
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department ID is required'],
      unique: true,
      index: true
    },
    defaultAccessDuration: {
      type: AccessDurationSchema,
      required: [true, 'Default access duration is required'],
      default: {
        type: 'perpetual'
      }
    },
    allowNewVersionAccess: {
      type: Boolean,
      default: true
    },
    newVersionAccessWindow: {
      type: Number,
      min: [0, 'New version access window cannot be negative']
    },
    allowCertificateUpgrade: {
      type: Boolean,
      default: true
    },
    certificateUpgradeWindow: {
      type: Number,
      min: [0, 'Certificate upgrade window cannot be negative']
    },
    allowCourseRetakes: {
      type: Boolean,
      default: true
    },
    maxRetakesPerCourse: {
      type: Number,
      min: [0, 'Max retakes per course cannot be negative']
    },
    retakeCooldownDays: {
      type: Number,
      min: [0, 'Retake cooldown days cannot be negative'],
      default: 0
    },
    notifications: {
      type: AccessNotificationSettingsSchema,
      default: () => ({})
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
DepartmentAccessPolicySchema.index({ departmentId: 1, isActive: 1 });

const DepartmentAccessPolicy = mongoose.model<IDepartmentAccessPolicy>(
  'DepartmentAccessPolicy',
  DepartmentAccessPolicySchema
);

export default DepartmentAccessPolicy;
