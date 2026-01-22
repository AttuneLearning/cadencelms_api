import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningUnit extends Document {
  moduleId: mongoose.Types.ObjectId;
  title: string;
  description?: string;

  type: 'scorm' | 'custom' | 'exercise' | 'video' | 'document' | 'assessment';
  contentId?: mongoose.Types.ObjectId;

  // New fields from UI spec
  category: 'exposition' | 'practice' | 'assessment';
  isRequired: boolean;
  isReplayable: boolean;
  weight: number;

  sequence: number;
  availableFrom?: Date;
  availableUntil?: Date;
  isActive: boolean;

  settings?: {
    allowMultipleAttempts?: boolean;
    maxAttempts?: number | null;
    timeLimit?: number | null;
    showFeedback?: boolean;
    shuffleQuestions?: boolean;
    passingScore?: number;
  };

  estimatedDuration?: number;

  metadata?: Record<string, any>;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const learningUnitSchema = new Schema<ILearningUnit>(
  {
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: {
        values: ['scorm', 'custom', 'exercise', 'video', 'document', 'assessment'],
        message: 'Invalid type: {VALUE}'
      },
      required: [true, 'Type is required'],
      index: true
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content'
    },
    category: {
      type: String,
      enum: {
        values: ['exposition', 'practice', 'assessment'],
        message: 'Invalid category: {VALUE}'
      },
      required: [true, 'Category is required']
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    isReplayable: {
      type: Boolean,
      default: false
    },
    weight: {
      type: Number,
      min: [0, 'Weight must be at least 0'],
      max: [100, 'Weight must not exceed 100'],
      default: 0
    },
    sequence: {
      type: Number,
      required: [true, 'Sequence is required'],
      min: [1, 'Sequence must be at least 1']
    },
    availableFrom: {
      type: Date
    },
    availableUntil: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    settings: {
      allowMultipleAttempts: { type: Boolean },
      maxAttempts: { type: Number },
      timeLimit: { type: Number },
      showFeedback: { type: Boolean },
      shuffleQuestions: { type: Boolean },
      passingScore: { type: Number }
    },
    estimatedDuration: {
      type: Number
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient querying
learningUnitSchema.index({ moduleId: 1, sequence: 1 });
learningUnitSchema.index({ moduleId: 1, category: 1 });

const LearningUnit = mongoose.model<ILearningUnit>('LearningUnit', learningUnitSchema);

export default LearningUnit;
