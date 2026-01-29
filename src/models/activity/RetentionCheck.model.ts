import mongoose, { Schema, Document } from 'mongoose';

/**
 * RetentionCheck Model
 *
 * Tracks retention checks that verify learner knowledge after module completion.
 * When learners complete a module, they may be presented with flashcard-based
 * retention checks from that module's content. Failing these checks triggers
 * remediation.
 *
 * Design: One check per source module per trigger point. The check stores
 * a snapshot of configuration at creation time for consistent evaluation.
 *
 * @see API-ISS-013 Retention Check & Remediation System
 * @see dev_communication/specs/learning/FLASHCARD_FLOW_SPEC.md
 */

/**
 * Status of a retention check
 */
export type RetentionCheckStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Individual result for a question in the retention check
 */
export interface IRetentionCheckResult {
  /** Reference to the Question document */
  questionId: mongoose.Types.ObjectId;
  /** Which prompt variation was shown */
  promptIndex: number;
  /** Whether the learner answered correctly */
  correct: boolean;
  /** SM-2 quality rating (0-5) */
  quality: number;
  /** Time spent on this question in milliseconds */
  timeSpent: number;
}

export interface IRetentionCheck extends Document {
  /** Reference to the learner (User document) */
  learnerId: mongoose.Types.ObjectId;
  /** Reference to the course */
  courseId: mongoose.Types.ObjectId;
  /** Module whose flashcards are being checked */
  sourceModuleId: mongoose.Types.ObjectId;

  // ============================================
  // Context
  // ============================================

  /** Module position where this check was triggered (course choreography) */
  triggeredAtModuleId: mongoose.Types.ObjectId;
  /** When the check was triggered */
  triggeredAt: Date;

  // ============================================
  // Configuration Snapshot (from CourseFlashcardConfig)
  // ============================================

  /** Number of cards in this check */
  cardCount: number;
  /** Number of incorrect answers that triggers remediation */
  failureThreshold: number;

  // ============================================
  // Cards Selected
  // ============================================

  /** Question IDs selected for this check */
  questionIds: mongoose.Types.ObjectId[];

  // ============================================
  // Status
  // ============================================

  /** Current status of the check */
  status: RetentionCheckStatus;
  /** When the learner started the check */
  startedAt?: Date;
  /** When the learner completed the check */
  completedAt?: Date;

  // ============================================
  // Results
  // ============================================

  /** Individual results for each question */
  results?: IRetentionCheckResult[];
  /** Number of correct answers */
  correctCount?: number;
  /** Number of incorrect answers */
  incorrectCount?: number;
  /** Whether the learner passed the check */
  passed?: boolean;

  // ============================================
  // Remediation
  // ============================================

  /** Whether remediation is required (set after completion) */
  remediationRequired: boolean;
  /** Reference to the Remediation document if created */
  remediationId?: mongoose.Types.ObjectId;

  // ============================================
  // Timestamps
  // ============================================
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for individual question results
 */
const RetentionCheckResultSchema = new Schema<IRetentionCheckResult>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      required: [true, 'questionId is required'],
      ref: 'Question'
    },
    promptIndex: {
      type: Number,
      required: [true, 'promptIndex is required'],
      default: 0,
      min: [0, 'promptIndex must be >= 0']
    },
    correct: {
      type: Boolean,
      required: [true, 'correct is required']
    },
    quality: {
      type: Number,
      required: [true, 'quality is required'],
      min: [0, 'quality must be >= 0'],
      max: [5, 'quality must be <= 5']
    },
    timeSpent: {
      type: Number,
      required: [true, 'timeSpent is required'],
      min: [0, 'timeSpent must be >= 0'],
      default: 0
    }
  },
  { _id: false }
);

