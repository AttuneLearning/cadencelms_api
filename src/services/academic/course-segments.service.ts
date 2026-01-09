import mongoose from 'mongoose';
import CourseContent from '@/models/content/CourseContent.model';
import Content from '@/models/content/Content.model';
import Course from '@/models/academic/Course.model';
import ContentAttempt from '@/models/content/ContentAttempt.model';
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
 * Course Segments (Modules) Service
 * Manages course modules/segments using the CourseContent model
 */
export class CourseSegmentsService {
  /**
   * List all modules in a course, sorted by order
   */
  static async listCourseModules(courseId: string, filters: ListModulesFilters): Promise<any> {
    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Build query
    const query: any = { courseId };

    // Filter by published status
    if (!filters.includeUnpublished) {
      query['metadata.isPublished'] = true;
    }

    // Parse sort
    const sortField = filters.sort || 'sequence';
    let sortObj: any = {};

    if (sortField === 'order') {
      sortObj = { sequence: 1 };
    } else if (sortField === 'title') {
      sortObj = { 'metadata.title': 1 };
    } else if (sortField === 'createdAt') {
      sortObj = { createdAt: 1 };
    } else {
      sortObj = { sequence: 1 };
    }

    // Fetch modules
    const modules = await CourseContent.find(query)
      .populate('contentId')
      .sort(sortObj)
      .lean();

    // Format modules
    const formattedModules = modules.map((module: any) => {
      const metadata = module.metadata || {};
      const settings = metadata.settings || {};
      const content = module.contentId;

      return {
        id: module._id.toString(),
        title: metadata.title || 'Untitled Module',
        description: metadata.description || null,
        order: module.sequence,
        type: metadata.type || 'document',
        contentId: content ? content._id.toString() : null,
        settings: {
          allowMultipleAttempts: settings.allowMultipleAttempts !== undefined ? settings.allowMultipleAttempts : true,
          maxAttempts: settings.maxAttempts || null,
          timeLimit: settings.timeLimit || null,
          showFeedback: settings.showFeedback !== undefined ? settings.showFeedback : true,
          shuffleQuestions: settings.shuffleQuestions !== undefined ? settings.shuffleQuestions : false
        },
        isPublished: metadata.isPublished !== undefined ? metadata.isPublished : false,
        passingScore: metadata.passingScore || null,
        duration: metadata.duration || null,
        createdAt: module.createdAt,
        updatedAt: module.updatedAt
      };
    });

    return {
      courseId,
      courseTitle: course.name,
      modules: formattedModules,
      totalModules: formattedModules.length
    };
  }

