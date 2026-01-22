import mongoose from 'mongoose';
import Assessment, {
  IAssessment,
  AssessmentStyle,
  SelectionMode,
  DifficultyLevel,
  RetakePolicy,
  ShowCorrectAnswers,
  FeedbackTiming
} from '@/models/content/Assessment.model';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import Question from '@/models/assessment/Question.model';
import Department from '@/models/organization/Department.model';
import { ApiError } from '@/utils/ApiError';

interface QuestionSelectionInput {
  questionBankIds: string[];
  questionCount: number;
  selectionMode: SelectionMode;
  filterByTags?: string[];
  filterByDifficulty?: DifficultyLevel[];
}

interface TimingInput {
  timeLimit?: number;
  showTimer: boolean;
  autoSubmitOnExpiry: boolean;
}

interface AttemptsInput {
  maxAttempts: number | null;
  cooldownMinutes?: number;
  retakePolicy: RetakePolicy;
}

interface ScoringInput {
  passingScore: number;
  showScore: boolean;
  showCorrectAnswers: ShowCorrectAnswers;
  partialCredit: boolean;
}

interface FeedbackInput {
  showFeedback: boolean;
  feedbackTiming: FeedbackTiming;
  showExplanations: boolean;
}

interface CreateAssessmentData {
  departmentId: string;
  title: string;
  description?: string;
  style: AssessmentStyle;
  questionSelection: QuestionSelectionInput;
  timing?: TimingInput;
  attempts?: AttemptsInput;
  scoring?: ScoringInput;
  feedback?: FeedbackInput;
}

interface UpdateAssessmentData {
  title?: string;
  description?: string;
  style?: AssessmentStyle;
  questionSelection?: Partial<QuestionSelectionInput>;
  timing?: Partial<TimingInput>;
  attempts?: Partial<AttemptsInput>;
  scoring?: Partial<ScoringInput>;
  feedback?: Partial<FeedbackInput>;
}

