import mongoose, { Schema, Document } from 'mongoose';

export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'long_answer'
  | 'matching'
  | 'flashcard'
  | 'fill_in_blank';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Type-specific answer interfaces
export interface IFlashcard {
  front: string;
  back: string;
  hint?: string;
}

export interface IBlank {
  position: number;
  acceptedAnswers: string[];
  matchThreshold: number;
}

export interface IQuestionHierarchy {
  parentQuestionId?: mongoose.Types.ObjectId;
  relatedQuestionIds: mongoose.Types.ObjectId[];
  prerequisiteQuestionIds: mongoose.Types.ObjectId[];
  conceptTag?: string;
  difficultyProgression?: number;
}

export interface IQuestion extends Document {
  questionText: string;
  questionTypes: QuestionType[];
  departmentId: mongoose.Types.ObjectId;
  points: number;
  options?: string[];
  correctAnswer?: string;
  correctAnswers?: string[];
  modelAnswer?: string;
  matchingPairs?: Record<string, string>;
  maxWordCount?: number;
  difficulty?: DifficultyLevel;
  tags?: string[];
  explanation?: string;
  hints?: string[];
  isActive: boolean;
  questionBankIds: string[];
  metadata?: Record<string, any>;
  // short_answer fields
  acceptedAnswers?: string[];
  matchThreshold?: number;
  // long_answer fields
  sampleAnswer?: string;
  rubric?: string;
  // flashcard fields
  cards?: IFlashcard[];
  // fill_in_blank fields
  blanks?: IBlank[];
  // hierarchy for adaptive testing
  hierarchy?: IQuestionHierarchy;
  // Adaptive learning fields (optional)
  knowledgeNodeId?: mongoose.Types.ObjectId;
  cognitiveDepth?: string; // slug, validated against CognitiveDepthLevel
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSchema = new Schema<IFlashcard>(
  {
    front: { type: String, required: true },
    back: { type: String, required: true },
    hint: { type: String }
  },
  { _id: false }
);

const BlankSchema = new Schema<IBlank>(
  {
    position: { type: Number, required: true },
    acceptedAnswers: { type: [String], required: true },
    matchThreshold: { type: Number, required: true, min: 0, max: 100 }
  },
  { _id: false }
);

const HierarchySchema = new Schema<IQuestionHierarchy>(
  {
    parentQuestionId: { type: Schema.Types.ObjectId, ref: 'Question' },
    relatedQuestionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
    prerequisiteQuestionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
    conceptTag: { type: String },
    difficultyProgression: { type: Number }
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>(
  {
    questionText: {
      type: String,
      required: [true, 'questionText is required'],
      trim: true
    },
    questionTypes: {
      type: [String],
      required: [true, 'questionTypes is required'],
      validate: {
        validator: function(v: string[]) {
          return v && v.length > 0;
        },
        message: 'questionTypes must contain at least one type'
      },
      enum: {
        values: ['multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'long_answer', 'matching', 'flashcard', 'fill_in_blank'],
        message: '{VALUE} is not a valid question type'
      },
      index: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'departmentId is required'],
      ref: 'Department',
      index: true
    },
    points: {
      type: Number,
      required: [true, 'points is required'],
      min: [1, 'points must be at least 1']
    },
    options: [String],
    correctAnswer: {
      type: String,
      trim: true
    },
    correctAnswers: [String],
    modelAnswer: {
      type: String,
      trim: true
    },
    matchingPairs: {
      type: Schema.Types.Mixed
    },
    maxWordCount: {
      type: Number,
      min: [1, 'maxWordCount must be at least 1']
    },
    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: '{VALUE} is not a valid difficulty level'
      },
      index: true
    },
    tags: [String],
    explanation: {
      type: String,
      trim: true
    },
    hints: [String],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    questionBankIds: {
      type: [String],
      default: [],
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    // short_answer fields
    acceptedAnswers: [String],
    matchThreshold: {
      type: Number,
      min: [0, 'matchThreshold must be at least 0'],
      max: [100, 'matchThreshold must be at most 100']
    },
    // long_answer fields
    sampleAnswer: {
      type: String,
      trim: true
    },
    rubric: {
      type: String,
      trim: true
    },
    // flashcard fields
    cards: [FlashcardSchema],
    // fill_in_blank fields
    blanks: [BlankSchema],
    // hierarchy for adaptive testing
    hierarchy: HierarchySchema,
    // Adaptive learning fields (optional)
    knowledgeNodeId: {
      type: Schema.Types.ObjectId,
      ref: 'KnowledgeNode',
      index: true
    },
    cognitiveDepth: {
      type: String,
      lowercase: true,
      trim: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common queries
QuestionSchema.index({ departmentId: 1, questionTypes: 1 });
QuestionSchema.index({ departmentId: 1, difficulty: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ isActive: 1, departmentId: 1 });

// Hierarchy indexes for adaptive testing
QuestionSchema.index({ 'hierarchy.parentQuestionId': 1 });
QuestionSchema.index({ 'hierarchy.conceptTag': 1 });

// Adaptive learning indexes
QuestionSchema.index({ knowledgeNodeId: 1, cognitiveDepth: 1 });
QuestionSchema.index({ departmentId: 1, knowledgeNodeId: 1 });
QuestionSchema.index({ departmentId: 1, cognitiveDepth: 1 });

// Pre-save validation to prevent circular dependencies in hierarchy
QuestionSchema.pre('save', async function(next) {
  if (!this.hierarchy?.parentQuestionId) {
    return next();
  }

  const parentId = this.hierarchy.parentQuestionId;
  const currentId = this._id;

  // A question cannot be its own parent
  if (parentId.equals(currentId)) {
    const error = new Error('A question cannot be its own parent');
    return next(error);
  }

  // Check for cycles: ensure parent doesn't have this question as its parent
  try {
    const Question = mongoose.model<IQuestion>('Question');
    const visited = new Set<string>();
    let currentParentId: mongoose.Types.ObjectId | undefined = parentId;

    while (currentParentId) {
      const parentIdStr = currentParentId.toString();

      // If we've seen this parent before, there's a cycle
      if (visited.has(parentIdStr)) {
        const error = new Error('Circular dependency detected in question hierarchy');
        return next(error);
      }

      // If the parent points back to current question, there's a cycle
      if (currentParentId.equals(currentId)) {
        const error = new Error('Circular dependency detected in question hierarchy');
        return next(error);
      }

      visited.add(parentIdStr);

      const parentQuestion: { hierarchy?: { parentQuestionId?: mongoose.Types.ObjectId } } | null =
        await Question.findById(currentParentId).select('hierarchy.parentQuestionId').lean();
      currentParentId = parentQuestion?.hierarchy?.parentQuestionId;
    }

    next();
  } catch (err) {
    next(err as Error);
  }
});

export default mongoose.model<IQuestion>('Question', QuestionSchema);
