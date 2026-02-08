import { Request, Response } from 'express';
import { CourseVersionService } from '@/services/academic/courseVersion.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * CourseVersion Controller
 *
 * Handles endpoints for course versioning operations.
 *
 * Routes:
 * - POST /api/v2/courses/:id/versions - Create new draft version
 * - GET /api/v2/courses/:id/versions - List all versions
 * - GET /api/v2/course-versions/:id - Get specific version
 * - PATCH /api/v2/course-versions/:id - Update draft version
 * - POST /api/v2/course-versions/:id/publish - Publish a version
 * - POST /api/v2/course-versions/:id/lock - Lock a version
 */

/**
 * POST /api/v2/courses/:id/versions
 * Create a new draft version from the current published version.
 *
 * Access Right: content:courses:manage
 * Roles: instructor (own drafts), department-admin (all)
 */
export const createVersion = asyncHandler(async (req: Request, res: Response) => {
  const { id: canonicalCourseId } = req.params;
  const { changeNotes } = req.body;

  if (!canonicalCourseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Get user ID from authenticated request
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw ApiError.unauthorized('User context not found');
  }

  const version = await CourseVersionService.createVersion(
    canonicalCourseId,
    changeNotes || null,
    userId
  );

  res.status(201).json(
    ApiResponse.success(
      {
        id: version._id.toString(),
        canonicalCourseId: version.canonicalCourseId.toString(),
        version: version.version,
        title: version.title,
        description: version.description,
        status: version.status,
        isLocked: version.isLocked,
        isLatest: version.isLatest,
        parentVersionId: version.parentVersionId?.toString() || null,
        changeNotes: version.changeNotes,
        createdAt: version.createdAt,
        createdBy: version.createdBy.toString()
      },
      'Draft version created successfully'
    )
  );
});

/**
 * GET /api/v2/courses/:id/versions
 * List all versions for a canonical course.
 *
 * Access Right: content:courses:read
 * Roles: instructor, content-admin, department-admin
 */
export const listVersions = asyncHandler(async (req: Request, res: Response) => {
  const { id: canonicalCourseId } = req.params;

  if (!canonicalCourseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  const versions = await CourseVersionService.listVersions(canonicalCourseId);

  const versionList = versions.map(v => ({
    id: v._id.toString(),
    canonicalCourseId: v.canonicalCourseId.toString(),
    version: v.version,
    title: v.title,
    status: v.status,
    isLocked: v.isLocked,
    isLatest: v.isLatest,
    credits: v.credits,
    duration: v.duration,
    createdAt: v.createdAt,
    publishedAt: v.publishedAt,
    lockedAt: v.lockedAt,
    lockedReason: v.lockedReason
  }));

  res.status(200).json(
    ApiResponse.success({
      versions: versionList,
      total: versionList.length
    })
  );
});

/**
 * GET /api/v2/course-versions/:id
 * Get detailed information about a specific course version.
 *
 * Access Right: content:courses:read
 * Roles: instructor, content-admin, department-admin
 */
export const getVersion = asyncHandler(async (req: Request, res: Response) => {
  const { id: versionId } = req.params;

  if (!versionId) {
    throw ApiError.badRequest('Version ID is required');
  }

  const version = await CourseVersionService.getVersion(versionId);

  res.status(200).json(
    ApiResponse.success({
      id: version._id.toString(),
      canonicalCourseId: version.canonicalCourseId.toString(),
      version: version.version,
      title: version.title,
      description: version.description,
      credits: version.credits,
      duration: version.duration,
      settings: version.settings,
      instructorIds: version.instructorIds.map(id => id.toString()),
      status: version.status,
      isLocked: version.isLocked,
      isLatest: version.isLatest,
      parentVersionId: version.parentVersionId?.toString() || null,
      createdBy: version.createdBy.toString(),
      createdAt: version.createdAt,
      publishedAt: version.publishedAt,
      publishedBy: version.publishedBy?.toString() || null,
      lockedAt: version.lockedAt,
      lockedBy: version.lockedBy?.toString() || null,
      lockedReason: version.lockedReason,
      changeNotes: version.changeNotes,
      statsAtLock: version.statsAtLock
    })
  );
});

/**
 * PATCH /api/v2/course-versions/:id
 * Update a draft course version.
 *
 * Access Right: content:courses:manage
 * Roles: instructor (own drafts), department-admin (all)
 */
export const updateDraft = asyncHandler(async (req: Request, res: Response) => {
  const { id: versionId } = req.params;
  const updates = req.body;

  if (!versionId) {
    throw ApiError.badRequest('Version ID is required');
  }

  const version = await CourseVersionService.updateDraft(versionId, updates);

  res.status(200).json(
    ApiResponse.success(
      {
        id: version._id.toString(),
        canonicalCourseId: version.canonicalCourseId.toString(),
        version: version.version,
        title: version.title,
        description: version.description,
        credits: version.credits,
        duration: version.duration,
        settings: version.settings,
        instructorIds: version.instructorIds.map(id => id.toString()),
        status: version.status,
        isLocked: version.isLocked,
        isLatest: version.isLatest,
        changeNotes: version.changeNotes,
        updatedAt: version.updatedAt
      },
      'Draft version updated successfully'
    )
  );
});

/**
 * POST /api/v2/course-versions/:id/publish
 * Publish a course version.
 *
 * This will:
 * 1. Lock the current published version (if any)
 * 2. Set this version as published
 * 3. Update the canonical course references
 * 4. Emit a 'course.version.published' event
 *
 * Access Right: content:courses:manage
 * Roles: department-admin
 */
export const publishVersion = asyncHandler(async (req: Request, res: Response) => {
  const { id: versionId } = req.params;

  if (!versionId) {
    throw ApiError.badRequest('Version ID is required');
  }

  // Get user ID from authenticated request
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw ApiError.unauthorized('User context not found');
  }

  const version = await CourseVersionService.publishVersion(versionId, userId);

  res.status(200).json(
    ApiResponse.success(
      {
        id: version._id.toString(),
        canonicalCourseId: version.canonicalCourseId.toString(),
        version: version.version,
        title: version.title,
        status: version.status,
        isLocked: version.isLocked,
        isLatest: version.isLatest,
        publishedAt: version.publishedAt,
        publishedBy: version.publishedBy?.toString() || null
      },
      'Course version published successfully'
    )
  );
});

/**
 * POST /api/v2/course-versions/:id/lock
 * Manually lock a course version.
 *
 * Access Right: content:courses:manage
 * Roles: department-admin
 */
export const lockVersion = asyncHandler(async (req: Request, res: Response) => {
  const { id: versionId } = req.params;
  const { reason } = req.body;

  if (!versionId) {
    throw ApiError.badRequest('Version ID is required');
  }

  // Get user ID from authenticated request
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw ApiError.unauthorized('User context not found');
  }

  const version = await CourseVersionService.lockVersion(
    versionId,
    reason || 'manual',
    userId
  );

  res.status(200).json(
    ApiResponse.success(
      {
        id: version._id.toString(),
        canonicalCourseId: version.canonicalCourseId.toString(),
        version: version.version,
        title: version.title,
        status: version.status,
        isLocked: version.isLocked,
        lockedAt: version.lockedAt,
        lockedBy: version.lockedBy?.toString() || null,
        lockedReason: version.lockedReason,
        statsAtLock: version.statsAtLock
      },
      'Course version locked successfully'
    )
  );
});
