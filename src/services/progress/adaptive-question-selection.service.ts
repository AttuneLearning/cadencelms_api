import mongoose from 'mongoose';
import Question, { IQuestion } from '@/models/assessment/Question.model';
import KnowledgeNode from '@/models/content/KnowledgeNode.model';
import { LearnerKnowledgeProgressService } from '@/services/progress/learner-knowledge-progress.service';
import { CognitiveDepthLevelsService } from '@/services/content/cognitive-depth-levels.service';
import { ApiError } from '@/utils/ApiError';

/**
 * AdaptiveQuestionSelection Service
 *
 * Implements intelligent question selection for adaptive learning.
 * Selects questions based on learner's current mastery and progress.
 *
 * Selection Strategy:
 * - "advancing": Learner ready for next cognitive depth level
 * - "reinforcing": Learner needs more practice at current level
 * - "reviewing": Learner has mastered all levels, review for retention
 *
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md
 */

interface SelectionParams {
  learnerId: string;
  knowledgeNodeId: string;
  questionBankIds?: string[];       // Optional filter
  excludeQuestionIds?: string[];    // Don't repeat these
  preferredTypes?: string[];        // Preferred question types
}

interface SelectedQuestion {
  question: any;                    // The question document
  presentationType: string;         // Selected from questionTypes[]
  cognitiveDepth: string;
  selectionReason: 'advancing' | 'reinforcing' | 'reviewing';
  adaptiveMetadata: {
    currentMastery: number;
    targetDepth: string;
    progressToNextDepth: number;    // 0-100
  };
}

interface ResponseParams {
  learnerId: string;
  questionId: string;
  knowledgeNodeId: string;
  cognitiveDepth: string;
  isCorrect: boolean;
}

interface ResponseResult {
  progressUpdated: boolean;
  newMasteryScore: number;
  levelAdvanced: boolean;
  newDepth?: string;
  previousDepth: string;
  isNodeComplete: boolean;
}

export class AdaptiveQuestionSelectionService {
  /**
   * Select a single question based on learner progress
   */
  static async selectQuestion(params: SelectionParams): Promise<SelectedQuestion | null> {
    const { learnerId, knowledgeNodeId, questionBankIds, excludeQuestionIds, preferredTypes } = params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }
    if (!mongoose.Types.ObjectId.isValid(knowledgeNodeId)) {
      throw ApiError.badRequest('Invalid knowledge node ID');
    }

    // Get the knowledge node to determine department
    const node = await KnowledgeNode.findById(knowledgeNodeId);
    if (!node) {
      throw ApiError.notFound('Knowledge node not found');
    }

    // Get or create learner progress for this node
    const progress = await LearnerKnowledgeProgressService.getOrCreate(learnerId, knowledgeNodeId);

    // Get cognitive depth levels for this department
    const levels = await CognitiveDepthLevelsService.getForDepartment(node.departmentId.toString());
    if (levels.length === 0) {
      throw ApiError.internal('No cognitive depth levels configured for department');
    }

    // Determine target depth and selection reason
    const { targetDepth, selectionReason, progressToNextDepth } = await this.determineTargetDepth(
      progress,
      levels,
      node.departmentId.toString()
    );

    // Query questions matching criteria
    const questions = await this.queryQuestions({
      knowledgeNodeId,
      cognitiveDepth: targetDepth,
      questionBankIds,
      excludeQuestionIds,
      preferredTypes
    });

    if (questions.length === 0) {
      return null;
    }

    // Randomize selection for variety
    const selectedQuestion = this.randomSelect(questions);

    // Select presentation type from question's questionTypes array
    const presentationType = this.selectPresentationType(selectedQuestion, preferredTypes);

