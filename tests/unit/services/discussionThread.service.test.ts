/**
 * Unit Tests: DiscussionThreadService
 *
 * Tests for the discussion thread service:
 * - Listing threads (paginated, filtered)
 * - Creating threads (course validation)
 * - Getting single thread by ID
 * - Updating threads (author/moderator permissions)
 * - Deleting threads (soft-delete, author/moderator permissions)
 * - Toggling pin status
 * - Toggling lock status
 * - Searching threads (text search, paginated)
 */

import mongoose from 'mongoose';
import { DiscussionThreadService } from '@/services/discussion/discussionThread.service';
import DiscussionThread from '@/models/discussion/DiscussionThread.model';
import Course from '@/models/academic/Course.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/discussion/DiscussionThread.model');
jest.mock('@/models/academic/Course.model');

describe('DiscussionThreadService', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockOtherUserId = new mongoose.Types.ObjectId().toString();
  const mockCourseId = new mongoose.Types.ObjectId().toString();
  const mockThreadId = new mongoose.Types.ObjectId().toString();
  const mockModuleId = new mongoose.Types.ObjectId().toString();

  const createMockThread = (overrides: any = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    courseId: mockCourseId,
    authorId: { toString: () => mockUserId },
    authorType: 'learner',
    title: 'Test Thread',
    body: 'This is a test thread body',
    isPinned: false,
    isLocked: false,
    replyCount: 0,
    lastReplyAt: null,
    lastReplyBy: null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────
  // listThreads
  // ──────────────────────────────────────────────────
  describe('listThreads', () => {
    let mockLean: jest.Mock;
    let mockLimit: jest.Mock;
    let mockSkip: jest.Mock;
    let mockSort: jest.Mock;
    let mockPopulate: jest.Mock;

    beforeEach(() => {
      mockLean = jest.fn();
      mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
      (DiscussionThread.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
    });

    it('should return paginated threads', async () => {
      const mockThreads = [createMockThread(), createMockThread()];
      mockLean.mockResolvedValue(mockThreads);
      (DiscussionThread.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await DiscussionThreadService.listThreads(mockCourseId);

      expect(DiscussionThread.find).toHaveBeenCalledWith({
        courseId: mockCourseId,
        isDeleted: false,
      });
      expect(mockPopulate).toHaveBeenCalledWith('authorId', 'firstName lastName email');
      expect(mockSort).toHaveBeenCalledWith({ isPinned: -1, lastReplyAt: -1, createdAt: -1 });
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(20);
      expect(result.threads).toEqual(mockThreads);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should apply moduleId filter when provided', async () => {
      mockLean.mockResolvedValue([]);
      (DiscussionThread.countDocuments as jest.Mock).mockResolvedValue(0);

      await DiscussionThreadService.listThreads(mockCourseId, { moduleId: mockModuleId });

      expect(DiscussionThread.find).toHaveBeenCalledWith({
        courseId: mockCourseId,
        isDeleted: false,
        moduleId: mockModuleId,
      });
    });

    it('should return empty array when no threads exist', async () => {
      mockLean.mockResolvedValue([]);
      (DiscussionThread.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await DiscussionThreadService.listThreads(mockCourseId);

      expect(result.threads).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it('should respect custom page and limit parameters', async () => {
      mockLean.mockResolvedValue([createMockThread()]);
      (DiscussionThread.countDocuments as jest.Mock).mockResolvedValue(25);

      const result = await DiscussionThreadService.listThreads(mockCourseId, { page: 3, limit: 5 });

      expect(mockSkip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(mockLimit).toHaveBeenCalledWith(5);
      expect(result.pagination).toEqual({
        page: 3,
        limit: 5,
        total: 25,
        totalPages: 5,
      });
    });

    it('should cap limit at 100', async () => {
      mockLean.mockResolvedValue([]);
      (DiscussionThread.countDocuments as jest.Mock).mockResolvedValue(0);

      await DiscussionThreadService.listThreads(mockCourseId, { limit: 500 });

      expect(mockLimit).toHaveBeenCalledWith(100);
    });
  });

  // ──────────────────────────────────────────────────
  // createThread
  // ──────────────────────────────────────────────────
  describe('createThread', () => {
    let mockCourseLean: jest.Mock;
    let mockSave: jest.Mock;

    beforeEach(() => {
      mockCourseLean = jest.fn();
      (Course.findOne as jest.Mock).mockReturnValue({ lean: mockCourseLean });

      mockSave = jest.fn().mockResolvedValue(undefined);
      (DiscussionThread as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockSave,
      }));
    });

    it('should create thread successfully when course exists and is published', async () => {
      mockCourseLean.mockResolvedValue({ _id: mockCourseId, status: 'published' });

      const data = { title: 'New Thread', body: 'Thread body content' };
      const result = await DiscussionThreadService.createThread(mockCourseId, data, mockUserId, 'learner');

      expect(Course.findOne).toHaveBeenCalledWith({ _id: mockCourseId, status: 'published' });
      expect(DiscussionThread).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: mockCourseId,
          authorId: mockUserId,
          authorType: 'learner',
          title: 'New Thread',
          body: 'Thread body content',
        })
      );
      expect(mockSave).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.title).toBe('New Thread');
    });

    it('should throw 404 when course not found', async () => {
      mockCourseLean.mockResolvedValue(null);

      const data = { title: 'New Thread', body: 'Thread body content' };

      await expect(
        DiscussionThreadService.createThread(mockCourseId, data, mockUserId, 'learner')
      ).rejects.toThrow(ApiError);

      await expect(
        DiscussionThreadService.createThread(mockCourseId, data, mockUserId, 'learner')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when course is not published', async () => {
      mockCourseLean.mockResolvedValue(null);

      const data = { title: 'New Thread', body: 'Thread body content' };

      await expect(
        DiscussionThreadService.createThread(mockCourseId, data, mockUserId, 'staff')
      ).rejects.toThrow(ApiError);

      await expect(
        DiscussionThreadService.createThread(mockCourseId, data, mockUserId, 'staff')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Course not found or not published',
      });
    });

    it('should create thread with staff author type', async () => {
      mockCourseLean.mockResolvedValue({ _id: mockCourseId, status: 'published' });

      const data = { title: 'Staff Thread', body: 'Staff body', moduleId: mockModuleId };
      const result = await DiscussionThreadService.createThread(mockCourseId, data, mockUserId, 'staff');

      expect(DiscussionThread).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: mockCourseId,
          authorId: mockUserId,
          authorType: 'staff',
          title: 'Staff Thread',
          body: 'Staff body',
          moduleId: mockModuleId,
        })
      );
      expect(mockSave).toHaveBeenCalled();
      expect(result.authorType).toBe('staff');
    });
  });

  // ──────────────────────────────────────────────────
  // getThread
  // ──────────────────────────────────────────────────
  describe('getThread', () => {
    let mockPopulateFindOne: jest.Mock;

    beforeEach(() => {
      mockPopulateFindOne = jest.fn();
      (DiscussionThread.findOne as jest.Mock).mockReturnValue({ populate: mockPopulateFindOne });
    });

    it('should return thread with populated author', async () => {
      const mockThread = createMockThread();
      mockPopulateFindOne.mockResolvedValue(mockThread);

      const result = await DiscussionThreadService.getThread(mockThreadId);

      expect(DiscussionThread.findOne).toHaveBeenCalledWith({
        _id: mockThreadId,
        isDeleted: false,
      });
      expect(mockPopulateFindOne).toHaveBeenCalledWith('authorId', 'firstName lastName email');
      expect(result).toEqual(mockThread);
    });

    it('should throw 404 when thread not found', async () => {
      mockPopulateFindOne.mockResolvedValue(null);

      await expect(
        DiscussionThreadService.getThread(mockThreadId)
      ).rejects.toThrow(ApiError);

      await expect(
        DiscussionThreadService.getThread(mockThreadId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Thread not found' });
    });

    it('should throw 404 for invalid ObjectId', async () => {
      await expect(
        DiscussionThreadService.getThread('invalid-id')
      ).rejects.toThrow(ApiError);

      await expect(
        DiscussionThreadService.getThread('invalid-id')
      ).rejects.toMatchObject({ statusCode: 404, message: 'Thread not found' });

      expect(DiscussionThread.findOne).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────
  // updateThread
  // ──────────────────────────────────────────────────
  describe('updateThread', () => {
    it('should allow author to edit own thread', async () => {
      const mockThread = createMockThread({ authorId: { toString: () => mockUserId } });
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(mockThread);

      const data = { title: 'Updated Title', body: 'Updated body' };
      const result = await DiscussionThreadService.updateThread(mockThreadId, data, mockUserId, false);

      expect(DiscussionThread.findOne).toHaveBeenCalledWith({ _id: mockThreadId, isDeleted: false });
      expect(mockThread.title).toBe('Updated Title');
      expect(mockThread.body).toBe('Updated body');
      expect(mockThread.save).toHaveBeenCalled();
      expect(result).toEqual(mockThread);
    });

    it('should allow moderator to edit any thread', async () => {
      const mockThread = createMockThread({ authorId: { toString: () => mockOtherUserId } });
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(mockThread);

      const data = { title: 'Moderator Edit' };
      const result = await DiscussionThreadService.updateThread(mockThreadId, data, mockUserId, true);

      expect(mockThread.title).toBe('Moderator Edit');
      expect(mockThread.save).toHaveBeenCalled();
      expect(result).toEqual(mockThread);
    });

    it('should throw 404 when thread not found for update', async () => {
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(null);

      const data = { title: 'Updated Title' };

      await expect(
        DiscussionThreadService.updateThread(mockThreadId, data, mockUserId, false)
      ).rejects.toThrow(ApiError);

      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        DiscussionThreadService.updateThread(mockThreadId, data, mockUserId, false)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Thread not found' });
    });

    it('should throw 403 when non-author and non-moderator tries to edit', async () => {
      const mockThread = createMockThread({ authorId: { toString: () => mockOtherUserId } });
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(mockThread);

      const data = { title: 'Unauthorized Edit' };

      await expect(
        DiscussionThreadService.updateThread(mockThreadId, data, mockUserId, false)
      ).rejects.toThrow(ApiError);

      // Re-mock since the previous call consumed it
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(
        createMockThread({ authorId: { toString: () => mockOtherUserId } })
      );

      await expect(
        DiscussionThreadService.updateThread(mockThreadId, data, mockUserId, false)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'You do not have permission to edit this thread',
      });
    });
  });

  // ──────────────────────────────────────────────────
  // deleteThread
  // ──────────────────────────────────────────────────
  describe('deleteThread', () => {
    it('should allow author to soft-delete own thread', async () => {
      const mockThread = createMockThread({ authorId: { toString: () => mockUserId } });
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(mockThread);

      const result = await DiscussionThreadService.deleteThread(mockThreadId, mockUserId, false);

      expect(DiscussionThread.findOne).toHaveBeenCalledWith({ _id: mockThreadId, isDeleted: false });
      expect(mockThread.isDeleted).toBe(true);
      expect(mockThread.deletedAt).toBeInstanceOf(Date);
      expect(mockThread.deletedBy).toBeDefined();
      expect(mockThread.save).toHaveBeenCalled();
      expect(result).toEqual(mockThread);
    });

    it('should allow moderator to soft-delete any thread', async () => {
      const mockThread = createMockThread({ authorId: { toString: () => mockOtherUserId } });
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(mockThread);

      const result = await DiscussionThreadService.deleteThread(mockThreadId, mockUserId, true);

      expect(mockThread.isDeleted).toBe(true);
      expect(mockThread.deletedAt).toBeInstanceOf(Date);
      expect(mockThread.save).toHaveBeenCalled();
      expect(result).toEqual(mockThread);
    });

    it('should throw 404 when thread not found for delete', async () => {
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        DiscussionThreadService.deleteThread(mockThreadId, mockUserId, false)
      ).rejects.toThrow(ApiError);

      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        DiscussionThreadService.deleteThread(mockThreadId, mockUserId, false)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Thread not found' });
    });

    it('should throw 403 when non-author and non-moderator tries to delete', async () => {
      const mockThread = createMockThread({ authorId: { toString: () => mockOtherUserId } });
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(mockThread);

      await expect(
        DiscussionThreadService.deleteThread(mockThreadId, mockUserId, false)
      ).rejects.toThrow(ApiError);

      // Re-mock since the previous call consumed it
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(
        createMockThread({ authorId: { toString: () => mockOtherUserId } })
      );

      await expect(
        DiscussionThreadService.deleteThread(mockThreadId, mockUserId, false)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'You do not have permission to delete this thread',
      });
    });
  });

  // ──────────────────────────────────────────────────
  // togglePin
  // ──────────────────────────────────────────────────
  describe('togglePin', () => {
    it('should successfully toggle pin status', async () => {
      const mockThread = createMockThread({ isPinned: true });
      (DiscussionThread.findOneAndUpdate as jest.Mock).mockResolvedValue(mockThread);

      const result = await DiscussionThreadService.togglePin(mockThreadId, true);

      expect(DiscussionThread.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockThreadId, isDeleted: false },
        { isPinned: true },
        { new: true }
      );
      expect(result).toEqual(mockThread);
    });

    it('should throw 404 when thread not found', async () => {
      (DiscussionThread.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        DiscussionThreadService.togglePin(mockThreadId, true)
      ).rejects.toThrow(ApiError);

      (DiscussionThread.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        DiscussionThreadService.togglePin(mockThreadId, true)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Thread not found' });
    });
  });

  // ──────────────────────────────────────────────────
  // toggleLock
  // ──────────────────────────────────────────────────
  describe('toggleLock', () => {
    it('should successfully toggle lock status', async () => {
      const mockThread = createMockThread({ isLocked: true });
      (DiscussionThread.findOneAndUpdate as jest.Mock).mockResolvedValue(mockThread);

      const result = await DiscussionThreadService.toggleLock(mockThreadId, true);

      expect(DiscussionThread.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockThreadId, isDeleted: false },
        { isLocked: true },
        { new: true }
      );
      expect(result).toEqual(mockThread);
    });

    it('should throw 404 when thread not found', async () => {
      (DiscussionThread.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        DiscussionThreadService.toggleLock(mockThreadId, false)
      ).rejects.toThrow(ApiError);

      (DiscussionThread.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        DiscussionThreadService.toggleLock(mockThreadId, false)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Thread not found' });
    });
  });

  // ──────────────────────────────────────────────────
  // searchThreads
  // ──────────────────────────────────────────────────
  describe('searchThreads', () => {
    let mockLean: jest.Mock;
    let mockLimit: jest.Mock;
    let mockSkip: jest.Mock;
    let mockSort: jest.Mock;
    let mockPopulate: jest.Mock;

    beforeEach(() => {
      mockLean = jest.fn();
      mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
      (DiscussionThread.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
    });

    it('should return paginated search results', async () => {
      const mockThreads = [createMockThread({ title: 'Matching Thread' })];
      mockLean.mockResolvedValue(mockThreads);
      (DiscussionThread.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await DiscussionThreadService.searchThreads(mockCourseId, 'Matching');

      expect(DiscussionThread.find).toHaveBeenCalledWith({
        $text: { $search: 'Matching' },
        courseId: mockCourseId,
        isDeleted: false,
      });
      expect(mockPopulate).toHaveBeenCalledWith('authorId', 'firstName lastName email');
      expect(mockSort).toHaveBeenCalledWith({ score: { $meta: 'textScore' } });
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(20);
      expect(result.threads).toEqual(mockThreads);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should return empty results when no matches found', async () => {
      mockLean.mockResolvedValue([]);
      (DiscussionThread.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await DiscussionThreadService.searchThreads(mockCourseId, 'nonexistent');

      expect(result.threads).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });
});
