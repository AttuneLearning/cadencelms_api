import { ApiError } from '@/utils/ApiError';

/**
 * Settings Service
 * Implements comprehensive settings management for system configuration
 *
 * TODO: Create Setting model at src/models/system/Setting.model.ts with schema:
 * - key: string (unique, indexed)
 * - value: any
 * - type: 'string' | 'number' | 'boolean' | 'json'
 * - category: enum categories
 * - description: string
 * - isPublic: boolean
 * - isEncrypted: boolean
 * - isFeatureFlag: boolean
 * - defaultValue: any
 * - validationRules: object
 * - departmentOverride: boolean
 * - lastModifiedAt: Date
 * - lastModifiedBy: ObjectId (ref: User)
 * - version: number
 * - isReadOnly: boolean
 */

// Mock Setting model interface until real model is created
interface ISetting {
  _id: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: 'general' | 'authentication' | 'enrollment' | 'notifications' | 'security' | 'features' | 'branding';
  description: string;
  isPublic: boolean;
  isEncrypted: boolean;
  isFeatureFlag: boolean;
  defaultValue: any;
  validationRules: {
    required: boolean;
    min?: number | null;
    max?: number | null;
    pattern?: string | null;
    enum?: any[] | null;
    customValidator?: string | null;
  };
  departmentOverride: boolean;
  lastModifiedAt: Date;
  lastModifiedBy?: {
    id: string;
    name: string;
  } | null;
  version: number;
  isReadOnly?: boolean;
}


// Category descriptions
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  general: 'System name, timezone, language, date formats',
  authentication: 'Login, passwords, MFA, session management',
  enrollment: 'Auto-approval, limits, prerequisites, waitlists',
  notifications: 'Email, SMS, in-app notifications, templates',
  security: 'CORS, rate limiting, IP restrictions, encryption',
  features: 'Feature flags for toggling functionality',
  branding: 'Logo, colors, themes, custom CSS'
};

// Valid categories
const VALID_CATEGORIES = [
  'general',
  'authentication',
  'enrollment',
  'notifications',
  'security',
  'features',
  'branding'
] as const;

interface GetAllSettingsFilters {
  category?: string;
  includePrivate?: boolean;
  departmentId?: string; // TODO: use for dept overrides
}

interface UpdateSettingParams {
  key: string;
  value: any;
  departmentId?: string; // TODO: use for dept overrides
  userId: string; // TODO: use for audit
  userName: string;
}

interface BulkUpdateSettingItem {
  key: string;
  value: any;
  departmentId?: string; // TODO: use for dept overrides
}

interface BulkUpdateParams {
  settings: BulkUpdateSettingItem[];
  validateOnly?: boolean;
  userId: string; // TODO: use for audit
  userName: string;
}

interface ResetSettingsParams {
  keys?: string[];
  category?: string;
  departmentId?: string; // TODO: use for dept overrides
  confirm: boolean;
}

