import mongoose, { Schema, Document } from 'mongoose';

/**
 * FlashcardProgress Model
 *
 * Tracks per-learner, per-question, per-prompt progress for flashcard-based learning.
 * Implements the SM-2 spaced repetition algorithm fields for optimal review scheduling.
 *
 * Design: Questions with 'flashcard' in their questionTypes array can be rendered
 * as flashcards. Progress is tracked per-prompt variation (promptIndex) to support
 * prompt rotation for varied practice.
 *
 * @see API-ISS-010 Flashcard System Implementation
 * @see dev_communication/specs/learning/FLASHCARD_FLOW_SPEC.md
 */

export interface IFlashcardProgress extends Document {
  /** Reference to the learner (User document) */
  learnerId: mongoose.Types.ObjectId;
  /** Reference to the course containing the flashcard */
  courseId: mongoose.Types.ObjectId;
  /** Reference to the Question document with 'flashcard' type */
  questionId: mongoose.Types.ObjectId;
  /** Which prompt variant this progress is for (for flashcardData.prompts rotation) */
  promptIndex: number;

  // ============================================
  // SM-2 Algorithm Fields
  // ============================================

  /**
   * Ease factor (difficulty multiplier)
   * Default: 2.5
   * Minimum: 1.3
   * Higher values mean easier cards (longer intervals)
   */
  easeFactor: number;

  /**
   * Current review interval in days
   * Default: 0 (new card)
   * Updated by SM-2 algorithm after each review
   */
  interval: number;

  /**
   * Number of consecutive correct responses
   * Reset to 0 on incorrect answer
   */
  repetitions: number;

  // ============================================
  // Statistics
  // ============================================

  /** Total number of times the card was answered correctly */
  timesCorrect: number;
  /** Total number of times the card was answered incorrectly */
  timesIncorrect: number;
  /** Timestamp of the last review */
  lastReviewed: Date | null;
  /** Calculated date for next scheduled review */
  nextReviewDate: Date | null;

  // ============================================
  // Mastery Tracking
  // ============================================

  /**
   * Whether the card is considered mastered
   * Based on consecutive correct answers and interval length
   */
  mastered: boolean;
  /** Timestamp when mastery was achieved */
  masteredAt: Date | null;

  // ============================================
  // Timestamps
  // ============================================
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardProgressSchema = new Schema<IFlashcardProgress>(
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
      ref: 'CanonicalCourse',
      index: true
    },
    questionId: {
      type: Schema.Types.ObjectId,
      required: [true, 'questionId is required'],
      ref: 'Question',
      index: true
    },
    promptIndex: {
      type: Number,
      required: [true, 'promptIndex is required'],
      default: 0,
      min: [0, 'promptIndex must be >= 0']
    },

    // SM-2 Algorithm Fields
    easeFactor: {
      type: Number,
      default: 2.5,
      min: [1.3, 'easeFactor cannot be below 1.3']
    },
    interval: {
      type: Number,
      default: 0,
      min: [0, 'interval must be >= 0']
    },
    repetitions: {
      type: Number,
      default: 0,
      min: [0, 'repetitions must be >= 0']
    },

    // Statistics
    timesCorrect: {
      type: Number,
      default: 0,
      min: [0, 'timesCorrect must be >= 0']
    },
    timesIncorrect: {
      type: Number,
      default: 0,
      min: [0, 'timesIncorrect must be >= 0']
    },
    lastReviewed: {
      type: Date,
      default: null
    },
    nextReviewDate: {
      type: Date,
      default: null,
      index: true
    },

    // Mastery Tracking
    mastered: {
      type: Boolean,
      default: false,
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

// ============================================
// INDEXES
// ============================================

/**
 * Compound unique index: one progress record per learner/course/question/prompt combination
 * This ensures each prompt variation is tracked separately for rotation
 */
FlashcardProgressSchema.index(
  { learnerId: 1, courseId: 1, questionId: 1, promptIndex: 1 },
  { unique: true }
);

/**
 * Index for finding cards due for review (SM-2 scheduling)
 * Used by getFlashcardSession to select cards
 */
FlashcardProgressSchema.index({ learnerId: 1, courseId: 1, nextReviewDate: 1 });

/**
 * Index for finding unmastered cards for a learner in a course
 */
FlashcardProgressSchema.index({ learnerId: 1, courseId: 1, mastered: 1 });

/**
 * Index for course-level progress aggregation
 */
FlashcardProgressSchema.index({ courseId: 1, mastered: 1 });

/**
 * Index for finding all progress for a specific question
 */
FlashcardProgressSchema.index({ questionId: 1, learnerId: 1 });

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual: total number of reviews
 */
FlashcardProgressSchema.virtual('totalReviews').get(function () {
  return this.timesCorrect + this.timesIncorrect;
});

/**
 * Virtual: accuracy percentage
 */
FlashcardProgressSchema.virtual('accuracy').get(function () {
  const total = this.timesCorrect + this.timesIncorrect;
  return total > 0 ? Math.round((this.timesCorrect / total) * 100) : 0;
});

/**
 * Virtual: whether the card is due for review
 */
FlashcardProgressSchema.virtual('isDue').get(function () {
  if (!this.nextReviewDate) return true;
  return new Date() >= this.nextReviewDate;
});

FlashcardProgressSchema.set('toJSON', { virtuals: true });
FlashcardProgressSchema.set('toObject', { virtuals: true });

const FlashcardProgress = mongoose.model<IFlashcardProgress>(
  'FlashcardProgress',
  FlashcardProgressSchema
);

export default FlashcardProgress;
