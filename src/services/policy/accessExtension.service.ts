import mongoose from 'mongoose';
import AccessExtensionRequest, {
  IAccessExtensionRequest,
  IRequestedExtension,
  ExtensionRequestStatus
} from '@/models/policy/AccessExtensionRequest.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import Program from '@/models/academic/Program.model';
import { ApiError } from '@/utils/ApiError';
import { AccessPolicyService } from './accessPolicy.service';

/**
 * Extension Request Create Data
 */
export interface IExtensionRequestCreateData {
  enrollmentId: string;
  requestedExtension: IRequestedExtension;
  requestReason?: string;
}

/**
 * Extension Request Review Data
 */
export interface IExtensionRequestReviewData {
  status: 'approved' | 'denied';
  reviewNotes?: string;
  /** If different from requested (only for approved) */
  grantedExtension?: IRequestedExtension;
}

/**
 * Extension Request List Filters
 */
export interface IExtensionRequestListFilters {
  departmentId?: string;
  learnerId?: string;
  enrollmentId?: string;
  status?: ExtensionRequestStatus;
  page?: number;
  limit?: number;
  sort?: string;
}

/**
 * Direct Extend Data (admin action without request)
 */
export interface IDirectExtendData {
  extension: IRequestedExtension;
  reason: string;
}

/**
 * Learner Version Access Info
 */
export interface ILearnerVersionAccess {
  enrollmentId: string;
  programId: string;
  programName: string;
  currentVersion?: string;
  availableVersions: {
    versionId: string;
    version: string;
    canAccess: boolean;
    accessExpiresAt?: Date;
    upgradeAvailable: boolean;
  }[];
  accessExpiresAt?: Date;
  canRequestExtension: boolean;
}

/**
 * Access Extension Service
 *
 * Handles extension requests, reviews, and direct access extensions.
 */
export class AccessExtensionService {
  /**
   * Create an extension request
   *
   * @param learnerId - Learner making the request
   * @param data - Request data
   * @returns Created extension request
   */
  static async createExtensionRequest(
    learnerId: string,
    data: IExtensionRequestCreateData
  ): Promise<IAccessExtensionRequest> {
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }
    if (!mongoose.Types.ObjectId.isValid(data.enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }

    // Verify enrollment exists and belongs to learner
    const enrollment = await Enrollment.findById(data.enrollmentId);
    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }
    if (enrollment.learnerId.toString() !== learnerId) {
      throw ApiError.forbidden('Cannot request extension for another learner\'s enrollment');
    }

    // Cannot request extension for already completed/withdrawn enrollments
    if (['completed', 'graduated', 'withdrawn'].includes(enrollment.status)) {
      throw ApiError.unprocessable(
        `Cannot request extension for enrollment with status '${enrollment.status}'`
      );
    }

    // Get program to find department
    const program = await Program.findById(enrollment.programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Check if there's already a pending request for this enrollment
    const existingRequest = await AccessExtensionRequest.findOne({
      enrollmentId: data.enrollmentId,
      status: 'pending'
    });
    if (existingRequest) {
      throw ApiError.conflict(
        'There is already a pending extension request for this enrollment'
      );
    }

    // Validate extension request
    this.validateRequestedExtension(data.requestedExtension);

    // Create the request
    const request = new AccessExtensionRequest({
      enrollmentId: data.enrollmentId,
      learnerId,
      departmentId: program.departmentId,
      requestedAt: new Date(),
      requestedExtension: data.requestedExtension,
      requestReason: data.requestReason,
      status: 'pending'
    });

    await request.save();

    return request;
  }

  /**
   * Review an extension request (approve or deny)
   *
   * @param requestId - Request ID
   * @param reviewerId - Staff member reviewing the request
   * @param data - Review data
   * @returns Updated extension request
   */
  static async reviewExtensionRequest(
    requestId: string,
    reviewerId: string,
    data: IExtensionRequestReviewData
  ): Promise<IAccessExtensionRequest> {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw ApiError.badRequest('Invalid request ID');
    }
    if (!mongoose.Types.ObjectId.isValid(reviewerId)) {
      throw ApiError.badRequest('Invalid reviewer ID');
    }

