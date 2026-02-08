/**
 * Unit Tests: CoursesService
 *
 * Tests for the courses service:
 * - createCourse: validation, duplicate checks, CanonicalCourse + CourseVersion creation
 * - getCourseById: invalid ID, not found, enriched data return
 * - publishCourse: lifecycle transitions, module requirement, conflict checks
 * - archiveCourse: status transitions, lock behavior, conflict checks
 * - unarchiveCourse: status validation, unlock behavior
 * - deleteCourse: soft delete via Course model
 */

import mongoose from 'mongoose';
import { CoursesService } from '@/services/academic/courses.service';
import Course from '@/models/academic/Course.model';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import CourseContent from '@/models/content/CourseContent.model';
import Department from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import { Staff } from '@/models/auth/Staff.model';
import { User } from '@/models/auth/User.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/academic/Course.model');
jest.mock('@/models/academic/CanonicalCourse.model');
jest.mock('@/models/academic/CourseVersion.model');
jest.mock('@/models/academic/CourseVersionModule.model');
jest.mock('@/models/content/CourseContent.model');
jest.mock('@/models/organization/Department.model');
jest.mock('@/models/academic/Program.model');
jest.mock('@/models/auth/Staff.model');
jest.mock('@/models/auth/User.model');
jest.mock('@/services/auth/authorize.service');

