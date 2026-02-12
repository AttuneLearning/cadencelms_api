import mongoose from 'mongoose';
import RetentionCheck, { IRetentionCheck, IRetentionCheckResult } from '@/models/activity/RetentionCheck.model';
import Remediation from '@/models/activity/Remediation.model';
import FlashcardProgress, { IFlashcardProgress } from '@/models/activity/FlashcardProgress.model';
import CourseFlashcardConfig, {
  ICourseFlashcardConfig,
  SelectionMethod
} from '@/models/content/CourseFlashcardConfig.model';
import Question, { IQuestion } from '@/models/assessment/Question.model';
import { ApiError } from '@/utils/ApiError';
import {
  QuestionProvenance,
  resolveFlashcardQuestionProvenance
} from '@/services/assessment/lib/canonical-flashcard-selection';
import {
  calculateNextReview,
  booleanToQuality,
  calculatePriority,
  getInitialProgress,
  QualityRating,
  SM2_DEFAULTS
} from '@/utils/sm2-algorithm';

/**
 * Retention Check Service
 *
 * Business logic for retention check functionality including:
 * - Creating retention checks when modules complete
 * - Selecting cards for checks based on configuration
 * - Evaluating check results
 * - Triggering remediation when checks fail
 *
 * @see API-ISS-013 Retention Check & Remediation System
 */

// ============================================
// INTERFACES
// ============================================

/**
 * Result of submitting a retention check
 */
export interface RetentionCheckSubmitResult {
  checkId: string;
  sourceModuleId: string;
  passed: boolean;
  correctCount: number;
  incorrectCount: number;
  failureThreshold: number;
  remediationRequired: boolean;
  remediation?: {
    remediationId: string;
    requireContentReview: boolean;
    requireFinalRetake: boolean;
    moduleId: string;
  };
}

/**
 * Answer for a single card in a retention check
 */
export interface RetentionCheckAnswer {
  questionId: string;
  promptIndex?: number;
  correct: boolean;
  quality?: number;
  timeSpent?: number;
}

/**
 * Pending check summary for API response
 */
export interface PendingCheckSummary {
  checkId: string;
  sourceModuleId: string;
  sourceModuleName?: string;
  cardCount: number;
  triggeredAt: Date;
  isBlocking: boolean;
}

/**
 * Check with cards for API response
 */
export interface RetentionCheckWithCards {
  checkId: string;
  sourceModuleId: string;
  failureThreshold: number;
  cards: Array<{
    questionId: string;
    promptIndex: number;
    learningUnitId?: string;
    learningUnitQuestionId?: string;
    sourceModuleId?: string;
    front: { text: string; media?: object };
    back: { text: string; media?: object };
  }>;
  startedAt: Date;
}

/**
 * History entry for API response
 */
export interface RetentionCheckHistoryEntry {
  checkId: string;
  sourceModuleId: string;
  completedAt: Date;
  passed: boolean;
  correctCount: number;
  incorrectCount: number;
  remediationRequired: boolean;
  remediationStatus?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  flashcardsPerCheck: 5,
  failureThreshold: 2,
  selectionMethod: 'sm2_priority' as SelectionMethod,
  requireContentReview: true,
  requireFinalRetake: false
};

// ============================================
// SERVICE CLASS
// ============================================

