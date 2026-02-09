import mongoose from 'mongoose';
import PlaylistSession from '@/models/progress/PlaylistSession.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import { ApiError } from '@/utils/ApiError';

interface PlaylistSessionResponse {
  id: string;
  enrollmentId: string;
  moduleId: string;
  session: Record<string, any>;
  savedAt: Date;
}

export class PlaylistSessionService {
  /**
   * Create or replace a playlist session for an enrollment + module
   */
  static async createSession(
    enrollmentId: string,
    moduleId: string,
    sessionData: Record<string, any>,
    userId: string
  ): Promise<PlaylistSessionResponse> {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    // Verify enrollment exists and belongs to user
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }
    if (enrollment.learnerId.toString() !== userId) {
      throw ApiError.forbidden('You can only manage your own playlist sessions');
    }

    // Upsert: create or replace
    const session = await PlaylistSession.findOneAndUpdate(
      {
        enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
        moduleId: new mongoose.Types.ObjectId(moduleId)
      },
      {
        enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
        moduleId: new mongoose.Types.ObjectId(moduleId),
        learnerId: new mongoose.Types.ObjectId(userId),
        session: sessionData,
        savedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      id: session._id.toString(),
      enrollmentId: session.enrollmentId.toString(),
      moduleId: session.moduleId.toString(),
      session: session.session,
      savedAt: session.savedAt
    };
  }

  /**
   * Get a playlist session for an enrollment + module
   */
  static async getSession(
    enrollmentId: string,
    moduleId: string,
    userId: string
  ): Promise<PlaylistSessionResponse> {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    const session = await PlaylistSession.findOne({
      enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
      moduleId: new mongoose.Types.ObjectId(moduleId),
      learnerId: new mongoose.Types.ObjectId(userId)
    });

    if (!session) {
      throw ApiError.notFound('Playlist session not found');
    }

    return {
      id: session._id.toString(),
      enrollmentId: session.enrollmentId.toString(),
      moduleId: session.moduleId.toString(),
      session: session.session,
      savedAt: session.savedAt
    };
  }

  /**
   * Update an existing playlist session by ID
   */
  static async updateSession(
    enrollmentId: string,
    sessionId: string,
    sessionData: Record<string, any>,
    userId: string
  ): Promise<PlaylistSessionResponse> {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      throw ApiError.badRequest('Invalid session ID');
    }

    const session = await PlaylistSession.findOne({
      _id: new mongoose.Types.ObjectId(sessionId),
      enrollmentId: new mongoose.Types.ObjectId(enrollmentId)
    });

    if (!session) {
      throw ApiError.notFound('Playlist session not found');
    }

    if (session.learnerId.toString() !== userId) {
      throw ApiError.forbidden('You can only update your own playlist sessions');
    }

    session.session = sessionData;
    session.savedAt = new Date();
    await session.save();

    return {
      id: session._id.toString(),
      enrollmentId: session.enrollmentId.toString(),
      moduleId: session.moduleId.toString(),
      session: session.session,
      savedAt: session.savedAt
    };
  }
}
