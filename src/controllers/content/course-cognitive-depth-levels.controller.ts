import { Request, Response, NextFunction } from 'express';
import CognitiveDepthLevelsService from '@/services/content/cognitive-depth-levels.service';
import { ApiError } from '@/utils/ApiError';

/**
 * Course Cognitive Depth Levels Controller
 *
 * Handles course-level cognitive depth overrides.
 * Allows courses to customize adaptive learning thresholds when department permits.
 */

export class CourseCognitiveDepthLevelsController {
  /**
   * GET /api/v2/courses/:courseId/cognitive-depth-levels
   * Get cognitive depth levels for a course (merged: system + department + course)
   */
  static async getForCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courseId } = req.params;

      const result = await CognitiveDepthLevelsService.getForCourse(courseId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v2/courses/:courseId/cognitive-depth-levels/:slug
   * Create or update a course-level override for a depth level
   */
  static async upsertOverride(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courseId, slug } = req.params;
      const { advanceThreshold, minAttempts, description } = req.body;
      const userId = (req as any).user?.id || (req as any).user?.userId;

      if (!userId) {
        throw ApiError.unauthorized('User not authenticated');
      }

      const level = await CognitiveDepthLevelsService.upsertCourseOverride(
        courseId,
        slug,
        { advanceThreshold, minAttempts, description },
        userId
      );

      res.json({
        success: true,
        message: 'Course override created/updated successfully',
        data: level
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v2/courses/:courseId/cognitive-depth-levels/:slug
   * Delete a course-level override (reverts to department/system)
   */
  static async deleteOverride(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courseId, slug } = req.params;

      await CognitiveDepthLevelsService.deleteCourseOverride(courseId, slug);

      res.json({
        success: true,
        message: 'Course override removed, reverting to department settings'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v2/courses/:courseId/cognitive-depth-levels
   * Delete all course-level overrides
   */
  static async deleteAllOverrides(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courseId } = req.params;

      const result = await CognitiveDepthLevelsService.deleteAllCourseOverrides(courseId);

      res.json({
        success: true,
        message: 'All course overrides removed',
        data: { deleted: result.deleted }
      });
    } catch (error) {
      next(error);
    }
  }
}
