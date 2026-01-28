import mongoose from 'mongoose';
import CognitiveDepthLevel, { ICognitiveDepthLevel } from '@/models/content/CognitiveDepthLevel.model';
import { CourseDepthOverride } from '@/models/content/CourseDepthOverride.model';
import Department from '@/models/organization/Department.model';
import Course from '@/models/academic/Course.model';
import { ApiError } from '@/utils/ApiError';

/**
 * CognitiveDepthLevels Service
 *
 * Manages cognitive depth levels for adaptive learning.
 * Handles system defaults, department-specific overrides, and course-level overrides.
 *
 * Level Resolution (3-tier):
 * 1. Check for course-specific override with matching slug
 * 2. Check for department-specific level with matching slug
 * 3. Fall back to system default (departmentId: null)
 */

interface CreateLevelDto {
  slug: string;
  name: string;
  description?: string;
  order: number;
  advanceThreshold: number;
  minAttempts: number;
}

interface UpdateLevelDto {
  name?: string;
  description?: string;
  order?: number;
  advanceThreshold?: number;
  minAttempts?: number;
  isActive?: boolean;
}

interface LevelResponse {
  slug: string;
  name: string;
  description: string | null;
  order: number;
  advanceThreshold: number;
  minAttempts: number;
  isDefault: boolean;
  isOverride: boolean;
  departmentId: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CourseLevelResponse extends Omit<LevelResponse, 'isOverride'> {
  source: 'system' | 'department' | 'course';
}

interface CourseOverrideDto {
  advanceThreshold?: number;
  minAttempts?: number;
  description?: string;
}

interface CourseLevelsResponse {
  levels: CourseLevelResponse[];
  canOverride: boolean;
  hasOverrides: boolean;
}

export class CognitiveDepthLevelsService {
  /**
   * Get system default levels (departmentId: null, isDefault: true)
   */
  static async getSystemDefaults(): Promise<LevelResponse[]> {
    const levels = await CognitiveDepthLevel.find({
      departmentId: null,
      isDefault: true,
      isActive: true
    }).sort({ order: 1 });

    return levels.map((level) => this.formatLevelResponse(level, false));
  }

  /**
   * Get levels for a department (merged: department overrides + system defaults)
   */
  static async getForDepartment(departmentId: string): Promise<LevelResponse[]> {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    // Get department-specific levels
    const deptLevels = await CognitiveDepthLevel.find({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    });

    // Get system defaults
    const systemDefaults = await CognitiveDepthLevel.find({
      departmentId: null,
      isDefault: true,
      isActive: true
    });

    // Build merged map: department levels override system defaults by slug
    const levelMap = new Map<string, { level: ICognitiveDepthLevel; isOverride: boolean }>();

    // Add system defaults first
    for (const level of systemDefaults) {
      levelMap.set(level.slug, { level, isOverride: false });
    }

    // Override with department levels
    for (const level of deptLevels) {
      const isOverride = levelMap.has(level.slug);
      levelMap.set(level.slug, { level, isOverride });
    }

    // Convert to array and sort by order
    const merged = Array.from(levelMap.values())
      .map(({ level, isOverride }) => this.formatLevelResponse(level, isOverride))
      .sort((a, b) => a.order - b.order);

    return merged;
  }

  /**
   * Resolve a level by slug for a department (department-specific or system default)
   */
  static async resolveLevel(slug: string, departmentId: string): Promise<ICognitiveDepthLevel | null> {
    // First try department-specific
    const deptLevel = await CognitiveDepthLevel.findOne({
      slug: slug.toLowerCase(),
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    });

    if (deptLevel) {
      return deptLevel;
    }

    // Fall back to system default
    const systemLevel = await CognitiveDepthLevel.findOne({
      slug: slug.toLowerCase(),
      departmentId: null,
      isDefault: true,
      isActive: true
    });

    return systemLevel;
  }

  /**
   * Validate that a slug exists for a department (either custom or system default)
   */
  static async validateSlug(slug: string, departmentId: string): Promise<boolean> {
    const level = await this.resolveLevel(slug, departmentId);
    return level !== null;
  }

  /**
   * Get the next level in progression order
   */
  static async getNextLevel(currentSlug: string, departmentId: string): Promise<ICognitiveDepthLevel | null> {
    const levels = await this.getForDepartment(departmentId);
    const currentIndex = levels.findIndex((l) => l.slug === currentSlug.toLowerCase());

    if (currentIndex === -1 || currentIndex === levels.length - 1) {
      return null;
    }

    const nextSlug = levels[currentIndex + 1].slug;
    return this.resolveLevel(nextSlug, departmentId);
  }