interface ListAssessmentsFilters {
  departmentId?: string;
  style?: AssessmentStyle;
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class AssessmentsService {
  /**
   * List assessments with filters and pagination
   */
  static async listAssessments(
    filters: ListAssessmentsFilters,
    userRole: string,
    userDepartments: string[]
  ): Promise<{ assessments: any[]; pagination: PaginationResult }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { isArchived: false };

    // Department filter - global admins see all, staff see their departments
    if (userRole !== 'admin') {
      if (filters.departmentId) {
        // Verify user has access to requested department
        if (!userDepartments.includes(filters.departmentId)) {
          throw ApiError.forbidden('Insufficient permissions or access to this department');
        }
        query.departmentId = new mongoose.Types.ObjectId(filters.departmentId);
      } else {
        // Filter by user's departments
        query.departmentId = { $in: userDepartments.map(id => new mongoose.Types.ObjectId(id)) };
      }
    } else if (filters.departmentId) {
      query.departmentId = new mongoose.Types.ObjectId(filters.departmentId);
    }

    // Style filter
    if (filters.style) {
      query.style = filters.style;
    }

    // Published filter
    if (filters.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }

    // Parse sort
    const sortField = filters.sort || '-createdAt';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [assessments, total] = await Promise.all([
      Assessment.find(query).sort(sortObj).skip(skip).limit(limit),
      Assessment.countDocuments(query)
    ]);

    // Format response
    const assessmentsData = assessments.map(assessment => this.formatAssessmentResponse(assessment));

    return {
      assessments: assessmentsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get a single assessment by ID with question count
   */
  static async getAssessment(
    assessmentId: string,
    userRole: string,
    userDepartments: string[]
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      throw ApiError.notFound('Assessment not found');
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    // Check department access
    if (userRole !== 'admin') {
      if (!userDepartments.includes(assessment.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this department');
      }
    }

    return this.formatAssessmentResponse(assessment, true);
  }

  /**
   * Create a new assessment
   */
  static async createAssessment(
    data: CreateAssessmentData,
    createdBy: string
  ): Promise<any> {
    // Validate department exists
    const department = await Department.findById(data.departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Validate question banks exist
    const questionBankIds = data.questionSelection.questionBankIds;
    const questionBanks = await QuestionBank.find({
      _id: { $in: questionBankIds.map(id => new mongoose.Types.ObjectId(id)) },
      isActive: true
    });

    if (questionBanks.length !== questionBankIds.length) {
      throw ApiError.badRequest('One or more question banks not found');
    }

    // Get total available questions
    const allQuestionIds = new Set<string>();
    for (const bank of questionBanks) {
      for (const qId of bank.questionIds) {
        allQuestionIds.add(qId.toString());
      }
    }

    // Apply filters to count available questions
    const questionQuery: any = {
      _id: { $in: Array.from(allQuestionIds).map(id => new mongoose.Types.ObjectId(id)) },
      isActive: true
    };

    if (data.questionSelection.filterByTags && data.questionSelection.filterByTags.length > 0) {
      questionQuery.tags = { $in: data.questionSelection.filterByTags };
    }

    if (data.questionSelection.filterByDifficulty && data.questionSelection.filterByDifficulty.length > 0) {
      // Map Assessment difficulty to Question difficulty
      const mappedDifficulties = data.questionSelection.filterByDifficulty.map(d => {
        if (['easy', 'medium', 'hard'].includes(d)) return d;
        switch (d) {
          case 'beginner': return 'easy';
          case 'intermediate': return 'medium';
          case 'advanced': return 'hard';
          default: return d;
        }
      });
      questionQuery.difficulty = { $in: mappedDifficulties };
    }

    const availableQuestionCount = await Question.countDocuments(questionQuery);

    if (data.questionSelection.questionCount > availableQuestionCount) {
      throw ApiError.badRequest('Question count exceeds available questions');
    }

    // Create assessment with defaults
    const assessmentDoc: any = {
      departmentId: new mongoose.Types.ObjectId(data.departmentId),
      title: data.title,
      description: data.description,
      style: data.style,
      questionSelection: {
        questionBankIds: data.questionSelection.questionBankIds,
        questionCount: data.questionSelection.questionCount,
        selectionMode: data.questionSelection.selectionMode,
        filterByTags: data.questionSelection.filterByTags,
        filterByDifficulty: data.questionSelection.filterByDifficulty
      },
      timing: data.timing || {
        showTimer: false,
        autoSubmitOnExpiry: false
      },
      attempts: data.attempts || {
        maxAttempts: null,
        retakePolicy: 'anytime'
      },
      scoring: data.scoring || {
        passingScore: 70,
        showScore: true,
        showCorrectAnswers: 'after_submit',
        partialCredit: false
      },
      feedback: data.feedback || {
        showFeedback: true,
        feedbackTiming: 'after_submit',
        showExplanations: true
      },
      isPublished: false,
      isArchived: false,
      createdBy: new mongoose.Types.ObjectId(createdBy)
    };

    const assessment = await Assessment.create(assessmentDoc);

    return this.formatAssessmentResponse(assessment);
  }

  /**
   * Update an assessment
   */
  static async updateAssessment(
    assessmentId: string,
    data: UpdateAssessmentData,
    userRole: string,
    userDepartments: string[]
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      throw ApiError.notFound('Assessment not found');
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    // Check department access
    if (userRole !== 'admin') {
      if (!userDepartments.includes(assessment.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this department');
      }
    }

    // Prevent changing style on published assessments
    if (data.style && data.style !== assessment.style && assessment.isPublished) {
      throw ApiError.badRequest('Cannot change style of a published assessment');
    }

    // Update fields
    if (data.title !== undefined) assessment.title = data.title;
    if (data.description !== undefined) assessment.description = data.description;
    if (data.style !== undefined) assessment.style = data.style;

    // Update nested objects
    if (data.questionSelection) {
      assessment.questionSelection = {
        ...assessment.questionSelection,
        ...data.questionSelection
      } as any;
    }

    if (data.timing) {
      assessment.timing = {
        ...assessment.timing,
        ...data.timing
      } as any;
    }

    if (data.attempts) {
      assessment.attempts = {
        ...assessment.attempts,
        ...data.attempts
      } as any;
    }

    if (data.scoring) {
      assessment.scoring = {
        ...assessment.scoring,
        ...data.scoring
      } as any;
    }

    if (data.feedback) {
      assessment.feedback = {
        ...assessment.feedback,
        ...data.feedback
      } as any;
    }

    await assessment.save();

    return this.formatAssessmentResponse(assessment);
  }

  /**
   * Delete an assessment (soft delete via archive)
   */
  static async deleteAssessment(
    assessmentId: string,
    userRole: string,
    userDepartments: string[]
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      throw ApiError.notFound('Assessment not found');
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    // Check department access
    if (userRole !== 'admin') {
      if (!userDepartments.includes(assessment.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this department');
      }
    }

    // Prevent deleting published assessments
    if (assessment.isPublished) {
      throw ApiError.badRequest('Cannot delete a published assessment');
    }

    // Soft delete by archiving
    assessment.isArchived = true;
    await assessment.save();
  }

  /**
   * Publish an assessment
   */
  static async publishAssessment(
    assessmentId: string,
    userRole: string,
    userDepartments: string[]
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      throw ApiError.notFound('Assessment not found');
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    // Check department access
    if (userRole !== 'admin') {
      if (!userDepartments.includes(assessment.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this department');
      }
    }

    // Check if already published
    if (assessment.isPublished) {
      throw ApiError.badRequest('Assessment is already published');
    }

    // Check if archived
    if (assessment.isArchived) {
      throw ApiError.badRequest('Cannot publish an archived assessment');
    }

    assessment.isPublished = true;
    await assessment.save();

    return this.formatAssessmentResponse(assessment);
  }

  /**
   * Archive an assessment
   */
  static async archiveAssessment(
    assessmentId: string,
    userRole: string,
    userDepartments: string[]
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      throw ApiError.notFound('Assessment not found');
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    // Check department access
    if (userRole !== 'admin') {
      if (!userDepartments.includes(assessment.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this department');
      }
    }

    // Check if already archived
    if (assessment.isArchived) {
      throw ApiError.badRequest('Assessment is already archived');
    }

    assessment.isArchived = true;
    assessment.isPublished = false;
    await assessment.save();

    return this.formatAssessmentResponse(assessment);
  }

  /**
   * Get questions for an assessment based on selection rules
   */
  static async getQuestionsForAssessment(assessmentId: string): Promise<any[]> {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      throw ApiError.notFound('Assessment not found');
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    const { questionSelection } = assessment;

    // Get all question IDs from the question banks
    const questionBanks = await QuestionBank.find({
      _id: { $in: questionSelection.questionBankIds.map(id => new mongoose.Types.ObjectId(id)) },
      isActive: true
    });

    const allQuestionIds = new Set<string>();
    for (const bank of questionBanks) {
      for (const qId of bank.questionIds) {
        allQuestionIds.add(qId.toString());
      }
    }

    // Build query for questions
    const questionQuery: any = {
      _id: { $in: Array.from(allQuestionIds).map(id => new mongoose.Types.ObjectId(id)) },
      isActive: true
    };

    // Apply tag filter
    if (questionSelection.filterByTags && questionSelection.filterByTags.length > 0) {
      questionQuery.tags = { $in: questionSelection.filterByTags };
    }

    // Apply difficulty filter
    // Map Assessment difficulty (beginner/intermediate/advanced) to Question difficulty (easy/medium/hard)
    if (questionSelection.filterByDifficulty && questionSelection.filterByDifficulty.length > 0) {
      const mappedDifficulties = questionSelection.filterByDifficulty.map(d => {
        // If the value is already in Question format, use as-is
        if (['easy', 'medium', 'hard'].includes(d)) {
          return d;
        }
        // Map Assessment format to Question format
        switch (d) {
          case 'beginner': return 'easy';
          case 'intermediate': return 'medium';
          case 'advanced': return 'hard';
          default: return d;
        }
      });
      questionQuery.difficulty = { $in: mappedDifficulties };
    }

    // Fetch questions based on selection mode
    let questions: any[];

    if (questionSelection.selectionMode === 'sequential') {
      // Sequential: return first N questions in order
      questions = await Question.find(questionQuery)
        .limit(questionSelection.questionCount);
    } else if (questionSelection.selectionMode === 'random') {
      // Random: use aggregation with $sample
      questions = await Question.aggregate([
        { $match: questionQuery },
        { $sample: { size: questionSelection.questionCount } }
      ]);
    } else if (questionSelection.selectionMode === 'weighted') {
      // Weighted: prioritize by difficulty (for now, treat like random)
      // TODO: Implement proper weighted selection based on difficulty distribution
      questions = await Question.aggregate([
        { $match: questionQuery },
        { $sample: { size: questionSelection.questionCount } }
      ]);
    } else {
      questions = await Question.find(questionQuery)
        .limit(questionSelection.questionCount);
    }

    // Format questions for response
    return questions.map(q => ({
      id: q._id.toString(),
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      points: q.points,
      difficulty: q.difficulty,
      tags: q.tags || [],
      explanation: q.explanation
    }));
  }

  /**
   * Format assessment response
   */
  private static formatAssessmentResponse(assessment: IAssessment, includeQuestionCount = false): any {
    const response: any = {
      id: assessment._id.toString(),
      departmentId: assessment.departmentId.toString(),
      title: assessment.title,
      description: assessment.description,
      style: assessment.style,
      questionSelection: {
        questionBankIds: assessment.questionSelection.questionBankIds,
        questionCount: assessment.questionSelection.questionCount,
        selectionMode: assessment.questionSelection.selectionMode,
        filterByTags: assessment.questionSelection.filterByTags,
        filterByDifficulty: assessment.questionSelection.filterByDifficulty
      },
      timing: {
        timeLimit: assessment.timing.timeLimit,
        showTimer: assessment.timing.showTimer,
        autoSubmitOnExpiry: assessment.timing.autoSubmitOnExpiry
      },
      attempts: {
        maxAttempts: assessment.attempts.maxAttempts,
        cooldownMinutes: assessment.attempts.cooldownMinutes,
        retakePolicy: assessment.attempts.retakePolicy
      },
      scoring: {
        passingScore: assessment.scoring.passingScore,
        showScore: assessment.scoring.showScore,
        showCorrectAnswers: assessment.scoring.showCorrectAnswers,
        partialCredit: assessment.scoring.partialCredit
      },
      feedback: {
        showFeedback: assessment.feedback.showFeedback,
        feedbackTiming: assessment.feedback.feedbackTiming,
        showExplanations: assessment.feedback.showExplanations
      },
      isPublished: assessment.isPublished,
      isArchived: assessment.isArchived,
      createdBy: assessment.createdBy.toString(),
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt
    };

    if (includeQuestionCount) {
      response.questionCount = assessment.questionSelection.questionCount;
    }

    return response;
  }
}
