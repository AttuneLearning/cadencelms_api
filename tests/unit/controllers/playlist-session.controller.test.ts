import { Request, Response } from 'express';
import { createSession, getSession, updateSession } from '@/controllers/progress/playlist-session.controller';
import { PlaylistSessionService } from '@/services/progress/playlist-session.service';

jest.mock('@/services/progress/playlist-session.service');

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('PlaylistSessionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should return 201 with created session', async () => {
      const mockResult = {
        id: 'session-1',
        enrollmentId: 'enr-1',
        moduleId: 'mod-1',
        session: { currentIndex: 0 },
        savedAt: new Date()
      };
      (PlaylistSessionService.createSession as jest.Mock).mockResolvedValue(mockResult);

      const req = {
        params: { enrollmentId: 'enr-1' },
        body: { moduleId: 'mod-1', session: { currentIndex: 0 } },
        user: { userId: 'user-1' }
      } as unknown as Request;
      const res = mockResponse();

      await createSession(req, res, jest.fn());

      expect(PlaylistSessionService.createSession).toHaveBeenCalledWith(
        'enr-1', 'mod-1', { currentIndex: 0 }, 'user-1'
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should throw 400 if moduleId is missing', async () => {
      const req = {
        params: { enrollmentId: 'enr-1' },
        body: { session: {} },
        user: { userId: 'user-1' }
      } as unknown as Request;
      const res = mockResponse();
      const next = jest.fn();

      await createSession(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('should throw 400 if session is missing', async () => {
      const req = {
        params: { enrollmentId: 'enr-1' },
        body: { moduleId: 'mod-1' },
        user: { userId: 'user-1' }
      } as unknown as Request;
      const res = mockResponse();
      const next = jest.fn();

      await createSession(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });

  describe('getSession', () => {
    it('should return 200 with session', async () => {
      const mockResult = {
        id: 'session-1',
        enrollmentId: 'enr-1',
        moduleId: 'mod-1',
        session: { currentIndex: 5 },
        savedAt: new Date()
      };
      (PlaylistSessionService.getSession as jest.Mock).mockResolvedValue(mockResult);

      const req = {
        params: { enrollmentId: 'enr-1' },
        query: { moduleId: 'mod-1' },
        user: { userId: 'user-1' }
      } as unknown as Request;
      const res = mockResponse();

      await getSession(req, res, jest.fn());

      expect(PlaylistSessionService.getSession).toHaveBeenCalledWith('enr-1', 'mod-1', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should throw 400 if moduleId query param is missing', async () => {
      const req = {
        params: { enrollmentId: 'enr-1' },
        query: {},
        user: { userId: 'user-1' }
      } as unknown as Request;
      const res = mockResponse();
      const next = jest.fn();

      await getSession(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });

  describe('updateSession', () => {
    it('should return 200 with updated session', async () => {
      const mockResult = {
        id: 'session-1',
        enrollmentId: 'enr-1',
        moduleId: 'mod-1',
        session: { currentIndex: 10 },
        savedAt: new Date()
      };
      (PlaylistSessionService.updateSession as jest.Mock).mockResolvedValue(mockResult);

      const req = {
        params: { enrollmentId: 'enr-1', sessionId: 'session-1' },
        body: { session: { currentIndex: 10 } },
        user: { userId: 'user-1' }
      } as unknown as Request;
      const res = mockResponse();

      await updateSession(req, res, jest.fn());

      expect(PlaylistSessionService.updateSession).toHaveBeenCalledWith(
        'enr-1', 'session-1', { currentIndex: 10 }, 'user-1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should throw 400 if session body is missing', async () => {
      const req = {
        params: { enrollmentId: 'enr-1', sessionId: 'session-1' },
        body: {},
        user: { userId: 'user-1' }
      } as unknown as Request;
      const res = mockResponse();
      const next = jest.fn();

      await updateSession(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });
});
