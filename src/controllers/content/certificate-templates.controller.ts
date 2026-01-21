import { Request, Response } from 'express';
import { CertificateTemplatesService } from '@/services/content/certificate-templates.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Certificate Templates Controller
 * Handles /api/v2/certificate-templates endpoints
 */

/**
 * GET /api/v2/certificate-templates
 * List certificate templates suitable for program certificates
 */
export const listCertificateTemplates = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    scope: req.query.scope as 'system' | 'organization' | 'department' | undefined,
    departmentId: req.query.departmentId as string | undefined
  };

  // Validate scope parameter
  if (filters.scope && !['system', 'organization', 'department'].includes(filters.scope)) {
    throw ApiError.badRequest('Invalid scope. Must be one of: system, organization, department');
  }

  // Validate departmentId if provided
  if (filters.departmentId && typeof filters.departmentId !== 'string') {
    throw ApiError.badRequest('Invalid departmentId parameter');
  }

  const result = await CertificateTemplatesService.listCertificateTemplates(filters);
  res.status(200).json(ApiResponse.success(result));
});
