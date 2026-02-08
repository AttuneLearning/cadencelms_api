import mongoose, { Schema, Document } from 'mongoose';

/**
 * Remediation Model
 *
 * Tracks remediation requirements when a learner fails a retention check.
 * Remediation may require:
 * 1. Re-reviewing module content
 * 2. Retaking the module's final assessment
 *
 * Design: One remediation per failed retention check. The remediation
 * tracks progress through required steps and completion status.
 *
 * @see API-ISS-013 Retention Check & Remediation System
 * @see dev_communication/specs/learning/FLASHCARD_FLOW_SPEC.md
 */

/**
 * Status of a remediation
 */
export type RemediationStatus =
  | 'pending'          // Just created, no steps completed
  | 'content_reviewed' // Content review completed
  | 'final_retaken'    // Final retake completed (may or may not have passed)
  | 'completed';       // All requirements met

export interface IRemediation extends Document {
  /** Reference to the learner (User document) */
  learnerId: mongoose.Types.ObjectId;
  /** Reference to the course */
  courseId: mongoose.Types.ObjectId;
  /** Module requiring remediation */
  moduleId: mongoose.Types.ObjectId;

  // ============================================
  // Trigger
  // ============================================

  /** Retention check that triggered this remediation */
  triggeredByCheckId: mongoose.Types.ObjectId;
  /** When the remediation was triggered */
  triggeredAt: Date;

  // ============================================
  // Requirements (from CourseFlashcardConfig)
  // ============================================

  /** Whether content review is required */
  requireContentReview: boolean;
  /** Whether final assessment retake is required */
  requireFinalRetake: boolean;

  // ============================================
  // Progress
  // ============================================

  /** Current remediation status */
  status: RemediationStatus;

  // Content Review Progress
  /** When content was marked as reviewed */
  contentReviewedAt?: Date;
  /** Content items that were viewed during review */
  contentItemsViewed?: string[];

  // Final Retake Progress
  /** Reference to the final assessment attempt */
  finalRetakeAttemptId?: mongoose.Types.ObjectId;
  /** When the final was retaken */
  finalRetakenAt?: Date;
  /** Whether the learner passed the final retake */
  finalPassed?: boolean;

  // Completion
  /** When all remediation requirements were met */
  completedAt?: Date;

  // ============================================
  // Timestamps
  // ============================================
  createdAt: Date;
  updatedAt: Date;
}

const RemediationSchema = new Schema<IRemediation>(
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
    moduleId: {
      type: Schema.Types.ObjectId,
      required: [true, 'moduleId is required'],
      ref: 'Module',
      index: true
    },

    // Trigger
    triggeredByCheckId: {
      type: Schema.Types.ObjectId,
      required: [true, 'triggeredByCheckId is required'],
      ref: 'RetentionCheck'
    },
    triggeredAt: {
      type: Date,
      required: [true, 'triggeredAt is required'],
      default: Date.now
    },

    // Requirements
    requireContentReview: {
      type: Boolean,
      required: [true, 'requireContentReview is required'],
      default: true
    },
    requireFinalRetake: {
      type: Boolean,
      required: [true, 'requireFinalRetake is required'],
      default: false
    },

    // Progress
    status: {
      type: String,
      enum: {
        values: ['pending', 'content_reviewed', 'final_retaken', 'completed'],
        message: '{VALUE} is not a valid remediation status'
      },
      default: 'pending',
      index: true
    },

    // Content Review Progress
    contentReviewedAt: {
      type: Date,
      default: undefined
    },
    contentItemsViewed: {
      type: [String],
      default: undefined
    },

    // Final Retake Progress
    finalRetakeAttemptId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamAttempt',
      default: undefined
    },
    finalRetakenAt: {
      type: Date,
      default: undefined
    },
    finalPassed: {
      type: Boolean,
      default: undefined
    },

    // Completion
    completedAt: {
      type: Date,
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
 * Compound index for finding remediations by learner and course
 */
RemediationSchema.index({ learnerId: 1, courseId: 1, status: 1 });

/**
 * Compound index for finding active remediations for a learner/module
 */
RemediationSchema.index({ learnerId: 1, courseId: 1, moduleId: 1, status: 1 });

/**
 * Index for finding incomplete remediations
 */
RemediationSchema.index({ learnerId: 1, status: 1, triggeredAt: 1 });

/**
 * Unique index to prevent multiple active remediations for the same check
 */
RemediationSchema.index({ triggeredByCheckId: 1 }, { unique: true });

/**
 * Index for finding remediations needing final retake
 */
RemediationSchema.index({ requireFinalRetake: 1, finalRetakenAt: 1, status: 1 });

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual: check if content review step is complete
 */
RemediationSchema.virtual('isContentReviewComplete').get(function () {
  if (!this.requireContentReview) {
    return true; // Not required, so considered complete
  }
  return !!this.contentReviewedAt;
});

/**
 * Virtual: check if final retake step is complete
 */
RemediationSchema.virtual('isFinalRetakeComplete').get(function () {
  if (!this.requireFinalRetake) {
    return true; // Not required, so considered complete
  }
  return !!this.finalRetakenAt && this.finalPassed === true;
});

/**
 * Virtual: check if all requirements are met
 */
RemediationSchema.virtual('allRequirementsMet').get(function () {
  const contentComplete = !this.requireContentReview || !!this.contentReviewedAt;
  const finalComplete = !this.requireFinalRetake || (!!this.finalRetakenAt && this.finalPassed === true);
  return contentComplete && finalComplete;
});

/**
 * Virtual: determine next step the learner needs to complete
 */
RemediationSchema.virtual('nextStep').get(function () {
  // If already completed, no next step
  if (this.status === 'completed') {
    return null;
  }

  // Check content review first
  if (this.requireContentReview && !this.contentReviewedAt) {
    return 'content_review';
  }

  // Check final retake
  if (this.requireFinalRetake) {
    // If not attempted yet
    if (!this.finalRetakenAt) {
      return 'final_retake';
    }
    // If attempted but failed
    if (this.finalPassed === false) {
      return 'retake_again';
    }
  }

  // All requirements met
  return null;
});

/**
 * Virtual: check if remediation is blocking course progression
 */
RemediationSchema.virtual('isBlocking').get(function () {
  return this.status !== 'completed';
});

RemediationSchema.set('toJSON', { virtuals: true });
RemediationSchema.set('toObject', { virtuals: true });

// ============================================
// METHODS
// ============================================

/**
 * Update status based on current progress
 */
RemediationSchema.methods.updateStatus = function (): RemediationStatus {
  // Check if all requirements are met
  const contentComplete = !this.requireContentReview || !!this.contentReviewedAt;
  const finalComplete = !this.requireFinalRetake || (!!this.finalRetakenAt && this.finalPassed === true);

  if (contentComplete && finalComplete) {
    this.status = 'completed';
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  } else if (this.finalRetakenAt) {
    this.status = 'final_retaken';
  } else if (this.contentReviewedAt) {
    this.status = 'content_reviewed';
  } else {
    this.status = 'pending';
  }

  return this.status;
};

const Remediation = mongoose.model<IRemediation>(
  'Remediation',
  RemediationSchema
);

export default Remediation;
