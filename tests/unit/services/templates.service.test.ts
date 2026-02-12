import mongoose from 'mongoose';
import { TemplatesService } from '@/services/content/templates.service';
import Template from '@/models/content/Template.model';
import Program from '@/models/academic/Program.model';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';

jest.mock('@/models/content/Template.model');
jest.mock('@/models/organization/Department.model');
jest.mock('@/models/academic/Program.model');
jest.mock('@/models/academic/CanonicalCourse.model');
jest.mock('@/models/academic/CourseVersion.model');

describe('TemplatesService', () => {
  const templateId = new mongoose.Types.ObjectId().toString();
  const programId = new mongoose.Types.ObjectId();
  const canonicalCourseId = new mongoose.Types.ObjectId();
  const versionId = new mongoose.Types.ObjectId();
  const creatorId = new mongoose.Types.ObjectId();

  const createdAt = new Date('2026-02-12T00:00:00.000Z');
  const updatedAt = new Date('2026-02-12T00:00:00.000Z');

  const mockTemplate = {
    _id: new mongoose.Types.ObjectId(templateId),
    name: 'Certificate Template',
    type: 'master',
    status: 'active',
    css: '.certificate { color: black; }',
    html: '<div>{{courseTitle}}</div>',
    departmentId: null,
    isGlobal: true,
    createdBy: {
      _id: creatorId,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com'
    },
    usageCount: 99,
    isDeleted: false,
    createdAt,
    updatedAt,
    save: jest.fn().mockResolvedValue(undefined)
  };

  const mockFindWithSelectLean = (modelMethod: jest.Mock, value: unknown) => {
    modelMethod.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
      })
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplateById', () => {
    it('should resolve usedByCourses from Program -> CanonicalCourse -> CourseVersion', async () => {
      const firstPopulate = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockTemplate)
      });
      (Template.findOne as jest.Mock).mockReturnValue({
        populate: firstPopulate
      });

      mockFindWithSelectLean(Program.find as jest.Mock, [{ _id: programId }]);

      mockFindWithSelectLean(CanonicalCourse.find as jest.Mock, [
        {
          _id: canonicalCourseId,
          code: 'CBT101',
          currentPublishedVersionId: versionId,
          latestDraftVersionId: null
        }
      ]);

      mockFindWithSelectLean(CourseVersion.find as jest.Mock, [
        {
          _id: versionId,
          title: 'CBT Foundations',
          status: 'published',
          version: 2
        }
      ]);

      const result = await TemplatesService.getTemplateById(templateId);

      expect(result.usageCount).toBe(1);
      expect(result.usedByCourses).toEqual([
        {
          id: canonicalCourseId.toString(),
          code: 'CBT101',
          title: 'CBT Foundations',
          versionId: versionId.toString(),
          version: 2,
          versionStatus: 'published'
        }
      ]);
    });
  });

  describe('deleteTemplate', () => {
    it('should block non-force delete when canonical usage exists even if stored usageCount is stale', async () => {
      (Template.findOne as jest.Mock).mockResolvedValue({
        ...mockTemplate,
        usageCount: 0
      });

      mockFindWithSelectLean(Program.find as jest.Mock, [{ _id: programId }]);
      mockFindWithSelectLean(CanonicalCourse.find as jest.Mock, [
        {
          _id: canonicalCourseId,
          code: 'EMDR101',
          currentPublishedVersionId: versionId,
          latestDraftVersionId: null
        }
      ]);
      mockFindWithSelectLean(CourseVersion.find as jest.Mock, [
        {
          _id: versionId,
          title: 'EMDR Introduction',
          status: 'published',
          version: 1
        }
      ]);

      await expect(TemplatesService.deleteTemplate(templateId, false)).rejects.toMatchObject({
        statusCode: 409
      });

      expect(Program.updateMany).not.toHaveBeenCalled();
    });

    it('should force-delete and unlink template from program certificate config', async () => {
      const templateDoc = {
        ...mockTemplate,
        save: jest.fn().mockResolvedValue(undefined)
      };
      (Template.findOne as jest.Mock).mockResolvedValue(templateDoc);

      mockFindWithSelectLean(Program.find as jest.Mock, [{ _id: programId }]);
      mockFindWithSelectLean(CanonicalCourse.find as jest.Mock, [
        {
          _id: canonicalCourseId,
          code: 'BH101',
          currentPublishedVersionId: versionId,
          latestDraftVersionId: null
        }
      ]);
      mockFindWithSelectLean(CourseVersion.find as jest.Mock, [
        {
          _id: versionId,
          title: 'Behavioral Health Basics',
          status: 'published',
          version: 3
        }
      ]);

      (Program.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const result = await TemplatesService.deleteTemplate(templateId, true);

      expect(Program.updateMany).toHaveBeenCalledWith(
        {
          _id: { $in: [expect.any(mongoose.Types.ObjectId)] },
          'certificate.templateId': expect.any(mongoose.Types.ObjectId)
        },
        { $unset: { 'certificate.templateId': 1 } }
      );
      expect(templateDoc.isDeleted).toBe(true);
      expect(templateDoc.usageCount).toBe(0);
      expect(templateDoc.save).toHaveBeenCalled();
      expect(result).toEqual({
        deletedId: templateId,
        affectedCourses: 1,
        replacedWith: null
      });
    });
  });
});
