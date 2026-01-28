import mongoose from 'mongoose';
import LearningUnitQuestion from '@/models/content/LearningUnitQuestion.model';
import LearningUnit, { ILearningUnit } from '@/models/content/LearningUnit.model';
import Question from '@/models/assessment/Question.model';
import Module from '@/models/academic/Module.model';
import Course from '@/models/academic/Course.model';
import Setting from '@/models/system/Setting.model';
import { ApiError } from '@/utils/ApiError';

// Types that support questions (exercise/assessment)
const QUESTION_SUPPORTING_TYPES = ['exercise', 'assessment'];

// Default bulk operation limit
const DEFAULT_BULK_LIMIT = 500;

interface LinkQuestionDto {
  questionId: string;
  sequence?: number;
  pointsOverride?: number | null;
}

interface BulkLinkDto {
  questions: LinkQuestionDto[];
  replaceExisting?: boolean;
}

interface UpdateLinkDto {
  sequence?: number;
  pointsOverride?: number | null;
}

interface LinkedQuestionResult {
  id: string;
  questionId: string;
  learningUnitId: string;
  sequence: number;
  pointsOverride: number | null;
  question?: {
    id: string;
    types: string[];
    text: string;
    difficulty: string;
    points: number;
    tags: string[];
    options: any[] | null;
  };
}

interface ListLinkedResult {
  learningUnitId: string;
  learningUnitTitle: string;
  questions: LinkedQuestionResult[];
  totalQuestions: number;
  totalPoints: number;
}

interface BulkLinkResult {
  linked: number;
  skipped: number;
  removed: number;
  links: Array<{
    questionId: string;
    linkId: string;
    sequence: number;
  }>;
}

