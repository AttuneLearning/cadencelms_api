import mongoose, { Schema, Document } from 'mongoose';

export type ModuleAccessStatus = 'accessed' | 'in_progress' | 'completed';

export interface IModuleAccess extends Document {
  learnerId: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;

  firstAccessedAt: Date;
  lastAccessedAt: Date;
  accessCount: number;

  hasStartedLearningUnit: boolean;
  firstLearningUnitStartedAt?: Date;
  learningUnitsCompleted: number;
  learningUnitsTotal: number;

  status: ModuleAccessStatus;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const moduleAccessSchema = new Schema<IModuleAccess>(
  {
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Learner',
      required: [true, 'Learner is required']
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment is required']
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module is required']
    },
    firstAccessedAt: {
      type: Date,
      required: [true, 'First accessed time is required']
    },
    lastAccessedAt: {
      type: Date,
      required: [true, 'Last accessed time is required']
    },
    accessCount: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'Access count must be at least 1']
    },
    hasStartedLearningUnit: {
      type: Boolean,
      required: true,
      default: false
    },
    firstLearningUnitStartedAt: {
      type: Date
    },
    learningUnitsCompleted: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Learning units completed cannot be negative']
    },
    learningUnitsTotal: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Learning units total cannot be negative']
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['accessed', 'in_progress', 'completed'],
        message: '{VALUE} is not a valid module access status'
      },
      default: 'accessed'
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying and analytics
// Unique compound index: one access record per learner-module pair
moduleAccessSchema.index({ learnerId: 1, moduleId: 1 }, { unique: true });

// Analytics queries: identify learners who accessed but never started (drop-off)
moduleAccessSchema.index({ moduleId: 1, hasStartedLearningUnit: 1 });

// Analytics queries: filter by status for progress tracking
moduleAccessSchema.index({ moduleId: 1, status: 1 });

// Enrollment-based queries: get all module access for a learner's enrollment
moduleAccessSchema.index({ enrollmentId: 1 });

const ModuleAccess = mongoose.model<IModuleAccess>('ModuleAccess', moduleAccessSchema);

export default ModuleAccess;
