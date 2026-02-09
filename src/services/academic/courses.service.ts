import mongoose from 'mongoose';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import Department from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import { Staff } from '@/models/auth/Staff.model';
import { User } from '@/models/auth/User.model';
import { ApiError } from '@/utils/ApiError';
import { authorize, getDepartmentsWithRight } from '@/services/auth/authorize.service';
import type { AuthenticatedUser } from '@/middlewares/isAuthenticated';

interface ListCoursesFilters {
  page?: number;
  limit?: number;
  department?: string;
  program?: string;
  status?: 'draft' | 'published' | 'archived';
  search?: string;
  instructor?: string;
  sort?: string;
}

interface AdaptiveSettingsInput {
  mode?: 'off' | 'guided' | 'full';
  allowLearnerChoice?: boolean;
  preAssessmentEnabled?: boolean;
}

interface CreateCourseInput {
  title: string;
  code: string;
  description?: string;
  department: string;
  program?: string;
  credits?: number;
  duration?: number;
  instructors?: string[];
  settings?: {
    allowSelfEnrollment?: boolean;
    passingScore?: number;
    maxAttempts?: number;
    certificateEnabled?: boolean;
  };
  adaptiveSettings?: AdaptiveSettingsInput;
}

interface UpdateCourseInput {
  title: string;
  code: string;
  description?: string;
  department: string;
  program?: string;
  credits?: number;
  duration?: number;
  instructors?: string[];
  settings?: {
    allowSelfEnrollment?: boolean;
    passingScore?: number;
    maxAttempts?: number;
    certificateEnabled?: boolean;
  };
}

interface PatchCourseInput {
  title?: string;
  description?: string;
  credits?: number;
  duration?: number;
  instructors?: string[];
  settings?: {
    allowSelfEnrollment?: boolean;
    passingScore?: number;
    maxAttempts?: number;
    certificateEnabled?: boolean;
  };
  adaptiveSettings?: AdaptiveSettingsInput;
}

interface DuplicateCourseOptions {
  newTitle?: string;
  newCode: string;
  includeModules?: boolean;
  includeSettings?: boolean;
  targetProgram?: string;
  targetDepartment?: string;
}