export class RetentionCheckService {
  /**
   * Create a retention check when a module completes
   *
   * @param courseId - The course ID
   * @param sourceModuleId - Module whose flashcards will be checked
   * @param triggeredAtModuleId - Module where this check was triggered
   * @param learnerId - The learner ID
   * @returns Created retention check
   */
  static async createRetentionCheck(
    courseId: string,
    sourceModuleId: string,
    triggeredAtModuleId: string,
    learnerId: string
  ): Promise<IRetentionCheck> {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }
    if (!mongoose.Types.ObjectId.isValid(sourceModuleId)) {
      throw ApiError.notFound('Source module not found');
    }
    if (!mongoose.Types.ObjectId.isValid(triggeredAtModuleId)) {
      throw ApiError.notFound('Triggered at module not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    // Get course config
    const config = await this.getCourseConfig(courseId);

    // Check if retention checks are enabled
    if (!config.enabled || config.flashcardsPerCheck === 0) {
      throw ApiError.badRequest('Retention checks are disabled for this course');
    }

    // Select cards for the check
    const selectedCards = await this.selectRetentionCheckCards(
      courseId,
      sourceModuleId,
      learnerId,
      config.flashcardsPerCheck || DEFAULT_CONFIG.flashcardsPerCheck,
      config.selectionMethod || DEFAULT_CONFIG.selectionMethod
    );

    if (selectedCards.length === 0) {
      throw ApiError.badRequest('No flashcard questions available for retention check');
    }

    // Create the retention check
    const check = await RetentionCheck.create({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      courseId: new mongoose.Types.ObjectId(courseId),
      sourceModuleId: new mongoose.Types.ObjectId(sourceModuleId),
      triggeredAtModuleId: new mongoose.Types.ObjectId(triggeredAtModuleId),
      triggeredAt: new Date(),
      cardCount: selectedCards.length,
      failureThreshold: config.failureThreshold || DEFAULT_CONFIG.failureThreshold,
      questionIds: selectedCards.map((card) => new mongoose.Types.ObjectId(card.questionId)),
      cardSources: selectedCards.map((card) => ({
        questionId: new mongoose.Types.ObjectId(card.questionId),
        learningUnitId: new mongoose.Types.ObjectId(card.learningUnitId),
        learningUnitQuestionId: new mongoose.Types.ObjectId(card.learningUnitQuestionId),
        sourceModuleId: new mongoose.Types.ObjectId(card.sourceModuleId)
      })),
      status: 'pending',
      remediationRequired: false
    });

    return check;
  }

  /**
   * Select cards for a retention check based on configuration
   *
   * @param courseId - The course ID
   * @param moduleId - Module to select cards from
   * @param learnerId - The learner ID
   * @param cardCount - Number of cards to select
   * @param selectionMethod - Method for selecting cards
   * @returns Array of question IDs
   */
  static async selectRetentionCheckCards(
    courseId: string,
    moduleId: string,
    learnerId: string,
    cardCount: number,
    selectionMethod: SelectionMethod
  ): Promise<QuestionProvenance[]> {
    const provenance = await resolveFlashcardQuestionProvenance(courseId, moduleId);
    if (provenance.length === 0) {
      return [];
    }

    const candidateQuestionIds = provenance.map((item) => new mongoose.Types.ObjectId(item.questionId));
    const questions = await Question.find({
      _id: { $in: candidateQuestionIds },
      questionTypes: 'flashcard',
      isActive: true
    }).select('_id');

    if (questions.length === 0) {
      return [];
    }

    const activeQuestionIdSet = new Set(questions.map((question) => question._id.toString()));
    const candidateCards = provenance.filter((item) => activeQuestionIdSet.has(item.questionId));
    if (candidateCards.length === 0) {
      return [];
    }

    // Get learner progress for these questions
    const questionIds = candidateCards.map((item) => new mongoose.Types.ObjectId(item.questionId));
    const progressRecords = await FlashcardProgress.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      courseId: new mongoose.Types.ObjectId(courseId),
      questionId: { $in: questionIds }
    });

    // Create progress map
    const progressMap = new Map<string, IFlashcardProgress>();
    for (const progress of progressRecords) {
      progressMap.set(progress.questionId.toString(), progress);
    }

    // Build cards with selection data
    interface CardSelection {
      source: QuestionProvenance;
      priority: number;
      easeFactor: number;
    }

    const cards: CardSelection[] = candidateCards.map((card) => {
      const progress = progressMap.get(card.questionId);
      return {
        source: card,
        priority: calculatePriority(
          progress?.nextReviewDate || null,
          progress?.interval || 0
        ),
        easeFactor: progress?.easeFactor || SM2_DEFAULTS.EASE_FACTOR
      };
    });

    // Select based on method
    let selectedCards: CardSelection[];

