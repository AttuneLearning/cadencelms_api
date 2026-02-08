/**
 * Unit Tests: AccessPolicyService
 *
 * Tests for the access policy service:
 * - getDepartmentPolicy (findOne with isActive:true, lean)
 * - upsertDepartmentPolicy (create new or update existing, validates accessDuration)
 * - getProgramOverride (findOne with isActive:true, lean)
 * - upsertProgramOverride (verifies program exists, creates or updates)
 * - deleteProgramOverride (soft delete via isActive=false)
 * - getEffectivePolicy (merges department defaults with program overrides)
 * - calculateExpirationDate (pure function: perpetual/months/years/custom)
 */

import mongoose from 'mongoose';
import { AccessPolicyService } from '@/services/policy/accessPolicy.service';
import DepartmentAccessPolicy from '@/models/policy/DepartmentAccessPolicy.model';
import ProgramAccessOverride from '@/models/policy/ProgramAccessOverride.model';
import Program from '@/models/academic/Program.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/policy/DepartmentAccessPolicy.model');
jest.mock('@/models/policy/ProgramAccessOverride.model');
jest.mock('@/models/academic/Program.model');

describe('AccessPolicyService', () => {
  const mockDepartmentId = new mongoose.Types.ObjectId().toString();
  const mockProgramId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────
  // getDepartmentPolicy
  // ──────────────────────────────────────────────────
  describe('getDepartmentPolicy', () => {
    it('should throw on invalid department ID', async () => {
      await expect(
        AccessPolicyService.getDepartmentPolicy('invalid')
      ).rejects.toThrow('Invalid department ID');
    });

    it('should return policy when found', async () => {
      const mockPolicy = {
        _id: new mongoose.Types.ObjectId(),
        departmentId: mockDepartmentId,
        defaultAccessDuration: { type: 'perpetual' },
        isActive: true,
      };
      const mockLean = jest.fn().mockResolvedValue(mockPolicy);
      (DepartmentAccessPolicy.findOne as jest.Mock).mockReturnValue({
        lean: mockLean,
      });

      const result = await AccessPolicyService.getDepartmentPolicy(
        mockDepartmentId
      );

      expect(result).toEqual(mockPolicy);
      expect(DepartmentAccessPolicy.findOne).toHaveBeenCalledWith({
        departmentId: expect.any(mongoose.Types.ObjectId),
        isActive: true,
      });
    });

    it('should return null when no policy found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      (DepartmentAccessPolicy.findOne as jest.Mock).mockReturnValue({
        lean: mockLean,
      });

      const result = await AccessPolicyService.getDepartmentPolicy(
        mockDepartmentId
      );

      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────
  // upsertDepartmentPolicy
  // ──────────────────────────────────────────────────
  describe('upsertDepartmentPolicy', () => {
    it('should throw on invalid department ID', async () => {
      await expect(
        AccessPolicyService.upsertDepartmentPolicy('invalid', {})
      ).rejects.toThrow('Invalid department ID');
    });

    it('should throw when access duration value is missing for non-perpetual type', async () => {
      await expect(
        AccessPolicyService.upsertDepartmentPolicy(mockDepartmentId, {
          defaultAccessDuration: { type: 'months' },
        })
      ).rejects.toThrow("Access duration value is required for type 'months'");
    });

    it('should throw when access duration value is negative', async () => {
      await expect(
        AccessPolicyService.upsertDepartmentPolicy(mockDepartmentId, {
          defaultAccessDuration: { type: 'months', value: -1 },
        })
      ).rejects.toThrow('Access duration value cannot be negative');
    });

    it('should create new policy when none exists', async () => {
      (DepartmentAccessPolicy.findOne as jest.Mock).mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      (DepartmentAccessPolicy as unknown as jest.Mock).mockImplementation(
        (data: any) => ({
          ...data,
          _id: new mongoose.Types.ObjectId(),
          save: mockSave,
        })
      );

      const result = await AccessPolicyService.upsertDepartmentPolicy(
        mockDepartmentId,
        {
          defaultAccessDuration: { type: 'months', value: 12 },
          allowNewVersionAccess: true,
        }
      );

      expect(result).toBeDefined();
      expect(result.defaultAccessDuration).toEqual({
        type: 'months',
        value: 12,
      });
      expect(mockSave).toHaveBeenCalled();
    });

    it('should create policy with defaults when no data provided', async () => {
      (DepartmentAccessPolicy.findOne as jest.Mock).mockResolvedValue(null);

      let capturedData: any;
      const mockSave = jest.fn().mockResolvedValue(true);
      (DepartmentAccessPolicy as unknown as jest.Mock).mockImplementation(
        (data: any) => {
          capturedData = data;
          return {
            ...data,
            _id: new mongoose.Types.ObjectId(),
            save: mockSave,
          };
        }
      );

      await AccessPolicyService.upsertDepartmentPolicy(mockDepartmentId, {});

      expect(capturedData.defaultAccessDuration).toEqual({ type: 'perpetual' });
      expect(capturedData.allowNewVersionAccess).toBe(true);
      expect(capturedData.allowCertificateUpgrade).toBe(true);
      expect(capturedData.allowCourseRetakes).toBe(true);
      expect(capturedData.retakeCooldownDays).toBe(0);
      expect(capturedData.isActive).toBe(true);
    });

    it('should update existing policy', async () => {
      const existingPolicy = {
        _id: new mongoose.Types.ObjectId(),
        departmentId: mockDepartmentId,
        notifications: {
          notifyBeforeExpiration: true,
          daysBeforeExpirationNotification: 30,
        },
      };
      (DepartmentAccessPolicy.findOne as jest.Mock).mockResolvedValue(
        existingPolicy
      );

      const mockUpdated = {
        ...existingPolicy,
        allowNewVersionAccess: false,
        isActive: true,
      };
      (DepartmentAccessPolicy.findByIdAndUpdate as jest.Mock).mockResolvedValue(
        mockUpdated
      );

      const result = await AccessPolicyService.upsertDepartmentPolicy(
        mockDepartmentId,
        { allowNewVersionAccess: false }
      );

      expect(result).toEqual(mockUpdated);
      expect(DepartmentAccessPolicy.findByIdAndUpdate).toHaveBeenCalledWith(
        existingPolicy._id,
        {
          $set: expect.objectContaining({
            allowNewVersionAccess: false,
            isActive: true,
          }),
        },
        { new: true, runValidators: true }
      );
    });

    it('should handle null values to clear optional fields', async () => {
      const existingPolicy = {
        _id: new mongoose.Types.ObjectId(),
        departmentId: mockDepartmentId,
        newVersionAccessWindow: 90,
        notifications: {},
      };
      (DepartmentAccessPolicy.findOne as jest.Mock).mockResolvedValue(
        existingPolicy
      );
      (DepartmentAccessPolicy.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        ...existingPolicy,
      });

      await AccessPolicyService.upsertDepartmentPolicy(mockDepartmentId, {
        newVersionAccessWindow: null,
      });

      expect(DepartmentAccessPolicy.findByIdAndUpdate).toHaveBeenCalledWith(
        existingPolicy._id,
        {
          $set: expect.objectContaining({
            newVersionAccessWindow: undefined,
          }),
        },
        expect.any(Object)
      );
    });

    it('should merge notification settings on update', async () => {
      const existingPolicy = {
        _id: new mongoose.Types.ObjectId(),
        departmentId: mockDepartmentId,
        notifications: {
          notifyBeforeExpiration: true,
          daysBeforeExpirationNotification: 30,
          notifyOnNewVersion: true,
        },
      };
      (DepartmentAccessPolicy.findOne as jest.Mock).mockResolvedValue(
        existingPolicy
      );
      (DepartmentAccessPolicy.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        ...existingPolicy,
      });

      await AccessPolicyService.upsertDepartmentPolicy(mockDepartmentId, {
        notifications: { notifyBeforeExpiration: false },
      });

      expect(DepartmentAccessPolicy.findByIdAndUpdate).toHaveBeenCalledWith(
        existingPolicy._id,
        {
          $set: expect.objectContaining({
            notifications: expect.objectContaining({
              notifyBeforeExpiration: false,
              daysBeforeExpirationNotification: 30,
              notifyOnNewVersion: true,
            }),
          }),
        },
        expect.any(Object)
      );
    });
  });

  // ──────────────────────────────────────────────────
  // getProgramOverride
  // ──────────────────────────────────────────────────
  describe('getProgramOverride', () => {
    it('should throw on invalid program ID', async () => {
      await expect(
        AccessPolicyService.getProgramOverride('invalid')
      ).rejects.toThrow('Invalid program ID');
    });

    it('should return override when found', async () => {
      const mockOverride = {
        _id: new mongoose.Types.ObjectId(),
        programId: mockProgramId,
        accessDuration: { type: 'months', value: 6 },
        isActive: true,
      };
      const mockLean = jest.fn().mockResolvedValue(mockOverride);
      (ProgramAccessOverride.findOne as jest.Mock).mockReturnValue({
        lean: mockLean,
      });

      const result = await AccessPolicyService.getProgramOverride(mockProgramId);

      expect(result).toEqual(mockOverride);
      expect(ProgramAccessOverride.findOne).toHaveBeenCalledWith({
        programId: expect.any(mongoose.Types.ObjectId),
        isActive: true,
      });
    });

    it('should return null when no override found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      (ProgramAccessOverride.findOne as jest.Mock).mockReturnValue({
        lean: mockLean,
      });

      const result = await AccessPolicyService.getProgramOverride(mockProgramId);

      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────
  // upsertProgramOverride
  // ──────────────────────────────────────────────────
  describe('upsertProgramOverride', () => {
    it('should throw on invalid program ID', async () => {
      await expect(
        AccessPolicyService.upsertProgramOverride('invalid', {})
      ).rejects.toThrow('Invalid program ID');
    });

    it('should throw when program not found', async () => {
      (Program.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        AccessPolicyService.upsertProgramOverride(mockProgramId, {})
      ).rejects.toThrow('Program not found');
    });

    it('should throw when access duration value is missing', async () => {
      (Program.findById as jest.Mock).mockResolvedValue({ _id: mockProgramId });

      await expect(
        AccessPolicyService.upsertProgramOverride(mockProgramId, {
          accessDuration: { type: 'years' },
        })
      ).rejects.toThrow("Access duration value is required for type 'years'");
    });

    it('should create new override when none exists', async () => {
      (Program.findById as jest.Mock).mockResolvedValue({ _id: mockProgramId });
      (ProgramAccessOverride.findOne as jest.Mock).mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      (ProgramAccessOverride as unknown as jest.Mock).mockImplementation(
        (data: any) => ({
          ...data,
          _id: new mongoose.Types.ObjectId(),
          save: mockSave,
        })
      );

      const result = await AccessPolicyService.upsertProgramOverride(
        mockProgramId,
        {
          accessDuration: { type: 'months', value: 6 },
          requireSequentialCompletion: true,
        }
      );

      expect(result).toBeDefined();
      expect(result.requireSequentialCompletion).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should update existing override', async () => {
      (Program.findById as jest.Mock).mockResolvedValue({ _id: mockProgramId });

      const existingOverride = {
        _id: new mongoose.Types.ObjectId(),
        programId: mockProgramId,
      };
      (ProgramAccessOverride.findOne as jest.Mock).mockResolvedValue(
        existingOverride
      );

      const mockUpdated = {
        ...existingOverride,
        allowCourseRetakes: false,
        isActive: true,
      };
      (ProgramAccessOverride.findByIdAndUpdate as jest.Mock).mockResolvedValue(
        mockUpdated
      );

      const result = await AccessPolicyService.upsertProgramOverride(
        mockProgramId,
        { allowCourseRetakes: false }
      );

      expect(result).toEqual(mockUpdated);
    });

    it('should handle null values to clear overrides', async () => {
      (Program.findById as jest.Mock).mockResolvedValue({ _id: mockProgramId });

      const existingOverride = {
        _id: new mongoose.Types.ObjectId(),
        programId: mockProgramId,
      };
      (ProgramAccessOverride.findOne as jest.Mock).mockResolvedValue(
        existingOverride
      );
      (ProgramAccessOverride.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await AccessPolicyService.upsertProgramOverride(mockProgramId, {
        accessDuration: null,
        allowNewVersionAccess: null,
      });

      expect(ProgramAccessOverride.findByIdAndUpdate).toHaveBeenCalledWith(
        existingOverride._id,
        {
          $set: expect.objectContaining({
            accessDuration: undefined,
            allowNewVersionAccess: undefined,
            isActive: true,
          }),
        },
        { new: true, runValidators: true }
      );
    });
  });

  // ──────────────────────────────────────────────────
  // deleteProgramOverride
  // ──────────────────────────────────────────────────
  describe('deleteProgramOverride', () => {
    it('should throw on invalid program ID', async () => {
      await expect(
        AccessPolicyService.deleteProgramOverride('invalid')
      ).rejects.toThrow('Invalid program ID');
    });

    it('should soft delete the override', async () => {
      (ProgramAccessOverride.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        isActive: false,
      });

      await AccessPolicyService.deleteProgramOverride(mockProgramId);

      expect(ProgramAccessOverride.findOneAndUpdate).toHaveBeenCalledWith(
        { programId: expect.any(mongoose.Types.ObjectId) },
        { isActive: false },
        { new: true }
      );
    });

    it('should throw when override not found', async () => {
      (ProgramAccessOverride.findOneAndUpdate as jest.Mock).mockResolvedValue(
        null
      );

      await expect(
        AccessPolicyService.deleteProgramOverride(mockProgramId)
      ).rejects.toThrow('Program access override not found');
    });
  });

  // ──────────────────────────────────────────────────
  // getEffectivePolicy
  // ──────────────────────────────────────────────────
  describe('getEffectivePolicy', () => {
    it('should throw on invalid program ID', async () => {
      await expect(
        AccessPolicyService.getEffectivePolicy('invalid')
      ).rejects.toThrow('Invalid program ID');
    });

    it('should throw when program not found', async () => {
      (Program.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        AccessPolicyService.getEffectivePolicy(mockProgramId)
      ).rejects.toThrow('Program not found');
    });

    it('should return defaults when no department policy and no override exist', async () => {
      (Program.findById as jest.Mock).mockResolvedValue({
        _id: mockProgramId,
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
      });

      // getDepartmentPolicy returns null (no policy)
      const mockDeptLean = jest.fn().mockResolvedValue(null);
      (DepartmentAccessPolicy.findOne as jest.Mock).mockReturnValue({
        lean: mockDeptLean,
      });

      // getProgramOverride returns null (no override)
      const mockOverrideLean = jest.fn().mockResolvedValue(null);
      (ProgramAccessOverride.findOne as jest.Mock).mockReturnValue({
        lean: mockOverrideLean,
      });

      const result = await AccessPolicyService.getEffectivePolicy(mockProgramId);

      expect(result.accessDuration).toEqual({ type: 'perpetual' });
      expect(result.allowNewVersionAccess).toBe(true);
      expect(result.allowCertificateUpgrade).toBe(true);
      expect(result.allowCourseRetakes).toBe(true);
      expect(result.retakeCooldownDays).toBe(0);
      expect(result.requireSequentialCompletion).toBe(false);
      expect(result.source.hasProgramOverride).toBe(false);
      expect(result.source.departmentId).toBe(mockDepartmentId);
    });

    it('should return department policy when it exists but no override', async () => {
      (Program.findById as jest.Mock).mockResolvedValue({
        _id: mockProgramId,
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
      });

      const deptPolicy = {
        defaultAccessDuration: { type: 'months', value: 12 },
        allowNewVersionAccess: false,
        allowCertificateUpgrade: false,
        allowCourseRetakes: false,
        retakeCooldownDays: 14,
        maxRetakesPerCourse: 3,
        notifications: {
          notifyBeforeExpiration: false,
          daysBeforeExpirationNotification: 7,
          notifyOnNewVersion: false,
          notifyOnCertificateUpgrade: false,
          notifyAdminOnExtensionRequest: false,
        },
      };
      const mockDeptLean = jest.fn().mockResolvedValue(deptPolicy);
      (DepartmentAccessPolicy.findOne as jest.Mock).mockReturnValue({
        lean: mockDeptLean,
      });

      const mockOverrideLean = jest.fn().mockResolvedValue(null);
      (ProgramAccessOverride.findOne as jest.Mock).mockReturnValue({
        lean: mockOverrideLean,
      });

      const result = await AccessPolicyService.getEffectivePolicy(mockProgramId);

      expect(result.accessDuration).toEqual({ type: 'months', value: 12 });
      expect(result.allowNewVersionAccess).toBe(false);
      expect(result.allowCourseRetakes).toBe(false);
      expect(result.retakeCooldownDays).toBe(14);
      expect(result.maxRetakesPerCourse).toBe(3);
      expect(result.source.hasProgramOverride).toBe(false);
    });

    it('should merge program override with department policy', async () => {
      (Program.findById as jest.Mock).mockResolvedValue({
        _id: mockProgramId,
        departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
      });

      const deptPolicy = {
        defaultAccessDuration: { type: 'months', value: 12 },
        allowNewVersionAccess: true,
        allowCertificateUpgrade: true,
        allowCourseRetakes: true,
        retakeCooldownDays: 7,
        notifications: {
          notifyBeforeExpiration: true,
          daysBeforeExpirationNotification: 30,
          notifyOnNewVersion: true,
          notifyOnCertificateUpgrade: true,
          notifyAdminOnExtensionRequest: true,
        },
      };
      const mockDeptLean = jest.fn().mockResolvedValue(deptPolicy);
      (DepartmentAccessPolicy.findOne as jest.Mock).mockReturnValue({
        lean: mockDeptLean,
      });

      const programOverride = {
        accessDuration: { type: 'years', value: 2 },
        allowCourseRetakes: false,
        requireSequentialCompletion: true,
        notifications: {
          notifyBeforeExpiration: false,
        },
      };
      const mockOverrideLean = jest.fn().mockResolvedValue(programOverride);
      (ProgramAccessOverride.findOne as jest.Mock).mockReturnValue({
        lean: mockOverrideLean,
      });

      const result = await AccessPolicyService.getEffectivePolicy(mockProgramId);

      // Overridden fields
      expect(result.accessDuration).toEqual({ type: 'years', value: 2 });
      expect(result.allowCourseRetakes).toBe(false);
      expect(result.requireSequentialCompletion).toBe(true);
      expect(result.notifications.notifyBeforeExpiration).toBe(false);

      // Inherited fields
      expect(result.allowNewVersionAccess).toBe(true);
      expect(result.allowCertificateUpgrade).toBe(true);
      expect(result.retakeCooldownDays).toBe(7);
      expect(result.notifications.notifyOnNewVersion).toBe(true);

      // Source info
      expect(result.source.hasProgramOverride).toBe(true);
      expect(result.source.programId).toBe(mockProgramId);
    });
  });

  // ──────────────────────────────────────────────────
  // calculateExpirationDate
  // ──────────────────────────────────────────────────
  describe('calculateExpirationDate', () => {
    const enrollmentDate = new Date('2026-01-15');

    it('should return null for perpetual access', () => {
      const result = AccessPolicyService.calculateExpirationDate(
        { type: 'perpetual' },
        enrollmentDate
      );

      expect(result).toBeNull();
    });

    it('should add months for months type', () => {
      const result = AccessPolicyService.calculateExpirationDate(
        { type: 'months', value: 6 },
        enrollmentDate
      );

      expect(result).toBeDefined();
      expect(result!.getMonth()).toBe(6); // July (0-indexed)
      expect(result!.getFullYear()).toBe(2026);
    });

    it('should add years for years type', () => {
      const result = AccessPolicyService.calculateExpirationDate(
        { type: 'years', value: 2 },
        enrollmentDate
      );

      expect(result).toBeDefined();
      expect(result!.getFullYear()).toBe(2028);
      expect(result!.getMonth()).toBe(0); // January
    });

    it('should add days for custom type', () => {
      const result = AccessPolicyService.calculateExpirationDate(
        { type: 'custom', value: 90 },
        enrollmentDate
      );

      expect(result).toBeDefined();
      // Verify the result is approximately 90 days after enrollment
      const expectedDate = new Date(enrollmentDate);
      expectedDate.setDate(expectedDate.getDate() + 90);
      expect(result!.getTime()).toBe(expectedDate.getTime());
    });

    it('should handle 0 value for months', () => {
      const result = AccessPolicyService.calculateExpirationDate(
        { type: 'months', value: 0 },
        enrollmentDate
      );

      expect(result).toBeDefined();
      expect(result!.getMonth()).toBe(enrollmentDate.getMonth());
    });

    it('should handle 0 value for years', () => {
      const result = AccessPolicyService.calculateExpirationDate(
        { type: 'years', value: 0 },
        enrollmentDate
      );

      expect(result).toBeDefined();
      expect(result!.getFullYear()).toBe(enrollmentDate.getFullYear());
    });

    it('should handle 0 value for custom days', () => {
      const result = AccessPolicyService.calculateExpirationDate(
        { type: 'custom', value: 0 },
        enrollmentDate
      );

      expect(result).toBeDefined();
      expect(result!.getDate()).toBe(enrollmentDate.getDate());
    });

    it('should not mutate the original enrollment date', () => {
      const originalDate = new Date('2026-01-15');
      const dateCopy = new Date(originalDate);

      AccessPolicyService.calculateExpirationDate(
        { type: 'months', value: 6 },
        originalDate
      );

      expect(originalDate.getTime()).toBe(dateCopy.getTime());
    });

    it('should return null for unknown type', () => {
      const result = AccessPolicyService.calculateExpirationDate(
        { type: 'unknown' as any },
        enrollmentDate
      );

      expect(result).toBeNull();
    });
  });
});
