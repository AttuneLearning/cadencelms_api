import mongoose from 'mongoose';
import Question, {
  IQuestion,
  QuestionType,
  DifficultyLevel,
  IQuestionHierarchy
} from '@/models/assessment/Question.model';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import LearningUnitQuestion from '@/models/content/LearningUnitQuestion.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import Setting from '@/models/system/Setting.model';
import { ApiError } from '@/utils/ApiError';

// Question types (snake_case)
const VALID_QUESTION_TYPES: QuestionType[] = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'short_answer',
  'long_answer',
  'matching',
  'flashcard',
  'fill_in_blank'
];

// Interfaces for request data
interface ListFilters {
  type?: string;
  difficulty?: DifficultyLevel;
  tags?: string;
  bankId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

interface OptionInput {
  id?: string;
  text: string;
  isCorrect: boolean;
}

interface PairInput {
  left: string;
  right: string;
}

interface CardInput {
  front: string;
  back: string;
  hint?: string;
}

interface BlankInput {
  position: number;
  acceptedAnswers: string[];
  matchThreshold?: number;
}

interface HierarchyInput {
  parentQuestionId?: string;
  relatedQuestionIds?: string[];
  prerequisiteQuestionIds?: string[];
  conceptTag?: string;
  difficultyProgression?: number;
}

interface CreateQuestionDto {
  questionBankIds?: string[];
  types?: QuestionType[];  // New array format
  type?: QuestionType;     // Legacy single type (backward compatible)
  text: string;
  difficulty?: DifficultyLevel;
  tags?: string[];
  points: number;
  explanation?: string;
  // Type-specific fields
  options?: OptionInput[];
  acceptedAnswers?: string[];
  matchThreshold?: number;
  sampleAnswer?: string;
  rubric?: string;
  pairs?: PairInput[];
  cards?: CardInput[];
  blanks?: BlankInput[];
  hierarchy?: HierarchyInput;
}

interface UpdateQuestionDto {
  questionBankIds?: string[];
  types?: QuestionType[];  // New array format
  type?: QuestionType;     // Legacy single type (backward compatible)
  text?: string;
  difficulty?: DifficultyLevel;
  tags?: string[];
  points?: number;
  explanation?: string;
  // Type-specific fields
  options?: OptionInput[];
  acceptedAnswers?: string[];
  matchThreshold?: number;
  sampleAnswer?: string;
  rubric?: string;
  pairs?: PairInput[];
  cards?: CardInput[];
  blanks?: BlankInput[];
  hierarchy?: HierarchyInput;
}

interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface DependencyInfo {
  learningUnitId: string;
  title: string;
}

interface DependencyCheckResult {
  hasDependencies: boolean;
  dependencies: DependencyInfo[];
}

export class DepartmentQuestionsService {
  /**
   * List questions in a department with filtering
   */
  static async list(
    departmentId: string,
    filters: ListFilters
  ): Promise<{ questions: any[]; pagination: PaginationResult }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    };

    // Type filter
    if (filters.type) {
      if (!VALID_QUESTION_TYPES.includes(filters.type as QuestionType)) {
        throw ApiError.badRequest(`Invalid question type: ${filters.type}`);
      }
      query.questionTypes = filters.type;
    }

