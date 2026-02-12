import mongoose from 'mongoose';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import Module from '@/models/academic/Module.model';
import Content from '@/models/content/Content.model';
import ContentAttempt from '@/models/content/ContentAttempt.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import { ApiError } from '@/utils/ApiError';

interface ModuleSettings {
  allowMultipleAttempts?: boolean;
  maxAttempts?: number | null;
  timeLimit?: number | null;
  showFeedback?: boolean;
  shuffleQuestions?: boolean;
}

interface ListModulesFilters {
  includeUnpublished?: boolean;
  sort?: string;
}

interface CreateModuleData {
  title: string;
  description?: string;
  order: number;
  type: 'scorm' | 'custom' | 'exercise' | 'video' | 'document';
  contentId?: string;
  settings?: ModuleSettings;
  isPublished?: boolean;
  passingScore?: number;
  duration?: number;
}

interface UpdateModuleData {
  title?: string;
  description?: string;
  type?: 'scorm' | 'custom' | 'exercise' | 'video' | 'document';
  contentId?: string;
  settings?: ModuleSettings;
  isPublished?: boolean;
  passingScore?: number;
  duration?: number;
}

/**
 * Helper: resolve CanonicalCourse + published CourseVersion from a courseId.
 * Returns { canonical, version } or throws 404.
 */
async function resolveCourseAndVersion(courseId: string) {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw ApiError.notFound('Course not found');
  }

  const canonical = await CanonicalCourse.findById(courseId);
  if (!canonical) {
    throw ApiError.notFound('Course not found');
  }

  const version = canonical.currentPublishedVersionId
    ? await CourseVersion.findById(canonical.currentPublishedVersionId)
    : await CourseVersion.findOne({ canonicalCourseId: canonical._id, status: 'published' });

  if (!version) {
    throw ApiError.notFound('Course not found');
  }

  return { canonical, version };
}

/**
 * Course Segments (Modules) Service
 * Manages course modules/segments using CanonicalCourse + CourseVersion + Module models
 */
