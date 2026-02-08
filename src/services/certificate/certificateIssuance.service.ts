import CertificateIssuance, { ICertificateIssuance, ICompletedRequirement } from '@/models/certificate/CertificateIssuance.model';
import CertificateDefinition from '@/models/certificate/CertificateDefinition.model';
import CertificateRequirement from '@/models/certificate/CertificateRequirement.model';
// Note: CredentialGroup is loaded via population, not imported directly
import { Learner } from '@/models/auth/Learner.model';
import { ApiError } from '@/utils/ApiError';
import { eventBus, EVENTS } from '@/events/eventBus';
import mongoose from 'mongoose';

/**
 * Verification code alphabet - excludes confusable characters (I, O, 0, 1)
 */
const VERIFICATION_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const VERIFICATION_CODE_LENGTH = 12;

interface ListIssuancesFilters {
  page?: number;
  limit?: number;
  learnerId?: string;
  credentialGroupId?: string;
  certificateDefinitionId?: string;
  includeRevoked?: boolean;
  includeExpired?: boolean;
  sort?: string;
}

interface ManualIssuanceData {
  certificateDefinitionId: string;
  learnerId: string;
  completedRequirements: {
    courseVersionId: string;
    courseTitle: string;
    completedAt: Date;
    finalScore: number | null;
    enrollmentId: string;
  }[];
  expiresAt?: Date | null;
  metadata?: Record<string, any>;
}

interface RevokeIssuanceData {
  reason: string;
}