export class LearningUnitQuestionsService {
  /**
   * List questions linked to a learning unit
   */
  static async listLinked(learningUnitId: string): Promise<ListLinkedResult> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.notFound('Learning unit not found');
    }

    // Verify learning unit exists
    const learningUnit = await LearningUnit.findById(learningUnitId);
    if (!learningUnit) {
      throw ApiError.notFound('Learning unit not found');
    }

    // Get all LearningUnitQuestion records for this unit, ordered by sequence
    const links = await LearningUnitQuestion.find({ learningUnitId: new mongoose.Types.ObjectId(learningUnitId) })
      .sort({ sequence: 1 })
      .lean();

    // Get question IDs
    const questionIds = links.map(link => link.questionId);

    // Fetch question details
    const questions = await Question.find({
      _id: { $in: questionIds },
      isActive: true
    }).lean();

    // Create a map for quick lookup
    const questionMap = new Map<string, typeof questions[0]>();
    for (const question of questions) {
      questionMap.set(question._id.toString(), question);
    }

    // Calculate totalPoints and format questions
    let totalPoints = 0;
    const formattedQuestions: LinkedQuestionResult[] = links.map(link => {
      const question = questionMap.get(link.questionId.toString());
      const points = link.pointsOverride !== null ? link.pointsOverride : (question?.points || 0);
      totalPoints += points;

      return {
        id: link._id.toString(),
        questionId: link.questionId.toString(),
        learningUnitId: link.learningUnitId.toString(),
        sequence: link.sequence,
        pointsOverride: link.pointsOverride,
        question: question ? {
          id: question._id.toString(),
          types: question.questionTypes || [],
          text: question.questionText,
          difficulty: question.difficulty || 'medium',
          points: question.points,
          tags: question.tags || [],
          options: question.options || null
        } : undefined
      };
    });

    return {
      learningUnitId: learningUnit._id.toString(),
      learningUnitTitle: learningUnit.title,
      questions: formattedQuestions,
      totalQuestions: formattedQuestions.length,
      totalPoints
    };
  }

  /**
   * Link a single question to a learning unit
   */
  static async linkQuestion(learningUnitId: string, data: LinkQuestionDto): Promise<LinkedQuestionResult> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.notFound('Learning unit not found');
    }
    if (!mongoose.Types.ObjectId.isValid(data.questionId)) {
      throw ApiError.notFound('Question not found');
    }

    // Verify learning unit exists and type supports questions
    const learningUnit = await this.validateLearningUnitType(learningUnitId);

    // Get the department for the learning unit (via module -> course)
    const learningUnitDepartmentId = await this.getLearningUnitDepartment(learningUnit);

    // Verify question exists
    const question = await Question.findById(data.questionId);
    if (!question || !question.isActive) {
      throw ApiError.notFound('Question not found');
    }

    // Verify question is in the same department as learning unit's course
    if (learningUnitDepartmentId && question.departmentId) {
      if (learningUnitDepartmentId.toString() !== question.departmentId.toString()) {
        throw ApiError.badRequest('Question must be from the same department as the learning unit\'s course');
      }
    }

    // Check if already linked (unique constraint will catch this too, but give better error)
    const existingLink = await LearningUnitQuestion.findOne({
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
      questionId: new mongoose.Types.ObjectId(data.questionId)
    });

    if (existingLink) {
      throw ApiError.badRequest('Question already linked to this learning unit');
    }

    // Auto-assign sequence if not provided (max + 1)
    let sequence = data.sequence;
    if (sequence === undefined) {
      const maxSequenceDoc = await LearningUnitQuestion.findOne({
        learningUnitId: new mongoose.Types.ObjectId(learningUnitId)
      }).sort({ sequence: -1 }).select('sequence').lean();

      sequence = maxSequenceDoc ? maxSequenceDoc.sequence + 1 : 0;
    }

    // Create LearningUnitQuestion record
    const link = await LearningUnitQuestion.create({
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
      questionId: new mongoose.Types.ObjectId(data.questionId),
      bankId: question.questionBankIds?.length > 0 ? new mongoose.Types.ObjectId(question.questionBankIds[0]) : undefined,
      sequence,
      pointsOverride: data.pointsOverride ?? null
    });

    return {
      id: link._id.toString(),
      questionId: link.questionId.toString(),
      learningUnitId: link.learningUnitId.toString(),
      sequence: link.sequence,
      pointsOverride: link.pointsOverride
    };
  }

  /**
   * Bulk link questions
   */
  static async bulkLink(learningUnitId: string, data: BulkLinkDto): Promise<BulkLinkResult> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.notFound('Learning unit not found');
    }

    // Check questions array
    if (!data.questions || data.questions.length === 0) {
      throw ApiError.badRequest('Questions array cannot be empty');
    }

    // Check bulk limit from settings
    const bulkLimit = await this.getBulkLimit();
    if (data.questions.length > bulkLimit) {
      throw ApiError.badRequest(`Bulk operation limit is ${bulkLimit} questions`);
    }

    // Verify learning unit exists and type supports questions
    const learningUnit = await this.validateLearningUnitType(learningUnitId);

    // Get the department for the learning unit
    const learningUnitDepartmentId = await this.getLearningUnitDepartment(learningUnit);

    let removed = 0;

    // If replaceExisting, delete all existing links first
    if (data.replaceExisting) {
      const deleteResult = await LearningUnitQuestion.deleteMany({
        learningUnitId: new mongoose.Types.ObjectId(learningUnitId)
      });
      removed = deleteResult.deletedCount;
    }

    // Get existing links (if not replacing)
    const existingLinks = data.replaceExisting ? [] : await LearningUnitQuestion.find({
      learningUnitId: new mongoose.Types.ObjectId(learningUnitId)
    }).select('questionId').lean();

    const existingQuestionIds = new Set(existingLinks.map(link => link.questionId.toString()));

    // Get max sequence for auto-assignment
    let currentMaxSequence = 0;
    if (!data.replaceExisting) {
      const maxSequenceDoc = await LearningUnitQuestion.findOne({
        learningUnitId: new mongoose.Types.ObjectId(learningUnitId)
      }).sort({ sequence: -1 }).select('sequence').lean();

      currentMaxSequence = maxSequenceDoc ? maxSequenceDoc.sequence : -1;
    }

    // Validate all questions exist and are in the same department
    const questionIds = data.questions.map(q => q.questionId);
    const questions = await Question.find({
      _id: { $in: questionIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id)) },
      isActive: true
    }).lean();

    const questionMap = new Map<string, any>();
    for (const question of questions) {
      questionMap.set(question._id.toString(), question);
    }

    // Process each question
    let linked = 0;
    let skipped = 0;
    const links: Array<{ questionId: string; linkId: string; sequence: number }> = [];

    for (let i = 0; i < data.questions.length; i++) {
      const questionData = data.questions[i];

      // Skip if already linked (unless replaceExisting)
      if (!data.replaceExisting && existingQuestionIds.has(questionData.questionId)) {
        skipped++;
        continue;
      }

      // Validate question exists
      const question = questionMap.get(questionData.questionId);
      if (!question) {
        skipped++;
        continue;
      }

      // Validate same department
      if (learningUnitDepartmentId && question.departmentId) {
        if (learningUnitDepartmentId.toString() !== question.departmentId.toString()) {
          skipped++;
          continue;
        }
      }

      // Determine sequence
      const sequence = questionData.sequence !== undefined ? questionData.sequence : ++currentMaxSequence;

      try {
        // Create link
        const link = await LearningUnitQuestion.create({
          learningUnitId: new mongoose.Types.ObjectId(learningUnitId),
          questionId: new mongoose.Types.ObjectId(questionData.questionId),
          bankId: question.questionBankIds?.length > 0 ? new mongoose.Types.ObjectId(question.questionBankIds[0]) : undefined,
          sequence,
          pointsOverride: questionData.pointsOverride ?? null
        });

        links.push({
          questionId: questionData.questionId,
          linkId: link._id.toString(),
          sequence: link.sequence
        });
        linked++;
      } catch (error: any) {
        // Skip on duplicate key error (race condition)
        if (error.code === 11000) {
          skipped++;
        } else {
          throw error;
        }
      }
    }

    return {
      linked,
      skipped,
      removed,
      links
    };
  }

  /**
   * Update a question link
   */
  static async updateLink(learningUnitId: string, linkId: string, data: UpdateLinkDto): Promise<LinkedQuestionResult> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.notFound('Learning unit not found');
    }
    if (!mongoose.Types.ObjectId.isValid(linkId)) {
      throw ApiError.notFound('Link not found');
    }

    // Find link by ID, verify learningUnitId matches
    const link = await LearningUnitQuestion.findById(linkId);
    if (!link) {
      throw ApiError.notFound('Link not found');
    }

    if (link.learningUnitId.toString() !== learningUnitId) {
      throw ApiError.notFound('Link not found');
    }

    // Update sequence and/or pointsOverride
    if (data.sequence !== undefined) {
      link.sequence = data.sequence;
    }

    if (data.pointsOverride !== undefined) {
      link.pointsOverride = data.pointsOverride;
    }

    await link.save();

    return {
      id: link._id.toString(),
      questionId: link.questionId.toString(),
      learningUnitId: link.learningUnitId.toString(),
      sequence: link.sequence,
      pointsOverride: link.pointsOverride
    };
  }

  /**
   * Unlink a question
   */
  static async unlinkQuestion(learningUnitId: string, linkId: string): Promise<void> {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.notFound('Learning unit not found');
    }
    if (!mongoose.Types.ObjectId.isValid(linkId)) {
      throw ApiError.notFound('Link not found');
    }

    // Find link by ID, verify learningUnitId matches
    const link = await LearningUnitQuestion.findById(linkId);
    if (!link) {
      throw ApiError.notFound('Link not found');
    }

    if (link.learningUnitId.toString() !== learningUnitId) {
      throw ApiError.notFound('Link not found');
    }

    // Delete link record
    await LearningUnitQuestion.deleteOne({ _id: link._id });
  }

  /**
   * Validate learning unit type supports questions
   */
  static async validateLearningUnitType(learningUnitId: string): Promise<ILearningUnit> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(learningUnitId)) {
      throw ApiError.notFound('Learning unit not found');
    }

    // Get learning unit
    const learningUnit = await LearningUnit.findById(learningUnitId);
    if (!learningUnit) {
      throw ApiError.notFound('Learning unit not found');
    }

    // Check type is 'exercise' or 'assessment'
    if (!QUESTION_SUPPORTING_TYPES.includes(learningUnit.type)) {
      throw ApiError.badRequest(`Learning unit type '${learningUnit.type}' does not support questions. Only 'exercise' and 'assessment' types support questions.`);
    }

    return learningUnit;
  }

  /**
   * Get bulk operation limit from settings
   */
  static async getBulkLimit(): Promise<number> {
    try {
      // Read from Setting where category='question'
      const setting = await Setting.findOne({
        category: 'question',
        key: 'bulkOperations.maxItems'
      });

      if (setting && typeof setting.value === 'number') {
        return setting.value;
      }

      // Also check for nested object structure
      const bulkSetting = await Setting.findOne({
        category: 'question',
        key: 'bulkOperations'
      });

      if (bulkSetting && bulkSetting.value && typeof bulkSetting.value.maxItems === 'number') {
        return bulkSetting.value.maxItems;
      }

      return DEFAULT_BULK_LIMIT;
    } catch {
      return DEFAULT_BULK_LIMIT;
    }
  }

  /**
   * Get the department ID for a learning unit by traversing module -> course
   */
  private static async getLearningUnitDepartment(learningUnit: ILearningUnit): Promise<mongoose.Types.ObjectId | null> {
    if (!learningUnit.moduleId) {
      return null;
    }

    // Get the module
    const module = await Module.findById(learningUnit.moduleId).select('courseId').lean();
    if (!module || !module.courseId) {
      return null;
    }

    // Get the course
    const course = await Course.findById(module.courseId).select('departmentId').lean();
    if (!course || !course.departmentId) {
      return null;
    }

    return course.departmentId as mongoose.Types.ObjectId;
  }
}