export class CourseSegmentsService {
  /**
   * List all modules in a course, sorted by order
   */
  static async listCourseModules(courseId: string, filters: ListModulesFilters): Promise<any> {
    const { version } = await resolveCourseAndVersion(courseId);

    // Get module links for this version
    const moduleLinks = await CourseVersionModule.find({ courseVersionId: version._id })
      .sort({ order: 1 })
      .lean();

    const moduleIds = moduleLinks.map((link: any) => link.moduleId);

    // Fetch the actual modules
    const modules = await Module.find({ _id: { $in: moduleIds } }).lean();
    const moduleMap = new Map(modules.map((m: any) => [m._id.toString(), m]));

    // Build formatted result ordered by CourseVersionModule.order
    const formattedModules = moduleLinks
      .map((link: any) => {
        const mod = moduleMap.get(link.moduleId.toString());
        if (!mod) return null;

        // Filter by published status
        if (!filters.includeUnpublished && !(mod as any).isPublished) {
          return null;
        }

        return {
          id: (mod as any)._id.toString(),
          title: (mod as any).title || 'Untitled Module',
          description: (mod as any).description || null,
          order: link.order,
          type: 'document', // default type
          contentId: null,
          settings: {
            allowMultipleAttempts: true,
            maxAttempts: null,
            timeLimit: null,
            showFeedback: true,
            shuffleQuestions: false
          },
          isPublished: (mod as any).isPublished || false,
          passingScore: null,
          duration: (mod as any).estimatedDuration || null,
          createdAt: (mod as any).createdAt,
          updatedAt: (mod as any).updatedAt
        };
      })
      .filter(Boolean);

    // Parse sort
    if (filters.sort === 'title') {
      formattedModules.sort((a: any, b: any) => a.title.localeCompare(b.title));
    } else if (filters.sort === 'createdAt') {
      formattedModules.sort((a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
    // default: order (already sorted by CourseVersionModule.order)

    return {
      courseId,
      courseTitle: version.title,
      modules: formattedModules,
      totalModules: formattedModules.length
    };
  }

  /**
   * Create a new course module
   */
  static async createCourseModule(courseId: string, moduleData: CreateModuleData): Promise<any> {
    const { canonical, version } = await resolveCourseAndVersion(courseId);

    // Validate title length
    if (moduleData.title.length > 200) {
      throw ApiError.badRequest('Title cannot exceed 200 characters');
    }

    if (moduleData.description && moduleData.description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }

    // Check for duplicate title within course version
    const existingLinks = await CourseVersionModule.find({ courseVersionId: version._id }).lean();
    const existingModuleIds = existingLinks.map((l: any) => l.moduleId);
    const existingModules = await Module.find({ _id: { $in: existingModuleIds } }).lean();

    const duplicateTitle = existingModules.find((m: any) => m.title === moduleData.title);
    if (duplicateTitle) {
      throw ApiError.conflict('Module title must be unique within course');
    }

    // Validate contentId if provided
    if (moduleData.contentId) {
      if (!mongoose.Types.ObjectId.isValid(moduleData.contentId)) {
        throw ApiError.badRequest('Referenced content does not exist');
      }

      const content = await Content.findById(moduleData.contentId);
      if (!content) {
        throw ApiError.badRequest('Referenced content does not exist');
      }

      const contentTypeMap: any = {
        'scorm': 'scorm',
        'custom': 'quiz',
        'exercise': 'assignment',
        'video': 'video',
        'document': 'document'
      };

      if (contentTypeMap[moduleData.type] && content.type !== contentTypeMap[moduleData.type]) {
        throw ApiError.badRequest('Module type does not match content type');
      }
    }

    // Check if order is valid (must be sequential)
    const maxOrder = existingLinks.length;

    if (moduleData.order < 1 || moduleData.order > maxOrder + 1) {
      throw ApiError.badRequest('Module order must be sequential');
    }

    // If order already exists, shift modules
    if (moduleData.order <= maxOrder) {
      await CourseVersionModule.updateMany(
        { courseVersionId: version._id, order: { $gte: moduleData.order } },
        { $inc: { order: 1 } }
      );
    }

    // Validate passing score
    if (moduleData.passingScore !== undefined) {
      if (moduleData.passingScore < 0 || moduleData.passingScore > 100) {
        throw ApiError.badRequest('Passing score must be between 0 and 100');
      }
    }

    // Validate duration
    if (moduleData.duration !== undefined && moduleData.duration < 0) {
      throw ApiError.badRequest('Duration must be a positive number');
    }

    // Create Module record
    const module = await Module.create({
      ownerDepartmentId: canonical.departmentId,
      isShared: false,
      title: moduleData.title,
      description: moduleData.description || undefined,
      prerequisites: [],
      completionCriteria: {
        type: 'all_required'
      },
      presentationRules: {
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
      },
      isPublished: moduleData.isPublished !== undefined ? moduleData.isPublished : false,
      estimatedDuration: moduleData.duration || 0,
      order: moduleData.order,
      createdBy: version.createdBy
    });

    // Link to course version
    await CourseVersionModule.create({
      courseVersionId: version._id,
      moduleId: module._id,
      order: moduleData.order,
      isRequired: true,
      availableFrom: null,
      availableUntil: null
    });

    const defaultSettings: ModuleSettings = {
      allowMultipleAttempts: true,
      maxAttempts: null,
      timeLimit: null,
      showFeedback: true,
      shuffleQuestions: false
    };

    const settings = { ...defaultSettings, ...(moduleData.settings || {}) };

    return {
      id: module._id.toString(),
      courseId,
      title: module.title,
      description: module.description || null,
      order: moduleData.order,
      type: moduleData.type,
      contentId: moduleData.contentId || null,
      settings,
      isPublished: module.isPublished,
      passingScore: moduleData.passingScore || null,
      duration: moduleData.duration || null,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt
    };
  }

  /**
   * Get a specific course module by ID
   */
  static async getCourseModuleById(courseId: string, moduleId: string): Promise<any> {
    const { version } = await resolveCourseAndVersion(courseId);

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.notFound('Module not found in this course');
    }

    // Find the module link
    const link = await CourseVersionModule.findOne({
      courseVersionId: version._id,
      moduleId
    }).lean();

    if (!link) {
      throw ApiError.notFound('Module not found in this course');
    }

    const module = await Module.findById(moduleId).lean();
    if (!module) {
      throw ApiError.notFound('Module not found in this course');
    }

    // Get learning units for this module to find content
    const learningUnits = await LearningUnit.find({ moduleId: module._id })
      .populate('contentId')
      .sort({ sequence: 1 })
      .lean();

    // Get completion stats from content attempts across all LU content
    const contentIds = learningUnits
      .filter((lu: any) => lu.contentId)
      .map((lu: any) => typeof lu.contentId === 'object' ? lu.contentId._id : lu.contentId);

    const completionCount = contentIds.length > 0
      ? await ContentAttempt.countDocuments({
          contentId: { $in: contentIds },
          status: 'completed'
        })
      : 0;

    // Calculate average score
    const attempts = contentIds.length > 0
      ? await ContentAttempt.find({
          contentId: { $in: contentIds },
          status: 'completed',
          score: { $exists: true }
        }).lean()
      : [];

    const averageScore = attempts.length > 0
      ? attempts.reduce((sum, att: any) => sum + (att.score || 0), 0) / attempts.length
      : null;

    return {
      id: (module as any)._id.toString(),
      courseId,
      courseTitle: version.title,
      title: (module as any).title || 'Untitled Module',
      description: (module as any).description || null,
      order: (link as any).order,
      type: 'document',
      contentId: null,
      content: null,
      settings: {
        allowMultipleAttempts: true,
        maxAttempts: null,
        timeLimit: null,
        showFeedback: true,
        shuffleQuestions: false
      },
      isPublished: (module as any).isPublished || false,
      passingScore: null,
      duration: (module as any).estimatedDuration || null,
      prerequisites: [],
      completionCount,
      averageScore,
      createdAt: (module as any).createdAt,
      updatedAt: (module as any).updatedAt,
      createdBy: (module as any).createdBy ? {
        id: (module as any).createdBy.toString(),
        firstName: 'Staff',
        lastName: 'User'
      } : null
    };
  }

  /**
   * Update a course module
   */
  static async updateCourseModule(
    courseId: string,
    moduleId: string,
    updateData: UpdateModuleData
  ): Promise<any> {
    const { version } = await resolveCourseAndVersion(courseId);

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.notFound('Module not found in this course');
    }

    // Find the module link
    const link = await CourseVersionModule.findOne({
      courseVersionId: version._id,
      moduleId
    });

    if (!link) {
      throw ApiError.notFound('Module not found in this course');
    }

    const module = await Module.findById(moduleId);
    if (!module) {
      throw ApiError.notFound('Module not found in this course');
    }

    // Validate title if changing
    if (updateData.title) {
      if (updateData.title.length > 200) {
        throw ApiError.badRequest('Title cannot exceed 200 characters');
      }

      if (updateData.title !== module.title) {
        const allLinks = await CourseVersionModule.find({ courseVersionId: version._id }).lean();
        const otherModuleIds = allLinks
          .filter((l: any) => l.moduleId.toString() !== moduleId)
          .map((l: any) => l.moduleId);
        const otherModules = await Module.find({ _id: { $in: otherModuleIds } }).lean();
        const duplicate = otherModules.find((m: any) => m.title === updateData.title);
        if (duplicate) {
          throw ApiError.conflict('Module title must be unique within course');
        }
      }
    }

    // Validate description
    if (updateData.description && updateData.description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }

    // Validate contentId if provided
    if (updateData.contentId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.contentId)) {
        throw ApiError.badRequest('Referenced content does not exist');
      }

      const content = await Content.findById(updateData.contentId);
      if (!content) {
        throw ApiError.badRequest('Referenced content does not exist');
      }

      const contentTypeMap: any = {
        'scorm': 'scorm',
        'custom': 'quiz',
        'exercise': 'assignment',
        'video': 'video',
        'document': 'document'
      };

      const typeToCheck = updateData.type || 'document';
      if (contentTypeMap[typeToCheck] && content.type !== contentTypeMap[typeToCheck]) {
        throw ApiError.badRequest('Module type does not match content type');
      }
    }

