import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  name: string;
  courseId: mongoose.Types.ObjectId;
  academicYearId: mongoose.Types.ObjectId;
  termCode: string;
  startDate: Date;
  endDate: Date;
  schedule?: string;
  location?: string;
  instructorIds: mongoose.Types.ObjectId[];
  maxEnrollment: number;
  currentEnrollment: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<IClass>(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      maxlength: [200, 'Class name cannot exceed 200 characters']
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'Academic year is required']
    },
    termCode: {
      type: String,
      required: [true, 'Term code is required'],
      uppercase: true,
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    schedule: {
      type: String,
      trim: true,
      maxlength: [500, 'Schedule cannot exceed 500 characters']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters']
    },
    instructorIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Staff',
      default: []
    },
    maxEnrollment: {
      type: Number,
      required: [true, 'Max enrollment is required'],
      min: [1, 'Max enrollment must be at least 1']
    },
    currentEnrollment: {
      type: Number,
      default: 0,
      min: [0, 'Current enrollment cannot be negative']
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

// Indexes for efficient querying
classSchema.index({ courseId: 1 });
classSchema.index({ academicYearId: 1 });
classSchema.index({ termCode: 1 });
classSchema.index({ isActive: 1 });
classSchema.index({ courseId: 1, academicYearId: 1, termCode: 1 });
classSchema.index({ instructorIds: 1 });

// Validate class dates
classSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error('Class end date must be after start date'));
  } else {
    next();
  }
});

const Class = mongoose.model<IClass>('Class', classSchema);

export default Class;
