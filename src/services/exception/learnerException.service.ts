import mongoose from 'mongoose';
import LearnerException, {
  ILearnerException,
  ExceptionType
} from '@/models/exception/LearnerException.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import AssessmentAttempt from '@/models/progress/AssessmentAttempt.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Input for creating a learner exception
 */
export interface ICreateExceptionInput {
  enrollmentId: string;
  learnerId: string;
  departmentId: string;
  type: ExceptionType;
  reason: string;
  grantedBy: string;
  expiresAt?: Date | null;
  metadata?: {
    assessmentId?: string;
    additionalAttempts?: number;
    newExpiryDate?: Date;
    moduleId?: string;
    attemptId?: string;
    newGrade?: number;
    contentId?: string;
    contentType?: 'lesson' | 'exercise' | 'module';
  };
}

/**
 * Filters for listing exceptions
 */
export interface IListExceptionsFilters {
  enrollmentId?: string;
  learnerId?: string;
  departmentId?: string;
  type?: ExceptionType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * LearnerExceptionService
 *
 * Manages per-learner exceptions that override standard course rules.
 * All exceptions are audited with grantedBy/revokedBy tracking.
 */
export class LearnerExceptionService {
  /**
   * Create a new learner exception
   */
  static async createException(
    input: ICreateExceptionInput
  ): Promise<ILearnerException> {
    // Validate enrollment exists
    const enrollment = await Enrollment.findById(input.enrollmentId);
    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }

    // Build metadata with ObjectId conversions
    const metadata: Record<string, any> = {};

    if (input.type === 'extra_attempts') {
      if (!input.metadata?.assessmentId) {
        throw ApiError.badRequest('assessmentId is required for extra_attempts exceptions');
      }
      if (!input.metadata?.additionalAttempts) {
        throw ApiError.badRequest('additionalAttempts is required for extra_attempts exceptions');
      }
      metadata.assessmentId = new mongoose.Types.ObjectId(input.metadata.assessmentId);
      metadata.additionalAttempts = input.metadata.additionalAttempts;
    }

    if (input.type === 'extended_access') {
      if (!input.metadata?.newExpiryDate) {
        throw ApiError.badRequest('newExpiryDate is required for extended_access exceptions');
      }
      metadata.newExpiryDate = input.metadata.newExpiryDate;
      metadata.previousExpiryDate = enrollment.accessExpiresAt || null;

      // Update enrollment access expiry
      await Enrollment.findByIdAndUpdate(input.enrollmentId, {
        accessExpiresAt: input.metadata.newExpiryDate,
        $inc: { accessExtensionCount: 1 }
      });
    }

    if (input.type === 'module_unlock') {
      if (!input.metadata?.moduleId) {
        throw ApiError.badRequest('moduleId is required for module_unlock exceptions');
      }
      metadata.moduleId = new mongoose.Types.ObjectId(input.metadata.moduleId);
    }

    if (input.type === 'grade_override') {
      if (!input.metadata?.assessmentId) {
        throw ApiError.badRequest('assessmentId is required for grade_override exceptions');
      }
      if (!input.metadata?.attemptId) {
        throw ApiError.badRequest('attemptId is required for grade_override exceptions');
      }
      if (input.metadata?.newGrade === undefined || input.metadata?.newGrade === null) {
        throw ApiError.badRequest('newGrade is required for grade_override exceptions');
      }

      // Validate attempt exists
      const attempt = await AssessmentAttempt.findById(input.metadata.attemptId);
      if (!attempt) {
        throw ApiError.notFound('Assessment attempt not found');
      }

      const previousGrade = attempt.scoring?.percentageScore ?? null;
      metadata.assessmentId = new mongoose.Types.ObjectId(input.metadata.assessmentId);
      metadata.attemptId = new mongoose.Types.ObjectId(input.metadata.attemptId);
      metadata.previousGrade = previousGrade;
      metadata.newGrade = input.metadata.newGrade;

      // Update the attempt score directly
      await AssessmentAttempt.findByIdAndUpdate(input.metadata.attemptId, {
        'scoring.percentageScore': input.metadata.newGrade,
        'scoring.gradingComplete': true
      });
    }

    if (input.type === 'excuse_content') {
      if (!input.metadata?.contentId) {
        throw ApiError.badRequest('contentId is required for excuse_content exceptions');
      }
      if (!input.metadata?.contentType) {
        throw ApiError.badRequest('contentType is required for excuse_content exceptions');
      }
      metadata.contentId = new mongoose.Types.ObjectId(input.metadata.contentId);
      metadata.contentType = input.metadata.contentType;
    }

    const exception = new LearnerException({
      enrollmentId: new mongoose.Types.ObjectId(input.enrollmentId),
      learnerId: new mongoose.Types.ObjectId(input.learnerId),
      departmentId: new mongoose.Types.ObjectId(input.departmentId),
      type: input.type,
      reason: input.reason,
      grantedBy: new mongoose.Types.ObjectId(input.grantedBy),
      expiresAt: input.expiresAt || null,
      metadata
    });

