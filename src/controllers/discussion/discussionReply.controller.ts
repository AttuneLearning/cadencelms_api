import { Request, Response } from 'express';
import { DiscussionReplyService } from '@/services/discussion/discussionReply.service';
import { authorize } from '@/middlewares/authorize';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';

export const listReplies = asyncHandler(async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const filters = {
    parentReplyId: req.query.parentReplyId as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20
  };

  const result = await DiscussionReplyService.listReplies(threadId, filters);
  res.status(200).json(ApiResponse.success(result));
});

export const createReply = asyncHandler(async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const user = (req as any).user;
  const userType = user.userTypes?.includes('staff') ? 'staff' : 'learner';

  const reply = await DiscussionReplyService.createReply(
    threadId,
    req.body,
    user.userId,
    userType
  );
  res.status(201).json(ApiResponse.success(reply, 'Reply created successfully'));
});

export const updateReply = asyncHandler(async (req: Request, res: Response) => {
  const { replyId } = req.params;
  const user = (req as any).user;
  const canModerate = await authorize.check(user, 'content:discussions:moderate');

  const reply = await DiscussionReplyService.updateReply(
    replyId,
    req.body,
    user.userId,
    canModerate
  );
  res.status(200).json(ApiResponse.success(reply, 'Reply updated successfully'));
});

export const deleteReply = asyncHandler(async (req: Request, res: Response) => {
  const { replyId } = req.params;
  const user = (req as any).user;
  const canModerate = await authorize.check(user, 'content:discussions:moderate');

  const reply = await DiscussionReplyService.deleteReply(
    replyId,
    user.userId,
    canModerate
  );
  res.status(200).json(ApiResponse.success(reply, 'Reply deleted successfully'));
});

export const markAnswer = asyncHandler(async (req: Request, res: Response) => {
  const { replyId } = req.params;
  const reply = await DiscussionReplyService.toggleInstructorAnswer(
    replyId,
    req.body.isInstructorAnswer
  );
  res.status(200).json(ApiResponse.success(reply));
});
