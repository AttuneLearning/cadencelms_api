import mongoose from 'mongoose';
import Module, {
  IModule,
  ICompletionCriteria,
  IPresentationRules
} from '@/models/academic/Module.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import LearningUnitQuestion from '@/models/content/LearningUnitQuestion.model';
import QuestionBank from '@/models/assessment/QuestionBank.model';
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
  ownerDepartmentId: string;
  isShared: boolean;
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
  learningUnits?: LearningUnitResponse[];
}

interface LearningUnitResponse {
  id: string;
  title: string;
  description?: string;
  type: string;
  category: string;
  isRequired: boolean;
  isReplayable: boolean;
  weight: number;
  sequence: number;
  isActive: boolean;
  estimatedDuration?: number;
  linkedQuestionCount: number;
  linkedQuestionIds: string[];
  questionBankIds: string[];
  questionBanks: Array<{
    id: string;
    name: string | null;
  }>;
  questionsEndpoint: string | null;
  usesLinkedQuestions: boolean;
}

interface LearningUnitLinkMeta {
  questionIds: string[];
  bankIds: string[];
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
   * List modules for a course (via CourseVersionModule join table)
   *
   * Modules are now department-owned and linked to courses via CourseVersionModule.
   * This method finds the current published version of the course and returns
   * its associated modules.
   */
  static async listModules(
    courseId: string,
    filters: ListModulesFilters
  ): Promise<ListModulesResponse> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Find the canonical course to get the current published version
    const canonicalCourse = await CanonicalCourse.findById(courseId);
    if (!canonicalCourse) {
      throw ApiError.notFound('Course not found');
    }

    // Get the current published version or latest draft
    const versionId = canonicalCourse.currentPublishedVersionId || canonicalCourse.latestDraftVersionId;
    if (!versionId) {
      // No versions yet, return empty list
      return {
        modules: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }

    // Get module IDs from CourseVersionModule
    const courseVersionModules = await CourseVersionModule.find({
      courseVersionId: versionId
    }).sort({ order: 1 });

    const moduleIds = courseVersionModules.map(cvm => cvm.moduleId);

    // Build query for modules
    const query: any = { _id: { $in: moduleIds } };

    if (filters.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }

    // Get total count
    const total = await Module.countDocuments(query);

    // Get ALL modules (no pagination here - we'll paginate after ordering)
    const modules = await Module.find(query).populate('prerequisites', 'title');

    // Order modules according to CourseVersionModule order
    const moduleMap = new Map(modules.map(m => [m._id.toString(), m]));
    const orderedModules: IModule[] = [];
    const cvmOrderMap = new Map(courseVersionModules.map(cvm => [cvm.moduleId.toString(), cvm.order]));

    for (const cvm of courseVersionModules) {
      const module = moduleMap.get(cvm.moduleId.toString());
      if (module) {
        orderedModules.push(module);
      }
    }

    // Apply sort if requested (sort by title, etc.)
    if (filters.sort) {
      const sortField = filters.sort.startsWith('-') ? filters.sort.slice(1) : filters.sort;
      const sortOrder = filters.sort.startsWith('-') ? -1 : 1;

      if (sortField === 'title') {
        orderedModules.sort((a, b) => {
          const comparison = a.title.localeCompare(b.title);
          return sortOrder * comparison;
        });
      }
      // Default is order (already sorted by CVM order above)
    }

    // Apply pagination AFTER ordering
    const paginatedModules = orderedModules.slice(skip, skip + limit);

    // Fetch learning units for all paginated modules in a single query
    const paginatedModuleIds = paginatedModules.map(m => m._id);
    const allLearningUnits = await LearningUnit.find({
      moduleId: { $in: paginatedModuleIds }
    }).sort({ sequence: 1 });

    // Build question/bank metadata keyed by learningUnitId
    const learningUnitMeta = await this.buildLearningUnitLinkMeta(allLearningUnits);

    // Group learning units by module ID
    const lusByModule = new Map<string, typeof allLearningUnits>();
    for (const lu of allLearningUnits) {
      const key = lu.moduleId.toString();
      if (!lusByModule.has(key)) {
        lusByModule.set(key, []);
      }
      lusByModule.get(key)!.push(lu);
    }

    // Format response
    const modulesData: ModuleResponse[] = paginatedModules.map((module) => {
      const response = this.formatModuleResponse(module);
      // Use the CourseVersionModule order
      response.order = cvmOrderMap.get(module._id.toString()) || module.order;
      // Attach learning units
      const moduleLUs = lusByModule.get(module._id.toString()) || [];
      response.learningUnits = moduleLUs.map((lu) =>
        this.formatLearningUnitResponse(lu, learningUnitMeta)
      );
      return response;
    });

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
    const learningUnitMeta = await this.buildLearningUnitLinkMeta(learningUnits);

    const response = this.formatModuleResponse(module);
    response.learningUnits = learningUnits.map((lu) =>
      this.formatLearningUnitResponse(lu, learningUnitMeta)
    );

    return response;
  }

