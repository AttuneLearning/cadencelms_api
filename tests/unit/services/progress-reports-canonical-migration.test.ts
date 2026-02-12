import mongoose from 'mongoose';
import { ProgressService } from '@/services/analytics/progress.service';
import { ReportsService } from '@/services/reporting/reports.service';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import Class from '@/models/academic/Class.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import { getDepartmentAndSubdepartments } from '@/utils/departmentHierarchy';

jest.mock('@/models/academic/CanonicalCourse.model', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn()
  }
}));

jest.mock('@/models/academic/Class.model', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn()
  }
}));

jest.mock('@/models/enrollment/ClassEnrollment.model', () => ({
  __esModule: true,
  default: {
    find: jest.fn()
  }
}));

jest.mock('@/utils/departmentHierarchy', () => ({
  getDepartmentAndSubdepartments: jest.fn()
}));

describe('Progress/Reports canonical migration guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ProgressService.applyDepartmentScoping scopes classes from CanonicalCourse', async () => {
    const departmentId = new mongoose.Types.ObjectId().toString();
    const courseId = new mongoose.Types.ObjectId();
    const classId = new mongoose.Types.ObjectId();

    (getDepartmentAndSubdepartments as jest.Mock).mockResolvedValue([departmentId]);
    (CanonicalCourse.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: courseId }])
    });
    (Class.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: classId }])
    });

    const scopedQuery = await ProgressService.applyDepartmentScoping(
      {},
      {
        departmentMemberships: [
          {
            departmentId,
            roles: ['department-admin']
          }
        ]
      }
    );

    expect(CanonicalCourse.find).toHaveBeenCalledWith({
      departmentId: { $in: [departmentId] }
    });
    expect(scopedQuery.classId).toEqual({ $in: [classId] });
  });

  it('ReportsService.getCompletionReport resolves program filter from CanonicalCourse', async () => {
    const programId = new mongoose.Types.ObjectId().toString();
    const courseId = new mongoose.Types.ObjectId();
    const classId = new mongoose.Types.ObjectId();

    (CanonicalCourse.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: courseId }])
    });
    (Class.find as jest.Mock).mockResolvedValue([{ _id: classId }]);
    (ClassEnrollment.find as jest.Mock).mockResolvedValue([]);

    const result = await ReportsService.getCompletionReport({ programId });

    expect(CanonicalCourse.find).toHaveBeenCalledWith({ programId });
    expect(result.summary.totalEnrollments).toBe(0);
  });

  it('ReportsService.filterTranscriptByDepartment filters via canonical course ownership', async () => {
    const allowedDepartmentId = new mongoose.Types.ObjectId().toString();
    const otherDepartmentId = new mongoose.Types.ObjectId().toString();
    const allowedCourseId = new mongoose.Types.ObjectId().toString();
    const hiddenCourseId = new mongoose.Types.ObjectId().toString();

    (getDepartmentAndSubdepartments as jest.Mock).mockResolvedValue([allowedDepartmentId]);
    (CanonicalCourse.find as jest.Mock).mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(allowedCourseId),
        departmentId: new mongoose.Types.ObjectId(allowedDepartmentId)
      },
      {
        _id: new mongoose.Types.ObjectId(hiddenCourseId),
        departmentId: new mongoose.Types.ObjectId(otherDepartmentId)
      }
    ]);

    const transcript = {
      programs: [
        {
          programId: 'program-1',
          courses: [
            { courseId: allowedCourseId },
            { courseId: hiddenCourseId }
          ]
        }
      ]
    };

    const filtered = await ReportsService.filterTranscriptByDepartment(transcript, {
      departmentMemberships: [
        {
          departmentId: allowedDepartmentId,
          roles: ['department-admin']
        }
      ]
    });

    expect(filtered.programs).toHaveLength(1);
    expect(filtered.programs[0].courses).toEqual([{ courseId: allowedCourseId }]);
  });
});
