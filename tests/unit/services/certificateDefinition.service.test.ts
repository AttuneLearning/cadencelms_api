import mongoose from 'mongoose';
import { CertificateDefinitionService } from '@/services/certificate/certificateDefinition.service';
import CertificateDefinition from '@/models/certificate/CertificateDefinition.model';
import CertificateRequirement from '@/models/certificate/CertificateRequirement.model';
import CredentialGroup from '@/models/certificate/CredentialGroup.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/certificate/CertificateDefinition.model');
jest.mock('@/models/certificate/CertificateRequirement.model');
jest.mock('@/models/certificate/CredentialGroup.model');
jest.mock('@/models/academic/CourseVersion.model');
jest.mock('@/events/eventBus', () => ({
  eventBus: { emit: jest.fn(), on: jest.fn() },
  EVENTS: {
    CERTIFICATE_DEFINITION_ACTIVATED: 'certificate.definition.activated',
    CERTIFICATE_DEFINITION_DEPRECATED: 'certificate.definition.deprecated',
    CERTIFICATE_ISSUED: 'certificate.issued',
    CERTIFICATE_REVOKED: 'certificate.revoked',
    CERTIFICATE_UPGRADED: 'certificate.upgraded',
    COURSE_COMPLETED: 'course.completed',
    COURSE_VERSION_PUBLISHED: 'course.version.published'
  }
}));

