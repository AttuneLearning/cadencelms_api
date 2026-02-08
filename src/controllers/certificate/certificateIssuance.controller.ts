import { Request, Response } from 'express';
import { CertificateIssuanceService } from '@/services/certificate/certificateIssuance.service';
import { CertificateVerificationService } from '@/services/certificate/certificateVerification.service';
import { CertificateUpgradeService } from '@/services/certificate/certificateUpgrade.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';

/**
 * Certificate Issuance Controller
 * Handles all certificate issuance, verification, and upgrade endpoints
 */

/**
 * GET /api/v2/certificate-issuances
 * List all certificate issuances with filtering and pagination
 */
export const listIssuances = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    learnerId: req.query.learnerId as string,
    credentialGroupId: req.query.credentialGroupId as string,
    certificateDefinitionId: req.query.certificateDefinitionId as string,
    includeRevoked: req.query.includeRevoked === 'true',
    includeExpired: req.query.includeExpired === 'true',
    sort: req.query.sort as string
  };

  const result = await CertificateIssuanceService.listIssuances(filters, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/certificate-issuances
 * Manually issue a certificate to a learner
 */
export const issueManually = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const result = await CertificateIssuanceService.issueManually(req.body, userId);
  res.status(201).json(ApiResponse.success(result, 'Certificate issued successfully'));
});

/**
 * GET /api/v2/certificate-issuances/:id
 * Get detailed information about a specific certificate issuance
 */
export const getIssuanceById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await CertificateIssuanceService.getIssuanceById(id, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/certificate-issuances/:id/revoke
 * Revoke a certificate issuance
 */
export const revokeIssuance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await CertificateIssuanceService.revokeIssuance(id, req.body, userId);
  res.status(200).json(ApiResponse.success(result, 'Certificate revoked successfully'));
});

/**
 * GET /api/v2/certificates/verify/:code
 * PUBLIC endpoint - Verify a certificate by its verification code
 * No authentication required
 */
export const verifyByCode = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;

  const result = await CertificateVerificationService.verifyByCode(code);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/learners/:id/certificates
 * Get all certificates for a specific learner
 */
export const getLearnerCertificates = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const options = {
    includeRevoked: req.query.includeRevoked === 'true',
    includeExpired: req.query.includeExpired === 'true'
  };

  const result = await CertificateIssuanceService.getLearnerCertificates(id, options, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/learners/:id/upgrade-eligibility
 * Check upgrade eligibility for all of a learner's certificates
 */
export const getLearnerUpgradeEligibility = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await CertificateUpgradeService.getLearnerUpgradeEligibilities(id);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/certificate-issuances/:id/upgrade
 * Upgrade a certificate to the latest definition version
 */
export const upgradeIssuance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await CertificateUpgradeService.performUpgrade(id, userId);
  res.status(200).json(ApiResponse.success(result, 'Certificate upgraded successfully'));
});
