import mongoose from 'mongoose';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion, {
  ICourseVersion,
  ICourseSettings
} from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import { ApiError } from '@/utils/ApiError';
import { EventEmitter } from 'events';

/**
 * Event emitter for course versioning events.
 * Other services can subscribe to these events for side effects
 * (e.g., certificate auto-versioning, notifications).
 */
export const courseVersionEvents = new EventEmitter();

/**
 * Event types emitted by the course versioning system
 */
export interface CourseVersionPublishedEvent {
  courseVersionId: string;
  canonicalCourseId: string;
  version: number;
  previousVersionId: string | null;
  publishedBy: string;
  publishedAt: Date;
}

/**
 * Input for updating a draft version
 */
export interface UpdateDraftInput {
  title?: string;
  description?: string | null;
  credits?: number;
  duration?: number;
  settings?: Partial<ICourseSettings>;
  instructorIds?: string[];
  changeNotes?: string | null;
}

/**
 * CourseVersion Service
 *
 * Handles all course versioning operations including creating drafts,
 * updating drafts, publishing versions, and locking versions.
 */
export class CourseVersionService {
  /**
   * Create a new draft version from a published course version.
   *
   * Business Rules:
   * - Can only create a new version from a published version
   * - The canonical course must have a current published version
   * - Only one draft can exist at a time (latestDraftVersionId)
   *
   * @param canonicalCourseId - The canonical course to create a version for
   * @param changeNotes - Optional notes describing the intended changes
   * @param userId - The user creating the version
   */
  static async createVersion(
    canonicalCourseId: string,
    changeNotes: string | null,
    userId: string
  ): Promise<ICourseVersion> {
    if (!mongoose.Types.ObjectId.isValid(canonicalCourseId)) {
      throw ApiError.badRequest('Invalid canonical course ID');
    }

    // Get the canonical course
    const canonicalCourse = await CanonicalCourse.findById(canonicalCourseId);
    if (!canonicalCourse) {
      throw ApiError.notFound('Canonical course not found');
    }

    // Check if there's already a draft
    if (canonicalCourse.latestDraftVersionId) {
      throw ApiError.conflict(
        'A draft version already exists. Please edit or discard the existing draft before creating a new one.'
      );
    }

    // Get the current published version to copy from
    if (!canonicalCourse.currentPublishedVersionId) {
      throw ApiError.badRequest(
        'Cannot create a new version: no published version exists. Create an initial version first.'
      );
    }

    const publishedVersion = await CourseVersion.findById(
      canonicalCourse.currentPublishedVersionId
    );
    if (!publishedVersion) {
      throw ApiError.internal('Published version reference is invalid');
    }

    // Calculate next version number
    const nextVersion = canonicalCourse.totalVersions + 1;

    // Create new draft version copying from published
    const newVersion = new CourseVersion({
      canonicalCourseId: canonicalCourse._id,
      version: nextVersion,
      title: publishedVersion.title,
      description: publishedVersion.description,
      credits: publishedVersion.credits,
      duration: publishedVersion.duration,
      settings: { ...(publishedVersion.settings as any) },
      instructorIds: [...publishedVersion.instructorIds],
      status: 'draft',
      isLocked: false,
      isLatest: true,
      parentVersionId: publishedVersion._id,
      createdBy: new mongoose.Types.ObjectId(userId),
      changeNotes: changeNotes
    });

    // Mark previous version as not latest
    publishedVersion.isLatest = false;
    await publishedVersion.save();

    // Save new version
    await newVersion.save();

    // Copy module associations from parent version
    const sourceModules = await CourseVersionModule.find({
      courseVersionId: publishedVersion._id
    });
    if (sourceModules.length > 0) {
      await CourseVersionModule.insertMany(
        sourceModules.map(m => ({
          courseVersionId: newVersion._id,
          moduleId: m.moduleId,
          order: m.order,
          isRequired: m.isRequired,
          availableFrom: m.availableFrom,
          availableUntil: m.availableUntil
        }))
      );
    }

    // Update canonical course
    canonicalCourse.latestDraftVersionId = newVersion._id as mongoose.Types.ObjectId;
    canonicalCourse.totalVersions = nextVersion;
    await canonicalCourse.save();

    return newVersion;
  }

