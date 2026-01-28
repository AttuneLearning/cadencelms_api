import mongoose from 'mongoose';
import LearnerQuestionProgress, { ILearnerQuestionProgress } from '@/models/progress/LearnerQuestionProgress.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import LearningUnitQuestion from '@/models/content/LearningUnitQuestion.model';
import { ApiError } from '@/utils/ApiError';

interface UpdateProgressDto {
  isCorrect: boolean;
  attemptId?: string;
  timeSpent?: number;
}

interface ProgressResult {
  learnerId: string;
  learningUnitId: string;
  progress: Array<{
    questionId: string;
    correctCount: number;
    incorrectCount: number;
    lastAttemptAt: Date | null;
    isActive: boolean;
    masteredAt: Date | null;
  }>;
  sessionStats: {
    questionsAnswered: number;
    correctThisSession: number;
    masteredThisSession: number;
    activeQuestionCount: number;
  };
}

interface UpdateProgressResult {
  questionId: string;
  correctCount: number;
  incorrectCount: number;
  isActive: boolean;
  masteredAt: Date | null;
  message: string;
}

// Default mastery threshold if not specified in learning unit settings
const DEFAULT_MASTERY_THRESHOLD = 3;

/**
 * LearnerQuestionProgressService
 * Handles tracking learner progress on questions within learning units (exercises/assessments)
 */
