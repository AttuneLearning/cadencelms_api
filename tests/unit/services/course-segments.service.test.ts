/**
 * Unit Tests: CourseSegmentsService
 *
 * Tests for the course segments (modules) service:
 * - resolveCourseAndVersion: ObjectId validation, canonical/version lookups, fallback logic
 * - listCourseModules: filtering, sorting, formatted output
 * - getCourseModuleById: link validation, completion stats
 * - createCourseModule: validation, duplicate checks, Module + link creation
 * - updateCourseModule: title uniqueness, field updates, attempt conflict checks
 * - deleteCourseModule: link removal, reordering, attempt conflict checks
 * - reorderCourseModules: duplicate detection, completeness validation, bulk updates
 */

import mongoose from 'mongoose';
import { CourseSegmentsService } from '@/services/academic/course-segments.service';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import Module from '@/models/academic/Module.model';
import Content from '@/models/content/Content.model';
import ContentAttempt from '@/models/content/ContentAttempt.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/academic/CanonicalCourse.model');
jest.mock('@/models/academic/CourseVersion.model');
jest.mock('@/models/academic/CourseVersionModule.model');
jest.mock('@/models/academic/Module.model');
jest.mock('@/models/content/Content.model');
jest.mock('@/models/content/ContentAttempt.model');
jest.mock('@/models/content/LearningUnit.model');

