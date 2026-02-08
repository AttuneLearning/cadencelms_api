import mongoose from 'mongoose';
import ModuleCompletion, { IModuleCompletion } from '@/models/progress/ModuleCompletion.model';
import Module from '@/models/academic/Module.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import ModuleAccess from '@/models/progress/ModuleAccess.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Filters for querying module completions
 */
interface GetCompletionsFilters {
  moduleId?: string;
  isGlobalCompletion?: boolean;
  completedAfter?: Date;
  completedBefore?: Date;
  page?: number;
  limit?: number;
}

/**
 * Pagination result structure
 */
interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Result structure for paginated completion queries
 */
interface CompletionsResult {
  completions: IModuleCompletion[];
  pagination: PaginationResult;
}

/**
 * Input for recording a module completion
 */
interface RecordCompletionInput {
  learnerId: string;
  moduleId: string;
  courseVersionId: string;
  enrollmentId: string;
  score?: number | null;
  isGlobalCompletion?: boolean;
}

/**
 * Course usage information for a module
 */
interface ModuleUsageResult {
  moduleId: string;
  courseVersions: Array<{
    courseVersionId: string;
    canonicalCourseId: string;
    title: string;
    version: number;
    order: number;
    isRequired: boolean;
  }>;
  totalCourses: number;
}

/**
 * ModuleCompletionService
 *
 * Handles global module completion tracking. When a learner completes a module
 * in any course, this service records the completion globally so it can be
 * recognized across all courses containing that module.
 */
export class ModuleCompletionService {
  /**
   * Record a module completion
   *
   * Creates or updates a global completion record for a learner-module pair.
   * If a completion already exists, it is not overwritten (first completion wins).
   *
   * Also updates the ModuleAccess record to reflect completion status.
   */
  static async recordCompletion(input: RecordCompletionInput): Promise<IModuleCompletion> {
    const {
      learnerId,
      moduleId,
      courseVersionId,
      enrollmentId,
      score = null,
      isGlobalCompletion = true
    } = input;

    // Validate module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    const now = new Date();

    // Use upsert to create completion only if it doesn't exist
    // This ensures the first completion is preserved (idempotent)
    const completion = await ModuleCompletion.findOneAndUpdate(
      {
        learnerId: new mongoose.Types.ObjectId(learnerId),
        moduleId: new mongoose.Types.ObjectId(moduleId)
      },
      {
        $setOnInsert: {
          learnerId: new mongoose.Types.ObjectId(learnerId),
          moduleId: new mongoose.Types.ObjectId(moduleId),
          completedInCourseVersionId: new mongoose.Types.ObjectId(courseVersionId),
          completedInEnrollmentId: new mongoose.Types.ObjectId(enrollmentId),
          completedAt: now,
          score,
          isGlobalCompletion
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    // Also update any ModuleAccess records to reflect completion
    await ModuleAccess.updateMany(
      {
        learnerId: new mongoose.Types.ObjectId(learnerId),
        moduleId: new mongoose.Types.ObjectId(moduleId),
        status: { $ne: 'completed' }
      },
      {
        $set: {
          status: 'completed',
          completedAt: now
        }
      }
    );

    return completion;
  }

  /**
   * Get a specific completion for a learner-module pair
   */
  static async getCompletion(learnerId: string, moduleId: string): Promise<IModuleCompletion | null> {
    return ModuleCompletion.findOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      moduleId: new mongoose.Types.ObjectId(moduleId)
    });
  }

  /**
   * Check if a learner has completed a module
   */
  static async hasCompleted(learnerId: string, moduleId: string): Promise<boolean> {
    const count = await ModuleCompletion.countDocuments({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      moduleId: new mongoose.Types.ObjectId(moduleId)
    });
    return count > 0;
  }

  /**
   * Get all module completions for a learner with optional filters
   */
  static async getLearnerCompletions(
    learnerId: string,
    filters: GetCompletionsFilters = {}
  ): Promise<CompletionsResult> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      learnerId: new mongoose.Types.ObjectId(learnerId)
    };

    if (filters.moduleId) {
      query.moduleId = new mongoose.Types.ObjectId(filters.moduleId);
    }

    if (filters.isGlobalCompletion !== undefined) {
      query.isGlobalCompletion = filters.isGlobalCompletion;
    }

    if (filters.completedAfter || filters.completedBefore) {
      query.completedAt = {};
      if (filters.completedAfter) {
        query.completedAt.$gte = filters.completedAfter;
      }
      if (filters.completedBefore) {
        query.completedAt.$lte = filters.completedBefore;
      }
    }

    // Execute query with pagination
    const [completions, total] = await Promise.all([
      ModuleCompletion.find(query)
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('moduleId', 'title description ownerDepartmentId')
        .populate('completedInCourseVersionId', 'title version'),
      ModuleCompletion.countDocuments(query)
    ]);

