import mongoose, { Schema, Document } from 'mongoose';

/**
 * Exception Types
 */
export type ExceptionType =
  | 'extra_attempts'
  | 'extended_access'
  | 'module_unlock'
  | 'grade_override'
  | 'excuse_content';

export const EXCEPTION_TYPES: ExceptionType[] = [
  'extra_attempts',
  'extended_access',
  'module_unlock',
  'grade_override',
  'excuse_content'
];

/**
 * Exception Metadata
 */
export interface IExceptionMetadata {
  // extra_attempts
  assessmentId?: mongoose.Types.ObjectId;
  additionalAttempts?: number;
  // extended_access
  newExpiryDate?: Date;
  previousExpiryDate?: Date;
  // module_unlock
  moduleId?: mongoose.Types.ObjectId;
  // grade_override
  attemptId?: mongoose.Types.ObjectId;
  previousGrade?: number;
  newGrade?: number;
  // excuse_content
  contentId?: mongoose.Types.ObjectId;
  contentType?: 'lesson' | 'exercise' | 'module';
}

/**
 * Learner Exception Interface
 */
export interface ILearnerException extends Document {
  enrollmentId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  type: ExceptionType;
  reason: string;
  grantedBy: mongoose.Types.ObjectId;
  grantedAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
  metadata: IExceptionMetadata;
  revokedAt: Date | null;
  revokedBy: mongoose.Types.ObjectId | null;
  revokeReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExceptionMetadataSchema = new Schema<IExceptionMetadata>(
  {
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment' },
    additionalAttempts: {
      type: Number,
      min: [1, 'Additional attempts must be at least 1'],
      max: [100, 'Additional attempts cannot exceed 100']
    },
    newExpiryDate: { type: Date },
    previousExpiryDate: { type: Date },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module' },
    attemptId: { type: Schema.Types.ObjectId, ref: 'AssessmentAttempt' },
    previousGrade: { type: Number, min: 0, max: 100 },
    newGrade: { type: Number, min: 0, max: 100 },
    contentId: { type: Schema.Types.ObjectId },
    contentType: {
      type: String,
      enum: {
        values: ['lesson', 'exercise', 'module'],
        message: '{VALUE} is not a valid content type'
      }
    }
  },
  { _id: false }
);

const LearnerExceptionSchema = new Schema<ILearnerException>(
  {
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment ID is required'],
      index: true
    },
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Learner ID is required'],
      index: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department ID is required'],
      index: true
    },
    type: {
      type: String,
      required: [true, 'Exception type is required'],
      enum: {
        values: EXCEPTION_TYPES,
        message: '{VALUE} is not a valid exception type'
      }
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [2000, 'Reason cannot exceed 2000 characters']
    },
    grantedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Granted by is required']
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    metadata: {
      type: ExceptionMetadataSchema,
      default: () => ({})
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    revokeReason: {
      type: String,
      trim: true,
      maxlength: [2000, 'Revoke reason cannot exceed 2000 characters'],
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
LearnerExceptionSchema.index({ enrollmentId: 1, type: 1, isActive: 1 });
LearnerExceptionSchema.index({ learnerId: 1, type: 1, isActive: 1 });
LearnerExceptionSchema.index({ departmentId: 1, isActive: 1, createdAt: -1 });
LearnerExceptionSchema.index({ grantedBy: 1 });

const LearnerException = mongoose.model<ILearnerException>(
  'LearnerException',
  LearnerExceptionSchema
);

export default LearnerException;
