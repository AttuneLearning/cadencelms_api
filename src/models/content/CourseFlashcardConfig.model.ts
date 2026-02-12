import mongoose, { Schema, Document } from 'mongoose';

/**
 * CourseFlashcardConfig Model
 *
 * Stores course-level configuration for flashcard functionality.
 * Controls how flashcards are presented, when retention checks occur,
 * and what constitutes mastery within a course.
 *
 * Design: One configuration document per course. If no config exists,
 * default values are used by the flashcard service.
 *
 * @see API-ISS-010 Flashcard System Implementation
 * @see dev_communication/specs/learning/FLASHCARD_FLOW_SPEC.md
 */

/**
 * Check frequency options for flashcard retention checks
 */
export type CheckFrequency = 'every_module' | 'every_n_modules' | 'custom';

/**
 * Selection method for choosing which flashcards to present
 */
export type SelectionMethod = 'random' | 'weighted_by_difficulty' | 'sm2_priority';

export interface ICourseFlashcardConfig extends Document {
  /** Reference to the course this config applies to */
  courseId: mongoose.Types.ObjectId;

  /**
   * Whether flashcards are enabled for this course
   * Default: true
   */
  enabled: boolean;

  // ============================================
  // Retention Check Settings
  // ============================================

  /**
   * Number of flashcards to include in each retention check
   * Set to 0 to disable retention checks
   * Default: 5
   */
  flashcardsPerCheck: number;

  /**
   * Number of incorrect answers that triggers additional review
   * Default: 2
   */
  failureThreshold: number;

  /**
   * When to trigger retention checks
   * - 'every_module': Check at the end of every module
   * - 'every_n_modules': Check every N modules (use checkFrequencyValue)
   * - 'custom': Use custom trigger points (stored in metadata)
   * Default: 'every_module'
   */
  checkFrequency: CheckFrequency;

  /**
   * Value for 'every_n_modules' frequency
   * Only used when checkFrequency is 'every_n_modules'
   */
  checkFrequencyValue?: number;

  // ============================================
  // Card Selection Settings
  // ============================================

  /**
   * Method for selecting which cards to present
   * - 'random': Random selection from available cards
   * - 'weighted_by_difficulty': Prioritize harder cards
   * - 'sm2_priority': Use SM-2 algorithm to select due cards first
   * Default: 'sm2_priority'
   */
  selectionMethod: SelectionMethod;

  /**
   * Whether learners must complete content review before retaking failed cards
   * Default: true
   */
  requireContentReview: boolean;

  /**
   * Whether learners must pass a final flashcard review before course completion
   * Default: false
   */
  requireFinalRetake: boolean;

  /**
   * Only include flashcards from modules the learner has completed
   * Default: true
   */
  includeOnlyCompletedModules: boolean;

  // ============================================
  // Mastery Settings
  // ============================================

  /**
   * Number of consecutive correct answers required to consider a card mastered
   * Default: 3
   */
  masteryThreshold: number;

  /**
   * Minimum interval (in days) before a card is considered mastered
   * Default: 7
   */
  masteryIntervalDays: number;

  // ============================================
  // Session Settings
  // ============================================

  /**
   * Default number of cards per practice session
   * Default: 10
   */
  defaultSessionSize: number;

  /**
   * Maximum number of cards per practice session
   * Default: 50
   */
  maxSessionSize: number;

  // ============================================
  // Metadata
  // ============================================

  /**
   * Additional configuration data (for custom check frequencies, etc.)
   */
  metadata?: Record<string, any>;

  // ============================================
  // Timestamps
  // ============================================
  createdAt: Date;
  updatedAt: Date;
}

const CourseFlashcardConfigSchema = new Schema<ICourseFlashcardConfig>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      required: [true, 'courseId is required'],
      ref: 'CanonicalCourse',
      unique: true,
      index: true
    },
    enabled: {
      type: Boolean,
      default: true
    },

    // Retention Check Settings
    flashcardsPerCheck: {
      type: Number,
      default: 5,
      min: [0, 'flashcardsPerCheck must be >= 0'],
      max: [50, 'flashcardsPerCheck must be <= 50']
    },
    failureThreshold: {
      type: Number,
      default: 2,
      min: [1, 'failureThreshold must be >= 1'],
      max: [10, 'failureThreshold must be <= 10']
    },
    checkFrequency: {
      type: String,
      enum: {
        values: ['every_module', 'every_n_modules', 'custom'],
        message: '{VALUE} is not a valid check frequency'
      },
      default: 'every_module'
    },
    checkFrequencyValue: {
      type: Number,
      min: [1, 'checkFrequencyValue must be >= 1'],
      max: [100, 'checkFrequencyValue must be <= 100']
    },

    // Card Selection Settings
    selectionMethod: {
      type: String,
      enum: {
        values: ['random', 'weighted_by_difficulty', 'sm2_priority'],
        message: '{VALUE} is not a valid selection method'
      },
      default: 'sm2_priority'
    },
    requireContentReview: {
      type: Boolean,
      default: true
    },
    requireFinalRetake: {
      type: Boolean,
      default: false
    },
    includeOnlyCompletedModules: {
      type: Boolean,
      default: true
    },

    // Mastery Settings
    masteryThreshold: {
      type: Number,
      default: 3,
      min: [1, 'masteryThreshold must be >= 1'],
      max: [10, 'masteryThreshold must be <= 10']
    },
    masteryIntervalDays: {
      type: Number,
      default: 7,
      min: [1, 'masteryIntervalDays must be >= 1'],
      max: [365, 'masteryIntervalDays must be <= 365']
    },

    // Session Settings
    defaultSessionSize: {
      type: Number,
      default: 10,
      min: [1, 'defaultSessionSize must be >= 1'],
      max: [100, 'defaultSessionSize must be <= 100']
    },
    maxSessionSize: {
      type: Number,
      default: 50,
      min: [1, 'maxSessionSize must be >= 1'],
      max: [100, 'maxSessionSize must be <= 100']
    },

    // Metadata
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// ============================================
// VALIDATION
// ============================================

/**
 * Pre-save validation for consistency
 */
CourseFlashcardConfigSchema.pre('save', function (next) {
  // Ensure maxSessionSize >= defaultSessionSize
  if (this.maxSessionSize < this.defaultSessionSize) {
    this.maxSessionSize = this.defaultSessionSize;
  }

  // Ensure checkFrequencyValue is set when using 'every_n_modules'
  if (this.checkFrequency === 'every_n_modules' && !this.checkFrequencyValue) {
    this.checkFrequencyValue = 2;
  }

  next();
});

const CourseFlashcardConfig = mongoose.model<ICourseFlashcardConfig>(
  'CourseFlashcardConfig',
  CourseFlashcardConfigSchema
);

export default CourseFlashcardConfig;
