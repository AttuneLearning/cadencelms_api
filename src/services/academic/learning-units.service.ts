import mongoose from 'mongoose';
import LearningUnit from '@/models/content/LearningUnit.model';
import Module from '@/models/academic/Module.model';
import { ApiError } from '@/utils/ApiError';

interface ListLearningUnitsFilters {
  category?: 'exposition' | 'practice' | 'assessment';
  isRequired?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

interface CreateLearningUnitData {
  title: string;
  description?: string;
  category: 'exposition' | 'practice' | 'assessment';
  contentType: string;
  contentId?: string;
  isRequired?: boolean;
  isReplayable?: boolean;
  weight?: number;
  estimatedDuration?: number;
}

interface UpdateLearningUnitData {
  title?: string;
  description?: string;
  category?: 'exposition' | 'practice' | 'assessment';
  contentType?: string;
  contentId?: string;
  isRequired?: boolean;
  isReplayable?: boolean;
  weight?: number;
  estimatedDuration?: number;
}

interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface LearningUnitResponse {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  category: string;
  contentType: string;
  contentId?: string;
  isRequired: boolean;
  isReplayable: boolean;
  weight: number;
  sequence: number;
  estimatedDuration?: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LearningUnitsService {
  /**
   * List learning units for a module with filters and pagination
   */
  static async listLearningUnits(
    moduleId: string,
    filters: ListLearningUnitsFilters
  ): Promise<{ learningUnits: LearningUnitResponse[]; pagination: PaginationResult }> {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      moduleId: new mongoose.Types.ObjectId(moduleId),
      isActive: true
    };

    // Apply category filter
    if (filters.category) {
      query.category = filters.category;
    }

    // Apply isRequired filter
    if (filters.isRequired !== undefined) {
      query.isRequired = filters.isRequired;
    }

    // Parse sort
    let sortField = 'sequence';
    let sortDirection: 1 | -1 = 1;

    if (filters.sort) {
      sortDirection = filters.sort.startsWith('-') ? -1 : 1;
      sortField = filters.sort.replace(/^-/, '');
    }

    const sortObj: any = { [sortField]: sortDirection };

    // Execute query
    const [learningUnits, total] = await Promise.all([
      LearningUnit.find(query).sort(sortObj).skip(skip).limit(limit),
      LearningUnit.countDocuments(query)
    ]);

    // Format response
    const learningUnitsData: LearningUnitResponse[] = learningUnits.map((unit) => ({
      id: unit._id.toString(),
      moduleId: unit.moduleId.toString(),
      title: unit.title,
      description: unit.description,
      category: unit.category,
      contentType: unit.type,
      contentId: unit.contentId?.toString(),
      isRequired: unit.isRequired,
      isReplayable: unit.isReplayable,
      weight: unit.weight,
      sequence: unit.sequence,
      estimatedDuration: unit.estimatedDuration,
      isActive: unit.isActive,
      createdBy: unit.createdBy?.toString(),
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt
    }));

    return {
      learningUnits: learningUnitsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get a single learning unit by ID
   */
  static async getLearningUnit(learningUnitId: string): Promise<LearningUnitResponse> {
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.badRequest('Invalid learning unit ID');
    }

    const learningUnit = await LearningUnit.findById(learningUnitId);

    if (!learningUnit || !learningUnit.isActive) {
      throw ApiError.notFound('Learning unit not found');
    }

    return {
      id: learningUnit._id.toString(),
      moduleId: learningUnit.moduleId.toString(),
      title: learningUnit.title,
      description: learningUnit.description,
      category: learningUnit.category,
      contentType: learningUnit.type,
      contentId: learningUnit.contentId?.toString(),
      isRequired: learningUnit.isRequired,
      isReplayable: learningUnit.isReplayable,
      weight: learningUnit.weight,
      sequence: learningUnit.sequence,
      estimatedDuration: learningUnit.estimatedDuration,
      isActive: learningUnit.isActive,
      createdBy: learningUnit.createdBy?.toString(),
      createdAt: learningUnit.createdAt,
      updatedAt: learningUnit.updatedAt
    };
  }

  /**
   * Create a new learning unit for a module
   */
  static async createLearningUnit(
    moduleId: string,
    data: CreateLearningUnitData,
    createdBy: string
  ): Promise<LearningUnitResponse> {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    // Verify module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    // Get the next sequence number
    const maxSequenceUnit = await LearningUnit.findOne({
      moduleId: new mongoose.Types.ObjectId(moduleId),
      isActive: true
    }).sort({ sequence: -1 });

    const nextSequence = maxSequenceUnit ? maxSequenceUnit.sequence + 1 : 1;

    // Create the learning unit
    const learningUnit = await LearningUnit.create({
      moduleId: new mongoose.Types.ObjectId(moduleId),
      title: data.title,
      description: data.description,
      type: data.contentType,
      contentId: data.contentId ? new mongoose.Types.ObjectId(data.contentId) : undefined,
      category: data.category,
      isRequired: data.isRequired !== undefined ? data.isRequired : true,
      isReplayable: data.isReplayable !== undefined ? data.isReplayable : false,
      weight: data.weight || 0,
      sequence: nextSequence,
      estimatedDuration: data.estimatedDuration,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(createdBy)
    });

    return {
      id: learningUnit._id.toString(),
      moduleId: learningUnit.moduleId.toString(),
      title: learningUnit.title,
      description: learningUnit.description,
      category: learningUnit.category,
      contentType: learningUnit.type,
      contentId: learningUnit.contentId?.toString(),
      isRequired: learningUnit.isRequired,
      isReplayable: learningUnit.isReplayable,
      weight: learningUnit.weight,
      sequence: learningUnit.sequence,
      estimatedDuration: learningUnit.estimatedDuration,
      isActive: learningUnit.isActive,
      createdBy: learningUnit.createdBy?.toString(),
      createdAt: learningUnit.createdAt,
      updatedAt: learningUnit.updatedAt
    };
  }

  /**
   * Update a learning unit
   */
  static async updateLearningUnit(
    learningUnitId: string,
    data: UpdateLearningUnitData
  ): Promise<LearningUnitResponse> {
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.badRequest('Invalid learning unit ID');
    }

    const learningUnit = await LearningUnit.findById(learningUnitId);

    if (!learningUnit || !learningUnit.isActive) {
      throw ApiError.notFound('Learning unit not found');
    }

    // Update only provided fields
    if (data.title !== undefined) learningUnit.title = data.title;
    if (data.description !== undefined) learningUnit.description = data.description;
    if (data.category !== undefined) learningUnit.category = data.category;
    if (data.contentType !== undefined) learningUnit.type = data.contentType as any;
    if (data.contentId !== undefined) {
      learningUnit.contentId = data.contentId
        ? new mongoose.Types.ObjectId(data.contentId)
        : undefined;
    }
    if (data.isRequired !== undefined) learningUnit.isRequired = data.isRequired;
    if (data.isReplayable !== undefined) learningUnit.isReplayable = data.isReplayable;
    if (data.weight !== undefined) learningUnit.weight = data.weight;
    if (data.estimatedDuration !== undefined) learningUnit.estimatedDuration = data.estimatedDuration;

    await learningUnit.save();

    return {
      id: learningUnit._id.toString(),
      moduleId: learningUnit.moduleId.toString(),
      title: learningUnit.title,
      description: learningUnit.description,
      category: learningUnit.category,
      contentType: learningUnit.type,
      contentId: learningUnit.contentId?.toString(),
      isRequired: learningUnit.isRequired,
      isReplayable: learningUnit.isReplayable,
      weight: learningUnit.weight,
      sequence: learningUnit.sequence,
      estimatedDuration: learningUnit.estimatedDuration,
      isActive: learningUnit.isActive,
      createdBy: learningUnit.createdBy?.toString(),
      createdAt: learningUnit.createdAt,
      updatedAt: learningUnit.updatedAt
    };
  }

  /**
   * Delete a learning unit (soft delete)
   */
  static async deleteLearningUnit(learningUnitId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.badRequest('Invalid learning unit ID');
    }

    const learningUnit = await LearningUnit.findById(learningUnitId);

    if (!learningUnit || !learningUnit.isActive) {
      throw ApiError.notFound('Learning unit not found');
    }

    learningUnit.isActive = false;
    await learningUnit.save();
  }

