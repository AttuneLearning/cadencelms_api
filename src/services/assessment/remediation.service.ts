import mongoose from 'mongoose';
import Remediation, { IRemediation, RemediationStatus } from '@/models/activity/Remediation.model';
import RetentionCheck from '@/models/activity/RetentionCheck.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Remediation Service
 *
 * Business logic for remediation functionality including:
 * - Creating remediations when retention checks fail
 * - Tracking content review progress
 * - Linking final assessment retakes
 * - Completing remediations when all steps done
 *
 * @see API-ISS-013 Retention Check & Remediation System
 */

// ============================================
// INTERFACES
// ============================================

/**
 * Active remediation summary for API response
 */
export interface ActiveRemediationSummary {
  remediationId: string;
  moduleId: string;
  moduleName?: string;
  triggeredAt: Date;
  triggeredByCheckId: string;
  status: RemediationStatus;
  requireContentReview: boolean;
  requireFinalRetake: boolean;
  contentReviewedAt: Date | null;
  finalRetakenAt: Date | null;
}

/**
 * Remediation status details for API response
 */
export interface RemediationStatusDetails {
  remediationId: string;
  moduleId: string;
  status: RemediationStatus;
  steps: {
    contentReview: {
      required: boolean;
      completed: boolean;
      completedAt: Date | null;
      contentItems?: Array<{
        itemId: string;
        title?: string;
        viewed: boolean;
      }>;
    };
    finalRetake: {
      required: boolean;
      completed: boolean;
      completedAt: Date | null;
      passed: boolean | null;
      attemptId: string | null;
    };
  };
  nextStep: string | null;
  completedAt: Date | null;
}

/**
 * Result of marking content as reviewed
 */
export interface ContentReviewedResult {
  remediationId: string;
  status: RemediationStatus;
  contentReviewedAt: Date;
  nextStep: string | null;
}

// ============================================
// SERVICE CLASS
// ============================================

export class RemediationService {
  /**
   * Create a remediation when a retention check fails
   *
   * Note: This is typically called internally by RetentionCheckService
   * when a check fails. Direct creation is for special cases only.
   *
   * @param checkId - The failed retention check ID
   * @returns Created remediation
   */
  static async createRemediation(checkId: string): Promise<IRemediation> {
    if (!mongoose.Types.ObjectId.isValid(checkId)) {
      throw ApiError.notFound('Retention check not found');
    }

    // Get the retention check
    const check = await RetentionCheck.findById(checkId);
    if (!check) {
      throw ApiError.notFound('Retention check not found');
    }

    // Verify check was failed
    if (check.passed) {
      throw ApiError.badRequest('Cannot create remediation for a passed check');
    }

    // Check if remediation already exists
    const existingRemediation = await Remediation.findOne({
      triggeredByCheckId: new mongoose.Types.ObjectId(checkId)
    });

    if (existingRemediation) {
      return existingRemediation;
    }

    // Create remediation with default requirements
    const remediation = await Remediation.create({
      learnerId: check.learnerId,
      courseId: check.courseId,
      moduleId: check.sourceModuleId,
      triggeredByCheckId: check._id,
      triggeredAt: new Date(),
      requireContentReview: true,
      requireFinalRetake: false,
      status: 'pending'
    });

    // Update check with remediation ID
    check.remediationId = remediation._id as mongoose.Types.ObjectId;
    check.remediationRequired = true;
    await check.save();

    return remediation;
  }

  /**
   * Get active remediations for a learner in a course
   *
   * @param courseId - The course ID
   * @param learnerId - The learner ID
   * @returns Array of active remediations and blocking status
   */
  static async getActiveRemediations(
    courseId: string,
    learnerId: string
  ): Promise<{
    remediations: ActiveRemediationSummary[];
    totalActive: number;
    isBlocking: boolean;
  }> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    const remediations = await Remediation.find({
      courseId: new mongoose.Types.ObjectId(courseId),
      learnerId: new mongoose.Types.ObjectId(learnerId),
      status: { $ne: 'completed' }
    }).sort({ triggeredAt: 1 });

    const summaries: ActiveRemediationSummary[] = remediations.map(r => ({
      remediationId: r._id.toString(),
      moduleId: r.moduleId.toString(),
      triggeredAt: r.triggeredAt,
      triggeredByCheckId: r.triggeredByCheckId.toString(),
      status: r.status,
      requireContentReview: r.requireContentReview,
      requireFinalRetake: r.requireFinalRetake,
      contentReviewedAt: r.contentReviewedAt || null,
      finalRetakenAt: r.finalRetakenAt || null
    }));

