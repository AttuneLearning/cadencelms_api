import { Request, Response } from 'express';
import { AccessPolicyService } from '@/services/policy/accessPolicy.service';
import { AccessExtensionService } from '@/services/policy/accessExtension.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

/**
 * Access Policy Controller
 *
 * Handles all access policy and extension request endpoints.
 */

// ============================================================================
// Department Access Policy
// ============================================================================

/**
 * GET /api/v2/departments/:departmentId/access-policy
 * Get department access policy
 */
export const getDepartmentAccessPolicy = asyncHandler(
  async (req: Request, res: Response) => {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const policy = await AccessPolicyService.getDepartmentPolicy(departmentId);

    if (!policy) {
      // Return default policy structure
      res.status(200).json(
        ApiResponse.success({
          departmentId,
          isDefault: true,
          defaultAccessDuration: { type: 'perpetual' },
          allowNewVersionAccess: true,
          newVersionAccessWindow: null,
          allowCertificateUpgrade: true,
          certificateUpgradeWindow: null,
          allowCourseRetakes: true,
          maxRetakesPerCourse: null,
          retakeCooldownDays: 0,
          notifications: {
            notifyBeforeExpiration: true,
            daysBeforeExpirationNotification: 30,
            notifyOnNewVersion: true,
            notifyOnCertificateUpgrade: true,
            notifyAdminOnExtensionRequest: true
          }
        })
      );
      return;
    }

    res.status(200).json(
      ApiResponse.success({
        id: policy._id?.toString(),
        departmentId: policy.departmentId.toString(),
        isDefault: false,
        defaultAccessDuration: policy.defaultAccessDuration,
        allowNewVersionAccess: policy.allowNewVersionAccess,
        newVersionAccessWindow: policy.newVersionAccessWindow ?? null,
        allowCertificateUpgrade: policy.allowCertificateUpgrade,
        certificateUpgradeWindow: policy.certificateUpgradeWindow ?? null,
        allowCourseRetakes: policy.allowCourseRetakes,
        maxRetakesPerCourse: policy.maxRetakesPerCourse ?? null,
        retakeCooldownDays: policy.retakeCooldownDays ?? 0,
        notifications: policy.notifications,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt
      })
    );
  }
);

/**
 * PUT /api/v2/departments/:departmentId/access-policy
 * Create or update department access policy
 */
export const updateDepartmentAccessPolicy = asyncHandler(
  async (req: Request, res: Response) => {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const policy = await AccessPolicyService.upsertDepartmentPolicy(
      departmentId,
      req.body
    );

    res.status(200).json(
      ApiResponse.success(
        {
          id: policy._id?.toString(),
          departmentId: policy.departmentId.toString(),
          defaultAccessDuration: policy.defaultAccessDuration,
          allowNewVersionAccess: policy.allowNewVersionAccess,
          newVersionAccessWindow: policy.newVersionAccessWindow ?? null,
          allowCertificateUpgrade: policy.allowCertificateUpgrade,
          certificateUpgradeWindow: policy.certificateUpgradeWindow ?? null,
          allowCourseRetakes: policy.allowCourseRetakes,
          maxRetakesPerCourse: policy.maxRetakesPerCourse ?? null,
          retakeCooldownDays: policy.retakeCooldownDays ?? 0,
          notifications: policy.notifications,
          createdAt: policy.createdAt,
          updatedAt: policy.updatedAt
        },
        'Department access policy updated successfully'
      )
    );
  }
);

// ============================================================================
// Program Access Override
// ============================================================================

/**
 * GET /api/v2/programs/:programId/access-override
 * Get program access override
 */
