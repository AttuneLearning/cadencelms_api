import mongoose, { Schema, Document } from 'mongoose';

/**
 * Matching Attempt Model
 *
 * Tracks submission history for matching exercises. Each attempt
 * records the learner's submitted matches, the grading results,
 * and timing information.
 */

/**
 * Individual match result in an attempt
 */
export interface IMatchResult {
  columnAId: mongoose.Types.ObjectId;  // Question ID from column A
  matchedColumnBId: mongoose.Types.ObjectId;  // What the learner matched to
  correctColumnBId: mongoose.Types.ObjectId;  // The correct answer
  correct: boolean;
  columnAText: string;  // For display in history
  matchedText: string;  // What they matched to
  correctText: string;  // The correct answer
  explanation?: string;  // From question explanation or matchingData.pairExplanation
}

export interface IMatchingAttempt extends Document {
  exerciseId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  attemptNumber: number;

  // Submission data
  submittedMatches: Array<{
    columnAId: mongoose.Types.ObjectId;
    columnBId: mongoose.Types.ObjectId;
  }>;

  // Results
  results: IMatchResult[];
  score: number;  // Percentage 0-100
  correctCount: number;
  totalPairs: number;
  passed: boolean;

  // Timing
  startedAt: Date;
  submittedAt: Date;
  timeSpent: number;  // Seconds

  // Grading details
  allowPartialCredit: boolean;
  passingScore: number;

  createdAt: Date;
  updatedAt: Date;
}

const MatchResultSchema = new Schema<IMatchResult>(
  {
    columnAId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Question'
    },
    matchedColumnBId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Question'
    },
    correctColumnBId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Question'
    },
    correct: {
      type: Boolean,
      required: true
    },
    columnAText: {
      type: String,
      required: true
    },
    matchedText: {
      type: String,
      required: true
    },
    correctText: {
      type: String,
      required: true
    },
    explanation: {
      type: String
    }
  },
  { _id: false }
);

const SubmittedMatchSchema = new Schema(
  {
    columnAId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Question'
    },
    columnBId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Question'
    }
  },
  { _id: false }
);

const MatchingAttemptSchema = new Schema<IMatchingAttempt>(
  {
    exerciseId: {
      type: Schema.Types.ObjectId,
      required: [true, 'exerciseId is required'],
      ref: 'Exercise',
      index: true
    },
    learnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'learnerId is required'],
      ref: 'User',
      index: true
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      required: [true, 'sessionId is required'],
      ref: 'MatchingSession'
    },
    attemptNumber: {
      type: Number,
      required: [true, 'attemptNumber is required'],
      min: [1, 'attemptNumber must be at least 1']
    },
    submittedMatches: {
      type: [SubmittedMatchSchema],
      required: true
    },
    results: {
      type: [MatchResultSchema],
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: [0, 'score cannot be negative'],
      max: [100, 'score cannot exceed 100']
    },
    correctCount: {
      type: Number,
      required: true,
      min: [0, 'correctCount cannot be negative']
    },
    totalPairs: {
      type: Number,
      required: true,
      min: [1, 'totalPairs must be at least 1']
    },
    passed: {
      type: Boolean,
      required: true
    },
    startedAt: {
      type: Date,
      required: true
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    timeSpent: {
      type: Number,
      required: true,
      min: [0, 'timeSpent cannot be negative']
    },
    allowPartialCredit: {
      type: Boolean,
      required: true
    },
    passingScore: {
      type: Number,
      required: true,
      min: [0, 'passingScore cannot be negative'],
      max: [100, 'passingScore cannot exceed 100']
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
MatchingAttemptSchema.index({ exerciseId: 1, learnerId: 1, attemptNumber: 1 });
MatchingAttemptSchema.index({ learnerId: 1, submittedAt: -1 });
MatchingAttemptSchema.index({ exerciseId: 1, passed: 1 });
MatchingAttemptSchema.index({ sessionId: 1 });

export default mongoose.model<IMatchingAttempt>('MatchingAttempt', MatchingAttemptSchema);
