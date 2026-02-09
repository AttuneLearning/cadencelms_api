/**
 * Unit Tests: LearnerExceptionService
 *
 * Tests for the learner exception service:
 * - createException (validates, creates, handles each type)
 * - revokeException (deactivates, reverts extended_access)
 * - getException (findById with populates)
 * - listExceptions (paginated with filters)
 * - hasActiveException (boolean check)
 * - getAdditionalAttempts (sums active extra_attempts)
 * - getEffectiveExpiryDate (latest newExpiryDate)
 * - isModuleUnlocked / isContentExcused (boolean checks)
 */

import mongoose from 'mongoose';
import { LearnerExceptionService } from '@/services/exception/learnerException.service';
import LearnerException from '@/models/exception/LearnerException.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import AssessmentAttempt from '@/models/progress/AssessmentAttempt.model';

jest.mock('@/models/exception/LearnerException.model');
jest.mock('@/models/enrollment/Enrollment.model');
jest.mock('@/models/progress/AssessmentAttempt.model');
jest.mock('@/services/grades/grade-override.service');

describe('LearnerExceptionService', () => {
  const mockEnrollmentId = new mongoose.Types.ObjectId().toString();
  const mockLearnerId = new mongoose.Types.ObjectId().toString();
  const mockDepartmentId = new mongoose.Types.ObjectId().toString();
  const mockGrantedBy = new mongoose.Types.ObjectId().toString();
  const mockAssessmentId = new mongoose.Types.ObjectId().toString();
  const mockAttemptId = new mongoose.Types.ObjectId().toString();
  const mockModuleId = new mongoose.Types.ObjectId().toString();
  const mockContentId = new mongoose.Types.ObjectId().toString();
  const mockExceptionId = new mongoose.Types.ObjectId().toString();

  const mockEnrollment = {
    _id: mockEnrollmentId,
    learnerId: new mongoose.Types.ObjectId(mockLearnerId),
    departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
    accessExpiresAt: new Date('2026-06-01'),
    status: 'active'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────
  // createException
  // ──────────────────────────────────────────────────
  describe('createException', () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);
      (LearnerException as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockSave
      }));
    });

    it('should create an extra_attempts exception', async () => {
      const result = await LearnerExceptionService.createException({
        enrollmentId: mockEnrollmentId,
        learnerId: mockLearnerId,
        departmentId: mockDepartmentId,
        type: 'extra_attempts',
        reason: 'Medical accommodation',
        grantedBy: mockGrantedBy,
        metadata: {
          assessmentId: mockAssessmentId,
          additionalAttempts: 2
        }
      });

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw if enrollment not found', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        LearnerExceptionService.createException({
          enrollmentId: mockEnrollmentId,
          learnerId: mockLearnerId,
          departmentId: mockDepartmentId,
          type: 'extra_attempts',
          reason: 'Test',
          grantedBy: mockGrantedBy,
          metadata: { assessmentId: mockAssessmentId, additionalAttempts: 1 }
        })
      ).rejects.toThrow(/Enrollment not found/);
    });

    it('should throw if assessmentId missing for extra_attempts', async () => {
      await expect(
        LearnerExceptionService.createException({
          enrollmentId: mockEnrollmentId,
          learnerId: mockLearnerId,
          departmentId: mockDepartmentId,
          type: 'extra_attempts',
          reason: 'Test',
          grantedBy: mockGrantedBy,
          metadata: { additionalAttempts: 1 }
        })
      ).rejects.toThrow(/assessmentId is required/);
    });

    it('should update enrollment accessExpiresAt for extended_access', async () => {
      const newExpiryDate = new Date('2027-01-01');
      (Enrollment.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockEnrollment);

      await LearnerExceptionService.createException({
        enrollmentId: mockEnrollmentId,
        learnerId: mockLearnerId,
        departmentId: mockDepartmentId,
        type: 'extended_access',
        reason: 'Extension needed',
        grantedBy: mockGrantedBy,
        metadata: { newExpiryDate }
      });

      expect(Enrollment.findByIdAndUpdate).toHaveBeenCalledWith(
        mockEnrollmentId,
        {
          accessExpiresAt: newExpiryDate,
          $inc: { accessExtensionCount: 1 }
        }
      );
    });

    it('should validate attempt exists for grade_override', async () => {
      (AssessmentAttempt.findById as jest.Mock).mockResolvedValue({
        _id: mockAttemptId,
        scoring: { finalScore: 65 }
      });
      (AssessmentAttempt.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await LearnerExceptionService.createException({
        enrollmentId: mockEnrollmentId,
        learnerId: mockLearnerId,
        departmentId: mockDepartmentId,
        type: 'grade_override',
        reason: 'Grade correction',
        grantedBy: mockGrantedBy,
        metadata: {
          assessmentId: mockAssessmentId,
          attemptId: mockAttemptId,
          newGrade: 85
        }
      });

      expect(AssessmentAttempt.findById).toHaveBeenCalledWith(mockAttemptId);
      expect(AssessmentAttempt.findByIdAndUpdate).toHaveBeenCalledWith(
        mockAttemptId,
        expect.objectContaining({
          'scoring.percentageScore': 85,
          'scoring.gradingComplete': true
        })
      );
    });

    it('should throw if attempt not found for grade_override', async () => {
      (AssessmentAttempt.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        LearnerExceptionService.createException({
          enrollmentId: mockEnrollmentId,
          learnerId: mockLearnerId,
          departmentId: mockDepartmentId,
          type: 'grade_override',
          reason: 'Test',
          grantedBy: mockGrantedBy,
          metadata: {
            assessmentId: mockAssessmentId,
            attemptId: mockAttemptId,
            newGrade: 90
          }
        })
      ).rejects.toThrow(/Assessment attempt not found/);
    });

    it('should throw if moduleId missing for module_unlock', async () => {
      await expect(
        LearnerExceptionService.createException({
          enrollmentId: mockEnrollmentId,
          learnerId: mockLearnerId,
          departmentId: mockDepartmentId,
          type: 'module_unlock',
          reason: 'Test',
          grantedBy: mockGrantedBy,
          metadata: {}
        })
      ).rejects.toThrow(/moduleId is required/);
    });

    it('should throw if contentId missing for excuse_content', async () => {
      await expect(
        LearnerExceptionService.createException({
          enrollmentId: mockEnrollmentId,
          learnerId: mockLearnerId,
          departmentId: mockDepartmentId,
          type: 'excuse_content',
          reason: 'Test',
          grantedBy: mockGrantedBy,
          metadata: { contentType: 'lesson' }
        })
      ).rejects.toThrow(/contentId is required/);
    });
  });

  // ──────────────────────────────────────────────────
  // revokeException
  // ──────────────────────────────────────────────────
  describe('revokeException', () => {
    it('should revoke an active exception', async () => {
      const mockException = {
        _id: mockExceptionId,
        type: 'extra_attempts',
        isActive: true,
        enrollmentId: mockEnrollmentId,
        metadata: {},
        save: jest.fn().mockResolvedValue(undefined)
      };
      (LearnerException.findById as jest.Mock).mockResolvedValue(mockException);

      const result = await LearnerExceptionService.revokeException(
        mockExceptionId,
        mockGrantedBy,
        'No longer needed'
      );

      expect(result.isActive).toBe(false);
      expect(result.revokedAt).toBeDefined();
      expect(result.revokeReason).toBe('No longer needed');
      expect(mockException.save).toHaveBeenCalled();
    });

    it('should revert enrollment expiry for extended_access revocation', async () => {
      const previousDate = new Date('2026-06-01');
      const mockException = {
        _id: mockExceptionId,
        type: 'extended_access',
        isActive: true,
        enrollmentId: mockEnrollmentId,
        metadata: { previousExpiryDate: previousDate },
        save: jest.fn().mockResolvedValue(undefined)
      };
      (LearnerException.findById as jest.Mock).mockResolvedValue(mockException);
      (Enrollment.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await LearnerExceptionService.revokeException(
        mockExceptionId,
        mockGrantedBy,
        'Revoking extension'
      );

      expect(Enrollment.findByIdAndUpdate).toHaveBeenCalledWith(
        mockEnrollmentId,
        { accessExpiresAt: previousDate }
      );
    });

    it('should throw if exception already revoked', async () => {
      const mockException = {
        _id: mockExceptionId,
        isActive: false,
        metadata: {}
      };
      (LearnerException.findById as jest.Mock).mockResolvedValue(mockException);

      await expect(
        LearnerExceptionService.revokeException(mockExceptionId, mockGrantedBy, 'Test')
      ).rejects.toThrow(/already revoked/);
    });

    it('should throw if exception not found', async () => {
      (LearnerException.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        LearnerExceptionService.revokeException(mockExceptionId, mockGrantedBy, 'Test')
      ).rejects.toThrow(/Exception not found/);
    });
  });

  // ──────────────────────────────────────────────────
  // getException
  // ──────────────────────────────────────────────────
  describe('getException', () => {
    it('should return populated exception', async () => {
      const mockException = {
        _id: mockExceptionId,
        type: 'extra_attempts',
        learnerId: { firstName: 'John', lastName: 'Doe' }
      };

      const mockPopulate3 = jest.fn().mockResolvedValue(mockException);
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (LearnerException.findById as jest.Mock).mockReturnValue({ populate: mockPopulate1 });

      const result = await LearnerExceptionService.getException(mockExceptionId);
      expect(result).toEqual(mockException);
    });

    it('should throw notFound for invalid ID', async () => {
      await expect(
        LearnerExceptionService.getException('invalid-id')
      ).rejects.toThrow(/Invalid exception ID/);
    });

    it('should throw notFound when exception does not exist', async () => {
      const mockPopulate3 = jest.fn().mockResolvedValue(null);
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (LearnerException.findById as jest.Mock).mockReturnValue({ populate: mockPopulate1 });

      await expect(
        LearnerExceptionService.getException(mockExceptionId)
      ).rejects.toThrow(/Exception not found/);
    });
  });

  // ──────────────────────────────────────────────────
  // listExceptions
  // ──────────────────────────────────────────────────
  describe('listExceptions', () => {
    it('should return paginated results', async () => {
      const mockExceptions = [
        { _id: new mongoose.Types.ObjectId(), type: 'extra_attempts' },
        { _id: new mongoose.Types.ObjectId(), type: 'module_unlock' }
      ];

      const mockLean = jest.fn().mockResolvedValue(mockExceptions);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (LearnerException.find as jest.Mock).mockReturnValue({ populate: mockPopulate1 });
      (LearnerException.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await LearnerExceptionService.listExceptions({
        enrollmentId: mockEnrollmentId,
        page: 1,
        limit: 20
      });

      expect(result.exceptions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by type and isActive', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate2 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (LearnerException.find as jest.Mock).mockReturnValue({ populate: mockPopulate1 });
      (LearnerException.countDocuments as jest.Mock).mockResolvedValue(0);

      await LearnerExceptionService.listExceptions({
        enrollmentId: mockEnrollmentId,
        type: 'extra_attempts',
        isActive: true
      });

      expect(LearnerException.find).toHaveBeenCalledWith(
        expect.objectContaining({
          enrollmentId: mockEnrollmentId,
          type: 'extra_attempts',
          isActive: true
        })
      );
    });
  });

  // ──────────────────────────────────────────────────
  // hasActiveException
  // ──────────────────────────────────────────────────
  describe('hasActiveException', () => {
    it('should return true when active exception exists', async () => {
      (LearnerException.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await LearnerExceptionService.hasActiveException(
        mockLearnerId,
        'extra_attempts'
      );

      expect(result).toBe(true);
      expect(LearnerException.countDocuments).toHaveBeenCalledWith({
        learnerId: mockLearnerId,
        type: 'extra_attempts',
        isActive: true
      });
    });

    it('should return false when no active exception exists', async () => {
      (LearnerException.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await LearnerExceptionService.hasActiveException(
        mockLearnerId,
        'extra_attempts'
      );

      expect(result).toBe(false);
    });

    it('should merge additional query filters', async () => {
      (LearnerException.countDocuments as jest.Mock).mockResolvedValue(1);

      await LearnerExceptionService.hasActiveException(
        mockLearnerId,
        'extra_attempts',
        { 'metadata.assessmentId': mockAssessmentId }
      );

      expect(LearnerException.countDocuments).toHaveBeenCalledWith({
        learnerId: mockLearnerId,
        type: 'extra_attempts',
        isActive: true,
        'metadata.assessmentId': mockAssessmentId
      });
    });
  });

  // ──────────────────────────────────────────────────
  // getAdditionalAttempts
  // ──────────────────────────────────────────────────
  describe('getAdditionalAttempts', () => {
    it('should sum additionalAttempts from active exceptions', async () => {
      const mockLean = jest.fn().mockResolvedValue([
        { metadata: { additionalAttempts: 2 } },
        { metadata: { additionalAttempts: 3 } }
      ]);
      (LearnerException.find as jest.Mock).mockReturnValue({ lean: mockLean });

      const result = await LearnerExceptionService.getAdditionalAttempts(
        mockLearnerId,
        mockAssessmentId
      );

      expect(result).toBe(5);
    });

    it('should return 0 when no exceptions exist', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      (LearnerException.find as jest.Mock).mockReturnValue({ lean: mockLean });

      const result = await LearnerExceptionService.getAdditionalAttempts(
        mockLearnerId,
        mockAssessmentId
      );

      expect(result).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────
  // getEffectiveExpiryDate
  // ──────────────────────────────────────────────────
  describe('getEffectiveExpiryDate', () => {
    it('should return latest newExpiryDate', async () => {
      const futureDate = new Date('2027-06-01');
      const mockLean = jest.fn().mockResolvedValue([
        { metadata: { newExpiryDate: futureDate } }
      ]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      (LearnerException.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await LearnerExceptionService.getEffectiveExpiryDate(mockEnrollmentId);
      expect(result).toEqual(futureDate);
    });

    it('should return null when no active extended_access exceptions', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      (LearnerException.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await LearnerExceptionService.getEffectiveExpiryDate(mockEnrollmentId);
      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────
  // isModuleUnlocked
  // ──────────────────────────────────────────────────
  describe('isModuleUnlocked', () => {
    it('should return true when active module_unlock exception exists', async () => {
      (LearnerException.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await LearnerExceptionService.isModuleUnlocked(mockLearnerId, mockModuleId);
      expect(result).toBe(true);
    });

    it('should return false when no active module_unlock exception', async () => {
      (LearnerException.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await LearnerExceptionService.isModuleUnlocked(mockLearnerId, mockModuleId);
      expect(result).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────
  // isContentExcused
  // ──────────────────────────────────────────────────
  describe('isContentExcused', () => {
    it('should return true when active excuse_content exception exists', async () => {
      (LearnerException.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await LearnerExceptionService.isContentExcused(
        mockLearnerId,
        mockEnrollmentId,
        mockContentId
      );
      expect(result).toBe(true);
    });

    it('should return false when no active excuse_content exception', async () => {
      (LearnerException.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await LearnerExceptionService.isContentExcused(
        mockLearnerId,
        mockEnrollmentId,
        mockContentId
      );
      expect(result).toBe(false);
    });
  });
});
