import { Request, Response } from 'express';
import { MessageService } from '@/services/messaging/message.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const filters = {
    type: req.query.type as string | undefined,
    search: req.query.search as string | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 50
  };

  if (filters.type && !['direct', 'announcement', 'reminder', 'system'].includes(filters.type)) {
    throw ApiError.badRequest('Invalid type. Must be one of: direct, announcement, reminder, system');
  }

  const result = await MessageService.listMessages(userId, filters);
  res.status(200).json(ApiResponse.success(result));
});

export const getMessageById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid message ID');
  }

  const result = await MessageService.getMessageById(id, userId);
  res.status(200).json(ApiResponse.success(result));
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { type, subject, body, recipientId, isImportant, relatedEntity } = req.body;

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    throw ApiError.badRequest('Subject is required');
  }
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    throw ApiError.badRequest('Body is required');
  }
  if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
    throw ApiError.badRequest('Valid recipientId is required');
  }

  const data = { type, subject: subject.trim(), body: body.trim(), recipientId, isImportant, relatedEntity };
  const result = await MessageService.sendMessage(data, userId);
  res.status(201).json(ApiResponse.success(result, 'Message sent successfully'));
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { messageIds } = req.body;

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    throw ApiError.badRequest('messageIds array is required');
  }

  const result = await MessageService.markAsRead(messageIds, userId);
  res.status(200).json(ApiResponse.success(result, 'Messages marked as read'));
});

export const archiveMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { messageIds } = req.body;

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    throw ApiError.badRequest('messageIds array is required');
  }

  const result = await MessageService.archiveMessages(messageIds, userId);
  res.status(200).json(ApiResponse.success(result, 'Messages archived'));
});

export const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid message ID');
  }

  await MessageService.deleteMessage(id, userId);
  res.status(200).json(ApiResponse.success(null, 'Message deleted'));
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const result = await MessageService.getUnreadCount(userId);
  res.status(200).json(ApiResponse.success(result));
});
