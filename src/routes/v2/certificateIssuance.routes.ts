import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { assertLearnerOwnership } from '@/middlewares/assertLearnerOwnership';
import {
  validateManualIssuance,
  validateRevokeIssuance,
  validateVerificationCode
} from '@/validators/certificateIssuance.validator';
import * as certificateIssuanceController from '@/controllers/certificate/certificateIssuance.controller';

/**
 * Certificate Issuance Routes
 *
 * Three routers for certificate issuance system:
 * 1. /api/v2/certificate-issuances - Main issuance management
 * 2. /api/v2/certificates/verify - PUBLIC verification endpoint
 * 3. /api/v2/learners/:id/certificates - Learner-specific certificates
 *
 * Access Rights:
 * - certificates:read - View certificate issuances
 * - certificates:manage - Issue, revoke, upgrade certificates
 * - learner:pii:read - View learner certificates (for learner endpoints)
 */

// Router for /api/v2/certificate-issuances
export const certificateIssuanceRouter = Router();

// Router for /api/v2/certificates (public verification)
export const certificateVerificationRouter = Router();

// Router for /api/v2/learners/:id/certificates and upgrade-eligibility
export const learnerCertificateRouter = Router({ mergeParams: true });

/**
 * =====================================================
 * ROUTES: /api/v2/certificate-issuances
 * =====================================================
 */

// Apply authentication middleware
certificateIssuanceRouter.use(isAuthenticated);

/**
 * GET /api/v2/certificate-issuances
 * List all certificate issuances with filtering and pagination.
 *
 * Access Right: certificates:read
 *
 * Query Parameters:
 * - page?: number - Page number (default: 1)
 * - limit?: number - Items per page (default: 20, max: 100)
 * - learnerId?: string - Filter by learner
 * - credentialGroupId?: string - Filter by credential group
 * - certificateDefinitionId?: string - Filter by definition
 * - includeRevoked?: boolean - Include revoked certificates (default: false)
 * - includeExpired?: boolean - Include expired certificates (default: false)
 * - sort?: string - Sort field (prefix with - for desc, default: -issuedAt)
 */
certificateIssuanceRouter.get(
  '/',
  authorize('content:certificates:read'),
  certificateIssuanceController.listIssuances
);

/**
 * POST /api/v2/certificate-issuances
 * Manually issue a certificate to a learner.
 *
 * Access Right: certificates:manage
 *
 * Body:
 * - certificateDefinitionId: string - The definition to issue from
 * - learnerId: string - The learner receiving the certificate
 * - completedRequirements: array - List of completed requirements
 *   - courseVersionId: string
 *   - courseTitle: string
 *   - completedAt: Date
 *   - finalScore: number | null
 *   - enrollmentId: string
 * - expiresAt?: Date - Optional custom expiration date
 * - metadata?: object - Optional metadata
 *
 * Notes:
 * - Definition must be active
 * - Learner must be active
 * - Learner must not have an active certificate for the same credential group
 */
certificateIssuanceRouter.post(
  '/',
  authorize('content:certificates:manage'),
  validateManualIssuance,
  certificateIssuanceController.issueManually
);

/**
 * GET /api/v2/certificate-issuances/:id
 * Get detailed information about a certificate issuance.
 *
 * Access Right: certificates:read
 *
 * Returns: Full issuance details with credential group and learner info
 */
certificateIssuanceRouter.get(
  '/:id',
  authorize('content:certificates:read'),
  certificateIssuanceController.getIssuanceById
);

/**
 * GET /api/v2/certificate-issuances/:id/pdf
 * Get or generate a certificate PDF.
 *
 * Access Right: certificates:read
 *
 * Query Parameters:
 * - download?: boolean - If true (or Accept: application/pdf), returns 302 redirect to PDF URL
 *
 * Returns: { pdfUrl } or 302 redirect
 */
certificateIssuanceRouter.get(
  '/:id/pdf',
  authorize('content:certificates:read'),
  certificateIssuanceController.getCertificatePdf
);

/**
 * POST /api/v2/certificate-issuances/:id/revoke
 * Revoke a certificate issuance.
 *
 * Access Right: certificates:manage
 *
 * Body:
 * - reason: string - Reason for revocation (required)
 *
 * Side Effects:
 * - Emits 'certificate.revoked' event
 */
certificateIssuanceRouter.post(
  '/:id/revoke',
  authorize('content:certificates:manage'),
  validateRevokeIssuance,
  certificateIssuanceController.revokeIssuance
);

/**
 * POST /api/v2/certificate-issuances/:id/upgrade
 * Upgrade a certificate to the latest definition version.
 *
 * Access Right: certificates:manage
 *
 * Business Rules:
 * - Certificate must be active (not revoked, not expired, not already upgraded)
 * - Target definition must be compatible
 *
 * Side Effects:
 * - Creates new issuance with upgraded definition
 * - Links old issuance to new one via upgradedToIssuanceId
 * - Emits 'certificate.upgraded' event
 */
certificateIssuanceRouter.post(
  '/:id/upgrade',
  authorize('content:certificates:manage'),
  certificateIssuanceController.upgradeIssuance
);

/**
 * =====================================================
 * ROUTES: /api/v2/certificates (PUBLIC)
 * =====================================================
 */

/**
 * GET /api/v2/certificates/verify/:code
 * PUBLIC endpoint - Verify a certificate by its verification code.
 *
 * NO AUTHENTICATION REQUIRED
 *
 * Returns limited public information:
 * - status: 'valid' | 'expired' | 'revoked' | 'upgraded' | 'not_found'
 * - credential name and type
 * - recipient name
 * - issuance date
 * - expiration date (if applicable)
 * - completed course titles
 *
 * Privacy: Does not expose internal IDs, emails, or sensitive data
 */
certificateVerificationRouter.get(
  '/verify/:code',
  validateVerificationCode,
  certificateIssuanceController.verifyByCode
);

/**
 * =====================================================
 * ROUTES: /api/v2/learners/:id/certificates
 * =====================================================
 */

// Apply authentication middleware
learnerCertificateRouter.use(isAuthenticated);

/**
 * GET /api/v2/learners/:id/certificates
 * Get all certificates for a specific learner.
 *
 * Access Right: learner:pii:read
 *
 * Query Parameters:
 * - includeRevoked?: boolean - Include revoked certificates (default: false)
 * - includeExpired?: boolean - Include expired certificates (default: false)
 *
 * Returns: Array of certificates with credential info
 */
learnerCertificateRouter.get(
  '/certificates',
  authorize('learner:pii:read'),
  assertLearnerOwnership('id'),
  certificateIssuanceController.getLearnerCertificates
);

/**
 * GET /api/v2/learners/:id/upgrade-eligibility
 * Check upgrade eligibility for all of a learner's certificates.
 *
 * Access Right: certificates:read
 *
 * Returns: Array of upgrade eligibility objects for each credential group
 * - isEligible: boolean
 * - currentIssuance: info about current certificate
 * - targetDefinition: info about available upgrade
 * - reason: why eligible or not
 * - additionalRequirements: any new courses needed (if any)
 */
learnerCertificateRouter.get(
  '/upgrade-eligibility',
  authorize('content:certificates:read'),
  certificateIssuanceController.getLearnerUpgradeEligibility
);

export default {
  certificateIssuanceRouter,
  certificateVerificationRouter,
  learnerCertificateRouter
};