export class SettingsService {
  /**
   * Get All Settings
   * Returns all settings filtered by permissions and visibility
   */
  static async getAllSettings(filters: GetAllSettingsFilters, _userId: string): Promise<any> {
    // TODO: use userId for audit trail
    const { category, includePrivate = false, departmentId: _departmentId } = filters;

    // TODO: Import Setting model once created
    // import Setting from '@/models/system/Setting.model';

    // TODO: Add permission check
    // - If includePrivate=true, require admin permission
    // - Regular users can only see public settings

    // Build query
    const query: any = {};

    if (category) {
      if (!VALID_CATEGORIES.includes(category as any)) {
        throw ApiError.badRequest(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
      }
      query.category = category;
    }

    if (!includePrivate) {
      query.isPublic = true;
    }

    // TODO: Replace with actual database query
    // const settings = await Setting.find(query).lean();

    // Mock data for now
    const mockSettings: ISetting[] = [
      {
        _id: '507f1f77bcf86cd799439011',
        key: 'system.name',
        value: 'Learning Management System',
        type: 'string',
        category: 'general',
        description: 'System display name shown in header and emails',
        isPublic: true,
        isEncrypted: false,
        isFeatureFlag: false,
        defaultValue: 'LMS',
        validationRules: {
          required: true,
          min: 1,
          max: 100,
          pattern: null,
          enum: null,
          customValidator: null
        },
        departmentOverride: false,
        lastModifiedAt: new Date('2026-01-08T10:00:00.000Z'),
        lastModifiedBy: {
          id: '507f1f77bcf86cd799439011',
          name: 'Admin User'
        },
        version: 1
      },
      {
        _id: '507f1f77bcf86cd799439012',
        key: 'system.timezone',
        value: 'America/New_York',
        type: 'string',
        category: 'general',
        description: 'Default system timezone',
        isPublic: true,
        isEncrypted: false,
        isFeatureFlag: false,
        defaultValue: 'UTC',
        validationRules: {
          required: true,
          min: null,
          max: null,
          pattern: null,
          enum: ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'],
          customValidator: null
        },
        departmentOverride: false,
        lastModifiedAt: new Date('2025-12-01T00:00:00.000Z'),
        lastModifiedBy: {
          id: '507f1f77bcf86cd799439011',
          name: 'Admin User'
        },
        version: 1
      },
      {
        _id: '507f1f77bcf86cd799439013',
        key: 'authentication.sessionTimeout',
        value: 3600,
        type: 'number',
        category: 'authentication',
        description: 'Session timeout in seconds',
        isPublic: false,
        isEncrypted: false,
        isFeatureFlag: false,
        defaultValue: 1800,
        validationRules: {
          required: true,
          min: 300,
          max: 86400,
          pattern: null,
          enum: null,
          customValidator: null
        },
        departmentOverride: false,
        lastModifiedAt: new Date('2026-01-05T14:30:00.000Z'),
        lastModifiedBy: {
          id: '507f1f77bcf86cd799439011',
          name: 'Admin User'
        },
        version: 3
      }
    ];

    let settings = mockSettings.filter(s => {
      if (category && s.category !== category) return false;
      if (!includePrivate && !s.isPublic) return false;
      return true;
    });

    // TODO: If departmentId provided, merge with department overrides
    // This would involve:
    // 1. Query DepartmentSetting model for overrides
    // 2. Merge override values into settings
    // 3. Mark settings with isDepartmentValue flag

    // Get unique categories from results
    const categories = [...new Set(settings.map(s => s.category))];

    return {
      settings: settings.map(s => ({
        key: s.key,
        value: s.value,
        type: s.type,
        category: s.category,
        description: s.description,
        isPublic: s.isPublic,
        isEncrypted: s.isEncrypted,
        isFeatureFlag: s.isFeatureFlag,
        defaultValue: s.defaultValue,
        validationRules: s.validationRules,
        departmentOverride: s.departmentOverride,
        lastModifiedAt: s.lastModifiedAt,
        lastModifiedBy: s.lastModifiedBy
      })),
      totalCount: settings.length,
      categories
    };
  }

  /**
   * Get Setting by Key
   * Returns a specific setting by its key
   */
  static async getSettingByKey(key: string, _departmentId?: string, _userId?: string): Promise<any> {
    // TODO: use departmentId for dept overrides, use userId for access control
    if (!key) {
      throw ApiError.badRequest('Setting key is required');
    }

    // TODO: Import Setting model
    // const setting = await Setting.findOne({ key }).lean();

    // Mock data
    const mockSettings: Record<string, ISetting> = {
      'authentication.sessionTimeout': {
        _id: '507f1f77bcf86cd799439013',
        key: 'authentication.sessionTimeout',
        value: 3600,
        type: 'number',
        category: 'authentication',
        description: 'Session timeout in seconds',
        isPublic: false,
        isEncrypted: false,
        isFeatureFlag: false,
        defaultValue: 1800,
        validationRules: {
          required: true,
          min: 300,
          max: 86400,
          pattern: null,
          enum: null,
          customValidator: null
        },
        departmentOverride: false,
        lastModifiedAt: new Date('2026-01-05T14:30:00.000Z'),
        lastModifiedBy: {
          id: '507f1f77bcf86cd799439011',
          name: 'Admin User'
        },
        version: 3
      }
    };

    const setting = mockSettings[key];

    if (!setting) {
      throw ApiError.notFound('Setting not found');
    }

    // TODO: Add permission check
    // - If setting is private, require appropriate permissions
    // if (!setting.isPublic && !hasPermission(userId, 'read:private_settings')) {
    //   throw ApiError.forbidden('No permission to view this setting');
    // }

    let isDepartmentValue = false;

    // TODO: If departmentId provided, check for department override
    // if (departmentId && setting.departmentOverride) {
    //   const override = await DepartmentSetting.findOne({ departmentId, settingKey: key });
    //   if (override) {
    //     setting.value = override.value;
    //     isDepartmentValue = true;
    //   }
    // }

    return {
      key: setting.key,
      value: setting.value,
      type: setting.type,
      category: setting.category,
      description: setting.description,
      isPublic: setting.isPublic,
      isEncrypted: setting.isEncrypted,
      isFeatureFlag: setting.isFeatureFlag,
      defaultValue: setting.defaultValue,
      validationRules: setting.validationRules,
      departmentOverride: setting.departmentOverride,
      isDepartmentValue,
      lastModifiedAt: setting.lastModifiedAt,
      lastModifiedBy: setting.lastModifiedBy,
      version: setting.version
    };
  }

  /**
   * Update Setting Value
   * Updates a specific setting with validation
   */
  static async updateSetting(params: UpdateSettingParams): Promise<any> {
    const { key, value, departmentId: _departmentId, userId, userName } = params;

    if (!key) {
      throw ApiError.badRequest('Setting key is required');
    }

    if (value === undefined || value === null) {
      throw ApiError.badRequest('Setting value is required');
    }

    // TODO: Import Setting model
    // const setting = await Setting.findOne({ key });

    // Mock data
    const mockSetting: ISetting = {
      _id: '507f1f77bcf86cd799439013',
      key: 'enrollment.maxConcurrentCourses',
      value: 3,
      type: 'number',
      category: 'enrollment',
      description: 'Maximum concurrent course enrollments per learner',
      isPublic: true,
      isEncrypted: false,
      isFeatureFlag: false,
      defaultValue: 3,
      validationRules: {
        required: true,
        min: 1,
        max: 20,
        pattern: null,
        enum: null,
        customValidator: null
      },
      departmentOverride: true,
      lastModifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      lastModifiedBy: null,
      version: 1,
      isReadOnly: false
    };

    const setting = mockSetting;

    if (!setting) {
      throw ApiError.notFound('Setting not found');
    }

    // Check if read-only
    if (setting.isReadOnly) {
      throw ApiError.forbidden('This setting cannot be modified via API');
    }

    // TODO: Add permission check
    // - Require write:settings permission
    // if (!hasPermission(userId, 'write:settings')) {
    //   throw ApiError.forbidden('Insufficient permissions to update setting');
    // }

    // Validate type
    const actualType = typeof value;
    let isValidType = false;

    switch (setting.type) {
      case 'string':
        isValidType = actualType === 'string';
        break;
      case 'number':
        isValidType = actualType === 'number' && !isNaN(value);
        break;
      case 'boolean':
        isValidType = actualType === 'boolean';
        break;
      case 'json':
        isValidType = actualType === 'object';
        break;
    }

    if (!isValidType) {
      throw ApiError.badRequest(`Value type does not match setting type. Expected ${setting.type}, got ${actualType}`);
    }

    // Validate against rules
    const validationError = this.validateSettingValue(value, setting.validationRules, setting.type);
    if (validationError) {
      throw ApiError.badRequest(validationError);
    }

    const previousValue = setting.value;
    let isDepartmentValue = false;

    // TODO: If departmentId provided, create/update department override
    // if (departmentId) {
    //   if (!setting.departmentOverride) {
    //     throw ApiError.badRequest('This setting does not support department overrides');
    //   }
    //
    //   const dept = await Department.findById(departmentId);
    //   if (!dept) {
    //     throw ApiError.notFound('Department not found');
    //   }
    //
    //   await DepartmentSetting.findOneAndUpdate(
    //     { departmentId, settingKey: key },
    //     { value, lastModifiedBy: userId, lastModifiedAt: new Date() },
    //     { upsert: true }
    //   );
    //
    //   isDepartmentValue = true;
    // } else {
    //   // Update system setting
    //   setting.value = value;
    //   setting.lastModifiedAt = new Date();
    //   setting.lastModifiedBy = { id: userId, name: userName };
    //   setting.version += 1;
    //
    //   // TODO: Encrypt if needed
    //   if (setting.isEncrypted) {
    //     setting.value = encrypt(value);
    //   }
    //
    //   await setting.save();
    // }

    // TODO: Create audit log entry
    // await AuditLog.create({
    //   action: 'setting_update',
    //   userId,
    //   settingKey: key,
    //   previousValue,
    //   newValue: value,
    //   departmentId: departmentId || null,
    //   timestamp: new Date()
    // });

    return {
      key: setting.key,
      value: value,
      type: setting.type,
      category: setting.category,
      previousValue,
      isDepartmentValue,
      lastModifiedAt: new Date(),
      lastModifiedBy: {
        id: userId,
        name: userName
      },
      version: setting.version + 1
    };
  }

  /**
   * Get Settings by Category
   * Returns all settings in a specific category
   */
  static async getSettingsByCategory(
    category: string,
    includePrivate = false,
    _departmentId?: string,
    _userId?: string
  ): Promise<any> {
    // TODO: use departmentId for dept overrides, use userId for access control
    if (!VALID_CATEGORIES.includes(category as any)) {
      throw ApiError.badRequest(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    // TODO: Add permission check for includePrivate
    // if (includePrivate && !hasPermission(userId, 'read:private_settings')) {
    //   throw ApiError.forbidden('Insufficient permissions to view private settings');
    // }

    // Use getAllSettings with category filter
    const result = await this.getAllSettings({ category, includePrivate, departmentId: _departmentId }, _userId || '');

    return {
      category,
      categoryDescription: CATEGORY_DESCRIPTIONS[category] || '',
      settings: result.settings.map((s: any) => ({
        ...s,
        isDepartmentValue: false // TODO: Implement department override check
      })),
      count: result.settings.length
    };
  }

  /**
   * Bulk Update Settings
   * Updates multiple settings in a single transaction
   */
  static async bulkUpdateSettings(params: BulkUpdateParams): Promise<any> {
    const { settings, validateOnly = false, userId, userName } = params;

    if (!settings || !Array.isArray(settings) || settings.length === 0) {
      throw ApiError.badRequest('Settings array cannot be empty');
    }

    if (settings.length > 100) {
      throw ApiError.badRequest('Maximum 100 settings per bulk request');
    }

    // TODO: Add permission check
    // if (!hasPermission(userId, 'write:settings')) {
    //   throw ApiError.forbidden('Insufficient permissions to update settings');
    // }

    const updated: any[] = [];
    const failed: any[] = [];

    // TODO: Wrap in transaction
    // const session = await mongoose.startSession();
    // session.startTransaction();

    try {
      for (const settingUpdate of settings) {
        try {
          const result = await this.updateSetting({
            key: settingUpdate.key,
            value: settingUpdate.value,
            departmentId: settingUpdate.departmentId,
            userId,
            userName
          });

          updated.push({
            key: result.key,
            value: result.value,
            previousValue: result.previousValue,
            success: true
          });
        } catch (error: any) {
          failed.push({
            key: settingUpdate.key,
            error: error.message,
            reason: error.statusCode === 400 ? 'Validation failed' : 'Update failed'
          });
        }
      }

      if (validateOnly) {
        // TODO: Rollback transaction
        // await session.abortTransaction();

        return {
          updated: [],
          failed,
          summary: {
            total: settings.length,
            successful: 0,
            failed: failed.length
          },
          message: 'Validation complete (dry run)'
        };
      }

      // TODO: Commit transaction if all successful or if partial success allowed
      // await session.commitTransaction();

      // TODO: Create bulk audit log entry
      // await AuditLog.create({
      //   action: 'settings_bulk_update',
      //   userId,
      //   bulkOperationId: new ObjectId(),
      //   totalCount: settings.length,
      //   successCount: updated.length,
      //   failedCount: failed.length,
      //   timestamp: new Date()
      // });

      return {
        updated,
        failed,
        summary: {
          total: settings.length,
          successful: updated.length,
          failed: failed.length
        }
      };
    } catch (error) {
      // TODO: Rollback transaction
      // await session.abortTransaction();
      throw error;
    } finally {
      // TODO: End session
      // session.endSession();
    }
  }

  /**
   * Reset Settings to Defaults
   * Resets specified settings or all settings to their default values
   */
  static async resetSettings(params: ResetSettingsParams): Promise<any> {
    const { keys, category, departmentId, confirm } = params;

    if (!confirm) {
      throw ApiError.badRequest('confirm must be true to proceed with reset operation');
    }

    // TODO: Add permission check
    // - Require admin:settings permission (higher than write:settings)
    // if (!hasPermission(userId, 'admin:settings')) {
    //   throw ApiError.forbidden('Insufficient permissions to reset settings');
    // }

    // Validate that at least one filter is provided
    if (!keys && !category && !departmentId) {
      throw ApiError.badRequest('Must specify keys, category, or departmentId');
    }

    // Build query
    const query: any = {};

    if (keys && keys.length > 0) {
      query.key = { $in: keys };
    }

    if (category) {
      if (!VALID_CATEGORIES.includes(category as any)) {
        throw ApiError.badRequest(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
      }
      query.category = category;
    }

    // TODO: Query settings to reset
    // const settingsToReset = await Setting.find(query);

    // Mock data
    const mockSettingsToReset: ISetting[] = [
      {
        _id: '507f1f77bcf86cd799439013',
        key: 'authentication.sessionTimeout',
        value: 7200,
        type: 'number',
        category: 'authentication',
        description: 'Session timeout in seconds',
        isPublic: false,
        isEncrypted: false,
        isFeatureFlag: false,
        defaultValue: 1800,
        validationRules: {
          required: true,
          min: 300,
          max: 86400,
          pattern: null,
          enum: null,
          customValidator: null
        },
        departmentOverride: false,
        lastModifiedAt: new Date(),
        lastModifiedBy: { id: 'user123', name: 'Admin' },
        version: 3,
        isReadOnly: false
      }
    ];

    const settingsToReset = mockSettingsToReset.filter(s => {
      if (keys && !keys.includes(s.key)) return false;
      if (category && s.category !== category) return false;
      return true;
    });

    if (settingsToReset.length === 0) {
      throw ApiError.notFound('No settings found matching criteria');
    }

    const reset: any[] = [];
    const affectedCategories = new Set<string>();

    // TODO: If departmentId provided, delete department overrides
    // if (departmentId) {
    //   const overrideQuery: any = { departmentId };
    //   if (keys) overrideQuery.settingKey = { $in: keys };
    //
    //   const overrides = await DepartmentSetting.find(overrideQuery);
    //   for (const override of overrides) {
    //     const setting = await Setting.findOne({ key: override.settingKey });
    //     if (setting) {
    //       reset.push({
    //         key: override.settingKey,
    //         previousValue: override.value,
    //         defaultValue: setting.value // System value becomes the default
    //       });
    //       affectedCategories.add(setting.category);
    //     }
    //   }
    //
    //   await DepartmentSetting.deleteMany(overrideQuery);
    // } else {
    //   // Reset system settings
    //   for (const setting of settingsToReset) {
    //     if (setting.isReadOnly) continue; // Skip read-only settings
    //
    //     const previousValue = setting.value;
    //     setting.value = setting.defaultValue;
    //     setting.lastModifiedAt = new Date();
    //     setting.version += 1;
    //
    //     await setting.save();
    //
    //     reset.push({
    //       key: setting.key,
    //       previousValue,
    //       defaultValue: setting.defaultValue
    //     });
    //
    //     affectedCategories.add(setting.category);
    //   }
    // }

    // Mock reset
    for (const setting of settingsToReset) {
      if (setting.isReadOnly) continue;

      reset.push({
        key: setting.key,
        previousValue: setting.value,
        defaultValue: setting.defaultValue
      });

      affectedCategories.add(setting.category);
    }

    // TODO: Create audit log entry
    // await AuditLog.create({
    //   action: 'settings_reset',
    //   userId,
    //   resetType: departmentId ? 'department_overrides' : 'system_settings',
    //   settingsCount: reset.length,
    //   affectedCategories: Array.from(affectedCategories),
    //   timestamp: new Date()
    // });

    return {
      reset,
      count: reset.length,
      affectedCategories: Array.from(affectedCategories)
    };
  }

  /**
   * Validate Setting Value
   * Helper method to validate a value against setting rules
   */
  private static validateSettingValue(
    value: any,
    rules: any,
    type: string
  ): string | null {
    // Required check
    if (rules.required && (value === null || value === undefined || value === '')) {
      return 'Value is required';
    }

    // Type-specific validations
    if (type === 'string' && typeof value === 'string') {
      if (rules.min !== null && rules.min !== undefined && value.length < rules.min) {
        return `String length must be at least ${rules.min} characters`;
      }
      if (rules.max !== null && rules.max !== undefined && value.length > rules.max) {
        return `String length must not exceed ${rules.max} characters`;
      }
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        return 'Value does not match required pattern';
      }
    }

    if (type === 'number' && typeof value === 'number') {
      if (rules.min !== null && rules.min !== undefined && value < rules.min) {
        return `Value must be at least ${rules.min}`;
      }
      if (rules.max !== null && rules.max !== undefined && value > rules.max) {
        return `Value must not exceed ${rules.max}`;
      }
    }

    // Enum check
    if (rules.enum && Array.isArray(rules.enum) && rules.enum.length > 0) {
      if (!rules.enum.includes(value)) {
        return `Value must be one of: ${rules.enum.join(', ')}`;
      }
    }

    // TODO: Implement custom validator if needed
    // if (rules.customValidator) {
    //   const validator = getCustomValidator(rules.customValidator);
    //   const error = validator(value);
    //   if (error) return error;
    // }

    return null;
  }
}
