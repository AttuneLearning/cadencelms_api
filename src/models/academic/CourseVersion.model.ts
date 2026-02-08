import mongoose, { Schema, Document } from 'mongoose';

/**
 * CourseVersion status lifecycle
 */
export type CourseVersionStatus = 'draft' | 'published' | 'archived';

/**
 * Reason a version was locked
 */
export type LockReason = 'superseded' | 'archived' | 'manual';

/**
 * Course settings that can vary per version
 */
export interface ICourseSettings {
  allowSelfEnrollment: boolean;
  passingScore: number;           // 0-100
  maxAttempts: number | null;     // null = unlimited
  certificateEnabled: boolean;
  enforcePrerequisites: boolean;
  showProgressBar: boolean;
  allowModuleSkipping: boolean;
}

/**
 * Statistics snapshot captured when a version is locked
 */
export interface ICourseVersionStats {
  moduleCount: number;
  learningUnitCount: number;
  enrollmentCount: number;
}

/**
 * CourseVersion - An immutable snapshot of a course at a point in time.
 *
 * Each version represents a complete, self-contained definition of course
 * metadata. When published, the previous version is locked and this becomes
 * the current version.
 *
 * Related: CanonicalCourse model
 */
export interface ICourseVersion extends Document {
  canonicalCourseId: mongoose.Types.ObjectId;
  version: number;                             // 1, 2, 3...

  // Course metadata (version-specific)
  title: string;
  description: string | null;
  credits: number;
  duration: number;                            // in minutes
  settings: ICourseSettings;
  instructorIds: mongoose.Types.ObjectId[];

  // Lifecycle
  status: CourseVersionStatus;
  isLocked: boolean;
  isLatest: boolean;                           // Is this the latest version?

  // Lineage
  parentVersionId: mongoose.Types.ObjectId | null;  // null for v1

  // Audit - creation
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;

  // Audit - publishing
  publishedAt: Date | null;
  publishedBy: mongoose.Types.ObjectId | null;

  // Audit - locking
  lockedAt: Date | null;
  lockedBy: mongoose.Types.ObjectId | null;
  lockedReason: LockReason | null;

  // Change tracking
  changeNotes: string | null;

  // Stats (snapshot at lock time for historical record)
  statsAtLock: ICourseVersionStats | null;

  updatedAt: Date;
}

const courseSettingsSchema = new Schema<ICourseSettings>(
  {
    allowSelfEnrollment: {
      type: Boolean,
      default: false
    },
    passingScore: {
      type: Number,
      default: 70,
      min: [0, 'Passing score cannot be negative'],
      max: [100, 'Passing score cannot exceed 100']
    },
    maxAttempts: {
      type: Number,
      default: null,
      min: [1, 'Max attempts must be at least 1']
    },
    certificateEnabled: {
      type: Boolean,
      default: false
    },
    enforcePrerequisites: {
      type: Boolean,
      default: true
    },
    showProgressBar: {
      type: Boolean,
      default: true
    },
    allowModuleSkipping: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const courseVersionStatsSchema = new Schema<ICourseVersionStats>(
  {
    moduleCount: {
      type: Number,
      required: true,
      min: 0
    },
    learningUnitCount: {
      type: Number,
      required: true,
      min: 0
    },
    enrollmentCount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const courseVersionSchema = new Schema<ICourseVersion>(
  {
    canonicalCourseId: {
      type: Schema.Types.ObjectId,
      ref: 'CanonicalCourse',
      required: [true, 'Canonical course reference is required']
    },
    version: {
      type: Number,
      required: [true, 'Version number is required'],
      min: [1, 'Version must be at least 1']
    },
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [200, 'Course title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: null
    },
    credits: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Credits cannot be negative']
    },
    duration: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Duration cannot be negative']
    },
    settings: {
      type: courseSettingsSchema,
      default: () => ({})
    },
    instructorIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: []
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['draft', 'published', 'archived'],
        message: 'Status must be draft, published, or archived'
      },
      default: 'draft'
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    isLatest: {
      type: Boolean,
      default: true
    },
    parentVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseVersion',
      default: null
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    publishedAt: {
      type: Date,
      default: null
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lockedAt: {
      type: Date,
      default: null
    },
    lockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lockedReason: {
      type: String,
      enum: {
        values: ['superseded', 'archived', 'manual', null],
        message: 'Lock reason must be superseded, archived, manual, or null'
      },
      default: null
    },
    changeNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Change notes cannot exceed 2000 characters'],
      default: null
    },
    statsAtLock: {
      type: courseVersionStatsSchema,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for unique version within canonical course
courseVersionSchema.index({ canonicalCourseId: 1, version: 1 }, { unique: true });
courseVersionSchema.index({ canonicalCourseId: 1, status: 1 });
courseVersionSchema.index({ canonicalCourseId: 1, isLatest: 1 });
courseVersionSchema.index({ status: 1 });
courseVersionSchema.index({ isLocked: 1 });
courseVersionSchema.index({ createdBy: 1 });
courseVersionSchema.index({ publishedAt: 1 });
courseVersionSchema.index({ parentVersionId: 1 });

const CourseVersion = mongoose.model<ICourseVersion>('CourseVersion', courseVersionSchema);

export default CourseVersion;
