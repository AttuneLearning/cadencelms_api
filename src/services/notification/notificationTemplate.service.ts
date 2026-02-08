import { NotificationService, ICreateNotificationInput } from './notification.service';
import Enrollment from '@/models/enrollment/Enrollment.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import CredentialGroup from '@/models/certificate/CredentialGroup.model';
import AccessExtensionRequest from '@/models/policy/AccessExtensionRequest.model';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

// Type alias for notification creation input
type CreateNotificationInput = ICreateNotificationInput;

/**
 * Default notification expiration (30 days from creation)
 */
const DEFAULT_EXPIRATION_DAYS = 30;

/**
 * Create an expiration date from now
 */
function createExpirationDate(days: number = DEFAULT_EXPIRATION_DAYS): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * NotificationTemplateService
 *
 * Provides template-based notification creation for common notification scenarios.
 * This service handles the logic of fetching related entities and creating
 * properly formatted notifications.
 */
export class NotificationTemplateService {
  /**
   * Send notification when learner's access is about to expire
   *
   * @param enrollmentId - The enrollment that is expiring
   * @param daysUntilExpiry - Number of days until access expires
   */
  static async sendAccessExpiringNotification(
    enrollmentId: string,
    daysUntilExpiry: number
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('programId', 'name')
      .lean();

    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }

    const program = enrollment.programId as any;
    const programName = program?.name || 'your program';

    // Determine priority based on urgency
    let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';
    if (daysUntilExpiry <= 1) {
      priority = 'urgent';
    } else if (daysUntilExpiry <= 3) {
      priority = 'high';
    } else if (daysUntilExpiry <= 7) {
      priority = 'normal';
    } else {
      priority = 'low';
    }

    const notificationData: CreateNotificationInput = {
      userId: enrollment.learnerId.toString(),
      departmentId: (enrollment as any).departmentId?.toString() || enrollment.programId.toString(),
      type: 'access_expiring',
      title: 'Course Access Expiring Soon',
      message: `Your access to ${programName} will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Please complete any remaining coursework or request an extension.`,
      priority,
      relatedEntity: {
        type: 'enrollment',
        id: enrollmentId
      },
      expiresAt: createExpirationDate(),
      metadata: {
        daysUntilExpiry,
        expiresAt: enrollment.accessExpiresAt,
        programName
      }
    };

