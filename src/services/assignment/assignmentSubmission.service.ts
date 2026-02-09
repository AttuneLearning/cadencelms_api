import mongoose from 'mongoose';
import AssignmentSubmission, { IAssignmentSubmission } from '@/models/assignment/AssignmentSubmission.model';
import Assignment from '@/models/assignment/Assignment.model';
import { ApiError } from '@/utils/ApiError';

interface ListSubmissionsFilters {
  learnerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class AssignmentSubmissionService {
  /**
   * Create a new submission for an assignment
   */
  static async createSubmission(
    assignmentId: string,
    data: { textContent?: string | null; files?: any[]; enrollmentId: string },
    userId: string,
    enrollmentId: string
  ): Promise<IAssignmentSubmission> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw ApiError.notFound('Assignment not found');
    }

    // Validate assignment exists and is published
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      isPublished: true,
      isDeleted: false
    }).lean();

    if (!assignment) {
      throw ApiError.notFound('Assignment not found or not published');
    }

    // Count previous submissions (non-deleted) for resubmission limit
    const previousCount = await AssignmentSubmission.countDocuments({
      assignmentId,
      learnerId: userId,
      isDeleted: false
    });

    // Check resubmission limit (maxResubmissions=0 means 1 submission only, null=unlimited)
    if (assignment.maxResubmissions !== null) {
      const maxSubmissions = 1 + assignment.maxResubmissions;
      if (previousCount >= maxSubmissions) {
        throw ApiError.conflict('Maximum submissions reached for this assignment');
      }
    }

    const submission = new AssignmentSubmission({
      assignmentId,
      learnerId: userId,
      enrollmentId,
      submissionNumber: previousCount + 1,
      textContent: data.textContent || null,
      files: data.files || []
    });

    await submission.save();
    return submission;
  }

  /**
   * Update a draft submission (author only, must be in draft status)
   */
  static async updateDraft(
    submissionId: string,
    data: { textContent?: string | null; files?: any[] },
    userId: string
  ): Promise<IAssignmentSubmission> {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      throw ApiError.notFound('Submission not found');
    }

    const submission = await AssignmentSubmission.findOne({ _id: submissionId, isDeleted: false });
    if (!submission) {
      throw ApiError.notFound('Submission not found');
    }

    if (submission.learnerId.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to edit this submission');
    }

    if (submission.status !== 'draft') {
      throw ApiError.conflict('Only draft submissions can be edited');
    }

    if (data.textContent !== undefined) submission.textContent = data.textContent;
    if (data.files !== undefined) submission.files = data.files;

    await submission.save();
    return submission;
  }

  /**
   * Submit a draft submission (change status to submitted)
   */
  static async submitSubmission(
    submissionId: string,
    userId: string
  ): Promise<IAssignmentSubmission> {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      throw ApiError.notFound('Submission not found');
    }

    const submission = await AssignmentSubmission.findOne({ _id: submissionId, isDeleted: false });
    if (!submission) {
      throw ApiError.notFound('Submission not found');
    }

    if (submission.learnerId.toString() !== userId) {
      throw ApiError.forbidden('You do not have permission to submit this submission');
    }

    if (submission.status !== 'draft') {
      throw ApiError.conflict('Only draft submissions can be submitted');
    }

    // Validate that submission has some content
    const hasText = submission.textContent && submission.textContent.trim().length > 0;
    const hasFiles = submission.files && submission.files.length > 0;
    if (!hasText && !hasFiles) {
      throw ApiError.badRequest('Submission must have text content or files');
    }

    submission.status = 'submitted';
    submission.submittedAt = new Date();
    await submission.save();
    return submission;
  }

  /**
   * Get a single submission by ID
   */
  static async getSubmission(submissionId: string): Promise<IAssignmentSubmission> {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      throw ApiError.notFound('Submission not found');
    }

    const submission = await AssignmentSubmission.findOne({ _id: submissionId, isDeleted: false })
      .populate('learnerId', 'firstName lastName email');

    if (!submission) {
      throw ApiError.notFound('Submission not found');
    }

    return submission;
  }

  /**
   * List submissions for an assignment (paginated, filtered)
   */
  static async listSubmissions(assignmentId: string, filters: ListSubmissionsFilters = {}) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: any = { assignmentId, isDeleted: false };
    if (filters.learnerId) query.learnerId = filters.learnerId;
    if (filters.status) query.status = filters.status;

    const [submissions, total] = await Promise.all([
      AssignmentSubmission.find(query)
        .populate('learnerId', 'firstName lastName email')
        .sort({ submissionNumber: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AssignmentSubmission.countDocuments(query)
    ]);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Grade a submission (staff action)
   */
  static async gradeSubmission(
    submissionId: string,
    data: { grade: number; feedback?: string | null },
    userId: string
  ): Promise<IAssignmentSubmission> {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      throw ApiError.notFound('Submission not found');
    }

    const submission = await AssignmentSubmission.findOne({ _id: submissionId, isDeleted: false });
    if (!submission) {
      throw ApiError.notFound('Submission not found');
    }

    if (submission.status !== 'submitted') {
      throw ApiError.conflict('Only submitted submissions can be graded');
    }

    submission.grade = data.grade;
    submission.feedback = data.feedback !== undefined ? data.feedback : null;
    submission.gradedBy = new mongoose.Types.ObjectId(userId);
    submission.gradedAt = new Date();
    submission.status = 'graded';

    await submission.save();
    return submission;
  }

  /**
   * Return a submission for resubmission (staff action)
   */
  static async returnSubmission(
    submissionId: string,
    data: { returnReason: string },
    _userId: string
  ): Promise<IAssignmentSubmission> {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      throw ApiError.notFound('Submission not found');
    }

    const submission = await AssignmentSubmission.findOne({ _id: submissionId, isDeleted: false });
    if (!submission) {
      throw ApiError.notFound('Submission not found');
    }

    if (submission.status !== 'submitted') {
      throw ApiError.conflict('Only submitted submissions can be returned');
    }

    submission.status = 'returned';
    submission.returnedAt = new Date();
    submission.returnReason = data.returnReason;

    await submission.save();
    return submission;
  }
}