describe('CourseSegmentsService', () => {
  const mockCourseId = new mongoose.Types.ObjectId().toString();
  const mockVersionId = new mongoose.Types.ObjectId();
  const mockModuleId = new mongoose.Types.ObjectId().toString();
  const mockDepartmentId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();
  const now = new Date();

  // Reusable mock canonical and version
  const mockCanonical = {
    _id: new mongoose.Types.ObjectId(mockCourseId),
    departmentId: mockDepartmentId,
    currentPublishedVersionId: mockVersionId,
  };

  const mockVersion = {
    _id: mockVersionId,
    title: 'Test Course v1',
    canonicalCourseId: mockCanonical._id,
    status: 'published',
    createdBy: mockUserId,
  };

  /**
   * Helper: set up mocks so resolveCourseAndVersion succeeds.
   * Can override canonical/version properties.
   */
  function setupResolve(
    canonicalOverrides: Record<string, any> = {},
    versionOverrides: Record<string, any> = {}
  ) {
    const canonical = { ...mockCanonical, ...canonicalOverrides };
    const version = { ...mockVersion, ...versionOverrides };
    (CanonicalCourse.findById as jest.Mock).mockResolvedValue(canonical);
    (CourseVersion.findById as jest.Mock).mockResolvedValue(version);
    (CourseVersion.findOne as jest.Mock).mockResolvedValue(version);
    return { canonical, version };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // resolveCourseAndVersion (tested implicitly through service methods)
  // ===========================================================================
  describe('resolveCourseAndVersion (via listCourseModules)', () => {
    it('should throw 404 for invalid ObjectId', async () => {
      await expect(
        CourseSegmentsService.listCourseModules('not-a-valid-id', {})
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Course not found',
      });
    });

    it('should throw 404 if CanonicalCourse not found', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CourseSegmentsService.listCourseModules(mockCourseId, {})
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Course not found',
      });
    });

    it('should throw 404 if no published version exists', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        ...mockCanonical,
        currentPublishedVersionId: null,
      });
      (CourseVersion.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        CourseSegmentsService.listCourseModules(mockCourseId, {})
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Course not found',
      });
    });

    it('should fall back to CourseVersion.findOne when currentPublishedVersionId is null', async () => {
      const fallbackVersion = { ...mockVersion, _id: new mongoose.Types.ObjectId() };
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        ...mockCanonical,
        currentPublishedVersionId: null,
      });
      (CourseVersion.findOne as jest.Mock).mockResolvedValue(fallbackVersion);

      // Set up remaining mocks for listCourseModules to succeed
      (CourseVersionModule.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      (Module.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await CourseSegmentsService.listCourseModules(mockCourseId, {});

      expect(CourseVersion.findOne).toHaveBeenCalledWith({
        canonicalCourseId: mockCanonical._id,
        status: 'published',
      });
      expect(result).toBeDefined();
    });
  });

  // ===========================================================================
  // listCourseModules
  // ===========================================================================
  describe('listCourseModules', () => {
    const moduleId1 = new mongoose.Types.ObjectId();
    const moduleId2 = new mongoose.Types.ObjectId();
    const moduleId3 = new mongoose.Types.ObjectId();

    const moduleLinks = [
      { courseVersionId: mockVersionId, moduleId: moduleId1, order: 1 },
      { courseVersionId: mockVersionId, moduleId: moduleId2, order: 2 },
      { courseVersionId: mockVersionId, moduleId: moduleId3, order: 3 },
    ];

    const moduleDocuments = [
      {
        _id: moduleId1,
        title: 'Module A',
        description: 'First module',
        isPublished: true,
        estimatedDuration: 30,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      },
      {
        _id: moduleId2,
        title: 'Module C',
        description: 'Second module',
        isPublished: true,
        estimatedDuration: 45,
        createdAt: new Date('2026-01-03'),
        updatedAt: new Date('2026-01-04'),
      },
      {
        _id: moduleId3,
        title: 'Module B',
        description: 'Third module (unpublished)',
        isPublished: false,
        estimatedDuration: 60,
        createdAt: new Date('2026-01-05'),
        updatedAt: new Date('2026-01-06'),
      },
    ];

    function setupListMocks() {
      setupResolve();
      (CourseVersionModule.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(moduleLinks),
        }),
      });
      (Module.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(moduleDocuments),
      });
    }

    it('should return formatted module list with courseTitle from version', async () => {
      setupListMocks();

      const result = await CourseSegmentsService.listCourseModules(mockCourseId, {
        includeUnpublished: true,
      });

      expect(result.courseId).toBe(mockCourseId);
      expect(result.courseTitle).toBe('Test Course v1');
      expect(result.totalModules).toBe(3);
      expect(result.modules).toHaveLength(3);
      expect(result.modules[0]).toMatchObject({
        id: moduleId1.toString(),
        title: 'Module A',
        description: 'First module',
        order: 1,
        isPublished: true,
        duration: 30,
      });
    });

    it('should filter unpublished modules when includeUnpublished is false', async () => {
      setupListMocks();

      const result = await CourseSegmentsService.listCourseModules(mockCourseId, {
        includeUnpublished: false,
      });

      // Module B (moduleId3) is unpublished, should be filtered out
      expect(result.totalModules).toBe(2);
      expect(result.modules.every((m: any) => m.isPublished === true)).toBe(true);
    });

    it('should include unpublished modules when includeUnpublished is true', async () => {
      setupListMocks();

      const result = await CourseSegmentsService.listCourseModules(mockCourseId, {
        includeUnpublished: true,
      });

      expect(result.totalModules).toBe(3);
    });

    it('should sort by title when sort="title"', async () => {
      setupListMocks();

      const result = await CourseSegmentsService.listCourseModules(mockCourseId, {
        includeUnpublished: true,
        sort: 'title',
      });

      // Module A, Module B, Module C
      expect(result.modules[0].title).toBe('Module A');
      expect(result.modules[1].title).toBe('Module B');
      expect(result.modules[2].title).toBe('Module C');
    });

    it('should sort by createdAt when sort="createdAt"', async () => {
      setupListMocks();

      const result = await CourseSegmentsService.listCourseModules(mockCourseId, {
        includeUnpublished: true,
        sort: 'createdAt',
      });

      // Order by creation date ascending
      expect(result.modules[0].title).toBe('Module A');
      expect(result.modules[1].title).toBe('Module C');
      expect(result.modules[2].title).toBe('Module B');
    });

    it('should default sort by order when no sort specified', async () => {
      setupListMocks();

      const result = await CourseSegmentsService.listCourseModules(mockCourseId, {
        includeUnpublished: true,
      });

      // Default order from CourseVersionModule.order: 1, 2, 3
      expect(result.modules[0].order).toBe(1);
      expect(result.modules[1].order).toBe(2);
      expect(result.modules[2].order).toBe(3);
    });

    it('should return empty modules list when course has no modules', async () => {
      setupResolve();
      (CourseVersionModule.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      (Module.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await CourseSegmentsService.listCourseModules(mockCourseId, {});

      expect(result.modules).toEqual([]);
      expect(result.totalModules).toBe(0);
    });

    it('should apply default settings for each module in the result', async () => {
      setupListMocks();

      const result = await CourseSegmentsService.listCourseModules(mockCourseId, {
        includeUnpublished: true,
      });

      expect(result.modules[0].settings).toEqual({
        allowMultipleAttempts: true,
        maxAttempts: null,
        timeLimit: null,
        showFeedback: true,
        shuffleQuestions: false,
      });
    });
  });

  // ===========================================================================
  // getCourseModuleById
  // ===========================================================================
  describe('getCourseModuleById', () => {
    it('should throw 404 for invalid moduleId', async () => {
      setupResolve();

      await expect(
        CourseSegmentsService.getCourseModuleById(mockCourseId, 'invalid-module-id')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found in this course',
      });
    });

    it('should throw 404 if module link not found in course version', async () => {
      setupResolve();
      (CourseVersionModule.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        CourseSegmentsService.getCourseModuleById(mockCourseId, mockModuleId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found in this course',
      });
    });

    it('should throw 404 if module document does not exist', async () => {
      setupResolve();
      (CourseVersionModule.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          courseVersionId: mockVersionId,
          moduleId: new mongoose.Types.ObjectId(mockModuleId),
          order: 1,
        }),
      });
      (Module.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        CourseSegmentsService.getCourseModuleById(mockCourseId, mockModuleId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found in this course',
      });
    });

    it('should return module details with completion stats', async () => {
      const modObjId = new mongoose.Types.ObjectId(mockModuleId);
      const contentId1 = new mongoose.Types.ObjectId();
      const contentId2 = new mongoose.Types.ObjectId();

      setupResolve();
      (CourseVersionModule.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          courseVersionId: mockVersionId,
          moduleId: modObjId,
          order: 2,
        }),
      });

      (Module.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: modObjId,
          title: 'Test Module',
          description: 'A test module',
          isPublished: true,
          estimatedDuration: 45,
          createdAt: now,
          updatedAt: now,
          createdBy: mockUserId,
        }),
      });

      // Learning units with content
      (LearningUnit.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { _id: new mongoose.Types.ObjectId(), contentId: { _id: contentId1 } },
              { _id: new mongoose.Types.ObjectId(), contentId: { _id: contentId2 } },
            ]),
          }),
        }),
      });

      // Completion count
      (ContentAttempt.countDocuments as jest.Mock).mockResolvedValue(5);

      // Scored attempts for average
      (ContentAttempt.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { score: 80 },
          { score: 90 },
          { score: 100 },
        ]),
      });

      const result = await CourseSegmentsService.getCourseModuleById(mockCourseId, mockModuleId);

      expect(result.id).toBe(modObjId.toString());
      expect(result.courseId).toBe(mockCourseId);
      expect(result.courseTitle).toBe('Test Course v1');
      expect(result.title).toBe('Test Module');
      expect(result.description).toBe('A test module');
      expect(result.order).toBe(2);
      expect(result.isPublished).toBe(true);
      expect(result.duration).toBe(45);
      expect(result.completionCount).toBe(5);
      expect(result.averageScore).toBe(90); // (80+90+100)/3
      expect(result.prerequisites).toEqual([]);
      expect(result.createdBy).toEqual({
        id: mockUserId.toString(),
        firstName: 'Staff',
        lastName: 'User',
      });
    });

    it('should return null averageScore when no scored attempts', async () => {
      const modObjId = new mongoose.Types.ObjectId(mockModuleId);

      setupResolve();
      (CourseVersionModule.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          courseVersionId: mockVersionId,
          moduleId: modObjId,
          order: 1,
        }),
      });
      (Module.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: modObjId,
          title: 'Empty Module',
          isPublished: true,
          createdAt: now,
          updatedAt: now,
        }),
      });
      (LearningUnit.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await CourseSegmentsService.getCourseModuleById(mockCourseId, mockModuleId);

      expect(result.completionCount).toBe(0);
      expect(result.averageScore).toBeNull();
    });

    it('should return createdBy as null when module has no createdBy', async () => {
      const modObjId = new mongoose.Types.ObjectId(mockModuleId);

      setupResolve();
      (CourseVersionModule.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          courseVersionId: mockVersionId,
          moduleId: modObjId,
          order: 1,
        }),
      });
      (Module.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: modObjId,
          title: 'No Creator Module',
          isPublished: false,
          createdAt: now,
          updatedAt: now,
          createdBy: null,
        }),
      });
      (LearningUnit.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await CourseSegmentsService.getCourseModuleById(mockCourseId, mockModuleId);

      expect(result.createdBy).toBeNull();
    });
  });

  // ===========================================================================
  // createCourseModule
  // ===========================================================================
  describe('createCourseModule', () => {
    const validModuleData = {
      title: 'New Module',
      description: 'Module description',
      order: 1,
      type: 'document' as const,
      isPublished: false,
    };

    function setupCreateMocks(existingLinks: any[] = []) {
      const { canonical, version } = setupResolve();

      // Existing links for duplicate/order checks
      (CourseVersionModule.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(existingLinks),
      });

      // No existing modules with same title by default
      (Module.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      // Module.create mock
      const createdModuleId = new mongoose.Types.ObjectId();
      (Module.create as jest.Mock).mockResolvedValue({
        _id: createdModuleId,
        title: validModuleData.title,
        description: validModuleData.description,
        isPublished: false,
        estimatedDuration: 0,
        createdAt: now,
        updatedAt: now,
      });

      // CourseVersionModule.create mock
      (CourseVersionModule.create as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        courseVersionId: version._id,
        moduleId: createdModuleId,
        order: validModuleData.order,
        isRequired: true,
      });

      // updateMany for order shift
      (CourseVersionModule.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      return { canonical, version, createdModuleId };
    }

    it('should create module and CourseVersionModule link', async () => {
      const { createdModuleId } = setupCreateMocks();

      const result = await CourseSegmentsService.createCourseModule(mockCourseId, validModuleData);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdModuleId.toString());
      expect(result.courseId).toBe(mockCourseId);
      expect(result.title).toBe('New Module');
      expect(result.description).toBe('Module description');
      expect(result.order).toBe(1);
      expect(result.type).toBe('document');
      expect(result.isPublished).toBe(false);

      expect(Module.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerDepartmentId: mockDepartmentId,
          title: 'New Module',
          completionCriteria: { type: 'all_required' },
          presentationRules: expect.objectContaining({
            presentationMode: 'prescribed',
            repetitionMode: 'none',
          }),
        })
      );

      expect(CourseVersionModule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          courseVersionId: mockVersionId,
          moduleId: createdModuleId,
          order: 1,
          isRequired: true,
        })
      );
    });

    it('should throw 409 on duplicate title within course version', async () => {
      const existingModuleId = new mongoose.Types.ObjectId();
      const existingLinks = [
        { courseVersionId: mockVersionId, moduleId: existingModuleId, order: 1 },
      ];

      setupResolve();
      (CourseVersionModule.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(existingLinks),
      });
      (Module.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: existingModuleId, title: 'New Module' },
        ]),
      });

      await expect(
        CourseSegmentsService.createCourseModule(mockCourseId, {
          ...validModuleData,
          order: 2, // valid order for 1 existing + 1 new
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Module title must be unique within course',
      });
    });

    it('should throw 400 on invalid order (too high)', async () => {
      // No existing links means maxOrder = 0, valid orders are 1 only
      setupCreateMocks([]);

      await expect(
        CourseSegmentsService.createCourseModule(mockCourseId, {
          ...validModuleData,
          order: 5,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Module order must be sequential',
      });
    });

    it('should throw 400 on invalid order (less than 1)', async () => {
      setupCreateMocks([]);

      await expect(
        CourseSegmentsService.createCourseModule(mockCourseId, {
          ...validModuleData,
          order: 0,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Module order must be sequential',
      });
    });

    it('should throw 400 when title exceeds 200 characters', async () => {
      setupResolve();

      await expect(
        CourseSegmentsService.createCourseModule(mockCourseId, {
          ...validModuleData,
          title: 'A'.repeat(201),
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Title cannot exceed 200 characters',
      });
    });

    it('should throw 400 when description exceeds 2000 characters', async () => {
      setupResolve();

      await expect(
        CourseSegmentsService.createCourseModule(mockCourseId, {
          ...validModuleData,
          description: 'D'.repeat(2001),
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Description cannot exceed 2000 characters',
      });
    });

    it('should shift existing module orders when inserting in the middle', async () => {
      const existingLinks = [
        { courseVersionId: mockVersionId, moduleId: new mongoose.Types.ObjectId(), order: 1 },
        { courseVersionId: mockVersionId, moduleId: new mongoose.Types.ObjectId(), order: 2 },
      ];

      setupCreateMocks(existingLinks);

      // Re-mock Module.find for duplicate check (no duplicates)
      (Module.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: existingLinks[0].moduleId, title: 'Existing Module 1' },
          { _id: existingLinks[1].moduleId, title: 'Existing Module 2' },
        ]),
      });

      await CourseSegmentsService.createCourseModule(mockCourseId, {
        ...validModuleData,
        order: 1, // Insert at position 1, should shift others
      });

      expect(CourseVersionModule.updateMany).toHaveBeenCalledWith(
        { courseVersionId: mockVersionId, order: { $gte: 1 } },
        { $inc: { order: 1 } }
      );
    });

    it('should validate contentId exists and matches type', async () => {
      const contentId = new mongoose.Types.ObjectId().toString();
      setupCreateMocks();
      (Content.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(contentId),
        type: 'video', // does not match 'document'
      });

      await expect(
        CourseSegmentsService.createCourseModule(mockCourseId, {
          ...validModuleData,
          contentId,
          type: 'document',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Module type does not match content type',
      });
    });

    it('should throw 400 when referenced content does not exist', async () => {
      const contentId = new mongoose.Types.ObjectId().toString();
      setupCreateMocks();
      (Content.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CourseSegmentsService.createCourseModule(mockCourseId, {
          ...validModuleData,
          contentId,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Referenced content does not exist',
      });
    });

    it('should throw 400 for passing score out of range', async () => {
      setupCreateMocks();

      await expect(
        CourseSegmentsService.createCourseModule(mockCourseId, {
          ...validModuleData,
          passingScore: 150,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Passing score must be between 0 and 100',
      });
    });

    it('should throw 400 for negative duration', async () => {
      setupCreateMocks();

      await expect(
        CourseSegmentsService.createCourseModule(mockCourseId, {
          ...validModuleData,
          duration: -10,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Duration must be a positive number',
      });
    });

    it('should return default settings merged with provided settings', async () => {
      setupCreateMocks();

      const result = await CourseSegmentsService.createCourseModule(mockCourseId, {
        ...validModuleData,
        settings: { maxAttempts: 5, shuffleQuestions: true },
      });

      expect(result.settings).toEqual({
        allowMultipleAttempts: true,
        maxAttempts: 5,
        timeLimit: null,
        showFeedback: true,
        shuffleQuestions: true,
      });
    });
  });

  // ===========================================================================
  // updateCourseModule
  // ===========================================================================
  describe('updateCourseModule', () => {
    const mockModSave = jest.fn().mockResolvedValue(true);

    function setupUpdateMocks(
      moduleOverrides: Record<string, any> = {},
      linkOverrides: Record<string, any> = {}
    ) {
      const { version } = setupResolve();
      const modObjId = new mongoose.Types.ObjectId(mockModuleId);

      const mockLink = {
        _id: new mongoose.Types.ObjectId(),
        courseVersionId: mockVersionId,
        moduleId: modObjId,
        order: 1,
        ...linkOverrides,
      };

      const mockModule = {
        _id: modObjId,
        title: 'Original Title',
        description: 'Original description',
        isPublished: false,
        estimatedDuration: 30,
        createdAt: now,
        updatedAt: now,
        save: mockModSave,
        ...moduleOverrides,
      };

      (CourseVersionModule.findOne as jest.Mock).mockResolvedValue(mockLink);
      (Module.findById as jest.Mock).mockResolvedValue(mockModule);

      return { version, mockLink, mockModule };
    }

    beforeEach(() => {
      mockModSave.mockClear();
    });

    it('should update module title and return updated data', async () => {
      setupUpdateMocks();

      // No duplicate check needed when no other modules
      (CourseVersionModule.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (Module.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await CourseSegmentsService.updateCourseModule(
        mockCourseId,
        mockModuleId,
        { title: 'Updated Title' }
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(mockModuleId);
      expect(result.courseId).toBe(mockCourseId);
      expect(mockModSave).toHaveBeenCalled();
    });

    it('should throw 404 for invalid moduleId', async () => {
      setupResolve();

      await expect(
        CourseSegmentsService.updateCourseModule(mockCourseId, 'bad-id', { title: 'X' })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found in this course',
      });
    });

    it('should throw 404 if module link not found in course version', async () => {
      setupResolve();
      (CourseVersionModule.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        CourseSegmentsService.updateCourseModule(mockCourseId, mockModuleId, { title: 'X' })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found in this course',
      });
    });

    it('should throw 404 if module document not found', async () => {
      setupResolve();
      (CourseVersionModule.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        courseVersionId: mockVersionId,
        moduleId: new mongoose.Types.ObjectId(mockModuleId),
        order: 1,
      });
      (Module.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CourseSegmentsService.updateCourseModule(mockCourseId, mockModuleId, { title: 'X' })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found in this course',
      });
    });

    it('should throw 409 on duplicate title among other modules in course', async () => {
      const otherModuleId = new mongoose.Types.ObjectId();
      setupUpdateMocks();

      // Other modules in this course version
      (CourseVersionModule.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { courseVersionId: mockVersionId, moduleId: otherModuleId, order: 2 },
          { courseVersionId: mockVersionId, moduleId: new mongoose.Types.ObjectId(mockModuleId), order: 1 },
        ]),
      });
      (Module.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: otherModuleId, title: 'Duplicate Title' },
        ]),
      });

      await expect(
        CourseSegmentsService.updateCourseModule(mockCourseId, mockModuleId, {
          title: 'Duplicate Title',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Module title must be unique within course',
      });
    });

    it('should not check duplicates when title has not changed', async () => {
      setupUpdateMocks({ title: 'Same Title' });

      const result = await CourseSegmentsService.updateCourseModule(
        mockCourseId,
        mockModuleId,
        { title: 'Same Title' }
      );

      // Should succeed without duplicate check
      expect(result).toBeDefined();
      expect(CourseVersionModule.find).not.toHaveBeenCalled();
    });

    it('should throw 400 when title exceeds 200 characters', async () => {
      setupUpdateMocks();

      await expect(
        CourseSegmentsService.updateCourseModule(mockCourseId, mockModuleId, {
          title: 'T'.repeat(201),
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Title cannot exceed 200 characters',
      });
    });

    it('should throw 400 when description exceeds 2000 characters', async () => {
      setupUpdateMocks();

      await expect(
        CourseSegmentsService.updateCourseModule(mockCourseId, mockModuleId, {
          description: 'D'.repeat(2001),
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Description cannot exceed 2000 characters',
      });
    });

    it('should throw conflict when changing type with active attempts', async () => {
      const luContentId = new mongoose.Types.ObjectId();
      setupUpdateMocks();

      (LearningUnit.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: new mongoose.Types.ObjectId(), contentId: luContentId },
        ]),
      });
      (ContentAttempt.exists as jest.Mock).mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      await expect(
        CourseSegmentsService.updateCourseModule(mockCourseId, mockModuleId, {
          type: 'video',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Cannot change module type with active attempts',
      });
    });

    it('should allow type change when no active attempts', async () => {
      setupUpdateMocks();

      (LearningUnit.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await CourseSegmentsService.updateCourseModule(
        mockCourseId,
        mockModuleId,
        { type: 'video' }
      );

      expect(result.type).toBe('video');
    });

    it('should validate passing score range', async () => {
      setupUpdateMocks();

      await expect(
        CourseSegmentsService.updateCourseModule(mockCourseId, mockModuleId, {
          passingScore: -5,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Passing score must be between 0 and 100',
      });
    });

    it('should validate duration is non-negative', async () => {
      setupUpdateMocks();

      await expect(
        CourseSegmentsService.updateCourseModule(mockCourseId, mockModuleId, {
          duration: -1,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Duration must be a positive number',
      });
    });

    it('should merge custom settings with defaults', async () => {
      setupUpdateMocks();

      const result = await CourseSegmentsService.updateCourseModule(
        mockCourseId,
        mockModuleId,
        { settings: { timeLimit: 120, maxAttempts: 3 } }
      );

      expect(result.settings).toEqual({
        allowMultipleAttempts: true,
        maxAttempts: 3,
        timeLimit: 120,
        showFeedback: true,
        shuffleQuestions: false,
      });
    });
  });

  // ===========================================================================
  // deleteCourseModule
  // ===========================================================================
  describe('deleteCourseModule', () => {
    function setupDeleteMocks(
      moduleOverrides: Record<string, any> = {},
      subsequentLinks: any[] = []
    ) {
      const { version } = setupResolve();
      const modObjId = new mongoose.Types.ObjectId(mockModuleId);

      const mockLink = {
        _id: new mongoose.Types.ObjectId(),
        courseVersionId: mockVersionId,
        moduleId: modObjId,
        order: 1,
      };

      const mockModule = {
        _id: modObjId,
        title: 'Module to Delete',
        ...moduleOverrides,
      };

      (CourseVersionModule.findOne as jest.Mock).mockResolvedValue(mockLink);
      (Module.findById as jest.Mock).mockResolvedValue(mockModule);

      // Modules to reorder after deletion
      (CourseVersionModule.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(subsequentLinks),
          }),
        }),
      });

      (CourseVersionModule.findByIdAndDelete as jest.Mock).mockResolvedValue(true);
      (CourseVersionModule.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      // Default: no learning units / attempts
      (LearningUnit.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      (ContentAttempt.exists as jest.Mock).mockResolvedValue(null);

      return { version, mockLink, mockModule };
    }

    it('should delete module link and return deletion info', async () => {
      setupDeleteMocks();

      const result = await CourseSegmentsService.deleteCourseModule(
        mockCourseId,
        mockModuleId,
        false
      );

      expect(result.id).toBe(mockModuleId);
      expect(result.title).toBe('Module to Delete');
      expect(result.deletedAt).toBeDefined();
      expect(CourseVersionModule.findByIdAndDelete).toHaveBeenCalled();
    });

    it('should reorder subsequent modules after deletion', async () => {
      const subsequentModId = new mongoose.Types.ObjectId();
      setupDeleteMocks({}, [
        {
          _id: new mongoose.Types.ObjectId(),
          courseVersionId: mockVersionId,
          moduleId: { _id: subsequentModId, title: 'Module After' },
          order: 2,
        },
      ]);

      const result = await CourseSegmentsService.deleteCourseModule(
        mockCourseId,
        mockModuleId,
        false
      );

      expect(CourseVersionModule.updateMany).toHaveBeenCalledWith(
        { courseVersionId: mockVersionId, order: { $gt: 1 } },
        { $inc: { order: -1 } }
      );
      expect(result.affectedModules).toBe(1);
      expect(result.reorderedModules).toHaveLength(1);
      expect(result.reorderedModules[0]).toMatchObject({
        id: subsequentModId.toString(),
        title: 'Module After',
        oldOrder: 2,
        newOrder: 1,
      });
    });

    it('should throw 404 for invalid moduleId', async () => {
      setupResolve();

      await expect(
        CourseSegmentsService.deleteCourseModule(mockCourseId, 'bad-id', false)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found in this course',
      });
    });

    it('should throw 404 if module link not found', async () => {
      setupResolve();
      (CourseVersionModule.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        CourseSegmentsService.deleteCourseModule(mockCourseId, mockModuleId, false)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found in this course',
      });
    });

    it('should throw 404 if module document not found', async () => {
      setupResolve();
      (CourseVersionModule.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        courseVersionId: mockVersionId,
        moduleId: new mongoose.Types.ObjectId(mockModuleId),
        order: 1,
      });
      (Module.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CourseSegmentsService.deleteCourseModule(mockCourseId, mockModuleId, false)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found in this course',
      });
    });

    it('should throw conflict with active attempts when force=false', async () => {
      const luContentId = new mongoose.Types.ObjectId();
      setupResolve();

      (CourseVersionModule.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        courseVersionId: mockVersionId,
        moduleId: new mongoose.Types.ObjectId(mockModuleId),
        order: 1,
      });
      (Module.findById as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockModuleId),
        title: 'Module With Attempts',
      });

      (LearningUnit.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: new mongoose.Types.ObjectId(), contentId: luContentId },
        ]),
      });
      (ContentAttempt.exists as jest.Mock).mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      await expect(
        CourseSegmentsService.deleteCourseModule(mockCourseId, mockModuleId, false)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Cannot delete module with existing attempts (use force=true)',
      });
    });

    it('should allow deletion with active attempts when force=true', async () => {
      const luContentId = new mongoose.Types.ObjectId();

      setupDeleteMocks();

      // Override LearningUnit to have content with attempts
      (LearningUnit.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: new mongoose.Types.ObjectId(), contentId: luContentId },
        ]),
      });
      (ContentAttempt.exists as jest.Mock).mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      // force=true bypasses the attempt check entirely
      const result = await CourseSegmentsService.deleteCourseModule(
        mockCourseId,
        mockModuleId,
        true
      );

      expect(result.id).toBe(mockModuleId);
      expect(CourseVersionModule.findByIdAndDelete).toHaveBeenCalled();
    });

    it('should return empty reorderedModules when deleted module is last', async () => {
      setupDeleteMocks({}, []);

      const result = await CourseSegmentsService.deleteCourseModule(
        mockCourseId,
        mockModuleId,
        false
      );

      expect(result.affectedModules).toBe(0);
      expect(result.reorderedModules).toEqual([]);
    });
  });

  // ===========================================================================
  // reorderCourseModules
  // ===========================================================================
  describe('reorderCourseModules', () => {
    const modId1 = new mongoose.Types.ObjectId().toString();
    const modId2 = new mongoose.Types.ObjectId().toString();
    const modId3 = new mongoose.Types.ObjectId().toString();

    function setupReorderMocks() {
      const { version } = setupResolve();

      const allLinks = [
        { _id: new mongoose.Types.ObjectId(), courseVersionId: mockVersionId, moduleId: new mongoose.Types.ObjectId(modId1), order: 1 },
        { _id: new mongoose.Types.ObjectId(), courseVersionId: mockVersionId, moduleId: new mongoose.Types.ObjectId(modId2), order: 2 },
        { _id: new mongoose.Types.ObjectId(), courseVersionId: mockVersionId, moduleId: new mongoose.Types.ObjectId(modId3), order: 3 },
      ];

      (CourseVersionModule.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(allLinks),
      });

      (Module.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: new mongoose.Types.ObjectId(modId1), title: 'Module 1' },
          { _id: new mongoose.Types.ObjectId(modId2), title: 'Module 2' },
          { _id: new mongoose.Types.ObjectId(modId3), title: 'Module 3' },
        ]),
      });

      (CourseVersionModule.bulkWrite as jest.Mock).mockResolvedValue({ modifiedCount: 2 });

      return { version, allLinks };
    }

    it('should reorder modules and return new order', async () => {
      setupReorderMocks();

      // Reverse the order: 3, 2, 1
      const result = await CourseSegmentsService.reorderCourseModules(
        mockCourseId,
        [modId3, modId2, modId1]
      );

      expect(result.courseId).toBe(mockCourseId);
      expect(result.modules).toHaveLength(3);
      expect(result.modules[0]).toMatchObject({
        id: modId3,
        title: 'Module 3',
        oldOrder: 3,
        newOrder: 1,
      });
      expect(result.modules[1]).toMatchObject({
        id: modId2,
        title: 'Module 2',
        oldOrder: 2,
        newOrder: 2,
      });
      expect(result.modules[2]).toMatchObject({
        id: modId1,
        title: 'Module 1',
        oldOrder: 1,
        newOrder: 3,
      });

      expect(CourseVersionModule.bulkWrite).toHaveBeenCalled();
    });

    it('should throw 400 on duplicate module IDs', async () => {
      setupResolve();

      await expect(
        CourseSegmentsService.reorderCourseModules(mockCourseId, [modId1, modId1, modId2])
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Duplicate module IDs in request',
      });
    });

    it('should throw 400 if not all modules included', async () => {
      setupReorderMocks();

      // Only include 2 of 3 modules
      await expect(
        CourseSegmentsService.reorderCourseModules(mockCourseId, [modId1, modId2])
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Not all course modules included in reorder',
      });
    });

    it('should throw 400 on empty moduleIds array', async () => {
      setupResolve();

      await expect(
        CourseSegmentsService.reorderCourseModules(mockCourseId, [])
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Module IDs array cannot be empty',
      });
    });

    it('should throw 400 if module ID does not belong to course', async () => {
      const { allLinks } = setupReorderMocks();
      const foreignModuleId = new mongoose.Types.ObjectId().toString();

      // Override with 3 links but pass a foreign ID
      (CourseVersionModule.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(allLinks),
      });

      await expect(
        CourseSegmentsService.reorderCourseModules(mockCourseId, [modId1, modId2, foreignModuleId])
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'One or more modules do not belong to this course',
      });
    });

    it('should throw 400 if any moduleId is not a valid ObjectId', async () => {
      setupResolve();

      await expect(
        CourseSegmentsService.reorderCourseModules(mockCourseId, ['not-valid', modId2, modId3])
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'One or more modules do not belong to this course',
      });
    });

    it('should not call bulkWrite when order has not changed', async () => {
      setupReorderMocks();

      // Same order: 1, 2, 3
      const result = await CourseSegmentsService.reorderCourseModules(
        mockCourseId,
        [modId1, modId2, modId3]
      );

      expect(CourseVersionModule.bulkWrite).not.toHaveBeenCalled();
      expect(result.totalReordered).toBe(0);
    });
  });
});