    return {
      remediations: summaries,
      totalActive: summaries.length,
      isBlocking: summaries.length > 0
    };
  }

  /**
   * Get active remediation for a specific module
   *
   * @param courseId - The course ID
   * @param moduleId - The module ID
   * @param learnerId - The learner ID
   * @returns Active remediation or null
   */
  static async getActiveRemediation(
    courseId: string,
    moduleId: string,
    learnerId: string
  ): Promise<IRemediation | null> {
    if (!mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(moduleId) ||
        !mongoose.Types.ObjectId.isValid(learnerId)) {
      return null;
    }

    return Remediation.findOne({
      courseId: new mongoose.Types.ObjectId(courseId),
      moduleId: new mongoose.Types.ObjectId(moduleId),
      learnerId: new mongoose.Types.ObjectId(learnerId),
      status: { $ne: 'completed' }
    });
  }

  /**
   * Mark content as reviewed for a remediation
   *
   * @param remediationId - The remediation ID
   * @param learnerId - The learner ID (for verification)
   * @param itemsViewed - Optional list of content items viewed
   * @returns Result with updated status and next step
   */
  static async markContentReviewed(
    remediationId: string,
    learnerId: string,
    itemsViewed?: string[]
  ): Promise<ContentReviewedResult> {
    if (!mongoose.Types.ObjectId.isValid(remediationId)) {
      throw ApiError.notFound('Remediation not found', 'REMEDIATION_NOT_FOUND');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    const remediation = await Remediation.findById(remediationId);

    if (!remediation) {
      throw ApiError.notFound('Remediation not found', 'REMEDIATION_NOT_FOUND');
    }

    // Verify ownership
    if (remediation.learnerId.toString() !== learnerId) {
      throw ApiError.forbidden('This remediation belongs to another learner');
    }

    // Check if content review is required
    if (!remediation.requireContentReview) {
      throw ApiError.conflict('This remediation does not require content review');
    }

    // Check if already reviewed
    if (remediation.contentReviewedAt) {
      throw ApiError.conflict('Content already marked as reviewed');
    }

    // Update remediation
    remediation.contentReviewedAt = new Date();
    remediation.contentItemsViewed = itemsViewed || [];

    // Update status
    if (remediation.requireFinalRetake) {
      remediation.status = 'content_reviewed';
    } else {
      // No final retake required, mark as completed
      remediation.status = 'completed';
      remediation.completedAt = new Date();
    }

    await remediation.save();

    // Determine next step
    let nextStep: string | null = null;
    if (remediation.requireFinalRetake && !remediation.finalRetakenAt) {
      nextStep = 'final_retake';
    }

    return {
      remediationId: remediation._id.toString(),
      status: remediation.status,
      contentReviewedAt: remediation.contentReviewedAt,
      nextStep
    };
  }

  /**
   * Link a final retake attempt to a remediation
   *
   * @param remediationId - The remediation ID
   * @param learnerId - The learner ID (for verification)
   * @param attemptId - The exam attempt ID
   * @param passed - Whether the learner passed the retake
   * @returns Updated remediation
   */
  static async linkFinalRetake(
    remediationId: string,
    learnerId: string,
    attemptId: string,
    passed: boolean
  ): Promise<IRemediation> {
    if (!mongoose.Types.ObjectId.isValid(remediationId)) {
      throw ApiError.notFound('Remediation not found', 'REMEDIATION_NOT_FOUND');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.badRequest('Invalid attempt ID');
    }

    const remediation = await Remediation.findById(remediationId);

    if (!remediation) {
      throw ApiError.notFound('Remediation not found', 'REMEDIATION_NOT_FOUND');
    }

    // Verify ownership
    if (remediation.learnerId.toString() !== learnerId) {
      throw ApiError.forbidden('This remediation belongs to another learner');
    }

    // Check if final retake is required
    if (!remediation.requireFinalRetake) {
      throw ApiError.conflict('This remediation does not require final retake');
    }

    // Check if content review was required and completed
    if (remediation.requireContentReview && !remediation.contentReviewedAt) {
      throw ApiError.badRequest('Content review must be completed before final retake');
    }

    // Update remediation with retake result
    remediation.finalRetakeAttemptId = new mongoose.Types.ObjectId(attemptId);
    remediation.finalRetakenAt = new Date();
    remediation.finalPassed = passed;

    if (passed) {
      remediation.status = 'completed';
      remediation.completedAt = new Date();
    } else {
      remediation.status = 'final_retaken';
      // Learner must retake again until passing
    }

    await remediation.save();

    return remediation;
  }

  /**
   * Get detailed status of a remediation
   *
   * @param remediationId - The remediation ID
   * @param learnerId - The learner ID (for verification)
   * @returns Detailed status with step progress
   */
  static async getRemediationStatus(
    remediationId: string,
    learnerId: string
  ): Promise<RemediationStatusDetails> {
    if (!mongoose.Types.ObjectId.isValid(remediationId)) {
      throw ApiError.notFound('Remediation not found', 'REMEDIATION_NOT_FOUND');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    const remediation = await Remediation.findById(remediationId);

    if (!remediation) {
      throw ApiError.notFound('Remediation not found', 'REMEDIATION_NOT_FOUND');
    }

    // Verify ownership
    if (remediation.learnerId.toString() !== learnerId) {
      throw ApiError.forbidden('This remediation belongs to another learner');
    }

    // Determine next step
    let nextStep: string | null = null;
    if (remediation.status !== 'completed') {
      if (remediation.requireContentReview && !remediation.contentReviewedAt) {
        nextStep = 'content_review';
      } else if (remediation.requireFinalRetake) {
        if (!remediation.finalRetakenAt) {
          nextStep = 'final_retake';
        } else if (remediation.finalPassed === false) {
          nextStep = 'retake_again';
        }
      }
    }

    return {
      remediationId: remediation._id.toString(),
      moduleId: remediation.moduleId.toString(),
      status: remediation.status,
      steps: {
        contentReview: {
          required: remediation.requireContentReview,
          completed: !!remediation.contentReviewedAt,
          completedAt: remediation.contentReviewedAt || null,
          contentItems: remediation.contentItemsViewed?.map(id => ({
            itemId: id,
            viewed: true
          }))
        },
        finalRetake: {
          required: remediation.requireFinalRetake,
          completed: !!remediation.finalRetakenAt && remediation.finalPassed === true,
          completedAt: remediation.finalRetakenAt || null,
          passed: remediation.finalPassed ?? null,
          attemptId: remediation.finalRetakeAttemptId?.toString() || null
        }
      },
      nextStep,
      completedAt: remediation.completedAt || null
    };
  }

  /**
   * Complete a remediation (internal use when all steps are done)
   *
   * @param remediationId - The remediation ID
   * @returns Updated remediation
   */
  static async completeRemediation(remediationId: string): Promise<IRemediation> {
    if (!mongoose.Types.ObjectId.isValid(remediationId)) {
      throw ApiError.notFound('Remediation not found', 'REMEDIATION_NOT_FOUND');
    }

    const remediation = await Remediation.findById(remediationId);

    if (!remediation) {
      throw ApiError.notFound('Remediation not found', 'REMEDIATION_NOT_FOUND');
    }

    // Verify all requirements are met
    if (remediation.requireContentReview && !remediation.contentReviewedAt) {
      throw ApiError.badRequest('Content review not completed');
    }

    if (remediation.requireFinalRetake && (!remediation.finalRetakenAt || !remediation.finalPassed)) {
      throw ApiError.badRequest('Final retake not completed or not passed');
    }

    // Mark as completed
    remediation.status = 'completed';
    remediation.completedAt = new Date();
    await remediation.save();

    return remediation;
  }

  /**
   * Check if learner has active remediations that block progression
   *
   * @param courseId - The course ID
   * @param learnerId - The learner ID
   * @returns Whether progression is blocked
   */
  static async isProgressionBlocked(
    courseId: string,
    learnerId: string
  ): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(learnerId)) {
      return false;
    }

    const activeCount = await Remediation.countDocuments({
      courseId: new mongoose.Types.ObjectId(courseId),
      learnerId: new mongoose.Types.ObjectId(learnerId),
      status: { $ne: 'completed' }
    });

    return activeCount > 0;
  }

  /**
   * Get a remediation by ID
   *
   * @param remediationId - The remediation ID
   * @returns The remediation document
   */
  static async getRemediation(remediationId: string): Promise<IRemediation | null> {
    if (!mongoose.Types.ObjectId.isValid(remediationId)) {
      return null;
    }

    return Remediation.findById(remediationId);
  }
}

export default RemediationService;
