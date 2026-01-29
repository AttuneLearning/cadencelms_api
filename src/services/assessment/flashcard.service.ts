import mongoose from 'mongoose';
import FlashcardProgress, { IFlashcardProgress } from '@/models/activity/FlashcardProgress.model';
import CourseFlashcardConfig, {
  ICourseFlashcardConfig,
  CheckFrequency,
  SelectionMethod
} from '@/models/content/CourseFlashcardConfig.model';
import Question, { IQuestion, IMediaAttachmentRef } from '@/models/assessment/Question.model';
import { ApiError } from '@/utils/ApiError';
import {
  calculateNextReview,
  booleanToQuality,
  calculatePriority,
  checkMastery,
  getInitialProgress,
  QualityRating,
  SM2_DEFAULTS
} from '@/utils/sm2-algorithm';

/**
 * Flashcard Service
 *
 * Business logic for flashcard functionality including:
 * - Building flashcard sessions from Question documents
 * - Recording learner progress using SM-2 algorithm
 * - Managing course-level flashcard configuration
 * - Tracking mastery and progress statistics
 *
 * @see API-ISS-010 Flashcard System Implementation
 */

// ============================================
// INTERFACES
// ============================================

/**
 * Rendered flashcard for presentation to learner
 */
export interface RenderedFlashcard {
  questionId: string;
  promptIndex: number;
  front: {
    text: string;
    media?: IMediaAttachmentRef;
  };
  back: {
    text: string;
    media?: IMediaAttachmentRef;
  };
  explanation?: string;
  hints?: string[];
  difficulty?: string;
  progress?: {
    timesCorrect: number;
    timesIncorrect: number;
    lastReviewed: Date | null;
    mastered: boolean;
  };
}

/**
 * Flashcard session containing cards to review
 */
export interface FlashcardSession {
  courseId: string;
  moduleId?: string;
  sessionSize: number;
  cards: RenderedFlashcard[];
  stats: {
    totalCards: number;
    dueCards: number;
    masteredCards: number;
    newCards: number;
  };
}

/**
 * Result of recording a flashcard attempt
 */
export interface FlashcardResultRecord {
  questionId: string;
  promptIndex: number;
  isCorrect: boolean;
  newInterval: number;
  nextReviewDate: Date;
  mastered: boolean;
  masteredAt?: Date;
}

/**
 * Learner progress summary for a course
 */
export interface FlashcardProgressSummary {
  courseId: string;
  learnerId: string;
  totalCards: number;
  masteredCards: number;
  dueCards: number;
  totalReviews: number;
  accuracy: number;
  streakDays: number;
  lastStudied: Date | null;
  cardProgress: Array<{
    questionId: string;
    promptIndex: number;
    timesCorrect: number;
    timesIncorrect: number;
    interval: number;
    nextReviewDate: Date | null;
    mastered: boolean;
  }>;
}

/**
 * Options for session building
 */
interface GetSessionOptions {
  moduleId?: string;
  sessionSize?: number;
  includeNew?: boolean;
  onlyDue?: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<ICourseFlashcardConfig> = {
  enabled: true,
  flashcardsPerCheck: 5,
  failureThreshold: 2,
  checkFrequency: 'every_module' as CheckFrequency,
  selectionMethod: 'sm2_priority' as SelectionMethod,
  requireContentReview: true,
  requireFinalRetake: false,
  includeOnlyCompletedModules: true,
  masteryThreshold: 3,
  masteryIntervalDays: 7,
  defaultSessionSize: 10,
  maxSessionSize: 50
};

// ============================================
// SERVICE CLASS
// ============================================

export class FlashcardService {
  /**
   * Get a flashcard session for a learner
   *
   * Selects cards from Questions with 'flashcard' in questionTypes,
   * prioritizing by SM-2 due date and including progress data.
   *
   * @param courseId - The course ID
   * @param learnerId - The learner ID
   * @param options - Session options (moduleId, sessionSize, etc.)
   * @returns FlashcardSession with cards and stats
   */
  static async getFlashcardSession(
    courseId: string,
    learnerId: string,
    options: GetSessionOptions = {}
  ): Promise<FlashcardSession> {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    // Get course config for session size and selection method
    const config = await this.getCourseConfig(courseId);
    const sessionSize = Math.min(
      options.sessionSize || config.defaultSessionSize || DEFAULT_CONFIG.defaultSessionSize!,
      config.maxSessionSize || DEFAULT_CONFIG.maxSessionSize!
    );

    // Build query for flashcard-type questions
    const questionQuery: Record<string, unknown> = {
      questionTypes: 'flashcard',
      isActive: true
    };

    // If moduleId provided, filter by module
    // Note: Questions are linked to modules via Exercise or LearningUnit
    // For now, we use metadata.moduleId if available
    if (options.moduleId) {
      if (!mongoose.Types.ObjectId.isValid(options.moduleId)) {
        throw ApiError.badRequest('Invalid moduleId');
      }
      questionQuery['metadata.moduleId'] = options.moduleId;
    }

    // Get all flashcard questions for this course
    // Note: Questions don't have direct courseId, so we need to filter differently
    // For now, we'll use departmentId-based filtering via the course
    const questions = await Question.find(questionQuery);

    if (questions.length === 0) {
      return {
        courseId,
        moduleId: options.moduleId,
        sessionSize,
        cards: [],
        stats: {
          totalCards: 0,
          dueCards: 0,
          masteredCards: 0,
          newCards: 0
        }
      };
    }

    const questionIds = questions.map(q => q._id);

    // Get existing progress for these questions
    const progressRecords = await FlashcardProgress.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      courseId: new mongoose.Types.ObjectId(courseId),
      questionId: { $in: questionIds }
    });