    return {
      question: selectedQuestion,
      presentationType,
      cognitiveDepth: targetDepth,
      selectionReason,
      adaptiveMetadata: {
        currentMastery: progress.masteryScore,
        targetDepth,
        progressToNextDepth
      }
    };
  }

  /**
   * Select multiple questions based on learner progress
   */
  static async selectQuestions(params: SelectionParams, count: number): Promise<SelectedQuestion[]> {
    const results: SelectedQuestion[] = [];
    const excludeIds = [...(params.excludeQuestionIds || [])];

    for (let i = 0; i < count; i++) {
      const question = await this.selectQuestion({
        ...params,
        excludeQuestionIds: excludeIds
      });

      if (!question) {
        break;
      }

      results.push(question);
      // Add selected question to exclusion list to avoid duplicates
      excludeIds.push(question.question._id.toString());
    }

    return results;
  }

  /**
   * Record a response and update learner progress
   */
  static async recordResponse(params: ResponseParams): Promise<ResponseResult> {
    const { learnerId, questionId, knowledgeNodeId, cognitiveDepth, isCorrect } = params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.badRequest('Invalid question ID');
    }
    if (!mongoose.Types.ObjectId.isValid(knowledgeNodeId)) {
      throw ApiError.badRequest('Invalid knowledge node ID');
    }

    // Record the attempt via LearnerKnowledgeProgressService
    const result = await LearnerKnowledgeProgressService.recordAttempt(
      learnerId,
      knowledgeNodeId,
      cognitiveDepth,
      isCorrect
    );

    return result;
  }

  /**
   * Determine target depth based on current progress
   */
  private static async determineTargetDepth(
    progress: { currentDepth: string; masteryScore: number; depthProgress: Map<string, any>; departmentId: mongoose.Types.ObjectId },
    levels: { slug: string; order: number; advanceThreshold: number; minAttempts: number }[],
    departmentId: string
  ): Promise<{ targetDepth: string; selectionReason: 'advancing' | 'reinforcing' | 'reviewing'; progressToNextDepth: number }> {
    const currentDepth = progress.currentDepth;
    const currentLevelIndex = levels.findIndex((l) => l.slug === currentDepth);

    // Default values
    let targetDepth = currentDepth;
    let selectionReason: 'advancing' | 'reinforcing' | 'reviewing' = 'reinforcing';
    let progressToNextDepth = 0;

    // Get current depth progress
    const depthProgress = progress.depthProgress.get(currentDepth);

    if (depthProgress) {
      const successRate = depthProgress.attempts > 0
        ? (depthProgress.correct / depthProgress.attempts)
        : 0;

      // Get level definition
      const level = await CognitiveDepthLevelsService.resolveLevel(currentDepth, departmentId);
      const advanceThreshold = level?.advanceThreshold || 0.8;
      const minAttempts = level?.minAttempts || 3;

      // Calculate progress to next depth
      if (depthProgress.attempts >= minAttempts) {
        progressToNextDepth = Math.min(100, Math.round((successRate / advanceThreshold) * 100));
      } else {
        // Weight progress by attempts completed
        const attemptProgress = depthProgress.attempts / minAttempts;
        const successProgress = advanceThreshold > 0 ? successRate / advanceThreshold : 0;
        progressToNextDepth = Math.min(100, Math.round(attemptProgress * successProgress * 100));
      }

      // Check if ready to advance
      const isHighestLevel = currentLevelIndex === levels.length - 1;

      if (isHighestLevel && successRate >= advanceThreshold && depthProgress.attempts >= minAttempts) {
        // Mastery complete - reviewing
        selectionReason = 'reviewing';
        // For review, select random depth from available levels
        const randomIndex = Math.floor(Math.random() * levels.length);
        targetDepth = levels[randomIndex].slug;
        progressToNextDepth = 100;
      } else if (successRate >= advanceThreshold && depthProgress.attempts >= minAttempts) {
        // Ready to advance
        selectionReason = 'advancing';
        if (currentLevelIndex < levels.length - 1) {
          targetDepth = levels[currentLevelIndex + 1].slug;
        }
      }
      // Otherwise: reinforcing at current level (default)
    }

    return { targetDepth, selectionReason, progressToNextDepth };
  }

  /**
   * Query questions matching the selection criteria
   */
  private static async queryQuestions(options: {
    knowledgeNodeId: string;
    cognitiveDepth: string;
    questionBankIds?: string[];
    excludeQuestionIds?: string[];
    preferredTypes?: string[];
  }): Promise<IQuestion[]> {
    const { knowledgeNodeId, cognitiveDepth, questionBankIds, excludeQuestionIds, preferredTypes } = options;

    // Build query
    const query: Record<string, unknown> = {
      knowledgeNodeId: new mongoose.Types.ObjectId(knowledgeNodeId),
      cognitiveDepth: cognitiveDepth.toLowerCase(),
      isActive: true
    };

    // Optional: filter by question banks
    if (questionBankIds && questionBankIds.length > 0) {
      query.questionBankIds = { $in: questionBankIds };
    }

    // Exclude specific questions
    if (excludeQuestionIds && excludeQuestionIds.length > 0) {
      const validExcludeIds = excludeQuestionIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (validExcludeIds.length > 0) {
        query._id = { $nin: validExcludeIds.map((id) => new mongoose.Types.ObjectId(id)) };
      }
    }

    // Optional: filter by preferred types
    if (preferredTypes && preferredTypes.length > 0) {
      query.questionTypes = { $in: preferredTypes };
    }

    const questions = await Question.find(query).lean();

    return questions as unknown as IQuestion[];
  }

  /**
   * Randomly select a question from candidates
   */
  private static randomSelect<T>(items: T[]): T {
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }

  /**
   * Select a presentation type from the question's available types
   */
  private static selectPresentationType(question: IQuestion, preferredTypes?: string[]): string {
    const availableTypes = question.questionTypes || [];

    if (availableTypes.length === 0) {
      return 'multiple_choice'; // Fallback default
    }

    // If preferred types specified, try to match one
    if (preferredTypes && preferredTypes.length > 0) {
      const matchingType = availableTypes.find((t) => preferredTypes.includes(t));
      if (matchingType) {
        return matchingType;
      }
    }

    // Otherwise, select the first available type
    return availableTypes[0];
  }
}

export default AdaptiveQuestionSelectionService;