    await NotificationService.createNotification(notificationData);
  }

  /**
   * Send notification when learner's access has expired
   *
   * @param enrollmentId - The enrollment that has expired
   */
  static async sendAccessExpiredNotification(
    enrollmentId: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('programId', 'name')
      .lean();

    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }

    const program = enrollment.programId as any;
    const programName = program?.name || 'your program';

    const notificationData: CreateNotificationInput = {
      userId: enrollment.learnerId.toString(),
      departmentId: (enrollment as any).departmentId?.toString() || enrollment.programId.toString(),
      type: 'access_expired',
      title: 'Course Access Expired',
      message: `Your access to ${programName} has expired. You can request an extension to continue your coursework.`,
      priority: 'high',
      relatedEntity: {
        type: 'enrollment',
        id: enrollmentId
      },
      expiresAt: createExpirationDate(),
      metadata: {
        expiredAt: enrollment.accessExpiresAt,
        programName
      }
    };

    await NotificationService.createNotification(notificationData);
  }

  /**
   * Send notification when a new course version is available
   *
   * @param learnerId - The learner to notify
   * @param courseVersionId - The new course version
   * @param departmentId - The department for scoping
   */
  static async sendNewVersionNotification(
    learnerId: string,
    courseVersionId: string,
    departmentId: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }
    if (!mongoose.Types.ObjectId.isValid(courseVersionId)) {
      throw ApiError.badRequest('Invalid course version ID');
    }

    const courseVersion = await CourseVersion.findById(courseVersionId).lean();
    if (!courseVersion) {
      throw ApiError.notFound('Course version not found');
    }

    const notificationData: CreateNotificationInput = {
      userId: learnerId,
      departmentId,
      type: 'new_version_available',
      title: 'New Course Version Available',
      message: `A new version (v${courseVersion.version}) of "${courseVersion.title}" is now available. Check with your administrator about upgrading your enrollment.`,
      priority: 'normal',
      relatedEntity: {
        type: 'courseVersion',
        id: courseVersionId
      },
      expiresAt: createExpirationDate(),
      metadata: {
        courseVersionId,
        courseTitle: courseVersion.title,
        version: courseVersion.version,
        canonicalCourseId: courseVersion.canonicalCourseId.toString()
      }
    };

    await NotificationService.createNotification(notificationData);
  }

  /**
   * Send notification when a certificate upgrade is available
   *
   * @param learnerId - The learner to notify
   * @param credentialGroupId - The credential group with an upgrade
   * @param departmentId - The department for scoping
   */
  static async sendCertificateUpgradeNotification(
    learnerId: string,
    credentialGroupId: string,
    departmentId: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }
    if (!mongoose.Types.ObjectId.isValid(credentialGroupId)) {
      throw ApiError.badRequest('Invalid credential group ID');
    }

    const credentialGroup = await CredentialGroup.findById(credentialGroupId).lean();
    if (!credentialGroup) {
      throw ApiError.notFound('Credential group not found');
    }

    const notificationData: CreateNotificationInput = {
      userId: learnerId,
      departmentId,
      type: 'certificate_upgrade_available',
      title: 'Certificate Upgrade Available',
      message: `An upgrade is available for your "${credentialGroup.name}" certificate. Review the new requirements to upgrade your credential.`,
      priority: 'normal',
      relatedEntity: {
        type: 'certificate',
        id: credentialGroupId
      },
      expiresAt: createExpirationDate(),
      metadata: {
        credentialGroupId,
        credentialGroupName: credentialGroup.name,
        credentialGroupCode: credentialGroup.code
      }
    };

    await NotificationService.createNotification(notificationData);
  }

  /**
   * Send notification when a certificate is issued
   *
   * @param issuanceId - The certificate issuance ID
   */
  static async sendCertificateIssuedNotification(
    issuanceId: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(issuanceId)) {
      throw ApiError.badRequest('Invalid issuance ID');
    }

    const issuance = await CertificateIssuance.findById(issuanceId)
      .populate('certificateDefinitionId', 'title version')
      .populate('credentialGroupId', 'name code departmentId')
      .lean();

    if (!issuance) {
      throw ApiError.notFound('Certificate issuance not found');
    }

    const definition = issuance.certificateDefinitionId as any;
    const credentialGroup = issuance.credentialGroupId as any;

    const notificationData: CreateNotificationInput = {
      userId: issuance.learnerId.toString(),
      departmentId: credentialGroup?.departmentId?.toString() || issuance.credentialGroupId.toString(),
      type: 'certificate_issued',
      title: 'Certificate Issued',
      message: `Congratulations! Your "${definition?.title || 'certificate'}" has been issued. Verification code: ${issuance.verificationCode}`,
      priority: 'normal',
      relatedEntity: {
        type: 'certificateIssuance',
        id: issuanceId
      },
      expiresAt: createExpirationDate(60), // Keep certificate notifications longer
      metadata: {
        issuanceId,
        verificationCode: issuance.verificationCode,
        certificateTitle: definition?.title,
        credentialGroupName: credentialGroup?.name,
        issuedAt: issuance.issuedAt,
        expiresAt: issuance.expiresAt
      }
    };

    await NotificationService.createNotification(notificationData);
  }

  /**
   * Send notification when a certificate is about to expire
   *
   * @param issuanceId - The certificate issuance ID
   * @param daysUntilExpiry - Number of days until the certificate expires
   */
  static async sendCertificateExpiringNotification(
    issuanceId: string,
    daysUntilExpiry: number
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(issuanceId)) {
      throw ApiError.badRequest('Invalid issuance ID');
    }

    const issuance = await CertificateIssuance.findById(issuanceId)
      .populate('certificateDefinitionId', 'title')
      .populate('credentialGroupId', 'name departmentId')
      .lean();

    if (!issuance) {
      throw ApiError.notFound('Certificate issuance not found');
    }

    const definition = issuance.certificateDefinitionId as any;
    const credentialGroup = issuance.credentialGroupId as any;

    // Determine priority based on urgency
    let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';
    if (daysUntilExpiry <= 7) {
      priority = 'urgent';
    } else if (daysUntilExpiry <= 14) {
      priority = 'high';
    } else if (daysUntilExpiry <= 30) {
      priority = 'normal';
    } else {
      priority = 'low';
    }

    const notificationData: CreateNotificationInput = {
      userId: issuance.learnerId.toString(),
      departmentId: credentialGroup?.departmentId?.toString() || issuance.credentialGroupId.toString(),
      type: 'certificate_expiring',
      title: 'Certificate Expiring Soon',
      message: `Your "${definition?.title || 'certificate'}" will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Consider renewing your certification.`,
      priority,
      relatedEntity: {
        type: 'certificateIssuance',
        id: issuanceId
      },
      expiresAt: createExpirationDate(),
      metadata: {
        issuanceId,
        verificationCode: issuance.verificationCode,
        certificateTitle: definition?.title,
        daysUntilExpiry,
        expiresAt: issuance.expiresAt
      }
    };

    await NotificationService.createNotification(notificationData);
  }

  /**
   * Send notification when an extension request is approved
   *
   * @param requestId - The extension request ID
   */
  static async sendExtensionApprovedNotification(
    requestId: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw ApiError.badRequest('Invalid request ID');
    }

    const request = await AccessExtensionRequest.findById(requestId)
      .populate('enrollmentId')
      .lean();

    if (!request) {
      throw ApiError.notFound('Extension request not found');
    }

    // Format the granted extension
    let extensionText = '';
    if (request.grantedExtension) {
      if (request.grantedExtension.type === 'perpetual') {
        extensionText = 'perpetual access';
      } else {
        const value = request.grantedExtension.value || 0;
        extensionText = `${value} ${request.grantedExtension.type}`;
      }
    }

    const notificationData: CreateNotificationInput = {
      userId: request.learnerId.toString(),
      departmentId: request.departmentId.toString(),
      type: 'extension_approved',
      title: 'Access Extension Approved',
      message: `Your access extension request has been approved${extensionText ? `. You have been granted ${extensionText}` : ''}.${request.newExpirationDate ? ` New access end date: ${new Date(request.newExpirationDate).toLocaleDateString()}.` : ''}`,
      priority: 'normal',
      relatedEntity: {
        type: 'extensionRequest',
        id: requestId
      },
      expiresAt: createExpirationDate(),
      metadata: {
        requestId,
        enrollmentId: request.enrollmentId.toString(),
        grantedExtension: request.grantedExtension,
        newExpirationDate: request.newExpirationDate,
        reviewNotes: request.reviewNotes
      }
    };

    await NotificationService.createNotification(notificationData);
  }

  /**
   * Send notification when an extension request is denied
   *
   * @param requestId - The extension request ID
   * @param reason - The reason for denial (optional, uses reviewNotes if not provided)
   */
  static async sendExtensionDeniedNotification(
    requestId: string,
    reason?: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw ApiError.badRequest('Invalid request ID');
    }

    const request = await AccessExtensionRequest.findById(requestId).lean();

    if (!request) {
      throw ApiError.notFound('Extension request not found');
    }

    const denialReason = reason || request.reviewNotes || 'No reason provided';

    const notificationData: CreateNotificationInput = {
      userId: request.learnerId.toString(),
      departmentId: request.departmentId.toString(),
      type: 'extension_denied',
      title: 'Access Extension Request Denied',
      message: `Your access extension request has been denied. Reason: ${denialReason}`,
      priority: 'normal',
      relatedEntity: {
        type: 'extensionRequest',
        id: requestId
      },
      expiresAt: createExpirationDate(),
      metadata: {
        requestId,
        enrollmentId: request.enrollmentId.toString(),
        requestedExtension: request.requestedExtension,
        reason: denialReason
      }
    };

    await NotificationService.createNotification(notificationData);
  }

  /**
   * Notify all affected learners when a course version is published
   *
   * This finds all learners enrolled in older versions of the course
   * and sends them a new_version_available notification.
   *
   * @param courseVersionId - The newly published course version
   * @param canonicalCourseId - The canonical course ID
   * @param departmentId - The department for scoping
   */
  static async notifyLearnersOfNewVersion(
    courseVersionId: string,
    canonicalCourseId: string,
    departmentId: string
  ): Promise<{ notifiedCount: number }> {
    // Find all previous versions of this course
    const previousVersions = await CourseVersion.find({
      canonicalCourseId: new mongoose.Types.ObjectId(canonicalCourseId),
      _id: { $ne: new mongoose.Types.ObjectId(courseVersionId) },
      status: 'published'
    }).select('_id').lean();

    if (previousVersions.length === 0) {
      return { notifiedCount: 0 };
    }

    // Find all active enrollments for previous versions
    // TODO: Filter by courseVersionId when enrollment structure supports it
    // For now, notify all active enrollments about the new version
    const enrollments = await Enrollment.find({
      status: 'active'
    }).select('learnerId').lean();

    let notifiedCount = 0;

    for (const enrollment of enrollments) {
      try {
        await this.sendNewVersionNotification(
          enrollment.learnerId.toString(),
          courseVersionId,
          departmentId
        );
        notifiedCount++;
      } catch (error) {
        // Log error but continue notifying other learners
        console.error(`Failed to notify learner ${enrollment.learnerId}:`, error);
      }
    }

    return { notifiedCount };
  }
}
