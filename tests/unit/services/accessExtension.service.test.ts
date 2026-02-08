/**
 * Unit Tests: AccessExtensionService
 *
 * Tests for the access extension service:
 * - createExtensionRequest (validates, checks enrollment, checks pending, creates)
 * - reviewExtensionRequest (validates, updates enrollment on approval, reactivates expired)
 * - extendEnrollmentAccess (admin direct extension)
 * - listExtensionRequests (paginated with filters)
 * - getExtensionRequest (findById with populates)
 * - getLearnerVersionAccess (finds active enrollments, gets effective policy)
 */

import mongoose from 'mongoose';
import { AccessExtensionService } from '@/services/policy/accessExtension.service';
import AccessExtensionRequest from '@/models/policy/AccessExtensionRequest.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import Program from '@/models/academic/Program.model';
import { AccessPolicyService } from '@/services/policy/accessPolicy.service';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/policy/AccessExtensionRequest.model');
jest.mock('@/models/enrollment/Enrollment.model');
jest.mock('@/models/academic/Program.model');
jest.mock('@/services/policy/accessPolicy.service', () => ({
  AccessPolicyService: {
    getEffectivePolicy: jest.fn().mockResolvedValue({
      accessDuration: { type: 'perpetual' },
      allowNewVersionAccess: true,
      allowCertificateUpgrade: true,
      allowCourseRetakes: true,
      retakeCooldownDays: 0,
      requireSequentialCompletion: false,
      notifications: {
        notifyBeforeExpiration: true,
        daysBeforeExpirationNotification: 30,
        notifyOnNewVersion: true,
        notifyOnCertificateUpgrade: true,
        notifyAdminOnExtensionRequest: true,
      },
    }),
    getDepartmentPolicy: jest.fn(),
    getProgramOverride: jest.fn(),
  },
}));

