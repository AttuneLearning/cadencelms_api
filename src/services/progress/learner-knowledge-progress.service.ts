import mongoose from 'mongoose';
import LearnerKnowledgeProgress, {
  ILearnerKnowledgeProgress,
  IDepthProgress
} from '@/models/progress/LearnerKnowledgeProgress.model';
import KnowledgeNode from '@/models/content/KnowledgeNode.model';
import { CognitiveDepthLevelsService } from '@/services/content/cognitive-depth-levels.service';
import { ApiError } from '@/utils/ApiError';

/**
 * LearnerKnowledgeProgress Service
 *
 * Manages learner progress through knowledge nodes in the adaptive learning system.
 * Handles progress tracking, mastery calculation, and level advancement.
 *
 * Key Operations:
 * - Record attempt results and update progress
 * - Calculate mastery scores per depth level
 * - Determine when a learner advances to the next depth
 * - Query progress for analytics and recommendations
 *
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md
 */

interface ProgressResponse {
  id: string;
  learnerId: string;
  knowledgeNodeId: string;
  departmentId: string;
  currentDepth: string;
  masteryScore: number;
  totalAttempts: number;
  correctAttempts: number;
  lastAttemptAt: Date | null;
  lastCorrectAt: Date | null;
  depthProgress: Record<string, IDepthProgress>;
  isComplete: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProgressSummary {
  totalNodes: number;
  masteredNodes: number;
  inProgressNodes: number;
  notStartedNodes: number;
  overallMasteryPercent: number;
  depthDistribution: Record<string, number>;
}

interface AttemptResult {
  progressUpdated: boolean;
  newMasteryScore: number;
  levelAdvanced: boolean;
  newDepth?: string;
  previousDepth: string;
  isNodeComplete: boolean;
}

export class LearnerKnowledgeProgressService {
  /**
   * Get or create progress record for a learner on a knowledge node
   */
  static async getOrCreate(
    learnerId: string,
    knowledgeNodeId: string
  ): Promise<ILearnerKnowledgeProgress> {
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }
    if (!mongoose.Types.ObjectId.isValid(knowledgeNodeId)) {
      throw ApiError.badRequest('Invalid knowledge node ID');
    }

