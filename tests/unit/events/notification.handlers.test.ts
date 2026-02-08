import mongoose from 'mongoose';

jest.mock('@/events/eventBus', () => {
  const { EventEmitter } = require('events');
  const bus = new EventEmitter();
  return {
    eventBus: bus,
    EVENTS: {
      COURSE_VERSION_PUBLISHED: 'course.version.published',
      CERTIFICATE_ISSUED: 'certificate.issued',
      CERTIFICATE_UPGRADED: 'certificate.upgraded',
      CERTIFICATE_DEFINITION_ACTIVATED: 'certificate.definition.activated',
      CERTIFICATE_DEFINITION_DEPRECATED: 'certificate.definition.deprecated',
      CERTIFICATE_REVOKED: 'certificate.revoked',
      COURSE_COMPLETED: 'course.completed'
    }
  };
});

jest.mock('@/services/notification/notificationTemplate.service', () => ({
  NotificationTemplateService: {
    notifyLearnersOfNewVersion: jest.fn().mockResolvedValue({ notifiedCount: 5 }),
    sendCertificateIssuedNotification: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('@/models/academic/CanonicalCourse.model');

import { eventBus, EVENTS } from '@/events/eventBus';
import { NotificationTemplateService } from '@/services/notification/notificationTemplate.service';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import {
  registerNotificationHandlers,
  unregisterNotificationHandlers,
  handleCourseVersionPublished,
  handleCertificateIssued,
  handleCertificateUpgraded
} from '@/events/handlers/notification.handlers';

describe('Notification Event Handlers', () => {
  const mockDepartmentId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
    eventBus.removeAllListeners();
  });

  describe('handleCourseVersionPublished', () => {
    const payload = {
      courseVersionId: 'version-123',
      canonicalCourseId: 'course-456',
      previousVersionId: 'version-100',
      publishedBy: 'user-789'
    };

    it('should find canonical course and call notifyLearnersOfNewVersion', async () => {
      const mockLean = jest.fn().mockResolvedValue({ departmentId: mockDepartmentId });
      const mockSelect = jest.fn().mockReturnValue({ lean: mockLean });
      (CanonicalCourse.findById as jest.Mock).mockReturnValue({ select: mockSelect });

      await handleCourseVersionPublished(payload);

      expect(CanonicalCourse.findById).toHaveBeenCalledWith('course-456');
      expect(mockSelect).toHaveBeenCalledWith('departmentId');
      expect(mockLean).toHaveBeenCalled();
      expect(NotificationTemplateService.notifyLearnersOfNewVersion).toHaveBeenCalledWith(
        'version-123',
        'course-456',
        mockDepartmentId.toString()
      );
    });

    it('should handle missing canonical course gracefully', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockSelect = jest.fn().mockReturnValue({ lean: mockLean });
      (CanonicalCourse.findById as jest.Mock).mockReturnValue({ select: mockSelect });

      await expect(handleCourseVersionPublished(payload)).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Canonical course not found')
      );
      expect(NotificationTemplateService.notifyLearnersOfNewVersion).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const mockLean = jest.fn().mockResolvedValue({ departmentId: mockDepartmentId });
      const mockSelect = jest.fn().mockReturnValue({ lean: mockLean });
      (CanonicalCourse.findById as jest.Mock).mockReturnValue({ select: mockSelect });
      (NotificationTemplateService.notifyLearnersOfNewVersion as jest.Mock)
        .mockRejectedValue(new Error('Service failure'));

      await expect(handleCourseVersionPublished(payload)).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith(
        'Error handling course version published event for notifications:',
        expect.any(Error)
      );
    });
  });

  describe('handleCertificateIssued', () => {
    const payload = {
      issuanceId: 'issuance-123',
      certificateDefinitionId: 'def-456',
      credentialGroupId: 'cred-789',
      learnerId: 'learner-001',
      verificationCode: 'VERIFY-ABC',
      issuedBy: 'admin-001',
      isAutoIssued: false
    };

    it('should call sendCertificateIssuedNotification with issuanceId', async () => {
      await handleCertificateIssued(payload);

      expect(NotificationTemplateService.sendCertificateIssuedNotification)
        .toHaveBeenCalledWith('issuance-123');
    });

    it('should handle errors gracefully', async () => {
      (NotificationTemplateService.sendCertificateIssuedNotification as jest.Mock)
        .mockRejectedValue(new Error('Notification failure'));

      await expect(handleCertificateIssued(payload)).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith(
        'Error handling certificate issued event for notifications:',
        expect.any(Error)
      );
    });
  });

  describe('handleCertificateUpgraded', () => {
    const payload = {
      oldIssuanceId: 'old-issuance-123',
      newIssuanceId: 'new-issuance-456',
      learnerId: 'learner-001',
      credentialGroupId: 'cred-789',
      oldDefinitionId: 'old-def-001',
      newDefinitionId: 'new-def-002',
      upgradedBy: 'admin-001'
    };

    it('should call sendCertificateIssuedNotification with new issuanceId', async () => {
      await handleCertificateUpgraded(payload);

      expect(NotificationTemplateService.sendCertificateIssuedNotification)
        .toHaveBeenCalledWith('new-issuance-456');
    });

    it('should handle errors gracefully', async () => {
      (NotificationTemplateService.sendCertificateIssuedNotification as jest.Mock)
        .mockRejectedValue(new Error('Upgrade notification failure'));

      await expect(handleCertificateUpgraded(payload)).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith(
        'Error handling certificate upgraded event for notifications:',
        expect.any(Error)
      );
    });
  });

  describe('registerNotificationHandlers', () => {
    it('should add listeners to eventBus for all three events', () => {
      const initialCourseVersionListeners = eventBus.listenerCount(EVENTS.COURSE_VERSION_PUBLISHED);
      const initialCertIssuedListeners = eventBus.listenerCount(EVENTS.CERTIFICATE_ISSUED);
      const initialCertUpgradedListeners = eventBus.listenerCount(EVENTS.CERTIFICATE_UPGRADED);

      registerNotificationHandlers();

      expect(eventBus.listenerCount(EVENTS.COURSE_VERSION_PUBLISHED))
        .toBe(initialCourseVersionListeners + 1);
      expect(eventBus.listenerCount(EVENTS.CERTIFICATE_ISSUED))
        .toBe(initialCertIssuedListeners + 1);
      expect(eventBus.listenerCount(EVENTS.CERTIFICATE_UPGRADED))
        .toBe(initialCertUpgradedListeners + 1);
    });
  });

  describe('unregisterNotificationHandlers', () => {
    it('should remove listeners from eventBus for all three events', () => {
      registerNotificationHandlers();

      const preUnregisterCourseVersion = eventBus.listenerCount(EVENTS.COURSE_VERSION_PUBLISHED);
      const preUnregisterCertIssued = eventBus.listenerCount(EVENTS.CERTIFICATE_ISSUED);
      const preUnregisterCertUpgraded = eventBus.listenerCount(EVENTS.CERTIFICATE_UPGRADED);

      unregisterNotificationHandlers();

      expect(eventBus.listenerCount(EVENTS.COURSE_VERSION_PUBLISHED))
        .toBe(preUnregisterCourseVersion - 1);
      expect(eventBus.listenerCount(EVENTS.CERTIFICATE_ISSUED))
        .toBe(preUnregisterCertIssued - 1);
      expect(eventBus.listenerCount(EVENTS.CERTIFICATE_UPGRADED))
        .toBe(preUnregisterCertUpgraded - 1);
    });
  });
});
