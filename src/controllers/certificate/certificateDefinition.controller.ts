import { Request, Response } from 'express';
import { CertificateDefinitionService } from '@/services/certificate/certificateDefinition.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';

/**
 * Certificate Definition Controller
 * Handles all /api/v2/certificate-definitions endpoints
 */

/**
 * GET /api/v2/certificate-definitions
 * List all certificate definitions with filtering and pagination
 */
export const listDefinitions = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    credentialGroupId: req.query.credentialGroupId as string,
    status: req.query.status as 'draft' | 'active' | 'deprecated' | undefined,
    sort: req.query.sort as string
  };

  const result = await CertificateDefinitionService.listDefinitions(filters, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/certificate-definitions
 * Create a new certificate definition
 */
export const createDefinition = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const result = await CertificateDefinitionService.createDefinition(req.body, userId);
  res.status(201).json(ApiResponse.success(result, 'Certificate definition created successfully'));
});

/**
 * GET /api/v2/certificate-definitions/:id
 * Get detailed information about a specific certificate definition
 */
export const getDefinitionById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await CertificateDefinitionService.getDefinitionById(id, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PATCH /api/v2/certificate-definitions/:id
 * Update a certificate definition (only drafts)
 */
export const updateDefinition = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await CertificateDefinitionService.updateDefinition(id, req.body, userId);
  res.status(200).json(ApiResponse.success(result, 'Certificate definition updated successfully'));
});

/**
 * POST /api/v2/certificate-definitions/:id/activate
 * Activate a certificate definition
 */
export const activateDefinition = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await CertificateDefinitionService.activateDefinition(id, userId);
  res.status(200).json(ApiResponse.success(result, 'Certificate definition activated successfully'));
});

/**
 * POST /api/v2/certificate-definitions/:id/deprecate
 * Deprecate a certificate definition
 */
export const deprecateDefinition = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;
  const { reason } = req.body;

  const result = await CertificateDefinitionService.deprecateDefinition(id, reason || 'Deprecated', userId);
  res.status(200).json(ApiResponse.success(result, 'Certificate definition deprecated successfully'));
});

/**
 * GET /api/v2/certificate-definitions/:id/requirements
 * List all requirements for a certificate definition
 */
export const listRequirements = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await CertificateDefinitionService.listRequirements(id, userId);
  res.status(200).json(ApiResponse.success({ requirements: result }));
});

/**
 * POST /api/v2/certificate-definitions/:id/requirements
 * Add a requirement to a certificate definition
 */
export const addRequirement = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await CertificateDefinitionService.addRequirement(id, req.body, userId);
  res.status(201).json(ApiResponse.success(result, 'Requirement added successfully'));
});

/**
 * DELETE /api/v2/certificate-definitions/:id/requirements/:reqId
 * Remove a requirement from a certificate definition
 */
export const removeRequirement = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id, reqId } = req.params;

  await CertificateDefinitionService.removeRequirement(id, reqId, userId);
  res.status(200).json(ApiResponse.success(null, 'Requirement removed successfully'));
});
