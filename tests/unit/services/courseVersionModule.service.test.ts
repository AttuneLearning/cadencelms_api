import mongoose from 'mongoose';
import { CourseVersionModuleService } from '@/services/academic/courseVersionModule.service';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import Module from '@/models/academic/Module.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/academic/CourseVersion.model');
jest.mock('@/models/academic/CourseVersionModule.model');
jest.mock('@/models/academic/CanonicalCourse.model');
jest.mock('@/models/academic/Module.model');

describe('CourseVersionModuleService', () => {
  const mockVersionId = new mongoose.Types.ObjectId().toString();
  const mockModuleId = new mongoose.Types.ObjectId().toString();
  const mockModuleId2 = new mongoose.Types.ObjectId().toString();
  const mockDeptId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId().toString();

  const createMockDraftVersion = () => ({
    _id: new mongoose.Types.ObjectId(mockVersionId),
    status: 'draft',
    isLocked: false,
    canonicalCourseId: new mongoose.Types.ObjectId()
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listModulesForVersion', () => {
    it('should throw on invalid version ID', async () => {
      await expect(
        CourseVersionModuleService.listModulesForVersion('invalid')
      ).rejects.toThrow(/Invalid course version ID/);
    });

    it('should throw if version not found', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        CourseVersionModuleService.listModulesForVersion(mockVersionId)
      ).rejects.toThrow(/Course version not found/);
    });

    it('should return sorted modules', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue({ _id: mockVersionId });
      const mockModules = [
        { moduleId: mockModuleId, order: 0 },
        { moduleId: mockModuleId2, order: 1 }
      ];
      const mockExec = jest.fn().mockResolvedValue(mockModules);
      const mockPopulate = jest.fn().mockReturnValue({ exec: mockExec });
      const mockSort = jest.fn().mockReturnValue({ populate: mockPopulate });
      (CourseVersionModule.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await CourseVersionModuleService.listModulesForVersion(mockVersionId);
      expect(result).toHaveLength(2);
    });
  });

  describe('addModuleToVersion', () => {
    it('should throw if version is not draft', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'published',
        isLocked: false
      });

      await expect(
        CourseVersionModuleService.addModuleToVersion(mockVersionId, { moduleId: mockModuleId }, mockUserId)
      ).rejects.toThrow(/Only draft versions can be modified/);
    });

    it('should throw if version is locked', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'draft',
        isLocked: true
      });

      await expect(
        CourseVersionModuleService.addModuleToVersion(mockVersionId, { moduleId: mockModuleId }, mockUserId)
      ).rejects.toThrow(/version is locked/);
    });

    it('should throw if module not found', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(createMockDraftVersion());
      (Module.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CourseVersionModuleService.addModuleToVersion(mockVersionId, { moduleId: mockModuleId }, mockUserId)
      ).rejects.toThrow(/Module not found/);
    });

    it('should throw if module is from different department and not shared', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(createMockDraftVersion());

      const differentDeptId = new mongoose.Types.ObjectId();
      (Module.findById as jest.Mock).mockResolvedValue({
        _id: mockModuleId,
        ownerDepartmentId: differentDeptId,
        isShared: false
      });

      // Mock getDepartmentIdForVersion path
      const canonicalCourseId = createMockDraftVersion().canonicalCourseId;
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: canonicalCourseId,
        departmentId: mockDeptId
      });

      await expect(
        CourseVersionModuleService.addModuleToVersion(mockVersionId, { moduleId: mockModuleId }, mockUserId)
      ).rejects.toThrow(/same department.*or be shared/);
    });

    it('should throw on duplicate module', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(createMockDraftVersion());
      (Module.findById as jest.Mock).mockResolvedValue({
        _id: mockModuleId,
        ownerDepartmentId: mockDeptId,
        isShared: false
      });
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        departmentId: mockDeptId
      });
      (CourseVersionModule.findOne as jest.Mock).mockResolvedValue({ _id: 'exists' });

      await expect(
        CourseVersionModuleService.addModuleToVersion(mockVersionId, { moduleId: mockModuleId }, mockUserId)
      ).rejects.toThrow(/already part of this version/);
    });

    it('should add module with auto-assigned order', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(createMockDraftVersion());
      (Module.findById as jest.Mock).mockResolvedValue({
        _id: mockModuleId,
        ownerDepartmentId: mockDeptId,
        isShared: false
      });
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        departmentId: mockDeptId
      });
      (CourseVersionModule.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // duplicate check
        .mockReturnValueOnce({ // last module query for order
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ order: 2 })
          })
        });

      const mockSave = jest.fn().mockResolvedValue(true);
      (CourseVersionModule as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockSave
      }));

      const result = await CourseVersionModuleService.addModuleToVersion(
        mockVersionId,
        { moduleId: mockModuleId },
        mockUserId
      );

      expect(result).toBeDefined();
      expect(result.order).toBe(3);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('removeModuleFromVersion', () => {
    it('should throw if version is not draft', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'published',
        isLocked: false
      });

      await expect(
        CourseVersionModuleService.removeModuleFromVersion(mockVersionId, mockModuleId)
      ).rejects.toThrow(/Only draft versions can be modified/);
    });

    it('should throw if module not in version', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(createMockDraftVersion());
      (CourseVersionModule.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 0 });

      await expect(
        CourseVersionModuleService.removeModuleFromVersion(mockVersionId, mockModuleId)
      ).rejects.toThrow(/Module not found in this version/);
    });

    it('should remove and re-order remaining modules', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(createMockDraftVersion());
      (CourseVersionModule.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      const remaining = [
        { _id: new mongoose.Types.ObjectId() },
        { _id: new mongoose.Types.ObjectId() }
      ];
      const mockExec = jest.fn().mockResolvedValue(remaining);
      const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
      (CourseVersionModule.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (CourseVersionModule.bulkWrite as jest.Mock).mockResolvedValue({});

      await CourseVersionModuleService.removeModuleFromVersion(mockVersionId, mockModuleId);

      expect(CourseVersionModule.bulkWrite).toHaveBeenCalled();
    });
  });

  describe('reorderModules', () => {
    it('should throw if version is not draft', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'published',
        isLocked: false
      });

      await expect(
        CourseVersionModuleService.reorderModules(mockVersionId, [mockModuleId])
      ).rejects.toThrow(/Only draft versions can be modified/);
    });

    it('should throw if module not part of version', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(createMockDraftVersion());
      (CourseVersionModule.find as jest.Mock).mockResolvedValue([
        { moduleId: new mongoose.Types.ObjectId(mockModuleId), toString: () => mockModuleId }
      ]);

      const unknownModuleId = new mongoose.Types.ObjectId().toString();

      await expect(
        CourseVersionModuleService.reorderModules(mockVersionId, [mockModuleId, unknownModuleId])
      ).rejects.toThrow(/not part of this version/);
    });

    it('should throw on duplicate IDs', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(createMockDraftVersion());
      (CourseVersionModule.find as jest.Mock).mockResolvedValue([
        { moduleId: { toString: () => mockModuleId } }
      ]);

      await expect(
        CourseVersionModuleService.reorderModules(mockVersionId, [mockModuleId, mockModuleId])
      ).rejects.toThrow(/Duplicate module IDs/);
    });
  });

  describe('updateModuleSettings', () => {
    it('should throw if version is not draft', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'published',
        isLocked: false
      });

      await expect(
        CourseVersionModuleService.updateModuleSettings(mockVersionId, mockModuleId, { isRequired: false })
      ).rejects.toThrow(/Only draft versions can be modified/);
    });

    it('should throw if module not in version', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(createMockDraftVersion());
      (CourseVersionModule.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        CourseVersionModuleService.updateModuleSettings(mockVersionId, mockModuleId, { isRequired: false })
      ).rejects.toThrow(/Module not found in this version/);
    });

    it('should update settings and save', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(createMockDraftVersion());
      const versionModule = {
        _id: new mongoose.Types.ObjectId(),
        isRequired: true,
        availableFrom: null,
        availableUntil: null,
        save: jest.fn().mockResolvedValue(true)
      };
      (CourseVersionModule.findOne as jest.Mock).mockResolvedValue(versionModule);

      const result = await CourseVersionModuleService.updateModuleSettings(
        mockVersionId,
        mockModuleId,
        { isRequired: false }
      );

      expect(result.isRequired).toBe(false);
      expect(versionModule.save).toHaveBeenCalled();
    });
  });

  describe('copyModulesFromVersion', () => {
    it('should throw on invalid source version ID', async () => {
      await expect(
        CourseVersionModuleService.copyModulesFromVersion('invalid', mockVersionId)
      ).rejects.toThrow(/Invalid source version ID/);
    });

    it('should throw if source version not found', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(null);
      const sourceId = new mongoose.Types.ObjectId().toString();

      await expect(
        CourseVersionModuleService.copyModulesFromVersion(sourceId, mockVersionId)
      ).rejects.toThrow(/Source version not found/);
    });

    it('should copy modules between versions', async () => {
      const sourceId = new mongoose.Types.ObjectId().toString();
      const targetId = new mongoose.Types.ObjectId().toString();

      (CourseVersion.findById as jest.Mock)
        .mockResolvedValueOnce({ _id: sourceId }) // source
        .mockResolvedValueOnce({ _id: targetId }); // target

      const sourceModules = [
        { moduleId: new mongoose.Types.ObjectId(), order: 0, isRequired: true, availableFrom: null, availableUntil: null },
        { moduleId: new mongoose.Types.ObjectId(), order: 1, isRequired: false, availableFrom: null, availableUntil: null }
      ];
      (CourseVersionModule.find as jest.Mock).mockResolvedValue(sourceModules);
      (CourseVersionModule.insertMany as jest.Mock).mockResolvedValue([]);

      await CourseVersionModuleService.copyModulesFromVersion(sourceId, targetId);

      expect(CourseVersionModule.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ order: 0 }),
          expect.objectContaining({ order: 1 })
        ])
      );
    });
  });

  describe('getModuleCount', () => {
    it('should throw on invalid version ID', async () => {
      await expect(
        CourseVersionModuleService.getModuleCount('invalid')
      ).rejects.toThrow(/Invalid course version ID/);
    });

    it('should return count', async () => {
      (CourseVersionModule.countDocuments as jest.Mock).mockResolvedValue(5);

      const result = await CourseVersionModuleService.getModuleCount(mockVersionId);
      expect(result).toBe(5);
    });
  });
});
