import mongoose from 'mongoose';
import DepartmentAccessPolicy, {
  IDepartmentAccessPolicy,
  IAccessDuration,
  IAccessNotificationSettings
} from '@/models/policy/DepartmentAccessPolicy.model';
import ProgramAccessOverride, {
  IProgramAccessOverride
} from '@/models/policy/ProgramAccessOverride.model';
import Program from '@/models/academic/Program.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Effective Policy Interface
 *
 * Represents the merged policy for a program, combining
 * department defaults with program-level overrides.
 */
export interface IEffectivePolicy {
  /** Source information */
  source: {
    departmentId: string;
    programId?: string;
    hasProgramOverride: boolean;
  };

  /** Access duration configuration */
  accessDuration: IAccessDuration;

  /** New version access settings */
  allowNewVersionAccess: boolean;
  newVersionAccessWindow?: number;

  /** Certificate upgrade settings */
  allowCertificateUpgrade: boolean;
  certificateUpgradeWindow?: number;

  /** Retake settings */
  allowCourseRetakes: boolean;
  maxRetakesPerCourse?: number;
  retakeCooldownDays: number;

  /** Sequential completion (program-specific) */
  requireSequentialCompletion: boolean;

  /** Notification settings */
  notifications: IAccessNotificationSettings;
}

/**
 * Department Access Policy Update Data
 */
export interface IDepartmentAccessPolicyUpdateData {
  defaultAccessDuration?: IAccessDuration;
  allowNewVersionAccess?: boolean;
  newVersionAccessWindow?: number | null;
  allowCertificateUpgrade?: boolean;
  certificateUpgradeWindow?: number | null;
  allowCourseRetakes?: boolean;
  maxRetakesPerCourse?: number | null;
  retakeCooldownDays?: number;
  notifications?: Partial<IAccessNotificationSettings>;
}

/**
 * Program Access Override Update Data
 */
export interface IProgramAccessOverrideUpdateData {
  accessDuration?: IAccessDuration | null;
  allowNewVersionAccess?: boolean | null;
  newVersionAccessWindow?: number | null;
  allowCertificateUpgrade?: boolean | null;
  certificateUpgradeWindow?: number | null;
  allowCourseRetakes?: boolean | null;
  maxRetakesPerCourse?: number | null;
  retakeCooldownDays?: number | null;
  requireSequentialCompletion?: boolean;
  notifications?: Partial<IAccessNotificationSettings> | null;
}

/**
 * Access Policy Service
 *
 * Handles CRUD operations for department access policies and program overrides,
 * as well as computing the effective policy for enrollments.
 */
export class AccessPolicyService {
  /**
   * Get department access policy
   *
   * @param departmentId - Department ID
   * @returns Department access policy or null if not found
   */
  static async getDepartmentPolicy(
    departmentId: string
  ): Promise<IDepartmentAccessPolicy | null> {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const result = await DepartmentAccessPolicy.findOne({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    }).lean();

    return result as IDepartmentAccessPolicy | null;
  }

