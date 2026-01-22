import mongoose from 'mongoose';
import ModuleAccess, { IModuleAccess, ModuleAccessStatus } from '@/models/progress/ModuleAccess.model';
import { ApiError } from '@/utils/ApiError';

interface GetAccessByModuleFilters {
  hasStartedLearningUnit?: boolean;
  status?: ModuleAccessStatus;
  page?: number;
  limit?: number;
}

interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface AccessByModuleResult {
  accessRecords: IModuleAccess[];
  pagination: PaginationResult;
}

interface AccessSummary {
  totalModules: number;
  totalAccess: number;
  accessedOnly: number;
  inProgress: number;
  completed: number;
  dropOffRate: number;
}

export class ModuleAccessService {
  /**
   * Record or update module access (upsert behavior)
   * Creates a new access record on first access, increments counter on subsequent access
   */
  static async recordAccess(
    learnerId: string,
    moduleId: string,
    enrollmentId: string,
    courseId: string
  ): Promise<IModuleAccess> {
    const now = new Date();

    const accessRecord = await ModuleAccess.findOneAndUpdate(
      {
        learnerId: new mongoose.Types.ObjectId(learnerId),
        moduleId: new mongoose.Types.ObjectId(moduleId)
      },
      {
        $setOnInsert: {
          learnerId: new mongoose.Types.ObjectId(learnerId),
          moduleId: new mongoose.Types.ObjectId(moduleId),
          enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
          courseId: new mongoose.Types.ObjectId(courseId),
          firstAccessedAt: now,
          hasStartedLearningUnit: false,
          learningUnitsCompleted: 0,
          learningUnitsTotal: 0,
          status: 'accessed'
        },
        $set: {
          lastAccessedAt: now
        },
        $inc: {
          accessCount: 1
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    return accessRecord;
  }

  /**
   * Get all module access records for an enrollment
   */
  static async getAccessByEnrollment(enrollmentId: string): Promise<IModuleAccess[]> {
    const accessRecords = await ModuleAccess.find({
      enrollmentId: new mongoose.Types.ObjectId(enrollmentId)
    }).sort({ lastAccessedAt: -1 });

    return accessRecords;
  }

  /**
   * Get all learner access records for a module with filters and pagination
   */
  static async getAccessByModule(
    moduleId: string,
    filters: GetAccessByModuleFilters
  ): Promise<AccessByModuleResult> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      moduleId: new mongoose.Types.ObjectId(moduleId)
    };

    if (filters.hasStartedLearningUnit !== undefined) {
      query.hasStartedLearningUnit = filters.hasStartedLearningUnit;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    // Execute query with pagination
    const [accessRecords, total] = await Promise.all([
      ModuleAccess.find(query).sort({ lastAccessedAt: -1 }).skip(skip).limit(limit),
      ModuleAccess.countDocuments(query)
    ]);

    return {
      accessRecords,
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
   * Get access summary for a course
   * Returns aggregated statistics about module access
   */
  static async getAccessSummary(courseId: string): Promise<AccessSummary> {
    const aggregationResult = await ModuleAccess.aggregate([
      {
        $match: {
          courseId: new mongoose.Types.ObjectId(courseId)
        }
      },
      {
        $facet: {
          totalModules: [
            {
              $group: {
                _id: '$moduleId'
              }
            },
            {
              $count: 'count'
            }
          ],
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          dropOffCount: [
            {
              $match: {
                hasStartedLearningUnit: false
              }
            },
            {
              $count: 'count'
            }
          ],
          totalAccess: [
            {
              $count: 'count'
            }
          ]
        }
      }
    ]);

    const result = aggregationResult[0];

    const totalModules = result.totalModules[0]?.count || 0;
    const totalAccess = result.totalAccess[0]?.count || 0;
    const dropOffCount = result.dropOffCount[0]?.count || 0;

    // Parse status counts
    const statusCounts: Record<string, number> = {};
    for (const item of result.statusCounts) {
      statusCounts[item._id] = item.count;
    }

    const accessedOnly = statusCounts['accessed'] || 0;
    const inProgress = statusCounts['in_progress'] || 0;
    const completed = statusCounts['completed'] || 0;

    // Calculate drop-off rate (percentage of learners who accessed but never started)
    const dropOffRate = totalAccess > 0 ? dropOffCount / totalAccess : 0;

    return {
      totalModules,
      totalAccess,
      accessedOnly,
      inProgress,
      completed,
      dropOffRate
    };
  }

  /**
   * Mark that a learner has started a learning unit
   * Updates status to 'in_progress' and sets firstLearningUnitStartedAt
   */
  static async markLearningUnitStarted(moduleAccessId: string): Promise<IModuleAccess> {
    if (!mongoose.Types.ObjectId.isValid(moduleAccessId)) {
      throw ApiError.notFound('Module access record not found');
    }

    const accessRecord = await ModuleAccess.findById(moduleAccessId);

    if (!accessRecord) {
      throw ApiError.notFound('Module access record not found');
    }

    // Only set firstLearningUnitStartedAt if not already set
    if (!accessRecord.hasStartedLearningUnit) {
      accessRecord.hasStartedLearningUnit = true;
      accessRecord.firstLearningUnitStartedAt = new Date();
    }

    // Update status to in_progress if currently accessed
    if (accessRecord.status === 'accessed') {
      accessRecord.status = 'in_progress';
    }

    await accessRecord.save();

    return accessRecord;
  }

  /**
   * Update learning unit progress
   * Updates the count of completed and total learning units
   */
  static async updateProgress(
    moduleAccessId: string,
    completed: number,
    total: number
  ): Promise<IModuleAccess> {
    if (!mongoose.Types.ObjectId.isValid(moduleAccessId)) {
      throw ApiError.notFound('Module access record not found');
    }

    // Validate progress values
    if (completed < 0 || total < 0) {
      throw ApiError.badRequest('Progress values must be non-negative');
    }

    if (completed > total) {
      throw ApiError.badRequest('Completed units cannot exceed total units');
    }

    const accessRecord = await ModuleAccess.findById(moduleAccessId);

    if (!accessRecord) {
      throw ApiError.notFound('Module access record not found');
    }

    accessRecord.learningUnitsCompleted = completed;
    accessRecord.learningUnitsTotal = total;

    // Auto-update status and hasStartedLearningUnit when progress is recorded
    if (!accessRecord.hasStartedLearningUnit) {
      accessRecord.hasStartedLearningUnit = true;
      accessRecord.firstLearningUnitStartedAt = new Date();
    }

    if (accessRecord.status === 'accessed') {
      accessRecord.status = 'in_progress';
    }

    await accessRecord.save();

    return accessRecord;
  }

  /**
   * Mark module as completed
   * Updates status to 'completed' and sets completedAt timestamp
   */
  static async markCompleted(moduleAccessId: string): Promise<IModuleAccess> {
    if (!mongoose.Types.ObjectId.isValid(moduleAccessId)) {
      throw ApiError.notFound('Module access record not found');
    }

    const accessRecord = await ModuleAccess.findById(moduleAccessId);

    if (!accessRecord) {
      throw ApiError.notFound('Module access record not found');
    }

    // Set completedAt only if not already completed
    if (accessRecord.status !== 'completed') {
      accessRecord.status = 'completed';
      accessRecord.completedAt = new Date();
    }

    // Ensure hasStartedLearningUnit is true when completing
    if (!accessRecord.hasStartedLearningUnit) {
      accessRecord.hasStartedLearningUnit = true;
      accessRecord.firstLearningUnitStartedAt = accessRecord.completedAt;
    }

    await accessRecord.save();

    return accessRecord;
  }
}
