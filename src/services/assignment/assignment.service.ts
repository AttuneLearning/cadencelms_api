import mongoose from 'mongoose';
import Assignment, { IAssignment } from '@/models/assignment/Assignment.model';
import Course from '@/models/academic/Course.model';
import { ApiError } from '@/utils/ApiError';

interface ListAssignmentsFilters {
  moduleId?: string;
  isPublished?: boolean;
  page?: number;
  limit?: number;
}

export class AssignmentService {
  /**
   * Create a new assignment
   */
  static async createAssignment(
    data: {
      courseId: string;
      moduleId?: string;
      title: string;
      instructions: string;
      submissionType: string;
      allowedFileTypes?: string[];
      maxFileSize?: number;
      maxFiles?: number;
      maxScore: number;
      maxResubmissions?: number | null;
    },
    userId: string
  ): Promise<IAssignment> {
    // Validate course exists and is published
    const course = await Course.findOne({ _id: data.courseId, status: 'published' }).lean();
    if (!course) {
      throw ApiError.notFound('Course not found or not published');
    }

    const assignment = new Assignment({
      courseId: data.courseId,
      moduleId: data.moduleId || undefined,
      title: data.title,
      instructions: data.instructions,
      submissionType: data.submissionType,
      allowedFileTypes: data.allowedFileTypes,
      maxFileSize: data.maxFileSize,
      maxFiles: data.maxFiles,
      maxScore: data.maxScore,
      maxResubmissions: data.maxResubmissions,
      createdBy: userId
    });

    await assignment.save();
    return assignment;
  }

  /**
   * Get a single assignment by ID
   */
  static async getAssignment(assignmentId: string): Promise<IAssignment> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw ApiError.notFound('Assignment not found');
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, isDeleted: false });
    if (!assignment) {
      throw ApiError.notFound('Assignment not found');
    }

    return assignment;
  }

  /**
   * Update an assignment
   */
  static async updateAssignment(
    assignmentId: string,
    data: Partial<{
      title: string;
      instructions: string;
      submissionType: string;
      allowedFileTypes: string[];
      maxFileSize: number;
      maxFiles: number;
      maxScore: number;
      maxResubmissions: number | null;
      isPublished: boolean;
      moduleId: string | null;
    }>,
    _userId: string
  ): Promise<IAssignment> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw ApiError.notFound('Assignment not found');
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, isDeleted: false });
    if (!assignment) {
      throw ApiError.notFound('Assignment not found');
    }

    if (data.title !== undefined) assignment.title = data.title;
    if (data.instructions !== undefined) assignment.instructions = data.instructions;
    if (data.submissionType !== undefined) assignment.submissionType = data.submissionType as any;
    if (data.allowedFileTypes !== undefined) assignment.allowedFileTypes = data.allowedFileTypes;
    if (data.maxFileSize !== undefined) assignment.maxFileSize = data.maxFileSize;
    if (data.maxFiles !== undefined) assignment.maxFiles = data.maxFiles;
    if (data.maxScore !== undefined) assignment.maxScore = data.maxScore;
    if (data.maxResubmissions !== undefined) assignment.maxResubmissions = data.maxResubmissions;
    if (data.isPublished !== undefined) assignment.isPublished = data.isPublished;
    if (data.moduleId !== undefined) assignment.moduleId = data.moduleId ? new mongoose.Types.ObjectId(data.moduleId) : undefined;

    await assignment.save();
    return assignment;
  }

  /**
   * List assignments for a course (paginated, filtered)
   */
  static async listAssignments(courseId: string, filters: ListAssignmentsFilters = {}) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: any = { courseId, isDeleted: false };
    if (filters.moduleId) query.moduleId = filters.moduleId;
    if (filters.isPublished !== undefined) query.isPublished = filters.isPublished;

    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Assignment.countDocuments(query)
    ]);

    return {
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Soft-delete an assignment
   */
  static async deleteAssignment(assignmentId: string, _userId: string): Promise<IAssignment> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw ApiError.notFound('Assignment not found');
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, isDeleted: false });
    if (!assignment) {
      throw ApiError.notFound('Assignment not found');
    }

    assignment.isDeleted = true;
    await assignment.save();
    return assignment;
  }
}