    await exception.save();
    return exception;
  }

  /**
   * Revoke an existing exception
   */
  static async revokeException(
    exceptionId: string,
    revokedBy: string,
    reason: string
  ): Promise<ILearnerException> {
    if (!mongoose.Types.ObjectId.isValid(exceptionId)) {
      throw ApiError.badRequest('Invalid exception ID');
    }

    const exception = await LearnerException.findById(exceptionId);
    if (!exception) {
      throw ApiError.notFound('Exception not found');
    }

    if (!exception.isActive) {
      throw ApiError.conflict('Exception is already revoked');
    }

    // For extended_access, revert enrollment expiry
    if (exception.type === 'extended_access' && exception.metadata.previousExpiryDate !== undefined) {
      await Enrollment.findByIdAndUpdate(exception.enrollmentId, {
        accessExpiresAt: exception.metadata.previousExpiryDate
      });
    }

    exception.isActive = false;
    exception.revokedAt = new Date();
    exception.revokedBy = new mongoose.Types.ObjectId(revokedBy);
    exception.revokeReason = reason;

    await exception.save();
    return exception;
  }

  /**
   * Get a single exception by ID
   */
  static async getException(exceptionId: string): Promise<ILearnerException> {
    if (!mongoose.Types.ObjectId.isValid(exceptionId)) {
      throw ApiError.badRequest('Invalid exception ID');
    }

    const exception = await LearnerException.findById(exceptionId)
      .populate('learnerId', 'firstName lastName email')
      .populate('grantedBy', 'firstName lastName email')
      .populate('revokedBy', 'firstName lastName email');

    if (!exception) {
      throw ApiError.notFound('Exception not found');
    }

    return exception;
  }

  /**
   * List exceptions with filters and pagination
   */
  static async listExceptions(filters: IListExceptionsFilters): Promise<{
    exceptions: ILearnerException[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: Record<string, any> = {};

    if (filters.enrollmentId) query.enrollmentId = filters.enrollmentId;
    if (filters.learnerId) query.learnerId = filters.learnerId;
    if (filters.departmentId) query.departmentId = filters.departmentId;
    if (filters.type) query.type = filters.type;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [exceptions, total] = await Promise.all([
      LearnerException.find(query)
        .populate('learnerId', 'firstName lastName email')
        .populate('grantedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LearnerException.countDocuments(query)
    ]);

    return {
      exceptions: exceptions as unknown as ILearnerException[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Check if a learner has an active exception of a given type
   */
  static async hasActiveException(
    learnerId: string,
    type: ExceptionType,
    query?: Record<string, any>
  ): Promise<boolean> {
    const filter: Record<string, any> = {
      learnerId,
      type,
      isActive: true
    };

    if (query) {
      Object.assign(filter, query);
    }

    const count = await LearnerException.countDocuments(filter);
    return count > 0;
  }

  /**
   * Get total additional attempts granted for a learner + assessment
   */
  static async getAdditionalAttempts(
    learnerId: string,
    assessmentId: string
  ): Promise<number> {
    const exceptions = await LearnerException.find({
      learnerId,
      type: 'extra_attempts',
      isActive: true,
      'metadata.assessmentId': new mongoose.Types.ObjectId(assessmentId)
    }).lean();

    return exceptions.reduce(
      (sum, ex) => sum + (ex.metadata?.additionalAttempts || 0),
      0
    );
  }

  /**
   * Get the effective expiry date for an enrollment (latest from active exceptions)
   */
  static async getEffectiveExpiryDate(
    enrollmentId: string
  ): Promise<Date | null> {
    const exceptions = await LearnerException.find({
      enrollmentId,
      type: 'extended_access',
      isActive: true
    })
      .sort({ 'metadata.newExpiryDate': -1 })
      .limit(1)
      .lean();

    if (exceptions.length === 0) return null;
    return exceptions[0].metadata?.newExpiryDate || null;
  }

  /**
   * Check if a module is unlocked for a learner via exception
   */
  static async isModuleUnlocked(
    learnerId: string,
    moduleId: string
  ): Promise<boolean> {
    const count = await LearnerException.countDocuments({
      learnerId,
      type: 'module_unlock',
      isActive: true,
      'metadata.moduleId': new mongoose.Types.ObjectId(moduleId)
    });
    return count > 0;
  }

  /**
   * Check if content is excused for a learner in an enrollment
   */
  static async isContentExcused(
    learnerId: string,
    enrollmentId: string,
    contentId: string
  ): Promise<boolean> {
    const count = await LearnerException.countDocuments({
      learnerId,
      enrollmentId,
      type: 'excuse_content',
      isActive: true,
      'metadata.contentId': new mongoose.Types.ObjectId(contentId)
    });
    return count > 0;
  }
}
