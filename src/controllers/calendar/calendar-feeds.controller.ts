import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiResponse } from '@/utils/ApiResponse';
import { CalendarFeedsService } from '@/services/calendar/calendar-feeds.service';

export const getLearnerFeed = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const startDate = new Date(req.query.startDate as string);
  const endDate = new Date(req.query.endDate as string);

  const events = await CalendarFeedsService.getLearnerFeed(userId, startDate, endDate);

  res.status(200).json(ApiResponse.success({ events }));
});

export const getStaffFeed = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const startDate = new Date(req.query.startDate as string);
  const endDate = new Date(req.query.endDate as string);

  const events = await CalendarFeedsService.getStaffFeed(userId, startDate, endDate);

  res.status(200).json(ApiResponse.success({ events }));
});

export const getSystemFeed = asyncHandler(async (req: Request, res: Response) => {
  const startDate = new Date(req.query.startDate as string);
  const endDate = new Date(req.query.endDate as string);

  const events = await CalendarFeedsService.getSystemFeed(startDate, endDate);

  res.status(200).json(ApiResponse.success({ events }));
});
