import mongoose, { Schema, Document } from 'mongoose';

export type TermType =
  | 'fall'
  | 'spring'
  | 'summer'
  | 'winter'
  | 'quarter1'
  | 'quarter2'
  | 'quarter3'
  | 'quarter4'
  | 'custom';

export interface IAcademicTerm extends Document {
  name: string;
  academicYearId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  termType: TermType;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const academicTermSchema = new Schema<IAcademicTerm>(
  {
    name: {
      type: String,
      required: [true, 'Term name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'Academic year is required']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    termType: {
      type: String,
      required: [true, 'Term type is required'],
      enum: {
        values: ['fall', 'spring', 'summer', 'winter', 'quarter1', 'quarter2', 'quarter3', 'quarter4', 'custom'],
        message: '{VALUE} is not a valid term type'
      }
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
academicTermSchema.index({ academicYearId: 1, name: 1 }, { unique: true });
academicTermSchema.index({ academicYearId: 1, startDate: 1, endDate: 1 });
academicTermSchema.index({ startDate: 1, endDate: 1 });
academicTermSchema.index({ isActive: 1 });
academicTermSchema.index({ termType: 1 });

// Validate term dates
academicTermSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error('Term end date must be after start date'));
  } else {
    next();
  }
});

const AcademicTerm = mongoose.model<IAcademicTerm>('AcademicTerm', academicTermSchema);

export default AcademicTerm;
