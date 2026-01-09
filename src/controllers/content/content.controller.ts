import { Request, Response } from 'express';
import { ContentService } from '@/services/content/content.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Content Controller
 * Handles all content library endpoints (Overview, SCORM, Media)
 */

/**
 * =====================
 * CONTENT OVERVIEW
 * =====================
 */

/**
 * GET /api/v2/content
 * List all content items
 */
export const listContent = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  const filters = {
    type: req.query.type as 'scorm' | 'media' | 'exercise' | undefined,
    departmentId: req.query.departmentId as string | undefined,
    status: req.query.status as 'draft' | 'published' | 'archived' | undefined,
    search: req.query.search as string | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate type if provided
  if (filters.type && !['scorm', 'media', 'exercise'].includes(filters.type)) {
    throw ApiError.badRequest('Invalid type. Must be one of: scorm, media, exercise');
  }

  // Validate status if provided
  if (filters.status && !['draft', 'published', 'archived'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: draft, published, archived');
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  const result = await ContentService.listAllContent(filters, user.userId);
  res.status(200).json(ApiResponse.success({ data: result }));
});

/**
 * GET /api/v2/content/:id
 * Get content item details
 */
export const getContent = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const result = await ContentService.getContentById(id, user.userId);
  res.status(200).json(ApiResponse.success({ data: result }));
});

/**
 * =====================
 * SCORM PACKAGES
 * =====================
 */

/**
 * GET /api/v2/content/scorm
 * List SCORM packages
 */
export const listScorm = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  const filters = {
    departmentId: req.query.departmentId as string | undefined,
    status: req.query.status as 'draft' | 'published' | 'archived' | undefined,
    version: req.query.version as '1.2' | '2004' | undefined,
    search: req.query.search as string | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate version if provided
  if (filters.version && !['1.2', '2004'].includes(filters.version)) {
    throw ApiError.badRequest('Invalid version. Must be one of: 1.2, 2004');
  }

  // Validate status if provided
  if (filters.status && !['draft', 'published', 'archived'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: draft, published, archived');
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  const result = await ContentService.listScormPackages(filters, user.userId);
  res.status(200).json(ApiResponse.success({ data: result }));
});

/**
 * POST /api/v2/content/scorm
 * Upload SCORM package
 */
export const uploadScorm = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  // Validate file presence
  if (!files?.file || !files.file[0]) {
    throw ApiError.badRequest('SCORM package file is required');
  }

  // Validate title if provided
  if (req.body.title && req.body.title.length > 200) {
    throw ApiError.badRequest('Title cannot exceed 200 characters');
  }

  // Validate description if provided
  if (req.body.description && req.body.description.length > 2000) {
    throw ApiError.badRequest('Description cannot exceed 2000 characters');
  }

  const data = {
    file: files.file[0],
    title: req.body.title,
    description: req.body.description,
    departmentId: req.body.departmentId,
    thumbnail: files?.thumbnail?.[0],
    uploadedBy: user.userId
  };

  const result = await ContentService.uploadScormPackage(data);
  res.status(201).json(
    ApiResponse.success(
      { data: result },
      'SCORM package uploaded and extracted successfully'
    )
  );
});

/**
 * GET /api/v2/content/scorm/:id
 * Get SCORM package details
 */
export const getScorm = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const result = await ContentService.getScormPackageById(id, user.userId);
  res.status(200).json(ApiResponse.success({ data: result }));
});

/**
 * PUT /api/v2/content/scorm/:id
 * Update SCORM package metadata
 */
export const updateScorm = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { title, description, departmentId, thumbnailUrl } = req.body;

  // Validate title if provided
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw ApiError.badRequest('Title must be a non-empty string');
    }
    if (title.length > 200) {
      throw ApiError.badRequest('Title cannot exceed 200 characters');
    }
  }

  // Validate description if provided
  if (description !== undefined && typeof description !== 'string') {
    throw ApiError.badRequest('Description must be a string');
  }

  if (description && description.length > 2000) {
    throw ApiError.badRequest('Description cannot exceed 2000 characters');
  }

  // Validate thumbnailUrl if provided
  if (thumbnailUrl !== undefined && typeof thumbnailUrl !== 'string') {
    throw ApiError.badRequest('Thumbnail URL must be a string');
  }

  const updateData = {
    title: title !== undefined ? title.trim() : undefined,
    description,
    departmentId,
    thumbnailUrl
  };

  const result = await ContentService.updateScormPackage(id, updateData, user.userId);
  res.status(200).json(
    ApiResponse.success({ data: result }, 'SCORM package metadata updated successfully')
  );
});

/**
 * DELETE /api/v2/content/scorm/:id
 * Delete SCORM package
 */
export const deleteScorm = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  await ContentService.deleteScormPackage(id, user.userId);
  res.status(200).json(ApiResponse.success(null, 'SCORM package deleted successfully'));
});

/**
 * POST /api/v2/content/scorm/:id/launch
 * Launch SCORM player
 */
