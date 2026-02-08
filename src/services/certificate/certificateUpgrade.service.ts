import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import CertificateDefinition from '@/models/certificate/CertificateDefinition.model';
import CertificateRequirement from '@/models/certificate/CertificateRequirement.model';
import { CertificateIssuanceService } from './certificateIssuance.service';
import { ApiError } from '@/utils/ApiError';
import { eventBus, EVENTS } from '@/events/eventBus';
import mongoose from 'mongoose';

/**
 * Upgrade eligibility status
 */
export interface UpgradeEligibility {
  isEligible: boolean;
  currentIssuance: {
    id: string;
    verificationCode: string;
    certificateDefinitionId: string;
    definitionVersion: number;
    issuedAt: Date;
  } | null;
  targetDefinition: {
    id: string;
    version: number;
    title: string;
    isCompatible: boolean;
    compatibilityBreakReason: string | null;
  } | null;
  reason: 'eligible' | 'no_active_certificate' | 'already_latest' | 'incompatible_version' | 'no_newer_version';
  additionalRequirements?: {
    courseVersionId: string;
    courseTitle: string;
    isRequired: boolean;
  }[];
}

export class CertificateUpgradeService {
  /**
   * Check upgrade eligibility for a learner's credential
   *
   * @param learnerId - The learner's ID
   * @param credentialGroupId - The credential group to check
   * @returns Upgrade eligibility status with details
   */
  static async checkUpgradeEligibility(
    learnerId: string,
    credentialGroupId: string
  ): Promise<UpgradeEligibility> {
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    if (!mongoose.Types.ObjectId.isValid(credentialGroupId)) {
      throw ApiError.badRequest('Invalid credential group ID');
    }

    // Find the learner's current active issuance for this credential group
    const currentIssuance = await CertificateIssuance.findOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      credentialGroupId: new mongoose.Types.ObjectId(credentialGroupId),
      revokedAt: null,
      upgradedToIssuanceId: null,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
      .populate('certificateDefinitionId', 'version title')
      .lean();

    if (!currentIssuance) {
      return {
        isEligible: false,
        currentIssuance: null,
        targetDefinition: null,
        reason: 'no_active_certificate'
      };
    }

    const currentDefinition = currentIssuance.certificateDefinitionId as any;

    // Find the latest active definition for this credential group
    const latestDefinition = await CertificateDefinition.findOne({
      credentialGroupId: new mongoose.Types.ObjectId(credentialGroupId),
      status: 'active'
    })
      .sort({ version: -1 })
      .lean();

    if (!latestDefinition) {
      return {
        isEligible: false,
        currentIssuance: {
          id: currentIssuance._id.toString(),
          verificationCode: currentIssuance.verificationCode,
          certificateDefinitionId: currentDefinition._id.toString(),
          definitionVersion: currentDefinition.version,
          issuedAt: currentIssuance.issuedAt
        },
        targetDefinition: null,
        reason: 'no_newer_version'
      };
    }

    // Check if already on the latest version
    if (currentDefinition._id.toString() === latestDefinition._id.toString()) {
      return {
        isEligible: false,
        currentIssuance: {
          id: currentIssuance._id.toString(),
          verificationCode: currentIssuance.verificationCode,
          certificateDefinitionId: currentDefinition._id.toString(),
          definitionVersion: currentDefinition.version,
          issuedAt: currentIssuance.issuedAt
        },
        targetDefinition: {
          id: latestDefinition._id.toString(),
          version: latestDefinition.version,
          title: latestDefinition.title,
          isCompatible: true,
          compatibilityBreakReason: null
        },
        reason: 'already_latest'
      };
    }

    // Check if the upgrade path is compatible
    if (!latestDefinition.isCompatible) {
      return {
        isEligible: false,
        currentIssuance: {
          id: currentIssuance._id.toString(),
          verificationCode: currentIssuance.verificationCode,
          certificateDefinitionId: currentDefinition._id.toString(),
          definitionVersion: currentDefinition.version,
          issuedAt: currentIssuance.issuedAt
        },
        targetDefinition: {
          id: latestDefinition._id.toString(),
          version: latestDefinition.version,
          title: latestDefinition.title,
          isCompatible: false,
          compatibilityBreakReason: latestDefinition.compatibilityBreakReason
        },
        reason: 'incompatible_version'
      };
    }

    // Get requirements for the new definition
    const newRequirements = await CertificateRequirement.find({
      certificateDefinitionId: latestDefinition._id
    })
      .populate('courseVersionId', 'title')
      .lean();

    // Check which requirements the learner has already completed
    const completedCourseVersionIds = new Set(
      currentIssuance.completedRequirements.map(r => r.courseVersionId.toString())
    );

    const additionalRequirements = newRequirements
      .filter(req => !completedCourseVersionIds.has(req.courseVersionId.toString()))
      .map(req => {
        const courseVersion = req.courseVersionId as any;
        return {
          courseVersionId: req.courseVersionId.toString(),
          courseTitle: courseVersion?.title || 'Unknown Course',
          isRequired: req.isRequired
        };
      });

    // For now, we'll consider them eligible even if there are additional requirements
    // The actual completion check would integrate with the enrollment system
    return {
      isEligible: true,
      currentIssuance: {
        id: currentIssuance._id.toString(),
        verificationCode: currentIssuance.verificationCode,
        certificateDefinitionId: currentDefinition._id.toString(),
        definitionVersion: currentDefinition.version,
        issuedAt: currentIssuance.issuedAt
      },
      targetDefinition: {
        id: latestDefinition._id.toString(),
        version: latestDefinition.version,
        title: latestDefinition.title,
        isCompatible: true,
        compatibilityBreakReason: null
      },
      reason: 'eligible',
      additionalRequirements: additionalRequirements.length > 0 ? additionalRequirements : undefined
    };
  }

