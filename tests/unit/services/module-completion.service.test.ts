import mongoose from 'mongoose';
import { ModuleCompletionService } from '@/services/progress/module-completion.service';
import ModuleCompletion from '@/models/progress/ModuleCompletion.model';
import Module from '@/models/academic/Module.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/progress/ModuleCompletion.model');
jest.mock('@/models/academic/Module.model');
jest.mock('@/models/academic/CourseVersionModule.model');
jest.mock('@/models/progress/ModuleAccess.model', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 })
  }
}));

describe('ModuleCompletionService', () => {
  const mockLearnerId = new mongoose.Types.ObjectId().toString();
  const mockModuleId = new mongoose.Types.ObjectId().toString();
  const mockModuleId2 = new mongoose.Types.ObjectId().toString();
  const mockVersionId = new mongoose.Types.ObjectId().toString();
  const mockEnrollmentId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordCompletion', () => {
    it('should throw if module not found', async () => {
      (Module.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ModuleCompletionService.recordCompletion({
          learnerId: mockLearnerId,
          moduleId: mockModuleId,
          courseVersionId: mockVersionId,
          enrollmentId: mockEnrollmentId
        })
      ).rejects.toThrow(/Module not found/);
    });

    it('should use findOneAndUpdate with upsert to record completion', async () => {
      (Module.findById as jest.Mock).mockResolvedValue({ _id: mockModuleId });

      const mockCompletion = {
        _id: new mongoose.Types.ObjectId(),
        learnerId: mockLearnerId,
        moduleId: mockModuleId,
        completedInCourseVersionId: mockVersionId,
        completedInEnrollmentId: mockEnrollmentId,
        completedAt: new Date(),
        isGlobalCompletion: true,
        score: null
      };

      (ModuleCompletion.findOneAndUpdate as jest.Mock).mockResolvedValue(mockCompletion);

      const result = await ModuleCompletionService.recordCompletion({
        learnerId: mockLearnerId,
        moduleId: mockModuleId,
        courseVersionId: mockVersionId,
        enrollmentId: mockEnrollmentId
      });

      expect(result).toBeDefined();
      expect(result.learnerId).toBe(mockLearnerId);
      expect(ModuleCompletion.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: expect.any(mongoose.Types.ObjectId),
          moduleId: expect.any(mongoose.Types.ObjectId)
        }),
        expect.objectContaining({
          $setOnInsert: expect.objectContaining({
            score: null,
            isGlobalCompletion: true
          })
        }),
        expect.objectContaining({
          new: true,
          upsert: true,
          runValidators: true
        })
      );
    });

    it('should pass score through to $setOnInsert', async () => {
      (Module.findById as jest.Mock).mockResolvedValue({ _id: mockModuleId });
      (ModuleCompletion.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        score: 95
      });

      await ModuleCompletionService.recordCompletion({
        learnerId: mockLearnerId,
        moduleId: mockModuleId,
        courseVersionId: mockVersionId,
        enrollmentId: mockEnrollmentId,
        score: 95
      });

      expect(ModuleCompletion.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $setOnInsert: expect.objectContaining({ score: 95 })
        }),
        expect.anything()
      );
    });
  });

  describe('hasCompleted', () => {
    it('should return true when countDocuments > 0', async () => {
      (ModuleCompletion.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await ModuleCompletionService.hasCompleted(mockLearnerId, mockModuleId);
      expect(result).toBe(true);
      expect(ModuleCompletion.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: expect.any(mongoose.Types.ObjectId),
          moduleId: expect.any(mongoose.Types.ObjectId)
        })
      );
    });

    it('should return false when countDocuments is 0', async () => {
      (ModuleCompletion.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await ModuleCompletionService.hasCompleted(mockLearnerId, mockModuleId);
      expect(result).toBe(false);
    });
  });

  describe('checkBulkCompletions', () => {
    it('should return completion status for multiple modules', async () => {
      const mockSelect = jest.fn().mockResolvedValue([
        { moduleId: new mongoose.Types.ObjectId(mockModuleId), toString: () => mockModuleId }
      ]);
      (ModuleCompletion.find as jest.Mock).mockReturnValue({ select: mockSelect });

      const result = await ModuleCompletionService.checkBulkCompletions(
        mockLearnerId,
        [mockModuleId, mockModuleId2]
      );

      expect(result).toBeInstanceOf(Map);
      expect(ModuleCompletion.find).toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalledWith('moduleId');
    });

    it('should throw BSONError on invalid learnerId', async () => {
      await expect(
        ModuleCompletionService.checkBulkCompletions('invalid', [mockModuleId])
      ).rejects.toThrow();
    });
  });

  describe('getLearnerCompletions', () => {
    it('should return paginated completions', async () => {
      const mockCompletions = [
        {
          _id: new mongoose.Types.ObjectId(),
          learnerId: mockLearnerId,
          moduleId: mockModuleId,
          completedAt: new Date()
        }
      ];

      // Mock chained query with populate
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        then: jest.fn()
      };
      // Make the chain resolve to mockCompletions (for Promise.all)
      mockQuery.populate.mockImplementation(function(this: any) {
        // Second populate call - return a thenable
        if (mockQuery.populate.mock.calls.length >= 2) {
          return Promise.resolve(mockCompletions);
        }
        return mockQuery;
      });

      (ModuleCompletion.find as jest.Mock).mockReturnValue(mockQuery);
      (ModuleCompletion.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await ModuleCompletionService.getLearnerCompletions(
        mockLearnerId,
        { page: 1, limit: 20 }
      );

      expect(result.completions).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should throw on invalid learnerId', async () => {
      await expect(
        ModuleCompletionService.getLearnerCompletions('invalid', {})
      ).rejects.toThrow();
    });
  });

  describe('getModuleCompletionStats', () => {
    it('should return stats from aggregation', async () => {
      (ModuleCompletion.aggregate as jest.Mock).mockResolvedValue([
        { _id: null, totalCompletions: 5, globalCompletions: 4, averageScore: 85 }
      ]);

      const result = await ModuleCompletionService.getModuleCompletionStats(mockModuleId);

      expect(result.totalCompletions).toBe(5);
      expect(result.globalCompletions).toBe(4);
      expect(result.averageScore).toBe(85);
    });

    it('should return zeroes when no completions', async () => {
      (ModuleCompletion.aggregate as jest.Mock).mockResolvedValue([]);

      const result = await ModuleCompletionService.getModuleCompletionStats(mockModuleId);

      expect(result.totalCompletions).toBe(0);
      expect(result.globalCompletions).toBe(0);
      expect(result.averageScore).toBeNull();
    });
  });

  describe('getModuleUsage', () => {
    it('should throw if module not found', async () => {
      (Module.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ModuleCompletionService.getModuleUsage(mockModuleId)
      ).rejects.toThrow(/Module not found/);
    });

    it('should return course versions using the module', async () => {
      (Module.findById as jest.Mock).mockResolvedValue({ _id: mockModuleId });

      const mockCvm = {
        courseVersionId: {
          _id: new mongoose.Types.ObjectId(),
          canonicalCourseId: { _id: new mongoose.Types.ObjectId() },
          title: 'Web Dev 101',
          version: 1
        },
        order: 0,
        isRequired: true
      };

      const mockSort = jest.fn().mockResolvedValue([mockCvm]);
      const mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
      (CourseVersionModule.find as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await ModuleCompletionService.getModuleUsage(mockModuleId);

      expect(result.moduleId).toBe(mockModuleId);
      expect(result.courseVersions).toHaveLength(1);
      expect(result.totalCourses).toBe(1);
    });
  });

  describe('getDepartmentModules', () => {
    it('should return paginated modules for a department', async () => {
      const mockModules = [{ _id: new mongoose.Types.ObjectId(), title: 'Module 1' }];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockModules)
      };

      (Module.find as jest.Mock).mockReturnValue(mockQuery);
      (Module.countDocuments as jest.Mock).mockResolvedValue(1);

      const deptId = new mongoose.Types.ObjectId().toString();
      const result = await ModuleCompletionService.getDepartmentModules(deptId, { page: 1, limit: 10 });

      expect(result.modules).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getAvailableModules', () => {
    it('should return owned + shared modules', async () => {
      const mockModules = [{ _id: new mongoose.Types.ObjectId(), title: 'Shared Module' }];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockModules)
      };

      (Module.find as jest.Mock).mockReturnValue(mockQuery);
      (Module.countDocuments as jest.Mock).mockResolvedValue(1);

      const deptId = new mongoose.Types.ObjectId().toString();
      const result = await ModuleCompletionService.getAvailableModules(deptId, {});

      expect(result.modules).toHaveLength(1);
      expect(Module.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ isShared: true })
          ])
        })
      );
    });
  });

  describe('propagateCompletionToEnrollments', () => {
    it('should return 0 if no global completion found', async () => {
      (ModuleCompletion.findOne as jest.Mock).mockResolvedValue(null);

      const result = await ModuleCompletionService.propagateCompletionToEnrollments(
        mockLearnerId, mockModuleId
      );

      expect(result).toBe(0);
    });

    it('should update ModuleAccess records when completion exists', async () => {
      const ModuleAccess = require('@/models/progress/ModuleAccess.model').default;
      (ModuleCompletion.findOne as jest.Mock).mockResolvedValue({
        learnerId: mockLearnerId,
        moduleId: mockModuleId,
        isGlobalCompletion: true,
        completedAt: new Date()
      });
      ModuleAccess.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const result = await ModuleCompletionService.propagateCompletionToEnrollments(
        mockLearnerId, mockModuleId
      );

      expect(result).toBe(3);
      expect(ModuleAccess.updateMany).toHaveBeenCalled();
    });
  });
});
