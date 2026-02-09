/**
 * Unit Tests: AssignmentSubmissionService
 *
 * Tests for the assignment submission service:
 * - createSubmission (validates assignment, checks resubmission limit, creates)
 * - updateDraft (author check, draft status check, updates fields)
 * - submitSubmission (author check, draft status check, content validation)
 * - getSubmission (findOne with populate, 404 handling)
 * - listSubmissions (paginated, filtered by learnerId and status)
 * - gradeSubmission (status check, sets grading fields)
 * - returnSubmission (status check, sets return fields)
 */

import mongoose from 'mongoose';
import { AssignmentSubmissionService } from '@/services/assignment/assignmentSubmission.service';
import AssignmentSubmission from '@/models/assignment/AssignmentSubmission.model';
import Assignment from '@/models/assignment/Assignment.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/assignment/AssignmentSubmission.model');
jest.mock('@/models/assignment/Assignment.model');

describe('AssignmentSubmissionService', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockOtherUserId = new mongoose.Types.ObjectId().toString();
  const mockAssignmentId = new mongoose.Types.ObjectId().toString();
  const mockSubmissionId = new mongoose.Types.ObjectId().toString();
  const mockEnrollmentId = new mongoose.Types.ObjectId().toString();

  const createMockSubmission = (overrides: any = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    assignmentId: mockAssignmentId,
    learnerId: { toString: () => mockUserId },
    enrollmentId: mockEnrollmentId,
    submissionNumber: 1,
    status: 'draft',
    textContent: null,
    files: [],
    submittedAt: null,
    grade: null,
    feedback: null,
    gradedBy: null,
    gradedAt: null,
    returnedAt: null,
    returnReason: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────
  // createSubmission
  // ──────────────────────────────────────────────────
  describe('createSubmission', () => {
    let mockAssignmentLean: jest.Mock;
    let mockSave: jest.Mock;

    beforeEach(() => {
      mockAssignmentLean = jest.fn();
      (Assignment.findOne as jest.Mock).mockReturnValue({ lean: mockAssignmentLean });

      mockSave = jest.fn().mockResolvedValue(undefined);
      (AssignmentSubmission as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockSave,
      }));
    });

    it('should create a submission successfully with submissionNumber=1', async () => {
      mockAssignmentLean.mockResolvedValue({
        _id: mockAssignmentId,
        isPublished: true,
        isDeleted: false,
        maxResubmissions: null,
      });
      (AssignmentSubmission.countDocuments as jest.Mock).mockResolvedValue(0);

      const data = { textContent: 'My submission', files: [], enrollmentId: mockEnrollmentId };
      const result = await AssignmentSubmissionService.createSubmission(
        mockAssignmentId,
        data,
        mockUserId,
        mockEnrollmentId
      );

      expect(Assignment.findOne).toHaveBeenCalledWith({
        _id: mockAssignmentId,
        isPublished: true,
        isDeleted: false,
      });
      expect(AssignmentSubmission.countDocuments).toHaveBeenCalledWith({
        assignmentId: mockAssignmentId,
        learnerId: mockUserId,
        isDeleted: false,
      });
      expect(AssignmentSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          assignmentId: mockAssignmentId,
          learnerId: mockUserId,
          enrollmentId: mockEnrollmentId,
          submissionNumber: 1,
          textContent: 'My submission',
          files: [],
        })
      );
      expect(mockSave).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.submissionNumber).toBe(1);
    });

    it('should throw 404 when assignment not found', async () => {
      mockAssignmentLean.mockResolvedValue(null);

      const data = { textContent: 'My submission', files: [], enrollmentId: mockEnrollmentId };

      await expect(
        AssignmentSubmissionService.createSubmission(mockAssignmentId, data, mockUserId, mockEnrollmentId)
      ).rejects.toThrow(ApiError);

      mockAssignmentLean.mockResolvedValue(null);

      await expect(
        AssignmentSubmissionService.createSubmission(mockAssignmentId, data, mockUserId, mockEnrollmentId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Assignment not found or not published',
      });
    });

    it('should throw 404 when assignment is not published', async () => {
      // Assignment.findOne with isPublished: true will return null for unpublished
      mockAssignmentLean.mockResolvedValue(null);

      const data = { textContent: 'My submission', files: [], enrollmentId: mockEnrollmentId };

      await expect(
        AssignmentSubmissionService.createSubmission(mockAssignmentId, data, mockUserId, mockEnrollmentId)
      ).rejects.toThrow(ApiError);

      mockAssignmentLean.mockResolvedValue(null);

      await expect(
        AssignmentSubmissionService.createSubmission(mockAssignmentId, data, mockUserId, mockEnrollmentId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Assignment not found or not published',
      });
    });

    it('should enforce resubmission limit when maxResubmissions=0 and already has 1 submission', async () => {
      mockAssignmentLean.mockResolvedValue({
        _id: mockAssignmentId,
        isPublished: true,
        isDeleted: false,
        maxResubmissions: 0, // 0 means only 1 submission allowed (1 + 0 = 1)
      });
      (AssignmentSubmission.countDocuments as jest.Mock).mockResolvedValue(1); // already submitted once

      const data = { textContent: 'Second attempt', files: [], enrollmentId: mockEnrollmentId };

      await expect(
        AssignmentSubmissionService.createSubmission(mockAssignmentId, data, mockUserId, mockEnrollmentId)
      ).rejects.toThrow(ApiError);

      // Re-mock for second assertion
      mockAssignmentLean.mockResolvedValue({
        _id: mockAssignmentId,
        isPublished: true,
        isDeleted: false,
        maxResubmissions: 0,
      });
      (AssignmentSubmission.countDocuments as jest.Mock).mockResolvedValue(1);

      await expect(
        AssignmentSubmissionService.createSubmission(mockAssignmentId, data, mockUserId, mockEnrollmentId)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Maximum submissions reached for this assignment',
      });
    });

    it('should allow unlimited submissions when maxResubmissions is null', async () => {
      mockAssignmentLean.mockResolvedValue({
        _id: mockAssignmentId,
        isPublished: true,
        isDeleted: false,
        maxResubmissions: null,
      });
      (AssignmentSubmission.countDocuments as jest.Mock).mockResolvedValue(10);

      const data = { textContent: 'Another submission', files: [], enrollmentId: mockEnrollmentId };
      const result = await AssignmentSubmissionService.createSubmission(
        mockAssignmentId,
        data,
        mockUserId,
        mockEnrollmentId
      );

      expect(result).toBeDefined();
      expect(result.submissionNumber).toBe(11);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw 404 for invalid ObjectId', async () => {
      const data = { textContent: 'My submission', files: [], enrollmentId: mockEnrollmentId };

      await expect(
        AssignmentSubmissionService.createSubmission('invalid-id', data, mockUserId, mockEnrollmentId)
      ).rejects.toThrow(ApiError);

      await expect(
        AssignmentSubmissionService.createSubmission('invalid-id', data, mockUserId, mockEnrollmentId)
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(Assignment.findOne).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────
  // updateDraft
  // ──────────────────────────────────────────────────
  describe('updateDraft', () => {
    it('should update a draft submission successfully', async () => {
      const mockSubmission = createMockSubmission({ status: 'draft' });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      const data = { textContent: 'Updated content', files: [{ fileId: new mongoose.Types.ObjectId(), fileName: 'test.pdf', fileUrl: '/test.pdf', fileSize: 1024, mimeType: 'application/pdf' }] };
      const result = await AssignmentSubmissionService.updateDraft(mockSubmissionId, data, mockUserId);

      expect(AssignmentSubmission.findOne).toHaveBeenCalledWith({ _id: mockSubmissionId, isDeleted: false });
      expect(mockSubmission.textContent).toBe('Updated content');
      expect(mockSubmission.files).toEqual(data.files);
      expect(mockSubmission.save).toHaveBeenCalled();
      expect(result).toEqual(mockSubmission);
    });

    it('should throw 409 when submission is not in draft status', async () => {
      const mockSubmission = createMockSubmission({ status: 'submitted' });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      const data = { textContent: 'Updated content' };

      await expect(
        AssignmentSubmissionService.updateDraft(mockSubmissionId, data, mockUserId)
      ).rejects.toThrow(ApiError);

      // Re-mock for second assertion
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(
        createMockSubmission({ status: 'submitted' })
      );

      await expect(
        AssignmentSubmissionService.updateDraft(mockSubmissionId, data, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Only draft submissions can be edited',
      });
    });

    it('should throw 403 when user is not the author', async () => {
      const mockSubmission = createMockSubmission({
        learnerId: { toString: () => mockOtherUserId },
      });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      const data = { textContent: 'Unauthorized edit' };

      await expect(
        AssignmentSubmissionService.updateDraft(mockSubmissionId, data, mockUserId)
      ).rejects.toThrow(ApiError);

      // Re-mock for second assertion
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(
        createMockSubmission({ learnerId: { toString: () => mockOtherUserId } })
      );

      await expect(
        AssignmentSubmissionService.updateDraft(mockSubmissionId, data, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'You do not have permission to edit this submission',
      });
    });

    it('should throw 404 when submission not found', async () => {
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(null);

      const data = { textContent: 'Updated content' };

      await expect(
        AssignmentSubmissionService.updateDraft(mockSubmissionId, data, mockUserId)
      ).rejects.toThrow(ApiError);

      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        AssignmentSubmissionService.updateDraft(mockSubmissionId, data, mockUserId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Submission not found' });
    });
  });

  // ──────────────────────────────────────────────────
  // submitSubmission
  // ──────────────────────────────────────────────────
  describe('submitSubmission', () => {
    it('should submit a draft submission with text content and set submittedAt and status', async () => {
      const mockSubmission = createMockSubmission({
        status: 'draft',
        textContent: 'My assignment answer',
      });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      const result = await AssignmentSubmissionService.submitSubmission(mockSubmissionId, mockUserId);

      expect(AssignmentSubmission.findOne).toHaveBeenCalledWith({ _id: mockSubmissionId, isDeleted: false });
      expect(mockSubmission.status).toBe('submitted');
      expect(mockSubmission.submittedAt).toBeInstanceOf(Date);
      expect(mockSubmission.save).toHaveBeenCalled();
      expect(result).toEqual(mockSubmission);
    });

    it('should submit a draft submission with files', async () => {
      const mockSubmission = createMockSubmission({
        status: 'draft',
        textContent: null,
        files: [{ fileId: new mongoose.Types.ObjectId(), fileName: 'test.pdf', fileUrl: '/test.pdf', fileSize: 1024, mimeType: 'application/pdf' }],
      });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      const result = await AssignmentSubmissionService.submitSubmission(mockSubmissionId, mockUserId);

      expect(mockSubmission.status).toBe('submitted');
      expect(mockSubmission.submittedAt).toBeInstanceOf(Date);
      expect(mockSubmission.save).toHaveBeenCalled();
      expect(result).toEqual(mockSubmission);
    });

    it('should throw 409 when submission is not in draft status', async () => {
      const mockSubmission = createMockSubmission({ status: 'graded' });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      await expect(
        AssignmentSubmissionService.submitSubmission(mockSubmissionId, mockUserId)
      ).rejects.toThrow(ApiError);

      // Re-mock for second assertion
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(
        createMockSubmission({ status: 'graded' })
      );

      await expect(
        AssignmentSubmissionService.submitSubmission(mockSubmissionId, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Only draft submissions can be submitted',
      });
    });

    it('should throw 400 when submission has no content (no text, no files)', async () => {
      const mockSubmission = createMockSubmission({
        status: 'draft',
        textContent: null,
        files: [],
      });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      await expect(
        AssignmentSubmissionService.submitSubmission(mockSubmissionId, mockUserId)
      ).rejects.toThrow(ApiError);

      // Re-mock for second assertion
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(
        createMockSubmission({ status: 'draft', textContent: null, files: [] })
      );

      await expect(
        AssignmentSubmissionService.submitSubmission(mockSubmissionId, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Submission must have text content or files',
      });
    });

    it('should throw 400 when textContent is whitespace-only and no files', async () => {
      const mockSubmission = createMockSubmission({
        status: 'draft',
        textContent: '   ',
        files: [],
      });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      await expect(
        AssignmentSubmissionService.submitSubmission(mockSubmissionId, mockUserId)
      ).rejects.toThrow(ApiError);

      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(
        createMockSubmission({ status: 'draft', textContent: '   ', files: [] })
      );

      await expect(
        AssignmentSubmissionService.submitSubmission(mockSubmissionId, mockUserId)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // ──────────────────────────────────────────────────
  // getSubmission
  // ──────────────────────────────────────────────────
  describe('getSubmission', () => {
    let mockPopulateFindOne: jest.Mock;

    beforeEach(() => {
      mockPopulateFindOne = jest.fn();
      (AssignmentSubmission.findOne as jest.Mock).mockReturnValue({ populate: mockPopulateFindOne });
    });

    it('should return a submission with populated learnerId', async () => {
      const mockSubmission = createMockSubmission({
        learnerId: { _id: new mongoose.Types.ObjectId(), firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      });
      mockPopulateFindOne.mockResolvedValue(mockSubmission);

      const result = await AssignmentSubmissionService.getSubmission(mockSubmissionId);

      expect(AssignmentSubmission.findOne).toHaveBeenCalledWith({ _id: mockSubmissionId, isDeleted: false });
      expect(mockPopulateFindOne).toHaveBeenCalledWith('learnerId', 'firstName lastName email');
      expect(result).toEqual(mockSubmission);
    });

    it('should throw 404 when submission not found', async () => {
      mockPopulateFindOne.mockResolvedValue(null);

      await expect(
        AssignmentSubmissionService.getSubmission(mockSubmissionId)
      ).rejects.toThrow(ApiError);

      // Re-mock for second assertion
      (AssignmentSubmission.findOne as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

      await expect(
        AssignmentSubmissionService.getSubmission(mockSubmissionId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Submission not found' });
    });

    it('should throw 404 for invalid ObjectId', async () => {
      await expect(
        AssignmentSubmissionService.getSubmission('invalid-id')
      ).rejects.toThrow(ApiError);

      await expect(
        AssignmentSubmissionService.getSubmission('invalid-id')
      ).rejects.toMatchObject({ statusCode: 404, message: 'Submission not found' });

      expect(AssignmentSubmission.findOne).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────
  // listSubmissions
  // ──────────────────────────────────────────────────
  describe('listSubmissions', () => {
    let mockLean: jest.Mock;
    let mockLimit: jest.Mock;
    let mockSkip: jest.Mock;
    let mockSort: jest.Mock;
    let mockPopulate: jest.Mock;

    beforeEach(() => {
      mockLean = jest.fn();
      mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
      (AssignmentSubmission.find as jest.Mock).mockReturnValue({ populate: mockPopulate });
    });

    it('should return paginated submissions with default pagination', async () => {
      const mockSubmissions = [createMockSubmission(), createMockSubmission()];
      mockLean.mockResolvedValue(mockSubmissions);
      (AssignmentSubmission.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await AssignmentSubmissionService.listSubmissions(mockAssignmentId);

      expect(AssignmentSubmission.find).toHaveBeenCalledWith({
        assignmentId: mockAssignmentId,
        isDeleted: false,
      });
      expect(mockPopulate).toHaveBeenCalledWith('learnerId', 'firstName lastName email');
      expect(mockSort).toHaveBeenCalledWith({ submissionNumber: -1 });
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(20);
      expect(result.submissions).toEqual(mockSubmissions);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by learnerId when provided', async () => {
      mockLean.mockResolvedValue([]);
      (AssignmentSubmission.countDocuments as jest.Mock).mockResolvedValue(0);

      await AssignmentSubmissionService.listSubmissions(mockAssignmentId, { learnerId: mockUserId });

      expect(AssignmentSubmission.find).toHaveBeenCalledWith({
        assignmentId: mockAssignmentId,
        isDeleted: false,
        learnerId: mockUserId,
      });
    });

    it('should filter by status when provided', async () => {
      mockLean.mockResolvedValue([]);
      (AssignmentSubmission.countDocuments as jest.Mock).mockResolvedValue(0);

      await AssignmentSubmissionService.listSubmissions(mockAssignmentId, { status: 'submitted' });

      expect(AssignmentSubmission.find).toHaveBeenCalledWith({
        assignmentId: mockAssignmentId,
        isDeleted: false,
        status: 'submitted',
      });
    });

    it('should respect custom page and limit parameters', async () => {
      mockLean.mockResolvedValue([createMockSubmission()]);
      (AssignmentSubmission.countDocuments as jest.Mock).mockResolvedValue(25);

      const result = await AssignmentSubmissionService.listSubmissions(mockAssignmentId, { page: 3, limit: 5 });

      expect(mockSkip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(mockLimit).toHaveBeenCalledWith(5);
      expect(result.pagination).toEqual({
        page: 3,
        limit: 5,
        total: 25,
        totalPages: 5,
      });
    });

    it('should cap limit at 100', async () => {
      mockLean.mockResolvedValue([]);
      (AssignmentSubmission.countDocuments as jest.Mock).mockResolvedValue(0);

      await AssignmentSubmissionService.listSubmissions(mockAssignmentId, { limit: 500 });

      expect(mockLimit).toHaveBeenCalledWith(100);
    });
  });

  // ──────────────────────────────────────────────────
  // gradeSubmission
  // ──────────────────────────────────────────────────
  describe('gradeSubmission', () => {
    it('should grade a submitted submission and set all grading fields', async () => {
      const mockSubmission = createMockSubmission({ status: 'submitted' });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      const data = { grade: 85, feedback: 'Good work!' };
      const result = await AssignmentSubmissionService.gradeSubmission(mockSubmissionId, data, mockUserId);

      expect(AssignmentSubmission.findOne).toHaveBeenCalledWith({ _id: mockSubmissionId, isDeleted: false });
      expect(mockSubmission.grade).toBe(85);
      expect(mockSubmission.feedback).toBe('Good work!');
      expect(mockSubmission.gradedBy).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(mockSubmission.gradedBy.toString()).toBe(mockUserId);
      expect(mockSubmission.gradedAt).toBeInstanceOf(Date);
      expect(mockSubmission.status).toBe('graded');
      expect(mockSubmission.save).toHaveBeenCalled();
      expect(result).toEqual(mockSubmission);
    });

    it('should set feedback to null when not provided', async () => {
      const mockSubmission = createMockSubmission({ status: 'submitted' });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      const data = { grade: 90 };
      await AssignmentSubmissionService.gradeSubmission(mockSubmissionId, data, mockUserId);

      expect(mockSubmission.feedback).toBeNull();
      expect(mockSubmission.grade).toBe(90);
      expect(mockSubmission.status).toBe('graded');
    });

    it('should throw 409 when submission is not in submitted status', async () => {
      const mockSubmission = createMockSubmission({ status: 'draft' });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      const data = { grade: 85, feedback: 'Good work!' };

      await expect(
        AssignmentSubmissionService.gradeSubmission(mockSubmissionId, data, mockUserId)
      ).rejects.toThrow(ApiError);

      // Re-mock for second assertion
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(
        createMockSubmission({ status: 'draft' })
      );

      await expect(
        AssignmentSubmissionService.gradeSubmission(mockSubmissionId, data, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Only submitted submissions can be graded',
      });
    });

    it('should throw 404 when submission not found', async () => {
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(null);

      const data = { grade: 85 };

      await expect(
        AssignmentSubmissionService.gradeSubmission(mockSubmissionId, data, mockUserId)
      ).rejects.toThrow(ApiError);

      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        AssignmentSubmissionService.gradeSubmission(mockSubmissionId, data, mockUserId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Submission not found' });
    });
  });

  // ──────────────────────────────────────────────────
  // returnSubmission
  // ──────────────────────────────────────────────────
  describe('returnSubmission', () => {
    it('should return a submitted submission and set return fields', async () => {
      const mockSubmission = createMockSubmission({ status: 'submitted' });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      const data = { returnReason: 'Please add more detail to section 3' };
      const result = await AssignmentSubmissionService.returnSubmission(mockSubmissionId, data, mockUserId);

      expect(AssignmentSubmission.findOne).toHaveBeenCalledWith({ _id: mockSubmissionId, isDeleted: false });
      expect(mockSubmission.status).toBe('returned');
      expect(mockSubmission.returnedAt).toBeInstanceOf(Date);
      expect(mockSubmission.returnReason).toBe('Please add more detail to section 3');
      expect(mockSubmission.save).toHaveBeenCalled();
      expect(result).toEqual(mockSubmission);
    });

    it('should throw 409 when submission is not in submitted status', async () => {
      const mockSubmission = createMockSubmission({ status: 'graded' });
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(mockSubmission);

      const data = { returnReason: 'Need revisions' };

      await expect(
        AssignmentSubmissionService.returnSubmission(mockSubmissionId, data, mockUserId)
      ).rejects.toThrow(ApiError);

      // Re-mock for second assertion
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(
        createMockSubmission({ status: 'graded' })
      );

      await expect(
        AssignmentSubmissionService.returnSubmission(mockSubmissionId, data, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Only submitted submissions can be returned',
      });
    });

    it('should throw 404 when submission not found', async () => {
      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(null);

      const data = { returnReason: 'Need revisions' };

      await expect(
        AssignmentSubmissionService.returnSubmission(mockSubmissionId, data, mockUserId)
      ).rejects.toThrow(ApiError);

      (AssignmentSubmission.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        AssignmentSubmissionService.returnSubmission(mockSubmissionId, data, mockUserId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Submission not found' });
    });
  });
});
