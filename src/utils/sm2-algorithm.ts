/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Implementation of the SuperMemo 2 (SM-2) algorithm for optimal flashcard scheduling.
 * The algorithm calculates when a learner should next review a card based on their
 * performance, adjusting intervals to maximize retention while minimizing review time.
 *
 * Algorithm Overview:
 * 1. Quality ratings from 0-5 determine how well the learner knew the answer
 * 2. Ratings 0-2 are considered failures (card needs re-learning)
 * 3. Ratings 3-5 are considered successes (varying degrees of difficulty)
 * 4. The ease factor adjusts based on performance history
 * 5. Intervals grow exponentially for consistently correct answers
 *
 * @see API-ISS-010 Flashcard System Implementation
 * @see https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

/**
 * Quality rating scale for SM-2 algorithm
 *
 * 0 - Complete blackout, no memory at all
 * 1 - Incorrect response, but upon seeing the answer, remembered
 * 2 - Incorrect response, but the answer seemed easy to recall
 * 3 - Correct response, but with serious difficulty
 * 4 - Correct response, with some hesitation
 * 5 - Perfect response, no hesitation
 */
export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Input progress data for SM-2 calculation
 */
export interface SM2Progress {
  /** Current ease factor (default: 2.5, minimum: 1.3) */
  easeFactor: number;
  /** Current interval in days (0 for new cards) */
  interval: number;
  /** Number of consecutive correct responses */
  repetitions: number;
}

/**
 * Result of SM-2 calculation
 */
export interface SM2Result {
  /** Updated ease factor */
  easeFactor: number;
  /** Updated interval in days */
  interval: number;
  /** Updated repetition count */
  repetitions: number;
  /** Calculated next review date */
  nextReviewDate: Date;
  /** Whether the answer was considered correct (quality >= 3) */
  isCorrect: boolean;
}

/**
 * Default values for a new flashcard
 */
export const SM2_DEFAULTS = {
  /** Default ease factor for new cards */
  EASE_FACTOR: 2.5,
  /** Minimum ease factor (card won't get harder than this) */
  MIN_EASE_FACTOR: 1.3,
  /** Initial interval for first correct answer (days) */
  FIRST_INTERVAL: 1,
  /** Interval after second consecutive correct answer (days) */
  SECOND_INTERVAL: 6,
  /** Threshold for correct answer (quality >= this is correct) */
  CORRECT_THRESHOLD: 3
} as const;

/**
 * Calculate the next review schedule using SM-2 algorithm
 *
 * The SM-2 algorithm works as follows:
 *
 * For correct responses (quality >= 3):
 * - If first review: interval = 1 day
 * - If second review: interval = 6 days
 * - If subsequent: interval = previous_interval * ease_factor
 * - Increment repetitions
 *
 * For incorrect responses (quality < 3):
 * - Reset repetitions to 0
 * - Reset interval to 1 day
 * - (Card goes back to learning phase)
 *
 * Ease factor adjustment (always applied):
 * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 * where q is the quality rating
 *
 * @param quality - Quality rating from 0-5
 * @param progress - Current progress state (easeFactor, interval, repetitions)
 * @returns Updated progress with next review date
 *
 * @example
 * // New card, first correct answer (quality 4)
 * const result = calculateNextReview(4, {
 *   easeFactor: 2.5,
 *   interval: 0,
 *   repetitions: 0
 * });
 * // result.interval = 1 (first successful review)
 * // result.repetitions = 1
 *
 * @example
 * // Second review, correct with difficulty
 * const result = calculateNextReview(3, {
 *   easeFactor: 2.5,
 *   interval: 1,
 *   repetitions: 1
 * });
 * // result.interval = 6 (second successful review)
 * // result.repetitions = 2
 *
 * @example
 * // Incorrect answer after several correct ones
 * const result = calculateNextReview(2, {
 *   easeFactor: 2.6,
 *   interval: 15,
 *   repetitions: 4
 * });
 * // result.interval = 1 (reset to re-learning)
 * // result.repetitions = 0
 */
