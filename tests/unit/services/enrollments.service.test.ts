/**
 * Unit Tests: EnrollmentsService
 *
 * Tests for the enrollments service:
 * - enrollProgram: validation, learner/program not found, duplicate, success
 * - enrollCourse: validation, learner/course not found, duplicate, success
 * - getEnrollmentById: invalid ID, not found, found in program enrollments, found in class enrollments
 * - withdrawEnrollment: invalid ID, not found, already completed, already withdrawn, success
 * - listEnrollments: basic filtering with program and class types
 * - updateEnrollmentStatus: invalid transitions, valid transitions with grade
 * - bulkEnrollCourse: course not found, unpublished, mixed success/failure
 */

import mongoose from 'mongoose';
import { EnrollmentsService } from '@/services/enrollment/enrollments.service';
import Enrollment from '@/models/enrollment/Enrollment.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import Program from '@/models/academic/Program.model';
import Course from '@/models/academic/Course.model';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import Class from '@/models/academic/Class.model';
import { User } from '@/models/auth/User.model';
import { Learner } from '@/models/auth/Learner.model';
import { ApiError } from '@/utils/ApiError';

// Mock the models
jest.mock('@/models/enrollment/Enrollment.model');
jest.mock('@/models/enrollment/ClassEnrollment.model');
jest.mock('@/models/academic/Program.model');
jest.mock('@/models/academic/Course.model');
jest.mock('@/models/academic/CanonicalCourse.model');
jest.mock('@/models/academic/CourseVersion.model');
jest.mock('@/models/academic/Class.model');
jest.mock('@/models/auth/User.model');
jest.mock('@/models/auth/Learner.model');
jest.mock('@/services/auth/authorize.service');

// Mock Department via dynamic import
jest.mock('@/models/organization/Department.model', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(null)
    })
  }
}));