    return {
      completions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get module completion statistics for a module
   */
  static async getModuleCompletionStats(moduleId: string): Promise<{
    totalCompletions: number;
    globalCompletions: number;
    averageScore: number | null;
  }> {
    const aggregation = await ModuleCompletion.aggregate([
      {
        $match: {
          moduleId: new mongoose.Types.ObjectId(moduleId)
        }
      },
      {
        $group: {
          _id: null,
          totalCompletions: { $sum: 1 },
          globalCompletions: {
            $sum: { $cond: ['$isGlobalCompletion', 1, 0] }
          },
          averageScore: { $avg: '$score' }
        }
      }
    ]);

    if (aggregation.length === 0) {
      return {
        totalCompletions: 0,
        globalCompletions: 0,
        averageScore: null
      };
    }

    return {
      totalCompletions: aggregation[0].totalCompletions,
      globalCompletions: aggregation[0].globalCompletions,
      averageScore: aggregation[0].averageScore
    };
  }

  /**
   * Get all courses using a specific module
   *
   * Returns information about which course versions include this module.
   */
  static async getModuleUsage(moduleId: string): Promise<ModuleUsageResult> {
    // Validate module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    // Find all course versions that include this module
    const courseVersionModules = await CourseVersionModule.find({
      moduleId: new mongoose.Types.ObjectId(moduleId)
    })
      .populate({
        path: 'courseVersionId',
        select: 'canonicalCourseId title version status',
        populate: {
          path: 'canonicalCourseId',
          select: 'code departmentId'
        }
      })
      .sort({ 'courseVersionId.version': -1 });

    const courseVersions = courseVersionModules.map(cvm => {
      const cv = cvm.courseVersionId as any;
      return {
        courseVersionId: cv._id.toString(),
        canonicalCourseId: cv.canonicalCourseId?._id?.toString() || '',
        title: cv.title,
        version: cv.version,
        order: cvm.order,
        isRequired: cvm.isRequired
      };
    });

    return {
      moduleId,
      courseVersions,
      totalCourses: courseVersions.length
    };
  }

  /**
   * Get modules owned by a department
   */
  static async getDepartmentModules(
    departmentId: string,
    filters: { isShared?: boolean; isPublished?: boolean; page?: number; limit?: number } = {}
  ): Promise<{ modules: any[]; pagination: PaginationResult }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: any = {
      ownerDepartmentId: new mongoose.Types.ObjectId(departmentId)
    };

    if (filters.isShared !== undefined) {
      query.isShared = filters.isShared;
    }

    if (filters.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }

    const [modules, total] = await Promise.all([
      Module.find(query)
        .sort({ title: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Module.countDocuments(query)
    ]);

    return {
      modules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get modules available to a department (owned + shared from other departments)
   */
  static async getAvailableModules(
    departmentId: string,
    filters: { isPublished?: boolean; page?: number; limit?: number } = {}
  ): Promise<{ modules: any[]; pagination: PaginationResult }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Available modules are:
    // 1. Modules owned by this department (regardless of isShared)
    // 2. Modules from other departments where isShared = true
    const query: any = {
      $or: [
        { ownerDepartmentId: new mongoose.Types.ObjectId(departmentId) },
        { isShared: true }
      ]
    };

    if (filters.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }

    const [modules, total] = await Promise.all([
      Module.find(query)
        .sort({ title: 1 })
        .skip(skip)
        .limit(limit)
        .populate('ownerDepartmentId', 'name')
        .lean(),
      Module.countDocuments(query)
    ]);

    return {
      modules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Propagate completion to other enrollments
   *
   * When a learner completes a module and the completion is global,
   * this updates ModuleAccess records for other enrollments containing
   * the same module to reflect the completion.
   */
  static async propagateCompletionToEnrollments(
    learnerId: string,
    moduleId: string
  ): Promise<number> {
    const completion = await ModuleCompletion.findOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      moduleId: new mongoose.Types.ObjectId(moduleId),
      isGlobalCompletion: true
    });

    if (!completion) {
      return 0;
    }

    // Update all ModuleAccess records for this learner-module pair
    const result = await ModuleAccess.updateMany(
      {
        learnerId: new mongoose.Types.ObjectId(learnerId),
        moduleId: new mongoose.Types.ObjectId(moduleId),
        status: { $ne: 'completed' }
      },
      {
        $set: {
          status: 'completed',
          completedAt: completion.completedAt
        }
      }
    );

    return result.modifiedCount;
  }

  /**
   * Bulk check completions for multiple modules
   *
   * Returns a map of moduleId -> boolean indicating completion status.
   */
  static async checkBulkCompletions(
    learnerId: string,
    moduleIds: string[]
  ): Promise<Map<string, boolean>> {
    const completions = await ModuleCompletion.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      moduleId: { $in: moduleIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select('moduleId');

    const completedSet = new Set(completions.map(c => c.moduleId.toString()));

    const result = new Map<string, boolean>();
    for (const moduleId of moduleIds) {
      result.set(moduleId, completedSet.has(moduleId));
    }

    return result;
  }
}
