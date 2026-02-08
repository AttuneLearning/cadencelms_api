import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollment extends Document {
  learnerId: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId;
  academicYearId: mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'suspended' | 'withdrawn' | 'completed' | 'graduated' | 'expired';
  enrollmentDate: Date;
  startDate?: Date;
  completionDate?: Date;
  graduationDate?: Date;
  withdrawalDate?: Date;
  withdrawalReason?: string;
  currentTerm?: string;
  cumulativeGPA?: number;
  totalCreditsEarned?: number;

  /** Access expiration date (null = perpetual access) */
  accessExpiresAt?: Date;
  /** When access was last extended */
  accessExtendedAt?: Date;
  /** Reason for access extension (e.g., "Extension request approved", "Manual admin override") */
  accessExtensionReason?: string;
  /** Number of times access has been extended */
  accessExtensionCount?: number;

  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    learnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'learnerId is required'],
      ref: 'User',
      index: true
    },
    programId: {
      type: Schema.Types.ObjectId,
      required: [true, 'programId is required'],
      ref: 'Program',
      index: true
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      required: [true, 'academicYearId is required'],
      ref: 'AcademicYear',
      index: true
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['pending', 'active', 'suspended', 'withdrawn', 'completed', 'graduated', 'expired'],
        message: '{VALUE} is not a valid enrollment status'
      },
      index: true
    },
    enrollmentDate: {
      type: Date,
      required: [true, 'enrollmentDate is required']
    },
    startDate: {
      type: Date
    },
    completionDate: {
      type: Date
    },
    graduationDate: {
      type: Date
    },
    withdrawalDate: {
      type: Date
    },
    withdrawalReason: {
      type: String,
      trim: true
    },
    currentTerm: {
      type: String,
      trim: true
    },
    cumulativeGPA: {
      type: Number,
      min: [0, 'cumulativeGPA must be at least 0'],
      max: [4, 'cumulativeGPA cannot exceed 4']
    },
    totalCreditsEarned: {
      type: Number,
      min: [0, 'totalCreditsEarned cannot be negative'],
      default: 0
    },
    accessExpiresAt: {
      type: Date,
      index: true
    },
    accessExtendedAt: {
      type: Date
    },
    accessExtensionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Access extension reason cannot exceed 500 characters']
    },
    accessExtensionCount: {
      type: Number,
      min: [0, 'Access extension count cannot be negative'],
      default: 0
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index to prevent duplicate enrollments
EnrollmentSchema.index(
  { learnerId: 1, programId: 1, academicYearId: 1 },
  { unique: true }
);

// Additional indexes for common queries
EnrollmentSchema.index({ learnerId: 1, status: 1 });
EnrollmentSchema.index({ programId: 1, academicYearId: 1 });
EnrollmentSchema.index({ status: 1, academicYearId: 1 });
// Index for finding enrollments that are about to expire
EnrollmentSchema.index({ accessExpiresAt: 1, status: 1 });

export default mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
