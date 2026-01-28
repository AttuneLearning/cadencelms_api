import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnerQuestionProgress extends Document {
  learnerId: mongoose.Types.ObjectId;
  learningUnitId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  correctCount: number;
  incorrectCount: number;
  lastAttemptAt: Date | null;
  isActive: boolean;
  masteredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const learnerQuestionProgressSchema = new Schema<ILearnerQuestionProgress>(
  {
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'learnerId is required'],
      index: true
    },
    learningUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'LearningUnit',
      required: [true, 'learningUnitId is required'],
      index: true
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'questionId is required']
    },
    correctCount: {
      type: Number,
      default: 0,
      min: [0, 'correctCount must be >= 0']
    },
    incorrectCount: {
      type: Number,
      default: 0,
      min: [0, 'incorrectCount must be >= 0']
    },
    lastAttemptAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    masteredAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: one progress record per learner/unit/question combination
learnerQuestionProgressSchema.index(
  { learnerId: 1, learningUnitId: 1, questionId: 1 },
  { unique: true }
);

// Index for finding active questions for a learner in a unit (adaptive testing queries)
learnerQuestionProgressSchema.index({ learnerId: 1, learningUnitId: 1, isActive: 1 });

// Virtual for total attempts
learnerQuestionProgressSchema.virtual('totalAttempts').get(function () {
  return this.correctCount + this.incorrectCount;
});

// Virtual for accuracy percentage
learnerQuestionProgressSchema.virtual('accuracy').get(function () {
  const total = this.correctCount + this.incorrectCount;
  return total > 0 ? Math.round((this.correctCount / total) * 100) : 0;
});

learnerQuestionProgressSchema.set('toJSON', { virtuals: true });
learnerQuestionProgressSchema.set('toObject', { virtuals: true });

const LearnerQuestionProgress = mongoose.model<ILearnerQuestionProgress>(
  'LearnerQuestionProgress',
  learnerQuestionProgressSchema
);

export default LearnerQuestionProgress;
