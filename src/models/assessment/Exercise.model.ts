import mongoose, { Schema, Document } from 'mongoose';

export type ExerciseType = 'quiz' | 'exam' | 'practice' | 'assessment';
export type ExerciseStatus = 'draft' | 'published' | 'archived';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

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
        values: ['quiz', 'exam', 'practice', 'assessment'],
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