export const launchScorm = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { courseContentId, resumeAttempt } = req.body;

  // Validate resumeAttempt if provided
  if (resumeAttempt !== undefined && typeof resumeAttempt !== 'boolean') {
    throw ApiError.badRequest('resumeAttempt must be a boolean');
  }

  const data = {
    courseContentId,
    resumeAttempt: resumeAttempt || false,
    userId: user.userId
  };

  const result = await ContentService.launchScormPackage(id, data);
  res.status(200).json(ApiResponse.success({ data: result }));
});

/**
 * POST /api/v2/content/scorm/:id/publish
 * Publish SCORM package
 */
export const publishScorm = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { publishedAt } = req.body;

  // Validate publishedAt if provided
  let publishedAtDate: Date | undefined;
  if (publishedAt !== undefined) {
    publishedAtDate = new Date(publishedAt);
    if (isNaN(publishedAtDate.getTime())) {
      throw ApiError.badRequest('publishedAt must be a valid ISO 8601 date');
    }
  }

  const result = await ContentService.publishScormPackage(id, user.userId, publishedAtDate);
  res.status(200).json(
    ApiResponse.success({ data: result }, 'SCORM package published successfully')
  );
});

/**
 * POST /api/v2/content/scorm/:id/unpublish
 * Unpublish SCORM package
 */
export const unpublishScorm = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const result = await ContentService.unpublishScormPackage(id, user.userId);
  res.status(200).json(
    ApiResponse.success({ data: result }, 'SCORM package unpublished successfully')
  );
});

/**
 * =====================
 * MEDIA LIBRARY
 * =====================
 */

/**
 * GET /api/v2/content/media
 * List media files
 */
export const listMedia = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  const filters = {
    type: req.query.type as 'video' | 'audio' | 'image' | 'document' | undefined,
    departmentId: req.query.departmentId as string | undefined,
    search: req.query.search as string | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate type if provided
  if (filters.type && !['video', 'audio', 'image', 'document'].includes(filters.type)) {
    throw ApiError.badRequest('Invalid type. Must be one of: video, audio, image, document');
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  const result = await ContentService.listMediaFiles(filters, user.userId);
  res.status(200).json(ApiResponse.success({ data: result }));
});

/**
 * POST /api/v2/content/media
 * Upload media file
 */
export const uploadMedia = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  // Validate file presence
  if (!req.file) {
    throw ApiError.badRequest('Media file is required');
  }

  // Validate required fields
  if (!req.body.title || typeof req.body.title !== 'string' || req.body.title.trim().length === 0) {
    throw ApiError.badRequest('Title is required and must be a non-empty string');
  }

  if (req.body.title.length > 200) {
    throw ApiError.badRequest('Title cannot exceed 200 characters');
  }

  if (!req.body.type || typeof req.body.type !== 'string') {
    throw ApiError.badRequest('Type is required');
  }

  // Validate type
  if (!['video', 'audio', 'image', 'document'].includes(req.body.type)) {
    throw ApiError.badRequest('Invalid type. Must be one of: video, audio, image, document');
  }

  // Validate description if provided
  if (req.body.description && req.body.description.length > 2000) {
    throw ApiError.badRequest('Description cannot exceed 2000 characters');
  }

  const data = {
    file: req.file,
    title: req.body.title.trim(),
    description: req.body.description,
    departmentId: req.body.departmentId,
    type: req.body.type as 'video' | 'audio' | 'image' | 'document',
    uploadedBy: user.userId
  };

  const result = await ContentService.uploadMediaFile(data);
  res.status(201).json(
    ApiResponse.success({ data: result }, 'Media file uploaded successfully')
  );
});

/**
 * GET /api/v2/content/media/:id
 * Get media file details
 */
export const getMedia = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const result = await ContentService.getMediaFileById(id, user.userId);
  res.status(200).json(ApiResponse.success({ data: result }));
});

/**
 * PUT /api/v2/content/media/:id
 * Update media metadata
 */
export const updateMedia = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { title, description, departmentId } = req.body;

  // Validate title if provided
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw ApiError.badRequest('Title must be a non-empty string');
    }
    if (title.length > 200) {
      throw ApiError.badRequest('Title cannot exceed 200 characters');
    }
  }

  // Validate description if provided
  if (description !== undefined && typeof description !== 'string') {
    throw ApiError.badRequest('Description must be a string');
  }

  if (description && description.length > 2000) {
    throw ApiError.badRequest('Description cannot exceed 2000 characters');
  }

  const updateData = {
    title: title !== undefined ? title.trim() : undefined,
    description,
    departmentId
  };

  const result = await ContentService.updateMediaFile(id, updateData, user.userId);
  res.status(200).json(
    ApiResponse.success({ data: result }, 'Media metadata updated successfully')
  );
});

/**
 * DELETE /api/v2/content/media/:id
 * Delete media file
 */
export const deleteMedia = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  await ContentService.deleteMediaFile(id, user.userId);
  res.status(200).json(ApiResponse.success(null, 'Media file deleted successfully'));
});
