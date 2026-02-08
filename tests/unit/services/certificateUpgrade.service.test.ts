import mongoose from 'mongoose';
import { CertificateUpgradeService } from '@/services/certificate/certificateUpgrade.service';
import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import CertificateDefinition from '@/models/certificate/CertificateDefinition.model';
import CertificateRequirement from '@/models/certificate/CertificateRequirement.model';
import { CertificateIssuanceService } from '@/services/certificate/certificateIssuance.service';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/certificate/CertificateIssuance.model');
jest.mock('@/models/certificate/CertificateDefinition.model');
jest.mock('@/models/certificate/CertificateRequirement.model');
jest.mock('@/services/certificate/certificateIssuance.service');
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

describe('CertificateUpgradeService', () => {
  const mockLearnerId = new mongoose.Types.ObjectId().toString();
  const mockCredGroupId = new mongoose.Types.ObjectId().toString();
  const mockIssuanceId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // checkUpgradeEligibility
  // =========================================================================
  describe('checkUpgradeEligibility', () => {
    it('should throw on invalid learner ID', async () => {
      await expect(
        CertificateUpgradeService.checkUpgradeEligibility('invalid', mockCredGroupId)
      ).rejects.toThrow(/Invalid learner ID/);
    });

    it('should throw on invalid credential group ID', async () => {
      await expect(
        CertificateUpgradeService.checkUpgradeEligibility(mockLearnerId, 'invalid')
      ).rejects.toThrow(/Invalid credential group ID/);
    });

    it('should return no_active_certificate when no current issuance', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateUpgradeService.checkUpgradeEligibility(mockLearnerId, mockCredGroupId);

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('no_active_certificate');
      expect(result.currentIssuance).toBeNull();
      expect(result.targetDefinition).toBeNull();
    });

    it('should return no_newer_version when no active definition exists', async () => {
      const issuanceId = new mongoose.Types.ObjectId();
      const defId = new mongoose.Types.ObjectId();

      const mockIssuanceLean = jest.fn().mockResolvedValue({
        _id: issuanceId,
        verificationCode: 'ABCDEFGHJKLM',
        certificateDefinitionId: { _id: defId, version: 1, title: 'Cert v1' },
        issuedAt: new Date(),
        completedRequirements: []
      });
      const mockIssuancePopulate = jest.fn().mockReturnValue({ lean: mockIssuanceLean });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockIssuancePopulate });

      const mockDefLean = jest.fn().mockResolvedValue(null);
      const mockDefSort = jest.fn().mockReturnValue({ lean: mockDefLean });
      (CertificateDefinition.findOne as jest.Mock).mockReturnValue({ sort: mockDefSort });

      const result = await CertificateUpgradeService.checkUpgradeEligibility(mockLearnerId, mockCredGroupId);

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('no_newer_version');
      expect(result.currentIssuance).not.toBeNull();
      expect(result.targetDefinition).toBeNull();
    });

    it('should return already_latest when current definition matches latest', async () => {
      const defId = new mongoose.Types.ObjectId();
      const issuanceId = new mongoose.Types.ObjectId();

      const mockIssuanceLean = jest.fn().mockResolvedValue({
        _id: issuanceId,
        verificationCode: 'ABCDEFGHJKLM',
        certificateDefinitionId: { _id: defId, version: 2, title: 'Cert v2' },
        issuedAt: new Date(),
        completedRequirements: []
      });
      const mockIssuancePopulate = jest.fn().mockReturnValue({ lean: mockIssuanceLean });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockIssuancePopulate });

      const mockDefLean = jest.fn().mockResolvedValue({
        _id: defId,
        version: 2,
        title: 'Cert v2',
        isCompatible: true,
        compatibilityBreakReason: null
      });
      const mockDefSort = jest.fn().mockReturnValue({ lean: mockDefLean });
      (CertificateDefinition.findOne as jest.Mock).mockReturnValue({ sort: mockDefSort });

      const result = await CertificateUpgradeService.checkUpgradeEligibility(mockLearnerId, mockCredGroupId);

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('already_latest');
      expect(result.currentIssuance?.definitionVersion).toBe(2);
    });

    it('should return incompatible_version when latest is not compatible', async () => {
      const currentDefId = new mongoose.Types.ObjectId();
      const latestDefId = new mongoose.Types.ObjectId();
      const issuanceId = new mongoose.Types.ObjectId();

      const mockIssuanceLean = jest.fn().mockResolvedValue({
        _id: issuanceId,
        verificationCode: 'ABCDEFGHJKLM',
        certificateDefinitionId: { _id: currentDefId, version: 1, title: 'Cert v1' },
        issuedAt: new Date(),
        completedRequirements: []
      });
      const mockIssuancePopulate = jest.fn().mockReturnValue({ lean: mockIssuanceLean });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockIssuancePopulate });

      const mockDefLean = jest.fn().mockResolvedValue({
        _id: latestDefId,
        version: 3,
        title: 'Cert v3',
        isCompatible: false,
        compatibilityBreakReason: 'Major curriculum overhaul'
      });
      const mockDefSort = jest.fn().mockReturnValue({ lean: mockDefLean });
      (CertificateDefinition.findOne as jest.Mock).mockReturnValue({ sort: mockDefSort });

      const result = await CertificateUpgradeService.checkUpgradeEligibility(mockLearnerId, mockCredGroupId);

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('incompatible_version');
      expect(result.targetDefinition?.isCompatible).toBe(false);
      expect(result.targetDefinition?.compatibilityBreakReason).toBe('Major curriculum overhaul');
    });

    it('should return eligible when upgrade is available and compatible', async () => {
      const currentDefId = new mongoose.Types.ObjectId();
      const latestDefId = new mongoose.Types.ObjectId();
      const issuanceId = new mongoose.Types.ObjectId();
      const cvId = new mongoose.Types.ObjectId();

      const mockIssuanceLean = jest.fn().mockResolvedValue({
        _id: issuanceId,
        verificationCode: 'ABCDEFGHJKLM',
        certificateDefinitionId: { _id: currentDefId, version: 1, title: 'Cert v1' },
        issuedAt: new Date(),
        completedRequirements: [
          { courseVersionId: new mongoose.Types.ObjectId() }
        ]
      });
      const mockIssuancePopulate = jest.fn().mockReturnValue({ lean: mockIssuanceLean });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockIssuancePopulate });

      const mockDefLean = jest.fn().mockResolvedValue({
        _id: latestDefId,
        version: 2,
        title: 'Cert v2',
        isCompatible: true,
        compatibilityBreakReason: null
      });
      const mockDefSort = jest.fn().mockReturnValue({ lean: mockDefLean });
      (CertificateDefinition.findOne as jest.Mock).mockReturnValue({ sort: mockDefSort });

      const mockReqLean = jest.fn().mockResolvedValue([{
        courseVersionId: { _id: cvId, title: 'New Course' },
        isRequired: true
      }]);
      const mockReqPopulate = jest.fn().mockReturnValue({ lean: mockReqLean });
      (CertificateRequirement.find as jest.Mock).mockReturnValue({ populate: mockReqPopulate });

      const result = await CertificateUpgradeService.checkUpgradeEligibility(mockLearnerId, mockCredGroupId);

      expect(result.isEligible).toBe(true);
      expect(result.reason).toBe('eligible');
      expect(result.targetDefinition?.version).toBe(2);
      expect(result.additionalRequirements).toBeDefined();
    });

    it('should return eligible without additional requirements when all are completed', async () => {
      const currentDefId = new mongoose.Types.ObjectId();
      const latestDefId = new mongoose.Types.ObjectId();
      const issuanceId = new mongoose.Types.ObjectId();
      const completedCvId = new mongoose.Types.ObjectId();

      const mockIssuanceLean = jest.fn().mockResolvedValue({
        _id: issuanceId,
        verificationCode: 'ABCDEFGHJKLM',
        certificateDefinitionId: { _id: currentDefId, version: 1, title: 'Cert v1' },
        issuedAt: new Date(),
        completedRequirements: [
          { courseVersionId: completedCvId }
        ]
      });
      const mockIssuancePopulate = jest.fn().mockReturnValue({ lean: mockIssuanceLean });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockIssuancePopulate });

      const mockDefLean = jest.fn().mockResolvedValue({
        _id: latestDefId,
        version: 2,
        title: 'Cert v2',
        isCompatible: true,
        compatibilityBreakReason: null
      });
      const mockDefSort = jest.fn().mockReturnValue({ lean: mockDefLean });
      (CertificateDefinition.findOne as jest.Mock).mockReturnValue({ sort: mockDefSort });

      // The new requirement uses the same course version the learner already completed
      const mockReqLean = jest.fn().mockResolvedValue([{
        courseVersionId: completedCvId,
        isRequired: true
      }]);
      const mockReqPopulate = jest.fn().mockReturnValue({ lean: mockReqLean });
      (CertificateRequirement.find as jest.Mock).mockReturnValue({ populate: mockReqPopulate });

      const result = await CertificateUpgradeService.checkUpgradeEligibility(mockLearnerId, mockCredGroupId);

      expect(result.isEligible).toBe(true);
      expect(result.reason).toBe('eligible');
      expect(result.additionalRequirements).toBeUndefined();
    });
  });

  // =========================================================================
  // getLearnerUpgradeEligibilities
  // =========================================================================
  describe('getLearnerUpgradeEligibilities', () => {
    it('should throw on invalid learner ID', async () => {
      await expect(
        CertificateUpgradeService.getLearnerUpgradeEligibilities('invalid')
      ).rejects.toThrow(/Invalid learner ID/);
    });

    it('should return eligibilities for all credential groups', async () => {
      const credGroup1 = new mongoose.Types.ObjectId();
      const credGroup2 = new mongoose.Types.ObjectId();

      const mockDistinct = jest.fn().mockResolvedValue([credGroup1, credGroup2]);
      (CertificateIssuance.find as jest.Mock).mockReturnValue({ distinct: mockDistinct });

      // Mock checkUpgradeEligibility for each call
      // We need to mock the internal calls that checkUpgradeEligibility makes
      const mockIssuanceLean = jest.fn().mockResolvedValue(null);
      const mockIssuancePopulate = jest.fn().mockReturnValue({ lean: mockIssuanceLean });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockIssuancePopulate });

      const result = await CertificateUpgradeService.getLearnerUpgradeEligibilities(mockLearnerId);

      expect(result).toHaveLength(2);
      // Both will be no_active_certificate since findOne returns null
      expect(result[0].reason).toBe('no_active_certificate');
      expect(result[1].reason).toBe('no_active_certificate');
    });

    it('should return empty array when learner has no active issuances', async () => {
      const mockDistinct = jest.fn().mockResolvedValue([]);
      (CertificateIssuance.find as jest.Mock).mockReturnValue({ distinct: mockDistinct });

      const result = await CertificateUpgradeService.getLearnerUpgradeEligibilities(mockLearnerId);

      expect(result).toHaveLength(0);
    });
  });

  // =========================================================================
  // performUpgrade
  // =========================================================================
  describe('performUpgrade', () => {
    it('should throw on invalid issuance ID', async () => {
      await expect(
        CertificateUpgradeService.performUpgrade('invalid', mockUserId)
      ).rejects.toThrow(/Invalid issuance ID/);
    });

    it('should throw if issuance not found', async () => {
      const mockPopulate = jest.fn().mockResolvedValue(null);
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        CertificateUpgradeService.performUpgrade(mockIssuanceId, mockUserId)
      ).rejects.toThrow(/Certificate issuance not found/);
    });

    it('should throw if issuance is revoked', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockIssuanceId,
        revokedAt: new Date(),
        upgradedToIssuanceId: null,
        expiresAt: null,
        certificateDefinitionId: { credentialGroupId: mockCredGroupId, version: 1 }
      });
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        CertificateUpgradeService.performUpgrade(mockIssuanceId, mockUserId)
      ).rejects.toThrow(/revoked/);
    });

    it('should throw if issuance already upgraded', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockIssuanceId,
        revokedAt: null,
        upgradedToIssuanceId: new mongoose.Types.ObjectId(),
        expiresAt: null,
        certificateDefinitionId: { credentialGroupId: mockCredGroupId, version: 1 }
      });
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        CertificateUpgradeService.performUpgrade(mockIssuanceId, mockUserId)
      ).rejects.toThrow(/already been upgraded/);
    });

    it('should throw if issuance is expired', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockIssuanceId,
        revokedAt: null,
        upgradedToIssuanceId: null,
        expiresAt: pastDate,
        certificateDefinitionId: { credentialGroupId: mockCredGroupId, version: 1 }
      });
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        CertificateUpgradeService.performUpgrade(mockIssuanceId, mockUserId)
      ).rejects.toThrow(/expired/);
    });

    it('should throw if not eligible for upgrade', async () => {
      const currentDefId = new mongoose.Types.ObjectId();
      const credGroupObjId = new mongoose.Types.ObjectId();

      const mockFindByIdPopulate = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockIssuanceId),
        revokedAt: null,
        upgradedToIssuanceId: null,
        expiresAt: null,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        credentialGroupId: credGroupObjId,
        certificateDefinitionId: { _id: currentDefId, credentialGroupId: credGroupObjId, version: 1 },
        verificationCode: 'ABCDEFGHJKLM',
        completedRequirements: [],
        metadata: {}
      });
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({ populate: mockFindByIdPopulate });

      // checkUpgradeEligibility will find no active issuance (since findOne is separate)
      const mockFindOneLean = jest.fn().mockResolvedValue(null);
      const mockFindOnePopulate = jest.fn().mockReturnValue({ lean: mockFindOneLean });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockFindOnePopulate });

      await expect(
        CertificateUpgradeService.performUpgrade(mockIssuanceId, mockUserId)
      ).rejects.toThrow(/not eligible/);
    });

    it('should perform upgrade successfully', async () => {
      const { eventBus } = require('@/events/eventBus');
      const currentDefId = new mongoose.Types.ObjectId();
      const latestDefId = new mongoose.Types.ObjectId();
      const credGroupObjId = new mongoose.Types.ObjectId();
      const learnerObjId = new mongoose.Types.ObjectId();
      const currentIssuanceObjId = new mongoose.Types.ObjectId();

      // findById for performUpgrade
      const currentIssuance = {
        _id: currentIssuanceObjId,
        revokedAt: null,
        upgradedToIssuanceId: null,
        expiresAt: null,
        learnerId: learnerObjId,
        credentialGroupId: credGroupObjId,
        certificateDefinitionId: { _id: currentDefId, credentialGroupId: credGroupObjId, version: 1 },
        verificationCode: 'ABCDEFGHJKLM',
        completedRequirements: [
          { courseVersionId: new mongoose.Types.ObjectId() }
        ],
        metadata: {},
        save: jest.fn().mockResolvedValue(true)
      };
      const mockFindByIdPopulate = jest.fn().mockResolvedValue(currentIssuance);
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({ populate: mockFindByIdPopulate });

      // checkUpgradeEligibility internal calls - findOne for current issuance
      const mockFindOneLean = jest.fn().mockResolvedValue({
        _id: currentIssuanceObjId,
        verificationCode: 'ABCDEFGHJKLM',
        certificateDefinitionId: { _id: currentDefId, version: 1, title: 'Cert v1' },
        issuedAt: new Date(),
        completedRequirements: currentIssuance.completedRequirements
      });
      const mockFindOnePopulate = jest.fn().mockReturnValue({ lean: mockFindOneLean });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockFindOnePopulate });

      // Latest definition
      const mockDefLean = jest.fn().mockResolvedValue({
        _id: latestDefId,
        version: 2,
        title: 'Cert v2',
        isCompatible: true,
        compatibilityBreakReason: null
      });
      const mockDefSort = jest.fn().mockReturnValue({ lean: mockDefLean });
      (CertificateDefinition.findOne as jest.Mock).mockReturnValue({ sort: mockDefSort });

      // findById for target definition
      (CertificateDefinition.findById as jest.Mock).mockResolvedValue({
        _id: latestDefId,
        expiresAfterMonths: null
      });

      // New requirements
      const mockReqLean = jest.fn().mockResolvedValue([]);
      const mockReqPopulate = jest.fn().mockReturnValue({ lean: mockReqLean });
      (CertificateRequirement.find as jest.Mock).mockReturnValue({ populate: mockReqPopulate });

      // Generate verification code
      (CertificateIssuanceService.generateVerificationCode as jest.Mock).mockResolvedValue('NEWCODE12345');

      // New issuance constructor
      const newIssuanceSave = jest.fn().mockResolvedValue(true);
      (CertificateIssuance as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: newIssuanceSave
      }));

      const result = await CertificateUpgradeService.performUpgrade(mockIssuanceId, mockUserId);

      expect(result.previousIssuance).toBeDefined();
      expect(result.previousIssuance.verificationCode).toBe('ABCDEFGHJKLM');
      expect(result.newIssuance).toBeDefined();
      expect(result.newIssuance.verificationCode).toBe('NEWCODE12345');
      expect(newIssuanceSave).toHaveBeenCalled();
      expect(currentIssuance.save).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        'certificate.upgraded',
        expect.objectContaining({
          previousVerificationCode: 'ABCDEFGHJKLM',
          newVerificationCode: 'NEWCODE12345',
          upgradedBy: mockUserId
        })
      );
    });
  });
});
