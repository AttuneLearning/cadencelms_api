import mongoose, { Schema, Document } from 'mongoose';

export type SubmissionStatus = 'draft' | 'submitted' | 'graded' | 'returned';

export interface ISubmissionFile {
  fileId: mongoose.Types.ObjectId;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface IAssignmentSubmission extends Document {
  _id: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;
  submissionNumber: number;
  status: SubmissionStatus;
  textContent: string | null;
  files: ISubmissionFile[];
  submittedAt: Date | null;
  grade: number | null;
  feedback: string | null;
  gradedBy: mongoose.Types.ObjectId | null;
  gradedAt: Date | null;
  returnedAt: Date | null;
  returnReason: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const submissionFileSchema = new Schema<ISubmissionFile>(
  {
    fileId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'MediaAttachment'
    },
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const assignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'assignmentId is required'],
      ref: 'Assignment'
    },

    learnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'learnerId is required'],
      ref: 'User'
    },

    enrollmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'enrollmentId is required'],
      ref: 'Enrollment'
    },

    submissionNumber: {
      type: Number,
      required: [true, 'submissionNumber is required'],
      min: [1, 'submissionNumber must be at least 1']
    },

    status: {
      type: String,
      default: 'draft',
      enum: {
        values: ['draft', 'submitted', 'graded', 'returned'],
        message: '{VALUE} is not a valid submission status'
      }
    },

    textContent: {
      type: String,
      default: null,
      maxlength: [50000, 'textContent cannot exceed 50000 characters']
    },

    files: {
      type: [submissionFileSchema],
      default: []
    },

    submittedAt: {
      type: Date,
      default: null
    },

    grade: {
      type: Number,
      default: null,
      min: [0, 'grade cannot be negative']
    },

    feedback: {
      type: String,
      default: null,
      maxlength: [5000, 'feedback cannot exceed 5000 characters']
    },

    gradedBy: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: 'User'
    },

    gradedAt: {
      type: Date,
      default: null
    },

    returnedAt: {
      type: Date,
      default: null
    },

    returnReason: {
      type: String,
      default: null,
      maxlength: [2000, 'returnReason cannot exceed 2000 characters']
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'assignment_submissions'
  }
);

// Indexes
assignmentSubmissionSchema.index(
  { assignmentId: 1, learnerId: 1, submissionNumber: 1 },
  { unique: true }
);
assignmentSubmissionSchema.index({ assignmentId: 1, status: 1, isDeleted: 1 });
assignmentSubmissionSchema.index({ learnerId: 1, status: 1, isDeleted: 1 });
assignmentSubmissionSchema.index({ assignmentId: 1, learnerId: 1, isDeleted: 1 });

const AssignmentSubmission = mongoose.model<IAssignmentSubmission>(
  'AssignmentSubmission',
  assignmentSubmissionSchema
);

export default AssignmentSubmission;
