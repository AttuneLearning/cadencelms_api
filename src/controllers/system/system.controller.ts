import { Request, Response } from 'express';
import { SystemService } from '@/services/system/system.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * System Controller
 * Handles all /api/v2/system endpoints
 */

/**
 * GET /api/v2/system/health
 * Basic health check (PUBLIC - no auth)
 */
export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const result = await SystemService.getHealth();

  // Return 503 if system is unhealthy
  if (result.status === 'unhealthy') {
    return res.status(503).json(result);
  }

  return res.status(200).json(result);
});

/**
 * GET /api/v2/system/status
 * Detailed system status (admin only)
 */
export const getStatus = asyncHandler(async (_req: Request, res: Response) => {
  const result = await SystemService.getStatus();
  return res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/system/metrics
 * Performance metrics (admin only)
 */
export const getMetrics = asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as string) || '24h';

  // Validate period
  const validPeriods = ['1h', '24h', '7d', '30d'];
  if (!validPeriods.includes(period)) {
    throw ApiError.badRequest(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
  }

  const result = await SystemService.getMetrics(period);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/system/version
 * Version information (PUBLIC - no auth)
 */
export const getVersion = asyncHandler(async (_req: Request, res: Response) => {
  const result = await SystemService.getVersion();
  return res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/system/stats
 * Platform statistics (admin only)
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'all';

  // Validate period
  const validPeriods = ['today', 'week', 'month', 'year', 'all'];
  if (!validPeriods.includes(period)) {
    throw ApiError.badRequest(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
  }

  const result = await SystemService.getStats(period);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/system/maintenance
 * Toggle maintenance mode (admin only)
 */
export const toggleMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const { enabled, message, allowedIPs, scheduledEnd } = req.body;

  // Validate required fields
  if (enabled === undefined || enabled === null) {
    throw ApiError.badRequest('enabled field is required');
  }

  if (typeof enabled !== 'boolean') {
    throw ApiError.badRequest('enabled must be a boolean');
  }

  // Validate message length
  if (message !== undefined && message !== null) {
    if (typeof message !== 'string') {
      throw ApiError.badRequest('message must be a string');
    }
    if (message.length > 500) {
      throw ApiError.badRequest('message cannot exceed 500 characters');
    }
  }

  // Validate allowedIPs
  if (allowedIPs !== undefined && allowedIPs !== null) {
    if (!Array.isArray(allowedIPs)) {
      throw ApiError.badRequest('allowedIPs must be an array');
    }
    // Validate IP format (basic validation)
    for (const ip of allowedIPs) {
      if (typeof ip !== 'string') {
        throw ApiError.badRequest('allowedIPs must contain only strings');
      }
    }
  }

  // Validate scheduledEnd
  let scheduledEndDate: Date | undefined;
  if (scheduledEnd) {
    scheduledEndDate = new Date(scheduledEnd);
    if (isNaN(scheduledEndDate.getTime())) {
      throw ApiError.badRequest('Invalid scheduledEnd date format');
    }
    // Ensure scheduledEnd is in the future
    if (enabled && scheduledEndDate <= new Date()) {
      throw ApiError.badRequest('scheduledEnd must be in the future');
    }
  }

  const input = {
    enabled,
    message,
    allowedIPs,
    scheduledEnd: scheduledEndDate
  };

  // Get userId from authenticated user
  const userId = (req as any).user?.userId;

  const result = await SystemService.toggleMaintenance(input, userId);

  const responseMessage = enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled';
  res.status(200).json(ApiResponse.success(result, responseMessage));
});
