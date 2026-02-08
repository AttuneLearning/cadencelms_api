/**
 * Unit Tests: NotificationTemplateService
 *
 * Tests for the notification template service:
 * - sendAccessExpiringNotification (priority based on urgency)
 * - sendAccessExpiredNotification
 * - sendNewVersionNotification
 * - sendCertificateUpgradeNotification
 * - sendCertificateIssuedNotification (60-day expiry)
 * - sendCertificateExpiringNotification (priority based on urgency)
 * - sendExtensionApprovedNotification (formats granted extension text)
 * - sendExtensionDeniedNotification (uses reason or reviewNotes or default)
 * - notifyLearnersOfNewVersion (finds previous versions, notifies active enrollments)
 */

import mongoose from 'mongoose';
import { NotificationTemplateService } from '@/services/notification/notificationTemplate.service';
import { NotificationService } from '@/services/notification/notification.service';
import Enrollment from '@/models/enrollment/Enrollment.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import CredentialGroup from '@/models/certificate/CredentialGroup.model';
import AccessExtensionRequest from '@/models/policy/AccessExtensionRequest.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/enrollment/Enrollment.model');
jest.mock('@/models/academic/CourseVersion.model');
jest.mock('@/models/certificate/CertificateIssuance.model');
jest.mock('@/models/certificate/CredentialGroup.model');
jest.mock('@/models/policy/AccessExtensionRequest.model');
jest.mock('@/services/notification/notification.service', () => ({
  NotificationService: {
    createNotification: jest.fn().mockResolvedValue({}),
    getOrCreatePreferences: jest.fn(),
    createNotificationSilent: jest.fn(),
  },
}));

