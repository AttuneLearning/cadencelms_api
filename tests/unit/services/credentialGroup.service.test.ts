import mongoose from 'mongoose';
import { CredentialGroupService } from '@/services/certificate/credentialGroup.service';
import CredentialGroup from '@/models/certificate/CredentialGroup.model';
import CertificateDefinition from '@/models/certificate/CertificateDefinition.model';
import Department from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/certificate/CredentialGroup.model');
jest.mock('@/models/certificate/CertificateDefinition.model');
jest.mock('@/models/organization/Department.model');
jest.mock('@/models/academic/Program.model');

describe('CredentialGroupService', () => {
  const mockId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockDeptId = new mongoose.Types.ObjectId().toString();
  const mockProgramId = new mongoose.Types.ObjectId().toString();

  const createMockGroup = (overrides: any = {}) => ({
    _id: new mongoose.Types.ObjectId(mockId),
    name: 'AWS Solutions Architect',
    code: 'AWS-SA',
    description: 'AWS SA Certification',
    type: 'certificate',
    badgeImageUrl: null,
    badgeColor: '#FF9900',
    departmentId: new mongoose.Types.ObjectId(mockDeptId),
    programId: null,
    isActive: true,
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
  // listCredentialGroups
  // =========================================================================
  describe('listCredentialGroups', () => {
    it('should throw on invalid department ID filter', async () => {
      await expect(
        CredentialGroupService.listCredentialGroups({ departmentId: 'invalid' }, mockUserId)
      ).rejects.toThrow(/Invalid department ID/);
    });

    it('should return paginated credential groups with enrichment', async () => {
      const groupId = new mongoose.Types.ObjectId();
      const deptId = new mongoose.Types.ObjectId();
      const mockGroups = [{
        _id: groupId,
        name: 'AWS SA',
        code: 'AWS-SA',
        description: 'AWS cert',
        type: 'certificate',
        badgeImageUrl: null,
        badgeColor: '#FF9900',
        departmentId: { _id: deptId, name: 'Engineering' },
        programId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const mockLean = jest.fn().mockResolvedValue(mockGroups);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CredentialGroup.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CredentialGroup.countDocuments as jest.Mock).mockResolvedValue(1);

      // Definition counts: totalDefinitions, activeDefinitions
      (CertificateDefinition.countDocuments as jest.Mock)
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(2); // active

      const result = await CredentialGroupService.listCredentialGroups({}, mockUserId);

      expect(result.credentialGroups).toHaveLength(1);
      expect(result.credentialGroups[0].id).toBe(groupId.toString());
      expect(result.credentialGroups[0].department?.name).toBe('Engineering');
      expect(result.credentialGroups[0].totalDefinitions).toBe(5);
      expect(result.credentialGroups[0].activeDefinitions).toBe(2);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply type filter', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CredentialGroup.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CredentialGroup.countDocuments as jest.Mock).mockResolvedValue(0);

      await CredentialGroupService.listCredentialGroups({ type: 'diploma' as any }, mockUserId);

      expect(CredentialGroup.find).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'diploma' })
      );
    });

    it('should apply isActive filter', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CredentialGroup.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CredentialGroup.countDocuments as jest.Mock).mockResolvedValue(0);

      await CredentialGroupService.listCredentialGroups({ isActive: true }, mockUserId);

      expect(CredentialGroup.find).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      );
    });

    it('should apply search filter with $or clause', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CredentialGroup.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CredentialGroup.countDocuments as jest.Mock).mockResolvedValue(0);

      await CredentialGroupService.listCredentialGroups({ search: 'AWS' }, mockUserId);

      const query = (CredentialGroup.find as jest.Mock).mock.calls[0][0];
      expect(query.$or).toBeDefined();
      expect(query.$or).toHaveLength(2);
      expect(query.$or[0].name.$regex).toBe('AWS');
    });

    it('should calculate pagination correctly', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CredentialGroup.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CredentialGroup.countDocuments as jest.Mock).mockResolvedValue(25);

      const result = await CredentialGroupService.listCredentialGroups(
        { page: 3, limit: 5 },
        mockUserId
      );

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });
  });

  // =========================================================================
  // createCredentialGroup
  // =========================================================================
  describe('createCredentialGroup', () => {
    it('should throw on invalid department ID', async () => {
      await expect(
        CredentialGroupService.createCredentialGroup(
          { name: 'Test', code: 'T', description: 'D', type: 'certificate' as any, departmentId: 'invalid' },
          mockUserId
        )
      ).rejects.toThrow(/Invalid department ID/);
    });

    it('should throw if department not found', async () => {
      (Department.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CredentialGroupService.createCredentialGroup(
          { name: 'Test', code: 'T', description: 'D', type: 'certificate' as any, departmentId: mockDeptId },
          mockUserId
        )
      ).rejects.toThrow(/Department not found/);
    });

    it('should throw on invalid program ID', async () => {
      (Department.findById as jest.Mock).mockResolvedValue({ _id: mockDeptId });

      await expect(
        CredentialGroupService.createCredentialGroup(
          { name: 'Test', code: 'T', description: 'D', type: 'certificate' as any, departmentId: mockDeptId, programId: 'invalid' },
          mockUserId
        )
      ).rejects.toThrow(/Invalid program ID/);
    });

    it('should throw if program not found', async () => {
      (Department.findById as jest.Mock).mockResolvedValue({ _id: mockDeptId });
      (Program.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CredentialGroupService.createCredentialGroup(
          { name: 'Test', code: 'T', description: 'D', type: 'certificate' as any, departmentId: mockDeptId, programId: mockProgramId },
          mockUserId
        )
      ).rejects.toThrow(/Program not found/);
    });

    it('should throw if program belongs to different department', async () => {
      const otherDeptId = new mongoose.Types.ObjectId();
      (Department.findById as jest.Mock).mockResolvedValue({ _id: mockDeptId });
      (Program.findById as jest.Mock).mockResolvedValue({
        _id: mockProgramId,
        departmentId: otherDeptId
      });

      await expect(
        CredentialGroupService.createCredentialGroup(
          { name: 'Test', code: 'T', description: 'D', type: 'certificate' as any, departmentId: mockDeptId, programId: mockProgramId },
          mockUserId
        )
      ).rejects.toThrow(/same department/);
    });

    it('should throw if code already exists in department', async () => {
      (Department.findById as jest.Mock).mockResolvedValue({ _id: mockDeptId });
      (CredentialGroup.findOne as jest.Mock).mockResolvedValue({ _id: 'existing' });

      await expect(
        CredentialGroupService.createCredentialGroup(
          { name: 'Test', code: 'aws-sa', description: 'D', type: 'certificate' as any, departmentId: mockDeptId },
          mockUserId
        )
      ).rejects.toThrow(/already exists/);
    });

    it('should create credential group with uppercase code', async () => {
      (Department.findById as jest.Mock).mockResolvedValue({ _id: mockDeptId });
      (CredentialGroup.findOne as jest.Mock).mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      (CredentialGroup as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockSave
      }));

      const result = await CredentialGroupService.createCredentialGroup(
        { name: 'AWS Solutions Architect', code: 'aws-sa', description: 'AWS cert', type: 'certificate' as any, departmentId: mockDeptId },
        mockUserId
      );

      expect(mockSave).toHaveBeenCalled();
      expect(result.code).toBe('AWS-SA');
      expect(result.name).toBe('AWS Solutions Architect');
      expect(result.isActive).toBe(true);
      expect(result.departmentId).toBe(mockDeptId);
    });

    it('should create credential group with program', async () => {
      (Department.findById as jest.Mock).mockResolvedValue({ _id: mockDeptId });
      (Program.findById as jest.Mock).mockResolvedValue({
        _id: mockProgramId,
        departmentId: new mongoose.Types.ObjectId(mockDeptId)
      });
      (CredentialGroup.findOne as jest.Mock).mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      (CredentialGroup as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockSave
      }));

      const result = await CredentialGroupService.createCredentialGroup(
        { name: 'Test', code: 'TST', description: 'D', type: 'certificate' as any, departmentId: mockDeptId, programId: mockProgramId },
        mockUserId
      );

      expect(result.programId).toBe(mockProgramId);
    });
  });

  // =========================================================================
  // getCredentialGroupById
  // =========================================================================
  describe('getCredentialGroupById', () => {
    it('should throw on invalid credential group ID', async () => {
      await expect(
        CredentialGroupService.getCredentialGroupById('invalid', mockUserId)
      ).rejects.toThrow(/Invalid credential group ID/);
    });

    it('should throw if credential group not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate3 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CredentialGroup.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        CredentialGroupService.getCredentialGroupById(mockId, mockUserId)
      ).rejects.toThrow(/Credential group not found/);
    });

    it('should return enriched credential group with statistics', async () => {
      const groupId = new mongoose.Types.ObjectId();
      const deptId = new mongoose.Types.ObjectId();
      const createdById = new mongoose.Types.ObjectId();

      const mockGroup = {
        _id: groupId,
        name: 'AWS SA',
        code: 'AWS-SA',
        description: 'AWS cert',
        type: 'certificate',
        badgeImageUrl: 'https://img.png',
        badgeColor: '#FF9900',
        departmentId: { _id: deptId, name: 'Engineering' },
        programId: null,
        isActive: true,
        createdBy: { _id: createdById, email: 'admin@test.com' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockLean = jest.fn().mockResolvedValue(mockGroup);
      const mockPopulate3 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CredentialGroup.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      // Statistics: total, active, draft, deprecated
      (CertificateDefinition.countDocuments as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // active
        .mockResolvedValueOnce(2)  // draft
        .mockResolvedValueOnce(5); // deprecated

      const result = await CredentialGroupService.getCredentialGroupById(groupId.toString(), mockUserId);

      expect(result.id).toBe(groupId.toString());
      expect(result.name).toBe('AWS SA');
      expect(result.department?.name).toBe('Engineering');
      expect(result.statistics.totalDefinitions).toBe(10);
      expect(result.statistics.activeDefinitions).toBe(3);
      expect(result.statistics.draftDefinitions).toBe(2);
      expect(result.statistics.deprecatedDefinitions).toBe(5);
      expect(result.createdBy?.email).toBe('admin@test.com');
    });
  });

  // =========================================================================
  // updateCredentialGroup
  // =========================================================================
  describe('updateCredentialGroup', () => {
    it('should throw on invalid credential group ID', async () => {
      await expect(
        CredentialGroupService.updateCredentialGroup('invalid', {}, mockUserId)
      ).rejects.toThrow(/Invalid credential group ID/);
    });

    it('should throw if credential group not found', async () => {
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CredentialGroupService.updateCredentialGroup(mockId, {}, mockUserId)
      ).rejects.toThrow(/Credential group not found/);
    });

    it('should throw if new code already exists in department', async () => {
      const mockGroup = createMockGroup();
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(mockGroup);
      (CredentialGroup.findOne as jest.Mock).mockResolvedValue({ _id: 'other-group' });

      await expect(
        CredentialGroupService.updateCredentialGroup(mockId, { code: 'NEW-CODE' }, mockUserId)
      ).rejects.toThrow(/already exists/);
    });

    it('should not check uniqueness if code unchanged', async () => {
      const mockGroup = createMockGroup({ code: 'AWS-SA' });
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(mockGroup);

      await CredentialGroupService.updateCredentialGroup(mockId, { code: 'AWS-SA' }, mockUserId);

      expect(CredentialGroup.findOne).not.toHaveBeenCalled();
      expect(mockGroup.save).toHaveBeenCalled();
    });

    it('should throw on invalid program ID', async () => {
      const mockGroup = createMockGroup();
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(mockGroup);

      await expect(
        CredentialGroupService.updateCredentialGroup(mockId, { programId: 'invalid' }, mockUserId)
      ).rejects.toThrow(/Invalid program ID/);
    });

    it('should throw if new program not found', async () => {
      const mockGroup = createMockGroup();
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(mockGroup);
      (Program.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CredentialGroupService.updateCredentialGroup(mockId, { programId: mockProgramId }, mockUserId)
      ).rejects.toThrow(/Program not found/);
    });

    it('should throw if new program belongs to different department', async () => {
      const mockGroup = createMockGroup();
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(mockGroup);
      (Program.findById as jest.Mock).mockResolvedValue({
        _id: mockProgramId,
        departmentId: new mongoose.Types.ObjectId() // different dept
      });

      await expect(
        CredentialGroupService.updateCredentialGroup(mockId, { programId: mockProgramId }, mockUserId)
      ).rejects.toThrow(/same department/);
    });

    it('should update allowed fields', async () => {
      const mockGroup = createMockGroup();
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(mockGroup);

      const result = await CredentialGroupService.updateCredentialGroup(
        mockId,
        { name: 'Updated Name', description: 'Updated Desc', badgeColor: '#00FF00' },
        mockUserId
      );

      expect(mockGroup.name).toBe('Updated Name');
      expect(mockGroup.description).toBe('Updated Desc');
      expect(mockGroup.badgeColor).toBe('#00FF00');
      expect(mockGroup.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });

    it('should uppercase code on update', async () => {
      const mockGroup = createMockGroup({ code: 'OLD-CODE' });
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(mockGroup);
      (CredentialGroup.findOne as jest.Mock).mockResolvedValue(null);

      await CredentialGroupService.updateCredentialGroup(
        mockId,
        { code: 'new-code' },
        mockUserId
      );

      expect(mockGroup.code).toBe('NEW-CODE');
    });

    it('should allow setting programId to null', async () => {
      const mockGroup = createMockGroup({ programId: new mongoose.Types.ObjectId() });
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(mockGroup);

      await CredentialGroupService.updateCredentialGroup(
        mockId,
        { programId: null },
        mockUserId
      );

      expect(mockGroup.programId).toBeNull();
      expect(mockGroup.save).toHaveBeenCalled();
    });

    it('should update isActive field', async () => {
      const mockGroup = createMockGroup({ isActive: true });
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(mockGroup);

      await CredentialGroupService.updateCredentialGroup(
        mockId,
        { isActive: false },
        mockUserId
      );

      expect(mockGroup.isActive).toBe(false);
    });
  });

  // =========================================================================
  // deleteCredentialGroup
  // =========================================================================
  describe('deleteCredentialGroup', () => {
    it('should throw on invalid credential group ID', async () => {
      await expect(
        CredentialGroupService.deleteCredentialGroup('invalid', mockUserId)
      ).rejects.toThrow(/Invalid credential group ID/);
    });

    it('should throw if credential group not found', async () => {
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CredentialGroupService.deleteCredentialGroup(mockId, mockUserId)
      ).rejects.toThrow(/Credential group not found/);
    });

    it('should throw if group has active definitions', async () => {
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(createMockGroup());
      (CertificateDefinition.countDocuments as jest.Mock).mockResolvedValue(2);

      await expect(
        CredentialGroupService.deleteCredentialGroup(mockId, mockUserId)
      ).rejects.toThrow(/active definitions/);
    });

    it('should soft delete by setting isActive to false', async () => {
      const mockGroup = createMockGroup();
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(mockGroup);
      (CertificateDefinition.countDocuments as jest.Mock).mockResolvedValue(0);

      await CredentialGroupService.deleteCredentialGroup(mockId, mockUserId);

      expect(mockGroup.isActive).toBe(false);
      expect(mockGroup.save).toHaveBeenCalled();
    });

    it('should allow deletion when all definitions are deprecated/draft', async () => {
      const mockGroup = createMockGroup();
      (CredentialGroup.findById as jest.Mock).mockResolvedValue(mockGroup);
      (CertificateDefinition.countDocuments as jest.Mock).mockResolvedValue(0);

      await expect(
        CredentialGroupService.deleteCredentialGroup(mockId, mockUserId)
      ).resolves.toBeUndefined();
    });
  });
});
