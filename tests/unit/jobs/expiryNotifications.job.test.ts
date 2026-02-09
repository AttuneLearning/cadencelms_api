import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

// Mock dependencies before importing the job
jest.mock('@/models/enrollment/Enrollment.model');
jest.mock('@/models/certificate/CertificateIssuance.model');
jest.mock('@/models/notification/Notification.model');
jest.mock('@/services/notification/notificationTemplate.service');

import Enrollment from '@/models/enrollment/Enrollment.model';
import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import Notification from '@/models/notification/Notification.model';
import { NotificationTemplateService } from '@/services/notification/notificationTemplate.service';
import { ExpiryNotificationJob } from '@/jobs/expiryNotifications.job';

const MockEnrollment = Enrollment as jest.Mocked<typeof Enrollment>;
const MockCertificateIssuance = CertificateIssuance as jest.Mocked<typeof CertificateIssuance>;
const MockNotification = Notification as jest.Mocked<typeof Notification>;

describe('ExpiryNotificationJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeEnrollment = (overrides = {}) => ({
    _id: new ObjectId(),
    learnerId: new ObjectId(),
    status: 'active',
    accessExpiresAt: new Date(),
    ...overrides
  });

  const makeIssuance = (overrides = {}) => ({
    _id: new ObjectId(),
    learnerId: new ObjectId(),
    expiresAt: new Date(),
    revokedAt: null,
    upgradedToIssuanceId: null,
    ...overrides
  });

  // Helper to set up mocks for a clean run (no existing notifications)
  const setupCleanMocks = () => {
    const mockFindOneLean = jest.fn().mockResolvedValue(null);
    (MockNotification.findOne as jest.Mock).mockReturnValue({ lean: mockFindOneLean });
    return mockFindOneLean;
  };

  describe('checkAccessExpiry', () => {
    it('should send notifications for enrollments expiring at each window', async () => {
      const enrollment = makeEnrollment();

      // Return enrollment for every window query
      const mockFindLean = jest.fn().mockResolvedValue([enrollment]);
      (MockEnrollment.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      setupCleanMocks();

      (NotificationTemplateService.sendAccessExpiringNotification as jest.Mock)
        .mockResolvedValue(undefined);

      const result = await ExpiryNotificationJob.checkAccessExpiry();

      // 5 windows: 30, 14, 7, 3, 1
      expect(MockEnrollment.find).toHaveBeenCalledTimes(5);
      expect(NotificationTemplateService.sendAccessExpiringNotification).toHaveBeenCalledTimes(5);
      expect(result.sent).toBe(5);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should skip if notification already sent (deduplication)', async () => {
      const enrollment = makeEnrollment();

      const mockFindLean = jest.fn().mockResolvedValue([enrollment]);
      (MockEnrollment.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      // Notification already exists
      const mockFindOneLean = jest.fn().mockResolvedValue({ _id: new ObjectId() });
      (MockNotification.findOne as jest.Mock).mockReturnValue({ lean: mockFindOneLean });

      const result = await ExpiryNotificationJob.checkAccessExpiry();

      expect(NotificationTemplateService.sendAccessExpiringNotification).not.toHaveBeenCalled();
      expect(result.skipped).toBe(5); // All 5 windows skipped
      expect(result.sent).toBe(0);
    });

    it('should handle no expiring enrollments gracefully', async () => {
      const mockFindLean = jest.fn().mockResolvedValue([]);
      (MockEnrollment.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      const result = await ExpiryNotificationJob.checkAccessExpiry();

      expect(NotificationTemplateService.sendAccessExpiringNotification).not.toHaveBeenCalled();
      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should continue on individual notification failure', async () => {
      const enrollment1 = makeEnrollment();
      const enrollment2 = makeEnrollment();

      // Return two enrollments only for the first window, empty for the rest
      const mockFindLean = jest.fn()
        .mockResolvedValueOnce([enrollment1, enrollment2])
        .mockResolvedValue([]);
      (MockEnrollment.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      setupCleanMocks();

      // First call fails, second succeeds
      (NotificationTemplateService.sendAccessExpiringNotification as jest.Mock)
        .mockRejectedValueOnce(new Error('Template service error'))
        .mockResolvedValue(undefined);

      const result = await ExpiryNotificationJob.checkAccessExpiry();

      expect(result.errors).toBe(1);
      expect(result.sent).toBe(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send access expiry notification'),
        expect.any(Error)
      );
    });

    it('should query enrollments with correct filters', async () => {
      const mockFindLean = jest.fn().mockResolvedValue([]);
      (MockEnrollment.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      await ExpiryNotificationJob.checkAccessExpiry();

      // Verify each call uses status: 'active' and date range
      for (const call of (MockEnrollment.find as jest.Mock).mock.calls) {
        const query = call[0];
        expect(query.status).toBe('active');
        expect(query.accessExpiresAt).toBeDefined();
        expect(query.accessExpiresAt.$gte).toBeInstanceOf(Date);
        expect(query.accessExpiresAt.$lt).toBeInstanceOf(Date);
      }
    });

    it('should check deduplication with correct fields', async () => {
      const enrollment = makeEnrollment();

      // Return enrollment only for first window
      const mockFindLean = jest.fn()
        .mockResolvedValueOnce([enrollment])
        .mockResolvedValue([]);
      (MockEnrollment.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      setupCleanMocks();

      (NotificationTemplateService.sendAccessExpiringNotification as jest.Mock)
        .mockResolvedValue(undefined);

      await ExpiryNotificationJob.checkAccessExpiry();

      expect(MockNotification.findOne).toHaveBeenCalledWith({
        userId: enrollment.learnerId,
        type: 'access_expiring',
        'relatedEntity.id': enrollment._id,
        'metadata.daysUntilExpiry': 30 // First window
      });
    });
  });

  describe('checkCertificateExpiry', () => {
    it('should send notifications for certificates expiring at each window', async () => {
      const issuance = makeIssuance();

      const mockFindLean = jest.fn().mockResolvedValue([issuance]);
      (MockCertificateIssuance.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      setupCleanMocks();

      (NotificationTemplateService.sendCertificateExpiringNotification as jest.Mock)
        .mockResolvedValue(undefined);

      const result = await ExpiryNotificationJob.checkCertificateExpiry();

      // 4 windows: 60, 30, 14, 7
      expect(MockCertificateIssuance.find).toHaveBeenCalledTimes(4);
      expect(NotificationTemplateService.sendCertificateExpiringNotification).toHaveBeenCalledTimes(4);
      expect(result.sent).toBe(4);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should filter out revoked certificates via query', async () => {
      const mockFindLean = jest.fn().mockResolvedValue([]);
      (MockCertificateIssuance.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      await ExpiryNotificationJob.checkCertificateExpiry();

      for (const call of (MockCertificateIssuance.find as jest.Mock).mock.calls) {
        const query = call[0];
        expect(query.revokedAt).toBeNull();
      }
    });

    it('should filter out upgraded certificates via query', async () => {
      const mockFindLean = jest.fn().mockResolvedValue([]);
      (MockCertificateIssuance.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      await ExpiryNotificationJob.checkCertificateExpiry();

      for (const call of (MockCertificateIssuance.find as jest.Mock).mock.calls) {
        const query = call[0];
        expect(query.upgradedToIssuanceId).toBeNull();
      }
    });

    it('should handle deduplication for certificate notifications', async () => {
      const issuance = makeIssuance();

      const mockFindLean = jest.fn().mockResolvedValue([issuance]);
      (MockCertificateIssuance.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      // Existing notification found
      const mockFindOneLean = jest.fn().mockResolvedValue({ _id: new ObjectId() });
      (MockNotification.findOne as jest.Mock).mockReturnValue({ lean: mockFindOneLean });

      const result = await ExpiryNotificationJob.checkCertificateExpiry();

      expect(NotificationTemplateService.sendCertificateExpiringNotification).not.toHaveBeenCalled();
      expect(result.skipped).toBe(4); // All 4 windows skipped
      expect(result.sent).toBe(0);
    });

    it('should continue on individual certificate notification failure', async () => {
      const issuance1 = makeIssuance();
      const issuance2 = makeIssuance();

      const mockFindLean = jest.fn()
        .mockResolvedValueOnce([issuance1, issuance2])
        .mockResolvedValue([]);
      (MockCertificateIssuance.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      setupCleanMocks();

      (NotificationTemplateService.sendCertificateExpiringNotification as jest.Mock)
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValue(undefined);

      const result = await ExpiryNotificationJob.checkCertificateExpiry();

      expect(result.errors).toBe(1);
      expect(result.sent).toBe(1);
    });
  });

  describe('run', () => {
    it('should call both checkAccessExpiry and checkCertificateExpiry', async () => {
      const mockFindLean = jest.fn().mockResolvedValue([]);
      (MockEnrollment.find as jest.Mock).mockReturnValue({ lean: mockFindLean });
      (MockCertificateIssuance.find as jest.Mock).mockReturnValue({ lean: mockFindLean });

      const result = await ExpiryNotificationJob.run();

      expect(result.accessExpiry).toBeDefined();
      expect(result.certificateExpiry).toBeDefined();
      expect(MockEnrollment.find).toHaveBeenCalled();
      expect(MockCertificateIssuance.find).toHaveBeenCalled();
    });

    it('should return combined summary', async () => {
      const enrollment = makeEnrollment();
      const issuance = makeIssuance();

      const mockEnrollmentFindLean = jest.fn().mockResolvedValue([enrollment]);
      (MockEnrollment.find as jest.Mock).mockReturnValue({ lean: mockEnrollmentFindLean });

      const mockIssuanceFindLean = jest.fn().mockResolvedValue([issuance]);
      (MockCertificateIssuance.find as jest.Mock).mockReturnValue({ lean: mockIssuanceFindLean });

      setupCleanMocks();

      (NotificationTemplateService.sendAccessExpiringNotification as jest.Mock)
        .mockResolvedValue(undefined);
      (NotificationTemplateService.sendCertificateExpiringNotification as jest.Mock)
        .mockResolvedValue(undefined);

      const result = await ExpiryNotificationJob.run();

      expect(result.accessExpiry.sent).toBe(5);  // 5 access windows
      expect(result.certificateExpiry.sent).toBe(4);  // 4 certificate windows
      expect(result.accessExpiry.errors).toBe(0);
      expect(result.certificateExpiry.errors).toBe(0);
    });
  });
});