  /**
   * Create or update department access policy
   *
   * @param departmentId - Department ID
   * @param data - Policy data
   * @returns Created or updated policy
   */
  static async upsertDepartmentPolicy(
    departmentId: string,
    data: IDepartmentAccessPolicyUpdateData
  ): Promise<IDepartmentAccessPolicy> {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    // Validate access duration if provided
    if (data.defaultAccessDuration) {
      this.validateAccessDuration(data.defaultAccessDuration);
    }

    const deptObjectId = new mongoose.Types.ObjectId(departmentId);

    // Check if policy exists
    const existingPolicy = await DepartmentAccessPolicy.findOne({
      departmentId: deptObjectId
    });

    if (existingPolicy) {
      // Update existing policy
      const updateData: any = {};

      if (data.defaultAccessDuration !== undefined) {
        updateData.defaultAccessDuration = data.defaultAccessDuration;
      }
      if (data.allowNewVersionAccess !== undefined) {
        updateData.allowNewVersionAccess = data.allowNewVersionAccess;
      }
      if (data.newVersionAccessWindow !== undefined) {
        updateData.newVersionAccessWindow = data.newVersionAccessWindow === null
          ? undefined
          : data.newVersionAccessWindow;
      }
      if (data.allowCertificateUpgrade !== undefined) {
        updateData.allowCertificateUpgrade = data.allowCertificateUpgrade;
      }
      if (data.certificateUpgradeWindow !== undefined) {
        updateData.certificateUpgradeWindow = data.certificateUpgradeWindow === null
          ? undefined
          : data.certificateUpgradeWindow;
      }
      if (data.allowCourseRetakes !== undefined) {
        updateData.allowCourseRetakes = data.allowCourseRetakes;
      }
      if (data.maxRetakesPerCourse !== undefined) {
        updateData.maxRetakesPerCourse = data.maxRetakesPerCourse === null
          ? undefined
          : data.maxRetakesPerCourse;
      }
      if (data.retakeCooldownDays !== undefined) {
        updateData.retakeCooldownDays = data.retakeCooldownDays;
      }
      if (data.notifications !== undefined) {
        // Merge notification settings
        updateData.notifications = {
          ...existingPolicy.notifications,
          ...data.notifications
        };
      }

      // Mark as active if it was soft-deleted
      updateData.isActive = true;

      const updatedPolicy = await DepartmentAccessPolicy.findByIdAndUpdate(
        existingPolicy._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      return updatedPolicy!;
    } else {
      // Create new policy
      const newPolicy = new DepartmentAccessPolicy({
        departmentId: deptObjectId,
        defaultAccessDuration: data.defaultAccessDuration || { type: 'perpetual' },
        allowNewVersionAccess: data.allowNewVersionAccess ?? true,
        newVersionAccessWindow: data.newVersionAccessWindow ?? undefined,
        allowCertificateUpgrade: data.allowCertificateUpgrade ?? true,
        certificateUpgradeWindow: data.certificateUpgradeWindow ?? undefined,
        allowCourseRetakes: data.allowCourseRetakes ?? true,
        maxRetakesPerCourse: data.maxRetakesPerCourse ?? undefined,
        retakeCooldownDays: data.retakeCooldownDays ?? 0,
        notifications: {
          notifyBeforeExpiration: data.notifications?.notifyBeforeExpiration ?? true,
          daysBeforeExpirationNotification: data.notifications?.daysBeforeExpirationNotification ?? 30,
          notifyOnNewVersion: data.notifications?.notifyOnNewVersion ?? true,
          notifyOnCertificateUpgrade: data.notifications?.notifyOnCertificateUpgrade ?? true,
          notifyAdminOnExtensionRequest: data.notifications?.notifyAdminOnExtensionRequest ?? true
        },
        isActive: true
      });

      await newPolicy.save();
      return newPolicy;
    }
  }

  /**
   * Get program access override
   *
   * @param programId - Program ID
   * @returns Program access override or null if not found
   */
  static async getProgramOverride(
    programId: string
  ): Promise<IProgramAccessOverride | null> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const result = await ProgramAccessOverride.findOne({
      programId: new mongoose.Types.ObjectId(programId),
      isActive: true
    }).lean();

    return result as IProgramAccessOverride | null;
  }

  /**
   * Create or update program access override
   *
   * @param programId - Program ID
   * @param data - Override data
   * @returns Created or updated override
   */
  static async upsertProgramOverride(
    programId: string,
    data: IProgramAccessOverrideUpdateData
  ): Promise<IProgramAccessOverride> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    // Verify program exists
    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Validate access duration if provided
    if (data.accessDuration) {
      this.validateAccessDuration(data.accessDuration);
    }

    const programObjectId = new mongoose.Types.ObjectId(programId);

    // Check if override exists
    const existingOverride = await ProgramAccessOverride.findOne({
      programId: programObjectId
    });