  /**
   * Create a new module for a course
   *
   * Creates a department-owned module and links it to the course's
   * current draft version via CourseVersionModule.
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

    // Find the canonical course to get the department
    const canonicalCourse = await CanonicalCourse.findById(courseId);
    if (!canonicalCourse) {
      throw ApiError.notFound('Course not found');
    }

    const departmentId = canonicalCourse.departmentId;

    // Validate prerequisites if provided (they should exist in the same department)
    if (data.prerequisites && data.prerequisites.length > 0) {
      const prereqsValid = await this.validatePrerequisitesExist(
        data.prerequisites,
        departmentId.toString()
      );
      if (!prereqsValid) {
        throw ApiError.badRequest(
          'One or more prerequisites do not exist in this department'
        );
      }
    }

    // Get next order number for modules in this department
    const moduleCount = await Module.countDocuments({ ownerDepartmentId: departmentId });
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

    // Create module (now department-owned)
    const module = new Module({
      ownerDepartmentId: departmentId,
      isShared: false,
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

    // Link to course's draft version (if one exists)
    if (canonicalCourse.latestDraftVersionId) {
      const cvmCount = await CourseVersionModule.countDocuments({
        courseVersionId: canonicalCourse.latestDraftVersionId
      });

      await CourseVersionModule.create({
        courseVersionId: canonicalCourse.latestDraftVersionId,
        moduleId: module._id,
        order: cvmCount + 1,
        isRequired: true,
        availableFrom: data.availableFrom || null,
        availableUntil: data.availableUntil || null
      });
    }

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
          module.ownerDepartmentId.toString()
        );
        if (!prereqsValid) {
          throw ApiError.badRequest(
            'One or more prerequisites do not exist in this department'
          );
        }

        // Check for cycles
        const noCycles = await this.validatePrerequisites(
          moduleId,
          data.prerequisites,
          module.ownerDepartmentId.toString()
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

    // Remove from any CourseVersionModules
    await CourseVersionModule.deleteMany({ moduleId });

    // Soft delete the module
    await Module.findByIdAndDelete(moduleId);
  }

  /**
   * Reorder modules within a course version
   */
  static async reorderModules(
    courseId: string,
    moduleIds: string[]
  ): Promise<void> {
    if (!moduleIds || moduleIds.length === 0) {
      throw ApiError.badRequest('Module IDs array cannot be empty');
    }

    // Find the canonical course to get the current version
    const canonicalCourse = await CanonicalCourse.findById(courseId);
    if (!canonicalCourse) {
      throw ApiError.notFound('Course not found');
    }

    const versionId = canonicalCourse.latestDraftVersionId || canonicalCourse.currentPublishedVersionId;
    if (!versionId) {
      throw ApiError.badRequest('Course has no versions');
    }

    // Get existing CourseVersionModules
    const existingCVMs = await CourseVersionModule.find({ courseVersionId: versionId });
    const existingIds = existingCVMs.map((m) => m.moduleId.toString());

    // Verify all module IDs match
    if (moduleIds.length !== existingIds.length) {
      throw ApiError.badRequest(
        'Module IDs must match all modules in the course version'
      );
    }

    const providedSet = new Set(moduleIds);
    const existingSet = new Set(existingIds);

    for (const id of providedSet) {
      if (!existingSet.has(id)) {
        throw ApiError.badRequest(
          'Module IDs must match all modules in the course version'
        );
      }
    }

    // Bulk update orders in CourseVersionModule
    const bulkOps = moduleIds.map((id, index) => ({
      updateOne: {
        filter: {
          courseVersionId: versionId,
          moduleId: new mongoose.Types.ObjectId(id)
        },
        update: { $set: { order: index + 1 } }
      }
    }));

    await CourseVersionModule.bulkWrite(bulkOps);
  }

