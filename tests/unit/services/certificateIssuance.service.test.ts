import mongoose from 'mongoose';
import { CertificateIssuanceService } from '@/services/certificate/certificateIssuance.service';
import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import CertificateDefinition from '@/models/certificate/CertificateDefinition.model';
import CertificateRequirement from '@/models/certificate/CertificateRequirement.model';
import { Learner } from '@/models/auth/Learner.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/certificate/CertificateIssuance.model');
jest.mock('@/models/certificate/CertificateDefinition.model');
jest.mock('@/models/certificate/CertificateRequirement.model');
jest.mock('@/models/auth/Learner.model', () => ({
  Learner: { findById: jest.fn() }
}));
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

describe('CertificateIssuanceService', () => {
  const mockId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockLearnerId = new mongoose.Types.ObjectId().toString();
  const mockDefId = new mongoose.Types.ObjectId().toString();
  const mockCredGroupId = new mongoose.Types.ObjectId().toString();
  const mockCourseVersionId = new mongoose.Types.ObjectId().toString();
  const mockEnrollmentId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // generateVerificationCode
  // =========================================================================
  describe('generateVerificationCode', () => {
    it('should generate a 12-character code', async () => {
      (CertificateIssuance.findOne as jest.Mock).mockResolvedValue(null);

      const code = await CertificateIssuanceService.generateVerificationCode();

      expect(code).toHaveLength(12);
    });

    it('should only use valid alphabet characters', async () => {
      (CertificateIssuance.findOne as jest.Mock).mockResolvedValue(null);

      const code = await CertificateIssuanceService.generateVerificationCode();
      const validPattern = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/;

      expect(validPattern.test(code)).toBe(true);
    });

    it('should retry on collision and succeed', async () => {
      (CertificateIssuance.findOne as jest.Mock)
        .mockResolvedValueOnce({ _id: 'existing1' }) // first collision
        .mockResolvedValueOnce({ _id: 'existing2' }) // second collision
        .mockResolvedValueOnce(null); // third attempt succeeds

      const code = await CertificateIssuanceService.generateVerificationCode();

      expect(code).toHaveLength(12);
      expect(CertificateIssuance.findOne).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      // All attempts collide
      (CertificateIssuance.findOne as jest.Mock).mockResolvedValue({ _id: 'existing' });

      await expect(
        CertificateIssuanceService.generateVerificationCode()
      ).rejects.toThrow(/Failed to generate unique verification code/);

      expect(CertificateIssuance.findOne).toHaveBeenCalledTimes(10);
    });
  });

  // =========================================================================
  // listIssuances
  // =========================================================================
  describe('listIssuances', () => {
    it('should throw on invalid learner ID filter', async () => {
      await expect(
        CertificateIssuanceService.listIssuances({ learnerId: 'invalid' }, mockUserId)
      ).rejects.toThrow(/Invalid learner ID/);
    });

    it('should throw on invalid credential group ID filter', async () => {
      await expect(
        CertificateIssuanceService.listIssuances({ credentialGroupId: 'invalid' }, mockUserId)
      ).rejects.toThrow(/Invalid credential group ID/);
    });

    it('should throw on invalid certificate definition ID filter', async () => {
      await expect(
        CertificateIssuanceService.listIssuances({ certificateDefinitionId: 'invalid' }, mockUserId)
      ).rejects.toThrow(/Invalid certificate definition ID/);
    });

    it('should return paginated issuances', async () => {
      const issuanceId = new mongoose.Types.ObjectId();
      const defObjId = new mongoose.Types.ObjectId();
      const credGroupObjId = new mongoose.Types.ObjectId();
      const learnerObjId = new mongoose.Types.ObjectId();
      const issuedByObjId = new mongoose.Types.ObjectId();

      const mockIssuances = [{
        _id: issuanceId,
        certificateDefinitionId: { _id: defObjId, title: 'Cert v1', version: 1 },
        credentialGroupId: { _id: credGroupObjId, name: 'AWS SA', code: 'AWS-SA', type: 'certificate' },
        learnerId: { _id: learnerObjId, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        issuedBy: { _id: issuedByObjId, email: 'admin@test.com' },
        completedRequirements: [],
        issuedAt: new Date(),
        verificationCode: 'ABCDEFGHJKLM',
        pdfUrl: null,
        expiresAt: null,
        revokedAt: null,
        revokedReason: null,
        upgradedToIssuanceId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const mockLean = jest.fn().mockResolvedValue(mockIssuances);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate4 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate3 = jest.fn().mockReturnValue({ populate: mockPopulate4 });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CertificateIssuance.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await CertificateIssuanceService.listIssuances({}, mockUserId);

      expect(result.issuances).toHaveLength(1);
      expect(result.issuances[0].id).toBe(issuanceId.toString());
      expect(result.issuances[0].learner?.firstName).toBe('John');
      expect(result.issuances[0].verificationCode).toBe('ABCDEFGHJKLM');
      expect(result.pagination.total).toBe(1);
    });

    it('should exclude revoked by default', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate4 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate3 = jest.fn().mockReturnValue({ populate: mockPopulate4 });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CertificateIssuance.countDocuments as jest.Mock).mockResolvedValue(0);

      await CertificateIssuanceService.listIssuances({}, mockUserId);

      expect(CertificateIssuance.find).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: null })
      );
    });

    it('should include revoked when requested', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate4 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate3 = jest.fn().mockReturnValue({ populate: mockPopulate4 });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CertificateIssuance.countDocuments as jest.Mock).mockResolvedValue(0);

      await CertificateIssuanceService.listIssuances({ includeRevoked: true }, mockUserId);

      const query = (CertificateIssuance.find as jest.Mock).mock.calls[0][0];
      expect(query.revokedAt).toBeUndefined();
    });

    it('should exclude expired by default with $or clause', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate4 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate3 = jest.fn().mockReturnValue({ populate: mockPopulate4 });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CertificateIssuance.countDocuments as jest.Mock).mockResolvedValue(0);

      await CertificateIssuanceService.listIssuances({}, mockUserId);

      const query = (CertificateIssuance.find as jest.Mock).mock.calls[0][0];
      expect(query.$or).toBeDefined();
      expect(query.$or).toHaveLength(2);
    });
  });

  // =========================================================================
  // issueManually
  // =========================================================================
  describe('issueManually', () => {
    it('should throw on invalid definition ID', async () => {
      await expect(
        CertificateIssuanceService.issueManually(
          { certificateDefinitionId: 'invalid', learnerId: mockLearnerId, completedRequirements: [] },
          mockUserId
        )
      ).rejects.toThrow(/Invalid certificate definition ID/);
    });

    it('should throw if definition not found', async () => {
      const mockPopulate = jest.fn().mockResolvedValue(null);
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        CertificateIssuanceService.issueManually(
          { certificateDefinitionId: mockDefId, learnerId: mockLearnerId, completedRequirements: [] },
          mockUserId
        )
      ).rejects.toThrow(/Certificate definition not found/);
    });

    it('should throw if definition is not active', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockDefId,
        status: 'draft',
        credentialGroupId: mockCredGroupId
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        CertificateIssuanceService.issueManually(
          { certificateDefinitionId: mockDefId, learnerId: mockLearnerId, completedRequirements: [] },
          mockUserId
        )
      ).rejects.toThrow(/non-active definitions/);
    });

    it('should throw on invalid learner ID', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockDefId,
        status: 'active',
        credentialGroupId: mockCredGroupId
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        CertificateIssuanceService.issueManually(
          { certificateDefinitionId: mockDefId, learnerId: 'invalid', completedRequirements: [] },
          mockUserId
        )
      ).rejects.toThrow(/Invalid learner ID/);
    });

    it('should throw if learner not found', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockDefId,
        status: 'active',
        credentialGroupId: mockCredGroupId
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (Learner.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateIssuanceService.issueManually(
          { certificateDefinitionId: mockDefId, learnerId: mockLearnerId, completedRequirements: [] },
          mockUserId
        )
      ).rejects.toThrow(/Learner not found/);
    });

    it('should throw if learner is inactive', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockDefId,
        status: 'active',
        credentialGroupId: mockCredGroupId
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (Learner.findById as jest.Mock).mockResolvedValue({ _id: mockLearnerId, isActive: false });

      await expect(
        CertificateIssuanceService.issueManually(
          { certificateDefinitionId: mockDefId, learnerId: mockLearnerId, completedRequirements: [] },
          mockUserId
        )
      ).rejects.toThrow(/inactive learner/);
    });

    it('should throw if learner already has active certificate for this credential', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockDefId,
        status: 'active',
        credentialGroupId: mockCredGroupId
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (Learner.findById as jest.Mock).mockResolvedValue({ _id: mockLearnerId, isActive: true });
      (CertificateIssuance.findOne as jest.Mock).mockResolvedValue({ _id: 'existing' });

      await expect(
        CertificateIssuanceService.issueManually(
          {
            certificateDefinitionId: mockDefId,
            learnerId: mockLearnerId,
            completedRequirements: [
              {
                courseVersionId: mockCourseVersionId,
                courseTitle: 'Course 1',
                completedAt: new Date(),
                finalScore: 90,
                enrollmentId: mockEnrollmentId
              }
            ]
          },
          mockUserId
        )
      ).rejects.toThrow(/already has an active certificate/);
    });

    it('should throw if no completed requirements provided', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockDefId,
        status: 'active',
        credentialGroupId: mockCredGroupId
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (Learner.findById as jest.Mock).mockResolvedValue({ _id: mockLearnerId, isActive: true });
      (CertificateIssuance.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateIssuanceService.issueManually(
          { certificateDefinitionId: mockDefId, learnerId: mockLearnerId, completedRequirements: [] },
          mockUserId
        )
      ).rejects.toThrow(/At least one completed requirement/);
    });

    it('should issue certificate successfully', async () => {
      const { eventBus } = require('@/events/eventBus');
      const defObjId = new mongoose.Types.ObjectId(mockDefId);

      const mockPopulate = jest.fn().mockResolvedValue({
        _id: defObjId,
        status: 'active',
        credentialGroupId: new mongoose.Types.ObjectId(mockCredGroupId),
        expiresAfterMonths: null
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (Learner.findById as jest.Mock).mockResolvedValue({ _id: mockLearnerId, isActive: true });
      (CertificateIssuance.findOne as jest.Mock).mockResolvedValueOnce(null) // no existing issuance
        .mockResolvedValue(null); // verification code uniqueness check

      const mockSave = jest.fn().mockResolvedValue(true);
      (CertificateIssuance as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        save: mockSave
      }));

      const result = await CertificateIssuanceService.issueManually(
        {
          certificateDefinitionId: mockDefId,
          learnerId: mockLearnerId,
          completedRequirements: [
            {
              courseVersionId: mockCourseVersionId,
              courseTitle: 'Course 1',
              completedAt: new Date(),
              finalScore: 95,
              enrollmentId: mockEnrollmentId
            }
          ]
        },
        mockUserId
      );

      expect(mockSave).toHaveBeenCalled();
      expect(result.verificationCode).toBeDefined();
      expect(result.certificateDefinitionId).toBe(defObjId.toString());
      expect(result.learnerId).toBe(mockLearnerId);
      expect(eventBus.emit).toHaveBeenCalledWith(
        'certificate.issued',
        expect.objectContaining({
          learnerId: mockLearnerId,
          isAutoIssued: false
        })
      );
    });

    it('should calculate expiration from definition expiresAfterMonths', async () => {
      const defObjId = new mongoose.Types.ObjectId(mockDefId);

      const mockPopulate = jest.fn().mockResolvedValue({
        _id: defObjId,
        status: 'active',
        credentialGroupId: new mongoose.Types.ObjectId(mockCredGroupId),
        expiresAfterMonths: 6
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (Learner.findById as jest.Mock).mockResolvedValue({ _id: mockLearnerId, isActive: true });
      (CertificateIssuance.findOne as jest.Mock).mockResolvedValueOnce(null)
        .mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      (CertificateIssuance as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        save: mockSave
      }));

      const result = await CertificateIssuanceService.issueManually(
        {
          certificateDefinitionId: mockDefId,
          learnerId: mockLearnerId,
          completedRequirements: [
            {
              courseVersionId: mockCourseVersionId,
              courseTitle: 'Course 1',
              completedAt: new Date(),
              finalScore: null,
              enrollmentId: mockEnrollmentId
            }
          ]
        },
        mockUserId
      );

      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt).not.toBeNull();
    });
  });

  // =========================================================================
  // getIssuanceById
  // =========================================================================
  describe('getIssuanceById', () => {
    it('should throw on invalid issuance ID', async () => {
      await expect(
        CertificateIssuanceService.getIssuanceById('invalid', mockUserId)
      ).rejects.toThrow(/Invalid issuance ID/);
    });

    it('should throw if issuance not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate7 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate6 = jest.fn().mockReturnValue({ populate: mockPopulate7 });
      const mockPopulate5 = jest.fn().mockReturnValue({ populate: mockPopulate6 });
      const mockPopulate4 = jest.fn().mockReturnValue({ populate: mockPopulate5 });
      const mockPopulate3 = jest.fn().mockReturnValue({ populate: mockPopulate4 });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        CertificateIssuanceService.getIssuanceById(mockId, mockUserId)
      ).rejects.toThrow(/Certificate issuance not found/);
    });

    it('should return enriched issuance with all populated fields', async () => {
      const issuanceObjId = new mongoose.Types.ObjectId();
      const defObjId = new mongoose.Types.ObjectId();
      const credGroupObjId = new mongoose.Types.ObjectId();
      const learnerObjId = new mongoose.Types.ObjectId();
      const issuedByObjId = new mongoose.Types.ObjectId();

      const mockIssuance = {
        _id: issuanceObjId,
        certificateDefinitionId: { _id: defObjId, title: 'Cert v1', version: 1, description: 'Desc', status: 'active' },
        credentialGroupId: { _id: credGroupObjId, name: 'AWS SA', code: 'AWS-SA', type: 'certificate', description: 'Desc', badgeImageUrl: null, badgeColor: '#FF0000' },
        learnerId: { _id: learnerObjId, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        issuedBy: { _id: issuedByObjId, email: 'admin@test.com' },
        revokedBy: null,
        upgradedToIssuanceId: null,
        upgradedFromIssuanceId: null,
        completedRequirements: [],
        issuedAt: new Date(),
        verificationCode: 'ABCDEFGHJKLM',
        pdfUrl: null,
        expiresAt: null,
        revokedAt: null,
        revokedReason: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockLean = jest.fn().mockResolvedValue(mockIssuance);
      const mockPopulate7 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate6 = jest.fn().mockReturnValue({ populate: mockPopulate7 });
      const mockPopulate5 = jest.fn().mockReturnValue({ populate: mockPopulate6 });
      const mockPopulate4 = jest.fn().mockReturnValue({ populate: mockPopulate5 });
      const mockPopulate3 = jest.fn().mockReturnValue({ populate: mockPopulate4 });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateIssuanceService.getIssuanceById(issuanceObjId.toString(), mockUserId);

      expect(result.id).toBe(issuanceObjId.toString());
      expect(result.certificateDefinition?.title).toBe('Cert v1');
      expect(result.credentialGroup?.badgeColor).toBe('#FF0000');
      expect(result.learner?.email).toBe('john@test.com');
      expect(result.issuedBy?.email).toBe('admin@test.com');
    });
  });

  // =========================================================================
  // revokeIssuance
  // =========================================================================
  describe('revokeIssuance', () => {
    it('should throw on invalid issuance ID', async () => {
      await expect(
        CertificateIssuanceService.revokeIssuance('invalid', { reason: 'test' }, mockUserId)
      ).rejects.toThrow(/Invalid issuance ID/);
    });

    it('should throw if issuance not found', async () => {
      (CertificateIssuance.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        CertificateIssuanceService.revokeIssuance(mockId, { reason: 'test' }, mockUserId)
      ).rejects.toThrow(/Certificate issuance not found/);
    });

    it('should throw if already revoked', async () => {
      (CertificateIssuance.findById as jest.Mock).mockResolvedValue({
        _id: mockId,
        revokedAt: new Date()
      });

      await expect(
        CertificateIssuanceService.revokeIssuance(mockId, { reason: 'test' }, mockUserId)
      ).rejects.toThrow(/already been revoked/);
    });

    it('should revoke issuance and emit event', async () => {
      const { eventBus } = require('@/events/eventBus');
      const issuanceObjId = new mongoose.Types.ObjectId();
      const mockIssuance = {
        _id: issuanceObjId,
        certificateDefinitionId: new mongoose.Types.ObjectId(),
        credentialGroupId: new mongoose.Types.ObjectId(),
        learnerId: new mongoose.Types.ObjectId(),
        verificationCode: 'ABCDEFGHJKLM',
        revokedAt: null,
        revokedBy: null,
        revokedReason: null,
        save: jest.fn().mockResolvedValue(true)
      };
      (CertificateIssuance.findById as jest.Mock).mockResolvedValue(mockIssuance);

      const result = await CertificateIssuanceService.revokeIssuance(
        issuanceObjId.toString(),
        { reason: 'Fraudulent activity' },
        mockUserId
      );

      expect(mockIssuance.revokedAt).toBeDefined();
      expect(mockIssuance.revokedReason).toBe('Fraudulent activity');
      expect(mockIssuance.save).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        'certificate.revoked',
        expect.objectContaining({
          reason: 'Fraudulent activity',
          revokedBy: mockUserId
        })
      );
      expect(result.revokedReason).toBe('Fraudulent activity');
    });
  });

  // =========================================================================
  // getLearnerCertificates
  // =========================================================================
  describe('getLearnerCertificates', () => {
    it('should throw on invalid learner ID', async () => {
      await expect(
        CertificateIssuanceService.getLearnerCertificates('invalid', {}, mockUserId)
      ).rejects.toThrow(/Invalid learner ID/);
    });

    it('should return learner certificates excluding revoked and expired by default', async () => {
      const issuanceId = new mongoose.Types.ObjectId();
      const defObjId = new mongoose.Types.ObjectId();
      const credGroupObjId = new mongoose.Types.ObjectId();

      const mockIssuances = [{
        _id: issuanceId,
        certificateDefinitionId: { _id: defObjId, title: 'Cert v1', version: 1 },
        credentialGroupId: { _id: credGroupObjId, name: 'AWS SA', code: 'AWS-SA', type: 'certificate', badgeImageUrl: null, badgeColor: null },
        issuedAt: new Date(),
        verificationCode: 'ABCDEFGHJKLM',
        expiresAt: null,
        revokedAt: null,
        upgradedToIssuanceId: null
      }];

      const mockLean = jest.fn().mockResolvedValue(mockIssuances);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.find as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateIssuanceService.getLearnerCertificates(
        mockLearnerId,
        {},
        mockUserId
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(issuanceId.toString());
      expect(result[0].isUpgraded).toBe(false);
      expect(result[0].isRevoked).toBe(false);

      // Check that revoked/expired are excluded in query
      const query = (CertificateIssuance.find as jest.Mock).mock.calls[0][0];
      expect(query.revokedAt).toBeNull();
      expect(query.$or).toBeDefined();
    });

    it('should include revoked when requested', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.find as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await CertificateIssuanceService.getLearnerCertificates(
        mockLearnerId,
        { includeRevoked: true },
        mockUserId
      );

      const query = (CertificateIssuance.find as jest.Mock).mock.calls[0][0];
      expect(query.revokedAt).toBeUndefined();
    });

    it('should include expired when requested', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.find as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await CertificateIssuanceService.getLearnerCertificates(
        mockLearnerId,
        { includeExpired: true },
        mockUserId
      );

      const query = (CertificateIssuance.find as jest.Mock).mock.calls[0][0];
      expect(query.$or).toBeUndefined();
    });
  });

  // =========================================================================
  // checkAndAutoIssue
  // =========================================================================
  describe('checkAndAutoIssue', () => {
    it('should return null if definition not found', async () => {
      const mockPopulate = jest.fn().mockResolvedValue(null);
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateIssuanceService.checkAndAutoIssue(mockLearnerId, mockDefId);

      expect(result).toBeNull();
    });

    it('should return null if definition is not active', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockDefId,
        status: 'draft',
        autoIssue: true
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateIssuanceService.checkAndAutoIssue(mockLearnerId, mockDefId);

      expect(result).toBeNull();
    });

    it('should return null if autoIssue is false', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockDefId,
        status: 'active',
        autoIssue: false
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateIssuanceService.checkAndAutoIssue(mockLearnerId, mockDefId);

      expect(result).toBeNull();
    });

    it('should return null if existing issuance found', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockDefId,
        status: 'active',
        autoIssue: true,
        credentialGroupId: mockCredGroupId
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CertificateIssuance.findOne as jest.Mock).mockResolvedValue({ _id: 'existing' });

      const result = await CertificateIssuanceService.checkAndAutoIssue(mockLearnerId, mockDefId);

      expect(result).toBeNull();
    });

    it('should return null when no requirements (placeholder implementation)', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: mockDefId,
        status: 'active',
        autoIssue: true,
        credentialGroupId: mockCredGroupId
      });
      (CertificateDefinition.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
      (CertificateIssuance.findOne as jest.Mock).mockResolvedValue(null);

      const mockReqLean = jest.fn().mockResolvedValue([]);
      (CertificateRequirement.find as jest.Mock).mockReturnValue({ lean: mockReqLean });

      const result = await CertificateIssuanceService.checkAndAutoIssue(mockLearnerId, mockDefId);

      expect(result).toBeNull();
    });
  });
});