    switch (selectionMethod) {
      case 'sm2_priority':
        // Prioritize cards that are due or overdue
        selectedCards = cards
          .sort((a, b) => b.priority - a.priority)
          .slice(0, cardCount);
        break;

      case 'weighted_by_difficulty':
        // Prioritize harder cards (lower ease factor)
        selectedCards = cards
          .sort((a, b) => a.easeFactor - b.easeFactor)
          .slice(0, cardCount);
        break;

      case 'random':
      default:
        // Random selection
        selectedCards = this.shuffleArray(cards).slice(0, cardCount);
        break;
    }

    return selectedCards.map((card) => card.source);
  }

  /**
   * Get a retention check with its cards for answering
   *
   * @param checkId - The retention check ID
   * @param learnerId - The learner ID (for verification)
   * @returns Check with rendered cards
   */
  static async getRetentionCheck(
    checkId: string,
    learnerId: string
  ): Promise<RetentionCheckWithCards> {
    if (!mongoose.Types.ObjectId.isValid(checkId)) {
      throw ApiError.notFound('Retention check not found', 'CHECK_NOT_FOUND');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    const check = await RetentionCheck.findById(checkId);

    if (!check) {
      throw ApiError.notFound('Retention check not found', 'CHECK_NOT_FOUND');
    }

    // Verify ownership
    if (check.learnerId.toString() !== learnerId) {
      throw ApiError.forbidden('This retention check belongs to another learner');
    }

    // Check if already completed
    if (check.status === 'completed') {
      throw ApiError.conflict('This check has already been submitted');
    }

    // Update status to in_progress if pending
    if (check.status === 'pending') {
      check.status = 'in_progress';
      check.startedAt = new Date();
      await check.save();
    }

    // Get questions
    const questions = await Question.find({
      _id: { $in: check.questionIds },
      isActive: true
    });

    // Render cards
    const sourceByQuestionId = new Map<string, QuestionProvenance>();
    (check.cardSources || []).forEach((source) => {
      sourceByQuestionId.set(source.questionId.toString(), {
        questionId: source.questionId.toString(),
        learningUnitId: source.learningUnitId.toString(),
        learningUnitQuestionId: source.learningUnitQuestionId.toString(),
        sourceModuleId: source.sourceModuleId.toString()
      });
    });

    const cards = questions.map((question) => {
      const source = sourceByQuestionId.get(question._id.toString());
      return this.renderFlashcard(question, 0, source);
    });

    return {
      checkId: check._id.toString(),
      sourceModuleId: check.sourceModuleId.toString(),
      failureThreshold: check.failureThreshold,
      cards,
      startedAt: check.startedAt || new Date()
    };
  }

  /**
   * Submit answers for a retention check
   *
   * @param checkId - The retention check ID
   * @param learnerId - The learner ID
   * @param answers - Array of answers for each card
   * @returns Submission result with pass/fail and remediation info
   */
  static async submitRetentionCheck(
    checkId: string,
    learnerId: string,
    answers: RetentionCheckAnswer[]
  ): Promise<RetentionCheckSubmitResult> {
    if (!mongoose.Types.ObjectId.isValid(checkId)) {
      throw ApiError.notFound('Retention check not found', 'CHECK_NOT_FOUND');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    const check = await RetentionCheck.findById(checkId);

    if (!check) {
      throw ApiError.notFound('Retention check not found', 'CHECK_NOT_FOUND');
    }

    // Verify ownership
    if (check.learnerId.toString() !== learnerId) {
      throw ApiError.forbidden('This retention check belongs to another learner');
    }

    // Check if already completed
    if (check.status === 'completed') {
      throw ApiError.conflict('This check has already been submitted');
    }

    // Verify all questions are answered
    const questionIdSet = new Set(check.questionIds.map(id => id.toString()));
    const answeredIds = new Set(answers.map(a => a.questionId));

    if (answeredIds.size !== questionIdSet.size) {
      throw ApiError.badRequest('Answers do not match check cards');
    }

    for (const answerId of answeredIds) {
      if (!questionIdSet.has(answerId)) {
        throw ApiError.badRequest('Answers do not match check cards');
      }
    }

    // Process results
    const results: IRetentionCheckResult[] = [];
    let correctCount = 0;
    let incorrectCount = 0;

    for (const answer of answers) {
      const result: IRetentionCheckResult = {
        questionId: new mongoose.Types.ObjectId(answer.questionId),
        promptIndex: answer.promptIndex || 0,
        correct: answer.correct,
        quality: answer.quality !== undefined ? answer.quality : booleanToQuality(answer.correct),
        timeSpent: answer.timeSpent || 0
      };

      results.push(result);

      if (answer.correct) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      // Update SM-2 progress for each card
      await this.updateFlashcardProgress(
        check.courseId.toString(),
        learnerId,
        answer.questionId,
        answer.promptIndex || 0,
        answer.correct,
        answer.quality as QualityRating | undefined
      );
    }

    // Evaluate pass/fail
    const passed = incorrectCount < check.failureThreshold;

    // Update check
    check.status = 'completed';
    check.completedAt = new Date();
    check.results = results;
    check.correctCount = correctCount;
    check.incorrectCount = incorrectCount;
    check.passed = passed;
    check.remediationRequired = !passed;

    // Create remediation if failed
    let remediation: {
      remediationId: string;
      requireContentReview: boolean;
      requireFinalRetake: boolean;
      moduleId: string;
    } | undefined;

    if (!passed) {
      const config = await this.getCourseConfig(check.courseId.toString());

      const remediationDoc = await Remediation.create({
        learnerId: check.learnerId,
        courseId: check.courseId,
        moduleId: check.sourceModuleId,
        triggeredByCheckId: check._id,
        triggeredAt: new Date(),
        requireContentReview: config.requireContentReview ?? DEFAULT_CONFIG.requireContentReview,
        requireFinalRetake: config.requireFinalRetake ?? DEFAULT_CONFIG.requireFinalRetake,
        status: 'pending'
      });

      check.remediationId = remediationDoc._id as mongoose.Types.ObjectId;

      remediation = {
        remediationId: remediationDoc._id.toString(),
        requireContentReview: remediationDoc.requireContentReview,
        requireFinalRetake: remediationDoc.requireFinalRetake,
        moduleId: remediationDoc.moduleId.toString()
      };
    }

    await check.save();

    return {
      checkId: check._id.toString(),
      sourceModuleId: check.sourceModuleId.toString(),
      passed,
      correctCount,
      incorrectCount,
      failureThreshold: check.failureThreshold,
      remediationRequired: !passed,
      remediation
    };
  }

  /**
   * Get pending retention checks for a learner in a course
   *
   * @param courseId - The course ID
   * @param learnerId - The learner ID
   * @returns Array of pending check summaries
   */
  static async getPendingChecks(
    courseId: string,
    learnerId: string
  ): Promise<{ pendingChecks: PendingCheckSummary[]; totalPending: number }> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    const checks = await RetentionCheck.find({
      courseId: new mongoose.Types.ObjectId(courseId),
      learnerId: new mongoose.Types.ObjectId(learnerId),
      status: { $in: ['pending', 'in_progress'] }
    }).sort({ triggeredAt: 1 });

    const pendingChecks: PendingCheckSummary[] = checks.map(check => ({
      checkId: check._id.toString(),
      sourceModuleId: check.sourceModuleId.toString(),
      cardCount: check.cardCount,
      triggeredAt: check.triggeredAt,
      isBlocking: true // Pending checks block progression
    }));

    return {
      pendingChecks,
      totalPending: pendingChecks.length
    };
  }

  /**
   * Get retention check history for a learner
   *
   * @param courseId - The course ID
   * @param learnerId - The learner ID
   * @param options - Pagination options
   * @returns Paginated history
   */
  static async getRetentionHistory(
    courseId: string,
    learnerId: string,
    options: { page?: number; limit?: number; moduleId?: string } = {}
  ): Promise<{
    history: RetentionCheckHistoryEntry[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      courseId: new mongoose.Types.ObjectId(courseId),
      learnerId: new mongoose.Types.ObjectId(learnerId),
      status: 'completed'
    };

    if (options.moduleId && mongoose.Types.ObjectId.isValid(options.moduleId)) {
      query.sourceModuleId = new mongoose.Types.ObjectId(options.moduleId);
    }

    const [checks, total] = await Promise.all([
      RetentionCheck.find(query)
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('remediationId', 'status'),
      RetentionCheck.countDocuments(query)
    ]);

    const history: RetentionCheckHistoryEntry[] = checks.map(check => ({
      checkId: check._id.toString(),
      sourceModuleId: check.sourceModuleId.toString(),
      completedAt: check.completedAt!,
      passed: check.passed!,
      correctCount: check.correctCount!,
      incorrectCount: check.incorrectCount!,
      remediationRequired: check.remediationRequired,
      remediationStatus: (check.remediationId as any)?.status
    }));

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Check if learner has pending retention checks that block progression
   *
   * @param courseId - The course ID
   * @param learnerId - The learner ID
   * @returns Whether progression is blocked
   */
  static async isProgressionBlocked(
    courseId: string,
    learnerId: string
  ): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(learnerId)) {
      return false;
    }

    const pendingCount = await RetentionCheck.countDocuments({
      courseId: new mongoose.Types.ObjectId(courseId),
      learnerId: new mongoose.Types.ObjectId(learnerId),
      status: { $in: ['pending', 'in_progress'] }
    });

    return pendingCount > 0;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get course flashcard configuration
   */
  private static async getCourseConfig(courseId: string): Promise<ICourseFlashcardConfig> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }

    const config = await CourseFlashcardConfig.findOne({
      courseId: new mongoose.Types.ObjectId(courseId)
    });

    if (config) {
      return config;
    }

    // Return default config
    return {
      courseId: new mongoose.Types.ObjectId(courseId),
      enabled: true,
      flashcardsPerCheck: DEFAULT_CONFIG.flashcardsPerCheck,
      failureThreshold: DEFAULT_CONFIG.failureThreshold,
      checkFrequency: 'every_module',
      selectionMethod: DEFAULT_CONFIG.selectionMethod,
      requireContentReview: DEFAULT_CONFIG.requireContentReview,
      requireFinalRetake: DEFAULT_CONFIG.requireFinalRetake,
      includeOnlyCompletedModules: true,
      masteryThreshold: 3,
      masteryIntervalDays: 7,
      defaultSessionSize: 10,
      maxSessionSize: 50
    } as ICourseFlashcardConfig;
  }

  /**
   * Update flashcard progress after answering a card
   */
  private static async updateFlashcardProgress(
    courseId: string,
    learnerId: string,
    questionId: string,
    promptIndex: number,
    isCorrect: boolean,
    quality?: QualityRating
  ): Promise<void> {
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

      await progress.save();
    } else {
      // Create new progress record
      await FlashcardProgress.create({
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
        mastered: false,
        masteredAt: null
      });
    }
  }

  /**
   * Render a question as a flashcard
   */
  private static renderFlashcard(
    question: IQuestion,
    promptIndex: number,
    source: QuestionProvenance | undefined
  ): {
    questionId: string;
    promptIndex: number;
    learningUnitId?: string;
    learningUnitQuestionId?: string;
    sourceModuleId?: string;
    front: { text: string; media?: object };
    back: { text: string; media?: object };
  } {
    let front: { text: string; media?: object };
    let back: { text: string; media?: object };

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
        front = {
          text: question.questionText,
          media: data.frontMedia
        };
      }

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
      // Fallback
      front = { text: question.questionText };
      back = {
        text: question.correctAnswers?.[0]
          || question.correctAnswer
          || question.modelAnswer
          || ''
      };
    }

    return {
      questionId: question._id.toString(),
      promptIndex,
      learningUnitId: source?.learningUnitId,
      learningUnitQuestionId: source?.learningUnitQuestionId,
      sourceModuleId: source?.sourceModuleId,
      front,
      back
    };
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

export default RetentionCheckService;
