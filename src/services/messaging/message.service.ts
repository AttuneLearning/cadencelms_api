import Message from '@/models/messaging/Message.model';
import { User } from '@/models/auth/User.model';
import { Learner } from '@/models/auth/Learner.model';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

interface ListMessagesFilters {
  type?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface SendMessageData {
  type?: string;
  subject: string;
  body: string;
  recipientId: string;
  isImportant?: boolean;
  relatedEntity?: {
    entityType: string;
    entityId: string;
    entityName?: string;
  };
}

export class MessageService {
  /**
   * List messages for the authenticated user
   */
  static async listMessages(userId: string, filters: ListMessagesFilters): Promise<any> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const skip = (page - 1) * limit;

    const query: any = {
      recipientId: new mongoose.Types.ObjectId(userId),
      isDeleted: false
    };

    if (filters.type) {
      query.type = filters.type;
    }

    // Exclude archived by default (unless searching)
    if (!filters.search) {
      query.status = { $ne: 'archived' };
    }

    if (filters.search) {
      query.$or = [
        { subject: { $regex: filters.search, $options: 'i' } },
        { body: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const sortOrder: 1 | -1 = filters.sort === 'date-asc' ? 1 : -1;
    const sort = { createdAt: sortOrder };

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(query)
    ]);

    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => this.formatMessage(msg))
    );

    const totalPages = Math.ceil(total / limit);

    return {
      messages: enrichedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get a single message by ID
   */
  static async getMessageById(messageId: string, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw ApiError.badRequest('Invalid message ID');
    }

    const message = await Message.findOne({
      _id: messageId,
      recipientId: userId,
      isDeleted: false
    }).lean();

    if (!message) {
      throw ApiError.notFound('Message not found');
    }

    return this.formatMessage(message);
  }

  /**
   * Send a new message
   */
  static async sendMessage(data: SendMessageData, senderId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(data.recipientId)) {
      throw ApiError.badRequest('Invalid recipient ID');
    }

    // Verify recipient exists
    const recipient = await User.findById(data.recipientId);
    if (!recipient) {
      throw ApiError.notFound('Recipient not found');
    }

    const message = new Message({
      type: data.type || 'direct',
      subject: data.subject,
      body: data.body,
      senderId: new mongoose.Types.ObjectId(senderId),
      recipientId: new mongoose.Types.ObjectId(data.recipientId),
      isImportant: data.isImportant || false,
      relatedEntity: data.relatedEntity ? {
        entityType: data.relatedEntity.entityType,
        entityId: new mongoose.Types.ObjectId(data.relatedEntity.entityId),
        entityName: data.relatedEntity.entityName
      } : undefined
    });

    await message.save();

    return this.formatMessage(message.toObject());
  }

  /**
   * Mark messages as read (bulk)
   */
  static async markAsRead(messageIds: string[], userId: string): Promise<{ modifiedCount: number }> {
    const objectIds = messageIds.map(id => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw ApiError.badRequest(`Invalid message ID: ${id}`);
      }
      return new mongoose.Types.ObjectId(id);
    });

    const result = await Message.updateMany(
      {
        _id: { $in: objectIds },
        recipientId: new mongoose.Types.ObjectId(userId),
        status: 'unread'
      },
      {
        $set: { status: 'read', readAt: new Date() }
      }
    );

    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Archive messages (bulk)
   */
  static async archiveMessages(messageIds: string[], userId: string): Promise<{ modifiedCount: number }> {
    const objectIds = messageIds.map(id => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw ApiError.badRequest(`Invalid message ID: ${id}`);
      }
      return new mongoose.Types.ObjectId(id);
    });

    const result = await Message.updateMany(
      {
        _id: { $in: objectIds },
        recipientId: new mongoose.Types.ObjectId(userId)
      },
      {
        $set: { status: 'archived' }
      }
    );

    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Soft delete a message
   */
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw ApiError.badRequest('Invalid message ID');
    }

    const result = await Message.findOneAndUpdate(
      {
        _id: messageId,
        recipientId: new mongoose.Types.ObjectId(userId),
        isDeleted: false
      },
      { $set: { isDeleted: true } }
    );

    if (!result) {
      throw ApiError.notFound('Message not found');
    }
  }

  /**
   * Get unread message count for a user
   */
  static async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await Message.countDocuments({
      recipientId: new mongoose.Types.ObjectId(userId),
      status: 'unread',
      isDeleted: false
    });

    return { count };
  }

  /**
   * Format a message document for API response
   */
  private static async formatMessage(msg: any): Promise<any> {
    let sender: any = null;
    try {
      const senderUser = await User.findById(msg.senderId).lean();
      if (senderUser) {
        const senderLearner = await Learner.findById(msg.senderId).lean();
        sender = {
          id: senderUser._id.toString(),
          firstName: senderLearner?.person?.firstName || 'System',
          lastName: senderLearner?.person?.lastName || '',
        };
      }
    } catch {
      // Sender may have been deleted
    }

    return {
      id: msg._id.toString(),
      type: msg.type,
      subject: msg.subject,
      body: msg.body,
      preview: msg.body.substring(0, 100) + (msg.body.length > 100 ? '...' : ''),
      sender: sender || { id: msg.senderId.toString(), firstName: 'System', lastName: '' },
      recipientId: msg.recipientId.toString(),
      status: msg.status,
      isImportant: msg.isImportant,
      relatedEntity: msg.relatedEntity ? {
        type: msg.relatedEntity.entityType,
        id: msg.relatedEntity.entityId.toString(),
        name: msg.relatedEntity.entityName || null
      } : null,
      createdAt: msg.createdAt,
      readAt: msg.readAt || null
    };
  }
}