export const getProgramAccessOverride = asyncHandler(
  async (req: Request, res: Response) => {
    const { programId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const override = await AccessPolicyService.getProgramOverride(programId);

    if (!override) {
      res.status(200).json(
        ApiResponse.success({
          programId,
          hasOverride: false,
          message: 'No override configured. Department defaults apply.'
        })
      );
      return;
    }

    res.status(200).json(
      ApiResponse.success({
        id: override._id?.toString(),
        programId: override.programId.toString(),
        hasOverride: true,
        accessDuration: override.accessDuration ?? null,
        allowNewVersionAccess: override.allowNewVersionAccess ?? null,
        newVersionAccessWindow: override.newVersionAccessWindow ?? null,
        allowCertificateUpgrade: override.allowCertificateUpgrade ?? null,
        certificateUpgradeWindow: override.certificateUpgradeWindow ?? null,
        allowCourseRetakes: override.allowCourseRetakes ?? null,
        maxRetakesPerCourse: override.maxRetakesPerCourse ?? null,
        retakeCooldownDays: override.retakeCooldownDays ?? null,
        requireSequentialCompletion: override.requireSequentialCompletion,
        notifications: override.notifications ?? null,
        createdAt: override.createdAt,
        updatedAt: override.updatedAt
      })
    );
  }
);

/**
 * PUT /api/v2/programs/:programId/access-override
 * Create or update program access override
 */
export const updateProgramAccessOverride = asyncHandler(
  async (req: Request, res: Response) => {
    const { programId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const override = await AccessPolicyService.upsertProgramOverride(
      programId,
      req.body
    );

    res.status(200).json(
      ApiResponse.success(
        {
          id: override._id?.toString(),
          programId: override.programId.toString(),
          accessDuration: override.accessDuration ?? null,
          allowNewVersionAccess: override.allowNewVersionAccess ?? null,
          newVersionAccessWindow: override.newVersionAccessWindow ?? null,
          allowCertificateUpgrade: override.allowCertificateUpgrade ?? null,
          certificateUpgradeWindow: override.certificateUpgradeWindow ?? null,
          allowCourseRetakes: override.allowCourseRetakes ?? null,
          maxRetakesPerCourse: override.maxRetakesPerCourse ?? null,
          retakeCooldownDays: override.retakeCooldownDays ?? null,
          requireSequentialCompletion: override.requireSequentialCompletion,
          notifications: override.notifications ?? null,
          createdAt: override.createdAt,
          updatedAt: override.updatedAt
        },
        'Program access override updated successfully'
      )
    );
  }
);

/**
 * DELETE /api/v2/programs/:programId/access-override
 * Delete program access override
 */
export const deleteProgramAccessOverride = asyncHandler(
  async (req: Request, res: Response) => {
    const { programId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    await AccessPolicyService.deleteProgramOverride(programId);

    res.status(200).json(
      ApiResponse.success(
        { programId },
        'Program access override deleted successfully'
      )
    );
  }
);

/**
 * GET /api/v2/programs/:programId/effective-policy
 * Get effective policy for a program (merged department + program overrides)
 */
export const getEffectivePolicy = asyncHandler(
  async (req: Request, res: Response) => {
    const { programId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const policy = await AccessPolicyService.getEffectivePolicy(programId);

    res.status(200).json(ApiResponse.success(policy));
  }
);

// ============================================================================
// Learner Version Access
// ============================================================================

/**
 * GET /api/v2/learners/:learnerId/version-access
 * Get learner's version access information
 */
export const getLearnerVersionAccess = asyncHandler(
  async (req: Request, res: Response) => {
    const { learnerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    const versionAccess = await AccessExtensionService.getLearnerVersionAccess(
      learnerId
    );

    res.status(200).json(
      ApiResponse.success({
        learnerId,
        enrollments: versionAccess
      })
    );
  }
);

// ============================================================================
// Extension Requests
// ============================================================================

/**
 * POST /api/v2/enrollments/:enrollmentId/extension-request
 * Request access extension for an enrollment (learner action)
 */
export const createExtensionRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { enrollmentId } = req.params;
    const userId = (req as any).user.userId;

    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }

    const request = await AccessExtensionService.createExtensionRequest(
      userId,
      {
        enrollmentId,
        requestedExtension: req.body.requestedExtension,
        requestReason: req.body.requestReason
      }
    );

    res.status(201).json(
      ApiResponse.success(
        {
          id: request._id?.toString(),
          enrollmentId: request.enrollmentId.toString(),
          learnerId: request.learnerId.toString(),
          requestedAt: request.requestedAt,
          requestedExtension: request.requestedExtension,
          requestReason: request.requestReason,
          status: request.status
        },
        'Extension request submitted successfully'
      )
    );
  }
);

/**
 * POST /api/v2/enrollments/:enrollmentId/extend
 * Directly extend enrollment access (admin action)
 */
export const extendEnrollmentAccess = asyncHandler(
  async (req: Request, res: Response) => {
    const { enrollmentId } = req.params;
    const userId = (req as any).user.userId;

    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }

    const result = await AccessExtensionService.extendEnrollmentAccess(
      enrollmentId,
      userId,
      {
        extension: req.body.extension,
        reason: req.body.reason
      }
    );

    res.status(200).json(
      ApiResponse.success(result, 'Enrollment access extended successfully')
    );
  }
);

/**
 * GET /api/v2/access-extension-requests
 * List extension requests with filters
 */
export const listExtensionRequests = asyncHandler(
  async (req: Request, res: Response) => {
    const filters = {
      departmentId: req.query.departmentId as string,
      learnerId: req.query.learnerId as string,
      enrollmentId: req.query.enrollmentId as string,
      status: req.query.status as 'pending' | 'approved' | 'denied',
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      sort: req.query.sort as string
    };

    const result = await AccessExtensionService.listExtensionRequests(filters);

    res.status(200).json(
      ApiResponse.success({
        requests: result.requests.map(r => ({
          id: r._id?.toString(),
          enrollmentId: r.enrollmentId.toString(),
          learnerId: r.learnerId,
          departmentId: r.departmentId.toString(),
          requestedAt: r.requestedAt,
          requestedExtension: r.requestedExtension,
          requestReason: r.requestReason,
          status: r.status,
          reviewedBy: r.reviewedBy,
          reviewedAt: r.reviewedAt,
          reviewNotes: r.reviewNotes,
          grantedExtension: r.grantedExtension,
          newExpirationDate: r.newExpirationDate,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt
        })),
        pagination: result.pagination
      })
    );
  }
);

/**
 * GET /api/v2/access-extension-requests/:requestId
 * Get extension request by ID
 */
export const getExtensionRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw ApiError.badRequest('Invalid request ID');
    }

    const request = await AccessExtensionService.getExtensionRequest(requestId);

    res.status(200).json(
      ApiResponse.success({
        id: request._id?.toString(),
        enrollmentId: request.enrollmentId.toString(),
        learnerId: request.learnerId,
        departmentId: request.departmentId.toString(),
        requestedAt: request.requestedAt,
        requestedExtension: request.requestedExtension,
        requestReason: request.requestReason,
        status: request.status,
        reviewedBy: request.reviewedBy,
        reviewedAt: request.reviewedAt,
        reviewNotes: request.reviewNotes,
        grantedExtension: request.grantedExtension,
        newExpirationDate: request.newExpirationDate,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      })
    );
  }
);

/**
 * PATCH /api/v2/access-extension-requests/:requestId
 * Review extension request (approve or deny)
 */
export const reviewExtensionRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const userId = (req as any).user.userId;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw ApiError.badRequest('Invalid request ID');
    }

    const request = await AccessExtensionService.reviewExtensionRequest(
      requestId,
      userId,
      {
        status: req.body.status,
        reviewNotes: req.body.reviewNotes,
        grantedExtension: req.body.grantedExtension
      }
    );

    const statusMessage =
      req.body.status === 'approved'
        ? 'Extension request approved'
        : 'Extension request denied';

    res.status(200).json(
      ApiResponse.success(
        {
          id: request._id?.toString(),
          enrollmentId: request.enrollmentId.toString(),
          status: request.status,
          reviewedBy: request.reviewedBy?.toString(),
          reviewedAt: request.reviewedAt,
          reviewNotes: request.reviewNotes,
          grantedExtension: request.grantedExtension,
          newExpirationDate: request.newExpirationDate
        },
        statusMessage
      )
    );
  }
);
