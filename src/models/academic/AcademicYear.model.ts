import mongoose, { Schema, Document } from 'mongoose';

export interface ITerm {
  name: string;
  code: string;
  startDate: Date;
  endDate: Date;
}

export interface IAcademicYear extends Document {
  name: string;
  code: string;
  startDate: Date;
  endDate: Date;
  terms: ITerm[];
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const termSchema = new Schema<ITerm>(
  {
    name: {
      type: String,
      required: [true, 'Term name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Term code is required'],
      uppercase: true,
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Term start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'Term end date is required']
    }
  },
  { _id: false }
);

// Validate term dates
termSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    next(new Error('Term end date must be after start date'));
  } else {
    next();
  }
});

const academicYearSchema = new Schema<IAcademicYear>(
  {
    name: {
      type: String,
      required: [true, 'Academic year name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    code: {
      type: String,
      required: [true, 'Academic year code is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Code cannot exceed 50 characters']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    terms: {
      type: [termSchema],
      default: []
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
