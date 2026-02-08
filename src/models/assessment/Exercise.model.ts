import mongoose, { Schema, Document } from 'mongoose';

export type ExerciseType = 'quiz' | 'exam' | 'practice' | 'assessment' | 'flashcard' | 'matching';
export type ExerciseStatus = 'draft' | 'published' | 'archived';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * Configuration for matching exercises
 * Each question contributes one match pair:
 * - questionText → Column A (the prompt)
 * - correctAnswers[0] → Column B (the answer)
 */
export interface IMatchingConfig {
  questionIds: mongoose.Types.ObjectId[]; // Questions to include as pairs
  shuffleColumnB: boolean;                // Randomize answer positions
  allowPartialCredit: boolean;            // Score based on correct count
  showFeedbackOnDrop: boolean;            // Immediate feedback or after submit
  maxAttempts?: number;                   // null = unlimited
  timeLimit?: number;                     // Seconds, null = unlimited
  columnALabel?: string;                  // e.g., "Organelle"
  columnBLabel?: string;                  // e.g., "Function"
}

export interface IExerciseQuestion {
  questionId: mongoose.Types.ObjectId;
  order: number;
  points: number;
}

export interface IExercise extends Document {
  title: string;
  description?: string;
  type: ExerciseType;
  department: mongoose.Types.ObjectId;
  difficulty?: DifficultyLevel;
  timeLimit: number;
  passingScore: number;
  totalPoints: number;
  questionCount: number;
  questions: IExerciseQuestion[];
  shuffleQuestions: boolean;
  showFeedback: boolean;
  allowReview: boolean;
  instructions?: string;
  status: ExerciseStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Matching exercise configuration
  matchingConfig?: IMatchingConfig;
  maxAttempts?: number | null;
  gradingPolicy?: 'best' | 'last' | 'average';
}

const ExerciseQuestionSchema = new Schema<IExerciseQuestion>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      required: [true, 'questionId is required'],
      ref: 'Question'
    },
    order: {
      type: Number,
      required: [true, 'order is required'],
      min: [1, 'order must be at least 1']
    },
    points: {
      type: Number,
      required: [true, 'points is required'],
      min: [0, 'points cannot be negative']
    }
  },
  { _id: false }
);

/**
 * Schema for matching exercise configuration
 */
const MatchingConfigSchema = new Schema<IMatchingConfig>(
  {
    questionIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Question',
      required: [true, 'questionIds is required for matching exercises'],
      validate: {
        validator: function (v: mongoose.Types.ObjectId[]) {
          return v && v.length >= 2;
        },
        message: 'Matching exercises require at least 2 question pairs'
      }
    },
    shuffleColumnB: {
      type: Boolean,
      default: true
    },
    allowPartialCredit: {
      type: Boolean,
      default: true
    },
    showFeedbackOnDrop: {
      type: Boolean,
      default: false
    },
    maxAttempts: {
      type: Number,
      min: [1, 'maxAttempts must be at least 1']
    },
    timeLimit: {
      type: Number,
      min: [0, 'timeLimit cannot be negative']
    },
    columnALabel: {
      type: String,
      trim: true,
      maxlength: [100, 'columnALabel cannot exceed 100 characters']
    },
    columnBLabel: {
      type: String,
      trim: true,
      maxlength: [100, 'columnBLabel cannot exceed 100 characters']
    }
  },
  { _id: false }
);

const ExerciseSchema = new Schema<IExercise>(
  {
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      minlength: [1, 'title cannot be empty'],
      maxlength: [200, 'title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'description cannot exceed 2000 characters']
    },
    type: {
      type: String,
      required: [true, 'type is required'],
      enum: {
        values: ['quiz', 'exam', 'practice', 'assessment', 'flashcard', 'matching'],
        message: '{VALUE} is not a valid exercise type'
      },
      index: true
    },
    department: {
      type: Schema.Types.ObjectId,
      required: [true, 'department is required'],
      ref: 'Department',
      index: true
    },
    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: '{VALUE} is not a valid difficulty level'
      },
      default: 'medium',
      index: true
    },
    timeLimit: {
      type: Number,
      required: [true, 'timeLimit is required'],
      min: [0, 'timeLimit cannot be negative'],
      default: 0
    },
    passingScore: {
      type: Number,
      required: [true, 'passingScore is required'],
      min: [0, 'passingScore must be at least 0'],
      max: [100, 'passingScore cannot exceed 100'],
      default: 70
    },
    totalPoints: {
      type: Number,
      required: [true, 'totalPoints is required'],
      min: [0, 'totalPoints cannot be negative'],
      default: 0
    },
    questionCount: {
      type: Number,
      required: [true, 'questionCount is required'],
      min: [0, 'questionCount cannot be negative'],
      default: 0
    },
    questions: {
      type: [ExerciseQuestionSchema],
      default: []
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    showFeedback: {
      type: Boolean,
      default: true
    },
    allowReview: {
      type: Boolean,
      default: true
    },
    instructions: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['draft', 'published', 'archived'],
        message: '{VALUE} is not a valid status'
      },
      default: 'draft',
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: [true, 'createdBy is required'],
      ref: 'User',
      index: true
    },
    // Matching exercise configuration (only for type='matching')
    matchingConfig: {
      type: MatchingConfigSchema,
      default: undefined
    },
    maxAttempts: {
      type: Schema.Types.Mixed,
      default: undefined,
      validate: {
        validator: function(v: number | null | undefined) {
          if (v === undefined || v === null) return true;
          if (typeof v === 'number' && v >= 1) return true;
          return false;
        },
        message: 'maxAttempts must be null or a positive number (at least 1)'
      }
    },
    gradingPolicy: {
      type: String,
      enum: {
        values: ['best', 'last', 'average'],
        message: '{VALUE} is not a valid grading policy'
      },
      default: 'best'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common queries
ExerciseSchema.index({ department: 1, type: 1 });
ExerciseSchema.index({ department: 1, status: 1 });
ExerciseSchema.index({ department: 1, difficulty: 1 });
ExerciseSchema.index({ status: 1, createdAt: -1 });
ExerciseSchema.index({ title: 'text', description: 'text' });

// Compound index for uniqueness check
ExerciseSchema.index({ title: 1, department: 1 }, { unique: true });

export default mongoose.model<IExercise>('Exercise', ExerciseSchema);