export function calculateNextReview(
  quality: QualityRating,
  progress: SM2Progress
): SM2Result {
  // Extract current values
  let { easeFactor, interval, repetitions } = progress;

  // Ensure quality is in valid range
  const q = Math.max(0, Math.min(5, Math.round(quality))) as QualityRating;

  // Determine if answer was correct
  const isCorrect = q >= SM2_DEFAULTS.CORRECT_THRESHOLD;

  // Update based on correctness
  if (isCorrect) {
    // Correct response - increase interval
    if (repetitions === 0) {
      // First successful review
      interval = SM2_DEFAULTS.FIRST_INTERVAL;
    } else if (repetitions === 1) {
      // Second successful review
      interval = SM2_DEFAULTS.SECOND_INTERVAL;
    } else {
      // Subsequent reviews - multiply by ease factor
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    // Incorrect response - reset to learning phase
    repetitions = 0;
    interval = SM2_DEFAULTS.FIRST_INTERVAL;
  }

  // Update ease factor (applied regardless of correctness)
  // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor =
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  // Enforce minimum ease factor
  if (easeFactor < SM2_DEFAULTS.MIN_EASE_FACTOR) {
    easeFactor = SM2_DEFAULTS.MIN_EASE_FACTOR;
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  // Set to start of day for consistent scheduling
  nextReviewDate.setHours(0, 0, 0, 0);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate,
    isCorrect
  };
}

/**
 * Convert a simple correct/incorrect boolean to a quality rating
 *
 * For UI simplicity, learners often just indicate "got it" or "didn't get it".
 * This converts that binary input to appropriate quality ratings.
 *
 * @param isCorrect - Whether the learner indicated they knew the answer
 * @param difficulty - Optional difficulty modifier (0-2, default: 1)
 *                     0 = easy (maps correct to 5, incorrect to 2)
 *                     1 = normal (maps correct to 4, incorrect to 1)
 *                     2 = hard (maps correct to 3, incorrect to 0)
 * @returns Quality rating for SM-2
 *
 * @example
 * // Learner got it right, normal difficulty
 * const quality = booleanToQuality(true); // 4
 *
 * // Learner got it right, but it was hard
 * const quality = booleanToQuality(true, 2); // 3
 *
 * // Learner got it wrong
 * const quality = booleanToQuality(false); // 1
 */
export function booleanToQuality(
  isCorrect: boolean,
  difficulty: 0 | 1 | 2 = 1
): QualityRating {
  if (isCorrect) {
    // Correct: 5 (easy), 4 (normal), 3 (hard)
    return (5 - difficulty) as QualityRating;
  } else {
    // Incorrect: 2 (easy), 1 (normal), 0 (hard)
    return (2 - difficulty) as QualityRating;
  }
}

/**
 * Calculate the priority score for a card (for session ordering)
 *
 * Cards that are more overdue should be reviewed first.
 * Returns a score where higher = more urgent.
 *
 * @param nextReviewDate - Scheduled review date (null = never reviewed)
 * @param interval - Current interval in days
 * @returns Priority score (higher = more urgent)
 *
 * @example
 * // Card due yesterday with 7-day interval
 * const priority = calculatePriority(yesterdayDate, 7); // High value
 *
 * // Card due tomorrow with 1-day interval
 * const priority = calculatePriority(tomorrowDate, 1); // Low value
 *
 * // New card (never reviewed)
 * const priority = calculatePriority(null, 0); // Very high value
 */
export function calculatePriority(
  nextReviewDate: Date | null,
  interval: number
): number {
  // New cards get highest priority
  if (!nextReviewDate) {
    return Number.MAX_SAFE_INTEGER;
  }

  const now = new Date();
  const daysOverdue = Math.floor(
    (now.getTime() - nextReviewDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Not yet due - lower priority
  if (daysOverdue < 0) {
    // Future cards get negative priority (they can still be shown if needed)
    return daysOverdue;
  }

  // Overdue cards - priority based on how overdue relative to interval
  // A card 3 days overdue with a 3-day interval is more urgent than
  // a card 3 days overdue with a 30-day interval
  const overdueRatio = interval > 0 ? daysOverdue / interval : daysOverdue;
  return 1 + overdueRatio;
}

/**
 * Check if a card has achieved mastery based on progress
 *
 * A card is considered mastered when:
 * 1. It has been correctly answered N consecutive times (masteryThreshold)
 * 2. The current interval is at least M days (masteryIntervalDays)
 *
 * @param progress - Current progress state
 * @param masteryThreshold - Required consecutive correct answers (default: 3)
 * @param masteryIntervalDays - Required minimum interval (default: 7)
 * @returns Whether the card meets mastery criteria
 *
 * @example
 * // Card with 4 consecutive correct, 15-day interval
 * const mastered = checkMastery({ repetitions: 4, interval: 15, easeFactor: 2.5 });
 * // true (meets both criteria)
 *
 * // Card with 4 consecutive correct, 3-day interval
 * const mastered = checkMastery({ repetitions: 4, interval: 3, easeFactor: 2.5 });
 * // false (interval too short)
 */
export function checkMastery(
  progress: SM2Progress,
  masteryThreshold: number = 3,
  masteryIntervalDays: number = 7
): boolean {
  return (
    progress.repetitions >= masteryThreshold &&
    progress.interval >= masteryIntervalDays
  );
}

/**
 * Get initial progress for a new flashcard
 *
 * @returns Default progress values for a card that has never been reviewed
 */
export function getInitialProgress(): SM2Progress {
  return {
    easeFactor: SM2_DEFAULTS.EASE_FACTOR,
    interval: 0,
    repetitions: 0
  };
}

/**
 * Estimate the number of reviews needed to reach mastery
 *
 * This is a rough estimate based on perfect performance (quality 4).
 *
 * @param masteryThreshold - Required consecutive correct answers
 * @returns Estimated number of reviews to mastery
 */
export function estimateReviewsToMastery(masteryThreshold: number = 3): number {
  // With perfect performance (quality 4), each review extends interval
  // roughly by the ease factor (2.5). After N reviews with perfect
  // performance, the card reaches mastery threshold.
  return masteryThreshold;
}