    // Get the request
    const request = await AccessExtensionRequest.findById(requestId);
    if (!request) {
      throw ApiError.notFound('Extension request not found');
    }

    // Cannot review already reviewed requests
    if (request.status !== 'pending') {
      throw ApiError.unprocessable(
        `Cannot review request with status '${request.status}'`
      );
    }

    // Get the enrollment
    const enrollment = await Enrollment.findById(request.enrollmentId);
    if (!enrollment) {
      throw ApiError.notFound('Associated enrollment not found');
    }

    // Update the request
    request.status = data.status;
    request.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
    request.reviewedAt = new Date();
    request.reviewNotes = data.reviewNotes;

    if (data.status === 'approved') {
      // Determine extension to grant
      const extensionToGrant = data.grantedExtension || request.requestedExtension;
      this.validateRequestedExtension(extensionToGrant);
      request.grantedExtension = extensionToGrant;

      // Calculate new expiration date
      const currentExpiration = enrollment.accessExpiresAt || new Date();
      const newExpiration = this.calculateNewExpiration(
        currentExpiration,
        extensionToGrant
      );
      request.newExpirationDate = newExpiration || undefined;

      // Update the enrollment
      enrollment.accessExpiresAt = newExpiration || undefined;
      enrollment.accessExtendedAt = new Date();
      enrollment.accessExtensionReason = 'Extension request approved';
      enrollment.accessExtensionCount = (enrollment.accessExtensionCount || 0) + 1;

      // If enrollment was expired, reactivate it
      if (enrollment.status === 'expired') {
        enrollment.status = 'active';
      }

      await enrollment.save();
    }

    await request.save();

