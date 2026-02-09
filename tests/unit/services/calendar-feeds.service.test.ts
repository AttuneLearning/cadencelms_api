import { Types } from 'mongoose';
import { CalendarFeedsService } from '@/services/calendar/calendar-feeds.service';

// Mock all models
jest.mock('@/models/enrollment/ClassEnrollment.model');
jest.mock('@/models/enrollment/Enrollment.model');
jest.mock('@/models/academic/Class.model');
jest.mock('@/models/academic/AcademicYear.model');
jest.mock('@/models/academic/AcademicTerm.model');

import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import Class from '@/models/academic/Class.model';
import AcademicYear from '@/models/academic/AcademicYear.model';
import AcademicTerm from '@/models/academic/AcademicTerm.model';

const mockObjectId = () => new Types.ObjectId();

function buildMockChain(result: any) {
  const chain: any = {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result)
  };
  return chain;
}

describe('CalendarFeedsService', () => {
  const userId = mockObjectId().toString();
  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-31');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLearnerFeed', () => {
    it('should return class-session spans and enrollment-start points for enrolled user', async () => {
      const classId = mockObjectId();
      const ceId = mockObjectId();
      const courseId = mockObjectId();

      const mockClassEnrollments = [
        {
          _id: ceId,
          learnerId: userId,
          classId: {
            _id: classId,
            name: 'Spring Biology 101',
            startDate: new Date('2026-03-05'),
            endDate: new Date('2026-03-25'),
            schedule: 'MWF 9:00-10:00',
            location: 'Room 204',
            courseId: { _id: courseId, name: 'Biology 101', code: 'BIO101' }
          },
          status: 'enrolled',
          enrollmentDate: new Date('2026-03-01')
        }
      ];

      const ceChain = buildMockChain(mockClassEnrollments);
      (ClassEnrollment.find as jest.Mock).mockReturnValue(ceChain);

      const mockEnrollments: any[] = [];
      const enrChain = buildMockChain(mockEnrollments);
      (Enrollment.find as jest.Mock).mockReturnValue(enrChain);

      const events = await CalendarFeedsService.getLearnerFeed(userId, startDate, endDate);

      expect(ClassEnrollment.find).toHaveBeenCalledWith({
        learnerId: userId,
        status: { $in: ['enrolled', 'active'] }
      });

      // Should have a class-session span + an enrollment-start point
      expect(events).toHaveLength(2);

      const span = events.find(e => e.kind === 'span');
      expect(span).toBeDefined();
      expect(span!.feedId).toBe('learner');
      expect(span!.eventType).toBe('class-session');
      expect(span!.title).toBe('Biology 101');
      expect(span!.startDate).toBe('2026-03-05');
      expect(span!.endDate).toBe('2026-03-25');
      expect(span!.location).toBe('Room 204');

      const point = events.find(e => e.kind === 'point');
      expect(point).toBeDefined();
      expect(point!.feedId).toBe('learner');
      expect(point!.eventType).toBe('enrollment-start');
      expect(point!.date).toBe('2026-03-01');
    });

    it('should return enrollment-expiry points when accessExpiresAt is in range', async () => {
      (ClassEnrollment.find as jest.Mock).mockReturnValue(buildMockChain([]));

      const programId = mockObjectId();
      const enrId = mockObjectId();
      const mockEnrollments = [
        {
          _id: enrId,
          learnerId: userId,
          programId: { _id: programId, name: 'Computer Science', code: 'CS' },
          status: 'active',
          enrollmentDate: new Date('2025-09-01'),
          startDate: new Date('2025-09-01'),
          accessExpiresAt: new Date('2026-03-15')
        }
      ];
      (Enrollment.find as jest.Mock).mockReturnValue(buildMockChain(mockEnrollments));

      const events = await CalendarFeedsService.getLearnerFeed(userId, startDate, endDate);

      // enrollment-start is out of range (2025-09-01), so only expiry
      const expiryEvents = events.filter(e => e.eventType === 'enrollment-expiry');
      expect(expiryEvents).toHaveLength(1);
      expect(expiryEvents[0].title).toBe('Access Expires: Computer Science');
      expect(expiryEvents[0].date).toBe('2026-03-15');
    });

    it('should exclude events outside the date range', async () => {
      const classId = mockObjectId();
      const ceId = mockObjectId();
      const mockClassEnrollments = [
        {
          _id: ceId,
          learnerId: userId,
          classId: {
            _id: classId,
            name: 'Summer Class',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-30'),
            courseId: null
          },
          status: 'enrolled',
          enrollmentDate: new Date('2026-05-15')
        }
      ];

      (ClassEnrollment.find as jest.Mock).mockReturnValue(buildMockChain(mockClassEnrollments));
      (Enrollment.find as jest.Mock).mockReturnValue(buildMockChain([]));

      const events = await CalendarFeedsService.getLearnerFeed(userId, startDate, endDate);

      // Both class dates and enrollment date are outside March range
      expect(events).toHaveLength(0);
    });

    it('should return empty array when user has no enrollments', async () => {
      (ClassEnrollment.find as jest.Mock).mockReturnValue(buildMockChain([]));
      (Enrollment.find as jest.Mock).mockReturnValue(buildMockChain([]));

      const events = await CalendarFeedsService.getLearnerFeed(userId, startDate, endDate);

      expect(events).toHaveLength(0);
    });

    it('should skip class enrollments with missing class data', async () => {
      const mockClassEnrollments = [
        {
          _id: mockObjectId(),
          learnerId: userId,
          classId: null,
          status: 'enrolled',
          enrollmentDate: new Date('2026-03-10')
        }
      ];

      (ClassEnrollment.find as jest.Mock).mockReturnValue(buildMockChain(mockClassEnrollments));
      (Enrollment.find as jest.Mock).mockReturnValue(buildMockChain([]));

      const events = await CalendarFeedsService.getLearnerFeed(userId, startDate, endDate);

      expect(events).toHaveLength(0);
    });
  });

  describe('getStaffFeed', () => {
    it('should return class-session spans for classes where user is instructor', async () => {
      const classId = mockObjectId();
      const courseId = mockObjectId();
      const mockClasses = [
        {
          _id: classId,
          name: 'Spring Biology 101',
          courseId: { _id: courseId, name: 'Biology 101', code: 'BIO101' },
          startDate: new Date('2026-03-05'),
          endDate: new Date('2026-03-25'),
          schedule: 'MWF 9:00-10:00',
          location: 'Room 204',
          isActive: true
        }
      ];

      const chain = buildMockChain(mockClasses);
      (Class.find as jest.Mock).mockReturnValue(chain);

      const events = await CalendarFeedsService.getStaffFeed(userId, startDate, endDate);

      expect(Class.find).toHaveBeenCalledWith({
        instructorIds: userId,
        isActive: true,
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      });

      expect(events).toHaveLength(1);
      expect(events[0].feedId).toBe('staff');
      expect(events[0].kind).toBe('span');
      expect(events[0].eventType).toBe('class-session');
      expect(events[0].title).toBe('Biology 101');
      expect(events[0].startDate).toBe('2026-03-05');
      expect(events[0].endDate).toBe('2026-03-25');
      expect(events[0].location).toBe('Room 204');
    });

    it('should use class name when course is not populated', async () => {
      const mockClasses = [
        {
          _id: mockObjectId(),
          name: 'Standalone Class',
          courseId: null,
          startDate: new Date('2026-03-10'),
          endDate: new Date('2026-03-20'),
          isActive: true
        }
      ];

      (Class.find as jest.Mock).mockReturnValue(buildMockChain(mockClasses));

      const events = await CalendarFeedsService.getStaffFeed(userId, startDate, endDate);

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Standalone Class');
    });

    it('should return empty array when instructor has no classes', async () => {
      (Class.find as jest.Mock).mockReturnValue(buildMockChain([]));

      const events = await CalendarFeedsService.getStaffFeed(userId, startDate, endDate);

      expect(events).toHaveLength(0);
    });
  });

  describe('getSystemFeed', () => {
    it('should return academic-date spans for years and terms in range', async () => {
      const yearId = mockObjectId();
      const termId = mockObjectId();

      const mockYears = [
        {
          _id: yearId,
          name: '2025-2026',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-06-30'),
          isCurrent: true,
          isActive: true
        }
      ];

      const mockTerms = [
        {
          _id: termId,
          name: 'Spring 2026',
          academicYearId: yearId,
          startDate: new Date('2026-01-15'),
          endDate: new Date('2026-05-15'),
          termType: 'spring',
          isActive: true
        }
      ];

      (AcademicYear.find as jest.Mock).mockReturnValue(buildMockChain(mockYears));
      (AcademicTerm.find as jest.Mock).mockReturnValue(buildMockChain(mockTerms));

      const events = await CalendarFeedsService.getSystemFeed(startDate, endDate);

      expect(AcademicYear.find).toHaveBeenCalledWith({
        isActive: true,
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      });

      expect(AcademicTerm.find).toHaveBeenCalledWith({
        isActive: true,
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      });

      expect(events).toHaveLength(2);

      const yearEvent = events.find(e => e.id.startsWith('academic-year'));
      expect(yearEvent).toBeDefined();
      expect(yearEvent!.feedId).toBe('system');
      expect(yearEvent!.kind).toBe('span');
      expect(yearEvent!.eventType).toBe('academic-date');
      expect(yearEvent!.title).toBe('2025-2026');
      expect(yearEvent!.description).toBe('Current academic year');
      expect(yearEvent!.metadata?.isCurrent).toBe(true);

      const termEvent = events.find(e => e.id.startsWith('academic-term'));
      expect(termEvent).toBeDefined();
      expect(termEvent!.feedId).toBe('system');
      expect(termEvent!.kind).toBe('span');
      expect(termEvent!.eventType).toBe('academic-date');
      expect(termEvent!.title).toBe('Spring 2026');
      expect(termEvent!.description).toBe('spring term');
      expect(termEvent!.metadata?.termType).toBe('spring');
    });

    it('should return empty array when no academic data in range', async () => {
      (AcademicYear.find as jest.Mock).mockReturnValue(buildMockChain([]));
      (AcademicTerm.find as jest.Mock).mockReturnValue(buildMockChain([]));

      const events = await CalendarFeedsService.getSystemFeed(startDate, endDate);

      expect(events).toHaveLength(0);
    });

    it('should not include description for non-current academic years', async () => {
      const mockYears = [
        {
          _id: mockObjectId(),
          name: '2024-2025',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2026-06-30'),
          isCurrent: false,
          isActive: true
        }
      ];

      (AcademicYear.find as jest.Mock).mockReturnValue(buildMockChain(mockYears));
      (AcademicTerm.find as jest.Mock).mockReturnValue(buildMockChain([]));

      const events = await CalendarFeedsService.getSystemFeed(startDate, endDate);

      expect(events).toHaveLength(1);
      expect(events[0].description).toBeUndefined();
    });
  });
});