export class LearnerQuestionProgressService {
  /**
   * Get learner's progress on questions in a learning unit
   */
  static async getProgress(learningUnitId: string, learnerId: string): Promise<ProgressResult> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.notFound('Learning unit not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    // Verify learning unit exists
    const learningUnit = await LearningUnit.findById(learningUnitId).lean();
    if (!learningUnit) {
      throw ApiError.notFound('Learning unit not found');
    }

    // Get all progress records for this learner/unit
    const progressRecords = await LearnerQuestionProgress.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId)
    }).lean();

    // Calculate session stats
    const questionsAnswered = progressRecords.filter(
      (p) => p.correctCount > 0 || p.incorrectCount > 0
    ).length;

    const correctThisSession = progressRecords.reduce(
      (sum, p) => sum + p.correctCount,
      0
    );

    const masteredThisSession = progressRecords.filter(
      (p) => p.masteredAt !== null
    ).length;

    const activeQuestionCount = progressRecords.filter(
      (p) => p.isActive === true
    ).length;

    // Format progress for response
    const progress = progressRecords.map((p) => ({
      questionId: p.questionId.toString(),
      correctCount: p.correctCount,
      incorrectCount: p.incorrectCount,
      lastAttemptAt: p.lastAttemptAt,
      isActive: p.isActive,
      masteredAt: p.masteredAt
    }));

    return {
      learnerId,
      learningUnitId,
      progress,
      sessionStats: {
        questionsAnswered,
        correctThisSession,
        masteredThisSession,
        activeQuestionCount
      }
    };
  }

  /**
   * Update progress after answering a question
   */
  static async updateProgress(
    learningUnitId: string,
    learnerId: string,
    questionId: string,
    data: UpdateProgressDto
  ): Promise<UpdateProgressResult> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.notFound('Learning unit not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    // Verify learning unit exists
    const learningUnit = await LearningUnit.findById(learningUnitId).lean();
    if (!learningUnit) {
      throw ApiError.notFound('Learning unit not found');
    }

    // Verify question is linked to this learning unit
    const linkedQuestion = await LearningUnitQuestion.findOne({
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
      questionId: new mongoose.Types.ObjectId(questionId)
    }).lean();

    if (!linkedQuestion) {
      throw ApiError.notFound('Question not linked to this learning unit');
    }

    // Get mastery threshold
    const threshold = await this.getMasteryThreshold(learningUnitId);

    const now = new Date();

    // Find or create progress record (upsert)
    let progressRecord = await LearnerQuestionProgress.findOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
      questionId: new mongoose.Types.ObjectId(questionId)
    });

    if (!progressRecord) {
      progressRecord = new LearnerQuestionProgress({
        learnerId: new mongoose.Types.ObjectId(learnerId),
        learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
        questionId: new mongoose.Types.ObjectId(questionId),
        correctCount: 0,
        incorrectCount: 0,
        lastAttemptAt: null,
        isActive: true,
        masteredAt: null
      });
    }

    // Increment correctCount or incorrectCount
    if (data.isCorrect) {
      progressRecord.correctCount += 1;
    } else {
      progressRecord.incorrectCount += 1;
    }

    // Update lastAttemptAt
    progressRecord.lastAttemptAt = now;

    // Check mastery threshold
    const isMastered = await this.checkMastery(progressRecord, threshold);

    let message = data.isCorrect ? 'Correct answer recorded' : 'Incorrect answer recorded';

    // If mastered, set masteredAt and isActive=false
    if (isMastered && !progressRecord.masteredAt) {
      progressRecord.masteredAt = now;
      progressRecord.isActive = false;
      message = 'Question mastered!';
    }

    await progressRecord.save();

    return {
      questionId,
      correctCount: progressRecord.correctCount,
      incorrectCount: progressRecord.incorrectCount,
      isActive: progressRecord.isActive,
      masteredAt: progressRecord.masteredAt,
      message
    };
  }

  /**
   * Check if question is mastered based on threshold
   */
  static async checkMastery(
    progress: ILearnerQuestionProgress,
    threshold: number
  ): Promise<boolean> {
    return progress.correctCount >= threshold;
  }

  /**
   * Get mastery threshold from learning unit
   */
  static async getMasteryThreshold(learningUnitId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      return DEFAULT_MASTERY_THRESHOLD;
    }

    const learningUnit = await LearningUnit.findById(learningUnitId).lean();

    if (!learningUnit) {
      return DEFAULT_MASTERY_THRESHOLD;
    }

    // Check metadata for questionSelection.repetitionThreshold
    const metadata = learningUnit.metadata as Record<string, any> | undefined;
    const questionSelection = metadata?.questionSelection;
    const repetitionThreshold = questionSelection?.repetitionThreshold;

    if (typeof repetitionThreshold === 'number' && repetitionThreshold > 0) {
      return repetitionThreshold;
    }

    return DEFAULT_MASTERY_THRESHOLD;
  }

  /**
   * Initialize progress records for all linked questions
   */
  static async initializeProgress(learningUnitId: string, learnerId: string): Promise<void> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.notFound('Learning unit not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    // Verify learning unit exists
    const learningUnit = await LearningUnit.findById(learningUnitId).lean();
    if (!learningUnit) {
      throw ApiError.notFound('Learning unit not found');
    }

    // Get all linked questions
    const linkedQuestions = await LearningUnitQuestion.find({
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId)
    }).lean();

    if (linkedQuestions.length === 0) {
      return; // No questions to initialize
    }

    // Create progress records if they don't exist (using bulkWrite for efficiency)
    const operations = linkedQuestions.map((link) => ({
      updateOne: {
        filter: {
          learnerId: new mongoose.Types.ObjectId(learnerId),
          learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
          questionId: link.questionId
        },
        update: {
          $setOnInsert: {
            learnerId: new mongoose.Types.ObjectId(learnerId),
            learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
            questionId: link.questionId,
            correctCount: 0,
            incorrectCount: 0,
            lastAttemptAt: null,
            isActive: true,
            masteredAt: null
          }
        },
        upsert: true
      }
    }));

    await LearnerQuestionProgress.bulkWrite(operations);
  }

  /**
   * Reset progress for a learner (for retakes)
   */
  static async resetProgress(learningUnitId: string, learnerId: string): Promise<void> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.notFound('Learning unit not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    // Verify learning unit exists
    const learningUnit = await LearningUnit.findById(learningUnitId).lean();
    if (!learningUnit) {
      throw ApiError.notFound('Learning unit not found');
    }

    // Reset all progress records: correctCount=0, incorrectCount=0, isActive=true, masteredAt=null
    await LearnerQuestionProgress.updateMany(
      {
        learnerId: new mongoose.Types.ObjectId(learnerId),
        learningUnitId: new mongoose.Types.ObjectId(learningUnitId)
      },
      {
        $set: {
          correctCount: 0,
          incorrectCount: 0,
          isActive: true,
          masteredAt: null,
          lastAttemptAt: null
        }
      }
    );
  }

  /**
   * Get progress for a specific question
   */
  static async getQuestionProgress(
    learningUnitId: string,
    learnerId: string,
    questionId: string
  ): Promise<ILearnerQuestionProgress | null> {
    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(learningUnitId) ||
      !mongoose.Types.ObjectId.isValid(learnerId) ||
      !mongoose.Types.ObjectId.isValid(questionId)
    ) {
      return null;
    }

    const progress = await LearnerQuestionProgress.findOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
      questionId: new mongoose.Types.ObjectId(questionId)
    });

    return progress;
  }

  /**
   * Get active (not mastered) questions for a learner
   */
  static async getActiveQuestions(
    learningUnitId: string,
    learnerId: string
  ): Promise<ILearnerQuestionProgress[]> {
    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(learningUnitId) ||
      !mongoose.Types.ObjectId.isValid(learnerId)
    ) {
      return [];
    }

    const activeProgress = await LearnerQuestionProgress.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
      isActive: true
    });

    return activeProgress;
  }

  /**
   * Check if all questions are mastered for a learner
   */
  static async isAllMastered(learningUnitId: string, learnerId: string): Promise<boolean> {
    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(learningUnitId) ||
      !mongoose.Types.ObjectId.isValid(learnerId)
    ) {
      return false;
    }

    // Count total linked questions
    const totalLinked = await LearningUnitQuestion.countDocuments({
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId)
    });

    if (totalLinked === 0) {
      return true; // No questions means all are "mastered"
    }

    // Count mastered questions
    const masteredCount = await LearnerQuestionProgress.countDocuments({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
      masteredAt: { $ne: null }
    });

    return masteredCount >= totalLinked;
  }

  /**
   * Get mastery summary for a learner
   */
  static async getMasterySummary(
    learningUnitId: string,
    learnerId: string
  ): Promise<{
    totalQuestions: number;
    masteredQuestions: number;
    activeQuestions: number;
    masteryPercentage: number;
  }> {
    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(learningUnitId) ||
      !mongoose.Types.ObjectId.isValid(learnerId)
    ) {
      return {
        totalQuestions: 0,
        masteredQuestions: 0,
        activeQuestions: 0,
        masteryPercentage: 0
      };
    }

    // Count total linked questions
    const totalQuestions = await LearningUnitQuestion.countDocuments({
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId)
    });

    if (totalQuestions === 0) {
      return {
        totalQuestions: 0,
        masteredQuestions: 0,
        activeQuestions: 0,
        masteryPercentage: 100
      };
    }

    // Get progress counts
    const [masteredQuestions, activeQuestions] = await Promise.all([
      LearnerQuestionProgress.countDocuments({
        learnerId: new mongoose.Types.ObjectId(learnerId),
        learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
        masteredAt: { $ne: null }
      }),
      LearnerQuestionProgress.countDocuments({
        learnerId: new mongoose.Types.ObjectId(learnerId),
        learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
        isActive: true
      })
    ]);

    const masteryPercentage = Math.round((masteredQuestions / totalQuestions) * 100);

    return {
      totalQuestions,
      masteredQuestions,
      activeQuestions,
      masteryPercentage
    };
  }
}
