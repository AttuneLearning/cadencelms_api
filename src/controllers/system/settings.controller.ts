import { Request, Response } from 'express';
import { SettingsService } from '@/services/system/settings.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Settings Controller
 * Handles all /api/v2/settings endpoints
 * Implements comprehensive settings management for system configuration
 */

/**
 * GET /api/v2/settings
 * List all settings with filtering
 */
export const getAllSettings = asyncHandler(async (req: Request, res: Response) => {
  const { category, includePrivate, departmentId } = req.query;

  // Validate category if provided
  const validCategories = ['general', 'authentication', 'enrollment', 'notifications', 'security', 'features', 'branding'];
  if (category && !validCategories.includes(category as string)) {
    throw ApiError.badRequest(
      `Invalid category. Must be one of: ${validCategories.join(', ')}`
    );
  }

  // Parse boolean
  const parsedIncludePrivate = includePrivate === 'true';

  // TODO: Add permission checks
  // - Read:settings permission required for public settings
  // - Admin permission required if includePrivate=true
  // const userId = req.user?.id;
  // if (parsedIncludePrivate && !req.user?.permissions.includes('admin:settings')) {
  //   throw ApiError.forbidden('Insufficient permissions to view private settings');
  // }

  const filters = {
    category: category as string | undefined,
    includePrivate: parsedIncludePrivate,
    departmentId: departmentId as string | undefined
  };

  // Mock userId - replace with actual user from auth middleware
  const userId = 'mock-user-id';

  const result = await SettingsService.getAllSettings(filters, userId);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/settings/:key
 * Get specific setting by key
 */
export const getSettingByKey = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { departmentId } = req.query;

  // Validate key
  if (!key || key.trim() === '') {
    throw ApiError.badRequest('Setting key is required');
  }

  // Validate key format (dot notation)
  if (!/^[a-z]+(\.[a-z]+)+$/i.test(key)) {
    throw ApiError.badRequest(
      'Invalid setting key format. Must use dot notation (e.g., system.name)'
    );
  }

  // TODO: Add permission checks
  // - Check if user has permission to view this setting
  // - If setting is private, require appropriate permissions
  // const userId = req.user?.id;

  // Mock userId
  const userId = 'mock-user-id';

  const result = await SettingsService.getSettingByKey(
    key,
    departmentId as string | undefined,
    userId
  );

  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/settings/:key
 * Update setting value
 */
export const updateSetting = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value, departmentId } = req.body;

  // Validate key
  if (!key || key.trim() === '') {
    throw ApiError.badRequest('Setting key is required');
  }

  // Validate key format
  if (!/^[a-z]+(\.[a-z]+)+$/i.test(key)) {
    throw ApiError.badRequest(
      'Invalid setting key format. Must use dot notation (e.g., system.name)'
    );
  }

  // Validate value is provided
  if (value === undefined) {
    throw ApiError.badRequest('Setting value is required');
  }

  // TODO: Add permission checks
  // - Require write:settings permission
  // - If departmentId provided, verify user has access to that department
  // const userId = req.user?.id;
  // const userName = req.user?.name || 'Unknown User';
  // if (!req.user?.permissions.includes('write:settings')) {
  //   throw ApiError.forbidden('Insufficient permissions to update settings');
  // }

  // Mock user info
  const userId = 'mock-user-id';
  const userName = 'Mock Admin User';

  const params = {
    key,
    value,
    departmentId,
    userId,
    userName
  };

  const result = await SettingsService.updateSetting(params);

  res.status(200).json(
    ApiResponse.success(result, 'Setting updated successfully')
  );
});

/**
 * GET /api/v2/settings/categories/:category
 * Get settings by category
 */
export const getSettingsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const { includePrivate, departmentId } = req.query;

  // Validate category
  const validCategories = ['general', 'authentication', 'enrollment', 'notifications', 'security', 'features', 'branding'];
  if (!category || !validCategories.includes(category)) {
    throw ApiError.badRequest(
      `Invalid category. Must be one of: ${validCategories.join(', ')}`
    );
  }

  // Parse boolean
  const parsedIncludePrivate = includePrivate === 'true';

  // TODO: Add permission checks
  // - Read:settings permission required
  // - Admin permission required if includePrivate=true
  // const userId = req.user?.id;
  // if (parsedIncludePrivate && !req.user?.permissions.includes('admin:settings')) {
  //   throw ApiError.forbidden('Insufficient permissions to view private settings');
  // }

  // Mock userId
  const userId = 'mock-user-id';

  const result = await SettingsService.getSettingsByCategory(
    category,
    parsedIncludePrivate,
    departmentId as string | undefined,
    userId
  );

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/settings/bulk
 * Bulk update settings
 */
