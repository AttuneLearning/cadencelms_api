import mongoose, { Schema, Document } from 'mongoose';

export type ContentType = 
  | 'scorm' 
  | 'video' 
  | 'document' 
  | 'quiz' 
  | 'assignment' 
  | 'external-link' 
  | 'text';

export interface ISCORMData {
  version: string;
  manifestPath: string;
  launchPath: string;
  masteryScore?: number;
}

export interface IQuizData {
  passingScore?: number;
  timeLimit?: number;
  randomizeQuestions?: boolean;
  showCorrectAnswers?: boolean;
}

export interface IContent extends Document {
  title: string;
  description?: string;
  type: ContentType;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  scormData?: ISCORMData;
  quizData?: IQuizData;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const scormDataSchema = new Schema<ISCORMData>(
  {
    version: {
      type: String,
      required: true
    },
    manifestPath: {
      type: String,
      required: true
    },
    launchPath: {
      type: String,
      required: true
    },
    masteryScore: {
      type: Number,
      min: [0, 'Mastery score cannot be negative'],
      max: [100, 'Mastery score cannot exceed 100']
    }
  },
  { _id: false }
);

const quizDataSchema = new Schema<IQuizData>(
  {
    passingScore: {
      type: Number,
      min: [0, 'Passing score cannot be negative'],
      max: [100, 'Passing score cannot exceed 100']
    },
    timeLimit: {
      type: Number,
      min: [0, 'Time limit cannot be negative']
    },
    randomizeQuestions: {
      type: Boolean,
      default: false
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const contentSchema = new Schema<IContent>(
  {
    title: {
      type: String,
      required: [true, 'Content title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    type: {
      type: String,
      required: [true, 'Content type is required'],
      enum: {
        values: ['scorm', 'video', 'document', 'quiz', 'assignment', 'external-link', 'text'],
        message: '{VALUE} is not a valid content type'
      }
    },
    fileUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'File URL cannot exceed 500 characters']
    },
    fileSize: {
      type: Number,
      min: [0, 'File size cannot be negative']
    },
    mimeType: {
      type: String,
      trim: true,
      maxlength: [100, 'MIME type cannot exceed 100 characters']
    },
    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative']
    },
    scormData: {
      type: scormDataSchema,
      default: undefined
    },
    quizData: {
      type: quizDataSchema,
      default: undefined
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff'
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
contentSchema.index({ type: 1 });
contentSchema.index({ isActive: 1 });
contentSchema.index({ createdBy: 1 });
contentSchema.index({ createdAt: -1 });

const Content = mongoose.model<IContent>('Content', contentSchema);

export default Content;
