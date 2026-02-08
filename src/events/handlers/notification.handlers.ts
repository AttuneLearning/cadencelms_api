import { eventBus, EVENTS, CourseVersionPublishedPayload } from '@/events/eventBus';
import { NotificationTemplateService } from '@/services/notification/notificationTemplate.service';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';

/**
 * Event payload for certificate issued events
 */
interface CertificateIssuedPayload {
  issuanceId: string;
  certificateDefinitionId: string;
  credentialGroupId: string;
  learnerId: string;
  verificationCode: string;
  issuedBy: string | null;
  isAutoIssued: boolean;
}

/**
 * Event payload for certificate upgraded events
 */
interface CertificateUpgradedPayload {
  oldIssuanceId: string;
  newIssuanceId: string;
  learnerId: string;
  credentialGroupId: string;
  oldDefinitionId: string;
  newDefinitionId: string;
  upgradedBy: string;
}

/**
 * Handle course version published event
 *
 * When a new course version is published, notify learners enrolled in
 * previous versions about the availability of the new version.
 */
async function handleCourseVersionPublished(
  payload: CourseVersionPublishedPayload
): Promise<void> {
  try {
    const { courseVersionId, canonicalCourseId } = payload;

    // Get the canonical course to find the department
    const canonicalCourse = await CanonicalCourse.findById(canonicalCourseId)
      .select('departmentId')
      .lean();

    if (!canonicalCourse) {
      console.error(`Canonical course not found for notification: ${canonicalCourseId}`);
      return;
    }

    // Notify learners of the new version
    const result = await NotificationTemplateService.notifyLearnersOfNewVersion(
      courseVersionId,
      canonicalCourseId,
      canonicalCourse.departmentId.toString()
    );

    console.log(`Notified ${result.notifiedCount} learners about new course version ${courseVersionId}`);
  } catch (error) {
    console.error('Error handling course version published event for notifications:', error);
  }
}

/**
 * Handle certificate issued event
 *
 * When a certificate is issued, send a notification to the learner.
 */
async function handleCertificateIssued(
  payload: CertificateIssuedPayload
): Promise<void> {
  try {
    const { issuanceId } = payload;

    await NotificationTemplateService.sendCertificateIssuedNotification(issuanceId);

    console.log(`Sent certificate issued notification for issuance ${issuanceId}`);
  } catch (error) {
    console.error('Error handling certificate issued event for notifications:', error);
  }
}

/**
 * Handle certificate upgraded event
 *
 * When a certificate is upgraded, send a notification to the learner
 * about the upgrade and the new certificate details.
 */
async function handleCertificateUpgraded(
  payload: CertificateUpgradedPayload
): Promise<void> {
  try {
    const { newIssuanceId } = payload;

    // Send notification for the new issuance
    await NotificationTemplateService.sendCertificateIssuedNotification(newIssuanceId);

    console.log(`Sent certificate upgrade notification for new issuance ${newIssuanceId}`);
  } catch (error) {
    console.error('Error handling certificate upgraded event for notifications:', error);
  }
}

/**
 * Register all notification event handlers
 *
 * Call this function during application startup to register
 * all notification-related event handlers.
 */
export function registerNotificationHandlers(): void {
  // Course version events
  eventBus.on(EVENTS.COURSE_VERSION_PUBLISHED, handleCourseVersionPublished);

  // Certificate events
  eventBus.on(EVENTS.CERTIFICATE_ISSUED, handleCertificateIssued);
  eventBus.on(EVENTS.CERTIFICATE_UPGRADED, handleCertificateUpgraded);

  console.log('Notification event handlers registered');
}

/**
 * Unregister all notification event handlers
 *
 * Call this function during application shutdown or for testing.
 */
export function unregisterNotificationHandlers(): void {
  eventBus.off(EVENTS.COURSE_VERSION_PUBLISHED, handleCourseVersionPublished);
  eventBus.off(EVENTS.CERTIFICATE_ISSUED, handleCertificateIssued);
  eventBus.off(EVENTS.CERTIFICATE_UPGRADED, handleCertificateUpgraded);

  console.log('Notification event handlers unregistered');
}

// Export individual handlers for testing
export {
  handleCourseVersionPublished,
  handleCertificateIssued,
  handleCertificateUpgraded
};
