import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiResponse } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import { PlaylistSessionService } from '@/services/progress/playlist-session.service';

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { enrollmentId } = req.params;
  const { moduleId, session } = req.body;

  if (!moduleId) {
    throw ApiError.badRequest('moduleId is required');
  }
  if (!session || typeof session !== 'object') {
    throw ApiError.badRequest('session is required and must be an object');
  }

  const result = await PlaylistSessionService.createSession(enrollmentId, moduleId, session, userId);

  res.status(201).json(ApiResponse.created(result, 'Playlist session saved'));
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { enrollmentId } = req.params;
  const moduleId = req.query.moduleId as string;

  if (!moduleId) {
    throw ApiError.badRequest('moduleId query parameter is required');
  }

  const result = await PlaylistSessionService.getSession(enrollmentId, moduleId, userId);

  res.status(200).json(ApiResponse.success(result));
});

export const updateSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { enrollmentId, sessionId } = req.params;
  const { session } = req.body;

  if (!session || typeof session !== 'object') {
    throw ApiError.badRequest('session is required and must be an object');
  }

  const result = await PlaylistSessionService.updateSession(enrollmentId, sessionId, session, userId);

  res.status(200).json(ApiResponse.success(result, 'Playlist session updated'));
});