describe('EnrollmentsService', () => {
  const mockLearnerId = new mongoose.Types.ObjectId().toString();
  const mockProgramId = new mongoose.Types.ObjectId().toString();
  const mockCourseId = new mongoose.Types.ObjectId().toString();
  const mockClassId = new mongoose.Types.ObjectId().toString();
  const mockDeptId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockEnrollmentId = new mongoose.Types.ObjectId().toString();

  const mockUser = {
    _id: new mongoose.Types.ObjectId(mockLearnerId),
    email: 'learner@example.com',
    userTypes: ['learner'],
    isActive: true
  };

  const mockLearnerDetails = {
    _id: new mongoose.Types.ObjectId(mockLearnerId),
    person: {
      firstName: 'John',
      lastName: 'Doe'
    }
  };

  const mockProgramPopulated = {
    _id: new mongoose.Types.ObjectId(mockProgramId),
    name: 'Test Program',
    code: 'PROG-001',
    departmentId: {
      _id: new mongoose.Types.ObjectId(mockDeptId),
      name: 'Test Department'
    }
  };

  const mockCoursePopulated = {
    _id: new mongoose.Types.ObjectId(mockCourseId),
    name: 'Test Course',
    code: 'COURSE-001',
    status: 'published',
    departmentId: {
      _id: new mongoose.Types.ObjectId(mockDeptId),
      name: 'Test Department'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: User.findById returns mockUser
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    // Default: Learner.findById returns mockLearnerDetails
    (Learner.findById as jest.Mock).mockResolvedValue(mockLearnerDetails);

    // Default: no existing enrollments
    (Enrollment.findOne as jest.Mock).mockResolvedValue(null);
    (ClassEnrollment.findOne as jest.Mock).mockResolvedValue(null);
  });

  // ============================================================
  // enrollProgram
  // ============================================================
  describe('enrollProgram', () => {
    const setupProgramMock = (value: any) => {
      const mockPopulate = jest.fn().mockResolvedValue(value);
      (Program.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
    };

    beforeEach(() => {
      setupProgramMock(mockProgramPopulated);
    });

    it('should throw badRequest for invalid learner ID', async () => {
      await expect(
        EnrollmentsService.enrollProgram(
          { learnerId: 'invalid-id', programId: mockProgramId },
          mockUserId
        )
      ).rejects.toThrow(ApiError);

      await expect(
        EnrollmentsService.enrollProgram(
          { learnerId: 'invalid-id', programId: mockProgramId },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid learner ID' });
    });

    it('should throw badRequest for invalid program ID', async () => {
      await expect(
        EnrollmentsService.enrollProgram(
          { learnerId: mockLearnerId, programId: 'invalid-id' },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid program ID' });
    });

    it('should throw notFound when learner does not exist', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        EnrollmentsService.enrollProgram(
          { learnerId: mockLearnerId, programId: mockProgramId },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 404, message: 'Learner not found' });
    });

    it('should throw notFound when program does not exist', async () => {
      setupProgramMock(null);

      await expect(
        EnrollmentsService.enrollProgram(
          { learnerId: mockLearnerId, programId: mockProgramId },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 404, message: 'Program not found' });
    });

    it('should throw conflict when learner is already enrolled in the program', async () => {
      (Enrollment.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        learnerId: mockLearnerId,
        programId: mockProgramId,
        status: 'active'
      });

      await expect(
        EnrollmentsService.enrollProgram(
          { learnerId: mockLearnerId, programId: mockProgramId },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 409, message: 'Learner already enrolled in this program' });
    });

    it('should successfully enroll learner in a program', async () => {
      const savedEnrollmentId = new mongoose.Types.ObjectId();
      const now = new Date();

      // Mock Enrollment constructor and save
      const mockSave = jest.fn().mockResolvedValue(undefined);
      (Enrollment as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: savedEnrollmentId,
        status: 'active',
        enrollmentDate: data.enrollmentDate || now,
        createdAt: now,
        updatedAt: now,
        save: mockSave
      }));

      const result = await EnrollmentsService.enrollProgram(
        { learnerId: mockLearnerId, programId: mockProgramId },
        mockUserId
      );

      expect(result).toBeDefined();
      expect(result.enrollment).toBeDefined();
      expect(result.enrollment.type).toBe('program');
      expect(result.enrollment.id).toBe(savedEnrollmentId.toString());
      expect(result.enrollment.status).toBe('active');
      expect(result.enrollment.learner.email).toBe('learner@example.com');
      expect(result.enrollment.learner.firstName).toBe('John');
      expect(result.enrollment.learner.lastName).toBe('Doe');
      expect(result.enrollment.program.name).toBe('Test Program');
      expect(result.enrollment.program.code).toBe('PROG-001');
      expect(result.enrollment.program.department.name).toBe('Test Department');
      expect(result.enrollment.progress.percentage).toBe(0);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should use custom enrolledAt and expiresAt when provided', async () => {
      const enrolledAt = new Date('2025-01-15');
      const expiresAt = new Date('2026-01-15');
      const savedEnrollmentId = new mongoose.Types.ObjectId();

      const mockSave = jest.fn().mockResolvedValue(undefined);
      (Enrollment as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: savedEnrollmentId,
        status: 'active',
        enrollmentDate: data.enrollmentDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockSave
      }));

      const result = await EnrollmentsService.enrollProgram(
        { learnerId: mockLearnerId, programId: mockProgramId, enrolledAt, expiresAt },
        mockUserId
      );

      expect(result.enrollment.enrolledAt).toEqual(enrolledAt);
      expect(result.enrollment.expiresAt).toEqual(expiresAt);
    });
  });

  // ============================================================
  // enrollCourse
  // ============================================================
  describe('enrollCourse', () => {
    const setupCourseMock = (value: any) => {
      const mockPopulate = jest.fn().mockResolvedValue(value);
      (Course.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
    };

    beforeEach(() => {
      setupCourseMock(mockCoursePopulated);
    });

    it('should throw badRequest for invalid learner ID', async () => {
      await expect(
        EnrollmentsService.enrollCourse(
          { learnerId: 'bad-id', courseId: mockCourseId },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid learner ID' });
    });

    it('should throw badRequest for invalid course ID', async () => {
      await expect(
        EnrollmentsService.enrollCourse(
          { learnerId: mockLearnerId, courseId: 'bad-id' },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid course ID' });
    });

    it('should throw notFound when learner does not exist', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        EnrollmentsService.enrollCourse(
          { learnerId: mockLearnerId, courseId: mockCourseId },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 404, message: 'Learner not found' });
    });

    it('should throw notFound when course does not exist', async () => {
      setupCourseMock(null);

      await expect(
        EnrollmentsService.enrollCourse(
          { learnerId: mockLearnerId, courseId: mockCourseId },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 404, message: 'Course not found' });
    });

    it('should throw conflict when learner is already enrolled in the course', async () => {
      (Enrollment.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        learnerId: mockLearnerId,
        'metadata.courseId': mockCourseId,
        status: 'active'
      });

      await expect(
        EnrollmentsService.enrollCourse(
          { learnerId: mockLearnerId, courseId: mockCourseId },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 409, message: 'Learner already enrolled in this course' });
    });

    it('should successfully enroll learner in a course', async () => {
      const savedEnrollmentId = new mongoose.Types.ObjectId();
      const now = new Date();

      const mockSave = jest.fn().mockResolvedValue(undefined);
      (Enrollment as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: savedEnrollmentId,
        status: 'active',
        enrollmentDate: data.enrollmentDate || now,
        createdAt: now,
        updatedAt: now,
        save: mockSave
      }));

      const result = await EnrollmentsService.enrollCourse(
        { learnerId: mockLearnerId, courseId: mockCourseId },
        mockUserId
      );

      expect(result).toBeDefined();
      expect(result.enrollment).toBeDefined();
      expect(result.enrollment.type).toBe('course');
      expect(result.enrollment.id).toBe(savedEnrollmentId.toString());
      expect(result.enrollment.status).toBe('active');
      expect(result.enrollment.learner.email).toBe('learner@example.com');
      expect(result.enrollment.course.title).toBe('Test Course');
      expect(result.enrollment.course.code).toBe('COURSE-001');
      expect(result.enrollment.course.department.name).toBe('Test Department');
      expect(result.enrollment.progress.percentage).toBe(0);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ============================================================
  // getEnrollmentById
  // ============================================================
  describe('getEnrollmentById', () => {
    it('should throw badRequest for invalid enrollment ID', async () => {
      await expect(
        EnrollmentsService.getEnrollmentById('invalid-id', mockUserId)
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid enrollment ID' });
    });

    it('should throw notFound when enrollment is not found in either collection', async () => {
      const mockFindByIdLean = jest.fn().mockResolvedValue(null);
      (Enrollment.findById as jest.Mock).mockReturnValue({ lean: mockFindByIdLean });
      (ClassEnrollment.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await expect(
        EnrollmentsService.getEnrollmentById(mockEnrollmentId, mockUserId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Enrollment not found' });
    });

    it('should return enriched program enrollment when found in Enrollment collection', async () => {
      const enrollmentData = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        programId: new mongoose.Types.ObjectId(mockProgramId),
        status: 'active',
        enrollmentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      (Enrollment.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(enrollmentData)
      });

      // Setup enrichment mocks: User, Learner, Program with populate
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Learner.findById as jest.Mock).mockResolvedValue(mockLearnerDetails);
      const mockPopulate = jest.fn().mockResolvedValue(mockProgramPopulated);
      (Program.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await EnrollmentsService.getEnrollmentById(mockEnrollmentId, mockUserId);

      expect(result).toBeDefined();
      expect(result.type).toBe('program');
      expect(result.learner.email).toBe('learner@example.com');
      expect(result.progress).toBeDefined();
      expect(result.progress.moduleProgress).toEqual([]);
      expect(result.metadata).toBeDefined();
    });

    it('should return enriched class enrollment when not found in Enrollment but found in ClassEnrollment', async () => {
      // Not found in Enrollment
      (Enrollment.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      const classEnrollmentData = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        classId: new mongoose.Types.ObjectId(mockClassId),
        status: 'enrolled',
        enrollmentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (ClassEnrollment.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(classEnrollmentData)
      });

      // Setup enrichment mocks for class enrollment
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Learner.findById as jest.Mock).mockResolvedValue(mockLearnerDetails);

      const mockCourseIdObj = new mongoose.Types.ObjectId(mockCourseId);
      const mockClassDoc = {
        _id: new mongoose.Types.ObjectId(mockClassId),
        name: 'Test Class',
        courseId: {
          _id: mockCourseIdObj,
          name: 'Test Course',
          code: 'COURSE-001'
        },
        startDate: new Date(),
        endDate: new Date(),
        maxEnrollment: 30
      };

      // enrichEnrollment calls Class.findById(classId).populate('courseId') - single populate
      (Class.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockClassDoc)
      });

      // Then calls Course.findById(course._id).populate('departmentId')
      (Course.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockCoursePopulated)
      });

      const result = await EnrollmentsService.getEnrollmentById(mockEnrollmentId, mockUserId);

      expect(result).toBeDefined();
      expect(result.type).toBe('class');
      expect(result.learner.email).toBe('learner@example.com');
      expect(result.department).toBeDefined();
      expect(result.department.name).toBe('Test Department');
    });
  });

  // ============================================================
  // withdrawEnrollment
  // ============================================================
  describe('withdrawEnrollment', () => {
    it('should throw badRequest for invalid enrollment ID', async () => {
      await expect(
        EnrollmentsService.withdrawEnrollment('invalid-id', {}, mockUserId)
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid enrollment ID' });
    });

    it('should throw notFound when enrollment is not found', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(null);
      (ClassEnrollment.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        EnrollmentsService.withdrawEnrollment(mockEnrollmentId, {}, mockUserId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Enrollment not found' });
    });

    it('should throw unprocessable when enrollment is already completed', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'completed',
        save: jest.fn()
      });

      await expect(
        EnrollmentsService.withdrawEnrollment(mockEnrollmentId, {}, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'Cannot withdraw from completed enrollment'
      });
    });

    it('should throw unprocessable when enrollment is already graduated', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'graduated',
        save: jest.fn()
      });

      await expect(
        EnrollmentsService.withdrawEnrollment(mockEnrollmentId, {}, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'Cannot withdraw from completed enrollment'
      });
    });

    it('should throw unprocessable when enrollment is already withdrawn', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'withdrawn',
        save: jest.fn()
      });

      await expect(
        EnrollmentsService.withdrawEnrollment(mockEnrollmentId, {}, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'Enrollment already withdrawn'
      });
    });

    it('should throw unprocessable when class enrollment is already dropped', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(null);
      (ClassEnrollment.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'dropped',
        save: jest.fn()
      });

      await expect(
        EnrollmentsService.withdrawEnrollment(mockEnrollmentId, {}, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'Enrollment already withdrawn'
      });
    });

    it('should successfully withdraw an active program enrollment', async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const enrollment = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'active',
        withdrawalDate: undefined as Date | undefined,
        withdrawalReason: undefined as string | undefined,
        gradePercentage: 85,
        gradeLetter: 'B',
        save: mockSave
      };

      (Enrollment.findById as jest.Mock).mockResolvedValue(enrollment);

      const result = await EnrollmentsService.withdrawEnrollment(
        mockEnrollmentId,
        { reason: 'Personal reasons' },
        mockUserId
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(mockEnrollmentId);
      expect(result.status).toBe('withdrawn');
      expect(result.withdrawnAt).toBeDefined();
      expect(result.finalGrade.score).toBe(85);
      expect(result.finalGrade.letter).toBe('B');
      expect(enrollment.status).toBe('withdrawn');
      expect(enrollment.withdrawalReason).toBe('Personal reasons');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should successfully withdraw a class enrollment and decrement class count', async () => {
      const mockEnrollmentSave = jest.fn().mockResolvedValue(undefined);
      const classEnrollment = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        classId: new mongoose.Types.ObjectId(mockClassId),
        status: 'enrolled',
        withdrawalDate: undefined as Date | undefined,
        withdrawalReason: undefined as string | undefined,
        gradePercentage: null,
        gradeLetter: null,
        save: mockEnrollmentSave
      };

      (Enrollment.findById as jest.Mock).mockResolvedValue(null);
      (ClassEnrollment.findById as jest.Mock).mockResolvedValue(classEnrollment);

      const mockClassSave = jest.fn().mockResolvedValue(undefined);
      const classDoc = {
        _id: new mongoose.Types.ObjectId(mockClassId),
        currentEnrollment: 15,
        save: mockClassSave
      };
      (Class.findById as jest.Mock).mockResolvedValue(classDoc);

      const result = await EnrollmentsService.withdrawEnrollment(
        mockEnrollmentId,
        { reason: 'Schedule conflict' },
        mockUserId
      );

      expect(result.status).toBe('withdrawn');
      expect(classDoc.currentEnrollment).toBe(14);
      expect(mockClassSave).toHaveBeenCalled();
      expect(mockEnrollmentSave).toHaveBeenCalled();
    });
  });

  // ============================================================
  // listEnrollments
  // ============================================================
  describe('listEnrollments', () => {
    it('should return paginated results when querying program enrollments', async () => {
      const mockEnrollments = [
        {
          _id: new mongoose.Types.ObjectId(),
          learnerId: new mongoose.Types.ObjectId(mockLearnerId),
          programId: new mongoose.Types.ObjectId(mockProgramId),
          status: 'active',
          enrollmentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Mock Enrollment.find chain for program enrollments (first call)
      // and course enrollments (second call - returns empty)
      const programFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockEnrollments)
      };
      const courseFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (Enrollment.find as jest.Mock)
        .mockReturnValueOnce(programFindChain)
        .mockReturnValueOnce(courseFindChain);
      // First call (program query) returns 1, second call (course query) returns 0
      (Enrollment.countDocuments as jest.Mock)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      // Mock ClassEnrollment.find chain for class enrollments
      const classFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (ClassEnrollment.find as jest.Mock).mockReturnValue(classFindChain);
      (ClassEnrollment.countDocuments as jest.Mock).mockResolvedValue(0);

      // Mock enrichment
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Learner.findById as jest.Mock).mockResolvedValue(mockLearnerDetails);
      const programPopulate = jest.fn().mockResolvedValue(mockProgramPopulated);
      (Program.findById as jest.Mock).mockReturnValue({ populate: programPopulate });

      const result = await EnrollmentsService.listEnrollments(
        { page: 1, limit: 10 },
        mockUserId
      );

      expect(result).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(1);
      expect(result.enrollments).toBeDefined();
      expect(Array.isArray(result.enrollments)).toBe(true);
    });

    it('should filter by type=program and only query program enrollments', async () => {
      const findChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (Enrollment.find as jest.Mock).mockReturnValue(findChain);
      (Enrollment.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await EnrollmentsService.listEnrollments(
        { type: 'program' },
        mockUserId
      );

      expect(result.pagination.total).toBe(0);
      expect(result.enrollments).toEqual([]);
      // ClassEnrollment.find should NOT be called when type=program
      expect(ClassEnrollment.find).not.toHaveBeenCalled();
    });

    it('should filter by type=class and only query class enrollments', async () => {
      const classFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (ClassEnrollment.find as jest.Mock).mockReturnValue(classFindChain);
      (ClassEnrollment.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await EnrollmentsService.listEnrollments(
        { type: 'class' },
        mockUserId
      );

      expect(result.pagination.total).toBe(0);
      expect(result.enrollments).toEqual([]);
      // Enrollment.find should NOT be called when type=class
      expect(Enrollment.find).not.toHaveBeenCalled();
    });

    it('should enforce min page of 1 and max limit of 100', async () => {
      const findChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (Enrollment.find as jest.Mock).mockReturnValue(findChain);
      (Enrollment.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await EnrollmentsService.listEnrollments(
        { type: 'program', page: -5, limit: 500 },
        mockUserId
      );

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(100);
    });

    it('should filter by type=course and only query course enrollments', async () => {
      const courseFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (Enrollment.find as jest.Mock).mockReturnValue(courseFindChain);
      (Enrollment.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await EnrollmentsService.listEnrollments(
        { type: 'course' },
        mockUserId
      );

      expect(result.pagination.total).toBe(0);
      expect(result.enrollments).toEqual([]);
      // ClassEnrollment.find should NOT be called when type=course
      expect(ClassEnrollment.find).not.toHaveBeenCalled();
      // Enrollment.find should be called once (for course query only, not program)
      expect(Enrollment.find).toHaveBeenCalledTimes(1);
      // Verify the query includes the course metadata filter
      expect(Enrollment.find).toHaveBeenCalledWith(
        expect.objectContaining({ 'metadata.enrollmentType': 'course' })
      );
    });

    it('should return enriched course enrollments using CanonicalCourse', async () => {
      const canonicalId = new mongoose.Types.ObjectId();
      const versionId = new mongoose.Types.ObjectId();
      const mockCourseEnrollment = {
        _id: new mongoose.Types.ObjectId(),
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        programId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date(),
        metadata: {
          courseId: canonicalId,
          enrollmentType: 'course'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock: program query returns empty, course query returns one enrollment
      const emptyFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      const courseFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockCourseEnrollment])
      };
      (Enrollment.find as jest.Mock)
        .mockReturnValueOnce(emptyFindChain)   // program query
        .mockReturnValueOnce(courseFindChain); // course query
      (Enrollment.countDocuments as jest.Mock)
        .mockResolvedValueOnce(0)  // program count
        .mockResolvedValueOnce(1); // course count

      // Mock class query returns empty
      const classFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (ClassEnrollment.find as jest.Mock).mockReturnValue(classFindChain);
      (ClassEnrollment.countDocuments as jest.Mock).mockResolvedValue(0);

      // Mock enrichment: User and Learner
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Learner.findById as jest.Mock).mockResolvedValue(mockLearnerDetails);

      // Mock CanonicalCourse.findById with populate chain
      const mockCanonical = {
        _id: canonicalId,
        code: 'EMDR101',
        currentPublishedVersionId: versionId,
        departmentId: {
          _id: new mongoose.Types.ObjectId(mockDeptId),
          name: 'Test Department'
        }
      };
      (CanonicalCourse.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockCanonical)
      });

      // Mock CourseVersion.findById with select chain
      (CourseVersion.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ title: 'EMDR Introduction' })
      });

      const result = await EnrollmentsService.listEnrollments(
        { page: 1, limit: 10 },
        mockUserId
      );

      expect(result.pagination.total).toBe(1);
      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].type).toBe('course');
      expect(result.enrollments[0].target.name).toBe('EMDR Introduction');
      expect(result.enrollments[0].target.code).toBe('EMDR101');
      expect(result.enrollments[0].target.type).toBe('course');
    });

    it('should exclude course-type enrollments from program query', async () => {
      // When no type filter is specified, program query should exclude course-type enrollments
      const emptyFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (Enrollment.find as jest.Mock).mockReturnValue(emptyFindChain);
      (Enrollment.countDocuments as jest.Mock).mockResolvedValue(0);

      const classFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (ClassEnrollment.find as jest.Mock).mockReturnValue(classFindChain);
      (ClassEnrollment.countDocuments as jest.Mock).mockResolvedValue(0);

      await EnrollmentsService.listEnrollments({ page: 1, limit: 10 }, mockUserId);

      // First call should be the program query with $or exclusion
      const programQueryArg = (Enrollment.find as jest.Mock).mock.calls[0][0];
      expect(programQueryArg).toHaveProperty('$or');
      expect(programQueryArg.$or).toEqual([
        { 'metadata.enrollmentType': { $exists: false } },
        { 'metadata.enrollmentType': { $ne: 'course' } }
      ]);

      // Second call should be the course query
      const courseQueryArg = (Enrollment.find as jest.Mock).mock.calls[1][0];
      expect(courseQueryArg['metadata.enrollmentType']).toBe('course');
    });
  });

  // ============================================================
  // updateEnrollmentStatus
  // ============================================================
  describe('updateEnrollmentStatus', () => {
    it('should throw badRequest for invalid enrollment ID', async () => {
      await expect(
        EnrollmentsService.updateEnrollmentStatus(
          'invalid-id',
          { status: 'completed' },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid enrollment ID' });
    });

    it('should throw notFound when enrollment not found', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(null);
      (ClassEnrollment.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        EnrollmentsService.updateEnrollmentStatus(
          mockEnrollmentId,
          { status: 'completed' },
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 404, message: 'Enrollment not found' });
    });

    it('should throw unprocessable for invalid transition: completed -> active', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'completed',
        save: jest.fn()
      });

      await expect(
        EnrollmentsService.updateEnrollmentStatus(
          mockEnrollmentId,
          { status: 'active' },
          mockUserId
        )
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'Invalid status transition from completed to active'
      });
    });

    it('should throw unprocessable for invalid transition: withdrawn -> active', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'withdrawn',
        save: jest.fn()
      });

      await expect(
        EnrollmentsService.updateEnrollmentStatus(
          mockEnrollmentId,
          { status: 'active' },
          mockUserId
        )
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'Invalid status transition from withdrawn to active'
      });
    });

    it('should throw unprocessable for invalid transition: graduated -> withdrawn', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'graduated',
        save: jest.fn()
      });

      await expect(
        EnrollmentsService.updateEnrollmentStatus(
          mockEnrollmentId,
          { status: 'withdrawn' },
          mockUserId
        )
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'Invalid status transition from graduated to withdrawn'
      });
    });

    it('should successfully transition active -> completed with grade', async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const enrollment = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'active',
        completionDate: undefined as Date | undefined,
        gradeLetter: undefined as string | undefined,
        gradePercentage: undefined as number | undefined,
        updatedAt: new Date(),
        save: mockSave
      };

      (Enrollment.findById as jest.Mock).mockResolvedValue(enrollment);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Learner.findById as jest.Mock).mockResolvedValue(mockLearnerDetails);

      const result = await EnrollmentsService.updateEnrollmentStatus(
        mockEnrollmentId,
        {
          status: 'completed',
          grade: { score: 92, letter: 'A', passed: true }
        },
        mockUserId
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
      expect(result.grade).toBeDefined();
      expect(result.grade.score).toBe(92);
      expect(result.grade.letter).toBe('A');
      expect(result.grade.passed).toBe(true);
      expect(enrollment.status).toBe('completed');
      expect(enrollment.gradeLetter).toBe('A');
      expect(enrollment.gradePercentage).toBe(92);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should successfully transition active -> withdrawn with reason', async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const enrollment = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'active',
        withdrawalDate: undefined as Date | undefined,
        withdrawalReason: undefined as string | undefined,
        updatedAt: new Date(),
        save: mockSave
      };

      (Enrollment.findById as jest.Mock).mockResolvedValue(enrollment);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Learner.findById as jest.Mock).mockResolvedValue(mockLearnerDetails);

      const result = await EnrollmentsService.updateEnrollmentStatus(
        mockEnrollmentId,
        { status: 'withdrawn', reason: 'No longer interested' },
        mockUserId
      );

      expect(result.status).toBe('withdrawn');
      expect(result.withdrawnAt).toBeDefined();
      expect(enrollment.withdrawalReason).toBe('No longer interested');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should successfully transition active -> suspended', async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const enrollment = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'active',
        updatedAt: new Date(),
        save: mockSave
      };

      (Enrollment.findById as jest.Mock).mockResolvedValue(enrollment);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Learner.findById as jest.Mock).mockResolvedValue(null);

      const result = await EnrollmentsService.updateEnrollmentStatus(
        mockEnrollmentId,
        { status: 'suspended' },
        mockUserId
      );

      expect(result.status).toBe('suspended');
      expect(enrollment.status).toBe('suspended');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should successfully transition suspended -> active', async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const enrollment = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: 'suspended',
        updatedAt: new Date(),
        save: mockSave
      };

      (Enrollment.findById as jest.Mock).mockResolvedValue(enrollment);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Learner.findById as jest.Mock).mockResolvedValue(null);

      const result = await EnrollmentsService.updateEnrollmentStatus(
        mockEnrollmentId,
        { status: 'active' },
        mockUserId
      );

      expect(result.status).toBe('active');
      expect(enrollment.status).toBe('active');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ============================================================
  // bulkEnrollCourse
  // ============================================================
  describe('bulkEnrollCourse', () => {
    const setupBulkCourseMock = (value: any) => {
      const mockPopulate = jest.fn().mockResolvedValue(value);
      (Course.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
    };

    it('should throw notFound when course does not exist', async () => {
      setupBulkCourseMock(null);

      await expect(
        EnrollmentsService.bulkEnrollCourse(
          mockCourseId,
          [mockLearnerId],
          {},
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 404, message: 'Course not found' });
    });

    it('should throw unprocessable when course is not published', async () => {
      setupBulkCourseMock({
        ...mockCoursePopulated,
        status: 'draft'
      });

      await expect(
        EnrollmentsService.bulkEnrollCourse(
          mockCourseId,
          [mockLearnerId],
          {},
          mockUserId
        )
      ).rejects.toMatchObject({ statusCode: 422, message: 'Course is not published' });
    });

    it('should handle mixed success and failure in bulk enrollment', async () => {
      setupBulkCourseMock(mockCoursePopulated);

      const validLearnerId1 = new mongoose.Types.ObjectId().toString();
      const validLearnerId2 = new mongoose.Types.ObjectId().toString();
      const invalidLearnerId = new mongoose.Types.ObjectId().toString();
      const alreadyEnrolledId = new mongoose.Types.ObjectId().toString();

      // User.find returns only valid learners (not the invalid one)
      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: new mongoose.Types.ObjectId(validLearnerId1) },
          { _id: new mongoose.Types.ObjectId(validLearnerId2) },
          { _id: new mongoose.Types.ObjectId(alreadyEnrolledId) }
        ])
      });

      // Enrollment.find for existing enrollments - one already enrolled
      (Enrollment.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { learnerId: new mongoose.Types.ObjectId(alreadyEnrolledId) }
        ])
      });

      // Mock Enrollment constructor for new enrollments
      let enrollmentCount = 0;
      const mockSave = jest.fn().mockResolvedValue(undefined);
      (Enrollment as unknown as jest.Mock).mockImplementation((data: any) => {
        enrollmentCount++;
        return {
          ...data,
          _id: new mongoose.Types.ObjectId(),
          save: mockSave
        };
      });

      const result = await EnrollmentsService.bulkEnrollCourse(
        mockCourseId,
        [validLearnerId1, validLearnerId2, invalidLearnerId, alreadyEnrolledId],
        {},
        mockUserId
      );

      expect(result).toBeDefined();
      expect(result.summary.total).toBe(4);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(2);
      expect(result.enrolled).toHaveLength(2);
      expect(result.failed).toHaveLength(2);

      // Verify failure reasons
      const invalidFailure = result.failed.find(f => f.learnerId === invalidLearnerId);
      expect(invalidFailure).toBeDefined();
      expect(invalidFailure!.reason).toBe('Learner not found');

      const alreadyEnrolledFailure = result.failed.find(f => f.learnerId === alreadyEnrolledId);
      expect(alreadyEnrolledFailure).toBeDefined();
      expect(alreadyEnrolledFailure!.reason).toBe('Already enrolled');
    });

    it('should successfully bulk enroll all valid learners', async () => {
      setupBulkCourseMock(mockCoursePopulated);

      const learnerId1 = new mongoose.Types.ObjectId().toString();
      const learnerId2 = new mongoose.Types.ObjectId().toString();

      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: new mongoose.Types.ObjectId(learnerId1) },
          { _id: new mongoose.Types.ObjectId(learnerId2) }
        ])
      });

      // No existing enrollments
      (Enrollment.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });

      const mockSave = jest.fn().mockResolvedValue(undefined);
      (Enrollment as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockSave
      }));

      const result = await EnrollmentsService.bulkEnrollCourse(
        mockCourseId,
        [learnerId1, learnerId2],
        { startDate: new Date('2025-03-01'), expiresAt: new Date('2026-03-01') },
        mockUserId
      );

      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.enrolled).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });
  });

  // ============================================================
  // validateStatusTransition (tested via updateEnrollmentStatus)
  // ============================================================
  describe('validateStatusTransition (via updateEnrollmentStatus)', () => {
    const testTransition = async (from: string, to: string, shouldSucceed: boolean) => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const enrollment = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        status: from,
        updatedAt: new Date(),
        save: mockSave
      };

      (Enrollment.findById as jest.Mock).mockResolvedValue(enrollment);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Learner.findById as jest.Mock).mockResolvedValue(null);

      if (shouldSucceed) {
        const result = await EnrollmentsService.updateEnrollmentStatus(
          mockEnrollmentId,
          { status: to as any },
          mockUserId
        );
        expect(result.status).toBe(to);
      } else {
        await expect(
          EnrollmentsService.updateEnrollmentStatus(
            mockEnrollmentId,
            { status: to as any },
            mockUserId
          )
        ).rejects.toMatchObject({ statusCode: 422 });
      }
    };

    it('active -> completed should succeed', async () => {
      await testTransition('active', 'completed', true);
    });

    it('active -> withdrawn should succeed', async () => {
      await testTransition('active', 'withdrawn', true);
    });

    it('active -> suspended should succeed', async () => {
      await testTransition('active', 'suspended', true);
    });

    it('pending -> active should succeed', async () => {
      await testTransition('pending', 'active', true);
    });

    it('pending -> withdrawn should succeed', async () => {
      await testTransition('pending', 'withdrawn', true);
    });

    it('suspended -> active should succeed', async () => {
      await testTransition('suspended', 'active', true);
    });

    it('suspended -> withdrawn should succeed', async () => {
      await testTransition('suspended', 'withdrawn', true);
    });

    it('completed -> active should fail', async () => {
      await testTransition('completed', 'active', false);
    });

    it('completed -> withdrawn should fail', async () => {
      await testTransition('completed', 'withdrawn', false);
    });

    it('withdrawn -> active should fail', async () => {
      await testTransition('withdrawn', 'active', false);
    });

    it('graduated -> active should fail', async () => {
      await testTransition('graduated', 'active', false);
    });

    it('dropped -> active should fail', async () => {
      await testTransition('dropped', 'active', false);
    });
  });

  // ============================================================
  // Self-enrollment validation (tested via enrollProgram)
  // ============================================================
  describe('self-enrollment validation', () => {
    const setupProgramMock = (value: any) => {
      const mockPopulate = jest.fn().mockResolvedValue(value);
      (Program.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
    };

    it('should allow non-self-enrollment (admin enrolling a learner)', async () => {
      setupProgramMock(mockProgramPopulated);

      const adminUserId = new mongoose.Types.ObjectId().toString();
      const savedEnrollmentId = new mongoose.Types.ObjectId();
      const mockSave = jest.fn().mockResolvedValue(undefined);
      (Enrollment as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: savedEnrollmentId,
        status: 'active',
        enrollmentDate: data.enrollmentDate || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockSave
      }));

      // Admin user ID is different from learner ID - should not check self-enrollment
      const result = await EnrollmentsService.enrollProgram(
        { learnerId: mockLearnerId, programId: mockProgramId },
        adminUserId
      );

      expect(result.enrollment).toBeDefined();
      expect(result.enrollment.status).toBe('active');
    });

    it('should block self-enrollment when department does not allow it', async () => {
      setupProgramMock(mockProgramPopulated);

      // Department dynamic import mock already returns null (no allowSelfEnrollment)
      // Self-enrollment: learnerId === userId
      await expect(
        EnrollmentsService.enrollProgram(
          { learnerId: mockLearnerId, programId: mockProgramId },
          mockLearnerId  // Same as learnerId = self-enrollment
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Self-enrollment is not allowed in this department. Please contact your department administrator.'
      });
    });
  });

  // ============================================================
  // getMyPrograms
  // ============================================================
  describe('getMyPrograms', () => {
    const mockEnrollment1Id = new mongoose.Types.ObjectId();
    const mockEnrollment2Id = new mongoose.Types.ObjectId();
    const mockProgram1Id = new mongoose.Types.ObjectId();
    const mockProgram2Id = new mongoose.Types.ObjectId();

    const mockEnrollments = [
      {
        _id: mockEnrollment1Id,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        programId: mockProgram1Id,
        status: 'active',
        enrollmentDate: new Date('2026-01-15'),
        completionDate: null,
        metadata: {}
      },
      {
        _id: mockEnrollment2Id,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        programId: mockProgram2Id,
        status: 'completed',
        enrollmentDate: new Date('2025-09-01'),
        completionDate: new Date('2026-01-10'),
        metadata: {}
      }
    ];

    const setupFindMock = (enrollments: any[], total: number) => {
      const mockLean = jest.fn().mockResolvedValue(enrollments);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Enrollment.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Enrollment.countDocuments as jest.Mock).mockResolvedValue(total);
    };

    const setupProgramFindById = (programs: Record<string, any>) => {
      (Program.findById as jest.Mock).mockImplementation((id: any) => {
        const idStr = id.toString();
        const program = programs[idStr] || null;
        return { populate: jest.fn().mockResolvedValue(program) };
      });
    };

    it('should return program enrollments for the authenticated user', async () => {
      setupFindMock(mockEnrollments, 2);

      const mockPrograms: Record<string, any> = {};
      mockPrograms[mockProgram1Id.toString()] = {
        _id: mockProgram1Id,
        name: 'Computer Science',
        code: 'CS-001',
        description: 'CS program',
        departmentId: {
          _id: new mongoose.Types.ObjectId(mockDeptId),
          name: 'Engineering'
        }
      };
      mockPrograms[mockProgram2Id.toString()] = {
        _id: mockProgram2Id,
        name: 'Mathematics',
        code: 'MATH-001',
        description: 'Math program',
        departmentId: {
          _id: new mongoose.Types.ObjectId(mockDeptId),
          name: 'Engineering'
        }
      };
      setupProgramFindById(mockPrograms);

      const result = await EnrollmentsService.getMyPrograms(mockLearnerId, {});

      expect(result.programs).toHaveLength(2);
      expect(result.programs[0]).toMatchObject({
        id: mockProgram1Id.toString(),
        name: 'Computer Science',
        code: 'CS-001',
        description: 'CS program'
      });
      expect(result.programs[0].enrollment).toMatchObject({
        id: mockEnrollment1Id.toString(),
        status: 'active'
      });
      expect(result.programs[1]).toMatchObject({
        id: mockProgram2Id.toString(),
        name: 'Mathematics',
        code: 'MATH-001'
      });
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should default page=1 and limit=20', async () => {
      setupFindMock([], 0);

      const result = await EnrollmentsService.getMyPrograms(mockLearnerId, {});

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should respect page and limit filters', async () => {
      setupFindMock([], 0);

      const result = await EnrollmentsService.getMyPrograms(mockLearnerId, { page: 2, limit: 5 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
    });

    it('should clamp limit to max 100', async () => {
      setupFindMock([], 0);

      const result = await EnrollmentsService.getMyPrograms(mockLearnerId, { limit: 200 });

      expect(result.pagination.limit).toBe(100);
    });

    it('should clamp page to min 1', async () => {
      setupFindMock([], 0);

      const result = await EnrollmentsService.getMyPrograms(mockLearnerId, { page: -5 });

      expect(result.pagination.page).toBe(1);
    });

    it('should filter by status when provided', async () => {
      setupFindMock([], 0);

      await EnrollmentsService.getMyPrograms(mockLearnerId, { status: 'active' });

      const findCall = (Enrollment.find as jest.Mock).mock.calls[0][0];
      expect(findCall.status).toBe('active');
    });

    it('should exclude course-type enrollments', async () => {
      setupFindMock([], 0);

      await EnrollmentsService.getMyPrograms(mockLearnerId, {});

      const findCall = (Enrollment.find as jest.Mock).mock.calls[0][0];
      expect(findCall['metadata.enrollmentType']).toEqual({ $ne: 'course' });
    });

    it('should filter null programs from results', async () => {
      setupFindMock([mockEnrollments[0]], 1);

      // Program not found
      (Program.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      const result = await EnrollmentsService.getMyPrograms(mockLearnerId, {});

      expect(result.programs).toHaveLength(0);
    });

    it('should return empty array when no enrollments', async () => {
      setupFindMock([], 0);

      const result = await EnrollmentsService.getMyPrograms(mockLearnerId, {});

      expect(result.programs).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should compute hasNext/hasPrev correctly for middle page', async () => {
      setupFindMock([], 50);

      const result = await EnrollmentsService.getMyPrograms(mockLearnerId, { page: 2, limit: 20 });

      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should include department info in program response', async () => {
      setupFindMock([mockEnrollments[0]], 1);

      const deptObjId = new mongoose.Types.ObjectId(mockDeptId);
      const mockPrograms: Record<string, any> = {};
      mockPrograms[mockProgram1Id.toString()] = {
        _id: mockProgram1Id,
        name: 'Computer Science',
        code: 'CS-001',
        description: 'CS program',
        departmentId: {
          _id: deptObjId,
          name: 'Engineering'
        }
      };
      setupProgramFindById(mockPrograms);

      const result = await EnrollmentsService.getMyPrograms(mockLearnerId, {});

      expect(result.programs[0].department).toEqual({
        id: deptObjId.toString(),
        name: 'Engineering'
      });
    });
  });
});