  /**
   * Validate that prerequisites don't create cycles
   * Returns true if valid (no cycles), false if invalid (cycles detected)
   */
  static async validatePrerequisites(
    moduleId: string | null,
    prerequisiteIds: string[],
    departmentId: string
  ): Promise<boolean> {
    // Empty prerequisites are always valid
    if (!prerequisiteIds || prerequisiteIds.length === 0) {
      return true;
    }

    // A module cannot be its own prerequisite
    if (moduleId && prerequisiteIds.includes(moduleId)) {
      return false;
    }

    // Get all modules in the department
    const allModules = await Module.find({ ownerDepartmentId: departmentId });

    if (allModules.length === 0) {
      return false;
    }

    // Check if all prerequisites exist in the department
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
    if (moduleId) {
      for (const prereqId of prerequisiteIds) {
        if (this.canReach(prereqId, moduleId, graph, new Set())) {
          return false;
        }
      }
    } else {
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
   * Helper: Validate prerequisites exist in the department
   */
  private static async validatePrerequisitesExist(
    prerequisiteIds: string[],
    departmentId: string
  ): Promise<boolean> {
    const existingModules = await Module.find({
      _id: { $in: prerequisiteIds },
      ownerDepartmentId: departmentId
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
      ownerDepartmentId: moduleObj.ownerDepartmentId.toString(),
      isShared: moduleObj.isShared,
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

  /**
   * Build question-link metadata for a set of learning units.
   *
   * The UI can use this to drive assessment/exercise experiences from canonical
   * LearningUnitQuestion links (instead of legacy content.quizData assumptions).
   */
  private static async buildLearningUnitLinkMeta(
    learningUnits: any[]
  ): Promise<{
    byLearningUnitId: Map<string, LearningUnitLinkMeta>;
    bankNamesById: Map<string, string>;
  }> {
    const byLearningUnitId = new Map<string, LearningUnitLinkMeta>();
    const bankNamesById = new Map<string, string>();

    const learningUnitIds = learningUnits.map(lu => lu._id);
    if (learningUnitIds.length === 0) {
      return { byLearningUnitId, bankNamesById };
    }

    const links = await LearningUnitQuestion.find({
      learningUnitId: { $in: learningUnitIds }
    });

    const linksSorted = [...links].sort((a: any, b: any) => {
      const aSeq = typeof a.sequence === 'number' ? a.sequence : 0;
      const bSeq = typeof b.sequence === 'number' ? b.sequence : 0;
      return aSeq - bSeq;
    });

    const bankIdSet = new Set<string>();

    for (const link of linksSorted as any[]) {
      const luId = link.learningUnitId.toString();
      if (!byLearningUnitId.has(luId)) {
        byLearningUnitId.set(luId, { questionIds: [], bankIds: [] });
      }

      const meta = byLearningUnitId.get(luId)!;
      const questionId = link.questionId?.toString();
      if (questionId && !meta.questionIds.includes(questionId)) {
        meta.questionIds.push(questionId);
      }

      const bankId = link.bankId?.toString();
      if (bankId && !meta.bankIds.includes(bankId)) {
        meta.bankIds.push(bankId);
        bankIdSet.add(bankId);
      }
    }

    if (bankIdSet.size > 0) {
      const bankIds = Array.from(bankIdSet).map(id => new mongoose.Types.ObjectId(id));
      const banks = await QuestionBank.find(
        { _id: { $in: bankIds } },
        { name: 1 }
      );

      for (const bank of banks as any[]) {
        bankNamesById.set(bank._id.toString(), bank.name);
      }
    }

    return { byLearningUnitId, bankNamesById };
  }

  private static formatLearningUnitResponse(
    lu: any,
    meta: {
      byLearningUnitId: Map<string, LearningUnitLinkMeta>;
      bankNamesById: Map<string, string>;
    }
  ): LearningUnitResponse {
    const luId = lu._id.toString();
    const luMeta = meta.byLearningUnitId.get(luId) || { questionIds: [], bankIds: [] };
    const usesLinkedQuestions = lu.type === 'assessment' || lu.type === 'exercise';

    return {
      id: luId,
      title: lu.title,
      description: lu.description,
      type: lu.type,
      category: lu.category,
      isRequired: lu.isRequired,
      isReplayable: lu.isReplayable,
      weight: lu.weight,
      sequence: lu.sequence,
      isActive: lu.isActive,
      estimatedDuration: lu.estimatedDuration,
      linkedQuestionCount: luMeta.questionIds.length,
      linkedQuestionIds: luMeta.questionIds,
      questionBankIds: luMeta.bankIds,
      questionBanks: luMeta.bankIds.map(bankId => ({
        id: bankId,
        name: meta.bankNamesById.get(bankId) || null
      })),
      questionsEndpoint: usesLinkedQuestions
        ? `/api/v2/learning-units/${luId}/questions`
        : null,
      usesLinkedQuestions
    };
  }
}
