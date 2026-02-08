import mongoose, { Schema, Document } from 'mongoose';

/**
 * ModuleCompletion - Global completion tracking for modules.
 *
 * When a learner completes a module in one course, this record tracks
 * that completion globally so it can be recognized across all courses
 * that include the same module.
 *
 * Key concepts:
 * - isGlobalCompletion: When true, this completion applies to all courses
 *   containing this module, not just the one where it was completed.
 * - completedInCourseVersionId/completedInEnrollmentId: Track where the
 *   completion originally occurred for audit purposes.
 *
 * Related: Module, CourseVersion, Enrollment
 */
export interface IModuleCompletion extends Document {
  learnerId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;

  // Where the completion occurred
  completedInCourseVersionId: mongoose.Types.ObjectId;
  completedInEnrollmentId: mongoose.Types.ObjectId;

  // Completion details
  completedAt: Date;
  score: number | null;

  // Global completion flag
  isGlobalCompletion: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const moduleCompletionSchema = new Schema<IModuleCompletion>(
  {
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Learner',
      required: [true, 'Learner ID is required']
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module ID is required']
    },
    completedInCourseVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseVersion',
      required: [true, 'Course version ID is required']
    },
    completedInEnrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment ID is required']
    },
    completedAt: {
      type: Date,
      required: [true, 'Completion date is required']
    },
    score: {
      type: Number,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
      default: null
    },
    isGlobalCompletion: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Unique constraint: one completion record per learner-module pair
// (global completion supersedes any course-specific completions)
moduleCompletionSchema.index({ learnerId: 1, moduleId: 1 }, { unique: true });

// Index for querying learner's completions
moduleCompletionSchema.index({ learnerId: 1, completedAt: -1 });

// Index for querying module completions (analytics)
moduleCompletionSchema.index({ moduleId: 1, completedAt: -1 });

// Index for finding completions from a specific course version
moduleCompletionSchema.index({ completedInCourseVersionId: 1 });

// Index for finding completions from a specific enrollment
moduleCompletionSchema.index({ completedInEnrollmentId: 1 });

// Index for filtering global vs non-global completions
moduleCompletionSchema.index({ isGlobalCompletion: 1 });

const ModuleCompletion = mongoose.model<IModuleCompletion>(
  'ModuleCompletion',
  moduleCompletionSchema
);

export default ModuleCompletion;
