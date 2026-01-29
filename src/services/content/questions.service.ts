import mongoose from 'mongoose';
import Question, {
  IQuestion,
  QuestionType,
  DifficultyLevel,
  IMediaAttachmentRef
} from '@/models/assessment/Question.model';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import { ApiError } from '@/utils/ApiError';

// ============================================
// RENDERING RESPONSE INTERFACES
// ============================================

/**
 * Rendered multiple choice question with shuffled options
 */
export interface RenderedMultipleChoice {
  questionId: string;
  questionText: string;
  questionType: 'multiple_choice' | 'multiple_select';
  options: Array<{
    id: string;
    text: string;
    isCorrect?: boolean; // Only included when showAnswers is true
  }>;
  points: number;
  explanation?: string;
  hints?: string[];
}

/**
 * Rendered flashcard with front and back
 */
export interface RenderedFlashcard {
  questionId: string;
  front: {
    text: string;
    media?: IMediaAttachmentRef;
  };
  back: {
    text: string;
    media?: IMediaAttachmentRef;
  };
  hint?: string;
  promptIndex?: number; // Which prompt variation was used
  totalPrompts?: number;
}

/**
 * Rendered matching exercise combining multiple questions
 */
export interface RenderedMatching {
  exerciseId: string;
  columnA: Array<{
    id: string;
    text: string;
    media?: IMediaAttachmentRef;
  }>;
  columnB: Array<{
    id: string;
    text: string;
    media?: IMediaAttachmentRef;
  }>;
  correctPairs?: Array<{ columnAId: string; columnBId: string }>; // Only when showAnswers
  totalPoints: number;
}

interface ListQuestionsFilters {
  questionType?: string;
  tag?: string;
  difficulty?: DifficultyLevel;
  search?: string;
  department?: string;
  sort?: string;
  page?: number;
  limit?: number;
  bankId?: string;
  bankIds?: string[];
  // Adaptive learning filters (optional)
  knowledgeNodeId?: string;
  cognitiveDepth?: string;
  hasKnowledgeNode?: boolean;
}

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface CreateQuestionData {
  questionText: string;
  questionTypes: QuestionType[];
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  points: number;
  difficulty?: DifficultyLevel;
  tags?: string[];
  explanation?: string;
  department?: string;
  createdBy: string;
  questionBankIds?: string[];
}

interface UpdateQuestionData {
  questionText?: string;
  questionTypes?: QuestionType[];
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  points?: number;
  difficulty?: DifficultyLevel;
  tags?: string[];
  explanation?: string;
  department?: string;
  questionBankIds?: string[];
}

interface BulkImportQuestion {
  questionText: string;
  questionTypes: QuestionType[];
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  points: number;
  difficulty?: DifficultyLevel;
  tags?: string[];
  explanation?: string;
}

interface BulkImportResult {
  index: number;
  status: 'success' | 'error';
  questionId: string | null;
  error: string | null;
}

export class QuestionsService {
  /**
   * List questions with filters and pagination
   */
  static async listQuestions(filters: ListQuestionsFilters, _userId: string, userRole: string, userDepartments: string[]): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { isActive: true };

    // Department filter - global admins see all, staff see their departments
    if (userRole !== 'admin') {
      if (filters.department) {
        // Verify user has access to requested department
        if (!userDepartments.includes(filters.department)) {
          throw ApiError.forbidden('Insufficient permissions or access to this department');
        }
        query.departmentId = filters.department;
      } else {
        // Filter by user's departments
        query.departmentId = { $in: userDepartments.map(id => new mongoose.Types.ObjectId(id)) };
      }
    } else if (filters.department) {
      query.departmentId = filters.department;
    }

    // Question type filter - support comma-separated values
    // Filters questions where questionTypes array contains any of the specified types
    if (filters.questionType) {
      const types = filters.questionType.split(',').map(t => t.trim());
      // Map contract format to model format
      const mappedTypes = types.map(type => {
        switch (type) {
          case 'multiple_choice': return 'multiple_choice';
          case 'true_false': return 'true_false';
          case 'short_answer': return 'short_answer';
          case 'fill_blank': return 'fill_in_blank';
          default: return type;
        }
      });
      // Use $in to match questions that have any of the specified types in their questionTypes array
      query.questionTypes = { $in: mappedTypes };
    }

    // Tag filter
    if (filters.tag) {
      query.tags = filters.tag.toLowerCase();
    }

