import mongoose from 'mongoose';
import { CertificateVerificationService } from '@/services/certificate/certificateVerification.service';
import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/certificate/CertificateIssuance.model');

describe('CertificateVerificationService', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // verifyByCode
  // =========================================================================
  describe('verifyByCode', () => {
    it('should normalize code to uppercase and trimmed', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate3 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateVerificationService.verifyByCode('  abcdefghjklm  ');

      expect(CertificateIssuance.findOne).toHaveBeenCalledWith({
        verificationCode: 'ABCDEFGHJKLM'
      });
    });

    it('should return not_found for code shorter than 12 characters', async () => {
      const result = await CertificateVerificationService.verifyByCode('SHORT');

      expect(result.status).toBe('not_found');
      expect(result.verificationCode).toBe('SHORT');
      expect(CertificateIssuance.findOne).not.toHaveBeenCalled();
    });

    it('should return not_found for code longer than 12 characters', async () => {
      const result = await CertificateVerificationService.verifyByCode('ABCDEFGHJKLMN');

      expect(result.status).toBe('not_found');
      expect(CertificateIssuance.findOne).not.toHaveBeenCalled();
    });

    it('should return not_found for code with invalid characters (I, O, 0, 1)', async () => {
      // Contains 'I' and 'O' which are excluded from alphabet
      const result = await CertificateVerificationService.verifyByCode('ABCDEFGHIJKL');

      expect(result.status).toBe('not_found');
      expect(CertificateIssuance.findOne).not.toHaveBeenCalled();
    });

    it('should return not_found for code with 0 (zero)', async () => {
      const result = await CertificateVerificationService.verifyByCode('ABCDEFGHJ0LM');

      expect(result.status).toBe('not_found');
      expect(CertificateIssuance.findOne).not.toHaveBeenCalled();
    });

    it('should return not_found for code with 1 (one)', async () => {
      const result = await CertificateVerificationService.verifyByCode('ABCDEFGHJ1LM');

      expect(result.status).toBe('not_found');
      expect(CertificateIssuance.findOne).not.toHaveBeenCalled();
    });

    it('should return not_found when no issuance matches', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate3 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateVerificationService.verifyByCode('ABCDEFGHJKLM');

      expect(result.status).toBe('not_found');
      expect(result.verificationCode).toBe('ABCDEFGHJKLM');
    });

    it('should return valid status for active certificate', async () => {
      const credGroupId = new mongoose.Types.ObjectId();
      const learnerId = new mongoose.Types.ObjectId();

      const mockIssuance = {
        _id: new mongoose.Types.ObjectId(),
        verificationCode: 'ABCDEFGHJKLM',
        credentialGroupId: { _id: credGroupId, name: 'AWS SA', code: 'AWS-SA', type: 'certificate', badgeColor: '#FF0000' },
        learnerId: { _id: learnerId, firstName: 'John', lastName: 'Doe' },
        upgradedToIssuanceId: null,
        issuedAt: new Date(),
        expiresAt: null,
        revokedAt: null,
        revokedReason: null,
        completedRequirements: [
          { courseTitle: 'Course A' },
          { courseTitle: 'Course B' }
        ]
      };

      const mockLean = jest.fn().mockResolvedValue(mockIssuance);
      const mockPopulate3 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateVerificationService.verifyByCode('ABCDEFGHJKLM');

      expect(result.status).toBe('valid');
      expect(result.credential?.name).toBe('AWS SA');
      expect(result.credential?.badgeColor).toBe('#FF0000');
      expect(result.recipient?.name).toBe('John Doe');
      expect(result.completedCourses).toEqual(['Course A', 'Course B']);
      expect(result.issuedAt).toBeDefined();
      expect(result.revokedAt).toBeUndefined();
      expect(result.upgradedTo).toBeUndefined();
    });

    it('should return revoked status with details', async () => {
      const revokedDate = new Date();

      const mockIssuance = {
        _id: new mongoose.Types.ObjectId(),
        verificationCode: 'ABCDEFGHJKLM',
        credentialGroupId: { _id: new mongoose.Types.ObjectId(), name: 'AWS SA', code: 'AWS-SA', type: 'certificate', badgeColor: null },
        learnerId: { _id: new mongoose.Types.ObjectId(), firstName: 'Jane', lastName: 'Smith' },
        upgradedToIssuanceId: null,
        issuedAt: new Date(),
        expiresAt: null,
        revokedAt: revokedDate,
        revokedReason: 'Fraud detected',
        completedRequirements: []
      };

      const mockLean = jest.fn().mockResolvedValue(mockIssuance);
      const mockPopulate3 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateVerificationService.verifyByCode('ABCDEFGHJKLM');

      expect(result.status).toBe('revoked');
      expect(result.revokedAt).toBe(revokedDate);
      expect(result.revokedReason).toBe('Fraud detected');
    });

    it('should return upgraded status with upgrade info', async () => {
      const upgradedToId = new mongoose.Types.ObjectId();
      const upgradeDate = new Date();

      const mockIssuance = {
        _id: new mongoose.Types.ObjectId(),
        verificationCode: 'ABCDEFGHJKLM',
        credentialGroupId: { _id: new mongoose.Types.ObjectId(), name: 'AWS SA', code: 'AWS-SA', type: 'certificate', badgeColor: null },
        learnerId: { _id: new mongoose.Types.ObjectId(), firstName: 'Bob', lastName: 'Jones' },
        upgradedToIssuanceId: { _id: upgradedToId, verificationCode: 'NEWCODE12345', issuedAt: upgradeDate },
        issuedAt: new Date(),
        expiresAt: null,
        revokedAt: null,
        revokedReason: null,
        completedRequirements: []
      };

      const mockLean = jest.fn().mockResolvedValue(mockIssuance);
      const mockPopulate3 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateVerificationService.verifyByCode('ABCDEFGHJKLM');

      expect(result.status).toBe('upgraded');
      expect(result.upgradedTo?.verificationCode).toBe('NEWCODE12345');
      expect(result.upgradedTo?.issuedAt).toBe(upgradeDate);
    });

    it('should return expired status for expired certificate', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const mockIssuance = {
        _id: new mongoose.Types.ObjectId(),
        verificationCode: 'ABCDEFGHJKLM',
        credentialGroupId: { _id: new mongoose.Types.ObjectId(), name: 'AWS SA', code: 'AWS-SA', type: 'certificate', badgeColor: null },
        learnerId: { _id: new mongoose.Types.ObjectId(), firstName: 'Alice', lastName: 'Brown' },
        upgradedToIssuanceId: null,
        issuedAt: new Date(2020, 0, 1),
        expiresAt: pastDate,
        revokedAt: null,
        revokedReason: null,
        completedRequirements: []
      };

      const mockLean = jest.fn().mockResolvedValue(mockIssuance);
      const mockPopulate3 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateVerificationService.verifyByCode('ABCDEFGHJKLM');

      expect(result.status).toBe('expired');
      expect(result.expiresAt).toBe(pastDate);
    });

    it('should prioritize revoked over expired status', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const mockIssuance = {
        _id: new mongoose.Types.ObjectId(),
        verificationCode: 'ABCDEFGHJKLM',
        credentialGroupId: { _id: new mongoose.Types.ObjectId(), name: 'Test', code: 'T', type: 'badge', badgeColor: null },
        learnerId: { _id: new mongoose.Types.ObjectId(), firstName: 'Test', lastName: 'User' },
        upgradedToIssuanceId: null,
        issuedAt: new Date(2020, 0, 1),
        expiresAt: pastDate,
        revokedAt: new Date(),
        revokedReason: 'Fraud',
        completedRequirements: []
      };

      const mockLean = jest.fn().mockResolvedValue(mockIssuance);
      const mockPopulate3 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateVerificationService.verifyByCode('ABCDEFGHJKLM');

      // Revoked check comes before expired in the code, so revoked wins
      expect(result.status).toBe('revoked');
    });
  });

  // =========================================================================
  // getFullVerificationDetails
  // =========================================================================
  describe('getFullVerificationDetails', () => {
    it('should throw ApiError.notFound when certificate not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate7 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate6 = jest.fn().mockReturnValue({ populate: mockPopulate7 });
      const mockPopulate5 = jest.fn().mockReturnValue({ populate: mockPopulate6 });
      const mockPopulate4 = jest.fn().mockReturnValue({ populate: mockPopulate5 });
      const mockPopulate3 = jest.fn().mockReturnValue({ populate: mockPopulate4 });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        CertificateVerificationService.getFullVerificationDetails('ABCDEFGHJKLM', mockUserId)
      ).rejects.toThrow(/Certificate not found/);
    });

    it('should normalize code before lookup', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate7 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate6 = jest.fn().mockReturnValue({ populate: mockPopulate7 });
      const mockPopulate5 = jest.fn().mockReturnValue({ populate: mockPopulate6 });
      const mockPopulate4 = jest.fn().mockReturnValue({ populate: mockPopulate5 });
      const mockPopulate3 = jest.fn().mockReturnValue({ populate: mockPopulate4 });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      try {
        await CertificateVerificationService.getFullVerificationDetails(' abcdefghjklm ', mockUserId);
      } catch {
        // Expected to throw
      }

      expect(CertificateIssuance.findOne).toHaveBeenCalledWith({
        verificationCode: 'ABCDEFGHJKLM'
      });
    });

    it('should return detailed verification result for valid certificate', async () => {
      const issuanceId = new mongoose.Types.ObjectId();
      const defId = new mongoose.Types.ObjectId();
      const credGroupId = new mongoose.Types.ObjectId();
      const learnerId = new mongoose.Types.ObjectId();
      const issuedById = new mongoose.Types.ObjectId();

      const mockIssuance = {
        _id: issuanceId,
        verificationCode: 'ABCDEFGHJKLM',
        certificateDefinitionId: { _id: defId, title: 'Cert v1', version: 1, description: 'A cert' },
        credentialGroupId: { _id: credGroupId, name: 'AWS SA', code: 'AWS-SA', type: 'certificate', description: 'AWS', badgeImageUrl: 'https://img.png', badgeColor: '#0000FF' },
        learnerId: { _id: learnerId, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        issuedBy: { _id: issuedById, email: 'admin@test.com' },
        revokedBy: null,
        upgradedToIssuanceId: null,
        upgradedFromIssuanceId: null,
        completedRequirements: [{ courseTitle: 'Course 1' }],
        issuedAt: new Date(),
        expiresAt: null,
        revokedAt: null,
        revokedReason: null,
        metadata: { note: 'test' },
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
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateVerificationService.getFullVerificationDetails('ABCDEFGHJKLM', mockUserId);

      expect(result.status).toBe('valid');
      expect(result.issuance.id).toBe(issuanceId.toString());
      expect(result.issuance.certificateDefinition?.title).toBe('Cert v1');
      expect(result.issuance.credentialGroup?.badgeImageUrl).toBe('https://img.png');
      expect(result.issuance.learner?.email).toBe('john@test.com');
      expect(result.issuance.issuedBy?.email).toBe('admin@test.com');
      expect(result.issuance.metadata).toEqual({ note: 'test' });
    });

    it('should return revoked status in full details', async () => {
      const issuanceId = new mongoose.Types.ObjectId();
      const revokedById = new mongoose.Types.ObjectId();

      const mockIssuance = {
        _id: issuanceId,
        verificationCode: 'ABCDEFGHJKLM',
        certificateDefinitionId: null,
        credentialGroupId: null,
        learnerId: null,
        issuedBy: null,
        revokedBy: { _id: revokedById, email: 'admin@test.com' },
        upgradedToIssuanceId: null,
        upgradedFromIssuanceId: null,
        completedRequirements: [],
        issuedAt: new Date(),
        expiresAt: null,
        revokedAt: new Date(),
        revokedReason: 'Policy violation',
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
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateVerificationService.getFullVerificationDetails('ABCDEFGHJKLM', mockUserId);

      expect(result.status).toBe('revoked');
      expect(result.issuance.revokedBy?.email).toBe('admin@test.com');
      expect(result.issuance.revokedReason).toBe('Policy violation');
    });

    it('should return upgraded status with upgrade chain info', async () => {
      const issuanceId = new mongoose.Types.ObjectId();
      const upgradedToId = new mongoose.Types.ObjectId();
      const upgradedFromId = new mongoose.Types.ObjectId();

      const mockIssuance = {
        _id: issuanceId,
        verificationCode: 'ABCDEFGHJKLM',
        certificateDefinitionId: null,
        credentialGroupId: null,
        learnerId: null,
        issuedBy: null,
        revokedBy: null,
        upgradedToIssuanceId: { _id: upgradedToId, verificationCode: 'NEWCODE12345', issuedAt: new Date() },
        upgradedFromIssuanceId: { _id: upgradedFromId, verificationCode: 'OLDCODE67890', issuedAt: new Date() },
        completedRequirements: [],
        issuedAt: new Date(),
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
      (CertificateIssuance.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await CertificateVerificationService.getFullVerificationDetails('ABCDEFGHJKLM', mockUserId);

      expect(result.status).toBe('upgraded');
      expect(result.issuance.upgradedTo?.verificationCode).toBe('NEWCODE12345');
      expect(result.issuance.upgradedFrom?.verificationCode).toBe('OLDCODE67890');
    });
  });
});
