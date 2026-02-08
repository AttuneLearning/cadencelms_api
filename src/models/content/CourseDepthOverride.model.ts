import mongoose, { Schema, Document } from 'mongoose';

/**
 * CourseDepthOverride Model
 *
 * Stores course-level overrides for cognitive depth level settings.
 * Allows courses to customize adaptive learning thresholds when department permits.
 *
 * Override Resolution:
 * 1. Check for course-specific override with matching slug
 * 2. Fall back to department level (if exists)
 * 3. Fall back to system default
 *
 * Related:
 * - CognitiveDepthLevel.model.ts (base settings)
 * - COURSE_DEPTH_OVERRIDE_IMPLEMENTATION_PLAN.md
 */

export interface ICourseDepthOverride extends Document {
  courseId: mongoose.Types.ObjectId;
  slug: string;
  advanceThreshold?: number;
  minAttempts?: number;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const courseDepthOverrideSchema = new Schema<ICourseDepthOverride>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required']
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      lowercase: true,
      trim: true,
      maxlength: [50, 'Slug must not exceed 50 characters'],
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only']
    },
    advanceThreshold: {
      type: Number,
      min: [0, 'Advance threshold must be at least 0'],
      max: [1, 'Advance threshold must not exceed 1']
    },
    minAttempts: {
      type: Number,
      min: [1, 'Minimum attempts must be at least 1'],
      max: [100, 'Minimum attempts must not exceed 100']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must not exceed 500 characters']
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    }
  },
  {
    timestamps: true,
    collection: 'coursedepthoverrides'
  }
);

// Compound unique index: courseId + slug
// Prevents duplicate overrides for same slug within a course
courseDepthOverrideSchema.index({ courseId: 1, slug: 1 }, { unique: true });

// Index for bulk queries by course
courseDepthOverrideSchema.index({ courseId: 1 });

// Validation: At least one override field must be provided
courseDepthOverrideSchema.pre('validate', function (next) {
  if (
    this.advanceThreshold === undefined &&
    this.minAttempts === undefined &&
    !this.description
  ) {
    return next(
      new Error('At least one override field (advanceThreshold, minAttempts, or description) must be provided')
    );
  }
  next();
});

export const CourseDepthOverride = mongoose.model<ICourseDepthOverride>(
  'CourseDepthOverride',
  courseDepthOverrideSchema
);
