import mongoose from 'mongoose';
import { DiscussionReplyService } from '@/services/discussion/discussionReply.service';
import DiscussionReply from '@/models/discussion/DiscussionReply.model';
import DiscussionThread from '@/models/discussion/DiscussionThread.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/discussion/DiscussionReply.model');
jest.mock('@/models/discussion/DiscussionThread.model');

describe('DiscussionReplyService', () => {
  const mockThreadId = new mongoose.Types.ObjectId().toString();
  const mockReplyId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockOtherUserId = new mongoose.Types.ObjectId().toString();
  const mockParentReplyId = new mongoose.Types.ObjectId().toString();

  const createMockReply = (overrides: any = {}) => ({
    _id: new mongoose.Types.ObjectId(mockReplyId),
    threadId: new mongoose.Types.ObjectId(mockThreadId),
    authorId: { toString: () => mockUserId },
    authorType: 'learner',
    body: 'This is a reply',
    parentReplyId: null,
    isInstructorAnswer: false,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides
  });

  const createMockThread = (overrides: any = {}) => ({
    _id: new mongoose.Types.ObjectId(mockThreadId),
    courseId: new mongoose.Types.ObjectId(),
    authorId: new mongoose.Types.ObjectId(),
    title: 'Test Thread',
    body: 'Thread body',
    isLocked: false,
    isDeleted: false,
    replyCount: 0,
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // listReplies
  // ===========================================================================
  describe('listReplies', () => {
    it('should return paginated replies', async () => {
      const mockReplies = [createMockReply(), createMockReply({ _id: new mongoose.Types.ObjectId() })];

      // Thread exists check (lean)
      const mockThreadLean = jest.fn().mockResolvedValue(createMockThread());
      (DiscussionThread.findOne as jest.Mock).mockReturnValue({ lean: mockThreadLean });

      // Reply find chain
      const mockLean = jest.fn().mockResolvedValue(mockReplies);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
      (DiscussionReply.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (DiscussionReply.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await DiscussionReplyService.listReplies(mockThreadId);

      expect(DiscussionThread.findOne).toHaveBeenCalledWith({ _id: mockThreadId, isDeleted: false });
      expect(DiscussionReply.find).toHaveBeenCalledWith({
        threadId: mockThreadId,
        isDeleted: false
      });
      expect(mockPopulate).toHaveBeenCalledWith('authorId', 'firstName lastName email');
      expect(mockSort).toHaveBeenCalledWith({ createdAt: 1 });
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(20);
      expect(result.replies).toEqual(mockReplies);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
      });
    });

    it('should filter by parentReplyId when provided', async () => {
      const mockThreadLean = jest.fn().mockResolvedValue(createMockThread());
      (DiscussionThread.findOne as jest.Mock).mockReturnValue({ lean: mockThreadLean });

      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
      (DiscussionReply.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (DiscussionReply.countDocuments as jest.Mock).mockResolvedValue(0);

      await DiscussionReplyService.listReplies(mockThreadId, { parentReplyId: mockParentReplyId });

      expect(DiscussionReply.find).toHaveBeenCalledWith({
        threadId: mockThreadId,
        isDeleted: false,
        parentReplyId: mockParentReplyId
      });
    });

    it('should throw 404 when thread not found', async () => {
      const mockThreadLean = jest.fn().mockResolvedValue(null);
      (DiscussionThread.findOne as jest.Mock).mockReturnValue({ lean: mockThreadLean });

      await expect(
        DiscussionReplyService.listReplies(mockThreadId)
      ).rejects.toThrow(ApiError);

      await expect(
        DiscussionReplyService.listReplies(mockThreadId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Thread not found' });
    });

    it('should throw 404 for invalid threadId', async () => {
      await expect(
        DiscussionReplyService.listReplies('invalid-id')
      ).rejects.toMatchObject({ statusCode: 404, message: 'Thread not found' });

      expect(DiscussionThread.findOne).not.toHaveBeenCalled();
    });

    it('should respect custom page and limit parameters', async () => {
      const mockThreadLean = jest.fn().mockResolvedValue(createMockThread());
      (DiscussionThread.findOne as jest.Mock).mockReturnValue({ lean: mockThreadLean });

      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
      (DiscussionReply.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (DiscussionReply.countDocuments as jest.Mock).mockResolvedValue(50);

      const result = await DiscussionReplyService.listReplies(mockThreadId, { page: 3, limit: 10 });

      expect(mockSkip).toHaveBeenCalledWith(20);
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 50,
        totalPages: 5
      });
    });
  });

  // ===========================================================================
  // createReply
  // ===========================================================================
  describe('createReply', () => {
    it('should create a reply and increment replyCount', async () => {
      const mockThread = createMockThread();
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(mockThread);
      (DiscussionThread.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const mockSave = jest.fn().mockResolvedValue(undefined);
      (DiscussionReply as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockSave
      }));

      const result = await DiscussionReplyService.createReply(
        mockThreadId,
        { body: 'New reply' },
        mockUserId,
        'learner'
      );

      expect(DiscussionThread.findOne).toHaveBeenCalledWith({ _id: mockThreadId, isDeleted: false });
      expect(mockSave).toHaveBeenCalled();
      expect(DiscussionThread.updateOne).toHaveBeenCalledWith(
        { _id: mockThreadId },
        expect.objectContaining({
          $inc: { replyCount: 1 },
          $set: expect.objectContaining({
            lastReplyBy: expect.any(mongoose.Types.ObjectId)
          })
        })
      );
      expect(result.body).toBe('New reply');
      expect(result.threadId).toBe(mockThreadId);
      expect(result.authorId).toBe(mockUserId);
      expect(result.authorType).toBe('learner');
    });

    it('should throw 404 for invalid threadId on create', async () => {
      await expect(
        DiscussionReplyService.createReply('invalid-id', { body: 'Reply' }, mockUserId, 'learner')
      ).rejects.toMatchObject({ statusCode: 404, message: 'Thread not found' });

      expect(DiscussionThread.findOne).not.toHaveBeenCalled();
    });

    it('should throw 403 when thread is locked', async () => {
      const mockThread = createMockThread({ isLocked: true });
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(mockThread);

      await expect(
        DiscussionReplyService.createReply(mockThreadId, { body: 'Reply' }, mockUserId, 'learner')
      ).rejects.toThrow(ApiError);

      await expect(
        DiscussionReplyService.createReply(mockThreadId, { body: 'Reply' }, mockUserId, 'learner')
      ).rejects.toMatchObject({ statusCode: 403, message: 'This thread is locked' });
    });

    it('should validate parentReplyId exists when provided', async () => {
      const mockThread = createMockThread();
      (DiscussionThread.findOne as jest.Mock).mockResolvedValue(mockThread);

      // Parent reply check uses findOne().lean()
      const mockParentLean = jest.fn().mockResolvedValue(null);
      (DiscussionReply.findOne as jest.Mock).mockReturnValue({ lean: mockParentLean });

      await expect(
        DiscussionReplyService.createReply(
          mockThreadId,
          { body: 'Reply', parentReplyId: mockParentReplyId },
          mockUserId,
          'learner'
        )
      ).rejects.toThrow(ApiError);

      await expect(
        DiscussionReplyService.createReply(
          mockThreadId,
          { body: 'Reply', parentReplyId: mockParentReplyId },
          mockUserId,
          'learner'
        )
      ).rejects.toMatchObject({ statusCode: 404, message: 'Parent reply not found' });

      expect(DiscussionReply.findOne).toHaveBeenCalledWith({
        _id: mockParentReplyId,
        threadId: mockThreadId,
        isDeleted: false
      });
    });
  });

  // ===========================================================================
  // updateReply
  // ===========================================================================
  describe('updateReply', () => {
    it('should allow the author to edit their own reply', async () => {
      const mockReply = createMockReply();
      (DiscussionReply.findOne as jest.Mock).mockResolvedValue(mockReply);

      const result = await DiscussionReplyService.updateReply(
        mockReplyId,
        { body: 'Updated body' },
        mockUserId,
        false
      );

      expect(DiscussionReply.findOne).toHaveBeenCalledWith({ _id: mockReplyId, isDeleted: false });
      expect(result.body).toBe('Updated body');
      expect(mockReply.save).toHaveBeenCalled();
    });

    it('should allow a moderator to edit any reply', async () => {
      const mockReply = createMockReply();
      (DiscussionReply.findOne as jest.Mock).mockResolvedValue(mockReply);

      const result = await DiscussionReplyService.updateReply(
        mockReplyId,
        { body: 'Moderator edit' },
        mockOtherUserId,
        true
      );

      expect(result.body).toBe('Moderator edit');
      expect(mockReply.save).toHaveBeenCalled();
    });

    it('should throw 404 when reply not found for update', async () => {
      (DiscussionReply.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        DiscussionReplyService.updateReply(mockReplyId, { body: 'Updated' }, mockUserId, false)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Reply not found' });
    });

    it('should throw 403 when non-author and non-moderator tries to edit', async () => {
      const mockReply = createMockReply();
      (DiscussionReply.findOne as jest.Mock).mockResolvedValue(mockReply);

      await expect(
        DiscussionReplyService.updateReply(mockReplyId, { body: 'Hacked' }, mockOtherUserId, false)
      ).rejects.toThrow(ApiError);

      await expect(
        DiscussionReplyService.updateReply(mockReplyId, { body: 'Hacked' }, mockOtherUserId, false)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'You do not have permission to edit this reply'
      });
    });
  });

  // ===========================================================================
  // deleteReply
  // ===========================================================================
  describe('deleteReply', () => {
    it('should allow the author to soft-delete and decrement replyCount', async () => {
      const mockReply = createMockReply();
      (DiscussionReply.findOne as jest.Mock).mockResolvedValue(mockReply);
      (DiscussionThread.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const result = await DiscussionReplyService.deleteReply(mockReplyId, mockUserId, false);

      expect(DiscussionReply.findOne).toHaveBeenCalledWith({ _id: mockReplyId, isDeleted: false });
      expect(result.isDeleted).toBe(true);
      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(result.deletedBy).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(mockReply.save).toHaveBeenCalled();
      expect(DiscussionThread.updateOne).toHaveBeenCalledWith(
        { _id: mockReply.threadId },
        { $inc: { replyCount: -1 } }
      );
    });

    it('should allow a moderator to soft-delete any reply', async () => {
      const mockReply = createMockReply();
      (DiscussionReply.findOne as jest.Mock).mockResolvedValue(mockReply);
      (DiscussionThread.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const result = await DiscussionReplyService.deleteReply(mockReplyId, mockOtherUserId, true);

      expect(result.isDeleted).toBe(true);
      expect(mockReply.save).toHaveBeenCalled();
      expect(DiscussionThread.updateOne).toHaveBeenCalledWith(
        { _id: mockReply.threadId },
        { $inc: { replyCount: -1 } }
      );
    });

    it('should throw 404 when reply not found for delete', async () => {
      (DiscussionReply.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        DiscussionReplyService.deleteReply(mockReplyId, mockUserId, false)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Reply not found' });
    });

    it('should throw 403 when non-author and non-moderator tries to delete', async () => {
      const mockReply = createMockReply();
      (DiscussionReply.findOne as jest.Mock).mockResolvedValue(mockReply);

      await expect(
        DiscussionReplyService.deleteReply(mockReplyId, mockOtherUserId, false)
      ).rejects.toThrow(ApiError);

      await expect(
        DiscussionReplyService.deleteReply(mockReplyId, mockOtherUserId, false)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'You do not have permission to delete this reply'
      });
    });
  });

  // ===========================================================================
  // toggleInstructorAnswer
  // ===========================================================================
  describe('toggleInstructorAnswer', () => {
    it('should unmark a reply as instructor answer', async () => {
      const mockReply = createMockReply({ isInstructorAnswer: false });
      (DiscussionReply.findOneAndUpdate as jest.Mock).mockResolvedValue(mockReply);

      const result = await DiscussionReplyService.toggleInstructorAnswer(mockReplyId, false);

      expect(DiscussionReply.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockReplyId, isDeleted: false },
        { isInstructorAnswer: false },
        { new: true }
      );
      expect(result.isInstructorAnswer).toBe(false);
    });

    it('should mark a reply as instructor answer', async () => {
      const mockReply = createMockReply({ isInstructorAnswer: true });
      (DiscussionReply.findOneAndUpdate as jest.Mock).mockResolvedValue(mockReply);

      const result = await DiscussionReplyService.toggleInstructorAnswer(mockReplyId, true);

      expect(DiscussionReply.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockReplyId, isDeleted: false },
        { isInstructorAnswer: true },
        { new: true }
      );
      expect(result.isInstructorAnswer).toBe(true);
    });

    it('should throw 404 when reply not found', async () => {
      (DiscussionReply.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        DiscussionReplyService.toggleInstructorAnswer(mockReplyId, true)
      ).rejects.toThrow(ApiError);

      await expect(
        DiscussionReplyService.toggleInstructorAnswer(mockReplyId, true)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Reply not found' });
    });
  });
});
