import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningUnitQuestion extends Document {
  learningUnitId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  bankId?: mongoose.Types.ObjectId;
  sequence: number;
  pointsOverride: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const learningUnitQuestionSchema = new Schema<ILearningUnitQuestion>(
  {
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
    bankId: {
      type: Schema.Types.ObjectId,
      ref: 'QuestionBank'
    },
    sequence: {
      type: Number,
      required: [true, 'sequence is required'],
      min: [0, 'sequence must be >= 0']
    },
    pointsOverride: {
      type: Number,
      default: null,
      min: [0, 'pointsOverride must be >= 0']
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index - question can only be linked once per learning unit
learningUnitQuestionSchema.index(
  { learningUnitId: 1, questionId: 1 },
  { unique: true }
);

// Index for finding all questions for a learning unit in sequence order
learningUnitQuestionSchema.index({ learningUnitId: 1, sequence: 1 });

// Index for finding usage of a bank
learningUnitQuestionSchema.index({ bankId: 1 });

const LearningUnitQuestion = mongoose.model<ILearningUnitQuestion>('LearningUnitQuestion', learningUnitQuestionSchema);

export default LearningUnitQuestion;
