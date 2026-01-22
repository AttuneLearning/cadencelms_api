import mongoose from 'mongoose';
import Module, {
  IModule,
  ICompletionCriteria,
  IPresentationRules
} from '@/models/academic/Module.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import { ApiError } from '@/utils/ApiError';

interface ListModulesFilters {
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

interface CreateModuleData {
  title: string;
  description?: string;
  prerequisites?: string[];
  completionCriteria?: ICompletionCriteria;
  presentationRules?: IPresentationRules;
  isPublished?: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  estimatedDuration?: number;
  objectives?: string[];
}

interface ModuleResponse {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  prerequisites: string[];
  completionCriteria: ICompletionCriteria;
  presentationRules: IPresentationRules;
  isPublished: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  estimatedDuration: number;
  objectives?: string[];
  order: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  learningUnits?: any[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ListModulesResponse {
  modules: ModuleResponse[];
  pagination: PaginationInfo;
}

export class ModulesService {
  /**
   * List modules for a course with filters and pagination
   */
  static async listModules(
    courseId: string,
    filters: ListModulesFilters
  ): Promise<ListModulesResponse> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { courseId };

    if (filters.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }

    // Parse sort
    const sortField = filters.sort || 'order';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sort: any = { [sortKey]: sortDirection };

    // Execute query
    const [modules, total] = await Promise.all([
      Module.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('prerequisites', 'title'),
      Module.countDocuments(query)
    ]);

    // Format response
    const modulesData: ModuleResponse[] = modules.map((module) =>
      this.formatModuleResponse(module)
    );

    return {
      modules: modulesData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get a single module with populated learning units
   */
  static async getModule(moduleId: string): Promise<ModuleResponse> {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    const module = await Module.findById(moduleId).populate(
      'prerequisites',
      'title'
    );

    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    // Get learning units for this module
    const learningUnits = await LearningUnit.find({ moduleId }).sort({
      sequence: 1
    });

    const response = this.formatModuleResponse(module);
    response.learningUnits = learningUnits.map((lu) => ({
      id: lu._id.toString(),
      title: lu.title,
      description: lu.description,
      type: lu.type,
      category: lu.category,
      isRequired: lu.isRequired,
      isReplayable: lu.isReplayable,
      weight: lu.weight,
      sequence: lu.sequence,
      isActive: lu.isActive,
      estimatedDuration: lu.estimatedDuration
    }));

    return response;
  }

  /**
   * Create a new module for a course
   */
  static async createModule(
    courseId: string,
    data: CreateModuleData,
    createdBy: string
  ): Promise<ModuleResponse> {
    // Validate required fields
    if (!data.title || data.title.trim() === '') {
      throw ApiError.badRequest('Module title is required');
    }

    // Validate prerequisites if provided
    if (data.prerequisites && data.prerequisites.length > 0) {
      const prereqsValid = await this.validatePrerequisitesExist(
        data.prerequisites,
        courseId
      );
      if (!prereqsValid) {
        throw ApiError.badRequest(
          'One or more prerequisites do not exist in this course'
        );
      }

      // Check for cycles
      const noCycles = await this.validatePrerequisites(
        null,
        data.prerequisites,
        courseId
      );
      if (!noCycles) {
        throw ApiError.badRequest(
          'Prerequisites would create a circular dependency'
        );
      }
    }

    // Get next order number
    const moduleCount = await Module.countDocuments({ courseId });
    const order = moduleCount + 1;

    // Set defaults for completionCriteria
    const completionCriteria: ICompletionCriteria = data.completionCriteria || {
      type: 'all_required',
      requireAllExpositions: true
    };

    // Set defaults for presentationRules
    const presentationRules: IPresentationRules = data.presentationRules || {
      presentationMode: 'prescribed',
      repetitionMode: 'none',
      repeatOn: {
        failedAttempt: false,
        belowMastery: false,
        learnerRequest: false
      },
      repeatableCategories: [],
      showAllAvailable: true,
      allowSkip: false
    };

    // Create module
    const module = new Module({
      courseId,
      title: data.title.trim(),
      description: data.description?.trim(),
      prerequisites: data.prerequisites || [],
      completionCriteria,
      presentationRules,
      isPublished: data.isPublished || false,
      availableFrom: data.availableFrom,
      availableUntil: data.availableUntil,
      estimatedDuration: data.estimatedDuration || 0,
      objectives: data.objectives,
      order,
      createdBy
    });

    await module.save();

    return this.formatModuleResponse(module);
  }

  /**
   * Update an existing module
   */
  static async updateModule(
    moduleId: string,
    data: Partial<CreateModuleData>
  ): Promise<ModuleResponse> {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    const module = await Module.findById(moduleId);
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    // Validate prerequisites if provided
    if (data.prerequisites !== undefined) {
      if (data.prerequisites.length > 0) {
        const prereqsValid = await this.validatePrerequisitesExist(
          data.prerequisites,
          module.courseId.toString()
        );
        if (!prereqsValid) {
          throw ApiError.badRequest(
            'One or more prerequisites do not exist in this course'
          );
        }

        // Check for cycles
        const noCycles = await this.validatePrerequisites(
          moduleId,
          data.prerequisites,
          module.courseId.toString()
        );
        if (!noCycles) {
          throw ApiError.badRequest(
            'Prerequisites would create a circular dependency'
          );
        }
      }
      module.prerequisites = data.prerequisites.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }

    // Update fields
    if (data.title !== undefined) module.title = data.title.trim();
    if (data.description !== undefined)
      module.description = data.description?.trim();
    if (data.completionCriteria !== undefined)
      module.completionCriteria = data.completionCriteria;
    if (data.presentationRules !== undefined)
      module.presentationRules = data.presentationRules;
    if (data.isPublished !== undefined) module.isPublished = data.isPublished;
    if (data.availableFrom !== undefined)
      module.availableFrom = data.availableFrom;
    if (data.availableUntil !== undefined)
      module.availableUntil = data.availableUntil;
    if (data.estimatedDuration !== undefined)
      module.estimatedDuration = data.estimatedDuration;
    if (data.objectives !== undefined) module.objectives = data.objectives;

    await module.save();

    return this.formatModuleResponse(module);
  }

  /**
   * Delete a module (soft delete with cascade to learning units)
   */
  static async deleteModule(moduleId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    const module = await Module.findById(moduleId);
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    // Soft delete learning units associated with this module
    await LearningUnit.updateMany({ moduleId }, { isActive: false });

    // Soft delete the module
    await Module.findByIdAndDelete(moduleId);
  }

  /**
   * Reorder modules within a course
   */
  static async reorderModules(
    courseId: string,
    moduleIds: string[]
  ): Promise<void> {
    if (!moduleIds || moduleIds.length === 0) {
      throw ApiError.badRequest('Module IDs array cannot be empty');
    }

    // Get existing modules for the course
    const existingModules = await Module.find({ courseId });
    const existingIds = existingModules.map((m) => m._id.toString());

    // Verify all module IDs match
    if (moduleIds.length !== existingIds.length) {
      throw ApiError.badRequest(
        'Module IDs must match all modules in the course'
      );
    }

    const providedSet = new Set(moduleIds);
    const existingSet = new Set(existingIds);

    for (const id of providedSet) {
      if (!existingSet.has(id)) {
        throw ApiError.badRequest(
          'Module IDs must match all modules in the course'
        );
      }
    }

    // Bulk update orders
    const bulkOps = moduleIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: { order: index + 1 } }
      }
    }));

