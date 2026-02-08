import { ProgramProgressService } from '@/services/enrollment/programProgress.service';
import Enrollment from '@/models/enrollment/Enrollment.model';
import Program from '@/models/academic/Program.model';
import Course from '@/models/academic/Course.model';
import { User } from '@/models/auth/User.model';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

jest.mock('@/models/enrollment/Enrollment.model', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    find: jest.fn()
  }
}));

jest.mock('@/models/academic/Program.model', () => ({
  __esModule: true,
  default: {
    findById: jest.fn()
  }
}));

jest.mock('@/models/academic/Course.model', () => ({
  __esModule: true,
  default: {
    find: jest.fn()
  }
}));

jest.mock('@/models/auth/User.model', () => ({
  User: {
    findById: jest.fn()
  }
}));

describe('ProgramProgressService', () => {
  const learnerId = new ObjectId().toString();
  const programId = new ObjectId().toString();
  const enrollmentId = new ObjectId().toString();
  const departmentId = new ObjectId();

  beforeEach(() => jest.clearAllMocks());

  it('should return progress with mixed course statuses', async () => {
    const courseId1 = new ObjectId();
    const courseId2 = new ObjectId();
    const courseId3 = new ObjectId();
    const courseEnrollmentId1 = new ObjectId();
    const courseEnrollmentId2 = new ObjectId();

    // Mock Enrollment.findById().lean() - program enrollment
    (Enrollment.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(enrollmentId),
        learnerId: new ObjectId(learnerId),
        programId: new ObjectId(programId),
        status: 'active',
        enrollmentDate: new Date('2025-01-01'),
        metadata: {}
      })
    });

    // Mock User.findById().lean()
    (User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(learnerId),
        userTypes: ['learner']
      })
    });

    // Mock Program.findById().lean()
    (Program.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(programId),
        name: 'Computer Science',
        code: 'CS-101',
        departmentId
      })
    });

    // Mock Course.find().select().lean()
    const mockCourseLean = jest.fn().mockResolvedValue([
      { _id: courseId1, name: 'Intro to Programming', code: 'CS-110', status: 'published' },
      { _id: courseId2, name: 'Data Structures', code: 'CS-210', status: 'published' },
      { _id: courseId3, name: 'Algorithms', code: 'CS-310', status: 'published' }
    ]);
    const mockCourseSelect = jest.fn().mockReturnValue({ lean: mockCourseLean });
    (Course.find as jest.Mock).mockReturnValue({ select: mockCourseSelect });

    // Mock Enrollment.find().lean() - course enrollments
    (Enrollment.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: courseEnrollmentId1,
          learnerId: new ObjectId(learnerId),
          status: 'active',
          enrollmentDate: new Date('2025-02-01'),
          completionDate: null,
          metadata: { courseId: courseId1.toString(), enrollmentType: 'course' }
        },
        {
          _id: courseEnrollmentId2,
          learnerId: new ObjectId(learnerId),
          status: 'completed',
          enrollmentDate: new Date('2025-02-01'),
          completionDate: new Date('2025-06-01'),
          metadata: { courseId: courseId2.toString(), enrollmentType: 'course' }
        }
      ])
    });

    const result = await ProgramProgressService.getEnrollmentProgress(enrollmentId, learnerId);

    expect(result.progress.percentage).toBe(33);
    expect(result.progress.completedCourses).toBe(1);
    expect(result.progress.inProgressCourses).toBe(1);
    expect(result.progress.notStartedCourses).toBe(1);
    expect(result.progress.totalCourses).toBe(3);
    expect(result.programName).toBe('Computer Science');
    expect(result.programCode).toBe('CS-101');
    expect(result.courses).toHaveLength(3);
  });

  it('should return 100% when all courses completed', async () => {
    const courseId1 = new ObjectId();
    const courseId2 = new ObjectId();
    const courseEnrollmentId1 = new ObjectId();
    const courseEnrollmentId2 = new ObjectId();

    // Mock Enrollment.findById().lean()
    (Enrollment.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(enrollmentId),
        learnerId: new ObjectId(learnerId),
        programId: new ObjectId(programId),
        status: 'active',
        enrollmentDate: new Date('2025-01-01'),
        metadata: {}
      })
    });

    // Mock User.findById().lean()
    (User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(learnerId),
        userTypes: ['learner']
      })
    });

    // Mock Program.findById().lean()
    (Program.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(programId),
        name: 'Computer Science',
        code: 'CS-101',
        departmentId
      })
    });

    // Mock Course.find().select().lean()
    const mockCourseLean = jest.fn().mockResolvedValue([
      { _id: courseId1, name: 'Intro to Programming', code: 'CS-110', status: 'published' },
      { _id: courseId2, name: 'Data Structures', code: 'CS-210', status: 'published' }
    ]);
    const mockCourseSelect = jest.fn().mockReturnValue({ lean: mockCourseLean });
    (Course.find as jest.Mock).mockReturnValue({ select: mockCourseSelect });

    // Mock Enrollment.find().lean() - all completed
    (Enrollment.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: courseEnrollmentId1,
          learnerId: new ObjectId(learnerId),
          status: 'completed',
          enrollmentDate: new Date('2025-02-01'),
          completionDate: new Date('2025-06-01'),
          metadata: { courseId: courseId1.toString(), enrollmentType: 'course' }
        },
        {
          _id: courseEnrollmentId2,
          learnerId: new ObjectId(learnerId),
          status: 'completed',
          enrollmentDate: new Date('2025-02-01'),
          completionDate: new Date('2025-07-01'),
          metadata: { courseId: courseId2.toString(), enrollmentType: 'course' }
        }
      ])
    });

    const result = await ProgramProgressService.getEnrollmentProgress(enrollmentId, learnerId);

    expect(result.progress.percentage).toBe(100);
    expect(result.progress.completedCourses).toBe(2);
    expect(result.progress.inProgressCourses).toBe(0);
    expect(result.progress.notStartedCourses).toBe(0);
    expect(result.progress.totalCourses).toBe(2);
  });

  it('should return 0% when no courses started', async () => {
    const courseId1 = new ObjectId();
    const courseId2 = new ObjectId();
    const courseId3 = new ObjectId();

    // Mock Enrollment.findById().lean()
    (Enrollment.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(enrollmentId),
        learnerId: new ObjectId(learnerId),
        programId: new ObjectId(programId),
        status: 'active',
        enrollmentDate: new Date('2025-01-01'),
        metadata: {}
      })
    });

    // Mock User.findById().lean()
    (User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(learnerId),
        userTypes: ['learner']
      })
    });

    // Mock Program.findById().lean()
    (Program.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(programId),
        name: 'Computer Science',
        code: 'CS-101',
        departmentId
      })
    });

    // Mock Course.find().select().lean()
    const mockCourseLean = jest.fn().mockResolvedValue([
      { _id: courseId1, name: 'Intro to Programming', code: 'CS-110', status: 'published' },
      { _id: courseId2, name: 'Data Structures', code: 'CS-210', status: 'published' },
      { _id: courseId3, name: 'Algorithms', code: 'CS-310', status: 'published' }
    ]);
    const mockCourseSelect = jest.fn().mockReturnValue({ lean: mockCourseLean });
    (Course.find as jest.Mock).mockReturnValue({ select: mockCourseSelect });

    // Mock Enrollment.find().lean() - no course enrollments
    (Enrollment.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([])
    });

    const result = await ProgramProgressService.getEnrollmentProgress(enrollmentId, learnerId);

    expect(result.progress.percentage).toBe(0);
    expect(result.progress.completedCourses).toBe(0);
    expect(result.progress.inProgressCourses).toBe(0);
    expect(result.progress.notStartedCourses).toBe(3);
    expect(result.progress.totalCourses).toBe(3);
  });

  it('should reject invalid enrollment ID', async () => {
    await expect(
      ProgramProgressService.getEnrollmentProgress('invalid-id', learnerId)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid enrollment ID'
    });
  });

  it('should reject unauthorized access', async () => {
    const otherLearnerId = new ObjectId().toString();

    // Mock Enrollment.findById().lean() - enrollment belongs to someone else
    (Enrollment.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(enrollmentId),
        learnerId: new ObjectId(otherLearnerId),
        programId: new ObjectId(programId),
        status: 'active',
        enrollmentDate: new Date('2025-01-01'),
        metadata: {}
      })
    });

    // Mock User.findById().lean() - regular learner, not staff
    (User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(learnerId),
        userTypes: ['learner']
      })
    });

    await expect(
      ProgramProgressService.getEnrollmentProgress(enrollmentId, learnerId)
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Cannot view progress for this enrollment'
    });
  });

  it('should handle program with no courses', async () => {
    // Mock Enrollment.findById().lean()
    (Enrollment.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(enrollmentId),
        learnerId: new ObjectId(learnerId),
        programId: new ObjectId(programId),
        status: 'active',
        enrollmentDate: new Date('2025-01-01'),
        metadata: {}
      })
    });

    // Mock User.findById().lean()
    (User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(learnerId),
        userTypes: ['learner']
      })
    });

    // Mock Program.findById().lean()
    (Program.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new ObjectId(programId),
        name: 'New Program',
        code: 'NP-100',
        departmentId
      })
    });

    // Mock Course.find().select().lean() - no courses
    const mockCourseLean = jest.fn().mockResolvedValue([]);
    const mockCourseSelect = jest.fn().mockReturnValue({ lean: mockCourseLean });
    (Course.find as jest.Mock).mockReturnValue({ select: mockCourseSelect });

    // Mock Enrollment.find().lean() - no course enrollments
    (Enrollment.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([])
    });

    const result = await ProgramProgressService.getEnrollmentProgress(enrollmentId, learnerId);

    expect(result.progress.percentage).toBe(0);
    expect(result.progress.totalCourses).toBe(0);
    expect(result.progress.completedCourses).toBe(0);
    expect(result.progress.inProgressCourses).toBe(0);
    expect(result.progress.notStartedCourses).toBe(0);
    expect(result.courses).toHaveLength(0);
  });
});