  /**
   * Reorder learning units within a module
   */
  static async reorderLearningUnits(moduleId: string, learningUnitIds: string[]): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    // Handle empty array case
    if (learningUnitIds.length === 0) {
      // Verify there are no active learning units in the module
      const activeCount = await LearningUnit.countDocuments({
        moduleId: new mongoose.Types.ObjectId(moduleId),
        isActive: true
      });

      if (activeCount > 0) {
        throw ApiError.badRequest('Must include all active learning units in the reorder');
      }

      return;
    }

    // Validate all IDs
    for (const id of learningUnitIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw ApiError.badRequest('Invalid learning unit ID in reorder list');
      }
    }

    // Get all active learning units in the module
    const moduleLearningUnits = await LearningUnit.find({
      moduleId: new mongoose.Types.ObjectId(moduleId),
      isActive: true
    });

    const moduleUnitIds = moduleLearningUnits.map((u) => u._id.toString());

    // Verify all provided IDs belong to this module
    for (const id of learningUnitIds) {
      if (!moduleUnitIds.includes(id)) {
        throw ApiError.badRequest('One or more learning units do not belong to this module');
      }
    }

    // Verify all module learning units are included
    if (learningUnitIds.length !== moduleLearningUnits.length) {
      throw ApiError.badRequest('Must include all active learning units in the reorder');
    }

    // Update sequences
    const bulkOps = learningUnitIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: { sequence: index + 1 } }
      }
    }));

    await LearningUnit.bulkWrite(bulkOps);
  }

  /**
   * Move a learning unit to another module
   */
  static async moveLearningUnit(
    learningUnitId: string,
    targetModuleId: string
  ): Promise<LearningUnitResponse> {
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.badRequest('Invalid learning unit ID');
    }

    if (!mongoose.Types.ObjectId.isValid(targetModuleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    // Get the learning unit
    const learningUnit = await LearningUnit.findById(learningUnitId);

    if (!learningUnit || !learningUnit.isActive) {
      throw ApiError.notFound('Learning unit not found');
    }

    // Check if already in target module
    if (learningUnit.moduleId.toString() === targetModuleId) {
      throw ApiError.badRequest('Learning unit is already in this module');
    }

    // Verify target module exists
    const targetModule = await Module.findById(targetModuleId);
    if (!targetModule) {
      throw ApiError.notFound('Target module not found');
    }

    const sourceModuleId = learningUnit.moduleId;

    // Get the next sequence number in target module
    const maxSequenceUnit = await LearningUnit.findOne({
      moduleId: new mongoose.Types.ObjectId(targetModuleId),
      isActive: true
    }).sort({ sequence: -1 });

    const nextSequence = maxSequenceUnit ? maxSequenceUnit.sequence + 1 : 1;

    // Update the learning unit
    learningUnit.moduleId = new mongoose.Types.ObjectId(targetModuleId);
    learningUnit.sequence = nextSequence;
    await learningUnit.save();

    // Re-sequence remaining units in source module
    const remainingUnits = await LearningUnit.find({
      moduleId: sourceModuleId,
      isActive: true
    }).sort({ sequence: 1 });

    if (remainingUnits.length > 0) {
      const bulkOps = remainingUnits.map((unit, index) => ({
        updateOne: {
          filter: { _id: unit._id },
          update: { $set: { sequence: index + 1 } }
        }
      }));

      await LearningUnit.bulkWrite(bulkOps);
    }

    return {
      id: learningUnit._id.toString(),
      moduleId: learningUnit.moduleId.toString(),
      title: learningUnit.title,
      description: learningUnit.description,
      category: learningUnit.category,
      contentType: learningUnit.type,
      contentId: learningUnit.contentId?.toString(),
      isRequired: learningUnit.isRequired,
      isReplayable: learningUnit.isReplayable,
      weight: learningUnit.weight,
      sequence: learningUnit.sequence,
      estimatedDuration: learningUnit.estimatedDuration,
      isActive: learningUnit.isActive,
      createdBy: learningUnit.createdBy?.toString(),
      createdAt: learningUnit.createdAt,
      updatedAt: learningUnit.updatedAt
    };
  }
}