    // Create a map for quick progress lookup
    const progressMap = new Map<string, IFlashcardProgress>();
    for (const progress of progressRecords) {
      const key = `${progress.questionId.toString()}_${progress.promptIndex}`;
      progressMap.set(key, progress);
    }

    // Build cards with priority scores
    interface CardWithPriority {
      question: IQuestion;
      promptIndex: number;
      progress: IFlashcardProgress | null;
      priority: number;
      isNew: boolean;
      isDue: boolean;
      isMastered: boolean;
    }

    const cardsWithPriority: CardWithPriority[] = [];

    for (const question of questions) {
      // Determine how many prompt variations this question has
      const promptCount = Math.max(
        1,
        question.flashcardData?.prompts?.length || 0
      );

      for (let promptIndex = 0; promptIndex < promptCount; promptIndex++) {
        const key = `${question._id.toString()}_${promptIndex}`;
        const progress = progressMap.get(key) || null;

        const isNew = !progress;
        const isDue = isNew || (progress?.nextReviewDate ? new Date() >= progress.nextReviewDate : true);
        const isMastered = progress?.mastered || false;

        // Skip mastered cards unless we need them
        if (isMastered && !options.includeNew) {
          continue;
        }

        // Calculate priority
        const priority = calculatePriority(
          progress?.nextReviewDate || null,
          progress?.interval || 0
        );

        cardsWithPriority.push({
          question,
          promptIndex,
          progress,
          priority,
          isNew,
          isDue,
          isMastered
        });
      }
    }

    // Sort by priority (highest first) and select based on method
    let selectedCards: CardWithPriority[];

    if (config.selectionMethod === 'sm2_priority') {
      // SM-2 priority: due cards first, then by priority
      selectedCards = cardsWithPriority
        .sort((a, b) => {
          // Due cards come first
          if (a.isDue && !b.isDue) return -1;
          if (!a.isDue && b.isDue) return 1;
          // Then by priority
          return b.priority - a.priority;
        })
        .slice(0, sessionSize);
    } else if (config.selectionMethod === 'weighted_by_difficulty') {
      // Harder cards (lower easeFactor) get priority
      selectedCards = cardsWithPriority
        .sort((a, b) => {
          const aEase = a.progress?.easeFactor || SM2_DEFAULTS.EASE_FACTOR;
          const bEase = b.progress?.easeFactor || SM2_DEFAULTS.EASE_FACTOR;
          return aEase - bEase; // Lower ease = harder = first
        })
        .slice(0, sessionSize);
    } else {
      // Random selection
      selectedCards = this.shuffleArray(cardsWithPriority).slice(0, sessionSize);
    }

    // Calculate stats
    const stats = {
      totalCards: cardsWithPriority.length,
      dueCards: cardsWithPriority.filter(c => c.isDue && !c.isMastered).length,
      masteredCards: cardsWithPriority.filter(c => c.isMastered).length,
      newCards: cardsWithPriority.filter(c => c.isNew).length
    };

    // Render cards
    const cards = selectedCards.map(({ question, promptIndex, progress }) =>
      this.renderFlashcard(question, promptIndex, progress)
    );

