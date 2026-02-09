import mongoose, { Schema, Document } from 'mongoose';

export type SubmissionType = 'text' | 'file' | 'text_and_file';

export interface IAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  title: string;
  instructions: string;
  submissionType: SubmissionType;
  allowedFileTypes: string[];
  maxFileSize: number;
  maxFiles: number;
  maxScore: number;
  maxResubmissions: number | null;
  isPublished: boolean;
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      required: [true, 'courseId is required'],
      ref: 'Course'
    },

    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module'
    },

    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      maxlength: [200, 'title cannot exceed 200 characters']
    },

    instructions: {
      type: String,
      required: [true, 'instructions is required'],
      trim: true,
      maxlength: [10000, 'instructions cannot exceed 10000 characters']
    },

    submissionType: {
      type: String,
      required: [true, 'submissionType is required'],
      enum: {
        values: ['text', 'file', 'text_and_file'],
        message: '{VALUE} is not a valid submission type'
      }
    },

    allowedFileTypes: {
      type: [String],
      default: ['pdf', 'docx', 'jpg', 'png']
    },

    maxFileSize: {
      type: Number,
      default: 10485760,
      min: [0, 'maxFileSize cannot be negative']
    },

    maxFiles: {
      type: Number,
      default: 5,
      min: [1, 'maxFiles must be at least 1'],
      max: [20, 'maxFiles cannot exceed 20']
    },

    maxScore: {
      type: Number,
      required: [true, 'maxScore is required'],
      min: [0, 'maxScore cannot be negative']
    },

    maxResubmissions: {
      type: Number,
      default: 0,
      min: [0, 'maxResubmissions cannot be negative']
    },

    isPublished: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      required: [true, 'createdBy is required'],
      ref: 'User'
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'assignments'
  }
);

// Indexes
assignmentSchema.index({ courseId: 1, isDeleted: 1, isPublished: 1 });
assignmentSchema.index({ createdBy: 1, isDeleted: 1 });

const Assignment = mongoose.model<IAssignment>('Assignment', assignmentSchema);

export default Assignment;