export class CoursesService {
  /**
   * List courses with filtering and pagination
   * Updated to use CanonicalCourse + CourseVersion (versioning system)
   */
  static async listCourses(filters: ListCoursesFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query for CanonicalCourse
    const query: any = {};

    // Department filter
    if (filters.department) {
      query.departmentId = filters.department;
    }

    // Program filter
    if (filters.program) {
      query.programId = filters.program;
    }

    // Search filter (search by code on CanonicalCourse)
    if (filters.search) {
      query.code = { $regex: filters.search, $options: 'i' };
    }

    // Sort
    const sortField = filters.sort || '-createdAt';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortMap: any = {
      title: 'createdAt', // Will sort by version title later
      code: 'code',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    };
    const sort: any = { [sortMap[sortKey] || 'createdAt']: sortOrder };

    // Execute query on CanonicalCourse
    const [canonicalCourses, total] = await Promise.all([
      CanonicalCourse.find(query).sort(sort).skip(skip).limit(limit),
      CanonicalCourse.countDocuments(query)
    ]);

    // Build response with populated data from CourseVersion
    const coursesData = await Promise.all(
      canonicalCourses.map(async (canonical) => {
        // Get the latest draft or published version
        const versionId = canonical.currentPublishedVersionId || canonical.latestDraftVersionId;
        if (!versionId) {
          // No version exists yet, skip this course
          return null;
        }

        const version = await CourseVersion.findById(versionId);
        if (!version) {
          return null;
        }

        // Get department info
        const department = await Department.findById(canonical.departmentId);

        // Get program info if exists
        let program = null;
        if (canonical.programId) {
          const programDoc = await Program.findById(canonical.programId);
          if (programDoc) {
            program = {
              id: programDoc._id.toString(),
              name: programDoc.name
            };
          }
        }

        // Get instructors from CourseVersion
        const instructors = await Promise.all(
          version.instructorIds.map(async (id: mongoose.Types.ObjectId) => {
            const staff = await Staff.findById(id);
            const user = await User.findById(id);
            if (staff && user) {
              return {
                id: staff._id.toString(),
                firstName: staff.person.firstName,
                lastName: staff.person.lastName,
                email: user.email
              };
            }
            return null;
          })
        );

        // Get module count for this course version
        const moduleCount = await CourseVersionModule.countDocuments({
          courseVersionId: version._id
        });

        // Get enrollment count (placeholder for now)
        const enrollmentCount = 0;

        // Apply status filter after fetching versions
        if (filters.status) {
          if (filters.status === 'archived' && version.status !== 'archived') return null;
          if (filters.status === 'published' && version.status !== 'published') return null;
          if (filters.status === 'draft' && version.status !== 'draft') return null;
        }

        // Apply instructor filter
        if (filters.instructor) {
          const hasInstructor = version.instructorIds.some(
            id => id.toString() === filters.instructor
          );
          if (!hasInstructor) return null;
        }

        // Apply search filter on title (if not already filtered by code)
        if (filters.search && !query.code) {
          const searchRegex = new RegExp(filters.search, 'i');
          if (!searchRegex.test(version.title)) return null;
        }

        return {
          id: canonical._id.toString(),
          title: version.title,
          code: canonical.code,
          description: version.description || '',
          department: {
            id: department?._id.toString() || '',
            name: department?.name || ''
          },
          program,
          credits: version.credits,
          duration: version.duration,
          status: version.status,
          instructors: instructors.filter(Boolean),
          settings: version.settings,
          adaptiveSettings: version.adaptiveSettings,
          moduleCount,
          enrollmentCount,
          publishedAt: version.publishedAt || null,
          archivedAt: version.status === 'archived' ? version.lockedAt : null,
          createdBy: version.createdBy?.toString() || '',
          createdAt: canonical.createdAt,
          updatedAt: canonical.updatedAt
        };
      })
    );

    // Filter out null entries (courses without versions or filtered out by status/instructor)
    const filteredCourses = coursesData.filter(Boolean);

    // When post-fetch filtering is active, pagination totals must reflect filtered results.
    // Since we can't cheaply count the true total across all pages, we report what we know:
    // the filtered count for this page. This gives correct empty-page detection and avoids
    // overstating the total (which previously caused empty pages in the UI).
    const hasPostFilter = !!(filters.status || filters.instructor);
    const effectiveTotal = hasPostFilter ? filteredCourses.length + skip : total;

    return {
      courses: filteredCourses,
      pagination: {
        page,
        limit,
        total: effectiveTotal,
        totalPages: Math.ceil(effectiveTotal / limit),
        hasNext: hasPostFilter ? filteredCourses.length === limit : page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Create a new course
   */
  static async createCourse(courseData: CreateCourseInput, createdBy?: string): Promise<any> {
    // Validate code format (ABC123)
    const codePattern = /^[A-Za-z0-9]+$/;
    if (!codePattern.test(courseData.code) || courseData.code.length > 35) {
      throw ApiError.badRequest('Course code must contain only letters and numbers (max 35 characters)');
    }

    // Validate department exists
    const department = await Department.findById(courseData.department);
    if (!department) {
      throw ApiError.notFound('Department does not exist');
    }

    // Check if code already exists in department (check CanonicalCourse, not old Course model)
    const existingCanonical = await CanonicalCourse.findOne({
      departmentId: courseData.department,
      code: courseData.code.toUpperCase()
    });
    if (existingCanonical) {
      throw ApiError.conflict('Course code already exists in this department');
    }

    // Validate program if provided
    if (courseData.program) {
      const program = await Program.findById(courseData.program);
      if (!program) {
        throw ApiError.notFound('Program does not exist');
      }
      // Verify program belongs to same department
      if (program.departmentId.toString() !== courseData.department) {
        throw ApiError.badRequest('Program must belong to the same department as the course');
      }
    }

    // Validate instructors if provided
    if (courseData.instructors && courseData.instructors.length > 0) {
      const instructorChecks = await Promise.all(
        courseData.instructors.map(async (id) => {
          const user = await User.findById(id);
          return user && (user.userTypes.includes('staff') || user.userTypes.includes('global-admin'));
        })
      );
      if (instructorChecks.some((valid: boolean | null | undefined) => !valid)) {
        throw ApiError.badRequest('One or more instructor IDs are invalid or do not have instructor role');
      }
    }

    // Create CanonicalCourse (the stable course identity)
    const canonicalCourse = new CanonicalCourse({
      code: courseData.code.toUpperCase(),
      departmentId: courseData.department,
      programId: courseData.program || null,
      currentPublishedVersionId: null,
      latestDraftVersionId: null,
      totalVersions: 1,
      createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : new mongoose.Types.ObjectId()
    });

    await canonicalCourse.save();

    // Create CourseVersion v1 (draft)
    const instructorIds = (courseData.instructors || []).map(id => new mongoose.Types.ObjectId(id));
    const creatorId = createdBy ? new mongoose.Types.ObjectId(createdBy) : new mongoose.Types.ObjectId();
    
    const courseVersion = new CourseVersion({
      canonicalCourseId: canonicalCourse._id,
      version: 1,
      title: courseData.title,
      description: courseData.description || null,
      credits: courseData.credits || 0,
      duration: courseData.duration || 0,
      settings: {
        allowSelfEnrollment: courseData.settings?.allowSelfEnrollment || false,
        passingScore: courseData.settings?.passingScore || 70,
        maxAttempts: courseData.settings?.maxAttempts || 3,
        certificateEnabled: courseData.settings?.certificateEnabled || false,
        enforcePrerequisites: true,
        showProgressBar: true,
        allowModuleSkipping: false
      },
      adaptiveSettings: {
        mode: courseData.adaptiveSettings?.mode || 'off',
        allowLearnerChoice: courseData.adaptiveSettings?.allowLearnerChoice || false,
        preAssessmentEnabled: courseData.adaptiveSettings?.preAssessmentEnabled || false
      },
      instructorIds: instructorIds,
      status: 'draft',
      isLocked: false,
      isLatest: true,
      parentVersionId: null,
      createdBy: creatorId,
      publishedAt: null,
      publishedBy: null,
      lockedAt: null,
      lockedBy: null,
      lockedReason: null,
      changeNotes: 'Initial version',
      statsAtLock: null
    });

    await courseVersion.save();

    // Update CanonicalCourse to point to the draft version
    canonicalCourse.latestDraftVersionId = courseVersion._id as mongoose.Types.ObjectId;
    await canonicalCourse.save();

    // Return response with CanonicalCourse ID (this is the courseId that modules endpoint expects)
    return {
      id: canonicalCourse._id.toString(),
      title: courseVersion.title,
      code: canonicalCourse.code,
      description: courseVersion.description || '',
      department: courseData.department,
      program: courseData.program || null,
      credits: courseVersion.credits,
      duration: courseVersion.duration,
      status: 'draft',
      instructors: courseData.instructors || [],
      settings: courseVersion.settings,
      adaptiveSettings: courseVersion.adaptiveSettings,
      createdBy: createdBy || '',
      createdAt: canonicalCourse.createdAt,
      updatedAt: canonicalCourse.updatedAt
    };
  }

  /**
   * Get course by ID with full details
   * Uses CanonicalCourse + CourseVersion (versioning system)
   */
  static async getCourseById(courseId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    // Look up CanonicalCourse (matches IDs returned by listCourses)
    const canonical = await CanonicalCourse.findById(courseId);
    if (!canonical) {
      throw ApiError.notFound('Course not found');
    }

    // Get the current published or latest draft version
    const versionId = canonical.currentPublishedVersionId || canonical.latestDraftVersionId;
    if (!versionId) {
      throw ApiError.notFound('Course has no versions');
    }

    const version = await CourseVersion.findById(versionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    // Get department info
    const department = await Department.findById(canonical.departmentId);

    // Get program info if exists
    let program = null;
    if (canonical.programId) {
      const programDoc = await Program.findById(canonical.programId);
      if (programDoc) {
        program = {
          id: programDoc._id.toString(),
          name: programDoc.name
        };
      }
    }

    // Get instructors with full details
    const instructors = await Promise.all(
      version.instructorIds.map(async (id: mongoose.Types.ObjectId) => {
        const staff = await Staff.findById(id);
        const user = await User.findById(id);
        if (staff && user) {
          return {
            id: staff._id.toString(),
            firstName: staff.person.firstName,
            lastName: staff.person.lastName,
            email: user.email,
            role: user.userTypes.includes('staff') ? 'instructor' : 'staff'
          };
        }
        return null;
      })
    );

    // Get modules from CourseVersionModule
    const cvModules = await CourseVersionModule.find({
      courseVersionId: version._id
    }).sort({ order: 1 });

    const modulesData = cvModules.map((cvm: any) => ({
      id: cvm.moduleId?.toString() || cvm._id.toString(),
      title: cvm.title || `Module ${cvm.order}`,
      type: 'custom',
      order: cvm.order,
      isPublished: true
    }));

    // Get enrollment count
    const enrollmentCount = 0; // Placeholder

    // Calculate completion rate
    const completionRate = 0; // Placeholder

    return {
      id: canonical._id.toString(),
      title: version.title,
      code: canonical.code,
      description: version.description || '',
      department: {
        id: department?._id.toString() || '',
        name: department?.name || ''
      },
      program,
      credits: version.credits,
      duration: version.duration,
      status: version.status,
      instructors: instructors.filter(Boolean),
      settings: version.settings,
      adaptiveSettings: version.adaptiveSettings,
      modules: modulesData,
      moduleCount: modulesData.length,
      enrollmentCount,
      completionRate,
      publishedAt: version.publishedAt || null,
      archivedAt: version.status === 'archived' ? version.lockedAt : null,
      createdBy: version.createdBy?.toString() || '',
      createdAt: canonical.createdAt,
      updatedAt: canonical.updatedAt
    };
  }

  /**
   * Update course (full replacement)
   * Uses CanonicalCourse + CourseVersion (versioning system)
   */
  static async updateCourse(courseId: string, updateData: UpdateCourseInput): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const canonical = await CanonicalCourse.findById(courseId);
    if (!canonical) {
      throw ApiError.notFound('Course not found');
    }

    const versionId = canonical.currentPublishedVersionId || canonical.latestDraftVersionId;
    if (!versionId) {
      throw ApiError.notFound('Course has no versions');
    }

    const version = await CourseVersion.findById(versionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    // Cannot update archived courses
    if (version.status === 'archived') {
      throw ApiError.badRequest('Cannot update archived course. Unarchive it first');
    }

    // Validate code format
    const codePattern = /^[A-Za-z0-9]+$/;
    if (!codePattern.test(updateData.code) || updateData.code.length > 35) {
      throw ApiError.badRequest('Course code must contain only letters and numbers (max 35 characters)');
    }

    // Validate department exists
    const department = await Department.findById(updateData.department);
    if (!department) {
      throw ApiError.notFound('Department does not exist');
    }

    // Check if code already exists in department (excluding current course)
    const existingCourse = await CanonicalCourse.findOne({
      departmentId: updateData.department,
      code: updateData.code,
      _id: { $ne: courseId }
    });
    if (existingCourse) {
      throw ApiError.conflict('Course code already exists in this department');
    }

    // Validate program if provided
    if (updateData.program) {
      const program = await Program.findById(updateData.program);
      if (!program) {
        throw ApiError.notFound('Program does not exist');
      }
      if (program.departmentId.toString() !== updateData.department) {
        throw ApiError.badRequest('Program must belong to the same department as the course');
      }
    }

    // Validate instructors if provided
    if (updateData.instructors && updateData.instructors.length > 0) {
      const instructorChecks = await Promise.all(
        updateData.instructors.map(async (id) => {
          const user = await User.findById(id);
          return user && (user.userTypes.includes('staff') || user.userTypes.includes('global-admin'));
        })
      );
      if (instructorChecks.some((valid: boolean | null | undefined) => !valid)) {
        throw ApiError.badRequest('One or more instructor IDs are invalid or do not have instructor role');
      }
    }

    // Update CanonicalCourse fields
    canonical.code = updateData.code;
    canonical.departmentId = new mongoose.Types.ObjectId(updateData.department);
    canonical.programId = updateData.program ? new mongoose.Types.ObjectId(updateData.program) : null;
    await canonical.save();

    // Update CourseVersion fields
    version.title = updateData.title;
    version.description = updateData.description || '';
    version.credits = updateData.credits || 0;
    version.duration = updateData.duration || 0;
    version.instructorIds = (updateData.instructors || []).map(id => new mongoose.Types.ObjectId(id));
    version.settings = {
      ...version.settings,
      allowSelfEnrollment: updateData.settings?.allowSelfEnrollment || false,
      passingScore: updateData.settings?.passingScore || 70,
      maxAttempts: updateData.settings?.maxAttempts || 3,
      certificateEnabled: updateData.settings?.certificateEnabled || false,
    };
    await version.save();

    // Return updated course details
    return this.getCourseById(courseId);
  }

  /**
   * Patch course (partial update)
   * Uses CanonicalCourse + CourseVersion (versioning system)
   */
  static async patchCourse(courseId: string, patchData: PatchCourseInput): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const canonical = await CanonicalCourse.findById(courseId);
    if (!canonical) {
      throw ApiError.notFound('Course not found');
    }

    const versionId = canonical.currentPublishedVersionId || canonical.latestDraftVersionId;
    if (!versionId) {
      throw ApiError.notFound('Course has no versions');
    }

    const version = await CourseVersion.findById(versionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    // Cannot update archived courses
    if (version.status === 'archived') {
      throw ApiError.badRequest('Cannot update archived course. Unarchive it first');
    }

    // Validate instructors if provided
    if (patchData.instructors && patchData.instructors.length > 0) {
      const instructorChecks = await Promise.all(
        patchData.instructors.map(async (id) => {
          const user = await User.findById(id);
          return user && (user.userTypes.includes('staff') || user.userTypes.includes('global-admin'));
        })
      );
      if (instructorChecks.some((valid: boolean | null | undefined) => !valid)) {
        throw ApiError.badRequest('One or more instructor IDs are invalid or do not have instructor role');
      }
    }

    // Update only provided fields on CourseVersion
    if (patchData.title !== undefined) version.title = patchData.title;
    if (patchData.description !== undefined) version.description = patchData.description;
    if (patchData.credits !== undefined) version.credits = patchData.credits;
    if (patchData.duration !== undefined) version.duration = patchData.duration;
    if (patchData.instructors !== undefined) {
      version.instructorIds = patchData.instructors.map(id => new mongoose.Types.ObjectId(id));
    }
    if (patchData.settings !== undefined) {
      version.settings = {
        ...version.settings,
        ...patchData.settings
      };
    }
    if (patchData.adaptiveSettings !== undefined) {
      version.adaptiveSettings = {
        ...(version.adaptiveSettings || { mode: 'off', allowLearnerChoice: false, preAssessmentEnabled: false }),
        ...patchData.adaptiveSettings
      };
    }

    await version.save();

    // Return updated course details
    return this.getCourseById(courseId);
  }

  /**
   * Delete course (soft delete)
   * Uses CanonicalCourse + CourseVersion (versioning system)
   */
  static async deleteCourse(courseId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const canonical = await CanonicalCourse.findById(courseId);
    if (!canonical) {
      throw ApiError.notFound('Course not found');
    }

    // Check for active enrollments (placeholder)
    const hasEnrollments = false;
    if (hasEnrollments) {
      throw ApiError.conflict('Cannot delete course with active enrollments');
    }

    // Archive all versions
    const versionId = canonical.currentPublishedVersionId || canonical.latestDraftVersionId;
    if (versionId) {
      const version = await CourseVersion.findById(versionId);
      if (version) {
        version.status = 'archived';
        version.lockedAt = new Date();
        await version.save();
      }
    }

    // Clear the published version pointer
    canonical.currentPublishedVersionId = null;
    await canonical.save();
  }

  /**
   * Publish course
   * Updated to use CanonicalCourse + CourseVersion (versioning system)
   */
  static async publishCourse(courseId: string, publishedAt?: Date): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    // Find CanonicalCourse
    const canonical = await CanonicalCourse.findById(courseId);
    if (!canonical) {
      throw ApiError.notFound('Course not found');
    }

    // Get the latest version to publish
    if (!canonical.latestDraftVersionId) {
      throw ApiError.badRequest('No version available to publish');
    }

    const latestVersion = await CourseVersion.findById(canonical.latestDraftVersionId);
    if (!latestVersion) {
      throw ApiError.notFound('Version not found');
    }

    // Cannot publish archived courses - must unarchive first
    if (latestVersion.status === 'archived') {
      throw ApiError.badRequest(`Cannot publish archived course. Use /unarchive first. (version ${latestVersion.version} status: ${latestVersion.status})`);
    }

    // Check if already published
    if (latestVersion.status === 'published') {
      throw ApiError.conflict(`Course is already published (version ${latestVersion.version} status: ${latestVersion.status})`);
    }

    // Validate course has at least one module
    const moduleCount = await CourseVersionModule.countDocuments({
      courseVersionId: latestVersion._id
    });
    if (moduleCount === 0) {
      throw ApiError.badRequest('Course cannot be published: must have at least one module');
    }

    // Publish the version
    const publishDate = publishedAt || new Date();
    latestVersion.status = 'published';
    latestVersion.publishedAt = publishDate;
    await latestVersion.save();

    // Update CanonicalCourse to point to published version
    canonical.currentPublishedVersionId = latestVersion._id;
    await canonical.save();

    return {
      id: canonical._id.toString(),
      status: 'published',
      publishedAt: publishDate
    };
  }

  /**
   * Unpublish course
   * Updated to use CanonicalCourse + CourseVersion (versioning system)
   */
  static async unpublishCourse(courseId: string, reason?: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    // Find CanonicalCourse
    const canonical = await CanonicalCourse.findById(courseId);
    if (!canonical) {
      throw ApiError.notFound('Course not found');
    }

    // Get the published version
    if (!canonical.currentPublishedVersionId) {
      throw ApiError.conflict('Course is not currently published');
    }

    const publishedVersion = await CourseVersion.findById(canonical.currentPublishedVersionId);
    if (!publishedVersion) {
      throw ApiError.notFound('Published version not found');
    }

    // Check if course is published
    if (publishedVersion.status !== 'published') {
      throw ApiError.conflict('Course is not currently published');
    }

    // Unpublish the version
    publishedVersion.status = 'draft';
    publishedVersion.publishedAt = null;
    if (reason) {
      publishedVersion.changeNotes = reason;
    }
    await publishedVersion.save();

    // Clear currentPublishedVersionId on CanonicalCourse
    canonical.currentPublishedVersionId = null;
    await canonical.save();

    return {
      id: canonical._id.toString(),
      status: 'draft',
      publishedAt: null
    };
  }

  /**
   * Archive course
   * Updated to use CanonicalCourse + CourseVersion (versioning system)
   */
  static async archiveCourse(courseId: string, reason?: string, archivedAt?: Date): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    // Find CanonicalCourse
    const canonical = await CanonicalCourse.findById(courseId);
    if (!canonical) {
      throw ApiError.notFound('Course not found');
    }

    // Get the current version (published or draft)
    const versionId = canonical.currentPublishedVersionId || canonical.latestDraftVersionId;
    if (!versionId) {
      throw ApiError.badRequest('No version found for this course');
    }

    const version = await CourseVersion.findById(versionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    // Check if already archived
    if (version.status === 'archived') {
      throw ApiError.conflict('Course is already archived');
    }

    // Archive the version
    const archiveDate = archivedAt || new Date();
    version.status = 'archived';
    version.isLocked = true;
    version.lockedAt = archiveDate;
    version.lockedReason = 'archived';
    if (reason) {
      version.changeNotes = reason;
    }
    await version.save();

    // Clear currentPublishedVersionId on CanonicalCourse
    canonical.currentPublishedVersionId = null;
    await canonical.save();

    return {
      id: canonical._id.toString(),
      status: 'archived',
      archivedAt: archiveDate
    };
  }

  /**
   * Unarchive course
   * Updated to use CanonicalCourse + CourseVersion (versioning system)
   */
  static async unarchiveCourse(courseId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    // Find CanonicalCourse
    const canonical = await CanonicalCourse.findById(courseId);
    if (!canonical) {
      throw ApiError.notFound('Course not found');
    }

    // Get the version
    const versionId = canonical.latestDraftVersionId;
    if (!versionId) {
      throw ApiError.badRequest('No version found for this course');
    }

    const version = await CourseVersion.findById(versionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    // Check if course is archived
    if (version.status !== 'archived') {
      throw ApiError.conflict('Course is not currently archived');
    }

    // Unarchive the version
    version.status = 'draft';
    version.isLocked = false;
    version.lockedAt = null;
    version.lockedReason = null;
    await version.save();

    return {
      id: canonical._id.toString(),
      status: 'draft',
      archivedAt: null
    };
  }

  /**
   * Duplicate course
   * Uses CanonicalCourse + CourseVersion (versioning system)
   */
  static async duplicateCourse(courseId: string, options: DuplicateCourseOptions, createdBy?: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const sourceCanonical = await CanonicalCourse.findById(courseId);
    if (!sourceCanonical) {
      throw ApiError.notFound('Source course not found');
    }

    const sourceVersionId = sourceCanonical.currentPublishedVersionId || sourceCanonical.latestDraftVersionId;
    const sourceVersion = sourceVersionId ? await CourseVersion.findById(sourceVersionId) : null;

    // Validate new code format
    const codePattern = /^[A-Za-z0-9]+$/;
    if (!codePattern.test(options.newCode) || options.newCode.length > 35) {
      throw ApiError.badRequest('Course code must contain only letters and numbers (max 35 characters)');
    }

    // Determine target department
    const targetDepartmentId = options.targetDepartment || sourceCanonical.departmentId.toString();
    const targetDepartment = await Department.findById(targetDepartmentId);
    if (!targetDepartment) {
      throw ApiError.notFound('Target department does not exist');
    }

    // Check if new code already exists in target department
    const existingCourse = await CanonicalCourse.findOne({
      departmentId: targetDepartmentId,
      code: options.newCode
    });
    if (existingCourse) {
      throw ApiError.conflict('New course code already exists in target department');
    }

    // Validate target program if provided
    let targetProgramId = null;
    if (options.targetProgram) {
      const targetProgram = await Program.findById(options.targetProgram);
      if (!targetProgram) {
        throw ApiError.notFound('Target program does not exist');
      }
      if (targetProgram.departmentId.toString() !== targetDepartmentId) {
        throw ApiError.badRequest('Target program must belong to the target department');
      }
      targetProgramId = options.targetProgram;
    } else if (!options.targetDepartment) {
      targetProgramId = sourceCanonical.programId?.toString() || null;
    }

    // Create new CanonicalCourse
    const creatorId = createdBy ? new mongoose.Types.ObjectId(createdBy) : sourceCanonical.createdBy;
    const newCanonical = new CanonicalCourse({
      code: options.newCode,
      departmentId: targetDepartmentId,
      programId: targetProgramId,
      totalVersions: 1,
      createdBy: creatorId
    });
    await newCanonical.save();

    // Create new CourseVersion (draft copy)
    const newTitle = options.newTitle || `Copy of ${sourceVersion?.title || 'Untitled'}`;
    const newVersion = new CourseVersion({
      canonicalCourseId: newCanonical._id,
      version: 1,
      title: newTitle,
      description: sourceVersion?.description || '',
      credits: sourceVersion?.credits || 0,
      duration: sourceVersion?.duration || 0,
      status: 'draft',
      instructorIds: [], // Instructors are NOT copied
      settings: options.includeSettings !== false && sourceVersion?.settings
        ? sourceVersion.settings
        : { allowSelfEnrollment: false, passingScore: 70, maxAttempts: 3, certificateEnabled: false, enforcePrerequisites: true, showProgressBar: true, allowModuleSkipping: false },
      adaptiveSettings: sourceVersion?.adaptiveSettings || { mode: 'off', allowLearnerChoice: false, preAssessmentEnabled: false },
      createdBy: creatorId
    });
    await newVersion.save();

    // Update canonical to point to the new version
    newCanonical.latestDraftVersionId = newVersion._id;
    await newCanonical.save();

    // Copy CourseVersionModules if requested
    let moduleCount = 0;
    if (options.includeModules !== false && sourceVersionId) {
      const sourceCvms = await CourseVersionModule.find({ courseVersionId: sourceVersionId });
      const duplicateCvms = sourceCvms.map((cvm: any) => ({
        courseVersionId: newVersion._id,
        moduleId: cvm.moduleId,
        title: cvm.title,
        order: cvm.order
      }));
      if (duplicateCvms.length > 0) {
        await CourseVersionModule.insertMany(duplicateCvms);
        moduleCount = duplicateCvms.length;
      }
    }

    return {
      id: newCanonical._id.toString(),
      title: newTitle,
      code: options.newCode,
      status: 'draft',
      moduleCount,
      sourceCourseId: sourceCanonical._id.toString()
    };
  }

  /**
   * Export course
   * Uses CanonicalCourse + CourseVersion (versioning system)
   */
  static async exportCourse(courseId: string, format: string, _includeModules: boolean = true, _includeAssessments: boolean = true): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const canonical = await CanonicalCourse.findById(courseId);
    if (!canonical) {
      throw ApiError.notFound('Course not found');
    }

    const versionId = canonical.currentPublishedVersionId || canonical.latestDraftVersionId;
    const version = versionId ? await CourseVersion.findById(versionId) : null;

    // Only published courses can be exported
    if (!version || version.status !== 'published') {
      throw ApiError.conflict('Only published courses can be exported');
    }

    // Validate format
    const validFormats = ['scorm1.2', 'scorm2004', 'xapi', 'pdf', 'json'];
    if (!validFormats.includes(format)) {
      throw ApiError.badRequest('Invalid export format. Must be one of: scorm1.2, scorm2004, xapi, pdf, json');
    }

    // Generate export (placeholder)
    const filename = `${canonical.code}-${format}-${new Date().toISOString().split('T')[0]}.zip`;
    const downloadUrl = `https://storage.example.com/exports/${filename}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return {
      downloadUrl,
      filename,
      format,
      size: 45678912,
      expiresAt
    };
  }

  /**
   * Update course department
   * Uses CanonicalCourse (versioning system)
   */
  static async updateCourseDepartment(courseId: string, departmentId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const canonical = await CanonicalCourse.findById(courseId);
    if (!canonical) {
      throw ApiError.notFound('Course not found');
    }

    // Validate target department exists
    const targetDepartment = await Department.findById(departmentId);
    if (!targetDepartment) {
      throw ApiError.notFound('Target department does not exist');
    }

    // Check if course code already exists in target department
    const existingCourse = await CanonicalCourse.findOne({
      departmentId: departmentId,
      code: canonical.code,
      _id: { $ne: courseId }
    });
    if (existingCourse) {
      throw ApiError.conflict('Course code conflicts with existing course in target department');
    }

    // Clear program if it doesn't belong to new department
    if (canonical.programId) {
      const program = await Program.findById(canonical.programId);
      if (program && program.departmentId.toString() !== departmentId) {
        canonical.programId = null;
      }
    }

    // Update department
    canonical.departmentId = new mongoose.Types.ObjectId(departmentId);
    await canonical.save();

    return {
      id: canonical._id.toString(),
      department: {
        id: targetDepartment._id.toString(),
        name: targetDepartment.name
      }
    };
  }

  /**
   * Update course program
   * Uses CanonicalCourse (versioning system)
   */
  static async updateCourseProgram(courseId: string, programId: string | null): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const canonical = await CanonicalCourse.findById(courseId);
    if (!canonical) {
      throw ApiError.notFound('Course not found');
    }

    // If null, remove program assignment
    if (programId === null || programId === '') {
      canonical.programId = null;
      await canonical.save();

      return {
        id: canonical._id.toString(),
        program: null
      };
    }

    // Validate program ID
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    // Validate program exists
    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program does not exist');
    }

    // Verify program belongs to same department as course
    if (program.departmentId.toString() !== canonical.departmentId.toString()) {
      throw ApiError.conflict('Program must belong to same department as course');
    }

    // Update program
    canonical.programId = new mongoose.Types.ObjectId(programId);
    await canonical.save();

    return {
      id: canonical._id.toString(),
      program: {
        id: program._id.toString(),
        name: program.name
      }
    };
  }

  /**
   * Check if user can view a course based on visibility rules
   *
   * Uses the unified authorization system with additional business logic for visibility.
   *
   * Business Rules:
   * - Published courses: visible to all authenticated users
   * - Draft/Archived courses: requires 'content:courses:read' right in course's department
   * - Course creator can always view their own course (via 'own' scope)
   *
   * @param course - Course document (raw DB or transformed API object)
   * @param user - Authenticated user from request context
   * @param _departmentContext - (Deprecated) Previously used for navigation context
   */
  static async canViewCourse(course: any, user: AuthenticatedUser, _departmentContext?: string): Promise<boolean> {
    // Handle transformed API object (has 'status' field) vs raw DB object (has 'isActive' field)
    const courseStatus = course.status || (!course.isActive ? 'archived' : (course.metadata?.status === 'published' ? 'published' : 'draft'));

    // Published courses are visible to all authenticated users
    if (courseStatus === 'published') {
      return true;
    }

    // For draft/archived courses, use unified authorization
    const courseDeptId = course.departmentId?.toString() || course.department?.id;
    const creatorId = course.metadata?.createdBy?.toString() || course.createdBy?.id;
    const courseId = course._id?.toString() || course.id;

    const result = await authorize(user, 'content:courses:read', {
      resource: {
        type: 'course',
        id: courseId,
        departmentId: courseDeptId,
        createdBy: creatorId
      }
    });

    return result.allowed;
  }

  /**
   * Check if user can edit a course based on authorization and status rules
   *
   * Uses the unified authorization system with additional business logic for status.
   *
   * Business Rules:
   * - Archived courses: not editable (must unarchive first)
   * - Draft/Published courses: requires 'content:courses:manage' right in course's department
   * - Course creator can edit their own draft courses (via 'own' scope)
   *
   * @param course - Course document (raw DB or transformed API object)
   * @param user - Authenticated user from request context
   */
  static async canEditCourse(course: any, user: AuthenticatedUser): Promise<boolean> {
    // Handle transformed API object (has 'status' field) vs raw DB object (has 'isActive' field)
    const courseStatus = course.status || (!course.isActive ? 'archived' : (course.metadata?.status === 'published' ? 'published' : 'draft'));

    // Archived courses cannot be edited - this is business logic, not authorization
    if (courseStatus === 'archived') {
      return false;
    }

    // Use unified authorization for edit permission
    const courseDeptId = course.departmentId?.toString() || course.department?.id;
    const creatorId = course.metadata?.createdBy?.toString() || course.createdBy?.id;
    const courseId = course._id?.toString() || course.id;

    const result = await authorize(user, 'content:courses:manage', {
      resource: {
        type: 'course',
        id: courseId,
        departmentId: courseDeptId,
        createdBy: creatorId
      }
    });

    return result.allowed;
  }

  /**
   * Apply department scoping to course list query
   *
   * Uses the unified authorization system to determine which departments
   * the user can read courses from, including hierarchical access.
   *
   * @param query - MongoDB query object to modify
   * @param user - Authenticated user from request context
   */
  static async applyDepartmentScoping(query: any, user: AuthenticatedUser): Promise<any> {
    // Check if user has global access FIRST (indicated by having '*' global right)
    // In this case, don't add department filter - they can see all
    if (user.globalRights?.includes('*') || user.globalRights?.includes('content:*') || user.globalRights?.includes('content:courses:*') || user.globalRights?.includes('content:courses:read')) {
      return query;
    }

    // Use unified authorization to get departments where user has read access
    // This handles department rights and hierarchy automatically
    const accessibleDepartments = getDepartmentsWithRight(user, 'content:courses:read', true);

    if (accessibleDepartments.length === 0) {
      // No department access - return empty result set
      query.departmentId = { $in: [] };
      return query;
    }

    // Add department filter to query
    query.departmentId = { $in: accessibleDepartments };

    return query;
  }

  /**
   * Filter courses based on visibility rules
   *
   * Uses canViewCourse() which leverages the unified authorization system.
   * Applies business rules for draft/published/archived course visibility.
   *
   * @param courses - Array of course documents to filter
   * @param user - Authenticated user from request context
   * @param departmentContext - (Deprecated) Previously used for navigation context
   */
  static async filterCoursesByVisibility(courses: any[], user: AuthenticatedUser, departmentContext?: string): Promise<any[]> {
    const visibleCourses: any[] = [];

    for (const course of courses) {
      const canView = await this.canViewCourse(course, user, departmentContext);
      if (canView) {
        visibleCourses.push(course);
      }
    }

    return visibleCourses;
  }
}