  /**
   * Get the previous level in progression order
   */
  static async getPreviousLevel(currentSlug: string, departmentId: string): Promise<ICognitiveDepthLevel | null> {
    const levels = await this.getForDepartment(departmentId);
    const currentIndex = levels.findIndex((l) => l.slug === currentSlug.toLowerCase());

    if (currentIndex <= 0) {
      return null;
    }

    const prevSlug = levels[currentIndex - 1].slug;
    return this.resolveLevel(prevSlug, departmentId);
  }

  /**
   * Create a department-specific level (new or override)
   */
  static async create(departmentId: string, data: CreateLevelDto): Promise<LevelResponse> {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    const slug = data.slug.toLowerCase();

    // Check if department already has this slug
    const existing = await CognitiveDepthLevel.findOne({
      slug,
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (existing) {
      throw ApiError.badRequest('Level with this slug already exists in department');
    }

    // Check if this overrides a system default
    const systemDefault = await CognitiveDepthLevel.findOne({
      slug,
      departmentId: null,
      isDefault: true
    });

    const level = await CognitiveDepthLevel.create({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      slug,
      name: data.name,
      description: data.description,
      order: data.order,
      advanceThreshold: data.advanceThreshold,
      minAttempts: data.minAttempts,
      isDefault: false,
      isActive: true
    });

    return this.formatLevelResponse(level, systemDefault !== null);
  }

  /**
   * Update a department-specific level
   */
  static async update(departmentId: string, slug: string, data: UpdateLevelDto): Promise<LevelResponse> {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    const level = await CognitiveDepthLevel.findOne({
      slug: slug.toLowerCase(),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!level) {
      // Check if it's a system default they're trying to update directly
      const systemDefault = await CognitiveDepthLevel.findOne({
        slug: slug.toLowerCase(),
        departmentId: null,
        isDefault: true
      });

      if (systemDefault) {
        throw ApiError.badRequest(
          'Cannot update system default directly. Create an override instead.'
        );
      }

      throw ApiError.notFound('Level not found in department', 'NOT_FOUND');
    }

    // Update fields
    if (data.name !== undefined) level.name = data.name;
    if (data.description !== undefined) level.description = data.description;
    if (data.order !== undefined) level.order = data.order;
    if (data.advanceThreshold !== undefined) level.advanceThreshold = data.advanceThreshold;
    if (data.minAttempts !== undefined) level.minAttempts = data.minAttempts;
    if (data.isActive !== undefined) level.isActive = data.isActive;

    await level.save();

    // Check if this is an override
    const systemDefault = await CognitiveDepthLevel.findOne({
      slug: slug.toLowerCase(),
      departmentId: null,
      isDefault: true
    });

    return this.formatLevelResponse(level, systemDefault !== null);
  }

  /**
   * Delete a department-specific level (reverts to system default if exists)
   */
  static async delete(
    departmentId: string,
    slug: string
  ): Promise<{ deleted: boolean; revertedToDefault: boolean; questionsAffected: number }> {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    const level = await CognitiveDepthLevel.findOne({
      slug: slug.toLowerCase(),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!level) {
      // Check if trying to delete a system default
      const systemDefault = await CognitiveDepthLevel.findOne({
        slug: slug.toLowerCase(),
        departmentId: null,
        isDefault: true
      });

      if (systemDefault) {
        throw ApiError.badRequest('Cannot delete system default levels');
      }

      throw ApiError.notFound('Level not found in department', 'NOT_FOUND');
    }

    // Check if system default exists to revert to
    const systemDefault = await CognitiveDepthLevel.findOne({
      slug: slug.toLowerCase(),
      departmentId: null,
      isDefault: true
    });

    // TODO: Count questions using this level in department
    // For now, return 0 as questions don't have cognitiveDepth field yet
    const questionsAffected = 0;

    // If no system default to revert to and questions are using it, block deletion
    if (!systemDefault && questionsAffected > 0) {
      throw ApiError.badRequest(
        'Cannot delete custom level with questions assigned (no system default to revert to)'
      );
    }

    await CognitiveDepthLevel.deleteOne({ _id: level._id });

    return {
      deleted: true,
      revertedToDefault: systemDefault !== null,
      questionsAffected
    };
  }

  /**
   * Format level document to response object
   */
  private static formatLevelResponse(level: ICognitiveDepthLevel, isOverride: boolean): LevelResponse {
    return {
      slug: level.slug,
      name: level.name,
      description: level.description || null,
      order: level.order,
      advanceThreshold: level.advanceThreshold,
      minAttempts: level.minAttempts,
      isDefault: level.isDefault,
      isOverride,
      departmentId: level.departmentId ? level.departmentId.toString() : null,
      isActive: level.isActive,
      createdAt: level.createdAt,
      updatedAt: level.updatedAt
    };
  }

  // ============================================
  // COURSE-LEVEL OVERRIDES
  // ============================================

  /**
   * Get levels for a course (merged: course overrides + department + system defaults)
   */
  static async getForCourse(courseId: string): Promise<CourseLevelsResponse> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found', 'COURSE_NOT_FOUND');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found', 'COURSE_NOT_FOUND');
    }

    const departmentId = course.departmentId.toString();
    const department = await Department.findById(departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    // Get course overrides
    const courseOverrides = await CourseDepthOverride.find({
      courseId: new mongoose.Types.ObjectId(courseId)
    });

    // Get department levels (already merged with system defaults)
    const deptLevels = await this.getForDepartment(departmentId);

    // Apply course overrides
    const levelMap = new Map<string, CourseLevelResponse>();

    for (const deptLevel of deptLevels) {
      const source: 'system' | 'department' | 'course' = deptLevel.isOverride ? 'department' : 'system';
      const { isOverride, ...rest } = deptLevel;
      levelMap.set(deptLevel.slug, { ...rest, source });
    }

    // Override with course-specific settings
    for (const override of courseOverrides) {
      const baseLevel = levelMap.get(override.slug);
      if (baseLevel) {
        levelMap.set(override.slug, {
          ...baseLevel,
          advanceThreshold: override.advanceThreshold ?? baseLevel.advanceThreshold,
          minAttempts: override.minAttempts ?? baseLevel.minAttempts,
          description: override.description ?? baseLevel.description,
          source: 'course'
        });
      }
    }

    const levels = Array.from(levelMap.values()).sort((a, b) => a.order - b.order);

    return {
      levels,
      canOverride: department.allowCourseDepthOverrides,
      hasOverrides: courseOverrides.length > 0
    };
  }

  /**
   * Create or update a course-level override
   */
  static async upsertCourseOverride(
    courseId: string,
    slug: string,
    data: CourseOverrideDto,
    userId: string
  ): Promise<CourseLevelResponse> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found', 'COURSE_NOT_FOUND');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found', 'COURSE_NOT_FOUND');
    }