const RetentionCheckSchema = new Schema<IRetentionCheck>(
  {
    learnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'learnerId is required'],
      ref: 'User',
      index: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      required: [true, 'courseId is required'],
      ref: 'Course',
      index: true
    },
    sourceModuleId: {
      type: Schema.Types.ObjectId,
      required: [true, 'sourceModuleId is required'],
      ref: 'Module',
      index: true
    },

    // Context
    triggeredAtModuleId: {
      type: Schema.Types.ObjectId,
      required: [true, 'triggeredAtModuleId is required'],
      ref: 'Module'
    },
    triggeredAt: {
      type: Date,
      required: [true, 'triggeredAt is required'],
      default: Date.now
    },

    // Configuration snapshot
    cardCount: {
      type: Number,
      required: [true, 'cardCount is required'],
      min: [1, 'cardCount must be at least 1']
    },
    failureThreshold: {
      type: Number,
      required: [true, 'failureThreshold is required'],
      min: [1, 'failureThreshold must be at least 1']
    },

    // Cards selected
    questionIds: {
      type: [Schema.Types.ObjectId],
      required: [true, 'questionIds is required'],
      ref: 'Question',
      validate: {
        validator: function (v: mongoose.Types.ObjectId[]) {
          return v && v.length >= 1;
        },
        message: 'questionIds must contain at least one question'
      }
    },

    // Status
    status: {
      type: String,
      enum: {
        values: ['pending', 'in_progress', 'completed'],
        message: '{VALUE} is not a valid status'
      },
      default: 'pending',
      index: true
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },

    // Results
    results: {
      type: [RetentionCheckResultSchema],
      default: undefined
    },
    correctCount: {
      type: Number,
      min: [0, 'correctCount must be >= 0'],
      default: undefined
    },
    incorrectCount: {
      type: Number,
      min: [0, 'incorrectCount must be >= 0'],
      default: undefined
    },
    passed: {
      type: Boolean,
      default: undefined
    },

    // Remediation
    remediationRequired: {
      type: Boolean,
      default: false
    },
    remediationId: {
      type: Schema.Types.ObjectId,
      ref: 'Remediation',
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

// ============================================
// INDEXES
// ============================================

/**
 * Compound index for finding checks by learner and course
 */
RetentionCheckSchema.index({ learnerId: 1, courseId: 1, status: 1 });

/**
 * Compound index for finding checks by learner, course, and source module
 */
RetentionCheckSchema.index({ learnerId: 1, courseId: 1, sourceModuleId: 1 });

/**
 * Index for finding pending checks that need to be completed
 */
RetentionCheckSchema.index({ learnerId: 1, status: 1, triggeredAt: 1 });

/**
 * Index for finding checks by completion status
 */
RetentionCheckSchema.index({ courseId: 1, completedAt: -1 });

/**
 * Index for finding checks that require remediation
 */
RetentionCheckSchema.index({ remediationRequired: 1, remediationId: 1 });

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual: calculate pass/fail based on current results
 */
RetentionCheckSchema.virtual('isPassing').get(function () {
  if (this.incorrectCount === undefined || this.failureThreshold === undefined) {
    return undefined;
  }
  return this.incorrectCount < this.failureThreshold;
});

/**
 * Virtual: time spent on the entire check
 */
RetentionCheckSchema.virtual('totalTimeSpent').get(function () {
  if (!this.results || this.results.length === 0) {
    return 0;
  }
  return this.results.reduce((total, r) => total + (r.timeSpent || 0), 0);
});

/**
 * Virtual: accuracy percentage
 */
RetentionCheckSchema.virtual('accuracy').get(function () {
  if (this.correctCount === undefined || this.incorrectCount === undefined) {
    return undefined;
  }
  const total = this.correctCount + this.incorrectCount;
  return total > 0 ? Math.round((this.correctCount / total) * 100) : 0;
});

RetentionCheckSchema.set('toJSON', { virtuals: true });
RetentionCheckSchema.set('toObject', { virtuals: true });

const RetentionCheck = mongoose.model<IRetentionCheck>(
  'RetentionCheck',
  RetentionCheckSchema
);

export default RetentionCheck;