    // Validate passing score
    if (updateData.passingScore !== undefined) {
      if (updateData.passingScore < 0 || updateData.passingScore > 100) {
        throw ApiError.badRequest('Passing score must be between 0 and 100');
      }
    }

    // Validate duration
    if (updateData.duration !== undefined && updateData.duration < 0) {
      throw ApiError.badRequest('Duration must be a positive number');
    }

    // Check if module has active attempts before changing type
    if (updateData.type) {
      const learningUnits = await LearningUnit.find({ moduleId: module._id }).lean();
      const luContentIds = learningUnits
        .filter((lu: any) => lu.contentId)
        .map((lu: any) => lu.contentId);

      if (luContentIds.length > 0) {
        const hasAttempts = await ContentAttempt.exists({
          contentId: { $in: luContentIds },
          status: { $in: ['in-progress', 'completed'] }
        });

        if (hasAttempts) {
          throw ApiError.conflict('Cannot change module type with active attempts');
        }
      }
    }

    // Update module fields
    if (updateData.title !== undefined) module.title = updateData.title;
    if (updateData.description !== undefined) module.description = updateData.description;
    if (updateData.isPublished !== undefined) module.isPublished = updateData.isPublished;
    if (updateData.duration !== undefined) module.estimatedDuration = updateData.duration;

    await module.save();

    const defaultSettings: ModuleSettings = {
      allowMultipleAttempts: true,
      maxAttempts: null,
      timeLimit: null,
      showFeedback: true,
      shuffleQuestions: false
    };

    const settings = { ...defaultSettings, ...(updateData.settings || {}) };

