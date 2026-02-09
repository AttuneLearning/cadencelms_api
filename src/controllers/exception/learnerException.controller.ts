import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { LearnerExceptionService } from '@/services/exception/learnerException.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import Enrollment from '@/models/enrollment/Enrollment.model';
import Program from '@/models/academic/Program.model';

/**
 * POST /api/v2/enrollments/:enrollmentId/exceptions
 * Create a learner exception for an enrollment
 */
export const createException = asyncHandler(
  async (req: Request, res: Response) => {
    const { enrollmentId } = req.params;
    const userId = (req as any).user.userId;

    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }

    // Look up enrollment to get learnerId, then program for departmentId
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }

    const program = await Program.findById(enrollment.programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    const exception = await LearnerExceptionService.createException({
      enrollmentId,
      learnerId: enrollment.learnerId.toString(),
      departmentId: program.departmentId.toString(),
      type: req.body.type,
      reason: req.body.reason,
      grantedBy: userId,
      expiresAt: req.body.expiresAt || null,
      metadata: req.body.metadata
    });

    res.status(201).json(
      ApiResponse.created(exception, 'Exception created successfully')
    );
  }
);

/**
 * GET /api/v2/enrollments/:enrollmentId/exceptions
 * List exceptions for an enrollment
 */
export const listExceptions = asyncHandler(
  async (req: Request, res: Response) => {
    const { enrollmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }

    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined;

    const result = await LearnerExceptionService.listExceptions({
      enrollmentId,
      type: req.query.type as any,
      isActive,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    });

    res.status(200).json(
      ApiResponse.paginated(result.exceptions, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      })
    );
  }
);

/**
 * GET /api/v2/exceptions/:exceptionId
 * Get a single exception by ID
 */
export const getException = asyncHandler(
  async (req: Request, res: Response) => {
    const { exceptionId } = req.params;

    const exception = await LearnerExceptionService.getException(exceptionId);

    res.status(200).json(
      ApiResponse.success(exception)
    );
  }
);

/**
 * PUT /api/v2/exceptions/:exceptionId/revoke
 * Revoke an exception
 */
export const revokeException = asyncHandler(
  async (req: Request, res: Response) => {
    const { exceptionId } = req.params;
    const userId = (req as any).user.userId;

    const exception = await LearnerExceptionService.revokeException(
      exceptionId,
      userId,
      req.body.reason
    );

    res.status(200).json(
      ApiResponse.success(exception, 'Exception revoked successfully')
    );
  }
);
