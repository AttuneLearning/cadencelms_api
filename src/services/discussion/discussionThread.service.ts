import mongoose from 'mongoose';
import DiscussionThread, { IDiscussionThread } from '@/models/discussion/DiscussionThread.model';
import Course from '@/models/academic/Course.model';
import { ApiError } from '@/utils/ApiError';

interface ListThreadsFilters {
  moduleId?: string;
  lessonId?: string;
  page?: number;
  limit?: number;
}

interface SearchFilters {
  page?: number;
  limit?: number;
}

export class DiscussionThreadService {
  /**
   * List threads for a course, pinned first then by last reply
   */
  static async listThreads(courseId: string, filters: ListThreadsFilters = {}) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: any = { courseId, isDeleted: false };
    if (filters.moduleId) query.moduleId = filters.moduleId;
    if (filters.lessonId) query.lessonId = filters.lessonId;

    const [threads, total] = await Promise.all([
      DiscussionThread.find(query)
        .populate('authorId', 'firstName lastName email')
        .sort({ isPinned: -1, lastReplyAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DiscussionThread.countDocuments(query)
    ]);

    return {
      threads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Create a new thread in a course
   */
  static async createThread(
    courseId: string,
    data: { title: string; body: string; moduleId?: string; lessonId?: string },
    userId: string,
    userType: 'learner' | 'staff'
  ): Promise<IDiscussionThread> {
    const course = await Course.findOne({ _id: courseId, status: 'published' }).lean();
    if (!course) {
      throw ApiError.notFound('Course not found or not published');
    }

    const thread = new DiscussionThread({
      courseId,
      authorId: userId,
      authorType: userType,
      title: data.title,
      body: data.body,
      moduleId: data.moduleId || undefined,
      lessonId: data.lessonId || undefined
    });

    await thread.save();
    return thread;
  }

  /**
   * Get a single thread by ID
   */
  static async getThread(threadId: string): Promise<IDiscussionThread> {
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      throw ApiError.notFound('Thread not found');
    }

    const thread = await DiscussionThread.findOne({ _id: threadId, isDeleted: false })
      .populate('authorId', 'firstName lastName email');

    if (!thread) {
      throw ApiError.notFound('Thread not found');
    }

    return thread;
  }

  /**
   * Update a thread (author or moderator)
   */
  static async updateThread(
    threadId: string,
    data: { title?: string; body?: string },
    userId: string,
    canModerate: boolean
  ): Promise<IDiscussionThread> {
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      throw ApiError.notFound('Thread not found');
    }

    const thread = await DiscussionThread.findOne({ _id: threadId, isDeleted: false });
    if (!thread) {
      throw ApiError.notFound('Thread not found');
    }

    const isAuthor = thread.authorId.toString() === userId;
    if (!isAuthor && !canModerate) {
      throw ApiError.forbidden('You do not have permission to edit this thread');
    }

    if (data.title !== undefined) thread.title = data.title;
    if (data.body !== undefined) thread.body = data.body;

    await thread.save();
    return thread;
  }

  /**
   * Soft-delete a thread (author or moderator)
   */
  static async deleteThread(
    threadId: string,
    userId: string,
    canModerate: boolean
  ): Promise<IDiscussionThread> {
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      throw ApiError.notFound('Thread not found');
    }

    const thread = await DiscussionThread.findOne({ _id: threadId, isDeleted: false });
    if (!thread) {
      throw ApiError.notFound('Thread not found');
    }

    const isAuthor = thread.authorId.toString() === userId;
    if (!isAuthor && !canModerate) {
      throw ApiError.forbidden('You do not have permission to delete this thread');
    }

    thread.isDeleted = true;
    thread.deletedAt = new Date();
    thread.deletedBy = new mongoose.Types.ObjectId(userId);
    await thread.save();
    return thread;
  }

  /**
   * Toggle pin status (moderator only via route)
   */
  static async togglePin(threadId: string, isPinned: boolean): Promise<IDiscussionThread> {
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      throw ApiError.notFound('Thread not found');
    }

    const thread = await DiscussionThread.findOneAndUpdate(
      { _id: threadId, isDeleted: false },
      { isPinned },
      { new: true }
    );

    if (!thread) {
      throw ApiError.notFound('Thread not found');
    }

    return thread;
  }

  /**
   * Toggle lock status (moderator only via route)
   */
  static async toggleLock(threadId: string, isLocked: boolean): Promise<IDiscussionThread> {
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      throw ApiError.notFound('Thread not found');
    }

    const thread = await DiscussionThread.findOneAndUpdate(
      { _id: threadId, isDeleted: false },
      { isLocked },
      { new: true }
    );

    if (!thread) {
      throw ApiError.notFound('Thread not found');
    }

    return thread;
  }

  /**
   * Search threads using text index
   */
  static async searchThreads(courseId: string, query: string, filters: SearchFilters = {}) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 50);
    const skip = (page - 1) * limit;

    const searchQuery = {
      $text: { $search: query },
      courseId,
      isDeleted: false
    };

    const [threads, total] = await Promise.all([
      DiscussionThread.find(searchQuery)
        .populate('authorId', 'firstName lastName email')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .lean(),
      DiscussionThread.countDocuments(searchQuery)
    ]);

    return {
      threads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
