import mongoose, { Schema, Document } from 'mongoose';

/**
 * CourseVersionModule - Join table linking modules to course versions.
 *
 * This model manages which modules belong to which course versions,
 * allowing the same module to be included in multiple versions with
 * different ordering and settings.
 *
 * Related: CourseVersion, Module
 */
export interface ICourseVersionModule extends Document {
  courseVersionId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  order: number; // Position within this version
  isRequired: boolean;
  availableFrom: Date | null;
  availableUntil: Date | null;
  createdAt: Date;
}

const courseVersionModuleSchema = new Schema<ICourseVersionModule>(
  {
    courseVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseVersion',
      required: [true, 'Course version reference is required'],
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module reference is required'],
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
      min: [0, 'Order cannot be negative'],
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    availableFrom: {
      type: Date,
      default: null,
    },
    availableUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for unique module within a version
courseVersionModuleSchema.index({ courseVersionId: 1, moduleId: 1 }, { unique: true });

// Index for listing modules by version in order
courseVersionModuleSchema.index({ courseVersionId: 1, order: 1 });

// Index for finding all versions containing a module
courseVersionModuleSchema.index({ moduleId: 1 });

const CourseVersionModule = mongoose.model<ICourseVersionModule>(
  'CourseVersionModule',
  courseVersionModuleSchema
);

export default CourseVersionModule;
