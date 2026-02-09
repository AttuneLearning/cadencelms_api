import mongoose from 'mongoose';
import DiscussionReply, { IDiscussionReply } from '@/models/discussion/DiscussionReply.model';
import DiscussionThread from '@/models/discussion/DiscussionThread.model';
import { ApiError } from '@/utils/ApiError';

interface ListRepliesFilters {
  parentReplyId?: string | null;
  page?: number;
  limit?: number;
}

export class DiscussionReplyService {
  /**
   * List replies for a thread, chronological order
   */
  static async listReplies(threadId: string, filters: ListRepliesFilters = {}) {
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      throw ApiError.notFound('Thread not found');
    }

    const thread = await DiscussionThread.findOne({ _id: threadId, isDeleted: false }).lean();
    if (!thread) {
      throw ApiError.notFound('Thread not found');
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: any = { threadId, isDeleted: false };
    if (filters.parentReplyId !== undefined) {
      query.parentReplyId = filters.parentReplyId;
    }

    const [replies, total] = await Promise.all([
      DiscussionReply.find(query)
        .populate('authorId', 'firstName lastName email')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DiscussionReply.countDocuments(query)
    ]);

    return {
      replies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Create a reply on a thread
   */
  static async createReply(
    threadId: string,
    data: { body: string; parentReplyId?: string },
    userId: string,
    userType: 'learner' | 'staff'
  ): Promise<IDiscussionReply> {
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      throw ApiError.notFound('Thread not found');
    }

    const thread = await DiscussionThread.findOne({ _id: threadId, isDeleted: false });
    if (!thread) {
      throw ApiError.notFound('Thread not found');
    }

    if (thread.isLocked) {
      throw ApiError.forbidden('This thread is locked');
    }

    // Validate parent reply exists if provided
    if (data.parentReplyId) {
      if (!mongoose.Types.ObjectId.isValid(data.parentReplyId)) {
        throw ApiError.notFound('Parent reply not found');
      }
      const parentReply = await DiscussionReply.findOne({
        _id: data.parentReplyId,
        threadId,
        isDeleted: false
      }).lean();
      if (!parentReply) {
        throw ApiError.notFound('Parent reply not found');
      }
    }

    const reply = new DiscussionReply({
      threadId,
      authorId: userId,
      authorType: userType,
      body: data.body,
      parentReplyId: data.parentReplyId || null
    });

    await reply.save();

    // Update thread counters
    await DiscussionThread.updateOne(
      { _id: threadId },
      {
        $inc: { replyCount: 1 },
        $set: { lastReplyAt: new Date(), lastReplyBy: new mongoose.Types.ObjectId(userId) }
      }
    );

    return reply;
  }

  /**
   * Update a reply (author or moderator)
   */
  static async updateReply(
    replyId: string,
    data: { body: string },
    userId: string,
    canModerate: boolean
  ): Promise<IDiscussionReply> {
    if (!mongoose.Types.ObjectId.isValid(replyId)) {
      throw ApiError.notFound('Reply not found');
    }

    const reply = await DiscussionReply.findOne({ _id: replyId, isDeleted: false });
    if (!reply) {
      throw ApiError.notFound('Reply not found');
    }

    const isAuthor = reply.authorId.toString() === userId;
    if (!isAuthor && !canModerate) {
      throw ApiError.forbidden('You do not have permission to edit this reply');
    }

    reply.body = data.body;
    await reply.save();
    return reply;
  }

  /**
   * Soft-delete a reply (author or moderator)
   */
  static async deleteReply(
    replyId: string,
    userId: string,
    canModerate: boolean
  ): Promise<IDiscussionReply> {
    if (!mongoose.Types.ObjectId.isValid(replyId)) {
      throw ApiError.notFound('Reply not found');
    }

    const reply = await DiscussionReply.findOne({ _id: replyId, isDeleted: false });
    if (!reply) {
      throw ApiError.notFound('Reply not found');
    }

    const isAuthor = reply.authorId.toString() === userId;
    if (!isAuthor && !canModerate) {
      throw ApiError.forbidden('You do not have permission to delete this reply');
    }

    reply.isDeleted = true;
    reply.deletedAt = new Date();
    reply.deletedBy = new mongoose.Types.ObjectId(userId);
    await reply.save();

    // Decrement thread reply count
    await DiscussionThread.updateOne(
      { _id: reply.threadId },
      { $inc: { replyCount: -1 } }
    );

    return reply;
  }

  /**
   * Toggle instructor answer status (moderator only via route)
   */
  static async toggleInstructorAnswer(
    replyId: string,
    isInstructorAnswer: boolean
  ): Promise<IDiscussionReply> {
    if (!mongoose.Types.ObjectId.isValid(replyId)) {
      throw ApiError.notFound('Reply not found');
    }

    const reply = await DiscussionReply.findOneAndUpdate(
      { _id: replyId, isDeleted: false },
      { isInstructorAnswer },
      { new: true }
    );

    if (!reply) {
      throw ApiError.notFound('Reply not found');
    }

    return reply;
  }
}