describe('CoursesService', () => {
  const mockDepartmentId = new mongoose.Types.ObjectId().toString();
  const mockProgramId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockCourseId = new mongoose.Types.ObjectId().toString();
  const mockVersionId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // createCourse
  // =========================================================================
  describe('createCourse', () => {
    const validCourseData = {
      title: 'Introduction to Computer Science',
      code: 'CS101',
      description: 'An introductory course',
      department: mockDepartmentId,
    };

    const mockDepartment = {
      _id: new mongoose.Types.ObjectId(mockDepartmentId),
      name: 'Computer Science',
    };

    beforeEach(() => {
      // Default: department exists
      (Department.findById as jest.Mock).mockResolvedValue(mockDepartment);
      // Default: no duplicate
      (CanonicalCourse.findOne as jest.Mock).mockResolvedValue(null);
    });

    it('should create a course with CanonicalCourse and CourseVersion v1', async () => {
      const mockCanonicalId = new mongoose.Types.ObjectId();
      const mockSavedVersionId = new mongoose.Types.ObjectId();
      const now = new Date();

      const mockCanonicalSave = jest.fn().mockResolvedValue(true);
      (CanonicalCourse as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: mockCanonicalId,
        createdAt: now,
        updatedAt: now,
        save: mockCanonicalSave,
      }));

      const mockVersionSave = jest.fn().mockResolvedValue(true);
      (CourseVersion as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: mockSavedVersionId,
        save: mockVersionSave,
      }));

      const result = await CoursesService.createCourse(validCourseData, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockCanonicalId.toString());
      expect(result.title).toBe(validCourseData.title);
      expect(result.code).toBe('CS101');
      expect(result.status).toBe('draft');
      expect(result.department).toBe(mockDepartmentId);
      expect(result.createdBy).toBe(mockUserId);

      // CanonicalCourse constructor called with uppercase code
      expect(CanonicalCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CS101',
          departmentId: mockDepartmentId,
        })
      );
      // CanonicalCourse saved twice: once initially, once to update latestDraftVersionId
      expect(mockCanonicalSave).toHaveBeenCalledTimes(2);
      // CourseVersion saved once
      expect(mockVersionSave).toHaveBeenCalledTimes(1);
    });

    it('should reject code with special characters', async () => {
      const badData = { ...validCourseData, code: 'CS-101!' };

      await expect(
        CoursesService.createCourse(badData, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Course code must contain only letters and numbers (max 35 characters)',
      });
    });

    it('should reject code longer than 35 characters', async () => {
      const badData = { ...validCourseData, code: 'A'.repeat(36) };

      await expect(
        CoursesService.createCourse(badData, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Course code must contain only letters and numbers (max 35 characters)',
      });
    });

    it('should reject if department does not exist', async () => {
      (Department.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CoursesService.createCourse(validCourseData, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Department does not exist',
      });
    });

    it('should reject duplicate code in the same department via CanonicalCourse', async () => {
      (CanonicalCourse.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        code: 'CS101',
        departmentId: mockDepartmentId,
      });

      await expect(
        CoursesService.createCourse(validCourseData, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Course code already exists in this department',
      });
    });

    it('should validate program exists when provided', async () => {
      const dataWithProgram = { ...validCourseData, program: mockProgramId };
      (Program.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CoursesService.createCourse(dataWithProgram, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Program does not exist',
      });
    });

    it('should reject program from a different department', async () => {
      const otherDeptId = new mongoose.Types.ObjectId().toString();
      const dataWithProgram = { ...validCourseData, program: mockProgramId };

      (Program.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockProgramId),
        name: 'Test Program',
        departmentId: new mongoose.Types.ObjectId(otherDeptId),
      });

      await expect(
        CoursesService.createCourse(dataWithProgram, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Program must belong to the same department as the course',
      });
    });

    it('should accept program from the same department', async () => {
      const dataWithProgram = { ...validCourseData, program: mockProgramId };

      (Program.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockProgramId),
        name: 'CS Program',
        departmentId: { toString: () => mockDepartmentId },
      });

      const mockCanonicalSave = jest.fn().mockResolvedValue(true);
      (CanonicalCourse as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockCanonicalSave,
      }));

      const mockVersionSave = jest.fn().mockResolvedValue(true);
      (CourseVersion as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockVersionSave,
      }));

      const result = await CoursesService.createCourse(dataWithProgram, mockUserId);

      expect(result).toBeDefined();
      expect(result.program).toBe(mockProgramId);
    });

    it('should reject invalid instructor IDs', async () => {
      const instructorId = new mongoose.Types.ObjectId().toString();
      const dataWithInstructors = { ...validCourseData, instructors: [instructorId] };

      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CoursesService.createCourse(dataWithInstructors, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'One or more instructor IDs are invalid or do not have instructor role',
      });
    });

    it('should accept valid instructor with staff userType', async () => {
      const instructorId = new mongoose.Types.ObjectId().toString();
      const dataWithInstructors = { ...validCourseData, instructors: [instructorId] };

      (User.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(instructorId),
        userTypes: ['staff'],
      });

      const mockCanonicalSave = jest.fn().mockResolvedValue(true);
      (CanonicalCourse as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockCanonicalSave,
      }));

      const mockVersionSave = jest.fn().mockResolvedValue(true);
      (CourseVersion as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockVersionSave,
      }));

      const result = await CoursesService.createCourse(dataWithInstructors, mockUserId);

      expect(result).toBeDefined();
      expect(result.instructors).toEqual([instructorId]);
    });

    it('should create course with default settings when none provided', async () => {
      const mockCanonicalSave = jest.fn().mockResolvedValue(true);
      (CanonicalCourse as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockCanonicalSave,
      }));

      let capturedVersionData: any = null;
      const mockVersionSave = jest.fn().mockResolvedValue(true);
      (CourseVersion as unknown as jest.Mock).mockImplementation((data: any) => {
        capturedVersionData = data;
        return {
          ...data,
          _id: new mongoose.Types.ObjectId(),
          save: mockVersionSave,
        };
      });

      await CoursesService.createCourse(validCourseData, mockUserId);

      expect(capturedVersionData.settings).toEqual(
        expect.objectContaining({
          allowSelfEnrollment: false,
          passingScore: 70,
          maxAttempts: 3,
          certificateEnabled: false,
        })
      );
    });

    it('should uppercase the course code', async () => {
      const dataWithLowerCode = { ...validCourseData, code: 'cs101' };

      let capturedCanonicalData: any = null;
      const mockCanonicalSave = jest.fn().mockResolvedValue(true);
      (CanonicalCourse as unknown as jest.Mock).mockImplementation((data: any) => {
        capturedCanonicalData = data;
        return {
          ...data,
          _id: new mongoose.Types.ObjectId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          save: mockCanonicalSave,
        };
      });

      const mockVersionSave = jest.fn().mockResolvedValue(true);
      (CourseVersion as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockVersionSave,
      }));

      await CoursesService.createCourse(dataWithLowerCode, mockUserId);

      expect(capturedCanonicalData.code).toBe('CS101');
    });
  });

  // =========================================================================
  // getCourseById
  // =========================================================================
  describe('getCourseById', () => {
    it('should throw bad request for invalid course ID', async () => {
      await expect(
        CoursesService.getCourseById('invalid-id')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid course ID',
      });
    });

    it('should throw not found when course does not exist', async () => {
      (Course.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CoursesService.getCourseById(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Course not found',
      });
    });

    it('should return enriched course data', async () => {
      const courseObjId = new mongoose.Types.ObjectId(mockCourseId);
      const deptObjId = new mongoose.Types.ObjectId(mockDepartmentId);

      const mockCourse = {
        _id: courseObjId,
        name: 'Test Course',
        code: 'TC101',
        description: 'A test course',
        departmentId: deptObjId,
        credits: 3,
        isActive: true,
        metadata: {
          programId: null,
          duration: 60,
          status: 'draft',
          instructors: [],
          settings: {
            allowSelfEnrollment: false,
            passingScore: 70,
            maxAttempts: 3,
            certificateEnabled: false,
          },
          createdBy: null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (Course.findById as jest.Mock).mockResolvedValue(mockCourse);
      (Department.findById as jest.Mock).mockResolvedValue({
        _id: deptObjId,
        name: 'Test Department',
      });
      (CourseContent.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const result = await CoursesService.getCourseById(mockCourseId);

      expect(result).toBeDefined();
      expect(result.id).toBe(courseObjId.toString());
      expect(result.title).toBe('Test Course');
      expect(result.code).toBe('TC101');
      expect(result.department.name).toBe('Test Department');
      expect(result.status).toBe('draft');
      expect(result.modules).toEqual([]);
    });

    it('should return published status for published course', async () => {
      const courseObjId = new mongoose.Types.ObjectId(mockCourseId);

      const mockCourse = {
        _id: courseObjId,
        name: 'Published Course',
        code: 'PC101',
        description: '',
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        credits: 3,
        isActive: true,
        metadata: {
          status: 'published',
          publishedAt: new Date(),
          instructors: [],
          settings: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (Course.findById as jest.Mock).mockResolvedValue(mockCourse);
      (Department.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockDepartmentId),
        name: 'Dept',
      });
      (CourseContent.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const result = await CoursesService.getCourseById(mockCourseId);

      expect(result.status).toBe('published');
    });

    it('should return archived status for inactive course', async () => {
      const courseObjId = new mongoose.Types.ObjectId(mockCourseId);

      const mockCourse = {
        _id: courseObjId,
        name: 'Archived Course',
        code: 'AC101',
        description: '',
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        credits: 0,
        isActive: false,
        metadata: {
          instructors: [],
          settings: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (Course.findById as jest.Mock).mockResolvedValue(mockCourse);
      (Department.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockDepartmentId),
        name: 'Dept',
      });
      (CourseContent.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const result = await CoursesService.getCourseById(mockCourseId);

      expect(result.status).toBe('archived');
    });

    it('should include program info when programId is set', async () => {
      const courseObjId = new mongoose.Types.ObjectId(mockCourseId);
      const progObjId = new mongoose.Types.ObjectId(mockProgramId);

      const mockCourse = {
        _id: courseObjId,
        name: 'Course With Program',
        code: 'CWP101',
        description: '',
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        credits: 3,
        isActive: true,
        metadata: {
          programId: progObjId.toString(),
          instructors: [],
          settings: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (Course.findById as jest.Mock).mockResolvedValue(mockCourse);
      (Department.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockDepartmentId),
        name: 'Dept',
      });
      (Program.findById as jest.Mock).mockResolvedValue({
        _id: progObjId,
        name: 'Computer Science Program',
      });
      (CourseContent.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const result = await CoursesService.getCourseById(mockCourseId);

      expect(result.program).toEqual({
        id: progObjId.toString(),
        name: 'Computer Science Program',
      });
    });
  });

  // =========================================================================
  // publishCourse
  // =========================================================================
  describe('publishCourse', () => {
    it('should throw bad request for invalid course ID', async () => {
      await expect(
        CoursesService.publishCourse('invalid-id')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid course ID',
      });
    });

    it('should throw not found if canonical course does not exist', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CoursesService.publishCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Course not found',
      });
    });

    it('should throw bad request if no version available to publish', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockCourseId),
        latestDraftVersionId: null,
      });

      await expect(
        CoursesService.publishCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'No version available to publish',
      });
    });

    it('should throw not found if version document is missing', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockCourseId),
        latestDraftVersionId: mockVersionId,
      });
      (CourseVersion.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CoursesService.publishCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Version not found',
      });
    });

    it('should throw conflict if already published', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockCourseId),
        latestDraftVersionId: mockVersionId,
      });
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'published',
        version: 1,
      });

      await expect(
        CoursesService.publishCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('should throw bad request if course is archived', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockCourseId),
        latestDraftVersionId: mockVersionId,
      });
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'archived',
        version: 1,
      });

      await expect(
        CoursesService.publishCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should throw bad request if course has no modules', async () => {
      const canonicalObjId = new mongoose.Types.ObjectId(mockCourseId);

      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: canonicalObjId,
        latestDraftVersionId: mockVersionId,
        save: jest.fn().mockResolvedValue(true),
      });
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'draft',
        version: 1,
        save: jest.fn().mockResolvedValue(true),
      });
      (CourseVersionModule.countDocuments as jest.Mock).mockResolvedValue(0);

      await expect(
        CoursesService.publishCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Course cannot be published: must have at least one module',
      });
    });

    it('should publish a draft course with modules successfully', async () => {
      const canonicalObjId = new mongoose.Types.ObjectId(mockCourseId);
      const mockCanonicalSave = jest.fn().mockResolvedValue(true);
      const mockVersionSave = jest.fn().mockResolvedValue(true);

      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: canonicalObjId,
        latestDraftVersionId: mockVersionId,
        currentPublishedVersionId: null,
        save: mockCanonicalSave,
      });

      const versionDoc = {
        _id: mockVersionId,
        status: 'draft',
        version: 1,
        publishedAt: null,
        save: mockVersionSave,
      };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(versionDoc);
      (CourseVersionModule.countDocuments as jest.Mock).mockResolvedValue(3);

      const result = await CoursesService.publishCourse(mockCourseId);

      expect(result.id).toBe(canonicalObjId.toString());
      expect(result.status).toBe('published');
      expect(result.publishedAt).toBeDefined();
      expect(versionDoc.status).toBe('published');
      expect(mockVersionSave).toHaveBeenCalled();
      expect(mockCanonicalSave).toHaveBeenCalled();
    });

    it('should use provided publishedAt date when given', async () => {
      const canonicalObjId = new mongoose.Types.ObjectId(mockCourseId);
      const customDate = new Date('2025-06-15T00:00:00Z');

      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: canonicalObjId,
        latestDraftVersionId: mockVersionId,
        currentPublishedVersionId: null,
        save: jest.fn().mockResolvedValue(true),
      });

      const versionDoc = {
        _id: mockVersionId,
        status: 'draft',
        version: 1,
        publishedAt: null,
        save: jest.fn().mockResolvedValue(true),
      };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(versionDoc);
      (CourseVersionModule.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await CoursesService.publishCourse(mockCourseId, customDate);

      expect(result.publishedAt).toEqual(customDate);
    });
  });

  // =========================================================================
  // archiveCourse
  // =========================================================================
  describe('archiveCourse', () => {
    it('should throw bad request for invalid course ID', async () => {
      await expect(
        CoursesService.archiveCourse('invalid-id')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid course ID',
      });
    });

    it('should throw not found if canonical course does not exist', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CoursesService.archiveCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Course not found',
      });
    });

    it('should throw bad request if no version found', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockCourseId),
        currentPublishedVersionId: null,
        latestDraftVersionId: null,
      });

      await expect(
        CoursesService.archiveCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'No version found for this course',
      });
    });

    it('should throw conflict if already archived', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockCourseId),
        currentPublishedVersionId: null,
        latestDraftVersionId: mockVersionId,
        save: jest.fn().mockResolvedValue(true),
      });
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'archived',
      });

      await expect(
        CoursesService.archiveCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Course is already archived',
      });
    });

    it('should archive a draft course successfully', async () => {
      const canonicalObjId = new mongoose.Types.ObjectId(mockCourseId);
      const mockCanonicalSave = jest.fn().mockResolvedValue(true);
      const mockVersionSave = jest.fn().mockResolvedValue(true);

      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: canonicalObjId,
        currentPublishedVersionId: null,
        latestDraftVersionId: mockVersionId,
        save: mockCanonicalSave,
      });

      const versionDoc = {
        _id: mockVersionId,
        status: 'draft',
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
        changeNotes: null,
        save: mockVersionSave,
      };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(versionDoc);

      const result = await CoursesService.archiveCourse(mockCourseId);

      expect(result.id).toBe(canonicalObjId.toString());
      expect(result.status).toBe('archived');
      expect(result.archivedAt).toBeDefined();
      expect(versionDoc.status).toBe('archived');
      expect(versionDoc.isLocked).toBe(true);
      expect(versionDoc.lockedReason).toBe('archived');
      expect(mockVersionSave).toHaveBeenCalled();
      expect(mockCanonicalSave).toHaveBeenCalled();
    });

    it('should archive a published course using publishedVersionId', async () => {
      const canonicalObjId = new mongoose.Types.ObjectId(mockCourseId);
      const publishedVersionId = new mongoose.Types.ObjectId();
      const mockCanonicalSave = jest.fn().mockResolvedValue(true);
      const mockVersionSave = jest.fn().mockResolvedValue(true);

      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: canonicalObjId,
        currentPublishedVersionId: publishedVersionId,
        latestDraftVersionId: mockVersionId,
        save: mockCanonicalSave,
      });

      const versionDoc = {
        _id: publishedVersionId,
        status: 'published',
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
        changeNotes: null,
        save: mockVersionSave,
      };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(versionDoc);

      const result = await CoursesService.archiveCourse(mockCourseId);

      expect(result.status).toBe('archived');
      expect(versionDoc.isLocked).toBe(true);
    });

    it('should store custom reason in changeNotes', async () => {
      const canonicalObjId = new mongoose.Types.ObjectId(mockCourseId);
      const mockCanonicalSave = jest.fn().mockResolvedValue(true);
      const mockVersionSave = jest.fn().mockResolvedValue(true);

      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: canonicalObjId,
        currentPublishedVersionId: null,
        latestDraftVersionId: mockVersionId,
        save: mockCanonicalSave,
      });

      const versionDoc = {
        _id: mockVersionId,
        status: 'draft',
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
        changeNotes: null,
        save: mockVersionSave,
      };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(versionDoc);

      await CoursesService.archiveCourse(mockCourseId, 'Course no longer offered');

      expect(versionDoc.changeNotes).toBe('Course no longer offered');
    });

    it('should use custom archivedAt date when provided', async () => {
      const canonicalObjId = new mongoose.Types.ObjectId(mockCourseId);
      const customDate = new Date('2025-01-15T00:00:00Z');
      const mockCanonicalSave = jest.fn().mockResolvedValue(true);
      const mockVersionSave = jest.fn().mockResolvedValue(true);

      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: canonicalObjId,
        currentPublishedVersionId: null,
        latestDraftVersionId: mockVersionId,
        save: mockCanonicalSave,
      });

      const versionDoc = {
        _id: mockVersionId,
        status: 'draft',
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
        changeNotes: null,
        save: mockVersionSave,
      };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(versionDoc);

      const result = await CoursesService.archiveCourse(mockCourseId, undefined, customDate);

      expect(result.archivedAt).toEqual(customDate);
      expect(versionDoc.lockedAt).toEqual(customDate);
    });
  });

  // =========================================================================
  // unarchiveCourse
  // =========================================================================
  describe('unarchiveCourse', () => {
    it('should throw bad request for invalid course ID', async () => {
      await expect(
        CoursesService.unarchiveCourse('invalid-id')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid course ID',
      });
    });

    it('should throw not found if canonical course does not exist', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CoursesService.unarchiveCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Course not found',
      });
    });

    it('should throw bad request if no version found', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockCourseId),
        latestDraftVersionId: null,
      });

      await expect(
        CoursesService.unarchiveCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'No version found for this course',
      });
    });

    it('should throw conflict if course is not archived', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockCourseId),
        latestDraftVersionId: mockVersionId,
      });
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'draft',
      });

      await expect(
        CoursesService.unarchiveCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Course is not currently archived',
      });
    });

    it('should throw conflict if course is published (not archived)', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockCourseId),
        latestDraftVersionId: mockVersionId,
      });
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'published',
      });

      await expect(
        CoursesService.unarchiveCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Course is not currently archived',
      });
    });

    it('should unarchive an archived course successfully', async () => {
      const canonicalObjId = new mongoose.Types.ObjectId(mockCourseId);
      const mockVersionSave = jest.fn().mockResolvedValue(true);

      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: canonicalObjId,
        latestDraftVersionId: mockVersionId,
      });

      const versionDoc = {
        _id: mockVersionId,
        status: 'archived',
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: 'archived',
        save: mockVersionSave,
      };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(versionDoc);

      const result = await CoursesService.unarchiveCourse(mockCourseId);

      expect(result.id).toBe(canonicalObjId.toString());
      expect(result.status).toBe('draft');
      expect(result.archivedAt).toBeNull();
      expect(versionDoc.status).toBe('draft');
      expect(versionDoc.isLocked).toBe(false);
      expect(versionDoc.lockedAt).toBeNull();
      expect(versionDoc.lockedReason).toBeNull();
      expect(mockVersionSave).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // deleteCourse
  // =========================================================================
  describe('deleteCourse', () => {
    it('should throw bad request for invalid course ID', async () => {
      await expect(
        CoursesService.deleteCourse('invalid-id')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid course ID',
      });
    });

    it('should throw not found if course does not exist', async () => {
      (Course.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CoursesService.deleteCourse(mockCourseId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Course not found',
      });
    });

    it('should soft delete a course by setting isActive to false', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockCourse = {
        _id: new mongoose.Types.ObjectId(mockCourseId),
        isActive: true,
        metadata: { status: 'draft' },
        save: mockSave,
      };

      (Course.findById as jest.Mock).mockResolvedValue(mockCourse);

      await CoursesService.deleteCourse(mockCourseId);

      expect(mockCourse.isActive).toBe(false);
      expect(mockCourse.metadata.status).toBe('archived');
      expect(mockCourse.metadata.archivedAt).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });

    it('should return void on successful delete', async () => {
      const mockCourse = {
        _id: new mongoose.Types.ObjectId(mockCourseId),
        isActive: true,
        metadata: {},
        save: jest.fn().mockResolvedValue(true),
      };

      (Course.findById as jest.Mock).mockResolvedValue(mockCourse);

      const result = await CoursesService.deleteCourse(mockCourseId);

      expect(result).toBeUndefined();
    });
  });
});