    // Difficulty filter
    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }

    // Tags filter (comma-separated)
    if (filters.tags) {
      const tagList = filters.tags.split(',').map(t => t.trim().toLowerCase());
      query.tags = { $in: tagList };
    }

    // Bank filter
    if (filters.bankId) {
      if (!mongoose.Types.ObjectId.isValid(filters.bankId)) {
        throw ApiError.badRequest('Invalid bankId');
      }
      query.questionBankIds = filters.bankId;
    }

    // Search filter
    if (filters.search) {
      query.questionText = { $regex: filters.search, $options: 'i' };
    }

    // Parse sort
    const sortField = filters.sort || '-createdAt';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [questions, total] = await Promise.all([
      Question.find(query).sort(sortObj).skip(skip).limit(limit),
      Question.countDocuments(query)
    ]);

    // Get all unique bank IDs to populate bank names
    const allBankIds = new Set<string>();
    for (const question of questions) {
      for (const bankId of question.questionBankIds || []) {
        allBankIds.add(bankId);
      }
    }

    // Fetch bank names
    const bankMap = new Map<string, string>();
    if (allBankIds.size > 0) {
      const banks = await QuestionBank.find({
        _id: { $in: Array.from(allBankIds).map(id => new mongoose.Types.ObjectId(id)) }
      }).select('_id name');
      for (const bank of banks) {
        bankMap.set(bank._id.toString(), bank.name);
      }
    }

    // Get usage counts for all questions
    const questionIds = questions.map(q => q._id);
    const usageCounts = await LearningUnitQuestion.aggregate([
      { $match: { questionId: { $in: questionIds } } },
      { $group: { _id: '$questionId', count: { $sum: 1 } } }
    ]);
    const usageMap = new Map<string, number>();
    for (const item of usageCounts) {
      usageMap.set(item._id.toString(), item.count);
    }

    // Format response
    const questionsData = questions.map(question => this.formatQuestionResponse(question, bankMap, usageMap));

    return {
      questions: questionsData,
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
   * Create a question in a department
   */
  static async create(
    departmentId: string,
    data: CreateQuestionDto,
    userId: string
  ): Promise<any> {
    // Support both 'type' (legacy) and 'types' (new array format)
    const types: QuestionType[] = (data.types || (data.type ? [data.type] : [])) as QuestionType[];

    if (!types || types.length === 0) {
      throw ApiError.badRequest('At least one question type is required');
    }

    // Validate each question type
    for (const type of types) {
      if (!VALID_QUESTION_TYPES.includes(type)) {
        throw ApiError.badRequest(`Invalid question type: ${type}`);
      }
    }

    // Validate type-specific fields for each type
    for (const type of types) {
      this.validateQuestionType(type, data);
    }

    // If questionBankIds provided, verify banks exist in same department
    if (data.questionBankIds && data.questionBankIds.length > 0) {
      const banks = await QuestionBank.find({
        _id: { $in: data.questionBankIds.map(id => new mongoose.Types.ObjectId(id)) },
        departmentId: new mongoose.Types.ObjectId(departmentId),
        isActive: true
      });

      if (banks.length !== data.questionBankIds.length) {
        throw ApiError.notFound('One or more question banks not found in this department');
      }
    }

    // Get default matchThreshold for short_answer if not provided
    let matchThreshold = data.matchThreshold;
    if (types.includes('short_answer') && matchThreshold === undefined) {
      matchThreshold = await this.getDefaultMatchThreshold();
    }

    // Validate hierarchy if provided
    if (data.hierarchy) {
      await this.validateHierarchy(departmentId, data.hierarchy);
    }

    // Build question document
    const questionDoc: any = {
      questionText: data.text,
      questionTypes: types,
      departmentId: new mongoose.Types.ObjectId(departmentId),
      points: data.points,
      difficulty: data.difficulty || 'medium',
      tags: data.tags?.map(tag => tag.toLowerCase()) || [],
      explanation: data.explanation || null,
      isActive: true,
      questionBankIds: data.questionBankIds || [],
      metadata: {
        createdBy: userId
      }
    };

    // Handle type-specific fields for all types
    for (const type of types) {
      this.applyTypeSpecificFields(questionDoc, type, data, matchThreshold);
    }

    // Handle hierarchy
    if (data.hierarchy) {
      questionDoc.hierarchy = this.buildHierarchyDocument(data.hierarchy);
    }

    // Create question
    const question = await Question.create(questionDoc);

    // Also add question to bank's questionIds if questionBankIds provided
    if (data.questionBankIds && data.questionBankIds.length > 0) {
      await QuestionBank.updateMany(
        { _id: { $in: data.questionBankIds.map(id => new mongoose.Types.ObjectId(id)) } },
        { $addToSet: { questionIds: question._id } }
      );
    }

    // Fetch bank names for response
    const bankMap = new Map<string, string>();
    if (data.questionBankIds && data.questionBankIds.length > 0) {
      const banks = await QuestionBank.find({
        _id: { $in: data.questionBankIds.map(id => new mongoose.Types.ObjectId(id)) }
      }).select('_id name');
      for (const bank of banks) {
        bankMap.set(bank._id.toString(), bank.name);
      }
    }

    return this.formatQuestionResponse(question, bankMap, new Map());
  }

  /**
   * Get question by ID
   */
  static async getById(departmentId: string, questionId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    const question = await Question.findOne({
      _id: new mongoose.Types.ObjectId(questionId),
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    });

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    // Fetch bank names
    const bankMap = new Map<string, string>();
    if (question.questionBankIds && question.questionBankIds.length > 0) {
      const banks = await QuestionBank.find({
        _id: { $in: question.questionBankIds.map(id => new mongoose.Types.ObjectId(id)) }
      }).select('_id name');
      for (const bank of banks) {
        bankMap.set(bank._id.toString(), bank.name);
      }
    }

    // Get usage count
    const usageCount = await LearningUnitQuestion.countDocuments({ questionId: question._id });
    const usageMap = new Map<string, number>();
    usageMap.set(question._id.toString(), usageCount);

    return this.formatQuestionResponse(question, bankMap, usageMap);
  }

  /**
   * Update a question
   */
  static async update(
    departmentId: string,
    questionId: string,
    data: UpdateQuestionDto
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    const question = await Question.findOne({
      _id: new mongoose.Types.ObjectId(questionId),
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    });

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    // Support both 'type' (legacy) and 'types' (new array format)
    const newTypes: QuestionType[] | undefined = (data.types || (data.type ? [data.type] : undefined)) as QuestionType[] | undefined;
    const effectiveTypes: QuestionType[] = newTypes || (question.questionTypes as QuestionType[]) || [];
    const effectiveType = effectiveTypes[0];

    // Validate types if changing
    if (newTypes) {
      for (const type of newTypes) {
        if (!VALID_QUESTION_TYPES.includes(type)) {
          throw ApiError.badRequest(`Invalid question type: ${type}`);
        }
      }
    }

    // Validate type-specific fields for all types
    if (newTypes || data.options || data.acceptedAnswers || data.pairs || data.cards || data.blanks) {
      // Validate each type
      for (const type of effectiveTypes) {
        const mergedData = this.mergeDataForValidation(question, data, type);
        this.validateQuestionType(type, mergedData);
      }
    }

    // Validate questionBankIds if provided
    if (data.questionBankIds !== undefined) {
      if (data.questionBankIds.length > 0) {
        const banks = await QuestionBank.find({
          _id: { $in: data.questionBankIds.map(id => new mongoose.Types.ObjectId(id)) },
          departmentId: new mongoose.Types.ObjectId(departmentId),
          isActive: true
        });

        if (banks.length !== data.questionBankIds.length) {
          throw ApiError.notFound('One or more question banks not found in this department');
        }
      }
    }

    // Validate hierarchy changes if provided
    if (data.hierarchy) {
      await this.validateHierarchy(departmentId, data.hierarchy, questionId);
    }

    // Track old bank IDs for sync
    const oldBankIds = [...(question.questionBankIds || [])];

    // Update basic fields
    if (data.text !== undefined) question.questionText = data.text;
    if (newTypes !== undefined) question.questionTypes = newTypes as any;
    if (data.points !== undefined) question.points = data.points;
    if (data.difficulty !== undefined) question.difficulty = data.difficulty;
    if (data.tags !== undefined) question.tags = data.tags.map(tag => tag.toLowerCase());
    if (data.explanation !== undefined) question.explanation = data.explanation;
    if (data.questionBankIds !== undefined) question.questionBankIds = data.questionBankIds;

    // Handle type-specific field updates
    this.applyTypeSpecificFieldUpdates(question, effectiveType, data);

    // Handle hierarchy
    if (data.hierarchy !== undefined) {
      question.hierarchy = this.buildHierarchyDocument(data.hierarchy);
    }

    await question.save();

    // Sync bank's questionIds if questionBankIds changed
    if (data.questionBankIds !== undefined) {
      const newBankIds = data.questionBankIds;

      // Remove from old banks that are no longer in the list
      const removedBankIds = oldBankIds.filter(id => !newBankIds.includes(id));
      if (removedBankIds.length > 0) {
        await QuestionBank.updateMany(
          { _id: { $in: removedBankIds.map(id => new mongoose.Types.ObjectId(id)) } },
          { $pull: { questionIds: question._id } }
        );
      }

      // Add to new banks
      const addedBankIds = newBankIds.filter(id => !oldBankIds.includes(id));
      if (addedBankIds.length > 0) {
        await QuestionBank.updateMany(
          { _id: { $in: addedBankIds.map(id => new mongoose.Types.ObjectId(id)) } },
          { $addToSet: { questionIds: question._id } }
        );
      }
    }

    // Fetch bank names for response
    const bankMap = new Map<string, string>();
    if (question.questionBankIds && question.questionBankIds.length > 0) {
      const banks = await QuestionBank.find({
        _id: { $in: question.questionBankIds.map(id => new mongoose.Types.ObjectId(id)) }
      }).select('_id name');
      for (const bank of banks) {
        bankMap.set(bank._id.toString(), bank.name);
      }
    }

    // Get usage count
    const usageCount = await LearningUnitQuestion.countDocuments({ questionId: question._id });
    const usageMap = new Map<string, number>();
    usageMap.set(question._id.toString(), usageCount);

    return this.formatQuestionResponse(question, bankMap, usageMap);
  }

  /**
   * Delete a question
   */
  static async delete(departmentId: string, questionId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    const question = await Question.findOne({
      _id: new mongoose.Types.ObjectId(questionId),
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    });

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    // Check for dependencies
    const dependencyCheck = await this.checkQuestionDependencies(questionId);

    if (dependencyCheck.hasDependencies) {
      const error = new ApiError(
        400,
        `Cannot delete question. It is linked to ${dependencyCheck.dependencies.length} learning unit(s).`,
        true,
        undefined,
        'QUESTION_HAS_DEPENDENCIES'
      );
      (error as any).dependencies = dependencyCheck.dependencies;
      throw error;
    }

    // Soft delete
    question.isActive = false;
    await question.save();

    // Remove from all banks
    if (question.questionBankIds && question.questionBankIds.length > 0) {
      await QuestionBank.updateMany(
        { _id: { $in: question.questionBankIds.map(id => new mongoose.Types.ObjectId(id)) } },
        { $pull: { questionIds: question._id } }
      );
    }
  }

  /**
   * Validate question data based on type
   */
  static validateQuestionType(type: QuestionType, data: any): void {
    switch (type) {
      case 'multiple_choice':
        this.validateMultipleChoice(data);
        break;
      case 'multiple_select':
        this.validateMultipleSelect(data);
        break;
      case 'true_false':
        this.validateTrueFalse(data);
        break;
      case 'short_answer':
        this.validateShortAnswer(data);
        break;
      case 'long_answer':
        // No required fields for long_answer
        break;
      case 'matching':
        this.validateMatching(data);
        break;
      case 'flashcard':
        this.validateFlashcard(data);
        break;
      case 'fill_in_blank':
        this.validateFillInBlank(data);
        break;
      default:
        throw ApiError.badRequest(`Unknown question type: ${type}`);
    }
  }

  /**
   * Check question dependencies
   */
  static async checkQuestionDependencies(questionId: string): Promise<DependencyCheckResult> {
    const links = await LearningUnitQuestion.find({
      questionId: new mongoose.Types.ObjectId(questionId)
    }).select('learningUnitId');

    if (links.length === 0) {
      return { hasDependencies: false, dependencies: [] };
    }

    // Get learning unit titles
    const learningUnitIds = links.map(l => l.learningUnitId);
    const learningUnits = await LearningUnit.find({
      _id: { $in: learningUnitIds }
    }).select('_id title');

    const dependencies: DependencyInfo[] = learningUnits.map(lu => ({
      learningUnitId: lu._id.toString(),
      title: lu.title
    }));

    return { hasDependencies: true, dependencies };
  }

  /**
   * Get default match threshold from settings
   */
  static async getDefaultMatchThreshold(): Promise<number> {
    const setting = await Setting.findOne({
      category: 'question',
      key: 'matchThreshold'
    });

    if (setting && setting.value && typeof setting.value.default === 'number') {
      return setting.value.default;
    }

    // Default fallback
    return 80;
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  /**
   * Validate multiple_choice question
   */
  private static validateMultipleChoice(data: any): void {
    if (!data.options || !Array.isArray(data.options) || data.options.length < 2) {
      throw ApiError.badRequest('multiple_choice questions require at least 2 options');
    }

    const correctOptions = data.options.filter((opt: OptionInput) => opt.isCorrect);
    if (correctOptions.length < 1) {
      throw ApiError.badRequest('multiple_choice questions must have at least 1 correct option');
    }
  }

  /**
   * Validate multiple_select question
   */
  private static validateMultipleSelect(data: any): void {
    if (!data.options || !Array.isArray(data.options) || data.options.length < 2) {
      throw ApiError.badRequest('multiple_select questions require at least 2 options');
    }

    const correctOptions = data.options.filter((opt: OptionInput) => opt.isCorrect);
    if (correctOptions.length < 1) {
      throw ApiError.badRequest('multiple_select questions must have at least 1 correct option');
    }
  }

  /**
   * Validate true_false question
   */
  private static validateTrueFalse(data: any): void {
    if (!data.options || !Array.isArray(data.options) || data.options.length !== 2) {
      throw ApiError.badRequest('true_false questions must have exactly 2 options');
    }

    const correctOptions = data.options.filter((opt: OptionInput) => opt.isCorrect);
    if (correctOptions.length !== 1) {
      throw ApiError.badRequest('true_false questions must have exactly 1 correct option');
    }
  }

  /**
   * Validate short_answer question
   */
  private static validateShortAnswer(data: any): void {
    if (!data.acceptedAnswers || !Array.isArray(data.acceptedAnswers) || data.acceptedAnswers.length < 1) {
      throw ApiError.badRequest('short_answer questions require at least 1 accepted answer');
    }
  }

  /**
   * Validate matching question
   */
  private static validateMatching(data: any): void {
    if (!data.pairs || !Array.isArray(data.pairs) || data.pairs.length < 2) {
      throw ApiError.badRequest('matching questions require at least 2 pairs');
    }

    for (const pair of data.pairs) {
      if (!pair.left || !pair.right) {
        throw ApiError.badRequest('Each matching pair must have both left and right values');
      }
    }
  }

  /**
   * Validate flashcard question
   */
  private static validateFlashcard(data: any): void {
    if (!data.cards || !Array.isArray(data.cards) || data.cards.length < 1) {
      throw ApiError.badRequest('flashcard questions require at least 1 card');
    }

    for (const card of data.cards) {
      if (!card.front || !card.back) {
        throw ApiError.badRequest('Each flashcard must have both front and back values');
      }
    }
  }

  /**
   * Validate fill_in_blank question
   */
  private static validateFillInBlank(data: any): void {
    if (!data.blanks || !Array.isArray(data.blanks) || data.blanks.length < 1) {
      throw ApiError.badRequest('fill_in_blank questions require at least 1 blank');
    }

    // Count placeholders in text if text is provided
    if (data.text) {
      const placeholderCount = (data.text.match(/\{\{blank\}\}/gi) || []).length;
      if (placeholderCount !== data.blanks.length) {
        throw ApiError.badRequest(
          `fill_in_blank question has ${placeholderCount} placeholder(s) but ${data.blanks.length} blank definition(s)`
        );
      }
    }

    for (const blank of data.blanks) {
      if (typeof blank.position !== 'number') {
        throw ApiError.badRequest('Each blank must have a position');
      }
      if (!blank.acceptedAnswers || !Array.isArray(blank.acceptedAnswers) || blank.acceptedAnswers.length < 1) {
        throw ApiError.badRequest('Each blank must have at least 1 accepted answer');
      }
    }
  }

  /**
   * Validate hierarchy for circular dependencies
   */
  private static async validateHierarchy(
    departmentId: string,
    hierarchy: HierarchyInput,
    currentQuestionId?: string
  ): Promise<void> {
    // Validate parentQuestionId exists in same department
    if (hierarchy.parentQuestionId) {
      if (!mongoose.Types.ObjectId.isValid(hierarchy.parentQuestionId)) {
        throw ApiError.badRequest('Invalid parentQuestionId');
      }

      // Cannot be own parent
      if (currentQuestionId && hierarchy.parentQuestionId === currentQuestionId) {
        throw ApiError.badRequest('A question cannot be its own parent');
      }

      const parent = await Question.findOne({
        _id: new mongoose.Types.ObjectId(hierarchy.parentQuestionId),
        departmentId: new mongoose.Types.ObjectId(departmentId),
        isActive: true
      });

      if (!parent) {
        throw ApiError.notFound('Parent question not found in this department');
      }
    }

    // Validate relatedQuestionIds exist in same department
    if (hierarchy.relatedQuestionIds && hierarchy.relatedQuestionIds.length > 0) {
      const validIds = hierarchy.relatedQuestionIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length !== hierarchy.relatedQuestionIds.length) {
        throw ApiError.badRequest('Invalid question ID in relatedQuestionIds');
      }

      const related = await Question.countDocuments({
        _id: { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) },
        departmentId: new mongoose.Types.ObjectId(departmentId),
        isActive: true
      });

      if (related !== validIds.length) {
        throw ApiError.notFound('One or more related questions not found in this department');
      }
    }

    // Validate prerequisiteQuestionIds exist in same department
    if (hierarchy.prerequisiteQuestionIds && hierarchy.prerequisiteQuestionIds.length > 0) {
      const validIds = hierarchy.prerequisiteQuestionIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length !== hierarchy.prerequisiteQuestionIds.length) {
        throw ApiError.badRequest('Invalid question ID in prerequisiteQuestionIds');
      }

      const prereqs = await Question.countDocuments({
        _id: { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) },
        departmentId: new mongoose.Types.ObjectId(departmentId),
        isActive: true
      });

      if (prereqs !== validIds.length) {
        throw ApiError.notFound('One or more prerequisite questions not found in this department');
      }
    }
  }

  /**
   * Build hierarchy document from input
   */
  private static buildHierarchyDocument(input: HierarchyInput): IQuestionHierarchy {
    const hierarchy: IQuestionHierarchy = {
      relatedQuestionIds: [],
      prerequisiteQuestionIds: []
    };

    if (input.parentQuestionId) {
      hierarchy.parentQuestionId = new mongoose.Types.ObjectId(input.parentQuestionId);
    }

    if (input.relatedQuestionIds && input.relatedQuestionIds.length > 0) {
      hierarchy.relatedQuestionIds = input.relatedQuestionIds.map(
        id => new mongoose.Types.ObjectId(id)
      );
    }

    if (input.prerequisiteQuestionIds && input.prerequisiteQuestionIds.length > 0) {
      hierarchy.prerequisiteQuestionIds = input.prerequisiteQuestionIds.map(
        id => new mongoose.Types.ObjectId(id)
      );
    }

    if (input.conceptTag) {
      hierarchy.conceptTag = input.conceptTag;
    }

    if (input.difficultyProgression !== undefined) {
      hierarchy.difficultyProgression = input.difficultyProgression;
    }

    return hierarchy;
  }

  /**
   * Apply type-specific fields to question document
   */
  private static applyTypeSpecificFields(
    doc: any,
    type: QuestionType,
    data: CreateQuestionDto,
    matchThreshold?: number
  ): void {
    switch (type) {
      case 'multiple_choice':
      case 'multiple_select':
      case 'true_false':
        if (data.options) {
          doc.options = data.options.map(opt => opt.text);
          const correctOptions = data.options.filter(opt => opt.isCorrect);
          const incorrectOptions = data.options.filter(opt => !opt.isCorrect);
          if (correctOptions.length === 1) {
            doc.correctAnswer = correctOptions[0].text;
          } else {
            doc.correctAnswers = correctOptions.map(opt => opt.text);
          }
          // Also store distractors explicitly
          doc.distractors = incorrectOptions.map(opt => opt.text);
        }
        break;

      case 'short_answer':
        if (data.acceptedAnswers) {
          doc.acceptedAnswers = data.acceptedAnswers;
        }
        if (matchThreshold !== undefined) {
          doc.matchThreshold = matchThreshold;
        }
        break;

      case 'long_answer':
        if (data.sampleAnswer) {
          doc.sampleAnswer = data.sampleAnswer;
        }
        if (data.rubric) {
          doc.rubric = data.rubric;
        }
        break;

      case 'matching':
        if (data.pairs) {
          const matchingPairs: Record<string, string> = {};
          for (const pair of data.pairs) {
            matchingPairs[pair.left] = pair.right;
          }
          doc.matchingPairs = matchingPairs;
        }
        break;

      case 'flashcard':
        if (data.cards) {
          doc.cards = data.cards.map(card => ({
            front: card.front,
            back: card.back,
            hint: card.hint
          }));
        }
        break;

      case 'fill_in_blank':
        if (data.blanks) {
          doc.blanks = data.blanks.map(blank => ({
            position: blank.position,
            acceptedAnswers: blank.acceptedAnswers,
            matchThreshold: blank.matchThreshold ?? matchThreshold ?? 80
          }));
        }
        break;
    }
  }

  /**
   * Apply type-specific field updates to question
   */
  private static applyTypeSpecificFieldUpdates(
    question: IQuestion,
    type: QuestionType,
    data: UpdateQuestionDto
  ): void {
    switch (type) {
      case 'multiple_choice':
      case 'multiple_select':
      case 'true_false':
        if (data.options !== undefined) {
          question.options = data.options.map(opt => opt.text);
          const correctOptions = data.options.filter(opt => opt.isCorrect);
          const incorrectOptions = data.options.filter(opt => !opt.isCorrect);
          if (correctOptions.length === 1) {
            question.correctAnswer = correctOptions[0].text;
            question.correctAnswers = undefined;
          } else {
            question.correctAnswers = correctOptions.map(opt => opt.text);
            question.correctAnswer = undefined;
          }
          // Also update distractors to keep in sync with options
          question.distractors = incorrectOptions.map(opt => opt.text);
        }
        break;

      case 'short_answer':
        if (data.acceptedAnswers !== undefined) {
          question.acceptedAnswers = data.acceptedAnswers;
        }
        if (data.matchThreshold !== undefined) {
          question.matchThreshold = data.matchThreshold;
        }
        break;

      case 'long_answer':
        if (data.sampleAnswer !== undefined) {
          question.sampleAnswer = data.sampleAnswer;
        }
        if (data.rubric !== undefined) {
          question.rubric = data.rubric;
        }
        break;

      case 'matching':
        if (data.pairs !== undefined) {
          const matchingPairs: Record<string, string> = {};
          for (const pair of data.pairs) {
            matchingPairs[pair.left] = pair.right;
          }
          question.matchingPairs = matchingPairs;
        }
        break;

      case 'flashcard':
        if (data.cards !== undefined) {
          question.cards = data.cards.map(card => ({
            front: card.front,
            back: card.back,
            hint: card.hint
          }));
        }
        break;

      case 'fill_in_blank':
        if (data.blanks !== undefined) {
          question.blanks = data.blanks.map(blank => ({
            position: blank.position,
            acceptedAnswers: blank.acceptedAnswers,
            matchThreshold: blank.matchThreshold ?? question.matchThreshold ?? 80
          }));
        }
        break;
    }
  }

  /**
   * Merge existing question data with update data for validation
   */
  private static mergeDataForValidation(
    question: IQuestion,
    data: UpdateQuestionDto,
    effectiveType: QuestionType
  ): any {
    const merged: any = {
      type: effectiveType,
      text: data.text ?? question.questionText
    };

    // Merge options
    if (data.options !== undefined) {
      merged.options = data.options;
    } else if (question.options && question.options.length > 0) {
      // Reconstruct options from question
      const correctAnswers = question.correctAnswers || (question.correctAnswer ? [question.correctAnswer] : []);
      merged.options = question.options.map(opt => ({
        text: opt,
        isCorrect: correctAnswers.includes(opt)
      }));
    }

    // Merge acceptedAnswers
    if (data.acceptedAnswers !== undefined) {
      merged.acceptedAnswers = data.acceptedAnswers;
    } else if (question.acceptedAnswers) {
      merged.acceptedAnswers = question.acceptedAnswers;
    }

    // Merge pairs
    if (data.pairs !== undefined) {
      merged.pairs = data.pairs;
    } else if (question.matchingPairs) {
      merged.pairs = Object.entries(question.matchingPairs).map(([left, right]) => ({
        left,
        right
      }));
    }

    // Merge cards
    if (data.cards !== undefined) {
      merged.cards = data.cards;
    } else if (question.cards) {
      merged.cards = question.cards;
    }

    // Merge blanks
    if (data.blanks !== undefined) {
      merged.blanks = data.blanks;
    } else if (question.blanks) {
      merged.blanks = question.blanks;
    }

    return merged;
  }

  /**
   * Format question for API response
   */
  private static formatQuestionResponse(
    question: IQuestion,
    bankMap: Map<string, string>,
    usageMap: Map<string, number>
  ): any {
    const response: any = {
      id: question._id.toString(),
      departmentId: question.departmentId.toString(),
      questionBankIds: question.questionBankIds || [],
      bankNames: (question.questionBankIds || []).map(id => bankMap.get(id) || null).filter(Boolean),
      questionTypes: question.questionTypes || [],
      text: question.questionText,
      difficulty: question.difficulty || 'medium',
      tags: question.tags || [],
      points: question.points,
      explanation: question.explanation || null,
      usageCount: usageMap.get(question._id.toString()) || 0,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt
    };

    // Add type-specific fields based on primary question type
    const primaryType = question.questionTypes?.[0];
    switch (primaryType) {
      case 'multiple_choice':
      case 'multiple_select':
      case 'true_false':
        // Build correctAnswers from various stored formats
        const correctAnswers: string[] = question.correctAnswers && question.correctAnswers.length > 0
          ? question.correctAnswers
          : question.correctAnswer
            ? [question.correctAnswer]
            : [];
        response.correctAnswers = correctAnswers;

        // Build distractors: explicit distractors field, or compute from options - correctAnswers
        if (question.distractors && question.distractors.length > 0) {
          response.distractors = question.distractors;
        } else if (question.options && question.options.length > 0) {
          response.distractors = question.options.filter(opt => !correctAnswers.includes(opt));
        } else {
          response.distractors = [];
        }
        // Also include trueFalseData for true_false questions
        if (primaryType === 'true_false' && question.trueFalseData) {
          response.trueFalseData = question.trueFalseData;
        }
        break;

      case 'short_answer':
        response.acceptedAnswers = question.acceptedAnswers || [];
        response.matchThreshold = question.matchThreshold ?? 80;
        break;

      case 'long_answer':
        response.sampleAnswer = question.sampleAnswer || null;
        response.rubric = question.rubric || null;
        break;

      case 'matching':
        if (question.matchingPairs) {
          response.pairs = Object.entries(question.matchingPairs).map(([left, right]) => ({
            left,
            right
          }));
        } else {
          response.pairs = [];
        }
        break;

      case 'flashcard':
        response.cards = (question.cards || []).map(card => ({
          front: card.front,
          back: card.back,
          hint: card.hint || null
        }));
        break;

      case 'fill_in_blank':
        response.blanks = (question.blanks || []).map(blank => ({
          position: blank.position,
          acceptedAnswers: blank.acceptedAnswers,
          matchThreshold: blank.matchThreshold
        }));
        break;
    }

    // Add hierarchy if present
    if (question.hierarchy) {
      response.hierarchy = {
        parentQuestionId: question.hierarchy.parentQuestionId?.toString() || null,
        relatedQuestionIds: (question.hierarchy.relatedQuestionIds || []).map(id => id.toString()),
        prerequisiteQuestionIds: (question.hierarchy.prerequisiteQuestionIds || []).map(id => id.toString()),
        conceptTag: question.hierarchy.conceptTag || null,
        difficultyProgression: question.hierarchy.difficultyProgression ?? null
      };
    } else {
      response.hierarchy = {
        parentQuestionId: null,
        relatedQuestionIds: [],
        prerequisiteQuestionIds: [],
        conceptTag: null,
        difficultyProgression: null
      };
    }

    return response;
  }

  /**
   * Bulk update cognitive depth for multiple questions
   */
  static async bulkUpdateCognitiveDepth(
    departmentId: string,
    questionIds: string[],
    cognitiveDepth: string
  ): Promise<{ updated: number; failed: number; results: Array<{ id: string; status: string; error?: string }> }> {
    // Import service here to avoid circular dependency
    const CognitiveDepthLevelsService = (await import('./cognitive-depth-levels.service')).default;
    const { QuestionsService } = await import('./questions.service');

    // Validate slug exists in department
    const isValidSlug = await CognitiveDepthLevelsService.validateSlug(cognitiveDepth, departmentId);
    if (!isValidSlug) {
      throw ApiError.badRequest(`Cognitive depth level '${cognitiveDepth}' not found in department`);
    }

    // Use the QuestionsService bulk update
    return QuestionsService.bulkUpdateCognitiveDepth(questionIds, cognitiveDepth, departmentId);
  }
}
