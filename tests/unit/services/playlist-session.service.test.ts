import { Types } from 'mongoose';
import { PlaylistSessionService } from '@/services/progress/playlist-session.service';

jest.mock('@/models/progress/PlaylistSession.model');
jest.mock('@/models/enrollment/Enrollment.model');

import PlaylistSession from '@/models/progress/PlaylistSession.model';
import Enrollment from '@/models/enrollment/Enrollment.model';

const mockObjectId = () => new Types.ObjectId();

describe('PlaylistSessionService', () => {
  const userId = mockObjectId().toString();
  const enrollmentId = mockObjectId().toString();
  const moduleId = mockObjectId().toString();
  const sessionId = mockObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a playlist session via upsert', async () => {
      const mockEnrollment = {
        _id: enrollmentId,
        learnerId: { toString: () => userId }
      };
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);

      const savedSession = {
        _id: mockObjectId(),
        enrollmentId: new Types.ObjectId(enrollmentId),
        moduleId: new Types.ObjectId(moduleId),
        learnerId: new Types.ObjectId(userId),
        session: { currentIndex: 3, playlist: [] },
        savedAt: new Date()
      };
      (PlaylistSession.findOneAndUpdate as jest.Mock).mockResolvedValue(savedSession);

      const result = await PlaylistSessionService.createSession(
        enrollmentId, moduleId, { currentIndex: 3, playlist: [] }, userId
      );

      expect(Enrollment.findById).toHaveBeenCalledWith(enrollmentId);
      expect(PlaylistSession.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          enrollmentId: expect.any(Types.ObjectId),
          moduleId: expect.any(Types.ObjectId)
        }),
        expect.objectContaining({
          session: { currentIndex: 3, playlist: [] }
        }),
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      expect(result.session).toEqual({ currentIndex: 3, playlist: [] });
      expect(result.enrollmentId).toBe(enrollmentId);
    });

    it('should throw 404 if enrollment not found', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        PlaylistSessionService.createSession(enrollmentId, moduleId, {}, userId)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 if enrollment belongs to another user', async () => {
      const otherUserId = mockObjectId().toString();
      const mockEnrollment = {
        _id: enrollmentId,
        learnerId: { toString: () => otherUserId }
      };
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);

      await expect(
        PlaylistSessionService.createSession(enrollmentId, moduleId, {}, userId)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw 400 for invalid enrollment ID', async () => {
      await expect(
        PlaylistSessionService.createSession('invalid', moduleId, {}, userId)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getSession', () => {
    it('should return a playlist session', async () => {
      const mockSession = {
        _id: mockObjectId(),
        enrollmentId: new Types.ObjectId(enrollmentId),
        moduleId: new Types.ObjectId(moduleId),
        learnerId: new Types.ObjectId(userId),
        session: { currentIndex: 5 },
        savedAt: new Date()
      };
      (PlaylistSession.findOne as jest.Mock).mockResolvedValue(mockSession);

      const result = await PlaylistSessionService.getSession(enrollmentId, moduleId, userId);

      expect(PlaylistSession.findOne).toHaveBeenCalledWith({
        enrollmentId: expect.any(Types.ObjectId),
        moduleId: expect.any(Types.ObjectId),
        learnerId: expect.any(Types.ObjectId)
      });
      expect(result.session).toEqual({ currentIndex: 5 });
    });

    it('should throw 404 if session not found', async () => {
      (PlaylistSession.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        PlaylistSessionService.getSession(enrollmentId, moduleId, userId)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 400 for invalid module ID', async () => {
      await expect(
        PlaylistSessionService.getSession(enrollmentId, 'bad-id', userId)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('updateSession', () => {
    it('should update an existing session', async () => {
      const mockSession = {
        _id: new Types.ObjectId(sessionId),
        enrollmentId: new Types.ObjectId(enrollmentId),
        moduleId: new Types.ObjectId(moduleId),
        learnerId: { toString: () => userId },
        session: { currentIndex: 1 },
        savedAt: new Date(),
        save: jest.fn().mockResolvedValue(undefined)
      };
      (PlaylistSession.findOne as jest.Mock).mockResolvedValue(mockSession);

      const result = await PlaylistSessionService.updateSession(
        enrollmentId, sessionId, { currentIndex: 7 }, userId
      );

      expect(mockSession.save).toHaveBeenCalled();
      expect(mockSession.session).toEqual({ currentIndex: 7 });
      expect(result.moduleId).toBe(moduleId);
    });

    it('should throw 404 if session not found', async () => {
      (PlaylistSession.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        PlaylistSessionService.updateSession(enrollmentId, sessionId, {}, userId)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 if session belongs to another user', async () => {
      const otherUserId = mockObjectId().toString();
      const mockSession = {
        _id: new Types.ObjectId(sessionId),
        enrollmentId: new Types.ObjectId(enrollmentId),
        learnerId: { toString: () => otherUserId },
        session: {}
      };
      (PlaylistSession.findOne as jest.Mock).mockResolvedValue(mockSession);

      await expect(
        PlaylistSessionService.updateSession(enrollmentId, sessionId, {}, userId)
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
