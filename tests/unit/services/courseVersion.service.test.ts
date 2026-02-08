import mongoose from 'mongoose';
import { CourseVersionService, courseVersionEvents } from '@/services/academic/courseVersion.service';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/academic/CanonicalCourse.model');
jest.mock('@/models/academic/CourseVersion.model');
jest.mock('@/models/academic/CourseVersionModule.model');

describe('CourseVersionService', () => {
  const mockCanonicalId = new mongoose.Types.ObjectId().toString();
  const mockVersionId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getVersion', () => {
    it('should throw on invalid version ID', async () => {
      await expect(
        CourseVersionService.getVersion('invalid')
      ).rejects.toThrow(/Invalid version ID/);
    });

    it('should throw if version not found', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        CourseVersionService.getVersion(mockVersionId)
      ).rejects.toThrow(/Course version not found/);
    });

    it('should return version when found', async () => {
      const mockVersion = { _id: mockVersionId, title: 'Test Course', version: 1 };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(mockVersion);

      const result = await CourseVersionService.getVersion(mockVersionId);
      expect(result.title).toBe('Test Course');
    });
  });

  describe('listVersions', () => {
    it('should throw on invalid canonical course ID', async () => {
      await expect(
        CourseVersionService.listVersions('invalid')
      ).rejects.toThrow(/Invalid canonical course ID/);
    });

    it('should throw if canonical course not found', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        CourseVersionService.listVersions(mockCanonicalId)
      ).rejects.toThrow(/Canonical course not found/);
    });

    it('should return sorted versions', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({ _id: mockCanonicalId });
      const mockExec = jest.fn().mockResolvedValue([
        { version: 2, title: 'V2' },
        { version: 1, title: 'V1' }
      ]);
      const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
      (CourseVersion.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await CourseVersionService.listVersions(mockCanonicalId);
      expect(result).toHaveLength(2);
      expect(CourseVersion.find).toHaveBeenCalledWith({ canonicalCourseId: mockCanonicalId });
    });
  });

  describe('createVersion', () => {
    it('should throw on invalid canonical course ID', async () => {
      await expect(
        CourseVersionService.createVersion('invalid', null, mockUserId)
      ).rejects.toThrow(/Invalid canonical course ID/);
    });

    it('should throw if canonical course not found', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        CourseVersionService.createVersion(mockCanonicalId, null, mockUserId)
      ).rejects.toThrow(/Canonical course not found/);
    });

    it('should throw if draft already exists', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: mockCanonicalId,
        latestDraftVersionId: new mongoose.Types.ObjectId(),
        currentPublishedVersionId: new mongoose.Types.ObjectId()
      });

      await expect(
        CourseVersionService.createVersion(mockCanonicalId, null, mockUserId)
      ).rejects.toThrow(/draft version already exists/);
    });

    it('should throw if no published version exists', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue({
        _id: mockCanonicalId,
        latestDraftVersionId: null,
        currentPublishedVersionId: null
      });

      await expect(
        CourseVersionService.createVersion(mockCanonicalId, null, mockUserId)
      ).rejects.toThrow(/no published version exists/);
    });

    it('should create new version from published', async () => {
      const publishedVersionId = new mongoose.Types.ObjectId();
      const canonicalCourse = {
        _id: new mongoose.Types.ObjectId(mockCanonicalId),
        latestDraftVersionId: null,
        currentPublishedVersionId: publishedVersionId,
        totalVersions: 1,
        save: jest.fn().mockResolvedValue(true)
      };
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue(canonicalCourse);

      const publishedVersion = {
        _id: publishedVersionId,
        title: 'Published Course',
        description: 'Desc',
        credits: 3,
        duration: 60,
        settings: { passingScore: 70 },
        instructorIds: [],
        isLatest: true,
        save: jest.fn().mockResolvedValue(true)
      };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(publishedVersion);

      const mockSave = jest.fn().mockResolvedValue(true);
      (CourseVersion as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockSave
      }));

      (CourseVersionModule.find as jest.Mock).mockResolvedValue([]);
      (CourseVersionModule.insertMany as jest.Mock).mockResolvedValue([]);

      const result = await CourseVersionService.createVersion(mockCanonicalId, 'Update notes', mockUserId);

      expect(result).toBeDefined();
      expect(result.status).toBe('draft');
      expect(result.version).toBe(2);
      expect(publishedVersion.save).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('updateDraft', () => {
    it('should throw on invalid version ID', async () => {
      await expect(
        CourseVersionService.updateDraft('invalid', { title: 'New' })
      ).rejects.toThrow(/Invalid version ID/);
    });

    it('should throw if version not found', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        CourseVersionService.updateDraft(mockVersionId, { title: 'New' })
      ).rejects.toThrow(/Course version not found/);
    });

    it('should throw if version is not draft', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'published',
        isLocked: false
      });
      await expect(
        CourseVersionService.updateDraft(mockVersionId, { title: 'New' })
      ).rejects.toThrow(/Only draft versions can be updated/);
    });

    it('should throw if version is locked', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'draft',
        isLocked: true
      });
      await expect(
        CourseVersionService.updateDraft(mockVersionId, { title: 'New' })
      ).rejects.toThrow(/Cannot update a locked version/);
    });

    it('should update draft fields', async () => {
      const version = {
        _id: mockVersionId,
        status: 'draft',
        isLocked: false,
        title: 'Old Title',
        description: 'Old Desc',
        settings: { passingScore: 70 },
        save: jest.fn().mockResolvedValue(true)
      };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(version);

      const result = await CourseVersionService.updateDraft(mockVersionId, {
        title: 'New Title',
        description: 'New Desc'
      });

      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New Desc');
      expect(version.save).toHaveBeenCalled();
    });
  });

  describe('publishVersion', () => {
    it('should throw on invalid version ID', async () => {
      await expect(
        CourseVersionService.publishVersion('invalid', mockUserId)
      ).rejects.toThrow(/Invalid version ID/);
    });

    it('should throw if version is not draft', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        status: 'published',
        isLocked: false,
        canonicalCourseId: mockCanonicalId
      });
      await expect(
        CourseVersionService.publishVersion(mockVersionId, mockUserId)
      ).rejects.toThrow(/Only draft versions can be published/);
    });

    it('should publish draft version and emit event', async () => {
      const version = {
        _id: new mongoose.Types.ObjectId(mockVersionId),
        status: 'draft',
        isLocked: false,
        version: 2,
        canonicalCourseId: mockCanonicalId,
        save: jest.fn().mockResolvedValue(true)
      };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(version);

      const canonicalCourse = {
        _id: new mongoose.Types.ObjectId(mockCanonicalId),
        currentPublishedVersionId: null,
        latestDraftVersionId: mockVersionId,
        save: jest.fn().mockResolvedValue(true)
      };
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue(canonicalCourse);
      (CourseVersionModule.countDocuments as jest.Mock).mockResolvedValue(0);

      const eventSpy = jest.fn();
      courseVersionEvents.on('course.version.published', eventSpy);

      const result = await CourseVersionService.publishVersion(mockVersionId, mockUserId);

      expect(result.status).toBe('published');
      expect(result.publishedAt).toBeDefined();
      expect(version.save).toHaveBeenCalled();
      expect(canonicalCourse.save).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          courseVersionId: mockVersionId,
          version: 2
        })
      );

      courseVersionEvents.removeListener('course.version.published', eventSpy);
    });
  });

  describe('lockVersion', () => {
    it('should throw on invalid version ID', async () => {
      await expect(
        CourseVersionService.lockVersion('invalid', 'manual', mockUserId)
      ).rejects.toThrow(/Invalid version ID/);
    });

    it('should throw if version not found', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        CourseVersionService.lockVersion(mockVersionId, 'manual', mockUserId)
      ).rejects.toThrow(/Course version not found/);
    });

    it('should throw if already locked', async () => {
      (CourseVersion.findById as jest.Mock).mockResolvedValue({
        _id: mockVersionId,
        isLocked: true
      });
      await expect(
        CourseVersionService.lockVersion(mockVersionId, 'manual', mockUserId)
      ).rejects.toThrow(/already locked/);
    });

    it('should lock version with stats', async () => {
      const version = {
        _id: mockVersionId,
        isLocked: false,
        changeNotes: null,
        save: jest.fn().mockResolvedValue(true)
      };
      (CourseVersion.findById as jest.Mock).mockResolvedValue(version);
      (CourseVersionModule.countDocuments as jest.Mock).mockResolvedValue(5);

      const result = await CourseVersionService.lockVersion(mockVersionId, 'manual', mockUserId);

      expect(result.isLocked).toBe(true);
      expect(result.lockedReason).toBe('manual');
      expect(result.statsAtLock).toBeDefined();
      expect(result.statsAtLock.moduleCount).toBe(5);
      expect(version.save).toHaveBeenCalled();
    });
  });

  describe('getCanonicalCourse', () => {
    it('should throw on invalid ID', async () => {
      await expect(
        CourseVersionService.getCanonicalCourse('invalid')
      ).rejects.toThrow(/Invalid canonical course ID/);
    });

    it('should throw if not found', async () => {
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        CourseVersionService.getCanonicalCourse(mockCanonicalId)
      ).rejects.toThrow(/Canonical course not found/);
    });

    it('should return canonical course', async () => {
      const course = { _id: mockCanonicalId, code: 'CS101' };
      (CanonicalCourse.findById as jest.Mock).mockResolvedValue(course);

      const result = await CourseVersionService.getCanonicalCourse(mockCanonicalId);
      expect(result.code).toBe('CS101');
    });
  });

  describe('getVersionDetail', () => {
    it('should throw on invalid ID', async () => {
      await expect(
        CourseVersionService.getVersionDetail('invalid')
      ).rejects.toThrow(/Invalid version ID/);
    });

    it('should throw if not found', async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      const mockPopulate = jest.fn().mockReturnThis();
      (CourseVersion.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate,
        exec: mockExec
      });
      // Chain all populates, last one returns the object with exec
      mockPopulate.mockImplementation(() => ({
        populate: mockPopulate,
        exec: mockExec
      }));

      await expect(
        CourseVersionService.getVersionDetail(mockVersionId)
      ).rejects.toThrow(/Course version not found/);
    });
  });
});
