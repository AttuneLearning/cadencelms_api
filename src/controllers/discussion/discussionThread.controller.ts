import { Request, Response } from 'express';
import { DiscussionThreadService } from '@/services/discussion/discussionThread.service';
import { authorize } from '@/middlewares/authorize';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';

export const listThreads = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const filters = {
    moduleId: req.query.moduleId as string,
    lessonId: req.query.lessonId as string,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20
  };

  const result = await DiscussionThreadService.listThreads(courseId, filters);
  res.status(200).json(ApiResponse.success(result));
});

export const createThread = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const user = (req as any).user;
  const userType = user.userTypes?.includes('staff') ? 'staff' : 'learner';

  const thread = await DiscussionThreadService.createThread(
    courseId,
    req.body,
    user.userId,
    userType
  );
  res.status(201).json(ApiResponse.success(thread, 'Thread created successfully'));
});

export const getThread = asyncHandler(async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const thread = await DiscussionThreadService.getThread(threadId);
  res.status(200).json(ApiResponse.success(thread));
});

export const updateThread = asyncHandler(async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const user = (req as any).user;
  const canModerate = await authorize.check(user, 'content:discussions:moderate');

  const thread = await DiscussionThreadService.updateThread(
    threadId,
    req.body,
    user.userId,
    canModerate
  );
  res.status(200).json(ApiResponse.success(thread, 'Thread updated successfully'));
});

export const deleteThread = asyncHandler(async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const user = (req as any).user;
  const canModerate = await authorize.check(user, 'content:discussions:moderate');

  const thread = await DiscussionThreadService.deleteThread(
    threadId,
    user.userId,
    canModerate
  );
  res.status(200).json(ApiResponse.success(thread, 'Thread deleted successfully'));
});

export const pinThread = asyncHandler(async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const thread = await DiscussionThreadService.togglePin(threadId, req.body.isPinned);
  res.status(200).json(ApiResponse.success(thread));
});

export const lockThread = asyncHandler(async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const thread = await DiscussionThreadService.toggleLock(threadId, req.body.isLocked);
  res.status(200).json(ApiResponse.success(thread));
});

export const searchThreads = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { q, page, limit } = req.query;

  const result = await DiscussionThreadService.searchThreads(
    courseId,
    q as string,
    {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20
    }
  );
  res.status(200).json(ApiResponse.success(result));
});