  /**
   * Create a new course module
   */
  static async createCourseModule(courseId: string, moduleData: CreateModuleData): Promise<any> {
    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Validate title length
    if (moduleData.title.length > 200) {
      throw ApiError.badRequest('Title cannot exceed 200 characters');
    }

    if (moduleData.description && moduleData.description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }

    // Check for duplicate title within course
    const existingModule = await CourseContent.findOne({
      courseId,
      'metadata.title': moduleData.title
    });

    if (existingModule) {
      throw ApiError.conflict('Module title must be unique within course');
    }

    // Validate contentId if provided
    let content = null;
    if (moduleData.contentId) {
      if (!mongoose.Types.ObjectId.isValid(moduleData.contentId)) {
        throw ApiError.badRequest('Referenced content does not exist');
      }

      content = await Content.findById(moduleData.contentId);
      if (!content) {
        throw ApiError.badRequest('Referenced content does not exist');
      }

      // Validate type matches if both provided
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
    const existingModules = await CourseContent.find({ courseId }).sort({ sequence: 1 });
    const maxOrder = existingModules.length;

    if (moduleData.order < 1 || moduleData.order > maxOrder + 1) {
      throw ApiError.badRequest('Module order must be sequential');
    }

    // If order already exists, shift modules
    if (moduleData.order <= maxOrder) {
      await CourseContent.updateMany(
        { courseId, sequence: { $gte: moduleData.order } },
        { $inc: { sequence: 1 } }
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

    // Create default settings
    const defaultSettings: ModuleSettings = {
      allowMultipleAttempts: true,
      maxAttempts: null,
      timeLimit: null,
      showFeedback: true,
      shuffleQuestions: false
    };

    const settings = { ...defaultSettings, ...(moduleData.settings || {}) };

    // Create module
    const module = await CourseContent.create({
      courseId,
      contentId: moduleData.contentId || null,
      sequence: moduleData.order,
      isRequired: true,
      isActive: true,
      metadata: {
        title: moduleData.title,
        description: moduleData.description || null,
        type: moduleData.type,
        settings,
        isPublished: moduleData.isPublished !== undefined ? moduleData.isPublished : false,
        passingScore: moduleData.passingScore || null,
        duration: moduleData.duration || null
      }
    });

    const metadata = module.metadata || {};

    return {
      id: module._id.toString(),
      courseId: module.courseId.toString(),
      title: metadata.title,
      description: metadata.description || null,
      order: module.sequence,
      type: metadata.type,
      contentId: module.contentId ? module.contentId.toString() : null,
      settings: metadata.settings,
      isPublished: metadata.isPublished,
      passingScore: metadata.passingScore || null,
      duration: metadata.duration || null,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt
    };
  }

  /**
   * Get a specific course module by ID
   */
  static async getCourseModuleById(courseId: string, moduleId: string): Promise<any> {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.notFound('Module not found in this course');
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Fetch module
    const module = await CourseContent.findOne({
      _id: moduleId,
      courseId
    }).populate('contentId').lean();

    if (!module) {
      throw ApiError.notFound('Module not found in this course');
    }

    const metadata = (module as any).metadata || {};
    const settings = metadata.settings || {};
    const content = (module as any).contentId;

    // Get completion stats
    const completionCount = content
      ? await ContentAttempt.countDocuments({
          contentId: content._id,
          status: 'completed'
        })
      : 0;

    // Calculate average score
    const attempts = content
      ? await ContentAttempt.find({
          contentId: content._id,
          status: 'completed',
          score: { $exists: true }
        }).lean()
      : [];

    const averageScore = attempts.length > 0
      ? attempts.reduce((sum, att: any) => sum + (att.score || 0), 0) / attempts.length
      : null;

    return {
      id: (module as any)._id.toString(),
      courseId: (module as any).courseId.toString(),
      courseTitle: course.name,
      title: metadata.title || 'Untitled Module',
      description: metadata.description || null,
      order: (module as any).sequence,
      type: metadata.type || 'document',
      contentId: content ? content._id.toString() : null,
      content: content ? {
        id: content._id.toString(),
        title: content.title,
        type: content.type,
        metadata: content.metadata || {}
      } : null,
      settings: {
        allowMultipleAttempts: settings.allowMultipleAttempts !== undefined ? settings.allowMultipleAttempts : true,
        maxAttempts: settings.maxAttempts || null,
        timeLimit: settings.timeLimit || null,
        showFeedback: settings.showFeedback !== undefined ? settings.showFeedback : true,
        shuffleQuestions: settings.shuffleQuestions !== undefined ? settings.shuffleQuestions : false
      },
      isPublished: metadata.isPublished !== undefined ? metadata.isPublished : false,
      passingScore: metadata.passingScore || null,
      duration: metadata.duration || null,
      prerequisites: [],
      completionCount,
      averageScore,
      createdAt: (module as any).createdAt,
      updatedAt: (module as any).updatedAt,
      createdBy: content?.createdBy ? {
        id: content.createdBy.toString(),
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
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.notFound('Module not found in this course');
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Find module
    const module = await CourseContent.findOne({ _id: moduleId, courseId });
    if (!module) {
      throw ApiError.notFound('Module not found in this course');
    }

    const metadata = module.metadata || {};

    // Validate title if changing
    if (updateData.title) {
      if (updateData.title.length > 200) {
        throw ApiError.badRequest('Title cannot exceed 200 characters');
      }

      if (updateData.title !== metadata.title) {
        const existingModule = await CourseContent.findOne({
          courseId,
          _id: { $ne: moduleId },
          'metadata.title': updateData.title
        });

        if (existingModule) {
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

      // Validate type matches
      const contentTypeMap: any = {
        'scorm': 'scorm',
        'custom': 'quiz',
        'exercise': 'assignment',
        'video': 'video',
        'document': 'document'
      };

      const typeToCheck = updateData.type || metadata.type;
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
    if (updateData.type && updateData.type !== metadata.type) {
      if (module.contentId) {
        const hasAttempts = await ContentAttempt.exists({
          contentId: module.contentId,
          status: { $in: ['in-progress', 'completed'] }
        });

        if (hasAttempts) {
          throw ApiError.conflict('Cannot change module type with active attempts');
        }
      }
    }

    // Update metadata
    const updatedMetadata: any = { ...metadata };

    if (updateData.title !== undefined) updatedMetadata.title = updateData.title;
    if (updateData.description !== undefined) updatedMetadata.description = updateData.description;
    if (updateData.type !== undefined) updatedMetadata.type = updateData.type;
    if (updateData.isPublished !== undefined) updatedMetadata.isPublished = updateData.isPublished;
    if (updateData.passingScore !== undefined) updatedMetadata.passingScore = updateData.passingScore;
    if (updateData.duration !== undefined) updatedMetadata.duration = updateData.duration;

    // Merge settings
    if (updateData.settings) {
      updatedMetadata.settings = {
        ...(metadata.settings || {}),
        ...updateData.settings
      };
    }

    // Update module
    module.metadata = updatedMetadata;
    if (updateData.contentId !== undefined) {
      module.contentId = updateData.contentId ? new mongoose.Types.ObjectId(updateData.contentId) : undefined as any;
    }

    await module.save();

    return {
      id: module._id.toString(),
      courseId: module.courseId.toString(),
      title: updatedMetadata.title,
      description: updatedMetadata.description || null,
      order: module.sequence,
      type: updatedMetadata.type,
      contentId: module.contentId ? module.contentId.toString() : null,
      settings: updatedMetadata.settings,
      isPublished: updatedMetadata.isPublished,
      passingScore: updatedMetadata.passingScore || null,
      duration: updatedMetadata.duration || null,
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
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.notFound('Module not found in this course');
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Find module
    const module = await CourseContent.findOne({ _id: moduleId, courseId });
    if (!module) {
      throw ApiError.notFound('Module not found in this course');
    }

    const metadata = module.metadata || {};
    const moduleTitle = metadata.title || 'Untitled Module';
    const moduleOrder = module.sequence;

    // Check for existing attempts if not forcing
    if (!force && module.contentId) {
      const hasAttempts = await ContentAttempt.exists({
        contentId: module.contentId,
        status: { $in: ['in-progress', 'completed'] }
      });

      if (hasAttempts) {
        throw ApiError.conflict('Cannot delete module with existing attempts (use force=true)');
      }
    }

    // Get modules that will be reordered
    const modulesToReorder = await CourseContent.find({
      courseId,
      sequence: { $gt: moduleOrder }
    }).sort({ sequence: 1 }).lean();

    // Delete module
    await CourseContent.findByIdAndDelete(moduleId);

    // Reorder subsequent modules
    await CourseContent.updateMany(
      { courseId, sequence: { $gt: moduleOrder } },
      { $inc: { sequence: -1 } }
    );

    // Build reordered modules list
    const reorderedModules = modulesToReorder.map((m: any) => {
      const mMetadata = m.metadata || {};
      return {
        id: m._id.toString(),
        title: mMetadata.title || 'Untitled Module',
        oldOrder: m.sequence,
        newOrder: m.sequence - 1
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
    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

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

    // Get all modules in course
    const allModules = await CourseContent.find({ courseId }).lean();

    // Check if all modules are included
    if (allModules.length !== moduleIds.length) {
      throw ApiError.badRequest('Not all course modules included in reorder');
    }

    // Check if all provided IDs belong to this course
    const courseModuleIds = new Set(allModules.map(m => (m as any)._id.toString()));
    for (const id of moduleIds) {
      if (!courseModuleIds.has(id)) {
        throw ApiError.badRequest('One or more modules do not belong to this course');
      }
    }

    // Build update operations
    const updates: any[] = [];
    const reorderedModules: any[] = [];

    for (let i = 0; i < moduleIds.length; i++) {
      const moduleId = moduleIds[i];
      const newOrder = i + 1;

      const module = allModules.find(m => (m as any)._id.toString() === moduleId);
      if (module) {
        const oldOrder = (module as any).sequence;
        const metadata = (module as any).metadata || {};

        if (oldOrder !== newOrder) {
          updates.push({
            updateOne: {
              filter: { _id: moduleId },
              update: { $set: { sequence: newOrder } }
            }
          });

          reorderedModules.push({
            id: moduleId,
            title: metadata.title || 'Untitled Module',
            oldOrder,
            newOrder
          });
        } else {
          reorderedModules.push({
            id: moduleId,
            title: metadata.title || 'Untitled Module',
            oldOrder,
            newOrder
          });
        }
      }
    }

    // Execute bulk update
    if (updates.length > 0) {
      await CourseContent.bulkWrite(updates);
    }

    return {
      courseId,
      modules: reorderedModules,
      totalReordered: updates.length
    };
  }
}