describe('CertificateDefinitionService', () => {
  const mockId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockCredGroupId = new mongoose.Types.ObjectId().toString();
  const mockCourseVersionId = new mongoose.Types.ObjectId().toString();
  const mockRequirementId = new mongoose.Types.ObjectId().toString();

  const createMockDefinition = (overrides: any = {}) => ({
    _id: new mongoose.Types.ObjectId(mockId),
    credentialGroupId: new mongoose.Types.ObjectId(mockCredGroupId),
    version: 1,
    parentDefinitionId: null,
    title: 'Test Certificate v1',
    description: 'Test description',
    status: 'draft',
    isCompatible: true,
    compatibilityBreakReason: null,
    deprecatedAt: null,
    deprecatedReason: null,
    supersededByDefinitionId: null,
    validFrom: null,
    validUntil: null,
    expiresAfterMonths: null,
    autoIssue: false,
    createdBy: new mongoose.Types.ObjectId(mockUserId),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // listDefinitions
  // =========================================================================
  describe('listDefinitions', () => {
    it('should throw on invalid credential group ID filter', async () => {
      await expect(
        CertificateDefinitionService.listDefinitions({ credentialGroupId: 'invalid' }, mockUserId)
      ).rejects.toThrow(/Invalid credential group ID/);
    });

    it('should return paginated definitions with enrichment', async () => {
      const defId = new mongoose.Types.ObjectId();
      const credGroupObjId = new mongoose.Types.ObjectId();
      const mockDefs = [{
        _id: defId,
        credentialGroupId: {
          _id: credGroupObjId,
          name: 'AWS SA',
          code: 'AWS-SA',
          type: 'certificate'
        },
        parentDefinitionId: null,
        supersededByDefinitionId: null,
        version: 1,
        title: 'Test Cert',
        description: 'Desc',
        status: 'active',
        isCompatible: true,
        compatibilityBreakReason: null,
        deprecatedAt: null,
        deprecatedReason: null,
        validFrom: null,
        validUntil: null,
        expiresAfterMonths: null,
        autoIssue: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const mockLean = jest.fn().mockResolvedValue(mockDefs);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate3 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateDefinition.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CertificateDefinition.countDocuments as jest.Mock).mockResolvedValue(1);
      (CertificateRequirement.countDocuments as jest.Mock).mockResolvedValue(3);

      const result = await CertificateDefinitionService.listDefinitions({}, mockUserId);

      expect(result.definitions).toHaveLength(1);
      expect(result.definitions[0].id).toBe(defId.toString());
      expect(result.definitions[0].credentialGroup?.name).toBe('AWS SA');
      expect(result.definitions[0].requirementCount).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply status filter', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate3 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateDefinition.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CertificateDefinition.countDocuments as jest.Mock).mockResolvedValue(0);

      await CertificateDefinitionService.listDefinitions({ status: 'active' }, mockUserId);

      expect(CertificateDefinition.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });

    it('should calculate pagination correctly', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate3 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateDefinition.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CertificateDefinition.countDocuments as jest.Mock).mockResolvedValue(50);

      const result = await CertificateDefinitionService.listDefinitions(
        { page: 2, limit: 10 },
        mockUserId
      );

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });
  });

  // =========================================================================
  // createDefinition
  // =========================================================================
  describe('createDefinition', () => {
    it('should throw on invalid credential group ID', async () => {
      await expect(
        CertificateDefinitionService.createDefinition(
          { credentialGroupId: 'invalid', title: 'T', description: 'D' },
          mockUserId
        )
      ).rejects.toThrow(/Invalid credential group ID/);
    });

    it('should throw if credential group not found', async () => {
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateDefinitionService.createDefinition(
          { credentialGroupId: mockCredGroupId, title: 'T', description: 'D' },
          mockUserId
        )
      ).rejects.toThrow(/Credential group not found/);
    });

    it('should throw if credential group is inactive', async () => {
      (CredentialGroup.findById as jest.Mock).mockResolvedValue({
        _id: mockCredGroupId,
        isActive: false
      });

      await expect(
        CertificateDefinitionService.createDefinition(
          { credentialGroupId: mockCredGroupId, title: 'T', description: 'D' },
          mockUserId
        )
      ).rejects.toThrow(/inactive credential group/);
    });

    it('should create first definition with version 1', async () => {
      (CredentialGroup.findById as jest.Mock).mockResolvedValue({
        _id: mockCredGroupId,
        isActive: true
      });

      const mockLean = jest.fn().mockResolvedValue(null);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (CertificateDefinition.findOne as jest.Mock).mockReturnValue({ sort: mockSort });

      const mockSave = jest.fn().mockResolvedValue(true);
      (CertificateDefinition as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockSave
      }));

      const result = await CertificateDefinitionService.createDefinition(
        { credentialGroupId: mockCredGroupId, title: 'AWS SA v1', description: 'First version' },
        mockUserId
      );

      expect(mockSave).toHaveBeenCalled();
      expect(result.version).toBe(1);
      expect(result.title).toBe('AWS SA v1');
      expect(result.status).toBe('draft');
      expect(result.parentDefinitionId).toBeNull();
    });

    it('should create next version when previous exists', async () => {
      const prevDefId = new mongoose.Types.ObjectId();

      (CredentialGroup.findById as jest.Mock).mockResolvedValue({
        _id: mockCredGroupId,
        isActive: true
      });

      const mockLean = jest.fn().mockResolvedValue({ _id: prevDefId, version: 2 });
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (CertificateDefinition.findOne as jest.Mock).mockReturnValue({ sort: mockSort });

      const mockSave = jest.fn().mockResolvedValue(true);
      (CertificateDefinition as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockSave
      }));

      const result = await CertificateDefinitionService.createDefinition(
        { credentialGroupId: mockCredGroupId, title: 'v3', description: 'Third version' },
        mockUserId
      );

      expect(result.version).toBe(3);
      expect(result.parentDefinitionId).toBe(prevDefId.toString());
    });

    it('should apply default values for optional fields', async () => {
      (CredentialGroup.findById as jest.Mock).mockResolvedValue({
        _id: mockCredGroupId,
        isActive: true
      });

      const mockLean = jest.fn().mockResolvedValue(null);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (CertificateDefinition.findOne as jest.Mock).mockReturnValue({ sort: mockSort });

      const mockSave = jest.fn().mockResolvedValue(true);
      (CertificateDefinition as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockSave
      }));

      const result = await CertificateDefinitionService.createDefinition(
        { credentialGroupId: mockCredGroupId, title: 'T', description: 'D' },
        mockUserId
      );

      expect(result.isCompatible).toBe(true);
      expect(result.autoIssue).toBe(false);
    });
  });

  // =========================================================================
  // getDefinitionById
  // =========================================================================
  describe('getDefinitionById', () => {
    it('should throw on invalid definition ID', async () => {
      await expect(
        CertificateDefinitionService.getDefinitionById('invalid', mockUserId)
      ).rejects.toThrow(/Invalid definition ID/);
    });

    it('should throw if definition not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate4 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate3 = jest.fn().mockReturnValue({ populate: mockPopulate4 });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        CertificateDefinitionService.getDefinitionById(mockId, mockUserId)
      ).rejects.toThrow(/Certificate definition not found/);
    });

    it('should return enriched definition with requirements', async () => {
      const defId = new mongoose.Types.ObjectId();
      const credGroupId = new mongoose.Types.ObjectId();
      const createdById = new mongoose.Types.ObjectId();
      const reqId = new mongoose.Types.ObjectId();
      const cvId = new mongoose.Types.ObjectId();

      const mockDef = {
        _id: defId,
        credentialGroupId: {
          _id: credGroupId,
          name: 'AWS SA',
          code: 'AWS-SA',
          type: 'certificate',
          departmentId: new mongoose.Types.ObjectId()
        },
        parentDefinitionId: null,
        supersededByDefinitionId: null,
        version: 1,
        title: 'Test Cert',
        description: 'Desc',
        status: 'active',
        isCompatible: true,
        compatibilityBreakReason: null,
        deprecatedAt: null,
        deprecatedReason: null,
        validFrom: null,
        validUntil: null,
        expiresAfterMonths: null,
        autoIssue: false,
        createdBy: { _id: createdById, email: 'admin@test.com' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockReqs = [{
        _id: reqId,
        courseVersionId: { _id: cvId, title: 'Course 1', version: 1, canonicalCourseId: new mongoose.Types.ObjectId() },
        isRequired: true,
        minimumScore: 80,
        order: 0,
        electiveGroupId: null,
        electiveGroupName: null,
        electiveMinCount: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const mockDefLean = jest.fn().mockResolvedValue(mockDef);
      const mockDefPop4 = jest.fn().mockReturnValue({ lean: mockDefLean });
      const mockDefPop3 = jest.fn().mockReturnValue({ populate: mockDefPop4 });
      const mockDefPop2 = jest.fn().mockReturnValue({ populate: mockDefPop3 });
      const mockDefPop = jest.fn().mockReturnValue({ populate: mockDefPop2 });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockDefPop });

      const mockReqLean = jest.fn().mockResolvedValue(mockReqs);
      const mockReqSort = jest.fn().mockReturnValue({ lean: mockReqLean });
      const mockReqPop = jest.fn().mockReturnValue({ sort: mockReqSort });
      (CertificateRequirement.find as jest.Mock).mockReturnValue({ populate: mockReqPop });

      const result = await CertificateDefinitionService.getDefinitionById(defId.toString(), mockUserId);

      expect(result.id).toBe(defId.toString());
      expect(result.credentialGroup?.name).toBe('AWS SA');
      expect(result.requirements).toHaveLength(1);
      expect(result.requirements[0].courseVersion?.title).toBe('Course 1');
      expect(result.requirements[0].isRequired).toBe(true);
      expect(result.requirements[0].minimumScore).toBe(80);
      expect(result.createdBy?.email).toBe('admin@test.com');
    });
  });

  // =========================================================================
  // updateDefinition
  // =========================================================================
  describe('updateDefinition', () => {
    it('should throw on invalid definition ID', async () => {
      await expect(
        CertificateDefinitionService.updateDefinition('invalid', {}, mockUserId)
      ).rejects.toThrow(/Invalid definition ID/);
    });

    it('should throw if definition not found', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateDefinitionService.updateDefinition(mockId, {}, mockUserId)
      ).rejects.toThrow(/Certificate definition not found/);
    });

    it('should throw if definition is not draft', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(
        createMockDefinition({ status: 'active' })
      );

      await expect(
        CertificateDefinitionService.updateDefinition(mockId, { title: 'New Title' }, mockUserId)
      ).rejects.toThrow(/Only draft definitions can be updated/);
    });

    it('should update allowed fields on a draft definition', async () => {
      const mockDef = createMockDefinition();
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(mockDef);

      const result = await CertificateDefinitionService.updateDefinition(
        mockId,
        { title: 'Updated Title', description: 'Updated Desc', autoIssue: true },
        mockUserId
      );

      expect(mockDef.title).toBe('Updated Title');
      expect(mockDef.description).toBe('Updated Desc');
      expect(mockDef.autoIssue).toBe(true);
      expect(mockDef.save).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
    });

    it('should only update provided fields', async () => {
      const mockDef = createMockDefinition({ title: 'Original' });
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(mockDef);

      await CertificateDefinitionService.updateDefinition(
        mockId,
        { description: 'New Desc' },
        mockUserId
      );

      expect(mockDef.title).toBe('Original');
      expect(mockDef.description).toBe('New Desc');
    });
  });

  // =========================================================================
  // activateDefinition
  // =========================================================================
  describe('activateDefinition', () => {
    it('should throw on invalid definition ID', async () => {
      await expect(
        CertificateDefinitionService.activateDefinition('invalid', mockUserId)
      ).rejects.toThrow(/Invalid definition ID/);
    });

    it('should throw if definition not found', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateDefinitionService.activateDefinition(mockId, mockUserId)
      ).rejects.toThrow(/Certificate definition not found/);
    });

    it('should throw if definition is not draft', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(
        createMockDefinition({ status: 'active' })
      );

      await expect(
        CertificateDefinitionService.activateDefinition(mockId, mockUserId)
      ).rejects.toThrow(/Only draft definitions can be activated/);
    });

    it('should throw if definition has no requirements', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(createMockDefinition());
      (CertificateRequirement.countDocuments as jest.Mock).mockResolvedValue(0);

      await expect(
        CertificateDefinitionService.activateDefinition(mockId, mockUserId)
      ).rejects.toThrow(/no requirements/);
    });

    it('should activate definition and deprecate existing active', async () => {
      const { eventBus } = require('@/events/eventBus');
      const mockDef = createMockDefinition();
      const existingActive = createMockDefinition({
        _id: new mongoose.Types.ObjectId(),
        status: 'active'
      });

      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(mockDef);
      (CertificateRequirement.countDocuments as jest.Mock).mockResolvedValue(2);
      (CertificateDefinition.findOne as jest.Mock).mockResolvedValue(existingActive);

      const result = await CertificateDefinitionService.activateDefinition(mockId, mockUserId);

      expect(existingActive.status).toBe('deprecated');
      expect(existingActive.deprecatedReason).toBe('Superseded by newer version');
      expect(existingActive.save).toHaveBeenCalled();
      expect(mockDef.status).toBe('active');
      expect(mockDef.save).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        'certificate.definition.activated',
        expect.objectContaining({ activatedBy: mockUserId })
      );
      expect(result.status).toBe('active');
    });

    it('should activate definition without existing active', async () => {
      const { eventBus } = require('@/events/eventBus');
      const mockDef = createMockDefinition();
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(mockDef);
      (CertificateRequirement.countDocuments as jest.Mock).mockResolvedValue(1);
      (CertificateDefinition.findOne as jest.Mock).mockResolvedValue(null);

      await CertificateDefinitionService.activateDefinition(mockId, mockUserId);

      expect(mockDef.status).toBe('active');
      expect(mockDef.save).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // deprecateDefinition
  // =========================================================================
  describe('deprecateDefinition', () => {
    it('should throw on invalid definition ID', async () => {
      await expect(
        CertificateDefinitionService.deprecateDefinition('invalid', 'reason', mockUserId)
      ).rejects.toThrow(/Invalid definition ID/);
    });

    it('should throw if definition not found', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateDefinitionService.deprecateDefinition(mockId, 'reason', mockUserId)
      ).rejects.toThrow(/Certificate definition not found/);
    });

    it('should throw if already deprecated', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(
        createMockDefinition({ status: 'deprecated' })
      );

      await expect(
        CertificateDefinitionService.deprecateDefinition(mockId, 'reason', mockUserId)
      ).rejects.toThrow(/already deprecated/);
    });

    it('should deprecate definition and emit event', async () => {
      const { eventBus } = require('@/events/eventBus');
      const mockDef = createMockDefinition({ status: 'active' });
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(mockDef);

      const result = await CertificateDefinitionService.deprecateDefinition(mockId, 'Outdated', mockUserId);

      expect(mockDef.status).toBe('deprecated');
      expect(mockDef.deprecatedReason).toBe('Outdated');
      expect(mockDef.deprecatedAt).toBeDefined();
      expect(mockDef.save).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        'certificate.definition.deprecated',
        expect.objectContaining({ reason: 'Outdated', deprecatedBy: mockUserId })
      );
      expect(result.status).toBe('deprecated');
      expect(result.deprecatedReason).toBe('Outdated');
    });
  });

  // =========================================================================
  // listRequirements
  // =========================================================================
  describe('listRequirements', () => {
    it('should throw on invalid definition ID', async () => {
      await expect(
        CertificateDefinitionService.listRequirements('invalid', mockUserId)
      ).rejects.toThrow(/Invalid definition ID/);
    });

    it('should throw if definition not found', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateDefinitionService.listRequirements(mockId, mockUserId)
      ).rejects.toThrow(/Certificate definition not found/);
    });

    it('should return enriched requirements list', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(createMockDefinition());

      const reqId = new mongoose.Types.ObjectId();
      const cvId = new mongoose.Types.ObjectId();
      const mockReqs = [{
        _id: reqId,
        courseVersionId: { _id: cvId, title: 'Course A', version: 2, canonicalCourseId: new mongoose.Types.ObjectId(), status: 'published' },
        isRequired: true,
        minimumScore: null,
        order: 0,
        electiveGroupId: null,
        electiveGroupName: null,
        electiveMinCount: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const mockLean = jest.fn().mockResolvedValue(mockReqs);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
      (CertificateRequirement.find as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateDefinitionService.listRequirements(mockId, mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(reqId.toString());
      expect(result[0].courseVersion?.title).toBe('Course A');
      expect(result[0].courseVersion?.status).toBe('published');
    });
  });

  // =========================================================================
  // addRequirement
  // =========================================================================
  describe('addRequirement', () => {
    it('should throw on invalid definition ID', async () => {
      await expect(
        CertificateDefinitionService.addRequirement('invalid', { courseVersionId: mockCourseVersionId }, mockUserId)
      ).rejects.toThrow(/Invalid definition ID/);
    });

    it('should throw if definition not found', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateDefinitionService.addRequirement(mockId, { courseVersionId: mockCourseVersionId }, mockUserId)
      ).rejects.toThrow(/Certificate definition not found/);
    });

    it('should throw if definition is not draft', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(
        createMockDefinition({ status: 'active' })
      );

      await expect(
        CertificateDefinitionService.addRequirement(mockId, { courseVersionId: mockCourseVersionId }, mockUserId)
      ).rejects.toThrow(/non-draft definitions/);
    });

    it('should throw on invalid course version ID', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(createMockDefinition());

      await expect(
        CertificateDefinitionService.addRequirement(mockId, { courseVersionId: 'bad' }, mockUserId)
      ).rejects.toThrow(/Invalid course version ID/);
    });

    it('should throw if course version not found', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(createMockDefinition());
      (CourseVersion.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateDefinitionService.addRequirement(mockId, { courseVersionId: mockCourseVersionId }, mockUserId)
      ).rejects.toThrow(/Course version not found/);
    });

    it('should throw on duplicate course version requirement', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(createMockDefinition());
      (CourseVersion.findById as jest.Mock).mockResolvedValue({ _id: mockCourseVersionId });
      (CertificateRequirement.findOne as jest.Mock).mockResolvedValue({ _id: 'existing' });

      await expect(
        CertificateDefinitionService.addRequirement(mockId, { courseVersionId: mockCourseVersionId }, mockUserId)
      ).rejects.toThrow(/already a requirement/);
    });

    it('should auto-calculate order when not provided', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(createMockDefinition());
      (CourseVersion.findById as jest.Mock).mockResolvedValue({ _id: mockCourseVersionId });
      (CertificateRequirement.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // duplicate check
        .mockReturnValueOnce({ // last req for order
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({ order: 5 })
          })
        });

      const mockSave = jest.fn().mockResolvedValue(true);
      (CertificateRequirement as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        save: mockSave
      }));

      const result = await CertificateDefinitionService.addRequirement(
        mockId,
        { courseVersionId: mockCourseVersionId },
        mockUserId
      );

      expect(result.order).toBe(6);
      expect(result.isRequired).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should use provided order', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(createMockDefinition());
      (CourseVersion.findById as jest.Mock).mockResolvedValue({ _id: mockCourseVersionId });
      (CertificateRequirement.findOne as jest.Mock).mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      (CertificateRequirement as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        save: mockSave
      }));

      const result = await CertificateDefinitionService.addRequirement(
        mockId,
        { courseVersionId: mockCourseVersionId, order: 10 },
        mockUserId
      );

      expect(result.order).toBe(10);
    });
  });

  // =========================================================================
  // removeRequirement
  // =========================================================================
  describe('removeRequirement', () => {
    it('should throw on invalid definition ID', async () => {
      await expect(
        CertificateDefinitionService.removeRequirement('invalid', mockRequirementId, mockUserId)
      ).rejects.toThrow(/Invalid definition ID/);
    });

    it('should throw on invalid requirement ID', async () => {
      await expect(
        CertificateDefinitionService.removeRequirement(mockId, 'invalid', mockUserId)
      ).rejects.toThrow(/Invalid requirement ID/);
    });

    it('should throw if definition not found', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateDefinitionService.removeRequirement(mockId, mockRequirementId, mockUserId)
      ).rejects.toThrow(/Certificate definition not found/);
    });

    it('should throw if definition is not draft', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(
        createMockDefinition({ status: 'active' })
      );

      await expect(
        CertificateDefinitionService.removeRequirement(mockId, mockRequirementId, mockUserId)
      ).rejects.toThrow(/non-draft definitions/);
    });

    it('should throw if requirement not found', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(createMockDefinition());
      (CertificateRequirement.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateDefinitionService.removeRequirement(mockId, mockRequirementId, mockUserId)
      ).rejects.toThrow(/Requirement not found/);
    });

    it('should delete the requirement', async () => {
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue(createMockDefinition());
      const mockDeleteOne = jest.fn().mockResolvedValue(true);
      (CertificateRequirement.findOne as jest.Mock).mockResolvedValue({
        _id: mockRequirementId,
        deleteOne: mockDeleteOne
      });

      await CertificateDefinitionService.removeRequirement(mockId, mockRequirementId, mockUserId);

      expect(mockDeleteOne).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // handleCourseVersionPublished
  // =========================================================================
  describe('handleCourseVersionPublished', () => {
    it('should return early if no previousVersionId', async () => {
      await CertificateDefinitionService.handleCourseVersionPublished({
        courseVersionId: mockCourseVersionId,
        canonicalCourseId: new mongoose.Types.ObjectId().toString(),
        previousVersionId: null,
        publishedBy: mockUserId
      });

      expect(CertificateRequirement.find).not.toHaveBeenCalled();
    });

    it('should return early if no affected requirements', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      (CertificateRequirement.find as jest.Mock).mockReturnValue({ lean: mockLean });

      await CertificateDefinitionService.handleCourseVersionPublished({
        courseVersionId: mockCourseVersionId,
        canonicalCourseId: new mongoose.Types.ObjectId().toString(),
        previousVersionId: new mongoose.Types.ObjectId().toString(),
        publishedBy: mockUserId
      });

      expect(CertificateDefinition.findOne).not.toHaveBeenCalled();
    });

    it('should update existing draft requirements instead of creating new definition', async () => {
      const prevVersionId = new mongoose.Types.ObjectId().toString();
      const activeDefId = new mongoose.Types.ObjectId();
      const draftDefId = new mongoose.Types.ObjectId();
      const credGroupId = new mongoose.Types.ObjectId();

      const mockReqLean = jest.fn().mockResolvedValue([
        { certificateDefinitionId: activeDefId, courseVersionId: prevVersionId }
      ]);
      (CertificateRequirement.find as jest.Mock).mockReturnValueOnce({ lean: mockReqLean });

      (CertificateDefinition.findOne as jest.Mock)
        .mockResolvedValueOnce({ // active definition found
          _id: activeDefId,
          credentialGroupId: credGroupId,
          version: 1,
          title: 'Test',
          description: 'Desc',
          expiresAfterMonths: null,
          autoIssue: false
        })
        .mockResolvedValueOnce({ // existing draft found
          _id: draftDefId,
          credentialGroupId: credGroupId,
          status: 'draft'
        });

      (CertificateRequirement.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      await CertificateDefinitionService.handleCourseVersionPublished({
        courseVersionId: mockCourseVersionId,
        canonicalCourseId: new mongoose.Types.ObjectId().toString(),
        previousVersionId: prevVersionId,
        publishedBy: mockUserId
      });

      expect(CertificateRequirement.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          certificateDefinitionId: draftDefId,
          courseVersionId: prevVersionId
        }),
        expect.objectContaining({
          $set: { courseVersionId: mockCourseVersionId }
        })
      );
    });

    it('should create new draft definition when no existing draft', async () => {
      const prevVersionId = new mongoose.Types.ObjectId().toString();
      const activeDefId = new mongoose.Types.ObjectId();
      const credGroupId = new mongoose.Types.ObjectId();

      const mockReqLean = jest.fn().mockResolvedValue([
        { certificateDefinitionId: activeDefId, courseVersionId: new mongoose.Types.ObjectId(prevVersionId) }
      ]);
      (CertificateRequirement.find as jest.Mock)
        .mockReturnValueOnce({ lean: mockReqLean }) // affected requirements
        .mockReturnValueOnce({ // old requirements for copying
          lean: jest.fn().mockResolvedValue([
            {
              courseVersionId: new mongoose.Types.ObjectId(prevVersionId),
              isRequired: true,
              minimumScore: 80,
              order: 0,
              electiveGroupId: null,
              electiveGroupName: null,
              electiveMinCount: null
            }
          ])
        });

      (CertificateDefinition.findOne as jest.Mock)
        .mockResolvedValueOnce({ // active definition
          _id: activeDefId,
          credentialGroupId: credGroupId,
          version: 1,
          title: 'Test',
          description: 'Desc',
          expiresAfterMonths: 12,
          autoIssue: true
        })
        .mockResolvedValueOnce(null); // no existing draft

      const mockDefSave = jest.fn().mockResolvedValue(true);
      const mockReqSave = jest.fn().mockResolvedValue(true);

      let defCallCount = 0;
      (CertificateDefinition as unknown as jest.Mock).mockImplementation((data: any) => {
        defCallCount++;
        return {
          ...data,
          _id: new mongoose.Types.ObjectId(),
          save: mockDefSave
        };
      });

      (CertificateRequirement as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockReqSave
      }));

      await CertificateDefinitionService.handleCourseVersionPublished({
        courseVersionId: mockCourseVersionId,
        canonicalCourseId: new mongoose.Types.ObjectId().toString(),
        previousVersionId: prevVersionId,
        publishedBy: mockUserId
      });

      expect(mockDefSave).toHaveBeenCalled();
      expect(mockReqSave).toHaveBeenCalled();
    });

    it('should skip non-active definitions', async () => {
      const prevVersionId = new mongoose.Types.ObjectId().toString();
      const defId = new mongoose.Types.ObjectId();

      const mockReqLean = jest.fn().mockResolvedValue([
        { certificateDefinitionId: defId, courseVersionId: prevVersionId }
      ]);
      (CertificateRequirement.find as jest.Mock).mockReturnValueOnce({ lean: mockReqLean });

      (CertificateDefinition.findOne as jest.Mock).mockResolvedValueOnce(null); // not active

      await CertificateDefinitionService.handleCourseVersionPublished({
        courseVersionId: mockCourseVersionId,
        canonicalCourseId: new mongoose.Types.ObjectId().toString(),
        previousVersionId: prevVersionId,
        publishedBy: mockUserId
      });

      // Should not have tried to create a new definition
      expect(CertificateDefinition as unknown as jest.Mock).not.toHaveBeenCalled();
    });
  });
});
