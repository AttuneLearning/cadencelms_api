import { Request, Response } from 'express';
import { CourseVersionModuleService } from '@/services/academic/courseVersionModule.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * CourseVersionModule Controller
 *
 * Handles endpoints for managing modules within course versions.
 *
 * Routes:
 * - GET    /api/v2/course-versions/:id/modules           - List modules for version
 * - POST   /api/v2/course-versions/:id/modules           - Add module to version
 * - DELETE /api/v2/course-versions/:id/modules/:moduleId - Remove module from version
 * - PATCH  /api/v2/course-versions/:id/modules/reorder   - Reorder modules
 * - PATCH  /api/v2/course-versions/:id/modules/:moduleId - Update module settings
 */

/**
 * GET /api/v2/course-versions/:id/modules
 * List all modules in a course version.
 *
 * Access Right: content:courses:read
 */
export const listModulesForVersion = asyncHandler(async (req: Request, res: Response) => {
  const { id: courseVersionId } = req.params;

  if (!courseVersionId) {
    throw ApiError.badRequest('Course version ID is required');
  }

  const modules = await CourseVersionModuleService.listModulesForVersion(courseVersionId);

  const moduleList = modules.map((m) => ({
    id: m._id.toString(),
    courseVersionId: m.courseVersionId.toString(),
    moduleId: m.moduleId.toString(),
    module: (m as any).moduleId?._id
      ? {
          id: (m as any).moduleId._id.toString(),
          title: (m as any).moduleId.title,
          description: (m as any).moduleId.description,
          estimatedDuration: (m as any).moduleId.estimatedDuration,
          isPublished: (m as any).moduleId.isPublished,
        }
      : null,
    order: m.order,
    isRequired: m.isRequired,
    availableFrom: m.availableFrom,
    availableUntil: m.availableUntil,
    createdAt: m.createdAt,
  }));

  res.status(200).json(
    ApiResponse.success({
      modules: moduleList,
      total: moduleList.length,
    })
  );
});

/**
 * POST /api/v2/course-versions/:id/modules
 * Add a module to a course version.
 *
 * Access Right: content:courses:manage
 *
 * Body:
 * - moduleId: string (required) - The module to add
 * - order?: number - Position in the version (auto-calculated if not provided)
 * - isRequired?: boolean - Whether module is required (default: true)
 * - availableFrom?: Date | null - When module becomes available
 * - availableUntil?: Date | null - When module availability ends
 */
export const addModuleToVersion = asyncHandler(async (req: Request, res: Response) => {
  const { id: courseVersionId } = req.params;
  const { moduleId, order, isRequired, availableFrom, availableUntil } = req.body;

  if (!courseVersionId) {
    throw ApiError.badRequest('Course version ID is required');
  }

  // Get user ID from authenticated request
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw ApiError.unauthorized('User context not found');
  }

  const versionModule = await CourseVersionModuleService.addModuleToVersion(
    courseVersionId,
    { moduleId, order, isRequired, availableFrom, availableUntil },
    userId
  );

  res.status(201).json(
    ApiResponse.success(
      {
        id: versionModule._id.toString(),
        courseVersionId: versionModule.courseVersionId.toString(),
        moduleId: versionModule.moduleId.toString(),
        order: versionModule.order,
        isRequired: versionModule.isRequired,
        availableFrom: versionModule.availableFrom,
        availableUntil: versionModule.availableUntil,
        createdAt: versionModule.createdAt,
      },
      'Module added to version successfully'
    )
  );
});

/**
 * DELETE /api/v2/course-versions/:id/modules/:moduleId
 * Remove a module from a course version.
 *
 * Access Right: content:courses:manage
 */
export const removeModuleFromVersion = asyncHandler(async (req: Request, res: Response) => {
  const { id: courseVersionId, moduleId } = req.params;

  if (!courseVersionId) {
    throw ApiError.badRequest('Course version ID is required');
  }

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  await CourseVersionModuleService.removeModuleFromVersion(courseVersionId, moduleId);

  res.status(200).json(ApiResponse.success(null, 'Module removed from version successfully'));
});

/**
 * PATCH /api/v2/course-versions/:id/modules/reorder
 * Reorder modules within a course version.
 *
 * Access Right: content:courses:manage
 *
 * Body:
 * - moduleOrder: string[] (required) - Array of module IDs in desired order
 */
export const reorderModules = asyncHandler(async (req: Request, res: Response) => {
  const { id: courseVersionId } = req.params;
  const { moduleOrder } = req.body;

  if (!courseVersionId) {
    throw ApiError.badRequest('Course version ID is required');
  }

  const modules = await CourseVersionModuleService.reorderModules(courseVersionId, moduleOrder);

  const moduleList = modules.map((m) => ({
    id: m._id.toString(),
    courseVersionId: m.courseVersionId.toString(),
    moduleId: m.moduleId.toString(),
    module: (m as any).moduleId?._id
      ? {
          id: (m as any).moduleId._id.toString(),
          title: (m as any).moduleId.title,
        }
      : null,
    order: m.order,
    isRequired: m.isRequired,
  }));

  res.status(200).json(
    ApiResponse.success(
      {
        modules: moduleList,
        total: moduleList.length,
      },
      'Modules reordered successfully'
    )
  );
});

/**
 * PATCH /api/v2/course-versions/:id/modules/:moduleId
 * Update settings for a module in a version.
 *
 * Access Right: content:courses:manage
 *
 * Body (all optional):
 * - isRequired?: boolean
 * - availableFrom?: Date | null
 * - availableUntil?: Date | null
 */
export const updateModuleSettings = asyncHandler(async (req: Request, res: Response) => {
  const { id: courseVersionId, moduleId } = req.params;
  const { isRequired, availableFrom, availableUntil } = req.body;

  if (!courseVersionId) {
    throw ApiError.badRequest('Course version ID is required');
  }

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  const versionModule = await CourseVersionModuleService.updateModuleSettings(
    courseVersionId,
    moduleId,
    { isRequired, availableFrom, availableUntil }
  );

  res.status(200).json(
    ApiResponse.success(
      {
        id: versionModule._id.toString(),
        courseVersionId: versionModule.courseVersionId.toString(),
        moduleId: versionModule.moduleId.toString(),
        order: versionModule.order,
        isRequired: versionModule.isRequired,
        availableFrom: versionModule.availableFrom,
        availableUntil: versionModule.availableUntil,
      },
      'Module settings updated successfully'
    )
  );
});