export class CertificateIssuanceService {
  /**
   * Generate a unique verification code
   * Uses the safe alphabet without confusable characters
   */
  static async generateVerificationCode(): Promise<string> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let code = '';
      for (let i = 0; i < VERIFICATION_CODE_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * VERIFICATION_ALPHABET.length);
        code += VERIFICATION_ALPHABET[randomIndex];
      }

      // Check uniqueness
      const existing = await CertificateIssuance.findOne({ verificationCode: code });
      if (!existing) {
        return code;
      }
    }

    throw ApiError.internal('Failed to generate unique verification code');
  }

  /**
   * List certificate issuances with filtering and pagination
   */
  static async listIssuances(
    filters: ListIssuancesFilters,
    _userId: string
  ): Promise<{
    issuances: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filters.learnerId) {
      if (!mongoose.Types.ObjectId.isValid(filters.learnerId)) {
        throw ApiError.badRequest('Invalid learner ID');
      }
      query.learnerId = new mongoose.Types.ObjectId(filters.learnerId);
    }

    if (filters.credentialGroupId) {
      if (!mongoose.Types.ObjectId.isValid(filters.credentialGroupId)) {
        throw ApiError.badRequest('Invalid credential group ID');
      }
      query.credentialGroupId = new mongoose.Types.ObjectId(filters.credentialGroupId);
    }

    if (filters.certificateDefinitionId) {
      if (!mongoose.Types.ObjectId.isValid(filters.certificateDefinitionId)) {
        throw ApiError.badRequest('Invalid certificate definition ID');
      }
      query.certificateDefinitionId = new mongoose.Types.ObjectId(filters.certificateDefinitionId);
    }

    // Exclude revoked by default
    if (!filters.includeRevoked) {
      query.revokedAt = null;
    }

    // Exclude expired by default
    if (!filters.includeExpired) {
      query.$or = [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ];
    }

    // Parse sort
    const sortField = filters.sort || '-issuedAt';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sort: any = { [sortKey]: sortOrder };

    // Execute query
    const [issuances, total] = await Promise.all([
      CertificateIssuance.find(query)
        .populate('certificateDefinitionId', 'title version')
        .populate('credentialGroupId', 'name code type')
        .populate('learnerId', 'firstName lastName email')
        .populate('issuedBy', 'email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CertificateIssuance.countDocuments(query)
    ]);

    const enrichedIssuances = issuances.map((issuance) => {
      const definition = issuance.certificateDefinitionId as any;
      const credentialGroup = issuance.credentialGroupId as any;
      const learner = issuance.learnerId as any;
      const issuedByUser = issuance.issuedBy as any;

      return {
        id: issuance._id.toString(),
        certificateDefinition: definition ? {
          id: definition._id.toString(),
          title: definition.title,
          version: definition.version
        } : null,
        credentialGroup: credentialGroup ? {
          id: credentialGroup._id.toString(),
          name: credentialGroup.name,
          code: credentialGroup.code,
          type: credentialGroup.type
        } : null,
        learner: learner ? {
          id: learner._id.toString(),
          firstName: learner.firstName,
          lastName: learner.lastName,
          email: learner.email
        } : null,
        completedRequirements: issuance.completedRequirements,
        issuedAt: issuance.issuedAt,
        issuedBy: issuedByUser ? {
          id: issuedByUser._id.toString(),
          email: issuedByUser.email
        } : null,
        verificationCode: issuance.verificationCode,
        pdfUrl: issuance.pdfUrl,
        expiresAt: issuance.expiresAt,
        revokedAt: issuance.revokedAt,
        revokedReason: issuance.revokedReason,
        isUpgraded: !!issuance.upgradedToIssuanceId,
        createdAt: issuance.createdAt,
        updatedAt: issuance.updatedAt
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      issuances: enrichedIssuances,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Issue a certificate manually
   */
  static async issueManually(
    data: ManualIssuanceData,
    userId: string
  ): Promise<any> {
    // Validate certificate definition
    if (!mongoose.Types.ObjectId.isValid(data.certificateDefinitionId)) {
      throw ApiError.badRequest('Invalid certificate definition ID');
    }

    const definition = await CertificateDefinition.findById(data.certificateDefinitionId)
      .populate('credentialGroupId');
    if (!definition) {
      throw ApiError.notFound('Certificate definition not found');
    }

    if (definition.status !== 'active') {
      throw ApiError.badRequest('Cannot issue certificates for non-active definitions');
    }

    // Validate learner
    if (!mongoose.Types.ObjectId.isValid(data.learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    const learner = await Learner.findById(data.learnerId);
    if (!learner) {
      throw ApiError.notFound('Learner not found');
    }

    if (!learner.isActive) {
      throw ApiError.badRequest('Cannot issue certificate to inactive learner');
    }

    // Check for existing active issuance for same credential group
    const existingIssuance = await CertificateIssuance.findOne({
      learnerId: data.learnerId,
      credentialGroupId: definition.credentialGroupId,
      revokedAt: null,
      upgradedToIssuanceId: null,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    if (existingIssuance) {
      throw ApiError.conflict(
        'Learner already has an active certificate for this credential. ' +
        'Revoke or upgrade the existing certificate first.'
      );
    }

    // Validate completed requirements
    if (!data.completedRequirements || data.completedRequirements.length === 0) {
      throw ApiError.badRequest('At least one completed requirement is required');
    }

    const completedRequirements: ICompletedRequirement[] = data.completedRequirements.map(req => ({
      courseVersionId: new mongoose.Types.ObjectId(req.courseVersionId),
      courseTitle: req.courseTitle,
      completedAt: new Date(req.completedAt),
      finalScore: req.finalScore,
      enrollmentId: new mongoose.Types.ObjectId(req.enrollmentId)
    }));

    // Generate verification code
    const verificationCode = await this.generateVerificationCode();

    // Calculate expiration if definition specifies it
    let expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (!expiresAt && definition.expiresAfterMonths) {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + definition.expiresAfterMonths);
      expiresAt = expirationDate;
    }

    // Create issuance
    const issuance = new CertificateIssuance({
      certificateDefinitionId: definition._id,
      credentialGroupId: definition.credentialGroupId,
      learnerId: data.learnerId,
      completedRequirements,
      issuedAt: new Date(),
      issuedBy: userId,
      verificationCode,
      expiresAt,
      metadata: data.metadata || {}
    });

    await issuance.save();

    // Emit event
    eventBus.emit(EVENTS.CERTIFICATE_ISSUED, {
      issuanceId: issuance._id.toString(),
      certificateDefinitionId: definition._id.toString(),
      credentialGroupId: definition.credentialGroupId.toString(),
      learnerId: data.learnerId,
      verificationCode,
      issuedBy: userId,
      isAutoIssued: false
    });

    return {
      id: issuance._id.toString(),
      certificateDefinitionId: issuance.certificateDefinitionId.toString(),
      credentialGroupId: issuance.credentialGroupId.toString(),
      learnerId: issuance.learnerId.toString(),
      completedRequirements: issuance.completedRequirements,
      issuedAt: issuance.issuedAt,
      issuedBy: issuance.issuedBy?.toString(),
      verificationCode: issuance.verificationCode,
      expiresAt: issuance.expiresAt,
      createdAt: issuance.createdAt
    };
  }

  /**
   * Get issuance by ID
   */
  static async getIssuanceById(
    issuanceId: string,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(issuanceId)) {
      throw ApiError.badRequest('Invalid issuance ID');
    }

    const issuance = await CertificateIssuance.findById(issuanceId)
      .populate('certificateDefinitionId', 'title version description status')
      .populate('credentialGroupId', 'name code type description badgeImageUrl badgeColor')
      .populate('learnerId', 'firstName lastName email')
      .populate('issuedBy', 'email')
      .populate('revokedBy', 'email')
      .populate('upgradedToIssuanceId', 'verificationCode issuedAt')
      .populate('upgradedFromIssuanceId', 'verificationCode issuedAt')
      .lean();

    if (!issuance) {
      throw ApiError.notFound('Certificate issuance not found');
    }

    const definition = issuance.certificateDefinitionId as any;
    const credentialGroup = issuance.credentialGroupId as any;
    const learner = issuance.learnerId as any;
    const issuedByUser = issuance.issuedBy as any;
    const revokedByUser = issuance.revokedBy as any;
    const upgradedTo = issuance.upgradedToIssuanceId as any;
    const upgradedFrom = issuance.upgradedFromIssuanceId as any;

    return {
      id: issuance._id.toString(),
      certificateDefinition: definition ? {
        id: definition._id.toString(),
        title: definition.title,
        version: definition.version,
        description: definition.description,
        status: definition.status
      } : null,
      credentialGroup: credentialGroup ? {
        id: credentialGroup._id.toString(),
        name: credentialGroup.name,
        code: credentialGroup.code,
        type: credentialGroup.type,
        description: credentialGroup.description,
        badgeImageUrl: credentialGroup.badgeImageUrl,
        badgeColor: credentialGroup.badgeColor
      } : null,
      learner: learner ? {
        id: learner._id.toString(),
        firstName: learner.firstName,
        lastName: learner.lastName,
        email: learner.email
      } : null,
      completedRequirements: issuance.completedRequirements,
      issuedAt: issuance.issuedAt,
      issuedBy: issuedByUser ? {
        id: issuedByUser._id.toString(),
        email: issuedByUser.email
      } : null,
      verificationCode: issuance.verificationCode,
      pdfUrl: issuance.pdfUrl,
      expiresAt: issuance.expiresAt,
      revokedAt: issuance.revokedAt,
      revokedBy: revokedByUser ? {
        id: revokedByUser._id.toString(),
        email: revokedByUser.email
      } : null,
      revokedReason: issuance.revokedReason,
      upgradedTo: upgradedTo ? {
        id: upgradedTo._id.toString(),
        verificationCode: upgradedTo.verificationCode,
        issuedAt: upgradedTo.issuedAt
      } : null,
      upgradedFrom: upgradedFrom ? {
        id: upgradedFrom._id.toString(),
        verificationCode: upgradedFrom.verificationCode,
        issuedAt: upgradedFrom.issuedAt
      } : null,
      metadata: issuance.metadata,
      createdAt: issuance.createdAt,
      updatedAt: issuance.updatedAt
    };
  }

  /**
   * Revoke a certificate issuance
   */
  static async revokeIssuance(
    issuanceId: string,
    data: RevokeIssuanceData,
    userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(issuanceId)) {
      throw ApiError.badRequest('Invalid issuance ID');
    }

    const issuance = await CertificateIssuance.findById(issuanceId);
    if (!issuance) {
      throw ApiError.notFound('Certificate issuance not found');
    }

    if (issuance.revokedAt) {
      throw ApiError.badRequest('Certificate has already been revoked');
    }

    issuance.revokedAt = new Date();
    issuance.revokedBy = new mongoose.Types.ObjectId(userId);
    issuance.revokedReason = data.reason;

    await issuance.save();

    // Emit event
    eventBus.emit(EVENTS.CERTIFICATE_REVOKED, {
      issuanceId: issuance._id.toString(),
      certificateDefinitionId: issuance.certificateDefinitionId.toString(),
      credentialGroupId: issuance.credentialGroupId.toString(),
      learnerId: issuance.learnerId.toString(),
      verificationCode: issuance.verificationCode,
      revokedBy: userId,
      reason: data.reason
    });

    return {
      id: issuance._id.toString(),
      verificationCode: issuance.verificationCode,
      revokedAt: issuance.revokedAt,
      revokedReason: issuance.revokedReason
    };
  }

  /**
   * Get all certificates for a learner
   */
  static async getLearnerCertificates(
    learnerId: string,
    options: {
      includeRevoked?: boolean;
      includeExpired?: boolean;
    },
    _userId: string
  ): Promise<any[]> {
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    const query: any = {
      learnerId: new mongoose.Types.ObjectId(learnerId)
    };

    if (!options.includeRevoked) {
      query.revokedAt = null;
    }

    if (!options.includeExpired) {
      query.$or = [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ];
    }

    const issuances = await CertificateIssuance.find(query)
      .populate('certificateDefinitionId', 'title version')
      .populate('credentialGroupId', 'name code type badgeImageUrl badgeColor')
      .sort({ issuedAt: -1 })
      .lean();

    return issuances.map((issuance) => {
      const definition = issuance.certificateDefinitionId as any;
      const credentialGroup = issuance.credentialGroupId as any;

      return {
        id: issuance._id.toString(),
        certificateDefinition: definition ? {
          id: definition._id.toString(),
          title: definition.title,
          version: definition.version
        } : null,
        credentialGroup: credentialGroup ? {
          id: credentialGroup._id.toString(),
          name: credentialGroup.name,
          code: credentialGroup.code,
          type: credentialGroup.type,
          badgeImageUrl: credentialGroup.badgeImageUrl,
          badgeColor: credentialGroup.badgeColor
        } : null,
        issuedAt: issuance.issuedAt,
        verificationCode: issuance.verificationCode,
        expiresAt: issuance.expiresAt,
        revokedAt: issuance.revokedAt,
        isUpgraded: !!issuance.upgradedToIssuanceId,
        isExpired: issuance.expiresAt ? new Date() > issuance.expiresAt : false,
        isRevoked: !!issuance.revokedAt
      };
    });
  }

  /**
   * Auto-issue certificate when all requirements are met
   * This is called by event listeners when course completion is detected
   */
  static async checkAndAutoIssue(
    learnerId: string,
    certificateDefinitionId: string
  ): Promise<ICertificateIssuance | null> {
    const definition = await CertificateDefinition.findById(certificateDefinitionId)
      .populate('credentialGroupId');

    if (!definition || definition.status !== 'active' || !definition.autoIssue) {
      return null;
    }

    // Check for existing active issuance
    const existingIssuance = await CertificateIssuance.findOne({
      learnerId,
      credentialGroupId: definition.credentialGroupId,
      revokedAt: null,
      upgradedToIssuanceId: null,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    if (existingIssuance) {
      return null; // Already has an active certificate
    }

    // Get all requirements for this definition
    const requirements = await CertificateRequirement.find({
      certificateDefinitionId
    }).lean();

    if (requirements.length === 0) {
      return null;
    }

    // TODO: Check learner's enrollments to see if all requirements are met
    // This would require integrating with the enrollment/progress system
    // For now, this is a placeholder that will be filled in when we have
    // access to the enrollment completion data

    // The actual implementation would:
    // 1. Get all required course versions from requirements
    // 2. Check learner's enrollments for each required course version
    // 3. Verify each enrollment is completed with the required minimum score
    // 4. For elective groups, check that the minimum count is met
    // 5. If all requirements are met, issue the certificate

    return null; // Placeholder until enrollment integration is complete
  }
}

/**
 * Event payload for course completion
 */
interface CourseCompletedPayload {
  learnerId: string;
  courseVersionId: string;
  enrollmentId: string;
  completedAt: Date;
  finalScore: number | null;
}

/**
 * Handle course completion event
 * Checks if any auto-issue definitions are now satisfied
 */
async function handleCourseCompleted(payload: CourseCompletedPayload): Promise<void> {
  try {
    const { learnerId, courseVersionId } = payload;

    // Find all active certificate definitions that require this course version
    const requirements = await CertificateRequirement.find({
      courseVersionId
    }).lean();

    if (requirements.length === 0) {
      return;
    }

    // Get unique definition IDs
    const definitionIds = [...new Set(requirements.map(r => r.certificateDefinitionId.toString()))];

    // Check each definition for auto-issuance eligibility
    for (const definitionId of definitionIds) {
      try {
        await CertificateIssuanceService.checkAndAutoIssue(learnerId, definitionId);
      } catch (error) {
        console.error(`Error checking auto-issuance for definition ${definitionId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error handling course completed event:', error);
  }
}

// Subscribe to course completion events for auto-issuance
eventBus.on(EVENTS.COURSE_COMPLETED, handleCourseCompleted);
