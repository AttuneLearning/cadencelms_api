/**
 * Unit Tests: MessageService
 *
 * Tests for the message/inbox service:
 * - Listing messages (paginated, filtered, searched)
 * - Getting a single message by ID
 * - Sending a message (recipient validation)
 * - Marking messages as read (bulk)
 * - Archiving messages (bulk)
 * - Soft deleting a message
 * - Getting unread count
 */

import mongoose from 'mongoose';
import { MessageService } from '@/services/messaging/message.service';
import Message from '@/models/messaging/Message.model';
import { User } from '@/models/auth/User.model';
import { Learner } from '@/models/auth/Learner.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/messaging/Message.model');
jest.mock('@/models/auth/User.model');
jest.mock('@/models/auth/Learner.model');

describe('MessageService', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockOtherUserId = new mongoose.Types.ObjectId().toString();
  const mockMessageId = new mongoose.Types.ObjectId().toString();
  const mockRecipientId = new mongoose.Types.ObjectId().toString();

  const createMockMessage = (overrides: any = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    type: 'direct',
    subject: 'Test Subject',
    body: 'This is a test message body that is long enough for preview testing purposes.',
    senderId: new mongoose.Types.ObjectId(mockOtherUserId),
    recipientId: new mongoose.Types.ObjectId(mockUserId),
    status: 'unread',
    isImportant: false,
    relatedEntity: null,
    readAt: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: User/Learner lookups for formatMessage
    (User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockOtherUserId),
      }),
    });
    (Learner.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        person: { firstName: 'John', lastName: 'Doe' },
      }),
    });
  });

  // ──────────────────────────────────────────────────
  // listMessages
  // ──────────────────────────────────────────────────
  describe('listMessages', () => {
    let mockLean: jest.Mock;
    let mockLimit: jest.Mock;
    let mockSkip: jest.Mock;
    let mockSort: jest.Mock;

    beforeEach(() => {
      mockLean = jest.fn();
      mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Message.find as jest.Mock).mockReturnValue({ sort: mockSort });
    });

    it('should return paginated messages with defaults', async () => {
      const mockMessages = [createMockMessage(), createMockMessage()];
      mockLean.mockResolvedValue(mockMessages);
      (Message.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await MessageService.listMessages(mockUserId, {});

      expect(Message.find).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: expect.any(mongoose.Types.ObjectId),
          isDeleted: false,
          status: { $ne: 'archived' },
        })
      );
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(50);
      expect(result.messages).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should filter by type when provided', async () => {
      mockLean.mockResolvedValue([]);
      (Message.countDocuments as jest.Mock).mockResolvedValue(0);

      await MessageService.listMessages(mockUserId, { type: 'announcement' });

      expect(Message.find).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'announcement' })
      );
    });

    it('should apply search filter with $or on subject and body', async () => {
      mockLean.mockResolvedValue([]);
      (Message.countDocuments as jest.Mock).mockResolvedValue(0);

      await MessageService.listMessages(mockUserId, { search: 'hello' });

      expect(Message.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { subject: { $regex: 'hello', $options: 'i' } },
            { body: { $regex: 'hello', $options: 'i' } },
          ],
        })
      );
    });

    it('should not exclude archived when searching', async () => {
      mockLean.mockResolvedValue([]);
      (Message.countDocuments as jest.Mock).mockResolvedValue(0);

      await MessageService.listMessages(mockUserId, { search: 'test' });

      const query = (Message.find as jest.Mock).mock.calls[0][0];
      expect(query.status).toBeUndefined();
    });

    it('should sort ascending when sort=date-asc', async () => {
      mockLean.mockResolvedValue([]);
      (Message.countDocuments as jest.Mock).mockResolvedValue(0);

      await MessageService.listMessages(mockUserId, { sort: 'date-asc' });

      expect(mockSort).toHaveBeenCalledWith({ createdAt: 1 });
    });

    it('should respect custom page and limit', async () => {
      mockLean.mockResolvedValue([createMockMessage()]);
      (Message.countDocuments as jest.Mock).mockResolvedValue(25);

      const result = await MessageService.listMessages(mockUserId, { page: 3, limit: 5 });

      expect(mockSkip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(mockLimit).toHaveBeenCalledWith(5);
      expect(result.pagination).toEqual({
        page: 3,
        limit: 5,
        total: 25,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should cap limit at 100', async () => {
      mockLean.mockResolvedValue([]);
      (Message.countDocuments as jest.Mock).mockResolvedValue(0);

      await MessageService.listMessages(mockUserId, { limit: 500 });

      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    it('should enforce minimum page of 1', async () => {
      mockLean.mockResolvedValue([]);
      (Message.countDocuments as jest.Mock).mockResolvedValue(0);

      await MessageService.listMessages(mockUserId, { page: -5 });

      expect(mockSkip).toHaveBeenCalledWith(0);
    });

    it('should return empty array when no messages', async () => {
      mockLean.mockResolvedValue([]);
      (Message.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await MessageService.listMessages(mockUserId, {});

      expect(result.messages).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────
  // getMessageById
  // ──────────────────────────────────────────────────
  describe('getMessageById', () => {
    let mockLean: jest.Mock;

    beforeEach(() => {
      mockLean = jest.fn();
      (Message.findOne as jest.Mock).mockReturnValue({ lean: mockLean });
    });

    it('should return a formatted message', async () => {
      const mockMsg = createMockMessage();
      mockLean.mockResolvedValue(mockMsg);

      const result = await MessageService.getMessageById(mockMessageId, mockUserId);

      expect(Message.findOne).toHaveBeenCalledWith({
        _id: mockMessageId,
        recipientId: mockUserId,
        isDeleted: false,
      });
      expect(result.id).toBe(mockMsg._id.toString());
      expect(result.subject).toBe('Test Subject');
      expect(result.sender).toBeDefined();
      expect(result.sender.firstName).toBe('John');
    });

    it('should throw 404 when message not found', async () => {
      mockLean.mockResolvedValue(null);

      await expect(
        MessageService.getMessageById(mockMessageId, mockUserId)
      ).rejects.toThrow(ApiError);

      mockLean.mockResolvedValue(null);

      await expect(
        MessageService.getMessageById(mockMessageId, mockUserId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Message not found' });
    });

    it('should throw 400 for invalid ObjectId', async () => {
      await expect(
        MessageService.getMessageById('invalid-id', mockUserId)
      ).rejects.toThrow(ApiError);

      await expect(
        MessageService.getMessageById('invalid-id', mockUserId)
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid message ID' });
    });
  });

  // ──────────────────────────────────────────────────
  // sendMessage
  // ──────────────────────────────────────────────────
  describe('sendMessage', () => {
    let mockSave: jest.Mock;

    beforeEach(() => {
      mockSave = jest.fn().mockResolvedValue(undefined);
      (Message as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        status: 'unread',
        isImportant: data.isImportant || false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockSave,
        toObject: function () { return { ...this }; },
      }));

      (User.findById as jest.Mock).mockResolvedValue({ _id: mockRecipientId });
    });

    it('should create and return a new message', async () => {
      const data = {
        subject: 'Hello',
        body: 'World',
        recipientId: mockRecipientId,
      };

      const result = await MessageService.sendMessage(data, mockUserId);

      expect(User.findById).toHaveBeenCalledWith(mockRecipientId);
      expect(Message).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'direct',
          subject: 'Hello',
          body: 'World',
        })
      );
      expect(mockSave).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.subject).toBe('Hello');
    });

    it('should accept optional type and isImportant', async () => {
      const data = {
        type: 'announcement',
        subject: 'Important',
        body: 'Content',
        recipientId: mockRecipientId,
        isImportant: true,
      };

      const result = await MessageService.sendMessage(data, mockUserId);

      expect(Message).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'announcement',
          isImportant: true,
        })
      );
      expect(result).toBeDefined();
    });

    it('should accept optional relatedEntity', async () => {
      const entityId = new mongoose.Types.ObjectId().toString();
      const data = {
        subject: 'Related',
        body: 'Content',
        recipientId: mockRecipientId,
        relatedEntity: {
          entityType: 'course',
          entityId,
          entityName: 'Test Course',
        },
      };

      const result = await MessageService.sendMessage(data, mockUserId);

      expect(Message).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedEntity: expect.objectContaining({
            entityType: 'course',
            entityName: 'Test Course',
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it('should throw 404 when recipient not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      const data = {
        subject: 'Hello',
        body: 'World',
        recipientId: mockRecipientId,
      };

      await expect(
        MessageService.sendMessage(data, mockUserId)
      ).rejects.toThrow(ApiError);

      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        MessageService.sendMessage(data, mockUserId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Recipient not found' });
    });

    it('should throw 400 for invalid recipientId', async () => {
      const data = {
        subject: 'Hello',
        body: 'World',
        recipientId: 'invalid-id',
      };

      await expect(
        MessageService.sendMessage(data, mockUserId)
      ).rejects.toThrow(ApiError);

      await expect(
        MessageService.sendMessage(data, mockUserId)
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid recipient ID' });
    });
  });

  // ──────────────────────────────────────────────────
  // markAsRead
  // ──────────────────────────────────────────────────
  describe('markAsRead', () => {
    it('should mark multiple messages as read', async () => {
      (Message.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 });

      const ids = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
      ];

      const result = await MessageService.markAsRead(ids, mockUserId);

      expect(Message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $in: expect.any(Array) },
          recipientId: expect.any(mongoose.Types.ObjectId),
          status: 'unread',
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'read', readAt: expect.any(Date) }),
        })
      );
      expect(result.modifiedCount).toBe(3);
    });

    it('should return 0 modifiedCount when no unread messages match', async () => {
      (Message.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      const ids = [new mongoose.Types.ObjectId().toString()];
      const result = await MessageService.markAsRead(ids, mockUserId);

      expect(result.modifiedCount).toBe(0);
    });

    it('should throw 400 for invalid message ID in array', async () => {
      const ids = ['invalid-id'];

      await expect(
        MessageService.markAsRead(ids, mockUserId)
      ).rejects.toThrow(ApiError);

      await expect(
        MessageService.markAsRead(ids, mockUserId)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // ──────────────────────────────────────────────────
  // archiveMessages
  // ──────────────────────────────────────────────────
  describe('archiveMessages', () => {
    it('should archive multiple messages', async () => {
      (Message.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });

      const ids = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
      ];

      const result = await MessageService.archiveMessages(ids, mockUserId);

      expect(Message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $in: expect.any(Array) },
          recipientId: expect.any(mongoose.Types.ObjectId),
        }),
        expect.objectContaining({
          $set: { status: 'archived' },
        })
      );
      expect(result.modifiedCount).toBe(2);
    });

    it('should throw 400 for invalid message ID in array', async () => {
      const ids = ['bad-id'];

      await expect(
        MessageService.archiveMessages(ids, mockUserId)
      ).rejects.toThrow(ApiError);

      await expect(
        MessageService.archiveMessages(ids, mockUserId)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // ──────────────────────────────────────────────────
  // deleteMessage
  // ──────────────────────────────────────────────────
  describe('deleteMessage', () => {
    it('should soft-delete a message', async () => {
      (Message.findOneAndUpdate as jest.Mock).mockResolvedValue(createMockMessage());

      await MessageService.deleteMessage(mockMessageId, mockUserId);

      expect(Message.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: mockMessageId,
          recipientId: expect.any(mongoose.Types.ObjectId),
          isDeleted: false,
        },
        { $set: { isDeleted: true } }
      );
    });

    it('should throw 404 when message not found', async () => {
      (Message.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        MessageService.deleteMessage(mockMessageId, mockUserId)
      ).rejects.toThrow(ApiError);

      (Message.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        MessageService.deleteMessage(mockMessageId, mockUserId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Message not found' });
    });

    it('should throw 400 for invalid message ID', async () => {
      await expect(
        MessageService.deleteMessage('invalid-id', mockUserId)
      ).rejects.toThrow(ApiError);

      await expect(
        MessageService.deleteMessage('invalid-id', mockUserId)
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid message ID' });
    });
  });

  // ──────────────────────────────────────────────────
  // getUnreadCount
  // ──────────────────────────────────────────────────
  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      (Message.countDocuments as jest.Mock).mockResolvedValue(7);

      const result = await MessageService.getUnreadCount(mockUserId);

      expect(Message.countDocuments).toHaveBeenCalledWith({
        recipientId: expect.any(mongoose.Types.ObjectId),
        status: 'unread',
        isDeleted: false,
      });
      expect(result.count).toBe(7);
    });

    it('should return 0 when no unread messages', async () => {
      (Message.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await MessageService.getUnreadCount(mockUserId);

      expect(result.count).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────
  // formatMessage (tested indirectly via getMessageById)
  // ──────────────────────────────────────────────────
  describe('formatMessage (via getMessageById)', () => {
    let mockLean: jest.Mock;

    beforeEach(() => {
      mockLean = jest.fn();
      (Message.findOne as jest.Mock).mockReturnValue({ lean: mockLean });
    });

    it('should include preview truncated at 100 chars', async () => {
      const longBody = 'a'.repeat(150);
      const mockMsg = createMockMessage({ body: longBody });
      mockLean.mockResolvedValue(mockMsg);

      const result = await MessageService.getMessageById(mockMessageId, mockUserId);

      expect(result.preview).toBe('a'.repeat(100) + '...');
    });

    it('should not add ellipsis for short body', async () => {
      const shortBody = 'Short message';
      const mockMsg = createMockMessage({ body: shortBody });
      mockLean.mockResolvedValue(mockMsg);

      const result = await MessageService.getMessageById(mockMessageId, mockUserId);

      expect(result.preview).toBe('Short message');
    });

    it('should format relatedEntity when present', async () => {
      const entityId = new mongoose.Types.ObjectId();
      const mockMsg = createMockMessage({
        relatedEntity: {
          entityType: 'course',
          entityId,
          entityName: 'Test Course',
        },
      });
      mockLean.mockResolvedValue(mockMsg);

      const result = await MessageService.getMessageById(mockMessageId, mockUserId);

      expect(result.relatedEntity).toEqual({
        type: 'course',
        id: entityId.toString(),
        name: 'Test Course',
      });
    });

    it('should return null relatedEntity when not present', async () => {
      const mockMsg = createMockMessage({ relatedEntity: null });
      mockLean.mockResolvedValue(mockMsg);

      const result = await MessageService.getMessageById(mockMessageId, mockUserId);

      expect(result.relatedEntity).toBeNull();
    });

    it('should fallback to System sender when user lookup fails', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const mockMsg = createMockMessage();
      mockLean.mockResolvedValue(mockMsg);

      const result = await MessageService.getMessageById(mockMessageId, mockUserId);

      expect(result.sender.firstName).toBe('System');
      expect(result.sender.lastName).toBe('');
    });
  });
});
