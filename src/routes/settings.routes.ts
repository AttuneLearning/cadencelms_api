import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as settingsController from '@/controllers/system/settings.controller';

const router = Router();

/**
 * Settings Routes
 * Base path: /api/v2/settings
 *
 * All routes require authentication
 * Comprehensive system settings and configuration management
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/settings
 * List all settings with filtering
 * Query params:
 *   - category: string (optional) - general|authentication|enrollment|notifications|security|features|branding
 *   - includePrivate: boolean (optional) - Include private settings (admin only)
 *   - departmentId: ObjectId (optional) - Get department-specific overrides
 * Permissions: read:settings
 */
router.get('/', settingsController.getAllSettings);

/**
 * GET /api/v2/settings/categories/:category
 * Get all settings in a specific category
 * Params:
 *   - category: string (required) - general|authentication|enrollment|notifications|security|features|branding
 * Query params:
 *   - includePrivate: boolean (optional) - Include private settings (admin only)
 *   - departmentId: ObjectId (optional) - Include department-specific overrides
 * Permissions: read:settings
 */
router.get('/categories/:category', settingsController.getSettingsByCategory);

/**
 * POST /api/v2/settings/bulk
 * Update multiple settings in a single request
 * Body:
 *   - settings: array (required) - Array of setting objects with key, value, and optional departmentId
 *   - validateOnly: boolean (optional) - Validate without applying changes (dry run)
 * Permissions: write:settings
 */
router.post('/bulk', settingsController.bulkUpdateSettings);

/**
 * POST /api/v2/settings/reset
 * Reset settings to their default values
 * Body:
 *   - keys: array (optional) - Specific setting keys to reset
 *   - category: string (optional) - Reset all settings in a category
 *   - departmentId: ObjectId (optional) - Reset department overrides only
 *   - confirm: boolean (required) - Must be true to confirm reset operation
 * Permissions: admin:settings
 */
router.post('/reset', settingsController.resetSettings);

/**
 * GET /api/v2/settings/:key
 * Get a specific setting value by its key
 * Params:
 *   - key: string (required) - Setting key in dot notation (e.g., system.name)
 * Query params:
 *   - departmentId: ObjectId (optional) - Get department-specific override value
 * Permissions: read:settings
 */
router.get('/:key', settingsController.getSettingByKey);

/**
 * PUT /api/v2/settings/:key
 * Update a specific setting value
 * Params:
 *   - key: string (required) - Setting key to update
 * Body:
 *   - value: any (required) - New setting value (must match setting type)
 *   - departmentId: ObjectId (optional) - Create department-specific override
 * Permissions: write:settings
 */
router.put('/:key', settingsController.updateSetting);

export default router;