    await Module.bulkWrite(bulkOps);
  }

  /**
   * Validate that prerequisites don't create cycles
   * Returns true if valid (no cycles), false if invalid (cycles detected)
   */
  static async validatePrerequisites(
    moduleId: string | null,
    prerequisiteIds: string[],
    courseId: string
  ): Promise<boolean> {
    // Empty prerequisites are always valid
    if (!prerequisiteIds || prerequisiteIds.length === 0) {
      return true;
    }

    // A module cannot be its own prerequisite
    if (moduleId && prerequisiteIds.includes(moduleId)) {
      return false;
    }

    // Get all modules in the course
    const allModules = await Module.find({ courseId });

    if (allModules.length === 0) {
      return false;
    }

    // Check if all prerequisites exist in the course
    const moduleMap = new Map<string, any>();
    for (const m of allModules) {
      moduleMap.set(m._id.toString(), m);
    }

    for (const prereqId of prerequisiteIds) {
      if (!moduleMap.has(prereqId)) {
        return false;
      }
    }

    // Build adjacency list for cycle detection
    // If moduleId is null, we're checking for a new module
    // We need to check if adding the prerequisites would create a cycle

    // Create a graph where edges go FROM module TO its prerequisites
    // (i.e., an edge from A to B means B must be completed before A)
    const graph = new Map<string, string[]>();

    for (const m of allModules) {
      const id = m._id.toString();
      const prereqs = m.prerequisites.map((p: any) => p.toString());
      graph.set(id, prereqs);
    }

    // If updating existing module, update its prerequisites in the graph
    if (moduleId) {
      graph.set(moduleId, prerequisiteIds);
    }

    // Use DFS to detect cycles
    // We need to check if any prerequisite can eventually reach back to moduleId
    // (or any of the new prerequisites can reach each other in a cycle)

    if (moduleId) {
      // Check if any prerequisite leads back to moduleId
      for (const prereqId of prerequisiteIds) {
        if (this.canReach(prereqId, moduleId, graph, new Set())) {
          return false;
        }
      }
    } else {
      // For new module, just verify no cycles exist among prerequisites
      // Actually for a new module, since it has no dependents yet,
      // it can have any existing modules as prerequisites without creating cycles
      // The only issue would be if the prerequisites themselves have cycles,
      // but those would have been prevented during their creation
      return true;
    }

    return true;
  }

  /**
   * Helper: Check if there's a path from source to target in the graph
   */
  private static canReach(
    source: string,
    target: string,
    graph: Map<string, string[]>,
    visited: Set<string>
  ): boolean {
    if (source === target) {
      return true;
    }

    if (visited.has(source)) {
      return false;
    }

    visited.add(source);

    const neighbors = graph.get(source) || [];
    for (const neighbor of neighbors) {
      if (this.canReach(neighbor, target, graph, visited)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Helper: Validate prerequisites exist in the course
   */
  private static async validatePrerequisitesExist(
    prerequisiteIds: string[],
    courseId: string
  ): Promise<boolean> {
    const existingModules = await Module.find({
      _id: { $in: prerequisiteIds },
      courseId
    });

    return existingModules.length === prerequisiteIds.length;
  }

  /**
   * Helper: Format module response
   */
  private static formatModuleResponse(module: IModule): ModuleResponse {
    const moduleObj = module.toObject ? module.toObject() : module;

    return {
      id: moduleObj._id.toString(),
      courseId: moduleObj.courseId.toString(),
      title: moduleObj.title,
      description: moduleObj.description,
      prerequisites: moduleObj.prerequisites.map((p: any) =>
        typeof p === 'object' && p._id ? p._id.toString() : p.toString()
      ),
      completionCriteria: moduleObj.completionCriteria,
      presentationRules: moduleObj.presentationRules,
      isPublished: moduleObj.isPublished,
      availableFrom: moduleObj.availableFrom,
      availableUntil: moduleObj.availableUntil,
      estimatedDuration: moduleObj.estimatedDuration,
      objectives: moduleObj.objectives,
      order: moduleObj.order,
      createdBy: moduleObj.createdBy.toString(),
      createdAt: moduleObj.createdAt,
      updatedAt: moduleObj.updatedAt
    };
  }
}