    if (existingOverride) {
      // Update existing override
      const updateData: any = {};

      // Handle null as "clear override" vs undefined as "don't change"
      if (data.accessDuration !== undefined) {
        updateData.accessDuration = data.accessDuration === null ? undefined : data.accessDuration;
      }
      if (data.allowNewVersionAccess !== undefined) {
        updateData.allowNewVersionAccess = data.allowNewVersionAccess === null ? undefined : data.allowNewVersionAccess;
      }
      if (data.newVersionAccessWindow !== undefined) {
        updateData.newVersionAccessWindow = data.newVersionAccessWindow === null ? undefined : data.newVersionAccessWindow;
      }
      if (data.allowCertificateUpgrade !== undefined) {
        updateData.allowCertificateUpgrade = data.allowCertificateUpgrade === null ? undefined : data.allowCertificateUpgrade;
      }
      if (data.certificateUpgradeWindow !== undefined) {
        updateData.certificateUpgradeWindow = data.certificateUpgradeWindow === null ? undefined : data.certificateUpgradeWindow;
      }
      if (data.allowCourseRetakes !== undefined) {
        updateData.allowCourseRetakes = data.allowCourseRetakes === null ? undefined : data.allowCourseRetakes;
      }
      if (data.maxRetakesPerCourse !== undefined) {
        updateData.maxRetakesPerCourse = data.maxRetakesPerCourse === null ? undefined : data.maxRetakesPerCourse;
      }
      if (data.retakeCooldownDays !== undefined) {
        updateData.retakeCooldownDays = data.retakeCooldownDays === null ? undefined : data.retakeCooldownDays;
      }
      if (data.requireSequentialCompletion !== undefined) {
        updateData.requireSequentialCompletion = data.requireSequentialCompletion;
      }
      if (data.notifications !== undefined) {
        updateData.notifications = data.notifications === null ? undefined : data.notifications;
      }

      // Mark as active if it was soft-deleted
      updateData.isActive = true;

      const updatedOverride = await ProgramAccessOverride.findByIdAndUpdate(
        existingOverride._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      return updatedOverride!;
    } else {
      // Create new override
      const newOverride = new ProgramAccessOverride({
        programId: programObjectId,
        accessDuration: data.accessDuration ?? undefined,
        allowNewVersionAccess: data.allowNewVersionAccess ?? undefined,
        newVersionAccessWindow: data.newVersionAccessWindow ?? undefined,
        allowCertificateUpgrade: data.allowCertificateUpgrade ?? undefined,
        certificateUpgradeWindow: data.certificateUpgradeWindow ?? undefined,
        allowCourseRetakes: data.allowCourseRetakes ?? undefined,
        maxRetakesPerCourse: data.maxRetakesPerCourse ?? undefined,
        retakeCooldownDays: data.retakeCooldownDays ?? undefined,
        requireSequentialCompletion: data.requireSequentialCompletion ?? false,
        notifications: data.notifications ?? undefined,
        isActive: true
      });

      await newOverride.save();
      return newOverride;
    }
  }

  /**
   * Delete program access override (soft delete)
   *
   * @param programId - Program ID
   */
  static async deleteProgramOverride(programId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const result = await ProgramAccessOverride.findOneAndUpdate(
      { programId: new mongoose.Types.ObjectId(programId) },
      { isActive: false },
      { new: true }
    );

    if (!result) {
      throw ApiError.notFound('Program access override not found');
    }
  }

  /**
   * Get effective policy for a program
   *
   * Merges department defaults with program-level overrides.
   *
   * @param programId - Program ID
   * @returns Effective policy
   */
  static async getEffectivePolicy(programId: string): Promise<IEffectivePolicy> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    // Get program to find department
    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    const departmentId = program.departmentId.toString();

    // Get department policy (or create default)
    let departmentPolicy = await this.getDepartmentPolicy(departmentId);
    if (!departmentPolicy) {
      // Use defaults if no policy exists
      departmentPolicy = {
        defaultAccessDuration: { type: 'perpetual' },
        allowNewVersionAccess: true,
        allowCertificateUpgrade: true,
        allowCourseRetakes: true,
        retakeCooldownDays: 0,
        notifications: {
          notifyBeforeExpiration: true,
          daysBeforeExpirationNotification: 30,
          notifyOnNewVersion: true,
          notifyOnCertificateUpgrade: true,
          notifyAdminOnExtensionRequest: true
        }
      } as IDepartmentAccessPolicy;
    }

