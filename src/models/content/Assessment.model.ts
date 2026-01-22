import mongoose, { Schema, Document } from 'mongoose';

export type AssessmentStyle = 'quiz' | 'exam';
export type SelectionMode = 'random' | 'sequential' | 'weighted';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type RetakePolicy = 'anytime' | 'after_cooldown' | 'instructor_unlock';
export type ShowCorrectAnswers = 'never' | 'after_submit' | 'after_all_attempts';
export type FeedbackTiming = 'immediate' | 'after_submit' | 'after_grading';

export interface IQuestionSelection {
  questionBankIds: string[];
  questionCount: number;
  selectionMode: SelectionMode;
  filterByTags?: string[];
  filterByDifficulty?: DifficultyLevel[];
}

export interface ITiming {
  timeLimit?: number;
  showTimer: boolean;
  autoSubmitOnExpiry: boolean;
}

export interface IAttempts {
  maxAttempts: number | null;
  cooldownMinutes?: number;
  retakePolicy: RetakePolicy;
}

export interface IScoring {
  passingScore: number;
  showScore: boolean;
  showCorrectAnswers: ShowCorrectAnswers;
  partialCredit: boolean;
}

export interface IFeedback {
  showFeedback: boolean;
  feedbackTiming: FeedbackTiming;
  showExplanations: boolean;
}

export interface IAssessment extends Document {
  departmentId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  style: AssessmentStyle;

  questionSelection: IQuestionSelection;
  timing: ITiming;
  attempts: IAttempts;
  scoring: IScoring;
  feedback: IFeedback;

  isPublished: boolean;
  isArchived: boolean;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSelectionSchema = new Schema<IQuestionSelection>(
  {
    questionBankIds: {
      type: [String],
      required: [true, 'questionBankIds is required'],
      validate: {
        validator: function(v: string[]) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'questionBankIds must be a non-empty array'
      }
    },
    questionCount: {
      type: Number,
      required: [true, 'questionCount is required'],
      min: [1, 'questionCount must be at least 1']
    },
    selectionMode: {
      type: String,
      required: [true, 'selectionMode is required'],
      enum: {
        values: ['random', 'sequential', 'weighted'],
        message: '{VALUE} is not a valid selection mode'
      }
    },
    filterByTags: {
      type: [String],
      default: undefined
    },
    filterByDifficulty: {
      type: [String],
      enum: {
        values: ['beginner', 'intermediate', 'advanced'],
        message: '{VALUE} is not a valid difficulty level'
      },
      default: undefined
    }
  },
  { _id: false }
);

const TimingSchema = new Schema<ITiming>(
  {
    timeLimit: {
      type: Number,
      min: [1, 'timeLimit must be at least 1'],
      default: undefined
    },
    showTimer: {
      type: Boolean,
      required: [true, 'showTimer is required']
    },
    autoSubmitOnExpiry: {
      type: Boolean,
      required: [true, 'autoSubmitOnExpiry is required']
    }
  },
  { _id: false }
);

const AttemptsSchema = new Schema<IAttempts>(
  {
    maxAttempts: {
      type: Schema.Types.Mixed,
      required: function(this: any) {
        // maxAttempts must be explicitly provided (cannot be undefined)
        return this.maxAttempts === undefined;
      },
      validate: {
        validator: function(v: number | null) {
          // Allow null (unlimited) or positive numbers >= 1
          if (v === null) return true;
          if (typeof v === 'number' && v >= 1) return true;
          return false;
        },
        message: 'maxAttempts must be null or a positive number (at least 1)'
      }
    },
    cooldownMinutes: {
      type: Number,
      min: [0, 'cooldownMinutes cannot be negative'],
      default: undefined
    },
    retakePolicy: {
      type: String,
      required: [true, 'retakePolicy is required'],
      enum: {
        values: ['anytime', 'after_cooldown', 'instructor_unlock'],
        message: '{VALUE} is not a valid retake policy'
      }
    }
  },
  { _id: false }
);

const ScoringSchema = new Schema<IScoring>(
  {
    passingScore: {
      type: Number,
      required: [true, 'passingScore is required'],
      min: [0, 'passingScore must be at least 0'],
      max: [100, 'passingScore cannot exceed 100']
    },
    showScore: {
      type: Boolean,
      required: [true, 'showScore is required']
    },
    showCorrectAnswers: {
      type: String,
      required: [true, 'showCorrectAnswers is required'],
      enum: {
        values: ['never', 'after_submit', 'after_all_attempts'],
        message: '{VALUE} is not a valid showCorrectAnswers option'
      }
    },
    partialCredit: {
      type: Boolean,
      required: [true, 'partialCredit is required']
    }
  },
  { _id: false }
);

const FeedbackSchema = new Schema<IFeedback>(
  {
    showFeedback: {
      type: Boolean,
      required: [true, 'showFeedback is required']
    },
    feedbackTiming: {
      type: String,
      required: [true, 'feedbackTiming is required'],
      enum: {
        values: ['immediate', 'after_submit', 'after_grading'],
        message: '{VALUE} is not a valid feedback timing'
      }
    },
    showExplanations: {
      type: Boolean,
      required: [true, 'showExplanations is required']
    }
  },
  { _id: false }
);

const AssessmentSchema = new Schema<IAssessment>(
  {
    departmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'departmentId is required'],
      ref: 'Department',
      index: true
    },
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
    style: {
      type: String,
      required: [true, 'style is required'],
      enum: {
        values: ['quiz', 'exam'],
        message: '{VALUE} is not a valid assessment style'
      },
      index: true
    },
    questionSelection: {
      type: QuestionSelectionSchema,
      required: [true, 'questionSelection is required']
    },
    timing: {
      type: TimingSchema,
      required: [true, 'timing is required']
    },
    attempts: {
      type: AttemptsSchema,
      required: [true, 'attempts is required']
    },
    scoring: {
      type: ScoringSchema,
      required: [true, 'scoring is required']
    },
    feedback: {
      type: FeedbackSchema,
      required: [true, 'feedback is required']
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
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
AssessmentSchema.index({ departmentId: 1, style: 1 });
AssessmentSchema.index({ departmentId: 1, isPublished: 1 });
AssessmentSchema.index({ departmentId: 1, isArchived: 1 });

export default mongoose.model<IAssessment>('Assessment', AssessmentSchema);