  /**
   * Get a specific course version by ID.
   *
   * @param versionId - The version ID to retrieve
   */
  static async getVersion(versionId: string): Promise<ICourseVersion> {
    if (!mongoose.Types.ObjectId.isValid(versionId)) {
      throw ApiError.badRequest('Invalid version ID');
    }

    const version = await CourseVersion.findById(versionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    return version;
  }

  /**
   * List all versions for a canonical course.
   *
   * @param canonicalCourseId - The canonical course to list versions for
   */
  static async listVersions(
    canonicalCourseId: string
  ): Promise<ICourseVersion[]> {
    if (!mongoose.Types.ObjectId.isValid(canonicalCourseId)) {
      throw ApiError.badRequest('Invalid canonical course ID');
    }

    // Verify canonical course exists
    const canonicalCourse = await CanonicalCourse.findById(canonicalCourseId);
    if (!canonicalCourse) {
      throw ApiError.notFound('Canonical course not found');
    }

    const versions = await CourseVersion.find({ canonicalCourseId })
      .sort({ version: -1 })
      .exec();

    return versions;
  }

  /**
   * Update a draft course version.
   *
   * Business Rules:
   * - Can only update versions in 'draft' status
   * - Cannot update locked versions
   *
   * @param versionId - The version ID to update
   * @param updates - The fields to update
   */
  static async updateDraft(
    versionId: string,
    updates: UpdateDraftInput
  ): Promise<ICourseVersion> {
    if (!mongoose.Types.ObjectId.isValid(versionId)) {
      throw ApiError.badRequest('Invalid version ID');
    }

    const version = await CourseVersion.findById(versionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    // Validate version is editable
    if (version.status !== 'draft') {
      throw ApiError.badRequest(
        `Cannot update version: status is '${version.status}'. Only draft versions can be updated.`
      );
    }

    if (version.isLocked) {
      throw ApiError.badRequest('Cannot update a locked version');
    }

    // Apply updates
    if (updates.title !== undefined) {
      version.title = updates.title;
    }
    if (updates.description !== undefined) {
      version.description = updates.description;
    }
    if (updates.credits !== undefined) {
      version.credits = updates.credits;
    }
    if (updates.duration !== undefined) {
      version.duration = updates.duration;
    }
    if (updates.settings !== undefined) {
      version.settings = {
        ...(version.settings as any),
        ...updates.settings
      } as ICourseSettings;
    }
    if (updates.instructorIds !== undefined) {
      version.instructorIds = updates.instructorIds.map(
        id => new mongoose.Types.ObjectId(id)
      );
    }
    if (updates.changeNotes !== undefined) {
      version.changeNotes = updates.changeNotes;
    }

    await version.save();
    return version;
  }

  /**
   * Publish a course version.
   *
   * Business Rules:
   * 1. Validate version is in 'draft' status
   * 2. Lock current published version (isLocked=true, lockedReason='superseded', capture statsAtLock)
   * 3. Update new version (status='published', publishedAt, publishedBy, isLatest=true)
   * 4. Update CanonicalCourse (currentPublishedVersionId, latestDraftVersionId=null)
   * 5. Emit event: 'course.version.published'
   *
   * @param versionId - The version ID to publish
   * @param userId - The user publishing the version
   */
  static async publishVersion(
    versionId: string,
    userId: string
  ): Promise<ICourseVersion> {
    if (!mongoose.Types.ObjectId.isValid(versionId)) {
      throw ApiError.badRequest('Invalid version ID');
    }

    const version = await CourseVersion.findById(versionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    // 1. Validate version is in 'draft' status
    if (version.status !== 'draft') {
      throw ApiError.badRequest(
        `Cannot publish version: status is '${version.status}'. Only draft versions can be published.`
      );
    }

    if (version.isLocked) {
      throw ApiError.badRequest('Cannot publish a locked version');
    }

    const canonicalCourse = await CanonicalCourse.findById(
      version.canonicalCourseId
    );
    if (!canonicalCourse) {
      throw ApiError.internal('Canonical course not found');
    }

    let previousVersionId: string | null = null;

    // 2. Lock current published version if it exists
    if (canonicalCourse.currentPublishedVersionId) {
      const previousVersion = await CourseVersion.findById(
        canonicalCourse.currentPublishedVersionId
      );

      if (previousVersion) {
        previousVersionId = previousVersion._id.toString();

        // Capture stats at lock time
        // Note: In a full implementation, these would be queried from related collections
        // For now, we use placeholder values that should be calculated
        const statsAtLock = await this.calculateVersionStats(
          previousVersion._id.toString()
        );

        previousVersion.isLocked = true;
        previousVersion.lockedAt = new Date();
        previousVersion.lockedBy = new mongoose.Types.ObjectId(userId);
        previousVersion.lockedReason = 'superseded';
        previousVersion.statsAtLock = statsAtLock;
        previousVersion.isLatest = false;

        await previousVersion.save();
      }
    }

    // 3. Update new version
    const now = new Date();
    version.status = 'published';
    version.publishedAt = now;
    version.publishedBy = new mongoose.Types.ObjectId(userId);
    version.isLatest = true;

    await version.save();

    // 4. Update CanonicalCourse
    canonicalCourse.currentPublishedVersionId = version._id as mongoose.Types.ObjectId;
    canonicalCourse.latestDraftVersionId = null;
    await canonicalCourse.save();

    // 5. Emit event
    const event: CourseVersionPublishedEvent = {
      courseVersionId: version._id.toString(),
      canonicalCourseId: canonicalCourse._id.toString(),
      version: version.version,
      previousVersionId,
      publishedBy: userId,
      publishedAt: now
    };
    courseVersionEvents.emit('course.version.published', event);

    return version;
  }

  /**
   * Lock a course version manually.
   *
   * Business Rules:
   * - Can lock any version that isn't already locked
   * - Captures stats at lock time
   *
   * @param versionId - The version ID to lock
   * @param reason - The reason for locking (must be 'manual' for manual locks)
   * @param userId - The user locking the version
   */
  static async lockVersion(
    versionId: string,
    reason: string,
    userId: string
  ): Promise<ICourseVersion> {
    if (!mongoose.Types.ObjectId.isValid(versionId)) {
      throw ApiError.badRequest('Invalid version ID');
    }

    const version = await CourseVersion.findById(versionId);
    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    if (version.isLocked) {
      throw ApiError.conflict('Version is already locked');
    }

    // Calculate stats at lock time
    const statsAtLock = await this.calculateVersionStats(versionId);

    version.isLocked = true;
    version.lockedAt = new Date();
    version.lockedBy = new mongoose.Types.ObjectId(userId);
    version.lockedReason = 'manual';
    version.statsAtLock = statsAtLock;

    // Store the reason in changeNotes if provided
    if (reason && reason !== 'manual') {
      version.changeNotes = version.changeNotes
        ? `${version.changeNotes}\n\nLock reason: ${reason}`
        : `Lock reason: ${reason}`;
    }

    await version.save();
    return version;
  }

  /**
   * Calculate statistics for a course version.
   *
   * @param versionId - The version ID to calculate stats for
   */
  private static async calculateVersionStats(versionId: string): Promise<{
    moduleCount: number;
    learningUnitCount: number;
    enrollmentCount: number;
  }> {
    // Count modules via CourseVersionModule collection
    const moduleCount = await CourseVersionModule.countDocuments({
      courseVersionId: versionId
    });

    // TODO: Count learning units via modules when LearningUnit model relationship is established
    // For now, placeholder for learning unit count
    const learningUnitCount = 0;

    // TODO: Count enrollments via Enrollment collection when relationship is established
    const enrollmentCount = 0;

    return {
      moduleCount,
      learningUnitCount,
      enrollmentCount
    };
  }

  /**
   * Get the canonical course for a version.
   *
   * @param canonicalCourseId - The canonical course ID
   */
  static async getCanonicalCourse(canonicalCourseId: string) {
    if (!mongoose.Types.ObjectId.isValid(canonicalCourseId)) {
      throw ApiError.badRequest('Invalid canonical course ID');
    }

    const canonicalCourse = await CanonicalCourse.findById(canonicalCourseId);
    if (!canonicalCourse) {
      throw ApiError.notFound('Canonical course not found');
    }

    return canonicalCourse;
  }

  /**
   * Get version details with populated references.
   *
   * @param versionId - The version ID to retrieve
   */
  static async getVersionDetail(versionId: string) {
    if (!mongoose.Types.ObjectId.isValid(versionId)) {
      throw ApiError.badRequest('Invalid version ID');
    }

    const version = await CourseVersion.findById(versionId)
      .populate('canonicalCourseId')
      .populate('instructorIds', 'email')
      .populate('createdBy', 'email')
      .populate('publishedBy', 'email')
      .populate('lockedBy', 'email')
      .exec();

    if (!version) {
      throw ApiError.notFound('Course version not found');
    }

    return version;
  }
}

export default CourseVersionService;
