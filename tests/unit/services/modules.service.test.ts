/**
 * Unit Tests: ModulesService
 *
 * Tests for the modules service:
 * - CRUD operations (create, read, update, delete)
 * - Prerequisite cycle detection
 * - Reordering modules
 * - Pagination and filtering
 * - Error cases
 */

import mongoose from 'mongoose';
import { ModulesService } from '@/services/academic/modules.service';
import Module from '@/models/academic/Module.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import { ApiError } from '@/utils/ApiError';

// Mock the models
jest.mock('@/models/academic/Module.model');
jest.mock('@/models/content/LearningUnit.model');

describe('ModulesService', () => {
  const mockCourseId = new mongoose.Types.ObjectId().toString();
  const mockModuleId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();

  const mockModule = {
    _id: mockModuleId,
    courseId: mockCourseId,
    title: 'Introduction to Testing',
    description: 'Learn the basics of testing',
    prerequisites: [],
    completionCriteria: {
      type: 'all_required',
      requireAllExpositions: true
    },
    presentationRules: {
      presentationMode: 'prescribed',
      repetitionMode: 'none',
      repeatOn: {
        failedAttempt: false,
        belowMastery: false,
        learnerRequest: false
      },
      repeatableCategories: [],
      showAllAvailable: true,
      allowSkip: false
    },
    isPublished: false,
    estimatedDuration: 60,
    objectives: ['Understand testing basics'],
    order: 1,
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: function () {
      return { ...this };
    },
    save: jest.fn().mockResolvedValue(this)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listModules', () => {
    it('should list modules for a course with default pagination', async () => {
      const mockModules = [mockModule];

      (Module.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue(mockModules)
            })
          })
        })
      });
      (Module.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await ModulesService.listModules(mockCourseId, {});

      expect(result.modules).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(1);
      expect(Module.find).toHaveBeenCalledWith({ courseId: mockCourseId });
    });

    it('should filter modules by isPublished', async () => {
      (Module.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      (Module.countDocuments as jest.Mock).mockResolvedValue(0);

      await ModulesService.listModules(mockCourseId, { isPublished: true });

      expect(Module.find).toHaveBeenCalledWith({
        courseId: mockCourseId,
        isPublished: true
      });
    });

    it('should handle custom pagination', async () => {
      (Module.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      (Module.countDocuments as jest.Mock).mockResolvedValue(25);

      const result = await ModulesService.listModules(mockCourseId, {
        page: 2,
        limit: 5
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('should handle custom sorting', async () => {
      const sortMock = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([])
          })
        })
      });
      (Module.find as jest.Mock).mockReturnValue({ sort: sortMock });
      (Module.countDocuments as jest.Mock).mockResolvedValue(0);

      await ModulesService.listModules(mockCourseId, { sort: '-title' });

      expect(sortMock).toHaveBeenCalledWith({ title: -1 });
    });

    it('should enforce maximum limit of 100', async () => {
      const limitMock = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });
      (Module.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: limitMock
          })
        })
      });
      (Module.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await ModulesService.listModules(mockCourseId, { limit: 500 });

      expect(limitMock).toHaveBeenCalledWith(100);
      expect(result.pagination.limit).toBe(100);
    });
  });

  describe('getModule', () => {
    it('should return a module with populated learning units', async () => {
      const mockLearningUnits = [
        { _id: 'lu1', title: 'Unit 1', sequence: 1 },
        { _id: 'lu2', title: 'Unit 2', sequence: 2 }
      ];

      (Module.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          ...mockModule,
          toObject: () => mockModule
        })
      });
      (LearningUnit.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockLearningUnits)
      });

      const result = await ModulesService.getModule(mockModuleId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockModuleId);
      expect(result.learningUnits).toHaveLength(2);
      expect(Module.findById).toHaveBeenCalledWith(mockModuleId);
    });

    it('should throw not found error for invalid module ID', async () => {
      await expect(ModulesService.getModule('invalid-id')).rejects.toThrow(ApiError);
      await expect(ModulesService.getModule('invalid-id')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid module ID'
      });
    });

    it('should throw not found error for non-existent module', async () => {
      (Module.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await expect(
        ModulesService.getModule(new mongoose.Types.ObjectId().toString())
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found'
      });
    });
  });

  describe('createModule', () => {
    const createData = {
      title: 'New Module',
      description: 'A new module description',
      prerequisites: [],
      completionCriteria: {
        type: 'all_required' as const,
        requireAllExpositions: true
      },
      presentationRules: {
        presentationMode: 'prescribed' as const,
        repetitionMode: 'none' as const,
        repeatOn: {
          failedAttempt: false,
          belowMastery: false,
          learnerRequest: false
        },
        repeatableCategories: [],
        showAllAvailable: true,
        allowSkip: false
      },
      isPublished: false,
      estimatedDuration: 30,
      objectives: ['Learn something new']
    };

    it('should create a module with auto-generated order', async () => {
      (Module.countDocuments as jest.Mock).mockResolvedValue(2);

      const savedModule = {
        ...createData,
        _id: new mongoose.Types.ObjectId(),
        courseId: mockCourseId,
        order: 3,
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: function () {
          return { ...this };
        }
      };

      (Module.prototype.save as jest.Mock) = jest.fn().mockResolvedValue(savedModule);
      jest.spyOn(Module.prototype, 'save').mockResolvedValue(savedModule);

      // Mock Module constructor
      (Module as unknown as jest.Mock).mockImplementation(() => ({
        ...savedModule,
        save: jest.fn().mockResolvedValue(savedModule)
      }));

      const result = await ModulesService.createModule(mockCourseId, createData, mockUserId);

      expect(result).toBeDefined();
      expect(result.title).toBe(createData.title);
      expect(result.order).toBe(3);
    });

    it('should throw bad request for empty title', async () => {
      const invalidData = { ...createData, title: '' };

      await expect(
        ModulesService.createModule(mockCourseId, invalidData, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Module title is required'
      });
    });

    it('should validate prerequisites exist in the same course', async () => {
      const prereqId = new mongoose.Types.ObjectId().toString();
      const dataWithPrereqs = { ...createData, prerequisites: [prereqId] };

      (Module.find as jest.Mock).mockResolvedValue([]); // No matching modules found

      await expect(
        ModulesService.createModule(mockCourseId, dataWithPrereqs, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'One or more prerequisites do not exist in this course'
      });
    });
  });

  describe('updateModule', () => {
    const updateData = {
      title: 'Updated Module Title',
      description: 'Updated description'
    };

    it('should update a module successfully', async () => {
      const updatedModule = {
        ...mockModule,
        ...updateData,
        save: jest.fn().mockResolvedValue({
          ...mockModule,
          ...updateData,
          toObject: () => ({ ...mockModule, ...updateData })
        }),
        toObject: () => ({ ...mockModule, ...updateData })
      };

      (Module.findById as jest.Mock).mockResolvedValue(updatedModule);

      const result = await ModulesService.updateModule(mockModuleId, updateData);

      expect(result).toBeDefined();
      expect(result.title).toBe(updateData.title);
      expect(updatedModule.save).toHaveBeenCalled();
    });

    it('should throw not found for invalid module ID', async () => {
      await expect(
        ModulesService.updateModule('invalid-id', updateData)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid module ID'
      });
    });

    it('should throw not found for non-existent module', async () => {
      (Module.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ModulesService.updateModule(new mongoose.Types.ObjectId().toString(), updateData)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found'
      });
    });

    it('should validate prerequisites when updating', async () => {
      const prereqId = new mongoose.Types.ObjectId().toString();
      const dataWithPrereqs = { prerequisites: [prereqId] };

      const existingModule = {
        ...mockModule,
        courseId: mockCourseId,
        save: jest.fn()
      };

      (Module.findById as jest.Mock).mockResolvedValue(existingModule);
      (Module.find as jest.Mock).mockResolvedValue([]); // Prerequisites not found

      await expect(
        ModulesService.updateModule(mockModuleId, dataWithPrereqs)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'One or more prerequisites do not exist in this course'
      });
    });
  });

  describe('deleteModule', () => {
    it('should soft delete a module and cascade to learning units', async () => {
      const moduleToDelete = {
        ...mockModule,
        save: jest.fn().mockResolvedValue({ ...mockModule, isActive: false })
      };

      (Module.findById as jest.Mock).mockResolvedValue(moduleToDelete);
      (LearningUnit.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 });

      await ModulesService.deleteModule(mockModuleId);

      expect(LearningUnit.updateMany).toHaveBeenCalledWith(
        { moduleId: mockModuleId },
        { isActive: false }
      );
    });

    it('should throw not found for invalid module ID', async () => {
      await expect(ModulesService.deleteModule('invalid-id')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid module ID'
      });
    });

    it('should throw not found for non-existent module', async () => {
      (Module.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ModulesService.deleteModule(new mongoose.Types.ObjectId().toString())
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Module not found'
      });
    });
  });

  describe('reorderModules', () => {
    it('should reorder modules successfully', async () => {
      const moduleId1 = new mongoose.Types.ObjectId().toString();
      const moduleId2 = new mongoose.Types.ObjectId().toString();
      const moduleId3 = new mongoose.Types.ObjectId().toString();

      const existingModules = [
        { _id: moduleId1, courseId: mockCourseId },
        { _id: moduleId2, courseId: mockCourseId },
        { _id: moduleId3, courseId: mockCourseId }
      ];

      (Module.find as jest.Mock).mockResolvedValue(existingModules);
      (Module.bulkWrite as jest.Mock).mockResolvedValue({ modifiedCount: 3 });

      await ModulesService.reorderModules(mockCourseId, [moduleId3, moduleId1, moduleId2]);

      expect(Module.bulkWrite).toHaveBeenCalled();
      const bulkWriteCalls = (Module.bulkWrite as jest.Mock).mock.calls[0][0];
      expect(bulkWriteCalls).toHaveLength(3);
    });

    it('should throw bad request if module IDs do not match course modules', async () => {
      const moduleId1 = new mongoose.Types.ObjectId().toString();
      const existingModules = [{ _id: moduleId1, courseId: mockCourseId }];

      (Module.find as jest.Mock).mockResolvedValue(existingModules);

      await expect(
        ModulesService.reorderModules(mockCourseId, [moduleId1, new mongoose.Types.ObjectId().toString()])
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Module IDs must match all modules in the course'
      });
    });

    it('should throw bad request for empty module IDs array', async () => {
      await expect(
        ModulesService.reorderModules(mockCourseId, [])
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Module IDs array cannot be empty'
      });
    });
  });

  describe('validatePrerequisites', () => {
    it('should return true for empty prerequisites', async () => {
      const result = await ModulesService.validatePrerequisites(null, [], mockCourseId);

      expect(result).toBe(true);
    });

    it('should return true for valid prerequisites without cycles', async () => {
      const moduleA = new mongoose.Types.ObjectId().toString();
      const moduleB = new mongoose.Types.ObjectId().toString();
      const moduleC = new mongoose.Types.ObjectId().toString();

      // moduleA has no prereqs, moduleB has moduleA as prereq
      const modules = [
        { _id: moduleA, courseId: mockCourseId, prerequisites: [] },
        { _id: moduleB, courseId: mockCourseId, prerequisites: [moduleA] },
        { _id: moduleC, courseId: mockCourseId, prerequisites: [moduleB] }
      ];

      (Module.find as jest.Mock).mockResolvedValue(modules);

      // Setting moduleA as a prereq for a new module should be valid
      const result = await ModulesService.validatePrerequisites(null, [moduleA], mockCourseId);

      expect(result).toBe(true);
    });

    it('should detect direct cycle (A -> A)', async () => {
      const moduleA = new mongoose.Types.ObjectId().toString();

      const modules = [
        { _id: moduleA, courseId: mockCourseId, prerequisites: [] }
      ];

      (Module.find as jest.Mock).mockResolvedValue(modules);

      // A module cannot be its own prerequisite
      const result = await ModulesService.validatePrerequisites(moduleA, [moduleA], mockCourseId);

      expect(result).toBe(false);
    });

    it('should detect indirect cycle (A -> B -> C -> A)', async () => {
      const moduleA = new mongoose.Types.ObjectId().toString();
      const moduleB = new mongoose.Types.ObjectId().toString();
      const moduleC = new mongoose.Types.ObjectId().toString();

      // Current state: A -> B -> C (no cycles)
      // Attempting to set C as prereq of A would create: C -> A -> B -> C (cycle!)
      const modules = [
        { _id: moduleA, courseId: mockCourseId, prerequisites: [moduleB] },
        { _id: moduleB, courseId: mockCourseId, prerequisites: [moduleC] },
        { _id: moduleC, courseId: mockCourseId, prerequisites: [] }
      ];

      (Module.find as jest.Mock).mockResolvedValue(modules);

      // Trying to add moduleA as a prereq for moduleC would create a cycle
      const result = await ModulesService.validatePrerequisites(moduleC, [moduleA], mockCourseId);

      expect(result).toBe(false);
    });

    it('should return false if prerequisite not in course', async () => {
      const prereqId = new mongoose.Types.ObjectId().toString();

      (Module.find as jest.Mock).mockResolvedValue([]); // No modules found

      const result = await ModulesService.validatePrerequisites(null, [prereqId], mockCourseId);

      expect(result).toBe(false);
    });
  });
});
