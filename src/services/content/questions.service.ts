import mongoose from 'mongoose';
import Question, { IQuestion, QuestionType, DifficultyLevel } from '@/models/assessment/Question.model';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import { ApiError } from '@/utils/ApiError';

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
}

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface CreateQuestionData {
  questionText: string;
  questionType: QuestionType;
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
  questionType?: QuestionType;
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
  questionType: QuestionType;
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
    if (filters.questionType) {
      const types = filters.questionType.split(',').map(t => t.trim());
      // Map contract format to model format
      const mappedTypes = types.map(type => {
        switch (type) {
          case 'multiple_choice': return 'multiple-choice';
          case 'true_false': return 'true-false';
          case 'short_answer': return 'short-answer';
          case 'fill_blank': return 'fill-blank';
          default: return type;
        }
      });
      query.questionType = types.length === 1 ? mappedTypes[0] : { $in: mappedTypes };
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
      const mappedType = this.mapQuestionTypeToContract(question.questionType);

      return {
        id: question._id.toString(),
        questionText: question.questionText,
        questionType: mappedType,
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
    // Map question type from contract format to model format
    const mappedType = this.mapQuestionTypeFromContract(questionData.questionType as any);

    // Validate based on question type
    this.validateQuestionData(mappedType, questionData.options, questionData.correctAnswer);

    // Validate department if provided
    if (questionData.department) {
      if (!mongoose.Types.ObjectId.isValid(questionData.department)) {
        throw ApiError.notFound('Department not found');
      }
    }

    // Prepare question document
    const questionDoc: any = {
      questionText: questionData.questionText,
      questionType: mappedType,
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

    // Handle options and correct answers based on type
    if (mappedType === 'multiple-choice' || mappedType === 'true-false') {
      if (questionData.options) {
        questionDoc.options = questionData.options.map(opt => opt.text);
        const correctOptions = questionData.options.filter(opt => opt.isCorrect);

        if (correctOptions.length === 1) {
          questionDoc.correctAnswer = correctOptions[0].text;
        } else if (correctOptions.length > 1) {
          questionDoc.correctAnswers = correctOptions.map(opt => opt.text);
        }
      }
    } else if (mappedType === 'short-answer' || mappedType === 'fill-blank') {
      if (Array.isArray(questionData.correctAnswer)) {
        questionDoc.correctAnswers = questionData.correctAnswer;
      } else {
        questionDoc.correctAnswer = questionData.correctAnswer;
      }
    } else if (mappedType === 'essay') {
      questionDoc.modelAnswer = typeof questionData.correctAnswer === 'string'
        ? questionData.correctAnswer
        : null;
    }

    // Create question
    const question = await Question.create(questionDoc);

    // Format response
    const mappedTypeContract = this.mapQuestionTypeToContract(question.questionType);

    return {
      id: question._id.toString(),
      questionText: question.questionText,
      questionType: mappedTypeContract,
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

    const mappedType = this.mapQuestionTypeToContract(question.questionType);

    return {
      id: question._id.toString(),
      questionText: question.questionText,
      questionType: mappedType,
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
      if (updateData.questionType && updateData.questionType !== question.questionType) {
        throw ApiError.badRequest('Question is currently in use in active assessments');
      }
    }

    // Map question type if provided
    const mappedType = updateData.questionType
      ? this.mapQuestionTypeFromContract(updateData.questionType as any)
      : question.questionType;

    // Validate based on question type
    if (updateData.questionType || updateData.options || updateData.correctAnswer) {
      this.validateQuestionData(
        mappedType,
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
    if (updateData.questionType !== undefined) question.questionType = mappedType as any;
    if (updateData.points !== undefined) question.points = updateData.points;
    if (updateData.difficulty !== undefined) question.difficulty = updateData.difficulty;
    if (updateData.tags !== undefined) question.tags = updateData.tags.map(tag => tag.toLowerCase());
    if (updateData.explanation !== undefined) question.explanation = updateData.explanation;
    if (updateData.department !== undefined) question.departmentId = new mongoose.Types.ObjectId(updateData.department);
    if (updateData.questionBankIds !== undefined) question.questionBankIds = updateData.questionBankIds;

    // Handle options and correct answers based on type
    if (mappedType === 'multiple-choice' || mappedType === 'true-false') {
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
    } else if (mappedType === 'short-answer' || mappedType === 'fill-blank') {
      if (updateData.correctAnswer !== undefined) {
        if (Array.isArray(updateData.correctAnswer)) {
          question.correctAnswers = updateData.correctAnswer;
          question.correctAnswer = undefined;
        } else {
          question.correctAnswer = updateData.correctAnswer;
          question.correctAnswers = undefined;
        }
      }
    } else if (mappedType === 'essay') {
      if (updateData.correctAnswer !== undefined) {
        question.modelAnswer = typeof updateData.correctAnswer === 'string'
          ? updateData.correctAnswer
          : undefined;
      }
    }

    await question.save();

    const mappedTypeContract = this.mapQuestionTypeToContract(question.questionType);

    return {
      id: question._id.toString(),
      questionText: question.questionText,
      questionType: mappedTypeContract,
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

        // Map question type
        const mappedType = this.mapQuestionTypeFromContract(questionData.questionType as any);

        // Validate question data
        this.validateQuestionData(mappedType, questionData.options, questionData.correctAnswer);

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
          questionType: mappedType,
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
        if (mappedType === 'multiple-choice' || mappedType === 'true-false') {
          if (questionData.options) {
            questionDoc.options = questionData.options.map(opt => opt.text);
            const correctOptions = questionData.options.filter(opt => opt.isCorrect);

            if (correctOptions.length === 1) {
              questionDoc.correctAnswer = correctOptions[0].text;
            } else if (correctOptions.length > 1) {
              questionDoc.correctAnswers = correctOptions.map(opt => opt.text);
            }
          }
        } else if (mappedType === 'short-answer' || mappedType === 'fill-blank') {
          if (Array.isArray(questionData.correctAnswer)) {
            questionDoc.correctAnswers = questionData.correctAnswer;
          } else {
            questionDoc.correctAnswer = questionData.correctAnswer;
          }
        } else if (mappedType === 'essay') {
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
    questionType?: string;
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

    // Apply question type filter
    if (filters?.questionType) {
      const mappedType = this.mapQuestionTypeFromContract(filters.questionType);
      query.questionType = mappedType;
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
        questionType: this.mapQuestionTypeToContract(question.questionType),
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
      questionType: this.mapQuestionTypeToContract(question.questionType),
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

    const mappedType = this.mapQuestionTypeToContract(question.questionType);

    return {
      id: question._id.toString(),
      questionText: question.questionText,
      questionType: mappedType,
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

    const mappedType = this.mapQuestionTypeToContract(question.questionType);

    return {
      id: question._id.toString(),
      questionText: question.questionText,
      questionType: mappedType,
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
   */
  private static mapQuestionTypeFromContract(type: string): QuestionType {
    switch (type) {
      case 'multiple_choice': return 'multiple-choice';
      case 'true_false': return 'true-false';
      case 'short_answer': return 'short-answer';
      case 'fill_blank': return 'fill-blank';
      default: return type as QuestionType;
    }
  }

  /**
   * Map question type from model format to contract format
   */
  private static mapQuestionTypeToContract(type: QuestionType): string {
    switch (type) {
      case 'multiple-choice': return 'multiple_choice';
      case 'true-false': return 'true_false';
      case 'short-answer': return 'short_answer';
      case 'fill-blank': return 'fill_blank';
      default: return type;
    }
  }

  /**
   * Validate question data based on type
   */
  private static validateQuestionData(
    questionType: QuestionType,
    options?: QuestionOption[],
    correctAnswer?: string | string[]
  ): void {
    if (questionType === 'multiple-choice') {
      if (!options || options.length === 0) {
        throw ApiError.badRequest('Options required for multiple_choice questions');
      }
      const correctOptions = options.filter(opt => opt.isCorrect);
      if (correctOptions.length === 0) {
        throw ApiError.badRequest('Multiple choice questions must have at least one correct answer');
      }
    } else if (questionType === 'true-false') {
      if (!options || options.length !== 2) {
        throw ApiError.badRequest('True/false questions must have exactly 2 options');
      }
      const correctOptions = options.filter(opt => opt.isCorrect);
      if (correctOptions.length !== 1) {
        throw ApiError.badRequest('True/false questions must have exactly one correct answer');
      }
    } else if (questionType === 'short-answer' || questionType === 'fill-blank') {
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
    if (question.questionType !== 'multiple-choice' && question.questionType !== 'true-false') {
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
}