    return {
      courseId,
      moduleId: options.moduleId,
      sessionSize,
      cards,
      stats
    };
  }

  /**
   * Record a flashcard result and update progress
   *
   * @param courseId - The course ID
   * @param learnerId - The learner ID
   * @param questionId - The question ID
   * @param promptIndex - Which prompt variation was used
   * @param isCorrect - Whether the learner got it right
   * @param quality - Optional quality rating (0-5), derived from isCorrect if not provided
   * @returns Updated progress record
   */
  static async recordFlashcardResult(
    courseId: string,
    learnerId: string,
    questionId: string,
    promptIndex: number,
    isCorrect: boolean,
    quality?: QualityRating
  ): Promise<FlashcardResultRecord> {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    // Verify question exists and has flashcard type
    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      throw ApiError.notFound('Question not found');
    }
    if (!question.questionTypes.includes('flashcard')) {
      throw ApiError.badRequest('Question is not a flashcard type');
    }

    // Get or create progress record
    let progress = await FlashcardProgress.findOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      courseId: new mongoose.Types.ObjectId(courseId),
      questionId: new mongoose.Types.ObjectId(questionId),
      promptIndex
    });

    // Determine quality rating
    const qualityRating = quality !== undefined ? quality : booleanToQuality(isCorrect);

    // Get current progress values or defaults
    const currentProgress = progress
      ? {
          easeFactor: progress.easeFactor,
          interval: progress.interval,
          repetitions: progress.repetitions
        }
      : getInitialProgress();

    // Calculate new values using SM-2
    const sm2Result = calculateNextReview(qualityRating, currentProgress);

    // Get course config for mastery settings
    const config = await this.getCourseConfig(courseId);
    const isMastered = checkMastery(
      {
        easeFactor: sm2Result.easeFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions
      },
      config.masteryThreshold || DEFAULT_CONFIG.masteryThreshold!,
      config.masteryIntervalDays || DEFAULT_CONFIG.masteryIntervalDays!
    );

    if (progress) {
      // Update existing progress
      progress.easeFactor = sm2Result.easeFactor;
      progress.interval = sm2Result.interval;
      progress.repetitions = sm2Result.repetitions;
      progress.nextReviewDate = sm2Result.nextReviewDate;
      progress.lastReviewed = new Date();

      if (isCorrect) {
        progress.timesCorrect += 1;
      } else {
        progress.timesIncorrect += 1;
      }

      // Update mastery status
      if (isMastered && !progress.mastered) {
        progress.mastered = true;
        progress.masteredAt = new Date();
      } else if (!isMastered && progress.mastered) {
        // Can lose mastery if performance drops
        progress.mastered = false;
        progress.masteredAt = null;
      }

      await progress.save();
    } else {
      // Create new progress record
      progress = await FlashcardProgress.create({
        learnerId: new mongoose.Types.ObjectId(learnerId),
        courseId: new mongoose.Types.ObjectId(courseId),
        questionId: new mongoose.Types.ObjectId(questionId),
        promptIndex,
        easeFactor: sm2Result.easeFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        timesCorrect: isCorrect ? 1 : 0,
        timesIncorrect: isCorrect ? 0 : 1,
        lastReviewed: new Date(),
        nextReviewDate: sm2Result.nextReviewDate,
        mastered: isMastered,
        masteredAt: isMastered ? new Date() : null
      });
    }

    return {
      questionId,
      promptIndex,
      isCorrect: sm2Result.isCorrect,
      newInterval: sm2Result.interval,
      nextReviewDate: sm2Result.nextReviewDate,
      mastered: progress.mastered,
      masteredAt: progress.masteredAt || undefined
    };
  }

  /**
   * Get flashcard progress summary for a learner
   *
   * @param courseId - The course ID
   * @param learnerId - The learner ID
   * @returns Progress summary with stats and card-level details
   */
  static async getFlashcardProgress(
    courseId: string,
    learnerId: string
  ): Promise<FlashcardProgressSummary> {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    // Get all progress records for this learner/course
    const progressRecords = await FlashcardProgress.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      courseId: new mongoose.Types.ObjectId(courseId)
    }).sort({ lastReviewed: -1 });

    // Calculate stats
    const now = new Date();
    let totalReviews = 0;
    let totalCorrect = 0;
    let masteredCount = 0;
    let dueCount = 0;
    let lastStudied: Date | null = null;

    const cardProgress = progressRecords.map(progress => {
      totalReviews += progress.timesCorrect + progress.timesIncorrect;
      totalCorrect += progress.timesCorrect;

      if (progress.mastered) {
        masteredCount++;
      }

      if (progress.nextReviewDate && progress.nextReviewDate <= now) {
        dueCount++;
      }

      if (!lastStudied || (progress.lastReviewed && progress.lastReviewed > lastStudied)) {
        lastStudied = progress.lastReviewed;
      }

      return {
        questionId: progress.questionId.toString(),
        promptIndex: progress.promptIndex,
        timesCorrect: progress.timesCorrect,
        timesIncorrect: progress.timesIncorrect,
        interval: progress.interval,
        nextReviewDate: progress.nextReviewDate,
        mastered: progress.mastered
      };
    });

    // Calculate streak (consecutive days studied)
    // This is a simplified version - a full implementation would track daily activity
    const streakDays = lastStudied ? 1 : 0;

    // Get total possible cards count
    // Note: This would need to query Questions to get accurate count
    const totalCards = progressRecords.length;

    return {
      courseId,
      learnerId,
      totalCards,
      masteredCards: masteredCount,
      dueCards: dueCount,
      totalReviews,
      accuracy: totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0,
      streakDays,
      lastStudied,
      cardProgress
    };
  }

  /**
   * Reset flashcard progress for a learner
   *
   * @param courseId - The course ID
   * @param learnerId - The learner ID
   * @param questionId - Optional specific question to reset
   * @returns Number of progress records deleted
   */
  static async resetProgress(
    courseId: string,
    learnerId: string,
    questionId?: string
  ): Promise<{ deletedCount: number }> {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    const deleteQuery: Record<string, unknown> = {
      learnerId: new mongoose.Types.ObjectId(learnerId),
      courseId: new mongoose.Types.ObjectId(courseId)
    };

    if (questionId) {
      if (!mongoose.Types.ObjectId.isValid(questionId)) {
        throw ApiError.badRequest('Invalid questionId');
      }
      deleteQuery.questionId = new mongoose.Types.ObjectId(questionId);
    }

    const result = await FlashcardProgress.deleteMany(deleteQuery);

    return { deletedCount: result.deletedCount || 0 };
  }

  /**
   * Get course flashcard configuration
   *
   * Returns existing config or default values if none exists.
   *
   * @param courseId - The course ID
   * @returns Course flashcard configuration
   */
  static async getCourseConfig(
    courseId: string
  ): Promise<ICourseFlashcardConfig> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }

    const config = await CourseFlashcardConfig.findOne({
      courseId: new mongoose.Types.ObjectId(courseId)
    });

    if (config) {
      return config;
    }

    // Return default config (not persisted)
    return {
      courseId: new mongoose.Types.ObjectId(courseId),
      ...DEFAULT_CONFIG
    } as ICourseFlashcardConfig;
  }

  /**
   * Update course flashcard configuration
   *
   * Creates a new config if one doesn't exist.
   *
   * @param courseId - The course ID
   * @param updates - Configuration updates
   * @returns Updated configuration
   */
  static async updateCourseConfig(
    courseId: string,
    updates: Partial<ICourseFlashcardConfig>
  ): Promise<ICourseFlashcardConfig> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }

    // Remove fields that shouldn't be directly updated
    const sanitizedUpdates = { ...updates };
    delete (sanitizedUpdates as any)._id;
    delete (sanitizedUpdates as any).courseId;
    delete (sanitizedUpdates as any).createdAt;
    delete (sanitizedUpdates as any).updatedAt;

    const config = await CourseFlashcardConfig.findOneAndUpdate(
      { courseId: new mongoose.Types.ObjectId(courseId) },
      { $set: sanitizedUpdates },
      { new: true, upsert: true, runValidators: true }
    );

    if (!config) {
      throw ApiError.internal('Failed to update configuration');
    }

    return config;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Render a question as a flashcard
   */
  private static renderFlashcard(
    question: IQuestion,
    promptIndex: number,
    progress: IFlashcardProgress | null
  ): RenderedFlashcard {
    let front: { text: string; media?: IMediaAttachmentRef };
    let back: { text: string; media?: IMediaAttachmentRef };

    // Check for new flashcardData design
    if (question.flashcardData) {
      const data = question.flashcardData;

      // Select which prompt to use
      if (data.prompts && data.prompts.length > 0 && promptIndex < data.prompts.length) {
        const selectedPrompt = data.prompts[promptIndex];
        front = {
          text: selectedPrompt.text,
          media: selectedPrompt.media || data.frontMedia
        };
      } else {
        // No prompts or invalid index, use questionText as front
        front = {
          text: question.questionText,
          media: data.frontMedia
        };
      }

      // Back is the answer
      const backText = question.correctAnswers?.[0]
        || question.correctAnswer
        || question.questionText;

      back = {
        text: backText,
        media: data.backMedia
      };
    } else if (question.cards && question.cards.length > 0) {
      // Legacy cards design
      const cardIndex = Math.min(promptIndex, question.cards.length - 1);
      const card = question.cards[cardIndex];

      front = { text: card.front };
      back = { text: card.back };
    } else {
      // Fallback: use questionText as front, correctAnswer as back
      front = { text: question.questionText };
      back = {
        text: question.correctAnswers?.[0]
          || question.correctAnswer
          || question.modelAnswer
          || ''
      };
    }

    const rendered: RenderedFlashcard = {
      questionId: question._id.toString(),
      promptIndex,
      front,
      back,
      explanation: question.explanation,
      hints: question.hints,
      difficulty: question.difficulty
    };

    // Include progress if available
    if (progress) {
      rendered.progress = {
        timesCorrect: progress.timesCorrect,
        timesIncorrect: progress.timesIncorrect,
        lastReviewed: progress.lastReviewed,
        mastered: progress.mastered
      };
    }

    return rendered;
  }

  /**
   * Fisher-Yates shuffle
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export default FlashcardService;
