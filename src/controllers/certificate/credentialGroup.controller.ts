import { Request, Response } from 'express';
import { CredentialGroupService } from '@/services/certificate/credentialGroup.service';
import { CertificateDefinitionService } from '@/services/certificate/certificateDefinition.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';

/**
 * Credential Group Controller
 * Handles all /api/v2/credential-groups endpoints
 */

/**
 * GET /api/v2/credential-groups
 * List all credential groups with filtering and pagination
 */
export const listCredentialGroups = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    departmentId: req.query.departmentId as string,
    type: req.query.type as 'certificate' | 'diploma' | 'degree' | 'badge' | undefined,
    isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    search: req.query.search as string,
    sort: req.query.sort as string
  };

  const result = await CredentialGroupService.listCredentialGroups(filters, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/credential-groups
 * Create a new credential group
 */
export const createCredentialGroup = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const result = await CredentialGroupService.createCredentialGroup(req.body, userId);
  res.status(201).json(ApiResponse.success(result, 'Credential group created successfully'));
});

/**
 * GET /api/v2/credential-groups/:id
 * Get detailed information about a specific credential group
 */
export const getCredentialGroupById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await CredentialGroupService.getCredentialGroupById(id, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PATCH /api/v2/credential-groups/:id
 * Update a credential group
 */
export const updateCredentialGroup = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const result = await CredentialGroupService.updateCredentialGroup(id, req.body, userId);
  res.status(200).json(ApiResponse.success(result, 'Credential group updated successfully'));
});

/**
 * DELETE /api/v2/credential-groups/:id
 * Delete a credential group (soft delete)
 */
export const deleteCredentialGroup = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  await CredentialGroupService.deleteCredentialGroup(id, userId);
  res.status(200).json(ApiResponse.success(null, 'Credential group deleted successfully'));
});

/**
 * GET /api/v2/credential-groups/:id/definitions
 * List all certificate definitions for a credential group
 */
export const listCredentialGroupDefinitions = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    credentialGroupId: id,
    status: req.query.status as 'draft' | 'active' | 'deprecated' | undefined,
    sort: req.query.sort as string
  };

  const result = await CertificateDefinitionService.listDefinitions(filters, userId);
  res.status(200).json(ApiResponse.success(result));
});