export const bulkUpdateSettings = asyncHandler(async (req: Request, res: Response) => {
  const { settings, validateOnly } = req.body;

  // Validate settings array
  if (!settings || !Array.isArray(settings)) {
    throw ApiError.badRequest('settings must be an array');
  }

  if (settings.length === 0) {
    throw ApiError.badRequest('settings array cannot be empty');
  }

  if (settings.length > 100) {
    throw ApiError.badRequest('Maximum 100 settings per bulk request');
  }

  // Validate each setting item
  for (let i = 0; i < settings.length; i++) {
    const setting = settings[i];

    if (!setting.key || typeof setting.key !== 'string') {
      throw ApiError.badRequest(
        `settings[${i}].key is required and must be a string`
      );
    }

    if (!/^[a-z]+(\.[a-z]+)+$/i.test(setting.key)) {
      throw ApiError.badRequest(
        `settings[${i}].key has invalid format. Must use dot notation (e.g., system.name)`
      );
    }

    if (setting.value === undefined) {
      throw ApiError.badRequest(
        `settings[${i}].value is required`
      );
    }

    if (setting.departmentId !== undefined && typeof setting.departmentId !== 'string') {
      throw ApiError.badRequest(
        `settings[${i}].departmentId must be a string if provided`
      );
    }
  }

  // Parse boolean
  const parsedValidateOnly = validateOnly === true || validateOnly === 'true';

  // TODO: Add permission checks
  // - Require write:settings permission
  // const userId = req.user?.id;
  // const userName = req.user?.name || 'Unknown User';
  // if (!req.user?.permissions.includes('write:settings')) {
  //   throw ApiError.forbidden('Insufficient permissions to update settings');
  // }

  // Mock user info
  const userId = 'mock-user-id';
  const userName = 'Mock Admin User';

  const params = {
    settings,
    validateOnly: parsedValidateOnly,
    userId,
    userName
  };

  const result = await SettingsService.bulkUpdateSettings(params);

  const message = parsedValidateOnly
    ? 'Validation complete (no changes applied)'
    : 'Bulk update completed';

  res.status(200).json(ApiResponse.success(result, message));
});

/**
 * POST /api/v2/settings/reset
 * Reset settings to defaults
 */
export const resetSettings = asyncHandler(async (req: Request, res: Response) => {
  const { keys, category, departmentId, confirm } = req.body;

  // Validate confirm
  if (confirm !== true) {
    throw ApiError.badRequest(
      'confirm must be true to proceed with reset operation. This is a destructive action.'
    );
  }

  // Validate at least one filter is provided
  if (!keys && !category && !departmentId) {
    throw ApiError.badRequest(
      'Must specify at least one of: keys, category, or departmentId'
    );
  }

  // Validate keys if provided
  if (keys !== undefined) {
    if (!Array.isArray(keys)) {
      throw ApiError.badRequest('keys must be an array');
    }

    for (let i = 0; i < keys.length; i++) {
      if (typeof keys[i] !== 'string' || keys[i].trim() === '') {
        throw ApiError.badRequest(
          `keys[${i}] must be a non-empty string`
        );
      }

      if (!/^[a-z]+(\.[a-z]+)+$/i.test(keys[i])) {
        throw ApiError.badRequest(
          `keys[${i}] has invalid format. Must use dot notation (e.g., system.name)`
        );
      }
    }
  }

  // Validate category if provided
  if (category !== undefined) {
    const validCategories = ['general', 'authentication', 'enrollment', 'notifications', 'security', 'features', 'branding'];
    if (!validCategories.includes(category)) {
      throw ApiError.badRequest(
        `Invalid category. Must be one of: ${validCategories.join(', ')}`
      );
    }
  }

  // Validate departmentId if provided
  if (departmentId !== undefined && typeof departmentId !== 'string') {
    throw ApiError.badRequest('departmentId must be a string');
  }

  // TODO: Add permission checks
  // - Require admin:settings permission (higher than write:settings)
  // - This is a destructive operation
  // const userId = req.user?.id;
  // if (!req.user?.permissions.includes('admin:settings')) {
  //   throw ApiError.forbidden(
  //     'Insufficient permissions to reset settings. Requires admin:settings permission.'
  //   );
  // }

  const params = {
    keys,
    category,
    departmentId,
    confirm
  };

  const result = await SettingsService.resetSettings(params);

  const message = `${result.count} setting${result.count !== 1 ? 's' : ''} reset to defaults`;

  res.status(200).json(ApiResponse.success(result, message));
});
