import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import Class from '@/models/academic/Class.model';
import AcademicYear from '@/models/academic/AcademicYear.model';
import AcademicTerm from '@/models/academic/AcademicTerm.model';

export interface CalendarEvent {
  id: string;
  feedId: 'learner' | 'staff' | 'system';
  kind: 'point' | 'span';
  title: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  time?: string;
  location?: string;
  eventType: string;
  description?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Determines if two date ranges overlap.
 * Range A [aStart, aEnd] overlaps Range B [bStart, bEnd] when aStart <= bEnd AND aEnd >= bStart.
 */
function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export class CalendarFeedsService {
  /**
   * Get calendar events for a learner: class sessions and enrollment milestones.
   */
  static async getLearnerFeed(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // 1. Class enrollments → class session spans + enrollment-start points
    const classEnrollments = await ClassEnrollment.find({
      learnerId: userId,
      status: { $in: ['enrolled', 'active'] }
    }).populate({
      path: 'classId',
      populate: { path: 'courseId', select: 'name code' }
    }).lean();

    for (const ce of classEnrollments) {
      const cls = ce.classId as any;
      if (!cls || !cls.startDate || !cls.endDate) continue;

      const classStart = new Date(cls.startDate);
      const classEnd = new Date(cls.endDate);

      // Class session span (if overlaps the requested range)
      if (rangesOverlap(classStart, classEnd, startDate, endDate)) {
        const courseName = cls.courseId?.name || cls.name;
        events.push({
          id: `class-session-${cls._id}`,
          feedId: 'learner',
          kind: 'span',
          title: courseName,
          startDate: toISODate(classStart),
          endDate: toISODate(classEnd),
          eventType: 'class-session',
          location: cls.location || undefined,
          description: cls.schedule || undefined,
          actionUrl: `/classes/${cls._id}`,
          metadata: {
            classId: String(cls._id),
            courseId: cls.courseId?._id ? String(cls.courseId._id) : undefined
          }
        });
      }

      // Enrollment start point
      const enrollDate = new Date(ce.enrollmentDate);
      if (enrollDate >= startDate && enrollDate <= endDate) {
        events.push({
          id: `enrollment-start-ce-${ce._id}`,
          feedId: 'learner',
          kind: 'point',
          title: `Enrolled: ${cls.name}`,
          date: toISODate(enrollDate),
          eventType: 'enrollment-start',
          actionUrl: `/classes/${cls._id}`
        });
      }
    }

    // 2. Program enrollments → enrollment-start and enrollment-expiry points
    const enrollments = await Enrollment.find({
      learnerId: userId,
      status: { $in: ['pending', 'active'] }
    }).populate('programId', 'name code').lean();

    for (const enr of enrollments) {
      const program = enr.programId as any;
      const programName = program?.name || 'Program';

      // enrollment-start point
      const enrollStart = enr.startDate ? new Date(enr.startDate) : new Date(enr.enrollmentDate);
      if (enrollStart >= startDate && enrollStart <= endDate) {
        events.push({
          id: `enrollment-start-${enr._id}`,
          feedId: 'learner',
          kind: 'point',
          title: `Enrolled: ${programName}`,
          date: toISODate(enrollStart),
          eventType: 'enrollment-start',
          actionUrl: `/programs/${program?._id || ''}`
        });
      }

      // enrollment-expiry point
      if (enr.accessExpiresAt) {
        const expiry = new Date(enr.accessExpiresAt);
        if (expiry >= startDate && expiry <= endDate) {
          events.push({
            id: `enrollment-expiry-${enr._id}`,
            feedId: 'learner',
            kind: 'point',
            title: `Access Expires: ${programName}`,
            date: toISODate(expiry),
            eventType: 'enrollment-expiry',
            actionUrl: `/programs/${program?._id || ''}`,
            metadata: { programId: program?._id ? String(program._id) : undefined }
          });
        }
      }
    }

    return events;
  }

  /**
   * Get calendar events for a staff member: classes they teach.
   */
  static async getStaffFeed(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    const classes = await Class.find({
      instructorIds: userId,
      isActive: true,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    }).populate('courseId', 'name code').lean();

    for (const cls of classes) {
      const course = cls.courseId as any;
      const courseName = course?.name || cls.name;

      events.push({
        id: `class-session-${cls._id}`,
        feedId: 'staff',
        kind: 'span',
        title: courseName,
        startDate: toISODate(new Date(cls.startDate)),
        endDate: toISODate(new Date(cls.endDate)),
        eventType: 'class-session',
        location: cls.location || undefined,
        description: cls.schedule || undefined,
        actionUrl: `/classes/${cls._id}`,
        metadata: {
          classId: String(cls._id),
          courseId: course?._id ? String(course._id) : undefined
        }
      });
    }

    return events;
  }

  /**
   * Get system-wide calendar events: academic years and terms.
   */
  static async getSystemFeed(
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // Academic years overlapping range
    const years = await AcademicYear.find({
      isActive: true,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    }).lean();

    for (const year of years) {
      events.push({
        id: `academic-year-${year._id}`,
        feedId: 'system',
        kind: 'span',
        title: year.name,
        startDate: toISODate(new Date(year.startDate)),
        endDate: toISODate(new Date(year.endDate)),
        eventType: 'academic-date',
        description: year.isCurrent ? 'Current academic year' : undefined,
        metadata: { academicYearId: String(year._id), isCurrent: year.isCurrent }
      });
    }

    // Academic terms overlapping range
    const terms = await AcademicTerm.find({
      isActive: true,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    }).lean();

    for (const term of terms) {
      events.push({
        id: `academic-term-${term._id}`,
        feedId: 'system',
        kind: 'span',
        title: term.name,
        startDate: toISODate(new Date(term.startDate)),
        endDate: toISODate(new Date(term.endDate)),
        eventType: 'academic-date',
        description: `${term.termType} term`,
        metadata: {
          academicTermId: String(term._id),
          academicYearId: String(term.academicYearId),
          termType: term.termType
        }
      });
    }

    return events;
  }
}
