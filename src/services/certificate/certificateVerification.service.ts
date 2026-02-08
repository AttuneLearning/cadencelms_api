import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Verification status for a certificate
 */
export type VerificationStatus = 'valid' | 'expired' | 'revoked' | 'upgraded' | 'not_found';

/**
 * Public certificate verification result
 * Contains only information safe to share publicly
 */
export interface PublicVerificationResult {
  status: VerificationStatus;
  verificationCode: string;

  // Certificate info (if found)
  credential?: {
    name: string;
    code: string;
    type: string;
    badgeColor: string | null;
  };

  // Recipient info (limited for privacy)
  recipient?: {
    name: string;  // Full name
  };

  // Dates
  issuedAt?: Date;
  expiresAt?: Date | null;

  // Status details
  revokedAt?: Date | null;
  revokedReason?: string | null;

  // Upgrade info
  upgradedTo?: {
    verificationCode: string;
    issuedAt: Date;
  } | null;

  // Completed requirements (course titles only, no internal IDs)
  completedCourses?: string[];
}

export class CertificateVerificationService {
  /**
   * Verify a certificate by its verification code
   *
   * This is a PUBLIC endpoint - no authentication required.
   * Returns limited information suitable for public display.
   *
   * @param code - The 12-character verification code
   * @returns Public verification result with limited info
   */
  static async verifyByCode(code: string): Promise<PublicVerificationResult> {
    // Normalize code: uppercase and trim
    const normalizedCode = code.toUpperCase().trim();

    // Validate code format
    if (normalizedCode.length !== 12) {
      return {
        status: 'not_found',
        verificationCode: normalizedCode
      };
    }

    // Valid characters: ABCDEFGHJKLMNPQRSTUVWXYZ23456789
    const validPattern = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/;
    if (!validPattern.test(normalizedCode)) {
      return {
        status: 'not_found',
        verificationCode: normalizedCode
      };
    }

    // Find the certificate
    const issuance = await CertificateIssuance.findOne({
      verificationCode: normalizedCode
    })
      .populate('credentialGroupId', 'name code type badgeColor')
      .populate('learnerId', 'firstName lastName')
      .populate('upgradedToIssuanceId', 'verificationCode issuedAt')
      .lean();

    if (!issuance) {
      return {
        status: 'not_found',
        verificationCode: normalizedCode
      };
    }

    const credentialGroup = issuance.credentialGroupId as any;
    const learner = issuance.learnerId as any;
    const upgradedTo = issuance.upgradedToIssuanceId as any;

    // Determine status
    let status: VerificationStatus = 'valid';

    if (issuance.revokedAt) {
      status = 'revoked';
    } else if (issuance.upgradedToIssuanceId) {
      status = 'upgraded';
    } else if (issuance.expiresAt && new Date() > issuance.expiresAt) {
      status = 'expired';
    }

    // Build the public response
    const result: PublicVerificationResult = {
      status,
      verificationCode: normalizedCode,
      credential: credentialGroup ? {
        name: credentialGroup.name,
        code: credentialGroup.code,
        type: credentialGroup.type,
        badgeColor: credentialGroup.badgeColor
      } : undefined,
      recipient: learner ? {
        name: `${learner.firstName} ${learner.lastName}`
      } : undefined,
      issuedAt: issuance.issuedAt,
      expiresAt: issuance.expiresAt,
      completedCourses: issuance.completedRequirements.map(req => req.courseTitle)
    };

    // Add status-specific details
    if (status === 'revoked') {
      result.revokedAt = issuance.revokedAt;
      result.revokedReason = issuance.revokedReason;
    }

    if (status === 'upgraded' && upgradedTo) {
      result.upgradedTo = {
        verificationCode: upgradedTo.verificationCode,
        issuedAt: upgradedTo.issuedAt
      };
    }

    return result;
  }

  /**
   * Get full verification details (for authenticated users)
   * Returns more detailed information than public verification
   */
  static async getFullVerificationDetails(
    code: string,
    _userId: string
  ): Promise<any> {
    const normalizedCode = code.toUpperCase().trim();

    const issuance = await CertificateIssuance.findOne({
      verificationCode: normalizedCode
    })
      .populate('certificateDefinitionId', 'title version description')
      .populate('credentialGroupId', 'name code type description badgeImageUrl badgeColor')
      .populate('learnerId', 'firstName lastName email')
      .populate('issuedBy', 'email')
      .populate('revokedBy', 'email')
      .populate('upgradedToIssuanceId', 'verificationCode issuedAt')
      .populate('upgradedFromIssuanceId', 'verificationCode issuedAt')
      .lean();

    if (!issuance) {
      throw ApiError.notFound('Certificate not found');
    }

    const definition = issuance.certificateDefinitionId as any;
    const credentialGroup = issuance.credentialGroupId as any;
    const learner = issuance.learnerId as any;
    const issuedByUser = issuance.issuedBy as any;
    const revokedByUser = issuance.revokedBy as any;
    const upgradedTo = issuance.upgradedToIssuanceId as any;
    const upgradedFrom = issuance.upgradedFromIssuanceId as any;

    // Determine status
    let status: VerificationStatus = 'valid';
    if (issuance.revokedAt) {
      status = 'revoked';
    } else if (issuance.upgradedToIssuanceId) {
      status = 'upgraded';
    } else if (issuance.expiresAt && new Date() > issuance.expiresAt) {
      status = 'expired';
    }

    return {
      status,
      issuance: {
        id: issuance._id.toString(),
        verificationCode: issuance.verificationCode,
        certificateDefinition: definition ? {
          id: definition._id.toString(),
          title: definition.title,
          version: definition.version,
          description: definition.description
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
      }
    };
  }
}
