/**
 * ModuleEditLock Controller
 *
 * Handles HTTP requests for module edit locking endpoints:
 * - POST   /api/v2/modules/:id/edit-lock           - Acquire edit lock
 * - DELETE /api/v2/modules/:id/edit-lock           - Release lock
 * - GET    /api/v2/modules/:id/edit-lock           - Check lock status
 * - PATCH  /api/v2/modules/:id/edit-lock           - Heartbeat (extend lock)
 * - POST   /api/v2/modules/:id/edit-lock/request-access - Request access
 */

import { Request, Response } from 'express';
import { ModuleEditLockService } from '@/services/academic/moduleEditLock.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Helper to get user info from request
 */
const getUserFromRequest = (req: Request): { userId: string; userName: string } => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  // Construct display name from available user info
  const userName = user.name || user.email || 'Unknown User';

  return {
    userId: user.userId,
    userName
  };
};

/**
 * POST /api/v2/modules/:id/edit-lock
 * Acquire an edit lock on a module
 *
 * Success: Returns ModuleEditLockResponse with isLocked: true
 * Conflict: Returns 409 with MODULE_LOCKED code and current lock info
 */
export const acquireLock = asyncHandler(async (req: Request, res: Response) => {
  const { id: moduleId } = req.params;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  const { userId, userName } = getUserFromRequest(req);

  try {
    const result = await ModuleEditLockService.acquireLock(moduleId, userId, userName);
    res.status(200).json(ApiResponse.success(result, 'Lock acquired successfully'));
  } catch (error: any) {
    // Special handling for MODULE_LOCKED error - include lock data in response
    if (error.code === 'MODULE_LOCKED' && error.lockData) {
      res.status(409).json({
        status: 'error',
        success: false,
        code: 'MODULE_LOCKED',
        message: error.message,
        data: error.lockData
      });
      return;
    }
    throw error;
  }
});

/**
 * DELETE /api/v2/modules/:id/edit-lock
 * Release an edit lock on a module
 *
 * Only the lock holder can release the lock.
 * Idempotent - succeeds even if no lock exists.
 */
export const releaseLock = asyncHandler(async (req: Request, res: Response) => {
  const { id: moduleId } = req.params;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  const { userId } = getUserFromRequest(req);

  await ModuleEditLockService.releaseLock(moduleId, userId);
  res.status(200).json(ApiResponse.success(null, 'Lock released successfully'));
});

/**
 * GET /api/v2/modules/:id/edit-lock
 * Get the current lock status for a module
 *
 * Returns lock information if locked, or isLocked: false if not.
 */
export const getLockStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id: moduleId } = req.params;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  const result = await ModuleEditLockService.getLockStatus(moduleId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PATCH /api/v2/modules/:id/edit-lock
 * Send heartbeat to extend lock expiry
 *
 * Only the lock holder can send heartbeats.
 * Extends the lock by 30 minutes from the current time.
 */
export const heartbeat = asyncHandler(async (req: Request, res: Response) => {
  const { id: moduleId } = req.params;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  const { userId } = getUserFromRequest(req);

  const result = await ModuleEditLockService.heartbeat(moduleId, userId);
  res.status(200).json(ApiResponse.success(result, 'Lock extended successfully'));
});

/**
 * POST /api/v2/modules/:id/edit-lock/request-access
 * Request access to a locked module
 *
 * Stores the access request on the lock for the lock holder to see.
 * Only stores the most recent request (no queue).
 */
export const requestAccess = asyncHandler(async (req: Request, res: Response) => {
  const { id: moduleId } = req.params;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  const { userId, userName } = getUserFromRequest(req);

  const result = await ModuleEditLockService.requestAccess(moduleId, userId, userName);
  res.status(200).json(ApiResponse.success(result, 'Access request submitted'));
});