    return request;
  }

  /**
   * Directly extend enrollment access (admin action)
   *
   * @param enrollmentId - Enrollment ID
   * @param adminId - Admin performing the action
   * @param data - Extension data
   * @returns Updated enrollment
   */
  static async extendEnrollmentAccess(
    enrollmentId: string,
    adminId: string,
    data: IDirectExtendData
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw ApiError.badRequest('Invalid admin ID');
    }

    // Validate extension
    this.validateRequestedExtension(data.extension);

    // Get the enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }

    // Cannot extend completed/withdrawn enrollments
    if (['completed', 'graduated', 'withdrawn'].includes(enrollment.status)) {
      throw ApiError.unprocessable(
        `Cannot extend access for enrollment with status '${enrollment.status}'`
      );
    }

    // Calculate new expiration date
    const currentExpiration = enrollment.accessExpiresAt || new Date();
    const newExpiration = this.calculateNewExpiration(currentExpiration, data.extension);

    // Update the enrollment
    enrollment.accessExpiresAt = newExpiration || undefined;
    enrollment.accessExtendedAt = new Date();
    enrollment.accessExtensionReason = data.reason;
    enrollment.accessExtensionCount = (enrollment.accessExtensionCount || 0) + 1;

    // If enrollment was expired, reactivate it
    if (enrollment.status === 'expired') {
      enrollment.status = 'active';
    }

    await enrollment.save();

    return {
      id: enrollment._id.toString(),
      accessExpiresAt: enrollment.accessExpiresAt,
      accessExtendedAt: enrollment.accessExtendedAt,
      accessExtensionReason: enrollment.accessExtensionReason,
      accessExtensionCount: enrollment.accessExtensionCount,
      status: enrollment.status
    };
  }

  /**
   * List extension requests with filters
   *
   * @param filters - Filter options
   * @returns Paginated list of extension requests
   */
  static async listExtensionRequests(
    filters: IExtensionRequestListFilters
  ): Promise<{
    requests: IAccessExtensionRequest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filters.departmentId) {
      if (!mongoose.Types.ObjectId.isValid(filters.departmentId)) {
        throw ApiError.badRequest('Invalid department ID');
      }
      query.departmentId = new mongoose.Types.ObjectId(filters.departmentId);
    }

    if (filters.learnerId) {
      if (!mongoose.Types.ObjectId.isValid(filters.learnerId)) {
        throw ApiError.badRequest('Invalid learner ID');
      }
      query.learnerId = new mongoose.Types.ObjectId(filters.learnerId);
    }

    if (filters.enrollmentId) {
      if (!mongoose.Types.ObjectId.isValid(filters.enrollmentId)) {
        throw ApiError.badRequest('Invalid enrollment ID');
      }
      query.enrollmentId = new mongoose.Types.ObjectId(filters.enrollmentId);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    // Sort
    const sortField = filters.sort || '-requestedAt';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sort: any = { [sortKey]: sortOrder };

    // Execute query
    const [requests, total] = await Promise.all([
      AccessExtensionRequest.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('learnerId', 'email')
        .populate('reviewedBy', 'email')
        .lean(),
      AccessExtensionRequest.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      requests: requests as unknown as IAccessExtensionRequest[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get extension request by ID
   *
   * @param requestId - Request ID
   * @returns Extension request
   */
  static async getExtensionRequest(
    requestId: string
  ): Promise<IAccessExtensionRequest> {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw ApiError.badRequest('Invalid request ID');
    }

    const request = await AccessExtensionRequest.findById(requestId)
      .populate('learnerId', 'email')
      .populate('reviewedBy', 'email')
      .lean();

    if (!request) {
      throw ApiError.notFound('Extension request not found');
    }

    return request as unknown as IAccessExtensionRequest;
  }

  /**
   * Get learner's version access information
   *
   * Shows what course versions a learner can access and any available upgrades.
   *
   * @param learnerId - Learner ID
   * @returns Version access information for all enrollments
   */
  static async getLearnerVersionAccess(
    learnerId: string
  ): Promise<ILearnerVersionAccess[]> {
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    // Get all active enrollments for the learner
    const enrollments = await Enrollment.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      status: { $in: ['active', 'pending', 'suspended'] }
    }).populate('programId');

    const versionAccessInfo: ILearnerVersionAccess[] = [];

    for (const enrollment of enrollments) {
      const program = enrollment.programId as any;
      if (!program) continue;

      // Get effective policy for potential future use
      // (e.g., determining version upgrade eligibility)
      await AccessPolicyService.getEffectivePolicy(program._id.toString());

      // Determine if learner can request extension
      const canRequestExtension = enrollment.accessExpiresAt != null;

      // Note: Course versions are tracked separately - this is placeholder
      // Real implementation would query CourseVersion model
      const accessInfo: ILearnerVersionAccess = {
        enrollmentId: enrollment._id.toString(),
        programId: program._id.toString(),
        programName: program.name,
        availableVersions: [], // Would be populated from CourseVersion queries
        accessExpiresAt: enrollment.accessExpiresAt,
        canRequestExtension
      };

      versionAccessInfo.push(accessInfo);
    }

    return versionAccessInfo;
  }

  /**
   * Calculate new expiration date based on extension
   */
  private static calculateNewExpiration(
    currentExpiration: Date,
    extension: IRequestedExtension
  ): Date | null {
    if (extension.type === 'perpetual') {
      return null;
    }

    const newDate = new Date(currentExpiration);

    switch (extension.type) {
      case 'days':
        newDate.setDate(newDate.getDate() + (extension.value || 0));
        return newDate;

      case 'months':
        newDate.setMonth(newDate.getMonth() + (extension.value || 0));
        return newDate;

      default:
        return currentExpiration;
    }
  }

  /**
   * Validate requested extension
   */
  private static validateRequestedExtension(extension: IRequestedExtension): void {
    if (!['days', 'months', 'perpetual'].includes(extension.type)) {
      throw ApiError.badRequest(
        `Invalid extension type '${extension.type}'. Must be 'days', 'months', or 'perpetual'`
      );
    }

    if (extension.type !== 'perpetual') {
      if (extension.value === undefined || extension.value === null) {
        throw ApiError.badRequest(
          `Extension value is required for type '${extension.type}'`
        );
      }
      if (extension.value < 1) {
        throw ApiError.badRequest('Extension value must be at least 1');
      }
    }
  }
}