describe('AccessExtensionService', () => {
  const mockLearnerId = new mongoose.Types.ObjectId().toString();
  const mockReviewerId = new mongoose.Types.ObjectId().toString();
  const mockEnrollmentId = new mongoose.Types.ObjectId().toString();
  const mockProgramId = new mongoose.Types.ObjectId().toString();
  const mockDepartmentId = new mongoose.Types.ObjectId().toString();
  const mockRequestId = new mongoose.Types.ObjectId().toString();
  const mockAdminId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────
  // createExtensionRequest
  // ──────────────────────────────────────────────────
  describe('createExtensionRequest', () => {
    const validData = {
      enrollmentId: '', // will be set in beforeEach
      requestedExtension: { type: 'days' as const, value: 30 },
      requestReason: 'Need more time',
    };

    const mockEnrollment = {
      _id: mockEnrollmentId,
      learnerId: new mongoose.Types.ObjectId(mockLearnerId),
      programId: new mongoose.Types.ObjectId(mockProgramId),
      status: 'active',
    };

    const mockProgram = {
      _id: mockProgramId,
      departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
    };

    beforeEach(() => {
      validData.enrollmentId = mockEnrollmentId;
    });

    it('should throw on invalid learner ID', async () => {
      await expect(
        AccessExtensionService.createExtensionRequest('invalid', validData)
      ).rejects.toThrow('Invalid learner ID');
    });

    it('should throw on invalid enrollment ID', async () => {
      await expect(
        AccessExtensionService.createExtensionRequest(mockLearnerId, {
          ...validData,
          enrollmentId: 'invalid',
        })
      ).rejects.toThrow('Invalid enrollment ID');
    });

    it('should throw when enrollment not found', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        AccessExtensionService.createExtensionRequest(mockLearnerId, validData)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should throw when enrollment belongs to different learner', async () => {
      const otherLearnerId = new mongoose.Types.ObjectId().toString();
      const enrollment = {
        ...mockEnrollment,
        learnerId: new mongoose.Types.ObjectId(otherLearnerId),
      };
      (Enrollment.findById as jest.Mock).mockResolvedValue(enrollment);

      await expect(
        AccessExtensionService.createExtensionRequest(mockLearnerId, validData)
      ).rejects.toThrow("Cannot request extension for another learner's enrollment");
    });

    it('should throw when enrollment status is completed', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue({
        ...mockEnrollment,
        status: 'completed',
      });

      await expect(
        AccessExtensionService.createExtensionRequest(mockLearnerId, validData)
      ).rejects.toThrow("Cannot request extension for enrollment with status 'completed'");
    });

    it('should throw when enrollment status is graduated', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue({
        ...mockEnrollment,
        status: 'graduated',
      });

      await expect(
        AccessExtensionService.createExtensionRequest(mockLearnerId, validData)
      ).rejects.toThrow("Cannot request extension for enrollment with status 'graduated'");
    });

    it('should throw when enrollment status is withdrawn', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue({
        ...mockEnrollment,
        status: 'withdrawn',
      });

      await expect(
        AccessExtensionService.createExtensionRequest(mockLearnerId, validData)
      ).rejects.toThrow("Cannot request extension for enrollment with status 'withdrawn'");
    });

    it('should throw when program not found', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);
      (Program.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        AccessExtensionService.createExtensionRequest(mockLearnerId, validData)
      ).rejects.toThrow('Program not found');
    });

    it('should throw when a pending request already exists', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);
      (Program.findById as jest.Mock).mockResolvedValue(mockProgram);
      (AccessExtensionRequest.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
      });

      await expect(
        AccessExtensionService.createExtensionRequest(mockLearnerId, validData)
      ).rejects.toThrow(
        'There is already a pending extension request for this enrollment'
      );
    });

    it('should throw on invalid extension type', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);
      (Program.findById as jest.Mock).mockResolvedValue(mockProgram);
      (AccessExtensionRequest.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        AccessExtensionService.createExtensionRequest(mockLearnerId, {
          ...validData,
          requestedExtension: { type: 'weeks' as any, value: 2 },
        })
      ).rejects.toThrow("Invalid extension type 'weeks'");
    });

    it('should throw when non-perpetual extension has no value', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);
      (Program.findById as jest.Mock).mockResolvedValue(mockProgram);
      (AccessExtensionRequest.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        AccessExtensionService.createExtensionRequest(mockLearnerId, {
          ...validData,
          requestedExtension: { type: 'days' },
        })
      ).rejects.toThrow("Extension value is required for type 'days'");
    });

    it('should throw when extension value is less than 1', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);
      (Program.findById as jest.Mock).mockResolvedValue(mockProgram);
      (AccessExtensionRequest.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        AccessExtensionService.createExtensionRequest(mockLearnerId, {
          ...validData,
          requestedExtension: { type: 'days', value: 0 },
        })
      ).rejects.toThrow('Extension value must be at least 1');
    });

    it('should create extension request successfully', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);
      (Program.findById as jest.Mock).mockResolvedValue(mockProgram);
      (AccessExtensionRequest.findOne as jest.Mock).mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      (AccessExtensionRequest as unknown as jest.Mock).mockImplementation(
        (data: any) => ({
          ...data,
          _id: new mongoose.Types.ObjectId(),
          save: mockSave,
        })
      );

      const result = await AccessExtensionService.createExtensionRequest(
        mockLearnerId,
        validData
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.enrollmentId).toBe(mockEnrollmentId);
      expect(result.learnerId).toBe(mockLearnerId);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should allow perpetual extension without value', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);
      (Program.findById as jest.Mock).mockResolvedValue(mockProgram);
      (AccessExtensionRequest.findOne as jest.Mock).mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      (AccessExtensionRequest as unknown as jest.Mock).mockImplementation(
        (data: any) => ({
          ...data,
          _id: new mongoose.Types.ObjectId(),
          save: mockSave,
        })
      );

      const result = await AccessExtensionService.createExtensionRequest(
        mockLearnerId,
        {
          ...validData,
          requestedExtension: { type: 'perpetual' },
        }
      );

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────
  // reviewExtensionRequest
  // ──────────────────────────────────────────────────
  describe('reviewExtensionRequest', () => {
    it('should throw on invalid request ID', async () => {
      await expect(
        AccessExtensionService.reviewExtensionRequest('invalid', mockReviewerId, {
          status: 'approved',
        })
      ).rejects.toThrow('Invalid request ID');
    });

    it('should throw on invalid reviewer ID', async () => {
      await expect(
        AccessExtensionService.reviewExtensionRequest(
          mockRequestId,
          'invalid',
          { status: 'approved' }
        )
      ).rejects.toThrow('Invalid reviewer ID');
    });

    it('should throw when request not found', async () => {
      (AccessExtensionRequest.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        AccessExtensionService.reviewExtensionRequest(
          mockRequestId,
          mockReviewerId,
          { status: 'approved' }
        )
      ).rejects.toThrow('Extension request not found');
    });

    it('should throw when request is not pending', async () => {
      (AccessExtensionRequest.findById as jest.Mock).mockResolvedValue({
        _id: mockRequestId,
        status: 'approved',
      });

      await expect(
        AccessExtensionService.reviewExtensionRequest(
          mockRequestId,
          mockReviewerId,
          { status: 'approved' }
        )
      ).rejects.toThrow("Cannot review request with status 'approved'");
    });

    it('should throw when associated enrollment not found', async () => {
      (AccessExtensionRequest.findById as jest.Mock).mockResolvedValue({
        _id: mockRequestId,
        status: 'pending',
        enrollmentId: mockEnrollmentId,
        requestedExtension: { type: 'days', value: 30 },
        save: jest.fn(),
      });
      (Enrollment.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        AccessExtensionService.reviewExtensionRequest(
          mockRequestId,
          mockReviewerId,
          { status: 'approved' }
        )
      ).rejects.toThrow('Associated enrollment not found');
    });

    it('should approve request and update enrollment access', async () => {
      const mockRequest = {
        _id: mockRequestId,
        status: 'pending',
        enrollmentId: mockEnrollmentId,
        requestedExtension: { type: 'days', value: 30 },
        save: jest.fn().mockResolvedValue(true),
      };
      const mockEnrollment = {
        _id: mockEnrollmentId,
        accessExpiresAt: new Date('2026-03-01'),
        status: 'active',
        accessExtensionCount: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      (AccessExtensionRequest.findById as jest.Mock).mockResolvedValue(mockRequest);
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);

      const result = await AccessExtensionService.reviewExtensionRequest(
        mockRequestId,
        mockReviewerId,
        { status: 'approved' }
      );

      expect(result.status).toBe('approved');
      expect(result.reviewedBy).toEqual(expect.any(mongoose.Types.ObjectId));
      expect(result.reviewedAt).toEqual(expect.any(Date));
      expect(result.grantedExtension).toEqual({ type: 'days', value: 30 });
      expect(mockEnrollment.accessExtensionCount).toBe(1);
      expect(mockEnrollment.save).toHaveBeenCalled();
      expect(mockRequest.save).toHaveBeenCalled();
    });

    it('should use grantedExtension override when provided', async () => {
      const mockRequest = {
        _id: mockRequestId,
        status: 'pending',
        enrollmentId: mockEnrollmentId,
        requestedExtension: { type: 'days', value: 30 },
        save: jest.fn().mockResolvedValue(true),
      };
      const mockEnrollment = {
        _id: mockEnrollmentId,
        accessExpiresAt: new Date('2026-03-01'),
        status: 'active',
        accessExtensionCount: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      (AccessExtensionRequest.findById as jest.Mock).mockResolvedValue(mockRequest);
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);

      const result = await AccessExtensionService.reviewExtensionRequest(
        mockRequestId,
        mockReviewerId,
        {
          status: 'approved',
          grantedExtension: { type: 'months', value: 3 },
        }
      );

      expect(result.grantedExtension).toEqual({ type: 'months', value: 3 });
    });

    it('should reactivate expired enrollment on approval', async () => {
      const mockRequest = {
        _id: mockRequestId,
        status: 'pending',
        enrollmentId: mockEnrollmentId,
        requestedExtension: { type: 'days', value: 30 },
        save: jest.fn().mockResolvedValue(true),
      };
      const mockEnrollment = {
        _id: mockEnrollmentId,
        accessExpiresAt: new Date('2026-01-01'),
        status: 'expired',
        accessExtensionCount: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      (AccessExtensionRequest.findById as jest.Mock).mockResolvedValue(mockRequest);
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);

      await AccessExtensionService.reviewExtensionRequest(
        mockRequestId,
        mockReviewerId,
        { status: 'approved' }
      );

      expect(mockEnrollment.status).toBe('active');
    });

    it('should set null expiration for perpetual extension approval', async () => {
      const mockRequest = {
        _id: mockRequestId,
        status: 'pending',
        enrollmentId: mockEnrollmentId,
        requestedExtension: { type: 'perpetual' },
        save: jest.fn().mockResolvedValue(true),
      };
      const mockEnrollment = {
        _id: mockEnrollmentId,
        accessExpiresAt: new Date('2026-03-01'),
        status: 'active',
        accessExtensionCount: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      (AccessExtensionRequest.findById as jest.Mock).mockResolvedValue(mockRequest);
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);

      await AccessExtensionService.reviewExtensionRequest(
        mockRequestId,
        mockReviewerId,
        { status: 'approved' }
      );

      expect(mockEnrollment.accessExpiresAt).toBeUndefined();
    });

    it('should deny request without modifying enrollment', async () => {
      const mockRequest = {
        _id: mockRequestId,
        status: 'pending',
        enrollmentId: mockEnrollmentId,
        requestedExtension: { type: 'days', value: 30 },
        save: jest.fn().mockResolvedValue(true),
      };
      const mockEnrollment = {
        _id: mockEnrollmentId,
        accessExpiresAt: new Date('2026-03-01'),
        status: 'active',
        accessExtensionCount: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      (AccessExtensionRequest.findById as jest.Mock).mockResolvedValue(mockRequest);
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);

      const result = await AccessExtensionService.reviewExtensionRequest(
        mockRequestId,
        mockReviewerId,
        { status: 'denied', reviewNotes: 'Not eligible' }
      );

      expect(result.status).toBe('denied');
      expect(result.reviewNotes).toBe('Not eligible');
      // Enrollment should NOT be saved for denial
      expect(mockEnrollment.save).not.toHaveBeenCalled();
      expect(mockRequest.save).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────
  // extendEnrollmentAccess
  // ──────────────────────────────────────────────────
  describe('extendEnrollmentAccess', () => {
    it('should throw on invalid enrollment ID', async () => {
      await expect(
        AccessExtensionService.extendEnrollmentAccess('invalid', mockAdminId, {
          extension: { type: 'days', value: 30 },
          reason: 'Admin extension',
        })
      ).rejects.toThrow('Invalid enrollment ID');
    });

    it('should throw on invalid admin ID', async () => {
      await expect(
        AccessExtensionService.extendEnrollmentAccess(
          mockEnrollmentId,
          'invalid',
          {
            extension: { type: 'days', value: 30 },
            reason: 'Admin extension',
          }
        )
      ).rejects.toThrow('Invalid admin ID');
    });

    it('should throw when enrollment not found', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        AccessExtensionService.extendEnrollmentAccess(
          mockEnrollmentId,
          mockAdminId,
          {
            extension: { type: 'days', value: 30 },
            reason: 'Admin extension',
          }
        )
      ).rejects.toThrow('Enrollment not found');
    });

    it('should throw when enrollment is completed', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue({
        _id: mockEnrollmentId,
        status: 'completed',
      });

      await expect(
        AccessExtensionService.extendEnrollmentAccess(
          mockEnrollmentId,
          mockAdminId,
          {
            extension: { type: 'days', value: 30 },
            reason: 'Admin extension',
          }
        )
      ).rejects.toThrow(
        "Cannot extend access for enrollment with status 'completed'"
      );
    });

    it('should throw when enrollment is withdrawn', async () => {
      (Enrollment.findById as jest.Mock).mockResolvedValue({
        _id: mockEnrollmentId,
        status: 'withdrawn',
      });

      await expect(
        AccessExtensionService.extendEnrollmentAccess(
          mockEnrollmentId,
          mockAdminId,
          {
            extension: { type: 'days', value: 30 },
            reason: 'Admin extension',
          }
        )
      ).rejects.toThrow(
        "Cannot extend access for enrollment with status 'withdrawn'"
      );
    });

    it('should extend enrollment and return updated data', async () => {
      const mockEnrollment = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        accessExpiresAt: new Date('2026-03-01'),
        status: 'active',
        accessExtensionCount: 0,
        save: jest.fn().mockResolvedValue(true),
      };
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);

      const result = await AccessExtensionService.extendEnrollmentAccess(
        mockEnrollmentId,
        mockAdminId,
        {
          extension: { type: 'days', value: 30 },
          reason: 'Admin extension',
        }
      );

      expect(result.accessExtensionCount).toBe(1);
      expect(result.accessExtensionReason).toBe('Admin extension');
      expect(result.status).toBe('active');
      expect(mockEnrollment.save).toHaveBeenCalled();
    });

    it('should reactivate expired enrollment on extension', async () => {
      const mockEnrollment = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        accessExpiresAt: new Date('2026-01-01'),
        status: 'expired',
        accessExtensionCount: 2,
        save: jest.fn().mockResolvedValue(true),
      };
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);

      const result = await AccessExtensionService.extendEnrollmentAccess(
        mockEnrollmentId,
        mockAdminId,
        {
          extension: { type: 'months', value: 3 },
          reason: 'Reactivation',
        }
      );

      expect(result.status).toBe('active');
      expect(result.accessExtensionCount).toBe(3);
    });

    it('should set null expiration for perpetual extension', async () => {
      const mockEnrollment = {
        _id: new mongoose.Types.ObjectId(mockEnrollmentId),
        accessExpiresAt: new Date('2026-03-01'),
        status: 'active',
        accessExtensionCount: 0,
        save: jest.fn().mockResolvedValue(true),
      };
      (Enrollment.findById as jest.Mock).mockResolvedValue(mockEnrollment);

      const result = await AccessExtensionService.extendEnrollmentAccess(
        mockEnrollmentId,
        mockAdminId,
        {
          extension: { type: 'perpetual' },
          reason: 'Permanent access',
        }
      );

      expect(result.accessExpiresAt).toBeUndefined();
    });

    it('should throw on invalid extension type', async () => {
      await expect(
        AccessExtensionService.extendEnrollmentAccess(
          mockEnrollmentId,
          mockAdminId,
          {
            extension: { type: 'weeks' as any, value: 2 },
            reason: 'Invalid type test',
          }
        )
      ).rejects.toThrow("Invalid extension type 'weeks'");
    });
  });

  // ──────────────────────────────────────────────────
  // listExtensionRequests
  // ──────────────────────────────────────────────────
  describe('listExtensionRequests', () => {
    const setupListMock = (requests: any[] = [], total: number = 0) => {
      const mockLean = jest.fn().mockResolvedValue(requests);
      const mockPopulate2 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      const mockLimit = jest.fn().mockReturnValue({ populate: mockPopulate1 });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (AccessExtensionRequest.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (AccessExtensionRequest.countDocuments as jest.Mock).mockResolvedValue(total);
      return { mockSort, mockSkip, mockLimit };
    };

    it('should return paginated results with defaults', async () => {
      const requests = [{ _id: new mongoose.Types.ObjectId() }];
      setupListMock(requests, 1);

      const result = await AccessExtensionService.listExtensionRequests({});

      expect(result.requests).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply departmentId filter', async () => {
      setupListMock();

      await AccessExtensionService.listExtensionRequests({
        departmentId: mockDepartmentId,
      });

      const findQuery = (AccessExtensionRequest.find as jest.Mock).mock.calls[0][0];
      expect(findQuery.departmentId).toEqual(expect.any(mongoose.Types.ObjectId));
    });

    it('should throw on invalid departmentId filter', async () => {
      await expect(
        AccessExtensionService.listExtensionRequests({
          departmentId: 'invalid',
        })
      ).rejects.toThrow('Invalid department ID');
    });

    it('should apply learnerId filter', async () => {
      setupListMock();

      await AccessExtensionService.listExtensionRequests({
        learnerId: mockLearnerId,
      });

      const findQuery = (AccessExtensionRequest.find as jest.Mock).mock.calls[0][0];
      expect(findQuery.learnerId).toEqual(expect.any(mongoose.Types.ObjectId));
    });

    it('should throw on invalid learnerId filter', async () => {
      await expect(
        AccessExtensionService.listExtensionRequests({
          learnerId: 'invalid',
        })
      ).rejects.toThrow('Invalid learner ID');
    });

    it('should apply enrollmentId filter', async () => {
      setupListMock();

      await AccessExtensionService.listExtensionRequests({
        enrollmentId: mockEnrollmentId,
      });

      const findQuery = (AccessExtensionRequest.find as jest.Mock).mock.calls[0][0];
      expect(findQuery.enrollmentId).toEqual(expect.any(mongoose.Types.ObjectId));
    });

    it('should throw on invalid enrollmentId filter', async () => {
      await expect(
        AccessExtensionService.listExtensionRequests({
          enrollmentId: 'invalid',
        })
      ).rejects.toThrow('Invalid enrollment ID');
    });

    it('should apply status filter', async () => {
      setupListMock();

      await AccessExtensionService.listExtensionRequests({
        status: 'pending',
      });

      const findQuery = (AccessExtensionRequest.find as jest.Mock).mock.calls[0][0];
      expect(findQuery.status).toBe('pending');
    });

    it('should handle descending sort', async () => {
      const { mockSort } = setupListMock();

      await AccessExtensionService.listExtensionRequests({
        sort: '-requestedAt',
      });

      expect(mockSort).toHaveBeenCalledWith({ requestedAt: -1 });
    });

    it('should handle ascending sort', async () => {
      const { mockSort } = setupListMock();

      await AccessExtensionService.listExtensionRequests({
        sort: 'status',
      });

      expect(mockSort).toHaveBeenCalledWith({ status: 1 });
    });

    it('should clamp limit to max 100', async () => {
      const { mockLimit } = setupListMock();

      await AccessExtensionService.listExtensionRequests({ limit: 500 });

      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    it('should calculate pagination correctly', async () => {
      setupListMock([], 25);

      const result = await AccessExtensionService.listExtensionRequests({
        page: 2,
        limit: 10,
      });

      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────
  // getExtensionRequest
  // ──────────────────────────────────────────────────
  describe('getExtensionRequest', () => {
    it('should throw on invalid request ID', async () => {
      await expect(
        AccessExtensionService.getExtensionRequest('invalid')
      ).rejects.toThrow('Invalid request ID');
    });

    it('should throw when request not found', async () => {
      const mockLean = jest.fn().mockResolvedValue(null);
      const mockPopulate2 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (AccessExtensionRequest.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate1,
      });

      await expect(
        AccessExtensionService.getExtensionRequest(mockRequestId)
      ).rejects.toThrow('Extension request not found');
    });

    it('should return request with populated fields', async () => {
      const mockRequest = {
        _id: mockRequestId,
        learnerId: { _id: mockLearnerId, email: 'test@test.com' },
        reviewedBy: null,
        status: 'pending',
      };
      const mockLean = jest.fn().mockResolvedValue(mockRequest);
      const mockPopulate2 = jest.fn().mockReturnValue({ lean: mockLean });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (AccessExtensionRequest.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate1,
      });

      const result = await AccessExtensionService.getExtensionRequest(mockRequestId);

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  // ──────────────────────────────────────────────────
  // getLearnerVersionAccess
  // ──────────────────────────────────────────────────
  describe('getLearnerVersionAccess', () => {
    it('should throw on invalid learner ID', async () => {
      await expect(
        AccessExtensionService.getLearnerVersionAccess('invalid')
      ).rejects.toThrow('Invalid learner ID');
    });

    it('should return empty array when no enrollments', async () => {
      const mockPopulate = jest.fn().mockResolvedValue([]);
      (Enrollment.find as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await AccessExtensionService.getLearnerVersionAccess(
        mockLearnerId
      );

      expect(result).toEqual([]);
    });

    it('should return version access info for active enrollments', async () => {
      const mockEnrollments = [
        {
          _id: new mongoose.Types.ObjectId(mockEnrollmentId),
          programId: {
            _id: new mongoose.Types.ObjectId(mockProgramId),
            name: 'Test Program',
          },
          accessExpiresAt: new Date('2026-06-01'),
        },
      ];
      const mockPopulate = jest.fn().mockResolvedValue(mockEnrollments);
      (Enrollment.find as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await AccessExtensionService.getLearnerVersionAccess(
        mockLearnerId
      );

      expect(result).toHaveLength(1);
      expect(result[0].programName).toBe('Test Program');
      expect(result[0].canRequestExtension).toBe(true);
      expect(result[0].availableVersions).toEqual([]);
      expect(AccessPolicyService.getEffectivePolicy).toHaveBeenCalled();
    });

    it('should set canRequestExtension false when no expiration date', async () => {
      const mockEnrollments = [
        {
          _id: new mongoose.Types.ObjectId(mockEnrollmentId),
          programId: {
            _id: new mongoose.Types.ObjectId(mockProgramId),
            name: 'Perpetual Program',
          },
          accessExpiresAt: null,
        },
      ];
      const mockPopulate = jest.fn().mockResolvedValue(mockEnrollments);
      (Enrollment.find as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await AccessExtensionService.getLearnerVersionAccess(
        mockLearnerId
      );

      expect(result).toHaveLength(1);
      expect(result[0].canRequestExtension).toBe(false);
    });

    it('should skip enrollments with null programId', async () => {
      const mockEnrollments = [
        {
          _id: new mongoose.Types.ObjectId(),
          programId: null,
          accessExpiresAt: null,
        },
      ];
      const mockPopulate = jest.fn().mockResolvedValue(mockEnrollments);
      (Enrollment.find as jest.Mock).mockReturnValue({ populate: mockPopulate });

      const result = await AccessExtensionService.getLearnerVersionAccess(
        mockLearnerId
      );

      expect(result).toHaveLength(0);
    });
  });
});
