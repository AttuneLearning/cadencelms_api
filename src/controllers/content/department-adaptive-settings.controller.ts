import { Request, Response, NextFunction } from 'express';
import Department from '@/models/organization/Department.model';
import CognitiveDepthLevel from '@/models/content/CognitiveDepthLevel.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Department Adaptive Settings Controller
 *
 * Manages department-level adaptive learning settings.
 */

export class DepartmentAdaptiveSettingsController {
  /**
   * GET /api/v2/departments/:departmentId/adaptive-settings
   * Get adaptive learning settings for a department
   */
  static async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { departmentId } = req.params;

      const department = await Department.findById(departmentId);
      if (!department) {
        throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
      }

      // Get active cognitive depth level slugs for this department
      const levels = await CognitiveDepthLevel.find({
        $or: [
          { departmentId: department._id, isActive: true },
          { departmentId: null, isDefault: true, isActive: true }
        ]
      }).sort({ order: 1 });

      // Remove duplicates (department overrides take precedence)
      const seenSlugs = new Set<string>();
      const uniqueLevels = [];
      
      // First add department levels
      for (const level of levels) {
        if (level.departmentId && !seenSlugs.has(level.slug)) {
          uniqueLevels.push(level);
          seenSlugs.add(level.slug);
        }
      }
      
      // Then add system defaults that weren't overridden
      for (const level of levels) {
        if (!level.departmentId && !seenSlugs.has(level.slug)) {
          uniqueLevels.push(level);
          seenSlugs.add(level.slug);
        }
      }

      const defaultDepthLevels = uniqueLevels.map((level) => level.slug);

      res.json({
        success: true,
        data: {
          allowCourseDepthOverrides: department.allowCourseDepthOverrides || false,
          defaultDepthLevels
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v2/departments/:departmentId/adaptive-settings
   * Update adaptive learning settings for a department
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { departmentId } = req.params;
      const { allowCourseDepthOverrides } = req.body;

      const department = await Department.findById(departmentId);
      if (!department) {
        throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
      }

      if (typeof allowCourseDepthOverrides === 'boolean') {
        department.allowCourseDepthOverrides = allowCourseDepthOverrides;
        await department.save();
      }

      res.json({
        success: true,
        data: {
          allowCourseDepthOverrides: department.allowCourseDepthOverrides || false
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
