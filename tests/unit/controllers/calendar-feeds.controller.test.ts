import { Request, Response } from 'express';
import { getLearnerFeed, getStaffFeed, getSystemFeed } from '@/controllers/calendar/calendar-feeds.controller';
import { CalendarFeedsService } from '@/services/calendar/calendar-feeds.service';

jest.mock('@/services/calendar/calendar-feeds.service');

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (overrides: Partial<Request> = {}) => {
  return {
    query: {
      startDate: '2026-03-01',
      endDate: '2026-03-31'
    },
    user: {
      userId: '507f1f77bcf86cd799439011'
    },
    ...overrides
  } as unknown as Request;
};

describe('CalendarFeedsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLearnerFeed', () => {
    it('should return 200 with events array', async () => {
      const mockEvents = [
        {
          id: 'class-session-123',
          feedId: 'learner',
          kind: 'span',
          title: 'Biology 101',
          startDate: '2026-03-05',
          endDate: '2026-03-25',
          eventType: 'class-session'
        }
      ];

      (CalendarFeedsService.getLearnerFeed as jest.Mock).mockResolvedValue(mockEvents);

      const req = mockRequest();
      const res = mockResponse();

      await getLearnerFeed(req, res, jest.fn());

      expect(CalendarFeedsService.getLearnerFeed).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.any(Date),
        expect.any(Date)
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { events: mockEvents }
        })
      );
    });

    it('should pass parsed dates to service', async () => {
      (CalendarFeedsService.getLearnerFeed as jest.Mock).mockResolvedValue([]);

      const req = mockRequest({
        query: { startDate: '2026-04-01', endDate: '2026-04-30' } as any
      });
      const res = mockResponse();

      await getLearnerFeed(req, res, jest.fn());

      const [, startDate, endDate] = (CalendarFeedsService.getLearnerFeed as jest.Mock).mock.calls[0];
      expect(startDate.toISOString()).toContain('2026-04-01');
      expect(endDate.toISOString()).toContain('2026-04-30');
    });
  });

  describe('getStaffFeed', () => {
    it('should return 200 with staff events', async () => {
      const mockEvents = [
        {
          id: 'class-session-456',
          feedId: 'staff',
          kind: 'span',
          title: 'Chemistry 201',
          startDate: '2026-03-10',
          endDate: '2026-03-20',
          eventType: 'class-session'
        }
      ];

      (CalendarFeedsService.getStaffFeed as jest.Mock).mockResolvedValue(mockEvents);

      const req = mockRequest();
      const res = mockResponse();

      await getStaffFeed(req, res, jest.fn());

      expect(CalendarFeedsService.getStaffFeed).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.any(Date),
        expect.any(Date)
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { events: mockEvents }
        })
      );
    });
  });

  describe('getSystemFeed', () => {
    it('should return 200 with system events', async () => {
      const mockEvents = [
        {
          id: 'academic-year-789',
          feedId: 'system',
          kind: 'span',
          title: '2025-2026',
          startDate: '2025-09-01',
          endDate: '2026-06-30',
          eventType: 'academic-date'
        }
      ];

      (CalendarFeedsService.getSystemFeed as jest.Mock).mockResolvedValue(mockEvents);

      const req = mockRequest();
      const res = mockResponse();

      await getSystemFeed(req, res, jest.fn());

      expect(CalendarFeedsService.getSystemFeed).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
      // System feed should NOT pass userId
      expect(CalendarFeedsService.getSystemFeed).toHaveBeenCalledTimes(1);
      const args = (CalendarFeedsService.getSystemFeed as jest.Mock).mock.calls[0];
      expect(args).toHaveLength(2); // only startDate, endDate

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return empty events array when no data', async () => {
      (CalendarFeedsService.getSystemFeed as jest.Mock).mockResolvedValue([]);

      const req = mockRequest();
      const res = mockResponse();

      await getSystemFeed(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { events: [] }
        })
      );
    });
  });
});