  /**
   * Get all upgrade eligibilities for a learner
   *
   * @param learnerId - The learner's ID
   * @returns Array of upgrade eligibilities for all credential groups
   */
  static async getLearnerUpgradeEligibilities(
    learnerId: string
  ): Promise<UpgradeEligibility[]> {
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    // Find all active issuances for this learner
    const activeIssuances = await CertificateIssuance.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      revokedAt: null,
      upgradedToIssuanceId: null,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
      .distinct('credentialGroupId');

    // Check eligibility for each credential group
    const eligibilities = await Promise.all(
      activeIssuances.map((credentialGroupId) =>
        this.checkUpgradeEligibility(learnerId, credentialGroupId.toString())
      )
    );

    return eligibilities;
  }

  /**
   * Perform a certificate upgrade
   *
   * @param issuanceId - The current issuance ID to upgrade from
   * @param userId - The user performing the upgrade
   * @returns The new upgraded issuance
   */
  static async performUpgrade(
    issuanceId: string,
    userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(issuanceId)) {
      throw ApiError.badRequest('Invalid issuance ID');
    }

    // Get the current issuance
    const currentIssuance = await CertificateIssuance.findById(issuanceId)
      .populate('certificateDefinitionId', 'credentialGroupId version');

    if (!currentIssuance) {
      throw ApiError.notFound('Certificate issuance not found');
    }

    if (currentIssuance.revokedAt) {
      throw ApiError.badRequest('Cannot upgrade a revoked certificate');
    }

    if (currentIssuance.upgradedToIssuanceId) {
      throw ApiError.badRequest('Certificate has already been upgraded');
    }

    if (currentIssuance.expiresAt && new Date() > currentIssuance.expiresAt) {
      throw ApiError.badRequest('Cannot upgrade an expired certificate');
    }

    const currentDefinition = currentIssuance.certificateDefinitionId as any;

    // Check eligibility
    const eligibility = await this.checkUpgradeEligibility(
      currentIssuance.learnerId.toString(),
      currentDefinition.credentialGroupId.toString()
    );

    if (!eligibility.isEligible) {
      throw ApiError.badRequest(`Upgrade not eligible: ${eligibility.reason}`);
    }

    if (!eligibility.targetDefinition) {
      throw ApiError.badRequest('No target definition available for upgrade');
    }

    // Get the target definition
    const targetDefinition = await CertificateDefinition.findById(
      eligibility.targetDefinition.id
    );

    if (!targetDefinition) {
      throw ApiError.notFound('Target definition not found');
    }

    // Generate new verification code
    const verificationCode = await CertificateIssuanceService.generateVerificationCode();

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (targetDefinition.expiresAfterMonths) {
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + targetDefinition.expiresAfterMonths);
    }

    // Create the new upgraded issuance
    const newIssuance = new CertificateIssuance({
      certificateDefinitionId: targetDefinition._id,
      credentialGroupId: currentIssuance.credentialGroupId,
      learnerId: currentIssuance.learnerId,
      completedRequirements: currentIssuance.completedRequirements,
      issuedAt: new Date(),
      issuedBy: userId,
      verificationCode,
      expiresAt,
      upgradedFromIssuanceId: currentIssuance._id,
      metadata: {
        ...currentIssuance.metadata,
        upgradedFrom: {
          issuanceId: currentIssuance._id.toString(),
          verificationCode: currentIssuance.verificationCode,
          definitionVersion: currentDefinition.version,
          upgradedAt: new Date()
        }
      }
    });

    // Update the old issuance to point to the new one
    currentIssuance.upgradedToIssuanceId = newIssuance._id as mongoose.Types.ObjectId;

    // Save both in a transaction-like manner
    await newIssuance.save();
    await currentIssuance.save();

    // Emit event
    eventBus.emit(EVENTS.CERTIFICATE_UPGRADED, {
      previousIssuanceId: currentIssuance._id.toString(),
      newIssuanceId: newIssuance._id.toString(),
      previousDefinitionId: currentDefinition._id.toString(),
      newDefinitionId: targetDefinition._id.toString(),
      credentialGroupId: currentIssuance.credentialGroupId.toString(),
      learnerId: currentIssuance.learnerId.toString(),
      previousVerificationCode: currentIssuance.verificationCode,
      newVerificationCode: verificationCode,
      upgradedBy: userId
    });

    return {
      previousIssuance: {
        id: currentIssuance._id.toString(),
        verificationCode: currentIssuance.verificationCode,
        definitionVersion: currentDefinition.version
      },
      newIssuance: {
        id: newIssuance._id.toString(),
        certificateDefinitionId: newIssuance.certificateDefinitionId.toString(),
        credentialGroupId: newIssuance.credentialGroupId.toString(),
        learnerId: newIssuance.learnerId.toString(),
        verificationCode: newIssuance.verificationCode,
        issuedAt: newIssuance.issuedAt,
        expiresAt: newIssuance.expiresAt
      }
    };
  }
}