    return {
      id: module._id.toString(),
      courseId,
      title: module.title,
      description: module.description || null,
      order: link.order,
      type: updateData.type || 'document',
      contentId: null,
      settings,
      isPublished: module.isPublished,
      passingScore: updateData.passingScore || null,
      duration: module.estimatedDuration || null,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt
    };
  }

  /**
   * Delete a course module and reorder remaining modules
   */
  static async deleteCourseModule(
    courseId: string,
    moduleId: string,
    force: boolean = false
  ): Promise<any> {
    const { version } = await resolveCourseAndVersion(courseId);

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.notFound('Module not found in this course');
    }

    // Find the module link
    const link = await CourseVersionModule.findOne({
      courseVersionId: version._id,
      moduleId
    });

    if (!link) {
      throw ApiError.notFound('Module not found in this course');
    }

    const module = await Module.findById(moduleId);
    if (!module) {
      throw ApiError.notFound('Module not found in this course');
    }

    const moduleTitle = module.title || 'Untitled Module';
    const moduleOrder = link.order;

    // Check for existing attempts if not forcing
    if (!force) {
      const learningUnits = await LearningUnit.find({ moduleId: module._id }).lean();
      const luContentIds = learningUnits
        .filter((lu: any) => lu.contentId)
        .map((lu: any) => lu.contentId);

      if (luContentIds.length > 0) {
        const hasAttempts = await ContentAttempt.exists({
          contentId: { $in: luContentIds },
          status: { $in: ['in-progress', 'completed'] }
        });

        if (hasAttempts) {
          throw ApiError.conflict('Cannot delete module with existing attempts (use force=true)');
        }
      }
    }

    // Get modules that will be reordered
    const modulesToReorder = await CourseVersionModule.find({
      courseVersionId: version._id,
      order: { $gt: moduleOrder }
    }).sort({ order: 1 }).populate('moduleId').lean();

    // Delete module link
    await CourseVersionModule.findByIdAndDelete(link._id);

    // Reorder subsequent modules
    await CourseVersionModule.updateMany(
      { courseVersionId: version._id, order: { $gt: moduleOrder } },
      { $inc: { order: -1 } }
    );

    // Build reordered modules list
    const reorderedModules = modulesToReorder.map((m: any) => {
      const mod = m.moduleId;
      return {
        id: mod?._id?.toString() || m.moduleId.toString(),
        title: mod?.title || 'Untitled Module',
        oldOrder: m.order,
        newOrder: m.order - 1
      };
    });

    return {
      id: moduleId,
      title: moduleTitle,
      deletedAt: new Date(),
      affectedModules: reorderedModules.length,
      reorderedModules
    };
  }

  /**
   * Reorder course modules
   */
  static async reorderCourseModules(courseId: string, moduleIds: string[]): Promise<any> {
    const { version } = await resolveCourseAndVersion(courseId);

    // Validate moduleIds array
    if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
      throw ApiError.badRequest('Module IDs array cannot be empty');
    }

    // Check for duplicates
    const uniqueIds = new Set(moduleIds);
    if (uniqueIds.size !== moduleIds.length) {
      throw ApiError.badRequest('Duplicate module IDs in request');
    }

    // Validate all IDs
    for (const id of moduleIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw ApiError.badRequest('One or more modules do not belong to this course');
      }
    }

    // Get all module links in this course version
    const allLinks = await CourseVersionModule.find({ courseVersionId: version._id }).lean();

    // Check if all modules are included
    if (allLinks.length !== moduleIds.length) {
      throw ApiError.badRequest('Not all course modules included in reorder');
    }

    // Check if all provided IDs belong to this course
    const courseModuleIds = new Set(allLinks.map((l: any) => l.moduleId.toString()));
    for (const id of moduleIds) {
      if (!courseModuleIds.has(id)) {
        throw ApiError.badRequest('One or more modules do not belong to this course');
      }
    }

    // Fetch all modules for titles
    const modules = await Module.find({
      _id: { $in: moduleIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).lean();
    const moduleMap = new Map(modules.map((m: any) => [m._id.toString(), m]));

    // Build update operations
    const updates: any[] = [];
    const reorderedModules: any[] = [];

    for (let i = 0; i < moduleIds.length; i++) {
      const modId = moduleIds[i];
      const newOrder = i + 1;

      const link = allLinks.find((l: any) => l.moduleId.toString() === modId);
      if (link) {
        const oldOrder = (link as any).order;
        const mod = moduleMap.get(modId);

        if (oldOrder !== newOrder) {
          updates.push({
            updateOne: {
              filter: { _id: (link as any)._id },
              update: { $set: { order: newOrder } }
            }
          });
        }

        reorderedModules.push({
          id: modId,
          title: mod?.title || 'Untitled Module',
          oldOrder,
          newOrder
        });
      }
    }

    // Execute bulk update
    if (updates.length > 0) {
      await CourseVersionModule.bulkWrite(updates);
    }

    return {
      courseId,
      modules: reorderedModules,
      totalReordered: updates.length
    };
  }
}