    // Check if progress already exists
    let progress = await LearnerKnowledgeProgress.findOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      knowledgeNodeId: new mongoose.Types.ObjectId(knowledgeNodeId)
    });

    if (progress) {
      return progress;
    }

    // Get the knowledge node to determine department
    const node = await KnowledgeNode.findById(knowledgeNodeId);
    if (!node) {
      throw ApiError.notFound('Knowledge node not found');
    }

    // Get the first (lowest) depth level for the department
    const levels = await CognitiveDepthLevelsService.getForDepartment(
      node.departmentId.toString()
    );
    const firstLevel = levels.length > 0 ? levels[0].slug : 'exposure';

    // Create new progress record
    progress = await LearnerKnowledgeProgress.create({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      knowledgeNodeId: new mongoose.Types.ObjectId(knowledgeNodeId),
      departmentId: node.departmentId,
      currentDepth: firstLevel,
      masteryScore: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      depthProgress: new Map(),
      isComplete: false,
      isActive: true
    });

    return progress;
  }

  /**
   * Get progress for a learner on a specific node
   */
  static async getForNode(
    learnerId: string,
    knowledgeNodeId: string
  ): Promise<ProgressResponse | null> {
    const progress = await LearnerKnowledgeProgress.findOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      knowledgeNodeId: new mongoose.Types.ObjectId(knowledgeNodeId),
      isActive: true
    });

    if (!progress) {
      return null;
    }

    return this.formatProgressResponse(progress);
  }

  /**
   * Get all progress for a learner, optionally filtered by department
   */
  static async getForLearner(
    learnerId: string,
    departmentId?: string
  ): Promise<ProgressResponse[]> {
    const query: Record<string, unknown> = {
      learnerId: new mongoose.Types.ObjectId(learnerId),
      isActive: true
    };

    if (departmentId) {
      query.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    const progressRecords = await LearnerKnowledgeProgress.find(query).sort({
      lastAttemptAt: -1
    });

    return progressRecords.map((p) => this.formatProgressResponse(p));
  }

  /**
   * Record an attempt result and update progress
   * This is the main method for tracking learning progress
   */
  static async recordAttempt(
    learnerId: string,
    knowledgeNodeId: string,
    cognitiveDepth: string,
    isCorrect: boolean
  ): Promise<AttemptResult> {
    // Get or create progress
    const progress = await this.getOrCreate(learnerId, knowledgeNodeId);
    const previousDepth = progress.currentDepth;

    // Update aggregate stats
    progress.totalAttempts += 1;
    if (isCorrect) {
      progress.correctAttempts += 1;
      progress.lastCorrectAt = new Date();
    }
    progress.lastAttemptAt = new Date();

    // Update depth-specific progress
    const depthKey = cognitiveDepth.toLowerCase();
    let depthProgress = progress.depthProgress.get(depthKey);

    if (!depthProgress) {
      depthProgress = {
        attempts: 0,
        correct: 0,
        mastered: false
      };
    }

    depthProgress.attempts += 1;
    if (isCorrect) {
      depthProgress.correct += 1;
    }
    depthProgress.lastAttemptAt = new Date();

    progress.depthProgress.set(depthKey, depthProgress);

    // Recalculate mastery score
    progress.masteryScore = this.calculateMasteryScore(progress);

    // Check for level advancement
    const advancementResult = await this.checkForLevelAdvancement(progress);

    if (advancementResult.advanced) {
      progress.currentDepth = advancementResult.newDepth!;

      // Mark previous depth as mastered
      const prevDepthProgress = progress.depthProgress.get(previousDepth);
      if (prevDepthProgress && !prevDepthProgress.mastered) {
        prevDepthProgress.mastered = true;
        prevDepthProgress.masteredAt = new Date();
        progress.depthProgress.set(previousDepth, prevDepthProgress);
      }
    }

    // Check if node is complete (highest level mastered)
    progress.isComplete = await this.checkNodeComplete(progress);

    await progress.save();

    return {
      progressUpdated: true,
      newMasteryScore: progress.masteryScore,
      levelAdvanced: advancementResult.advanced,
      newDepth: advancementResult.newDepth,
      previousDepth,
      isNodeComplete: progress.isComplete
    };
  }

  /**
   * Calculate mastery score based on progress
   * Returns percentage 0-100
   */
  private static calculateMasteryScore(
    progress: ILearnerKnowledgeProgress
  ): number {
    if (progress.totalAttempts === 0) {
      return 0;
    }

    // Base score from overall correct rate
    const baseScore = (progress.correctAttempts / progress.totalAttempts) * 100;

    return Math.round(baseScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check if learner should advance to next depth level
   */
  static async checkForLevelAdvancement(
    progress: ILearnerKnowledgeProgress
  ): Promise<{ advanced: boolean; newDepth?: string }> {
    const currentDepth = progress.currentDepth;
    const depthProgress = progress.depthProgress.get(currentDepth);

    if (!depthProgress) {
      return { advanced: false };
    }

    // Get the level definition
    const level = await CognitiveDepthLevelsService.resolveLevel(
      currentDepth,
      progress.departmentId.toString()
    );

    if (!level) {
      return { advanced: false };
    }

    // Check if meets threshold
    const successRate =
      depthProgress.attempts > 0
        ? depthProgress.correct / depthProgress.attempts
        : 0;

    if (
      successRate >= level.advanceThreshold &&
      depthProgress.attempts >= level.minAttempts
    ) {
      // Get next level
      const nextLevel = await CognitiveDepthLevelsService.getNextLevel(
        currentDepth,
        progress.departmentId.toString()
      );

      if (nextLevel) {
        return { advanced: true, newDepth: nextLevel.slug };
      }
    }

    return { advanced: false };
  }

  /**
   * Check if node is complete (highest level mastered)
   */
  private static async checkNodeComplete(
    progress: ILearnerKnowledgeProgress
  ): Promise<boolean> {
    // Get all levels for department
    const levels = await CognitiveDepthLevelsService.getForDepartment(
      progress.departmentId.toString()
    );

    if (levels.length === 0) {
      return false;
    }

    // Get the highest level
    const highestLevel = levels[levels.length - 1];

    // Check if current depth is highest and meets mastery threshold
    if (progress.currentDepth !== highestLevel.slug) {
      return false;
    }

    const depthProgress = progress.depthProgress.get(highestLevel.slug);
    if (!depthProgress) {
      return false;
    }

    // Resolve the level to get threshold
    const level = await CognitiveDepthLevelsService.resolveLevel(
      highestLevel.slug,
      progress.departmentId.toString()
    );

    if (!level) {
      return false;
    }

    const successRate =
      depthProgress.attempts > 0
        ? depthProgress.correct / depthProgress.attempts
        : 0;

    return (
      successRate >= level.advanceThreshold &&
      depthProgress.attempts >= level.minAttempts
    );
  }

  /**
   * Get mastered nodes for a learner in a department
   */
  static async getMasteredNodes(
    learnerId: string,
    departmentId: string
  ): Promise<string[]> {
    const progress = await LearnerKnowledgeProgress.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isComplete: true,
      isActive: true
    }).select('knowledgeNodeId');

    return progress.map((p) => p.knowledgeNodeId.toString());
  }

  /**
   * Get in-progress nodes for a learner in a department
   */
  static async getInProgressNodes(
    learnerId: string,
    departmentId: string
  ): Promise<string[]> {
    const progress = await LearnerKnowledgeProgress.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isComplete: false,
      totalAttempts: { $gt: 0 },
      isActive: true
    }).select('knowledgeNodeId');

    return progress.map((p) => p.knowledgeNodeId.toString());
  }

  /**
   * Get nodes ready to learn (prerequisites complete, not started)
   */
  static async getReadyToLearnNodes(
    learnerId: string,
    departmentId: string
  ): Promise<string[]> {
    // Get all mastered nodes
    const masteredNodeIds = await this.getMasteredNodes(learnerId, departmentId);
    const masteredSet = new Set(masteredNodeIds);

    // Get all in-progress nodes
    const inProgressNodeIds = await this.getInProgressNodes(learnerId, departmentId);
    const inProgressSet = new Set(inProgressNodeIds);

    // Get all active nodes in department
    const allNodes = await KnowledgeNode.find({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    }).select('_id prerequisiteNodeIds');

    const readyNodes: string[] = [];

    for (const node of allNodes) {
      const nodeId = node._id.toString();

      // Skip if already mastered or in progress
      if (masteredSet.has(nodeId) || inProgressSet.has(nodeId)) {
        continue;
      }

      // Check if all prerequisites are mastered
      const prereqsMet = node.prerequisiteNodeIds.every((prereqId) =>
        masteredSet.has(prereqId.toString())
      );

      if (prereqsMet) {
        readyNodes.push(nodeId);
      }
    }

    return readyNodes;
  }

  /**
   * Get progress summary for a learner in a department
   */
  static async getProgressSummary(
    learnerId: string,
    departmentId: string
  ): Promise<ProgressSummary> {
    // Count total nodes in department
    const totalNodes = await KnowledgeNode.countDocuments({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    });

    // Get all progress for this learner in department
    const progress = await LearnerKnowledgeProgress.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    });

    let masteredNodes = 0;
    let inProgressNodes = 0;
    let totalMasteryScore = 0;
    const depthDistribution: Record<string, number> = {};

    for (const p of progress) {
      if (p.isComplete) {
        masteredNodes++;
      } else if (p.totalAttempts > 0) {
        inProgressNodes++;
      }

      totalMasteryScore += p.masteryScore;

      // Track depth distribution
      const depth = p.currentDepth;
      depthDistribution[depth] = (depthDistribution[depth] || 0) + 1;
    }

    const notStartedNodes = totalNodes - masteredNodes - inProgressNodes;
    const overallMasteryPercent =
      progress.length > 0 ? totalMasteryScore / progress.length : 0;

    return {
      totalNodes,
      masteredNodes,
      inProgressNodes,
      notStartedNodes,
      overallMasteryPercent: Math.round(overallMasteryPercent * 100) / 100,
      depthDistribution
    };
  }

  /**
   * Reset progress for a learner on a specific node
   */
  static async resetProgress(
    learnerId: string,
    knowledgeNodeId: string
  ): Promise<void> {
    await LearnerKnowledgeProgress.deleteOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      knowledgeNodeId: new mongoose.Types.ObjectId(knowledgeNodeId)
    });
  }

  /**
   * Deactivate progress (soft delete)
   */
  static async deactivateProgress(
    learnerId: string,
    knowledgeNodeId: string
  ): Promise<void> {
    await LearnerKnowledgeProgress.updateOne(
      {
        learnerId: new mongoose.Types.ObjectId(learnerId),
        knowledgeNodeId: new mongoose.Types.ObjectId(knowledgeNodeId)
      },
      { $set: { isActive: false } }
    );
  }

  /**
   * Format progress document to response object
   */
  private static formatProgressResponse(
    progress: ILearnerKnowledgeProgress
  ): ProgressResponse {
    // Convert Map to plain object
    const depthProgressObj: Record<string, IDepthProgress> = {};
    progress.depthProgress.forEach((value, key) => {
      depthProgressObj[key] = value;
    });

    return {
      id: progress._id.toString(),
      learnerId: progress.learnerId.toString(),
      knowledgeNodeId: progress.knowledgeNodeId.toString(),
      departmentId: progress.departmentId.toString(),
      currentDepth: progress.currentDepth,
      masteryScore: progress.masteryScore,
      totalAttempts: progress.totalAttempts,
      correctAttempts: progress.correctAttempts,
      lastAttemptAt: progress.lastAttemptAt || null,
      lastCorrectAt: progress.lastCorrectAt || null,
      depthProgress: depthProgressObj,
      isComplete: progress.isComplete,
      isActive: progress.isActive,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt
    };
  }
}

export default LearnerKnowledgeProgressService;