    // Difficulty filter
    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }

    // Search filter
    if (filters.search) {
      query.questionText = { $regex: filters.search, $options: 'i' };
    }

    // Bank filter - single bankId
    if (filters.bankId) {
      query.questionBankIds = filters.bankId;
    }

    // Bank filter - multiple bankIds (questions in any of the banks)
    if (filters.bankIds && filters.bankIds.length > 0) {
      query.questionBankIds = { $in: filters.bankIds };
    }

    // Knowledge node filter
    if (filters.knowledgeNodeId) {
      query.knowledgeNodeId = new mongoose.Types.ObjectId(filters.knowledgeNodeId);
    }

    // Cognitive depth filter
    if (filters.cognitiveDepth) {
      query.cognitiveDepth = filters.cognitiveDepth.toLowerCase();
    }

    // Has knowledge node filter
    if (filters.hasKnowledgeNode !== undefined) {
      if (filters.hasKnowledgeNode) {
        query.knowledgeNodeId = { $ne: null };
      } else {
        query.knowledgeNodeId = null;
      }
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

    // Format data - map model format back to contract format
    const questionsData = questions.map((question) => {
      const mappedTypes = this.mapQuestionTypesToContract(question.questionTypes);

      return {
        id: question._id.toString(),
        questionText: question.questionText,
        questionTypes: mappedTypes,
        options: this.formatOptions(question),
        correctAnswer: this.formatCorrectAnswer(question),
        points: question.points,
        difficulty: question.difficulty || 'medium',
        tags: question.tags || [],
        explanation: question.explanation || null,
        department: question.departmentId ? question.departmentId.toString() : null,
        createdBy: question.metadata?.createdBy || null,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt
      };
    });

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
   * Create a new question
   */
  static async createQuestion(questionData: CreateQuestionData): Promise<any> {
    // Map question types from contract format to model format
    const mappedTypes = this.mapQuestionTypesFromContract(questionData.questionTypes);

    // Validate based on question types (use first type for validation logic)
    const primaryType = mappedTypes[0];
    this.validateQuestionData(primaryType, questionData.options, questionData.correctAnswer);

    // Validate department if provided
    if (questionData.department) {
      if (!mongoose.Types.ObjectId.isValid(questionData.department)) {
        throw ApiError.notFound('Department not found');
      }
    }

    // Prepare question document
    const questionDoc: any = {
      questionText: questionData.questionText,
      questionTypes: mappedTypes,
      departmentId: questionData.department || null,
      points: questionData.points,
      difficulty: questionData.difficulty || 'medium',
      tags: questionData.tags?.map(tag => tag.toLowerCase()) || [],
      explanation: questionData.explanation || null,
      isActive: true,
      questionBankIds: questionData.questionBankIds || [],
      metadata: {
        createdBy: questionData.createdBy
      }
    };

    // Handle options and correct answers based on primary type
    if (primaryType === 'multiple_choice' || primaryType === 'true_false') {
      if (questionData.options) {
        questionDoc.options = questionData.options.map(opt => opt.text);
        const correctOptions = questionData.options.filter(opt => opt.isCorrect);

        if (correctOptions.length === 1) {
          questionDoc.correctAnswer = correctOptions[0].text;
        } else if (correctOptions.length > 1) {
          questionDoc.correctAnswers = correctOptions.map(opt => opt.text);
        }
      }
    } else if (primaryType === 'short_answer' || primaryType === 'fill_in_blank') {
      if (Array.isArray(questionData.correctAnswer)) {
        questionDoc.correctAnswers = questionData.correctAnswer;
      } else {
        questionDoc.correctAnswer = questionData.correctAnswer;
      }
    } else if (primaryType === 'long_answer') {
      questionDoc.modelAnswer = typeof questionData.correctAnswer === 'string'
        ? questionData.correctAnswer
        : null;
    }

    // Create question
    const question = await Question.create(questionDoc);

    // Format response
    const mappedTypesContract = this.mapQuestionTypesToContract(question.questionTypes);

    return {
      id: question._id.toString(),
      questionText: question.questionText,
      questionTypes: mappedTypesContract,
      options: this.formatOptions(question),
      correctAnswer: this.formatCorrectAnswer(question),
      points: question.points,
      difficulty: question.difficulty || 'medium',
      tags: question.tags || [],
      explanation: question.explanation || null,
      department: question.departmentId ? question.departmentId.toString() : null,
      createdBy: questionData.createdBy,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt
    };
  }

  /**
   * Get question by ID with usage count
   */
  static async getQuestionById(questionId: string, _userId: string, userRole: string, userDepartments: string[]): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      throw ApiError.notFound('Question not found');
    }

    // Check department access
    if (userRole !== 'admin' && question.departmentId) {
      if (!userDepartments.includes(question.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this department');
      }
    }

    // Calculate usage count (how many question banks contain this question)
    const usageCount = await QuestionBank.countDocuments({
      questionIds: question._id,
      isActive: true
    });

    // Get last used date from metadata
    const lastUsed = question.metadata?.lastUsed || null;

    const mappedTypes = this.mapQuestionTypesToContract(question.questionTypes);

    return {
      id: question._id.toString(),
      questionText: question.questionText,
      questionTypes: mappedTypes,
      options: this.formatOptions(question),
      correctAnswer: this.formatCorrectAnswer(question),
      points: question.points,
      difficulty: question.difficulty || 'medium',
      tags: question.tags || [],
      explanation: question.explanation || null,
      department: question.departmentId ? question.departmentId.toString() : null,
      createdBy: question.metadata?.createdBy || null,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      usageCount,
      lastUsed
    };
  }

  /**
   * Update a question
   */
  static async updateQuestion(questionId: string, updateData: UpdateQuestionData, _userId: string, userRole: string, userDepartments: string[]): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      throw ApiError.notFound('Question not found');
    }

    // Check department access
    if (userRole !== 'admin' && question.departmentId) {
      if (!userDepartments.includes(question.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this department');
      }
    }

    // Check if question is in use (in any active question banks)
    const inUseCount = await QuestionBank.countDocuments({
      questionIds: question._id,
      isActive: true
    });

    if (inUseCount > 0) {
      // Allow minor updates, but warn about type changes
      if (updateData.questionTypes && JSON.stringify(updateData.questionTypes) !== JSON.stringify(question.questionTypes)) {
        throw ApiError.badRequest('Question is currently in use in active assessments');
      }
    }

    // Map question types if provided
    const mappedTypes = updateData.questionTypes
      ? this.mapQuestionTypesFromContract(updateData.questionTypes)
      : question.questionTypes;
    const primaryType = mappedTypes[0];

    // Validate based on question type
    if (updateData.questionTypes || updateData.options || updateData.correctAnswer) {
      this.validateQuestionData(
        primaryType,
        updateData.options || (question.options ? this.reconstructOptions(question) : undefined),
        updateData.correctAnswer || this.formatCorrectAnswer(question)
      );
    }

    // Validate department if changing
    if (updateData.department && updateData.department !== question.departmentId?.toString()) {
      if (!mongoose.Types.ObjectId.isValid(updateData.department)) {
        throw ApiError.notFound('Department not found');
      }
    }

    // Update fields
    if (updateData.questionText !== undefined) question.questionText = updateData.questionText;
    if (updateData.questionTypes !== undefined) question.questionTypes = mappedTypes;
    if (updateData.points !== undefined) question.points = updateData.points;
    if (updateData.difficulty !== undefined) question.difficulty = updateData.difficulty;
    if (updateData.tags !== undefined) question.tags = updateData.tags.map(tag => tag.toLowerCase());
    if (updateData.explanation !== undefined) question.explanation = updateData.explanation;
    if (updateData.department !== undefined) question.departmentId = new mongoose.Types.ObjectId(updateData.department);
    if (updateData.questionBankIds !== undefined) question.questionBankIds = updateData.questionBankIds;

    // Handle options and correct answers based on primary type
    if (primaryType === 'multiple_choice' || primaryType === 'true_false') {
      if (updateData.options) {
        question.options = updateData.options.map(opt => opt.text);
        const correctOptions = updateData.options.filter(opt => opt.isCorrect);

        if (correctOptions.length === 1) {
          question.correctAnswer = correctOptions[0].text;
          question.correctAnswers = undefined;
        } else if (correctOptions.length > 1) {
          question.correctAnswers = correctOptions.map(opt => opt.text);
          question.correctAnswer = undefined;
        }
      }
    } else if (primaryType === 'short_answer' || primaryType === 'fill_in_blank') {
      if (updateData.correctAnswer !== undefined) {
        if (Array.isArray(updateData.correctAnswer)) {
          question.correctAnswers = updateData.correctAnswer;
          question.correctAnswer = undefined;
        } else {
          question.correctAnswer = updateData.correctAnswer;
          question.correctAnswers = undefined;
        }
      }
    } else if (primaryType === 'long_answer') {
      if (updateData.correctAnswer !== undefined) {
        question.modelAnswer = typeof updateData.correctAnswer === 'string'
          ? updateData.correctAnswer
          : undefined;
      }
    }

    await question.save();

    const mappedTypesContract = this.mapQuestionTypesToContract(question.questionTypes);

    return {
      id: question._id.toString(),
      questionText: question.questionText,
      questionTypes: mappedTypesContract,
      options: this.formatOptions(question),
      correctAnswer: this.formatCorrectAnswer(question),
      points: question.points,
      difficulty: question.difficulty || 'medium',
      tags: question.tags || [],
      explanation: question.explanation || null,
      department: question.departmentId ? question.departmentId.toString() : null,
      createdBy: question.metadata?.createdBy || null,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt
    };
  }

  /**
   * Delete a question (soft delete)
   */
  static async deleteQuestion(questionId: string, userId: string, userRole: string, userDepartments: string[]): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      throw ApiError.notFound('Question not found');
    }

    // Check department access
    if (userRole !== 'admin' && question.departmentId) {
      if (!userDepartments.includes(question.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this department');
      }
    }

    // Check if question is in use
    const inUseCount = await QuestionBank.countDocuments({
      questionIds: question._id,
      isActive: true
    });

    if (inUseCount > 0) {
      throw ApiError.badRequest('Cannot delete question that is in use in assessments');
    }

    // Soft delete
    question.isActive = false;
    question.metadata = {
      ...question.metadata,
      deletedBy: userId,
      deletedAt: new Date()
    };
    await question.save();
  }

  /**
   * Bulk import questions
   */
  static async bulkImportQuestions(
    _format: 'json' | 'csv',
    questions: BulkImportQuestion[],
    department: string | undefined,
    overwriteExisting: boolean,
    userId: string,
    userRole: string,
    userDepartments: string[]
  ): Promise<any> {
    // Validate questions array
    if (!Array.isArray(questions) || questions.length === 0) {
      throw ApiError.badRequest('No questions provided for import');
    }

    if (questions.length > 1000) {
      throw ApiError.badRequest('Maximum 1000 questions per bulk import');
    }

    // Validate department access
    const targetDepartment = department || userDepartments[0];
    if (userRole !== 'admin' && !userDepartments.includes(targetDepartment)) {
      throw ApiError.forbidden('Insufficient permissions');
    }

    const results: BulkImportResult[] = [];
    let imported = 0;
    let failed = 0;
    let updated = 0;

    // Process each question
    for (let i = 0; i < questions.length; i++) {
      try {
        const questionData = questions[i];

        // Map question types
        const mappedTypes = this.mapQuestionTypesFromContract(questionData.questionTypes);
        const primaryType = mappedTypes[0];

        // Validate question data
        this.validateQuestionData(primaryType, questionData.options, questionData.correctAnswer);

        // Check for duplicate (case-insensitive questionText)
        const existingQuestion = await Question.findOne({
          questionText: { $regex: new RegExp(`^${questionData.questionText}$`, 'i') },
          departmentId: targetDepartment,
          isActive: true
        });

        if (existingQuestion && !overwriteExisting) {
          results.push({
            index: i,
            status: 'error',
            questionId: null,
            error: 'Duplicate question text found'
          });
          failed++;
          continue;
        }

        // Prepare question document
        const questionDoc: any = {
          questionText: questionData.questionText,
          questionTypes: mappedTypes,
          departmentId: targetDepartment,
          points: questionData.points,
          difficulty: questionData.difficulty || 'medium',
          tags: questionData.tags?.map(tag => tag.toLowerCase()) || [],
          explanation: questionData.explanation || null,
          isActive: true,
          metadata: {
            createdBy: userId,
            importedAt: new Date()
          }
        };

        // Handle options and correct answers
        if (primaryType === 'multiple_choice' || primaryType === 'true_false') {
          if (questionData.options) {
            questionDoc.options = questionData.options.map(opt => opt.text);
            const correctOptions = questionData.options.filter(opt => opt.isCorrect);

            if (correctOptions.length === 1) {
              questionDoc.correctAnswer = correctOptions[0].text;
            } else if (correctOptions.length > 1) {
              questionDoc.correctAnswers = correctOptions.map(opt => opt.text);
            }
          }
        } else if (primaryType === 'short_answer' || primaryType === 'fill_in_blank') {
          if (Array.isArray(questionData.correctAnswer)) {
            questionDoc.correctAnswers = questionData.correctAnswer;
          } else {
            questionDoc.correctAnswer = questionData.correctAnswer;
          }
        } else if (primaryType === 'long_answer') {
          questionDoc.modelAnswer = typeof questionData.correctAnswer === 'string'
            ? questionData.correctAnswer
            : null;
        }

        if (existingQuestion && overwriteExisting) {
          // Update existing question
          Object.assign(existingQuestion, questionDoc);
          await existingQuestion.save();

          results.push({
            index: i,
            status: 'success',
            questionId: existingQuestion._id.toString(),
            error: null
          });
          updated++;
        } else {
          // Create new question
          const newQuestion = await Question.create(questionDoc);

          results.push({
            index: i,
            status: 'success',
            questionId: newQuestion._id.toString(),
            error: null
          });
          imported++;
        }
      } catch (error: any) {
        results.push({
          index: i,
          status: 'error',
          questionId: null,
          error: error.message || 'Unknown error'
        });
        failed++;
      }
    }

    return {
      imported,
      failed,
      updated,
      results
    };
  }

  /**
   * Get questions by bank IDs (for assessment question selection)
   */
  static async getQuestionsByBankIds(bankIds: string[], filters?: {
    tags?: string[];
    difficulty?: ('beginner' | 'intermediate' | 'advanced')[];
    questionType?: string;      // Legacy single type filter
    questionTypes?: string[];   // New array type filter
    limit?: number;
    random?: boolean;
  }): Promise<any[]> {
    if (!bankIds || bankIds.length === 0) {
      return [];
    }

    // Build query
    const query: any = {
      isActive: true,
      questionBankIds: { $in: bankIds }
    };

    // Apply tag filter (questions must have at least one of the specified tags)
    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags.map(tag => tag.toLowerCase()) };
    }

    // Apply difficulty filter
    if (filters?.difficulty && filters.difficulty.length > 0) {
      // Map filter values to model values (beginner->easy, advanced->hard)
      const mappedDifficulty = filters.difficulty.map(d => {
        switch (d) {
          case 'beginner': return 'easy';
          case 'advanced': return 'hard';
          default: return d; // 'intermediate' maps to 'medium' or keep as-is
        }
      });
      query.difficulty = { $in: mappedDifficulty };
    }

    // Apply question type filter (support both single type and array)
    const typeFilter = filters?.questionTypes || (filters?.questionType ? [filters.questionType] : null);
    if (typeFilter && typeFilter.length > 0) {
      const mappedTypes = typeFilter.map(t => this.mapQuestionTypeFromContract(t));
      // Use $in to match questions that have any of these types in their questionTypes array
      query.questionTypes = { $in: mappedTypes };
    }

    let questionsQuery = Question.find(query);

    // Apply random sampling using MongoDB aggregation if random is true
    if (filters?.random && filters?.limit) {
      const pipeline: any[] = [
        { $match: query },
        { $sample: { size: filters.limit } }
      ];

      const questions = await Question.aggregate(pipeline);

      return questions.map((question) => ({
        id: question._id.toString(),
        questionText: question.questionText,
        questionTypes: this.mapQuestionTypesToContract(question.questionTypes),
        options: question.options ? question.options.map((opt: string) => ({
          text: opt,
          isCorrect: (question.correctAnswers || [question.correctAnswer]).includes(opt)
        })) : undefined,
        correctAnswer: question.correctAnswers?.length > 0
          ? (question.correctAnswers.length === 1 ? question.correctAnswers[0] : question.correctAnswers)
          : question.correctAnswer || question.modelAnswer || undefined,
        points: question.points,
        difficulty: question.difficulty || 'medium',
        tags: question.tags || [],
        explanation: question.explanation || null,
        department: question.departmentId ? question.departmentId.toString() : null,
        questionBankIds: question.questionBankIds || []
      }));
    }

    // Apply limit if specified (non-random)
    if (filters?.limit) {
      questionsQuery = questionsQuery.limit(filters.limit);
    }

    const questions = await questionsQuery;

    // Format response
    return questions.map((question) => ({
      id: question._id.toString(),
      questionText: question.questionText,
      questionTypes: this.mapQuestionTypesToContract(question.questionTypes),
      options: this.formatOptions(question),
      correctAnswer: this.formatCorrectAnswer(question),
      points: question.points,
      difficulty: question.difficulty || 'medium',
      tags: question.tags || [],
      explanation: question.explanation || null,
      department: question.departmentId ? question.departmentId.toString() : null,
      questionBankIds: question.questionBankIds || []
    }));
  }

  /**
   * Add question to a bank
   */
  static async addToBank(questionId: string, bankId: string, _userId: string, userRole: string, userDepartments: string[]): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      throw ApiError.notFound('Question bank not found');
    }

    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      throw ApiError.notFound('Question not found');
    }

    // Check department access
    if (userRole !== 'admin' && question.departmentId) {
      if (!userDepartments.includes(question.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this department');
      }
    }

    // Verify the bank exists and user has access
    const bank = await QuestionBank.findById(bankId);
    if (!bank || !bank.isActive) {
      throw ApiError.notFound('Question bank not found');
    }

    if (userRole !== 'admin' && bank.departmentId) {
      if (!userDepartments.includes(bank.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this question bank');
      }
    }

    // Check if already in bank
    if (question.questionBankIds.includes(bankId)) {
      throw ApiError.badRequest('Question is already in this bank');
    }

    // Add bank to question's questionBankIds
    question.questionBankIds.push(bankId);
    await question.save();

    // Also add question to bank's questionIds if not already there
    if (!bank.questionIds.some(id => id.toString() === questionId)) {
      bank.questionIds.push(new mongoose.Types.ObjectId(questionId));
      await bank.save();
    }

    const mappedTypes = this.mapQuestionTypesToContract(question.questionTypes);

    return {
      id: question._id.toString(),
      questionText: question.questionText,
      questionTypes: mappedTypes,
      options: this.formatOptions(question),
      correctAnswer: this.formatCorrectAnswer(question),
      points: question.points,
      difficulty: question.difficulty || 'medium',
      tags: question.tags || [],
      explanation: question.explanation || null,
      department: question.departmentId ? question.departmentId.toString() : null,
      questionBankIds: question.questionBankIds,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt
    };
  }

  /**
   * Remove question from a bank
   */
  static async removeFromBank(questionId: string, bankId: string, _userId: string, userRole: string, userDepartments: string[]): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      throw ApiError.notFound('Question bank not found');
    }

    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      throw ApiError.notFound('Question not found');
    }

    // Check department access
    if (userRole !== 'admin' && question.departmentId) {
      if (!userDepartments.includes(question.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this department');
      }
    }

    // Verify the bank exists and user has access
    const bank = await QuestionBank.findById(bankId);
    if (!bank || !bank.isActive) {
      throw ApiError.notFound('Question bank not found');
    }

    if (userRole !== 'admin' && bank.departmentId) {
      if (!userDepartments.includes(bank.departmentId.toString())) {
        throw ApiError.forbidden('Insufficient permissions or access to this question bank');
      }
    }

    // Check if question is in this bank
    if (!question.questionBankIds.includes(bankId)) {
      throw ApiError.badRequest('Question is not in this bank');
    }

    // Remove bank from question's questionBankIds
    question.questionBankIds = question.questionBankIds.filter(id => id !== bankId);
    await question.save();

    // Also remove question from bank's questionIds
    bank.questionIds = bank.questionIds.filter(id => id.toString() !== questionId);
    await bank.save();

    const mappedTypes = this.mapQuestionTypesToContract(question.questionTypes);

    return {
      id: question._id.toString(),
      questionText: question.questionText,
      questionTypes: mappedTypes,
      options: this.formatOptions(question),
      correctAnswer: this.formatCorrectAnswer(question),
      points: question.points,
      difficulty: question.difficulty || 'medium',
      tags: question.tags || [],
      explanation: question.explanation || null,
      department: question.departmentId ? question.departmentId.toString() : null,
      questionBankIds: question.questionBankIds,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt
    };
  }

  /**
   * =====================
   * HELPER METHODS
   * =====================
   */

  /**
   * Map question type from contract format to model format
   * Now identity mapping since both use snake_case
   */
  private static mapQuestionTypeFromContract(type: string): QuestionType {
    // Direct mapping - contract and model both use snake_case
    return type as QuestionType;
  }

  /**
   * Map question types array from contract format to model format
   */
  private static mapQuestionTypesFromContract(types: QuestionType[]): QuestionType[] {
    return types.map(type => this.mapQuestionTypeFromContract(type));
  }

  /**
   * Map question type from model format to contract format
   * Now identity mapping since both use snake_case
   */
  private static mapQuestionTypeToContract(type: QuestionType): string {
    // Direct mapping - contract and model both use snake_case
    return type;
  }

  /**
   * Map question types array from model format to contract format
   */
  private static mapQuestionTypesToContract(types: QuestionType[]): string[] {
    return types.map(type => this.mapQuestionTypeToContract(type));
  }

  /**
   * Validate question data based on type
   */
  private static validateQuestionData(
    questionType: QuestionType,
    options?: QuestionOption[],
    correctAnswer?: string | string[]
  ): void {
    if (questionType === 'multiple_choice') {
      if (!options || options.length === 0) {
        throw ApiError.badRequest('Options required for multiple_choice questions');
      }
      const correctOptions = options.filter(opt => opt.isCorrect);
      if (correctOptions.length === 0) {
        throw ApiError.badRequest('Multiple choice questions must have at least one correct answer');
      }
    } else if (questionType === 'true_false') {
      if (!options || options.length !== 2) {
        throw ApiError.badRequest('True/false questions must have exactly 2 options');
      }
      const correctOptions = options.filter(opt => opt.isCorrect);
      if (correctOptions.length !== 1) {
        throw ApiError.badRequest('True/false questions must have exactly one correct answer');
      }
    } else if (questionType === 'short_answer' || questionType === 'fill_in_blank') {
      if (!correctAnswer || (Array.isArray(correctAnswer) && correctAnswer.length === 0)) {
        throw ApiError.badRequest(`Correct answer required for ${questionType} questions`);
      }
    }
    // Essay questions don't require correctAnswer (graded manually)
  }

  /**
   * Format options for response
   */
  private static formatOptions(question: IQuestion): QuestionOption[] | undefined {
    // Check if any of the question types support options
    const hasOptionsType = question.questionTypes.some(
      type => type === 'multiple_choice' || type === 'true_false'
    );
    if (!hasOptionsType) {
      return undefined;
    }

    if (!question.options || question.options.length === 0) {
      return undefined;
    }

    const correctAnswers = question.correctAnswers || (question.correctAnswer ? [question.correctAnswer] : []);

    return question.options.map(option => ({
      text: option,
      isCorrect: correctAnswers.includes(option)
    }));
  }

  /**
   * Format correct answer for response
   */
  private static formatCorrectAnswer(question: IQuestion): string | string[] | undefined {
    if (question.correctAnswers && question.correctAnswers.length > 0) {
      return question.correctAnswers.length === 1 ? question.correctAnswers[0] : question.correctAnswers;
    }

    if (question.correctAnswer) {
      return question.correctAnswer;
    }

    if (question.modelAnswer) {
      return question.modelAnswer;
    }

    return undefined;
  }

  /**
   * Reconstruct options from question for validation
   */
  private static reconstructOptions(question: IQuestion): QuestionOption[] | undefined {
    if (!question.options || question.options.length === 0) {
      return undefined;
    }

    const correctAnswers = question.correctAnswers || (question.correctAnswer ? [question.correctAnswer] : []);

    return question.options.map(option => ({
      text: option,
      isCorrect: correctAnswers.includes(option)
    }));
  }

  /**
   * =====================
   * ADAPTIVE LEARNING METHODS
   * =====================
   */

  /**
   * Get questions by knowledge node
   */
  static async getByKnowledgeNode(
    knowledgeNodeId: string,
    options?: {
      cognitiveDepth?: string;
      questionTypes?: QuestionType[];
      limit?: number;
      excludeIds?: string[];
    }
  ): Promise<IQuestion[]> {
    if (!mongoose.Types.ObjectId.isValid(knowledgeNodeId)) {
      return [];
    }

    const query: Record<string, unknown> = {
      knowledgeNodeId: new mongoose.Types.ObjectId(knowledgeNodeId),
      isActive: true
    };

    if (options?.cognitiveDepth) {
      query.cognitiveDepth = options.cognitiveDepth.toLowerCase();
    }

    if (options?.questionTypes && options.questionTypes.length > 0) {
      query.questionTypes = { $in: options.questionTypes };
    }

    if (options?.excludeIds && options.excludeIds.length > 0) {
      query._id = {
        $nin: options.excludeIds.map((id) => new mongoose.Types.ObjectId(id))
      };
    }

    let questionQuery = Question.find(query);

    if (options?.limit) {
      questionQuery = questionQuery.limit(options.limit);
    }

    return questionQuery;
  }

  /**
   * Get questions by cognitive depth for a department
   */
  static async getByCognitiveDepth(
    cognitiveDepth: string,
    departmentId: string,
    options?: {
      limit?: number;
      excludeIds?: string[];
    }
  ): Promise<IQuestion[]> {
    const query: Record<string, unknown> = {
      departmentId: new mongoose.Types.ObjectId(departmentId),
      cognitiveDepth: cognitiveDepth.toLowerCase(),
      isActive: true
    };

    if (options?.excludeIds && options.excludeIds.length > 0) {
      query._id = {
        $nin: options.excludeIds.map((id) => new mongoose.Types.ObjectId(id))
      };
    }

    let questionQuery = Question.find(query);

    if (options?.limit) {
      questionQuery = questionQuery.limit(options.limit);
    }

    return questionQuery;
  }

  /**
   * Get questions for adaptive selection
   * Filters by knowledge node, cognitive depth, and optionally by question banks
   */
  static async getForAdaptiveSelection(
    knowledgeNodeId: string,
    cognitiveDepth: string,
    options?: {
      questionBankIds?: string[];
      questionTypes?: QuestionType[];
      excludeIds?: string[];
      limit?: number;
      random?: boolean;
    }
  ): Promise<IQuestion[]> {
    if (!mongoose.Types.ObjectId.isValid(knowledgeNodeId)) {
      return [];
    }

    const query: Record<string, unknown> = {
      knowledgeNodeId: new mongoose.Types.ObjectId(knowledgeNodeId),
      cognitiveDepth: cognitiveDepth.toLowerCase(),
      isActive: true
    };

    // Filter by question banks if specified
    if (options?.questionBankIds && options.questionBankIds.length > 0) {
      query.questionBankIds = { $in: options.questionBankIds };
    }

    // Filter by question types if specified
    if (options?.questionTypes && options.questionTypes.length > 0) {
      query.questionTypes = { $in: options.questionTypes };
    }

    // Exclude specific questions
    if (options?.excludeIds && options.excludeIds.length > 0) {
      query._id = {
        $nin: options.excludeIds.map((id) => new mongoose.Types.ObjectId(id))
      };
    }

    // Random selection using aggregation
    if (options?.random && options?.limit) {
      return Question.aggregate([
        { $match: query },
        { $sample: { size: options.limit } }
      ]);
    }

    let questionQuery = Question.find(query);

    if (options?.limit) {
      questionQuery = questionQuery.limit(options.limit);
    }

    return questionQuery;
  }

  /**
   * Count questions by knowledge node and cognitive depth
   * Useful for determining content coverage
   */
  static async countByNodeAndDepth(
    knowledgeNodeId: string
  ): Promise<Record<string, number>> {
    if (!mongoose.Types.ObjectId.isValid(knowledgeNodeId)) {
      return {};
    }

    const result = await Question.aggregate([
      {
        $match: {
          knowledgeNodeId: new mongoose.Types.ObjectId(knowledgeNodeId),
          isActive: true
        }
      },
      {
        $group: {
          _id: '$cognitiveDepth',
          count: { $sum: 1 }
        }
      }
    ]);

    const counts: Record<string, number> = {};
    for (const item of result) {
      if (item._id) {
        counts[item._id] = item.count;
      }
    }

    return counts;
  }

  /**
   * Link a question to a knowledge node
   */
  static async linkToKnowledgeNode(
    questionId: string,
    knowledgeNodeId: string,
    cognitiveDepth?: string
  ): Promise<IQuestion | null> {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      throw ApiError.notFound('Question not found');
    }

    question.knowledgeNodeId = new mongoose.Types.ObjectId(knowledgeNodeId);
    if (cognitiveDepth) {
      question.cognitiveDepth = cognitiveDepth.toLowerCase();
    }

    await question.save();
    return question;
  }

  /**
   * Unlink a question from its knowledge node
   */
  static async unlinkFromKnowledgeNode(questionId: string): Promise<IQuestion | null> {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.notFound('Question not found');
    }

    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      throw ApiError.notFound('Question not found');
    }

    question.knowledgeNodeId = undefined;
    question.cognitiveDepth = undefined;

    await question.save();
    return question;
  }

  /**
   * Bulk update cognitive depth for multiple questions
   */
  static async bulkUpdateCognitiveDepth(
    questionIds: string[],
    cognitiveDepth: string,
    departmentId: string
  ): Promise<{ updated: number; failed: number; results: Array<{ id: string; status: string; error?: string }> }> {
    const results: Array<{ id: string; status: string; error?: string }> = [];
    let updated = 0;
    let failed = 0;

    for (const questionId of questionIds) {
      try {
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
          results.push({ id: questionId, status: 'failed', error: 'Invalid question ID' });
          failed++;
          continue;
        }

        const question = await Question.findById(questionId);
        
        if (!question || !question.isActive) {
          results.push({ id: questionId, status: 'failed', error: 'Question not found' });
          failed++;
          continue;
        }

        // Verify question belongs to department
        if (question.departmentId?.toString() !== departmentId) {
          results.push({ id: questionId, status: 'failed', error: 'Question not in department' });
          failed++;
          continue;
        }

        // Update cognitive depth
        question.cognitiveDepth = cognitiveDepth.toLowerCase();
        await question.save();

        results.push({ id: questionId, status: 'updated' });
        updated++;
      } catch (error: any) {
        results.push({ id: questionId, status: 'failed', error: error.message || 'Unknown error' });
        failed++;
      }
    }

    return { updated, failed, results };
  }

  // ============================================
  // RENDERING METHODS (Monolithic Design)
  // ============================================

  /**
   * Helper function to shuffle array (Fisher-Yates algorithm)
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generate a unique ID for an option
   */
  private static generateOptionId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Render a question as multiple choice
   * Combines distractors (or options) with correct answers and shuffles them
   *
   * @param question - The question document
   * @param options - Rendering options
   * @returns Rendered multiple choice question with shuffled options
   */
  static renderAsMultipleChoice(
    question: IQuestion,
    options?: {
      showAnswers?: boolean;  // Include isCorrect in response
      seed?: number;          // For deterministic shuffling (testing)
    }
  ): RenderedMultipleChoice {
    const questionType = question.questionTypes.includes('multiple_select')
      ? 'multiple_select'
      : 'multiple_choice';

    // Build options array from either new design (distractors + correctAnswer) or legacy (options)
    let allOptions: Array<{ id: string; text: string; isCorrect: boolean }> = [];

    // Check if using new monolithic design (distractors field)
    if (question.distractors && question.distractors.length > 0) {
      // Get correct answers
      const correctAnswers = question.correctAnswers?.length
        ? question.correctAnswers
        : question.correctAnswer
          ? [question.correctAnswer]
          : [];

      // Add correct answers
      for (const answer of correctAnswers) {
        allOptions.push({
          id: this.generateOptionId(),
          text: answer,
          isCorrect: true
        });
      }

      // Add distractors
      for (const distractor of question.distractors) {
        allOptions.push({
          id: this.generateOptionId(),
          text: distractor,
          isCorrect: false
        });
      }
    } else if (question.options && question.options.length > 0) {
      // Legacy design - options array with correctAnswer/correctAnswers marking which are correct
      const correctAnswers = question.correctAnswers?.length
        ? question.correctAnswers
        : question.correctAnswer
          ? [question.correctAnswer]
          : [];

      for (const optionText of question.options) {
        allOptions.push({
          id: this.generateOptionId(),
          text: optionText,
          isCorrect: correctAnswers.includes(optionText)
        });
      }
    }

    // Shuffle options
    allOptions = this.shuffleArray(allOptions);

    // Format response
    const renderedOptions = allOptions.map(opt => {
      const rendered: { id: string; text: string; isCorrect?: boolean } = {
        id: opt.id,
        text: opt.text
      };
      if (options?.showAnswers) {
        rendered.isCorrect = opt.isCorrect;
      }
      return rendered;
    });

    return {
      questionId: question._id.toString(),
      questionText: question.questionText,
      questionType,
      options: renderedOptions,
      points: question.points,
      explanation: options?.showAnswers ? question.explanation : undefined,
      hints: question.hints
    };
  }

  /**
   * Render a question as a flashcard
   * Uses flashcardData (new design) or cards/questionText (legacy)
   *
   * @param question - The question document
   * @param promptIndex - Which prompt variation to use (for flashcardData.prompts)
   * @returns Rendered flashcard with front and back
   */
  static renderAsFlashcard(
    question: IQuestion,
    promptIndex?: number
  ): RenderedFlashcard {
    let front: { text: string; media?: IMediaAttachmentRef };
    let back: { text: string; media?: IMediaAttachmentRef };
    let hint: string | undefined;
    let actualPromptIndex: number | undefined;
    let totalPrompts: number | undefined;

    // Check for new flashcardData design
    if (question.flashcardData) {
      const data = question.flashcardData;
      totalPrompts = data.prompts?.length || 0;

      // Select which prompt to use
      if (data.prompts && data.prompts.length > 0) {
        actualPromptIndex = typeof promptIndex === 'number'
          ? Math.min(promptIndex, data.prompts.length - 1)
          : Math.floor(Math.random() * data.prompts.length);

        const selectedPrompt = data.prompts[actualPromptIndex];
        front = {
          text: selectedPrompt.text,
          media: selectedPrompt.media || data.frontMedia
        };
      } else {
        // No prompts, use questionText as front
        front = {
          text: question.questionText,
          media: data.frontMedia
        };
      }

      // Back is the answer (correctAnswer or questionText if prompts exist)
      const backText = question.correctAnswer
        || question.correctAnswers?.[0]
        || question.questionText;

      back = {
        text: backText,
        media: data.backMedia
      };
    } else if (question.cards && question.cards.length > 0) {
      // Legacy cards design - use first card or specified index
      const cardIndex = typeof promptIndex === 'number'
        ? Math.min(promptIndex, question.cards.length - 1)
        : 0;
      const card = question.cards[cardIndex];

      front = { text: card.front };
      back = { text: card.back };
      hint = card.hint;
      actualPromptIndex = cardIndex;
      totalPrompts = question.cards.length;
    } else {
      // Fallback: use questionText as front, correctAnswer as back
      front = { text: question.questionText };
      back = {
        text: question.correctAnswer
          || question.correctAnswers?.[0]
          || question.modelAnswer
          || ''
      };
    }

    // Get hint from hints array if not set
    if (!hint && question.hints && question.hints.length > 0) {
      hint = question.hints[0];
    }

    return {
      questionId: question._id.toString(),
      front,
      back,
      hint,
      promptIndex: actualPromptIndex,
      totalPrompts
    };
  }

  /**
   * Render multiple questions as a matching exercise
   * Combines questions into column A (prompts) and column B (answers)
   *
   * @param questions - Array of questions to combine into matching
   * @param options - Rendering options
   * @returns Rendered matching exercise with shuffled columns
   */
  static renderAsMatching(
    questions: IQuestion[],
    options?: {
      showAnswers?: boolean;  // Include correct pairs in response
      exerciseId?: string;    // Custom ID for the exercise
    }
  ): RenderedMatching {
    const columnA: Array<{ id: string; text: string; media?: IMediaAttachmentRef; questionId: string }> = [];
    const columnB: Array<{ id: string; text: string; media?: IMediaAttachmentRef; questionId: string }> = [];
    const correctPairs: Array<{ columnAId: string; columnBId: string }> = [];
    let totalPoints = 0;

    for (const question of questions) {
      const columnAId = this.generateOptionId();
      const columnBId = this.generateOptionId();

      // Get media from matchingData if available
      const matchingData = question.matchingData;

      // Column A: question text (prompt)
      columnA.push({
        id: columnAId,
        text: question.questionText,
        media: matchingData?.columnAMedia,
        questionId: question._id.toString()
      });

      // Column B: correct answer
      const answerText = question.correctAnswer
        || question.correctAnswers?.[0]
        || question.modelAnswer
        || '';

      columnB.push({
        id: columnBId,
        text: answerText,
        media: matchingData?.columnBMedia,
        questionId: question._id.toString()
      });

      // Track correct pairing
      correctPairs.push({ columnAId, columnBId });

      totalPoints += question.points;
    }

    // Handle legacy matchingPairs format
    for (const question of questions) {
      if (question.matchingPairs && Object.keys(question.matchingPairs).length > 0) {
        // Add pairs from matchingPairs object
        for (const [left, right] of Object.entries(question.matchingPairs)) {
          const aId = this.generateOptionId();
          const bId = this.generateOptionId();

          // Only add if not already added via questionText
          const existingA = columnA.find(a => a.text === left);
          const existingB = columnB.find(b => b.text === right);

          if (!existingA && !existingB) {
            columnA.push({
              id: aId,
              text: left,
              questionId: question._id.toString()
            });
            columnB.push({
              id: bId,
              text: right,
              questionId: question._id.toString()
            });
            correctPairs.push({ columnAId: aId, columnBId: bId });
          }
        }
      }
    }

    // Shuffle both columns independently
    const shuffledColumnA = this.shuffleArray(columnA).map(({ questionId, ...rest }) => rest);
    const shuffledColumnB = this.shuffleArray(columnB).map(({ questionId, ...rest }) => rest);

    const result: RenderedMatching = {
      exerciseId: options?.exerciseId || this.generateOptionId(),
      columnA: shuffledColumnA,
      columnB: shuffledColumnB,
      totalPoints
    };

    if (options?.showAnswers) {
      result.correctPairs = correctPairs;
    }

    return result;
  }

  /**
   * Render a question in true/false format
   * Uses trueFalseData (new design) or legacy options
   */
  static renderAsTrueFalse(
    question: IQuestion,
    options?: { showAnswers?: boolean }
  ): {
    questionId: string;
    questionText: string;
    options: Array<{ id: string; text: string; isCorrect?: boolean }>;
    points: number;
    trueExplanation?: string;
    falseExplanation?: string;
  } {
    const trueId = this.generateOptionId();
    const falseId = this.generateOptionId();

    let correctValue: boolean;
    let trueExplanation: string | undefined;
    let falseExplanation: string | undefined;

    // Check for new trueFalseData design
    if (question.trueFalseData && typeof question.trueFalseData.correctValue === 'boolean') {
      correctValue = question.trueFalseData.correctValue;
      trueExplanation = question.trueFalseData.trueExplanation;
      falseExplanation = question.trueFalseData.falseExplanation;
    } else if (question.options && question.options.length === 2) {
      // Legacy design - check correctAnswer
      const correctAnswer = question.correctAnswer?.toLowerCase();
      correctValue = correctAnswer === 'true' || correctAnswer === question.options[0]?.toLowerCase();
    } else {
      // Default to true if no data
      correctValue = true;
    }

    const renderedOptions = [
      {
        id: trueId,
        text: 'True',
        ...(options?.showAnswers && { isCorrect: correctValue === true })
      },
      {
        id: falseId,
        text: 'False',
        ...(options?.showAnswers && { isCorrect: correctValue === false })
      }
    ];

    return {
      questionId: question._id.toString(),
      questionText: question.questionText,
      options: renderedOptions,
      points: question.points,
      ...(options?.showAnswers && trueExplanation && { trueExplanation }),
      ...(options?.showAnswers && falseExplanation && { falseExplanation })
    };
  }

  /**
   * Render a question in fill-in-the-blank format
   * Uses fillBlankData (new design) or legacy blanks
   */
  static renderAsFillBlank(
    question: IQuestion,
    options?: { showAnswers?: boolean }
  ): {
    questionId: string;
    textWithBlanks: string;
    blanks: Array<{
      id: string;
      acceptedAnswers?: string[];
      matchThreshold?: number;
    }>;
    points: number;
  } {
    let textWithBlanks: string;
    let blanks: Array<{
      id: string;
      acceptedAnswers: string[];
      matchThreshold: number;
    }>;

    // Check for new fillBlankData design
    if (question.fillBlankData) {
      textWithBlanks = question.fillBlankData.textWithBlanks;
      blanks = question.fillBlankData.blanks.map(b => ({
        id: b.id,
        acceptedAnswers: b.acceptedAnswers,
        matchThreshold: b.matchThreshold
      }));
    } else if (question.blanks && question.blanks.length > 0) {
      // Legacy design - convert position-based blanks to id-based
      textWithBlanks = question.questionText;
      blanks = question.blanks.map((b, index) => ({
        id: `blank_${index}`,
        acceptedAnswers: b.acceptedAnswers,
        matchThreshold: b.matchThreshold
      }));

      // Replace positions with placeholders in text
      // This is a best-effort conversion - legacy data might not have proper placeholders
      let offset = 0;
      for (const blank of question.blanks) {
        const placeholder = `{{blank_${blanks.findIndex(b => b.acceptedAnswers === blank.acceptedAnswers)}}}`;
        // Simple replacement assuming positions are character indices
        if (typeof blank.position === 'number') {
          const adjustedPos = blank.position + offset;
          textWithBlanks = textWithBlanks.slice(0, adjustedPos) + placeholder + textWithBlanks.slice(adjustedPos);
          offset += placeholder.length;
        }
      }
    } else {
      // Fallback - no blank data
      textWithBlanks = question.questionText;
      blanks = [];
    }

    const renderedBlanks = blanks.map(b => {
      const rendered: { id: string; acceptedAnswers?: string[]; matchThreshold?: number } = {
        id: b.id
      };
      if (options?.showAnswers) {
        rendered.acceptedAnswers = b.acceptedAnswers;
        rendered.matchThreshold = b.matchThreshold;
      }
      return rendered;
    });

    return {
      questionId: question._id.toString(),
      textWithBlanks,
      blanks: renderedBlanks,
      points: question.points
    };
  }
}
