import Enrollment from '@/models/enrollment/Enrollment.model';
import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import Notification from '@/models/notification/Notification.model';
import { NotificationTemplateService } from '@/services/notification/notificationTemplate.service';

/**
 * Notification windows for access expiry (days before expiration)
 */
const ACCESS_EXPIRY_WINDOWS = [30, 14, 7, 3, 1];

/**
 * Notification windows for certificate expiry (days before expiration)
 */
const CERTIFICATE_EXPIRY_WINDOWS = [60, 30, 14, 7];

interface ExpiryCheckResult {
  sent: number;
  skipped: number;
  errors: number;
}

/**
 * ExpiryNotificationJob
 *
 * Scheduled job that checks for expiring enrollments and certificates,
 * then sends notifications at configured warning intervals.
 *
 * Deduplication: Before sending, checks if a notification already exists
 * with the same userId, type, and matching metadata (daysUntilExpiry + relatedEntity.id).
 */
export class ExpiryNotificationJob {
  /**
   * Check for enrollments with expiring access and send notifications.
   * Checks each configured window (30, 14, 7, 3, 1 days).
   */
  static async checkAccessExpiry(): Promise<ExpiryCheckResult> {
    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const daysUntilExpiry of ACCESS_EXPIRY_WINDOWS) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysUntilExpiry);

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const enrollments = await Enrollment.find({
        status: 'active',
        accessExpiresAt: { $gte: startOfDay, $lt: endOfDay }
      }).lean();

      for (const enrollment of enrollments) {
        try {
          // Deduplication: check if notification already sent
          const existing = await Notification.findOne({
            userId: enrollment.learnerId,
            type: 'access_expiring',
            'relatedEntity.id': enrollment._id,
            'metadata.daysUntilExpiry': daysUntilExpiry
          }).lean();

          if (existing) {
            skipped++;
            continue;
          }

          await NotificationTemplateService.sendAccessExpiringNotification(
            enrollment._id.toString(),
            daysUntilExpiry
          );
          sent++;
        } catch (error) {
          errors++;
          console.error(
            `Failed to send access expiry notification for enrollment ${enrollment._id}:`,
            error
          );
        }
      }
    }

    return { sent, skipped, errors };
  }

  /**
   * Check for certificates with approaching expiration and send notifications.
   * Checks each configured window (60, 30, 14, 7 days).
   */
  static async checkCertificateExpiry(): Promise<ExpiryCheckResult> {
    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const daysUntilExpiry of CERTIFICATE_EXPIRY_WINDOWS) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysUntilExpiry);

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const issuances = await CertificateIssuance.find({
        expiresAt: { $gte: startOfDay, $lt: endOfDay },
        revokedAt: null,
        upgradedToIssuanceId: null
      }).lean();

      for (const issuance of issuances) {
        try {
          // Deduplication: check if notification already sent
          const existing = await Notification.findOne({
            userId: issuance.learnerId,
            type: 'certificate_expiring',
            'relatedEntity.id': issuance._id,
            'metadata.daysUntilExpiry': daysUntilExpiry
          }).lean();

          if (existing) {
            skipped++;
            continue;
          }

          await NotificationTemplateService.sendCertificateExpiringNotification(
            issuance._id.toString(),
            daysUntilExpiry
          );
          sent++;
        } catch (error) {
          errors++;
          console.error(
            `Failed to send certificate expiry notification for issuance ${issuance._id}:`,
            error
          );
        }
      }
    }

    return { sent, skipped, errors };
  }

  /**
   * Run all expiry checks. Intended to be called daily by a cron/scheduler.
   */
  static async run(): Promise<{
    accessExpiry: ExpiryCheckResult;
    certificateExpiry: ExpiryCheckResult;
  }> {
    const accessExpiry = await this.checkAccessExpiry();
    const certificateExpiry = await this.checkCertificateExpiry();

    return { accessExpiry, certificateExpiry };
  }
}