describe('NotificationTemplateService', () => {
  const mockEnrollmentId = new mongoose.Types.ObjectId().toString();
  const mockLearnerId = new mongoose.Types.ObjectId().toString();
  const mockDepartmentId = new mongoose.Types.ObjectId().toString();
  const mockProgramId = new mongoose.Types.ObjectId().toString();
  const mockCourseVersionId = new mongoose.Types.ObjectId().toString();
  const mockCredentialGroupId = new mongoose.Types.ObjectId().toString();
  const mockIssuanceId = new mongoose.Types.ObjectId().toString();
  const mockRequestId = new mongoose.Types.ObjectId().toString();
  const mockCanonicalCourseId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────
  // sendAccessExpiringNotification
  // ──────────────────────────────────────────────────
  describe('sendAccessExpiringNotification', () => {
    const mockEnrollment = {
      _id: mockEnrollmentId,
      learnerId: new mongoose.Types.ObjectId(mockLearnerId),
      programId: { _id: mockProgramId, name: 'Test Program' },
      departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
      accessExpiresAt: new Date('2026-03-01'),
    };

    const setupEnrollmentMock = (enrollment: any = mockEnrollment) => {
      const mockLean = jest.fn().mockResolvedValue(enrollment);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (Enrollment.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });
    };

    it('should throw on invalid enrollment ID', async () => {
      await expect(
        NotificationTemplateService.sendAccessExpiringNotification('invalid', 7)
      ).rejects.toThrow('Invalid enrollment ID');
    });

    it('should throw when enrollment not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (Enrollment.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        NotificationTemplateService.sendAccessExpiringNotification(mockEnrollmentId, 7)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should set priority to urgent when daysUntilExpiry <= 1', async () => {
      setupEnrollmentMock();

      await NotificationTemplateService.sendAccessExpiringNotification(
        mockEnrollmentId,
        1
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'urgent' })
      );
    });

    it('should set priority to high when daysUntilExpiry <= 3', async () => {
      setupEnrollmentMock();

      await NotificationTemplateService.sendAccessExpiringNotification(
        mockEnrollmentId,
        3
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'high' })
      );
    });

    it('should set priority to normal when daysUntilExpiry <= 7', async () => {
      setupEnrollmentMock();

      await NotificationTemplateService.sendAccessExpiringNotification(
        mockEnrollmentId,
        7
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'normal' })
      );
    });

    it('should set priority to low when daysUntilExpiry > 7', async () => {
      setupEnrollmentMock();

      await NotificationTemplateService.sendAccessExpiringNotification(
        mockEnrollmentId,
        14
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'low' })
      );
    });

    it('should include enrollment as related entity', async () => {
      setupEnrollmentMock();

      await NotificationTemplateService.sendAccessExpiringNotification(
        mockEnrollmentId,
        5
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedEntity: { type: 'enrollment', id: mockEnrollmentId },
        })
      );
    });

    it('should use program name in message', async () => {
      setupEnrollmentMock();

      await NotificationTemplateService.sendAccessExpiringNotification(
        mockEnrollmentId,
        5
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Test Program'),
        })
      );
    });

    it('should handle singular day in message', async () => {
      setupEnrollmentMock();

      await NotificationTemplateService.sendAccessExpiringNotification(
        mockEnrollmentId,
        1
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('1 day.'),
        })
      );
    });

    it('should handle plural days in message', async () => {
      setupEnrollmentMock();

      await NotificationTemplateService.sendAccessExpiringNotification(
        mockEnrollmentId,
        5
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('5 days'),
        })
      );
    });

    it('should fallback to default program name when programId has no name', async () => {
      const enrollment = {
        ...mockEnrollment,
        programId: { _id: mockProgramId },
      };
      setupEnrollmentMock(enrollment);

      await NotificationTemplateService.sendAccessExpiringNotification(
        mockEnrollmentId,
        5
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('your program'),
        })
      );
    });
  });

  // ──────────────────────────────────────────────────
  // sendAccessExpiredNotification
  // ──────────────────────────────────────────────────
  describe('sendAccessExpiredNotification', () => {
    it('should throw on invalid enrollment ID', async () => {
      await expect(
        NotificationTemplateService.sendAccessExpiredNotification('invalid')
      ).rejects.toThrow('Invalid enrollment ID');
    });

    it('should throw when enrollment not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (Enrollment.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await expect(
        NotificationTemplateService.sendAccessExpiredNotification(mockEnrollmentId)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should create notification with high priority', async () => {
      const mockEnrollment = {
        _id: mockEnrollmentId,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        programId: { _id: mockProgramId, name: 'Expired Program' },
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        accessExpiresAt: new Date('2026-01-01'),
      };
      const mockLean = jest.fn().mockResolvedValue(mockEnrollment);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (Enrollment.findById as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await NotificationTemplateService.sendAccessExpiredNotification(mockEnrollmentId);

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'access_expired',
          priority: 'high',
          message: expect.stringContaining('Expired Program'),
        })
      );
    });
  });

  // ──────────────────────────────────────────────────
  // sendNewVersionNotification
  // ──────────────────────────────────────────────────
  describe('sendNewVersionNotification', () => {
    it('should throw on invalid learner ID', async () => {
      await expect(
        NotificationTemplateService.sendNewVersionNotification(
          'invalid',
          mockCourseVersionId,
          mockDepartmentId
        )
      ).rejects.toThrow('Invalid learner ID');
    });

    it('should throw on invalid course version ID', async () => {
      await expect(
        NotificationTemplateService.sendNewVersionNotification(
          mockLearnerId,
          'invalid',
          mockDepartmentId
        )
      ).rejects.toThrow('Invalid course version ID');
    });

    it('should throw when course version not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      (CourseVersion.findById as jest.Mock).mockReturnValue({ lean: mockLean });

      await expect(
        NotificationTemplateService.sendNewVersionNotification(
          mockLearnerId,
          mockCourseVersionId,
          mockDepartmentId
        )
      ).rejects.toThrow('Course version not found');
    });

    it('should create notification with course version details', async () => {
      const mockCourseVersion = {
        _id: mockCourseVersionId,
        title: 'Advanced Testing',
        version: '2.0',
        canonicalCourseId: new mongoose.Types.ObjectId(mockCanonicalCourseId),
      };
      const mockLean = jest.fn().mockResolvedValue(mockCourseVersion);
      (CourseVersion.findById as jest.Mock).mockReturnValue({ lean: mockLean });

      await NotificationTemplateService.sendNewVersionNotification(
        mockLearnerId,
        mockCourseVersionId,
        mockDepartmentId
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockLearnerId,
          departmentId: mockDepartmentId,
          type: 'new_version_available',
          title: 'New Course Version Available',
          message: expect.stringContaining('Advanced Testing'),
          relatedEntity: { type: 'courseVersion', id: mockCourseVersionId },
        })
      );
    });
  });

  // ──────────────────────────────────────────────────
  // sendCertificateUpgradeNotification
  // ──────────────────────────────────────────────────
  describe('sendCertificateUpgradeNotification', () => {
    it('should throw on invalid learner ID', async () => {
      await expect(
        NotificationTemplateService.sendCertificateUpgradeNotification(
          'invalid',
          mockCredentialGroupId,
          mockDepartmentId
        )
      ).rejects.toThrow('Invalid learner ID');
    });

    it('should throw on invalid credential group ID', async () => {
      await expect(
        NotificationTemplateService.sendCertificateUpgradeNotification(
          mockLearnerId,
          'invalid',
          mockDepartmentId
        )
      ).rejects.toThrow('Invalid credential group ID');
    });

    it('should throw when credential group not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      (CredentialGroup.findById as jest.Mock).mockReturnValue({ lean: mockLean });

      await expect(
        NotificationTemplateService.sendCertificateUpgradeNotification(
          mockLearnerId,
          mockCredentialGroupId,
          mockDepartmentId
        )
      ).rejects.toThrow('Credential group not found');
    });

    it('should create notification with credential group details', async () => {
      const mockGroup = {
        _id: mockCredentialGroupId,
        name: 'AWS Solutions Architect',
        code: 'AWS-SA',
      };
      const mockLean = jest.fn().mockResolvedValue(mockGroup);
      (CredentialGroup.findById as jest.Mock).mockReturnValue({ lean: mockLean });

      await NotificationTemplateService.sendCertificateUpgradeNotification(
        mockLearnerId,
        mockCredentialGroupId,
        mockDepartmentId
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'certificate_upgrade_available',
          message: expect.stringContaining('AWS Solutions Architect'),
          relatedEntity: { type: 'certificate', id: mockCredentialGroupId },
          metadata: expect.objectContaining({
            credentialGroupName: 'AWS Solutions Architect',
            credentialGroupCode: 'AWS-SA',
          }),
        })
      );
    });
  });

  // ──────────────────────────────────────────────────
  // sendCertificateIssuedNotification
  // ──────────────────────────────────────────────────
  describe('sendCertificateIssuedNotification', () => {
    it('should throw on invalid issuance ID', async () => {
      await expect(
        NotificationTemplateService.sendCertificateIssuedNotification('invalid')
      ).rejects.toThrow('Invalid issuance ID');
    });

    it('should throw when issuance not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate2 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate1,
      });

      await expect(
        NotificationTemplateService.sendCertificateIssuedNotification(mockIssuanceId)
      ).rejects.toThrow('Certificate issuance not found');
    });

    it('should create notification with 60-day expiry and verification code', async () => {
      const mockIssuance = {
        _id: mockIssuanceId,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        certificateDefinitionId: { title: 'Safety Cert', version: '1.0' },
        credentialGroupId: {
          _id: mockCredentialGroupId,
          name: 'OSHA Safety',
          code: 'OSHA-SAFE',
          departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        },
        verificationCode: 'ABC123DEF456',
        issuedAt: new Date('2026-01-15'),
        expiresAt: new Date('2027-01-15'),
      };
      const mockLean = jest.fn().mockResolvedValue(mockIssuance);
      const mockPopulate2 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate1,
      });

      await NotificationTemplateService.sendCertificateIssuedNotification(
        mockIssuanceId
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'certificate_issued',
          title: 'Certificate Issued',
          message: expect.stringContaining('ABC123DEF456'),
          relatedEntity: { type: 'certificateIssuance', id: mockIssuanceId },
          metadata: expect.objectContaining({
            verificationCode: 'ABC123DEF456',
            certificateTitle: 'Safety Cert',
          }),
        })
      );
    });
  });

  // ──────────────────────────────────────────────────
  // sendCertificateExpiringNotification
  // ──────────────────────────────────────────────────
  describe('sendCertificateExpiringNotification', () => {
    const setupIssuanceMock = (issuance: any) => {
      const mockLean = jest.fn().mockResolvedValue(issuance);
      const mockPopulate2 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (CertificateIssuance.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate1,
      });
    };

    const mockIssuance = {
      _id: mockIssuanceId,
      learnerId: new mongoose.Types.ObjectId(mockLearnerId),
      certificateDefinitionId: { title: 'Expiring Cert' },
      credentialGroupId: {
        _id: mockCredentialGroupId,
        name: 'Some Group',
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
      },
      verificationCode: 'XYZ789',
      expiresAt: new Date('2026-06-01'),
    };

    it('should throw on invalid issuance ID', async () => {
      await expect(
        NotificationTemplateService.sendCertificateExpiringNotification('invalid', 7)
      ).rejects.toThrow('Invalid issuance ID');
    });

    it('should throw when issuance not found', async () => {
      setupIssuanceMock(null);

      await expect(
        NotificationTemplateService.sendCertificateExpiringNotification(
          mockIssuanceId,
          7
        )
      ).rejects.toThrow('Certificate issuance not found');
    });

    it('should set priority to urgent when daysUntilExpiry <= 7', async () => {
      setupIssuanceMock(mockIssuance);

      await NotificationTemplateService.sendCertificateExpiringNotification(
        mockIssuanceId,
        5
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'urgent' })
      );
    });

    it('should set priority to high when daysUntilExpiry <= 14', async () => {
      setupIssuanceMock(mockIssuance);

      await NotificationTemplateService.sendCertificateExpiringNotification(
        mockIssuanceId,
        14
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'high' })
      );
    });

    it('should set priority to normal when daysUntilExpiry <= 30', async () => {
      setupIssuanceMock(mockIssuance);

      await NotificationTemplateService.sendCertificateExpiringNotification(
        mockIssuanceId,
        30
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'normal' })
      );
    });

    it('should set priority to low when daysUntilExpiry > 30', async () => {
      setupIssuanceMock(mockIssuance);

      await NotificationTemplateService.sendCertificateExpiringNotification(
        mockIssuanceId,
        60
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'low' })
      );
    });

    it('should include certificate title and days in message', async () => {
      setupIssuanceMock(mockIssuance);

      await NotificationTemplateService.sendCertificateExpiringNotification(
        mockIssuanceId,
        14
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'certificate_expiring',
          message: expect.stringContaining('Expiring Cert'),
        })
      );
    });
  });

  // ──────────────────────────────────────────────────
  // sendExtensionApprovedNotification
  // ──────────────────────────────────────────────────
  describe('sendExtensionApprovedNotification', () => {
    it('should throw on invalid request ID', async () => {
      await expect(
        NotificationTemplateService.sendExtensionApprovedNotification('invalid')
      ).rejects.toThrow('Invalid request ID');
    });

    it('should throw when request not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (AccessExtensionRequest.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate,
      });

      await expect(
        NotificationTemplateService.sendExtensionApprovedNotification(mockRequestId)
      ).rejects.toThrow('Extension request not found');
    });

    it('should format perpetual extension text', async () => {
      const mockRequest = {
        _id: mockRequestId,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        enrollmentId: new mongoose.Types.ObjectId(mockEnrollmentId),
        grantedExtension: { type: 'perpetual' },
        newExpirationDate: null,
        reviewNotes: 'Approved',
      };
      const mockLean = jest.fn().mockResolvedValue(mockRequest);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (AccessExtensionRequest.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate,
      });

      await NotificationTemplateService.sendExtensionApprovedNotification(
        mockRequestId
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'extension_approved',
          message: expect.stringContaining('perpetual access'),
        })
      );
    });

    it('should format days extension text', async () => {
      const mockRequest = {
        _id: mockRequestId,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        enrollmentId: new mongoose.Types.ObjectId(mockEnrollmentId),
        grantedExtension: { type: 'days', value: 30 },
        newExpirationDate: new Date('2026-06-01'),
        reviewNotes: null,
      };
      const mockLean = jest.fn().mockResolvedValue(mockRequest);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (AccessExtensionRequest.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate,
      });

      await NotificationTemplateService.sendExtensionApprovedNotification(
        mockRequestId
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('30 days'),
        })
      );
    });

    it('should include new expiration date in message when present', async () => {
      const newExpDate = new Date('2026-06-01');
      const mockRequest = {
        _id: mockRequestId,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        enrollmentId: new mongoose.Types.ObjectId(mockEnrollmentId),
        grantedExtension: { type: 'months', value: 3 },
        newExpirationDate: newExpDate,
        reviewNotes: null,
      };
      const mockLean = jest.fn().mockResolvedValue(mockRequest);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (AccessExtensionRequest.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate,
      });

      await NotificationTemplateService.sendExtensionApprovedNotification(
        mockRequestId
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('New access end date'),
        })
      );
    });

    it('should handle request with no granted extension', async () => {
      const mockRequest = {
        _id: mockRequestId,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        enrollmentId: new mongoose.Types.ObjectId(mockEnrollmentId),
        grantedExtension: null,
        newExpirationDate: null,
        reviewNotes: null,
      };
      const mockLean = jest.fn().mockResolvedValue(mockRequest);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (AccessExtensionRequest.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate,
      });

      await NotificationTemplateService.sendExtensionApprovedNotification(
        mockRequestId
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'extension_approved',
        })
      );
    });
  });

  // ──────────────────────────────────────────────────
  // sendExtensionDeniedNotification
  // ──────────────────────────────────────────────────
  describe('sendExtensionDeniedNotification', () => {
    it('should throw on invalid request ID', async () => {
      await expect(
        NotificationTemplateService.sendExtensionDeniedNotification('invalid')
      ).rejects.toThrow('Invalid request ID');
    });

    it('should throw when request not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      (AccessExtensionRequest.findById as jest.Mock).mockReturnValue({
        lean: mockLean,
      });

      await expect(
        NotificationTemplateService.sendExtensionDeniedNotification(mockRequestId)
      ).rejects.toThrow('Extension request not found');
    });

    it('should use provided reason', async () => {
      const mockRequest = {
        _id: mockRequestId,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        enrollmentId: new mongoose.Types.ObjectId(mockEnrollmentId),
        requestedExtension: { type: 'days', value: 30 },
        reviewNotes: 'Some review notes',
      };
      const mockLean = jest.fn().mockResolvedValue(mockRequest);
      (AccessExtensionRequest.findById as jest.Mock).mockReturnValue({
        lean: mockLean,
      });

      await NotificationTemplateService.sendExtensionDeniedNotification(
        mockRequestId,
        'Custom denial reason'
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'extension_denied',
          message: expect.stringContaining('Custom denial reason'),
        })
      );
    });

    it('should fall back to reviewNotes when no reason provided', async () => {
      const mockRequest = {
        _id: mockRequestId,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        enrollmentId: new mongoose.Types.ObjectId(mockEnrollmentId),
        requestedExtension: { type: 'days', value: 30 },
        reviewNotes: 'Reviewer said no',
      };
      const mockLean = jest.fn().mockResolvedValue(mockRequest);
      (AccessExtensionRequest.findById as jest.Mock).mockReturnValue({
        lean: mockLean,
      });

      await NotificationTemplateService.sendExtensionDeniedNotification(mockRequestId);

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Reviewer said no'),
        })
      );
    });

    it('should use default text when no reason and no reviewNotes', async () => {
      const mockRequest = {
        _id: mockRequestId,
        learnerId: new mongoose.Types.ObjectId(mockLearnerId),
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
        enrollmentId: new mongoose.Types.ObjectId(mockEnrollmentId),
        requestedExtension: { type: 'days', value: 30 },
        reviewNotes: null,
      };
      const mockLean = jest.fn().mockResolvedValue(mockRequest);
      (AccessExtensionRequest.findById as jest.Mock).mockReturnValue({
        lean: mockLean,
      });

      await NotificationTemplateService.sendExtensionDeniedNotification(mockRequestId);

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No reason provided'),
        })
      );
    });
  });

  // ──────────────────────────────────────────────────
  // notifyLearnersOfNewVersion
  // ──────────────────────────────────────────────────
  describe('notifyLearnersOfNewVersion', () => {
    it('should return 0 when no previous versions exist', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockSelect = jest.fn().mockReturnValue({ lean: mockLean });
      (CourseVersion.find as jest.Mock).mockReturnValue({ select: mockSelect });

      const result = await NotificationTemplateService.notifyLearnersOfNewVersion(
        mockCourseVersionId,
        mockCanonicalCourseId,
        mockDepartmentId
      );

      expect(result.notifiedCount).toBe(0);
    });

    it('should notify active enrollments when previous versions exist', async () => {
      // Previous versions
      const mockVersionLean = jest.fn().mockResolvedValue([
        { _id: new mongoose.Types.ObjectId() },
      ]);
      const mockVersionSelect = jest.fn().mockReturnValue({ lean: mockVersionLean });
      (CourseVersion.find as jest.Mock).mockReturnValue({
        select: mockVersionSelect,
      });

      // Active enrollments
      const mockEnrollLean = jest.fn().mockResolvedValue([
        { learnerId: new mongoose.Types.ObjectId(mockLearnerId) },
      ]);
      const mockEnrollSelect = jest.fn().mockReturnValue({ lean: mockEnrollLean });
      (Enrollment.find as jest.Mock).mockReturnValue({
        select: mockEnrollSelect,
      });

      // Mock the sendNewVersionNotification dependency
      const mockCourseVersion = {
        _id: mockCourseVersionId,
        title: 'New Version Course',
        version: '2.0',
        canonicalCourseId: new mongoose.Types.ObjectId(mockCanonicalCourseId),
      };
      const mockCVLean = jest.fn().mockResolvedValue(mockCourseVersion);
      (CourseVersion.findById as jest.Mock).mockReturnValue({ lean: mockCVLean });

      const result = await NotificationTemplateService.notifyLearnersOfNewVersion(
        mockCourseVersionId,
        mockCanonicalCourseId,
        mockDepartmentId
      );

      expect(result.notifiedCount).toBe(1);
      expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
    });

    it('should continue notifying even if one notification fails', async () => {
      // Previous versions
      const mockVersionLean = jest.fn().mockResolvedValue([
        { _id: new mongoose.Types.ObjectId() },
      ]);
      const mockVersionSelect = jest.fn().mockReturnValue({ lean: mockVersionLean });
      (CourseVersion.find as jest.Mock).mockReturnValue({
        select: mockVersionSelect,
      });

      // Two active enrollments
      const learner1 = new mongoose.Types.ObjectId();
      const learner2 = new mongoose.Types.ObjectId();
      const mockEnrollLean = jest.fn().mockResolvedValue([
        { learnerId: learner1 },
        { learnerId: learner2 },
      ]);
      const mockEnrollSelect = jest.fn().mockReturnValue({ lean: mockEnrollLean });
      (Enrollment.find as jest.Mock).mockReturnValue({
        select: mockEnrollSelect,
      });

      // First call to findById (for learner1) throws, second succeeds
      const mockCourseVersion = {
        _id: mockCourseVersionId,
        title: 'Course',
        version: '2.0',
        canonicalCourseId: new mongoose.Types.ObjectId(mockCanonicalCourseId),
      };
      (CourseVersion.findById as jest.Mock)
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockCourseVersion),
        });

      // Suppress console.error during this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await NotificationTemplateService.notifyLearnersOfNewVersion(
        mockCourseVersionId,
        mockCanonicalCourseId,
        mockDepartmentId
      );

      // First fails (not found), second succeeds
      expect(result.notifiedCount).toBe(1);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
