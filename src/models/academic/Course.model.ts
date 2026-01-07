import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  name: string;
  code: string;
  description?: string;
  departmentId: mongoose.Types.ObjectId;
  credits: number;
  prerequisites?: mongoose.Types.ObjectId[];
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      maxlength: [200, 'Course name cannot exceed 200 characters']
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      uppercase: true,
      trim: true,
      maxlength: [50, 'Course code cannot exceed 50 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required']
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: [0, 'Credits cannot be negative']
    },
    prerequisites: {
      type: [Schema.Types.ObjectId],
      ref: 'Course',
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

// Compound index for unique code within department
courseSchema.index({ departmentId: 1, code: 1 }, { unique: true });
courseSchema.index({ isActive: 1 });
courseSchema.index({ credits: 1 });

const Course = mongoose.model<ICourse>('Course', courseSchema);

export default Course;
