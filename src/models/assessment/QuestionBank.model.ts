import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionBank extends Document {
  name: string;
  description?: string;
  departmentId: mongoose.Types.ObjectId;
  questionIds: mongoose.Types.ObjectId[];
  tags?: string[];
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  questionCount?: number;
  usageCount?: number;
}

const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'departmentId is required'],
      ref: 'Department',
      index: true
    },
    questionIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Question'
    }],
    tags: [String],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common queries
QuestionBankSchema.index({ departmentId: 1, isActive: 1 });
QuestionBankSchema.index({ tags: 1 });

// Virtual: Count of questions that belong to this bank
QuestionBankSchema.virtual('questionCount', {
  ref: 'Question',
  localField: '_id',
  foreignField: 'questionBankIds',
  count: true
});

// Virtual: Count of LearningUnitQuestion links that reference this bank
QuestionBankSchema.virtual('usageCount', {
  ref: 'LearningUnitQuestion',
  localField: '_id',
  foreignField: 'bankId',
  count: true
});

// Enable virtuals in toJSON and toObject
QuestionBankSchema.set('toJSON', { virtuals: true });
QuestionBankSchema.set('toObject', { virtuals: true });

export default mongoose.model<IQuestionBank>('QuestionBank', QuestionBankSchema);
