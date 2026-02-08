import mongoose, { Schema, Document } from 'mongoose';
import { IAccessDuration, IAccessNotificationSettings } from './DepartmentAccessPolicy.model';

/**
 * Program Access Override Interface
 *
 * Allows programs to override department-level access policies.
 * Only fields that are set will override the department defaults.
 * Fields left undefined will inherit from the department policy.
 */
export interface IProgramAccessOverride extends Document {
  /** Program this override applies to */
  programId: mongoose.Types.ObjectId;

  /** Override access duration (if set, overrides department default) */
  accessDuration?: IAccessDuration;

  /** Override allow new version access */
  allowNewVersionAccess?: boolean;
  /** Override new version access window */
  newVersionAccessWindow?: number;

  /** Override allow certificate upgrade */
  allowCertificateUpgrade?: boolean;
  /** Override certificate upgrade window */
  certificateUpgradeWindow?: number;

  /** Override allow course retakes */
  allowCourseRetakes?: boolean;
  /** Override max retakes per course */
  maxRetakesPerCourse?: number;
  /** Override retake cooldown days */
  retakeCooldownDays?: number;

  /** Require sequential completion of program courses */
  requireSequentialCompletion: boolean;

  /** Override notification settings */
  notifications?: Partial<IAccessNotificationSettings>;

  /** Soft delete flag */
  isActive: boolean;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

const AccessDurationOverrideSchema = new Schema(
  {
    type: {
      type: String,
      enum: {
        values: ['months', 'years', 'perpetual', 'custom'],
        message: '{VALUE} is not a valid access duration type'
      }
    },
    value: {
      type: Number,
      min: [0, 'Access duration value cannot be negative']
    }
  },
  { _id: false }
);

const NotificationOverrideSchema = new Schema(
  {
    notifyBeforeExpiration: {
      type: Boolean
    },
    daysBeforeExpirationNotification: {
      type: Number,
      min: [1, 'Days before expiration notification must be at least 1']
    },
    notifyOnNewVersion: {
      type: Boolean
    },
    notifyOnCertificateUpgrade: {
      type: Boolean
    },
    notifyAdminOnExtensionRequest: {
      type: Boolean
    }
  },
  { _id: false }
);

const ProgramAccessOverrideSchema = new Schema<IProgramAccessOverride>(
  {
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program ID is required'],
      unique: true,
      index: true
    },
    accessDuration: {
      type: AccessDurationOverrideSchema
    },
    allowNewVersionAccess: {
      type: Boolean
    },
    newVersionAccessWindow: {
      type: Number,
      min: [0, 'New version access window cannot be negative']
    },
    allowCertificateUpgrade: {
      type: Boolean
    },
    certificateUpgradeWindow: {
      type: Number,
      min: [0, 'Certificate upgrade window cannot be negative']
    },
    allowCourseRetakes: {
      type: Boolean
    },
    maxRetakesPerCourse: {
      type: Number,
      min: [0, 'Max retakes per course cannot be negative']
    },
    retakeCooldownDays: {
      type: Number,
      min: [0, 'Retake cooldown days cannot be negative']
    },
    requireSequentialCompletion: {
      type: Boolean,
      default: false
    },
    notifications: {
      type: NotificationOverrideSchema
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
ProgramAccessOverrideSchema.index({ programId: 1, isActive: 1 });

const ProgramAccessOverride = mongoose.model<IProgramAccessOverride>(
  'ProgramAccessOverride',
  ProgramAccessOverrideSchema
);

export default ProgramAccessOverride;
