import mongoose, { Schema, Document } from 'mongoose';

export interface IAcademicYear extends Document {
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const academicYearSchema = new Schema<IAcademicYear>(
  {
    name: {
      type: String,
      required: [true, 'Academic year name is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    isCurrent: {
      type: Boolean,
      default: false
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

// Indexes (name index created by unique: true)
academicYearSchema.index({ isCurrent: 1 });
academicYearSchema.index({ isActive: 1 });
academicYearSchema.index({ startDate: 1, endDate: 1 });

// Validate academic year dates
academicYearSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error('Academic year end date must be after start date'));
  } else {
    next();
  }
});

const AcademicYear = mongoose.model<IAcademicYear>('AcademicYear', academicYearSchema);

export default AcademicYear;
