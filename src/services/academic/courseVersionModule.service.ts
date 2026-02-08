import mongoose from 'mongoose';
import CourseVersionModule, {
  ICourseVersionModule,
} from '@/models/academic/CourseVersionModule.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import Module from '@/models/academic/Module.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Input for adding a module to a version
 */
export interface AddModuleInput {
  moduleId: string;
  order?: number;
  isRequired?: boolean;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
}

/**
 * Input for updating module settings in a version
 */
export interface UpdateModuleSettingsInput {
  isRequired?: boolean;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
}

/**
 * Input for reordering modules
 */
export interface ReorderModulesInput {
  moduleOrder: string[]; // Array of moduleIds in desired order
}

/**
 * CourseVersionModule Service
 *
 * Handles all operations for managing modules within course versions.
 * All modification operations require the version to be in 'draft' status.
 */
export class CourseVersionModuleService {
  /**
   * Validate that a version exists and is in draft status.
   * @private
   */
  private static async validateDraftVersion(
    versionId: string
  ): Promise<typeof CourseVersion.prototype> {
    if (!mongoose.Types.ObjectId.isValid(versionId)) {
      throw ApiError.badRequest('Invalid course version ID');
    }

    const version = await CourseVersion.findById(versionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    if (version.status !== 'draft') {
      throw ApiError.badRequest(
        `Cannot modify modules: version status is '${version.status}'. Only draft versions can be modified.`
      );
    }

    if (version.isLocked) {
      throw ApiError.badRequest('Cannot modify modules: version is locked');
    }

    return version;
  }

  /**
   * Get the department ID for a course version.
   * @private
   */
  private static async getDepartmentIdForVersion(
    versionId: string
  ): Promise<mongoose.Types.ObjectId> {
    const version = await CourseVersion.findById(versionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    const canonicalCourse = await CanonicalCourse.findById(version.canonicalCourseId);
    if (!canonicalCourse) {
      throw ApiError.internal('Canonical course not found');
    }

    return canonicalCourse.departmentId;
  }

  /**
   * List all modules for a course version, ordered by position.
   *
   * @param courseVersionId - The version to list modules for
   */
  static async listModulesForVersion(courseVersionId: string): Promise<ICourseVersionModule[]> {
    if (!mongoose.Types.ObjectId.isValid(courseVersionId)) {
      throw ApiError.badRequest('Invalid course version ID');
    }

    // Verify version exists
    const version = await CourseVersion.findById(courseVersionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    const modules = await CourseVersionModule.find({ courseVersionId })
      .sort({ order: 1 })
      .populate('moduleId', 'title description estimatedDuration isPublished')
      .exec();

    return modules;
  }

  /**
   * Add a module to a course version.
   *
   * Business Rules:
   * - Version must be in 'draft' status
   * - Module must exist and be in the same department (or be shared)
   * - Cannot add duplicate module to same version
   *
   * @param courseVersionId - The version to add the module to
   * @param data - Module addition data
   * @param userId - The user performing the action (for future audit)
   */
  static async addModuleToVersion(
    courseVersionId: string,
    data: AddModuleInput,
    _userId: string
  ): Promise<ICourseVersionModule> {
    // Validate draft version
    await this.validateDraftVersion(courseVersionId);

    const { moduleId, order, isRequired, availableFrom, availableUntil } = data;

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    // Verify module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    // Verify module is in the same department as the course OR is shared
    const departmentId = await this.getDepartmentIdForVersion(courseVersionId);

    // Module has ownerDepartmentId - check if it belongs to same department or is shared
    const isOwnDepartment = module.ownerDepartmentId.equals(departmentId);
    const isSharedModule = module.isShared;

    if (!isOwnDepartment && !isSharedModule) {
      throw ApiError.badRequest('Module must belong to the same department as the course or be shared');
    }

    // Check for duplicate
    const existing = await CourseVersionModule.findOne({
      courseVersionId,
      moduleId,
    });
    if (existing) {
      throw ApiError.conflict('Module is already part of this version');
    }

    // Calculate order if not provided
    let moduleOrder = order;
    if (moduleOrder === undefined) {
      const lastModule = await CourseVersionModule.findOne({ courseVersionId })
        .sort({ order: -1 })
        .exec();
      moduleOrder = lastModule ? lastModule.order + 1 : 0;
    }

    // Create the association
    const versionModule = new CourseVersionModule({
      courseVersionId: new mongoose.Types.ObjectId(courseVersionId),
      moduleId: new mongoose.Types.ObjectId(moduleId),
      order: moduleOrder,
      isRequired: isRequired ?? true,
      availableFrom: availableFrom ?? null,
      availableUntil: availableUntil ?? null,
    });

    await versionModule.save();

    return versionModule;
  }

  /**
   * Remove a module from a course version.
   *
   * Business Rules:
   * - Version must be in 'draft' status
   *
   * @param courseVersionId - The version to remove the module from
   * @param moduleId - The module to remove
   */
  static async removeModuleFromVersion(courseVersionId: string, moduleId: string): Promise<void> {
    // Validate draft version
    await this.validateDraftVersion(courseVersionId);

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    const result = await CourseVersionModule.deleteOne({
      courseVersionId,
      moduleId,
    });

    if (result.deletedCount === 0) {
      throw ApiError.notFound('Module not found in this version');
    }

    // Re-order remaining modules to fill the gap
    const remainingModules = await CourseVersionModule.find({ courseVersionId })
      .sort({ order: 1 })
      .exec();

    const bulkOps = remainingModules.map((mod, index) => ({
      updateOne: {
        filter: { _id: mod._id },
        update: { $set: { order: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await CourseVersionModule.bulkWrite(bulkOps);
    }
  }

  /**
   * Reorder modules within a course version.
   *
   * Business Rules:
   * - Version must be in 'draft' status
   * - All module IDs must exist in the version
   *
   * @param courseVersionId - The version to reorder modules in
   * @param moduleOrder - Array of module IDs in desired order
   */
  static async reorderModules(
    courseVersionId: string,
    moduleOrder: string[]
  ): Promise<ICourseVersionModule[]> {
    // Validate draft version
    await this.validateDraftVersion(courseVersionId);

    // Validate all module IDs are valid ObjectIds
    for (const moduleId of moduleOrder) {
      if (!mongoose.Types.ObjectId.isValid(moduleId)) {
        throw ApiError.badRequest(`Invalid module ID: ${moduleId}`);
      }
    }

    // Get existing modules for this version
    const existingModules = await CourseVersionModule.find({ courseVersionId });
    const existingModuleIds = new Set(existingModules.map((m) => m.moduleId.toString()));

    // Validate all provided modules exist in this version
    for (const moduleId of moduleOrder) {
      if (!existingModuleIds.has(moduleId)) {
        throw ApiError.badRequest(`Module ${moduleId} is not part of this version`);
      }
    }

    // Check for duplicates in the order array
    const uniqueIds = new Set(moduleOrder);
    if (uniqueIds.size !== moduleOrder.length) {
      throw ApiError.badRequest('Duplicate module IDs in order array');
    }

    // Check all modules are included
    if (moduleOrder.length !== existingModules.length) {
      throw ApiError.badRequest(
        `Module order must include all ${existingModules.length} modules in the version`
      );
    }

    // Update order for each module
    const bulkOps = moduleOrder.map((moduleId, index) => ({
      updateOne: {
        filter: {
          courseVersionId: new mongoose.Types.ObjectId(courseVersionId),
          moduleId: new mongoose.Types.ObjectId(moduleId),
        },
        update: { $set: { order: index } },
      },
    }));

    await CourseVersionModule.bulkWrite(bulkOps);

    // Return updated modules in order
    return this.listModulesForVersion(courseVersionId);
  }

  /**
   * Update settings for a module in a version.
   *
   * Business Rules:
   * - Version must be in 'draft' status
   *
   * @param courseVersionId - The version containing the module
   * @param moduleId - The module to update
   * @param settings - The settings to update
   */
  static async updateModuleSettings(
    courseVersionId: string,
    moduleId: string,
    settings: UpdateModuleSettingsInput
  ): Promise<ICourseVersionModule> {
    // Validate draft version
    await this.validateDraftVersion(courseVersionId);

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    const versionModule = await CourseVersionModule.findOne({
      courseVersionId,
      moduleId,
    });

    if (!versionModule) {
      throw ApiError.notFound('Module not found in this version');
    }

    // Apply updates
    if (settings.isRequired !== undefined) {
      versionModule.isRequired = settings.isRequired;
    }
    if (settings.availableFrom !== undefined) {
      versionModule.availableFrom = settings.availableFrom;
    }
    if (settings.availableUntil !== undefined) {
      versionModule.availableUntil = settings.availableUntil;
    }

    await versionModule.save();

    return versionModule;
  }

  /**
   * Copy all module associations from one version to another.
   *
   * Used when creating a new version from an existing one.
   *
   * @param sourceVersionId - The version to copy modules from
   * @param targetVersionId - The version to copy modules to
   */
  static async copyModulesFromVersion(
    sourceVersionId: string,
    targetVersionId: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(sourceVersionId)) {
      throw ApiError.badRequest('Invalid source version ID');
    }
    if (!mongoose.Types.ObjectId.isValid(targetVersionId)) {
      throw ApiError.badRequest('Invalid target version ID');
    }

    // Verify both versions exist
    const sourceVersion = await CourseVersion.findById(sourceVersionId);
    if (!sourceVersion) {
      throw ApiError.notFound('Source version not found');
    }

    const targetVersion = await CourseVersion.findById(targetVersionId);
    if (!targetVersion) {
      throw ApiError.notFound('Target version not found');
    }

    // Get all modules from source version
    const sourceModules = await CourseVersionModule.find({
      courseVersionId: sourceVersionId,
    });

    if (sourceModules.length === 0) {
      return; // Nothing to copy
    }

    // Create copies for target version
    const targetModules = sourceModules.map((m) => ({
      courseVersionId: new mongoose.Types.ObjectId(targetVersionId),
      moduleId: m.moduleId,
      order: m.order,
      isRequired: m.isRequired,
      availableFrom: m.availableFrom,
      availableUntil: m.availableUntil,
    }));

    await CourseVersionModule.insertMany(targetModules);
  }

  /**
   * Get module count for a version.
   * Used for stats calculation.
   *
   * @param courseVersionId - The version to count modules for
   */
  static async getModuleCount(courseVersionId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(courseVersionId)) {
      throw ApiError.badRequest('Invalid course version ID');
    }

    return CourseVersionModule.countDocuments({ courseVersionId });
  }
}

export default CourseVersionModuleService;
