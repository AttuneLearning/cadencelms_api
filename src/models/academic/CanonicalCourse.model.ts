import mongoose, { Schema, Document } from 'mongoose';

/**
 * CanonicalCourse - The stable identity of a course across all versions.
 *
 * This represents the "concept" of a course that persists as versions evolve.
 * The code remains stable while the course content can be versioned.
 *
 * Related: CourseVersion model
 */
export interface ICanonicalCourse extends Document {
  code: string;                                    // Stable course code, e.g., "CS101"
  departmentId: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId | null;

  // Current state pointers
  currentPublishedVersionId: mongoose.Types.ObjectId | null;  // Latest published version
  latestDraftVersionId: mongoose.Types.ObjectId | null;       // Latest draft (if any)
  totalVersions: number;

  // Audit
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const canonicalCourseSchema = new Schema<ICanonicalCourse>(
  {
    code: {
      type: String,
      required: [true, 'Course code is required'],
      uppercase: true,
      trim: true,
      maxlength: [50, 'Course code cannot exceed 50 characters']
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required']
    },
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      default: null
    },
    currentPublishedVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseVersion',
      default: null
    },
    latestDraftVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseVersion',
      default: null
    },
    totalVersions: {
      type: Number,
      default: 0,
      min: [0, 'Total versions cannot be negative']
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    }
  },
  {
    timestamps: true
  }
);

// Compound index for unique code within department
canonicalCourseSchema.index({ departmentId: 1, code: 1 }, { unique: true });
canonicalCourseSchema.index({ programId: 1 });
canonicalCourseSchema.index({ createdBy: 1 });
canonicalCourseSchema.index({ currentPublishedVersionId: 1 });
canonicalCourseSchema.index({ latestDraftVersionId: 1 });

const CanonicalCourse = mongoose.model<ICanonicalCourse>('CanonicalCourse', canonicalCourseSchema);

export default CanonicalCourse;