    // Get program override (if any)
    const programOverride = await this.getProgramOverride(programId);

    // Merge policies
    const effectivePolicy: IEffectivePolicy = {
      source: {
        departmentId,
        programId: programOverride ? programId : undefined,
        hasProgramOverride: !!programOverride
      },
      accessDuration: programOverride?.accessDuration || departmentPolicy.defaultAccessDuration,
      allowNewVersionAccess: programOverride?.allowNewVersionAccess ?? departmentPolicy.allowNewVersionAccess,
      newVersionAccessWindow: programOverride?.newVersionAccessWindow ?? departmentPolicy.newVersionAccessWindow,
      allowCertificateUpgrade: programOverride?.allowCertificateUpgrade ?? departmentPolicy.allowCertificateUpgrade,
      certificateUpgradeWindow: programOverride?.certificateUpgradeWindow ?? departmentPolicy.certificateUpgradeWindow,
      allowCourseRetakes: programOverride?.allowCourseRetakes ?? departmentPolicy.allowCourseRetakes,
      maxRetakesPerCourse: programOverride?.maxRetakesPerCourse ?? departmentPolicy.maxRetakesPerCourse,
      retakeCooldownDays: programOverride?.retakeCooldownDays ?? departmentPolicy.retakeCooldownDays ?? 0,
      requireSequentialCompletion: programOverride?.requireSequentialCompletion ?? false,
      notifications: {
        notifyBeforeExpiration:
          programOverride?.notifications?.notifyBeforeExpiration ??
          departmentPolicy.notifications.notifyBeforeExpiration,
        daysBeforeExpirationNotification:
          programOverride?.notifications?.daysBeforeExpirationNotification ??
          departmentPolicy.notifications.daysBeforeExpirationNotification,
        notifyOnNewVersion:
          programOverride?.notifications?.notifyOnNewVersion ??
          departmentPolicy.notifications.notifyOnNewVersion,
        notifyOnCertificateUpgrade:
          programOverride?.notifications?.notifyOnCertificateUpgrade ??
          departmentPolicy.notifications.notifyOnCertificateUpgrade,
        notifyAdminOnExtensionRequest:
          programOverride?.notifications?.notifyAdminOnExtensionRequest ??
          departmentPolicy.notifications.notifyAdminOnExtensionRequest
      }
    };

    return effectivePolicy;
  }

  /**
   * Calculate access expiration date based on policy and enrollment date
   *
   * @param policy - Effective policy or access duration
   * @param enrollmentDate - Date of enrollment
   * @returns Expiration date or null if perpetual
   */
  static calculateExpirationDate(
    accessDuration: IAccessDuration,
    enrollmentDate: Date
  ): Date | null {
    if (accessDuration.type === 'perpetual') {
      return null;
    }

    const baseDate = new Date(enrollmentDate);

    switch (accessDuration.type) {
      case 'months':
        baseDate.setMonth(baseDate.getMonth() + (accessDuration.value || 0));
        return baseDate;

      case 'years':
        baseDate.setFullYear(baseDate.getFullYear() + (accessDuration.value || 0));
        return baseDate;

      case 'custom':
        baseDate.setDate(baseDate.getDate() + (accessDuration.value || 0));
        return baseDate;

      default:
        return null;
    }
  }

  /**
   * Validate access duration configuration
   */
  private static validateAccessDuration(duration: IAccessDuration): void {
    if (duration.type !== 'perpetual' && (duration.value === undefined || duration.value === null)) {
      throw ApiError.badRequest(
        `Access duration value is required for type '${duration.type}'`
      );
    }

    if (duration.value !== undefined && duration.value < 0) {
      throw ApiError.badRequest('Access duration value cannot be negative');
    }
  }
}