    const departmentId = course.departmentId.toString();
    const department = await Department.findById(departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    // Check if department allows course overrides
    if (!department.allowCourseDepthOverrides) {
      throw ApiError.forbidden('Department does not allow course-level depth overrides');
    }

    // Validate that the slug exists at department/system level
    const baseLevel = await this.resolveLevel(slug.toLowerCase(), departmentId);
    if (!baseLevel) {
      throw ApiError.notFound(
        `Cognitive depth level '${slug}' not found in department or system defaults`,
        'LEVEL_NOT_FOUND'
      );
    }

    // Upsert the override
    const override = await CourseDepthOverride.findOneAndUpdate(
      { courseId: new mongoose.Types.ObjectId(courseId), slug: slug.toLowerCase() },
      {
        advanceThreshold: data.advanceThreshold,
        minAttempts: data.minAttempts,
        description: data.description,
        createdBy: new mongoose.Types.ObjectId(userId)
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Build response
    return {
      slug: baseLevel.slug,
      name: baseLevel.name,
      description: override.description ?? baseLevel.description ?? null,
      order: baseLevel.order,
      advanceThreshold: override.advanceThreshold ?? baseLevel.advanceThreshold,
      minAttempts: override.minAttempts ?? baseLevel.minAttempts,
      isDefault: baseLevel.isDefault,
      departmentId: baseLevel.departmentId ? baseLevel.departmentId.toString() : null,
      isActive: baseLevel.isActive,
      source: 'course'
    };
  }

  /**
   * Delete a single course-level override (reverts to department/system)
   */
  static async deleteCourseOverride(courseId: string, slug: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found', 'COURSE_NOT_FOUND');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found', 'COURSE_NOT_FOUND');
    }

    const result = await CourseDepthOverride.deleteOne({
      courseId: new mongoose.Types.ObjectId(courseId),
      slug: slug.toLowerCase()
    });

    if (result.deletedCount === 0) {
      throw ApiError.notFound('Course override not found', 'NOT_FOUND');
    }
  }

  /**
   * Delete all course-level overrides for a course
   */
  static async deleteAllCourseOverrides(courseId: string): Promise<{ deleted: number }> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found', 'COURSE_NOT_FOUND');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found', 'COURSE_NOT_FOUND');
    }

    const result = await CourseDepthOverride.deleteMany({
      courseId: new mongoose.Types.ObjectId(courseId)
    });

    return { deleted: result.deletedCount };
  }
}

export default CognitiveDepthLevelsService;
