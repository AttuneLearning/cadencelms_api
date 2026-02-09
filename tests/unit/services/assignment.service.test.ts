/**
 * Unit Tests: AssignmentService
 *
 * Tests for the assignment service:
 * - createAssignment: course validation, success creation
 * - getAssignment: success, not found, invalid ID
 * - updateAssignment: field updates, not found
 * - listAssignments: pagination, moduleId filter, isPublished filter
 * - deleteAssignment: soft-delete, not found
 */

import mongoose from 'mongoose';
import { AssignmentService } from '@/services/assignment/assignment.service';
import Assignment from '@/models/assignment/Assignment.model';
import Course from '@/models/academic/Course.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/assignment/Assignment.model');
jest.mock('@/models/academic/Course.model');

describe('AssignmentService', () => {
  const mockCourseId = new mongoose.Types.ObjectId().toString();
  const mockModuleId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockAssignmentId = new mongoose.Types.ObjectId().toString();

  let mockSave: jest.Mock;
  let mockLean: jest.Mock;
  let mockLimit: jest.Mock;
  let mockSkip: jest.Mock;
  let mockSort: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSave = jest.fn().mockResolvedValue(true);

    // Query chain for Assignment.find().sort().skip().limit().lean()
    mockLean = jest.fn();
    mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
    mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
    (Assignment.find as jest.Mock).mockReturnValue({ sort: mockSort });
  });

  // =========================================================================
  // createAssignment
  // =========================================================================
  describe('createAssignment', () => {
    const validData = {
      courseId: mockCourseId,
      moduleId: mockModuleId,
      title: 'Week 1 Essay',
      instructions: 'Write a 500-word essay on the topic.',
      submissionType: 'text',
      maxScore: 100,
    };

    it('should create an assignment when course exists and is published', async () => {
      const mockAssignmentObjId = new mongoose.Types.ObjectId();

      // Course.findOne({ _id, status: 'published' }).lean() returns a course
      (Course.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(mockCourseId),
          status: 'published',
        }),
      });

      (Assignment as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: mockAssignmentObjId,
        save: mockSave,
      }));

      const result = await AssignmentService.createAssignment(validData, mockUserId);

      expect(result).toBeDefined();
      expect(result._id).toEqual(mockAssignmentObjId);
      expect(result.title).toBe('Week 1 Essay');
      expect(result.courseId).toBe(mockCourseId);
      expect(result.createdBy).toBe(mockUserId);
      expect(mockSave).toHaveBeenCalledTimes(1);

      // Verify Course.findOne was called with correct query
      expect(Course.findOne).toHaveBeenCalledWith({
        _id: mockCourseId,
        status: 'published',
      });
    });

    it('should throw 404 when course is not found', async () => {
      (Course.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        AssignmentService.createAssignment(validData, mockUserId)
      ).rejects.toThrow(ApiError);

      await expect(
        AssignmentService.createAssignment(validData, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Course not found or not published',
      });
    });

    it('should throw 404 when course exists but is not published', async () => {
      // Course.findOne with status: 'published' returns null for draft/archived courses
      (Course.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const draftCourseData = { ...validData, courseId: new mongoose.Types.ObjectId().toString() };

      await expect(
        AssignmentService.createAssignment(draftCourseData, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Course not found or not published',
      });
    });
  });

  // =========================================================================
  // getAssignment
  // =========================================================================
  describe('getAssignment', () => {
    it('should return assignment when found and not deleted', async () => {
      const assignmentObjId = new mongoose.Types.ObjectId(mockAssignmentId);

      const mockAssignment = {
        _id: assignmentObjId,
        courseId: new mongoose.Types.ObjectId(mockCourseId),
        title: 'Week 1 Essay',
        instructions: 'Write an essay.',
        submissionType: 'text',
        maxScore: 100,
        isDeleted: false,
      };

      (Assignment.findOne as jest.Mock).mockResolvedValue(mockAssignment);

      const result = await AssignmentService.getAssignment(mockAssignmentId);

      expect(result).toBeDefined();
      expect(result._id).toEqual(assignmentObjId);
      expect(result.title).toBe('Week 1 Essay');
      expect(Assignment.findOne).toHaveBeenCalledWith({
        _id: mockAssignmentId,
        isDeleted: false,
      });
    });

    it('should throw 404 when assignment is not found', async () => {
      (Assignment.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        AssignmentService.getAssignment(mockAssignmentId)
      ).rejects.toThrow(ApiError);

      await expect(
        AssignmentService.getAssignment(mockAssignmentId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Assignment not found',
      });
    });

    it('should throw 404 for an invalid ObjectId', async () => {
      await expect(
        AssignmentService.getAssignment('invalid-id')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Assignment not found',
      });

      // findOne should not be called for invalid IDs
      expect(Assignment.findOne).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateAssignment
  // =========================================================================
  describe('updateAssignment', () => {
    it('should update assignment fields and save', async () => {
      const assignmentDoc = {
        _id: new mongoose.Types.ObjectId(mockAssignmentId),
        courseId: new mongoose.Types.ObjectId(mockCourseId),
        title: 'Original Title',
        instructions: 'Original instructions',
        submissionType: 'text',
        maxScore: 100,
        maxFiles: 5,
        isPublished: false,
        isDeleted: false,
        save: mockSave,
      };

      (Assignment.findOne as jest.Mock).mockResolvedValue(assignmentDoc);

      const updateData = {
        title: 'Updated Title',
        instructions: 'Updated instructions',
        isPublished: true,
        maxScore: 150,
      };

      const result = await AssignmentService.updateAssignment(
        mockAssignmentId,
        updateData,
        mockUserId
      );

      expect(result.title).toBe('Updated Title');
      expect(result.instructions).toBe('Updated instructions');
      expect(result.isPublished).toBe(true);
      expect(result.maxScore).toBe(150);
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should throw 404 when assignment to update is not found', async () => {
      (Assignment.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        AssignmentService.updateAssignment(mockAssignmentId, { title: 'New' }, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Assignment not found',
      });
    });

    it('should throw 404 for invalid ObjectId on update', async () => {
      await expect(
        AssignmentService.updateAssignment('bad-id', { title: 'New' }, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Assignment not found',
      });

      expect(Assignment.findOne).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // listAssignments
  // =========================================================================
  describe('listAssignments', () => {
    it('should return paginated results with defaults', async () => {
      const mockAssignments = [
        { _id: new mongoose.Types.ObjectId(), title: 'Assignment 1' },
        { _id: new mongoose.Types.ObjectId(), title: 'Assignment 2' },
      ];

      mockLean.mockResolvedValue(mockAssignments);
      (Assignment.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await AssignmentService.listAssignments(mockCourseId);

      expect(result.assignments).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });

      // Verify query was built correctly
      expect(Assignment.find).toHaveBeenCalledWith({
        courseId: mockCourseId,
        isDeleted: false,
      });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(20);
    });

    it('should filter by moduleId when provided', async () => {
      mockLean.mockResolvedValue([]);
      (Assignment.countDocuments as jest.Mock).mockResolvedValue(0);

      await AssignmentService.listAssignments(mockCourseId, { moduleId: mockModuleId });

      expect(Assignment.find).toHaveBeenCalledWith({
        courseId: mockCourseId,
        isDeleted: false,
        moduleId: mockModuleId,
      });
    });

    it('should filter by isPublished when provided', async () => {
      mockLean.mockResolvedValue([]);
      (Assignment.countDocuments as jest.Mock).mockResolvedValue(0);

      await AssignmentService.listAssignments(mockCourseId, { isPublished: true });

      expect(Assignment.find).toHaveBeenCalledWith({
        courseId: mockCourseId,
        isDeleted: false,
        isPublished: true,
      });
    });

    it('should respect custom page and limit', async () => {
      mockLean.mockResolvedValue([]);
      (Assignment.countDocuments as jest.Mock).mockResolvedValue(50);

      const result = await AssignmentService.listAssignments(mockCourseId, {
        page: 3,
        limit: 10,
      });

      expect(mockSkip).toHaveBeenCalledWith(20); // (3 - 1) * 10
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
    });
  });

  // =========================================================================
  // deleteAssignment
  // =========================================================================
  describe('deleteAssignment', () => {
    it('should soft-delete an assignment by setting isDeleted to true', async () => {
      const assignmentDoc = {
        _id: new mongoose.Types.ObjectId(mockAssignmentId),
        courseId: new mongoose.Types.ObjectId(mockCourseId),
        title: 'Assignment to Delete',
        isDeleted: false,
        save: mockSave,
      };

      (Assignment.findOne as jest.Mock).mockResolvedValue(assignmentDoc);

      const result = await AssignmentService.deleteAssignment(mockAssignmentId, mockUserId);

      expect(assignmentDoc.isDeleted).toBe(true);
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(Assignment.findOne).toHaveBeenCalledWith({
        _id: mockAssignmentId,
        isDeleted: false,
      });
    });

    it('should throw 404 when assignment to delete is not found', async () => {
      (Assignment.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        AssignmentService.deleteAssignment(mockAssignmentId, mockUserId)
      ).rejects.toThrow(ApiError);

      await expect(
        AssignmentService.deleteAssignment(mockAssignmentId, mockUserId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Assignment not found',
      });
    });

    it('should throw 404 for invalid ObjectId on delete', async () => {
      await expect(
        AssignmentService.deleteAssignment('not-valid', mockUserId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Assignment not found',
      });

      expect(Assignment.findOne).not.toHaveBeenCalled();
    });
  });
});
