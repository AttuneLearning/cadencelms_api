import mongoose, { Schema, Document } from 'mongoose';

export type CohortStatus = 'active' | 'graduated' | 'inactive';

export interface ICohort extends Document {
  name: string;
  code: string;
  academicYearId: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId;
  level?: string;
  startYear: number;
  endYear: number;
  status: CohortStatus;
  description?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const cohortSchema = new Schema<ICohort>(
  {
    name: {
      type: String,
      required: [true, 'Cohort name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    code: {
      type: String,
      required: [true, 'Cohort code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]+$/, 'Code must contain only uppercase letters, numbers, and hyphens']
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'Academic year is required']
    },
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program is required']
    },
    level: {
      type: String,
      trim: true
    },
    startYear: {
      type: Number,
      required: [true, 'Start year is required'],
      min: [1900, 'Start year must be after 1900'],
      max: [2200, 'Start year must be before 2200']
    },
    endYear: {
      type: Number,
      required: [true, 'End year is required'],
      min: [1900, 'End year must be after 1900'],
      max: [2200, 'End year must be before 2200']
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'graduated', 'inactive'],
        message: '{VALUE} is not a valid cohort status'
      },
      default: 'active'
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

// Indexes
cohortSchema.index({ code: 1 }, { unique: true });
cohortSchema.index({ academicYearId: 1 });
cohortSchema.index({ programId: 1 });
cohortSchema.index({ status: 1 });
cohortSchema.index({ startYear: 1, endYear: 1 });
cohortSchema.index({ isActive: 1 });

// Validate years
cohortSchema.pre('save', function (next) {
  if (this.endYear < this.startYear) {
    next(new Error('End year must be after or equal to start year'));
  } else {
    next();
  }
});

const Cohort = mongoose.model<ICohort>('Cohort', cohortSchema);

export default Cohort;
