import mongoose from 'mongoose';
import Exercise from '@/models/assessment/Exercise.model';
import Question from '@/models/assessment/Question.model';
import Department from '@/models/organization/Department.model';
import ExamResult from '@/models/activity/ExamResult.model';

import { ApiError } from '@/utils/ApiError';

interface ListExercisesFilters {
  page?: number;
  limit?: number;
  type?: 'quiz' | 'exam' | 'practice' | 'assessment';
  department?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  search?: string;
  sort?: string;
  status?: 'draft' | 'published' | 'archived';
}

interface CreateExerciseInput {
  title: string;
  description?: string;
  type: 'quiz' | 'exam' | 'practice' | 'assessment';
  department: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  showFeedback?: boolean;
  allowReview?: boolean;
  instructions?: string;
  createdBy: string;
}

interface UpdateExerciseInput {
  title?: string;
  description?: string;
  type?: 'quiz' | 'exam' | 'practice' | 'assessment';
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  showFeedback?: boolean;
  allowReview?: boolean;
  instructions?: string;
  status?: 'draft' | 'published' | 'archived';
}

interface AddQuestionInput {
  questionId?: string;
  questionText?: string;
  questionType?: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'matching';
  options?: string[];
  correctAnswer?: string | string[];
  points?: number;
  order?: number;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

interface BulkAddQuestionsInput {
  questions: AddQuestionInput[];
  mode?: 'append' | 'replace';
}

export class ExercisesService {
  /**
   * List exercises with filtering and pagination
   */
  static async listExercises(filters: ListExercisesFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Type filter
    if (filters.type) {
      query.type = filters.type;
    }

    // Department filter
    if (filters.department) {
      query.department = filters.department;
    }

    // Difficulty filter
    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }

    // Status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Search filter (full-text search)
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Sort
    const sortField = filters.sort || '-createdAt';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sort: any = { [sortKey]: sortOrder };

    // Execute query
    const [exercises, total] = await Promise.all([
      Exercise.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-questions'), // Exclude questions array from list view
      Exercise.countDocuments(query)
    ]);

    // Build response
    const exercisesData = exercises.map((exercise) => ({
      id: exercise._id.toString(),
      title: exercise.title,
      description: exercise.description || null,
      type: exercise.type,
      department: exercise.department.toString(),
      difficulty: exercise.difficulty || 'medium',
      timeLimit: exercise.timeLimit,
      passingScore: exercise.passingScore,
      totalPoints: exercise.totalPoints,
      questionCount: exercise.questionCount,
      shuffleQuestions: exercise.shuffleQuestions,
      showFeedback: exercise.showFeedback,
      allowReview: exercise.allowReview,
      status: exercise.status,
      createdBy: exercise.createdBy.toString(),
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt
    }));

    return {
      exercises: exercisesData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Create a new exercise
   */
  static async createExercise(exerciseData: CreateExerciseInput): Promise<any> {
    // Validate department exists
    const department = await Department.findById(exerciseData.department);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Check if title already exists in department
    const existingExercise = await Exercise.findOne({
      title: exerciseData.title,
      department: exerciseData.department
    });

    if (existingExercise) {
      throw ApiError.conflict('Exercise with this title already exists in department');
    }

    // Create exercise
    const exercise = new Exercise({
      title: exerciseData.title,
      description: exerciseData.description,
      type: exerciseData.type,
      department: exerciseData.department,
      difficulty: exerciseData.difficulty || 'medium',
      timeLimit: exerciseData.timeLimit || 0,
      passingScore: exerciseData.passingScore || 70,
      shuffleQuestions: exerciseData.shuffleQuestions || false,
      showFeedback: exerciseData.showFeedback !== false,
      allowReview: exerciseData.allowReview !== false,
      instructions: exerciseData.instructions,
      totalPoints: 0,
      questionCount: 0,
      status: 'draft',
      createdBy: exerciseData.createdBy
    });

    await exercise.save();

    return {
      id: exercise._id.toString(),
      title: exercise.title,
      description: exercise.description || null,
      type: exercise.type,
      department: exercise.department.toString(),
      difficulty: exercise.difficulty,
      timeLimit: exercise.timeLimit,
      passingScore: exercise.passingScore,
      totalPoints: exercise.totalPoints,
      questionCount: exercise.questionCount,
      shuffleQuestions: exercise.shuffleQuestions,
      showFeedback: exercise.showFeedback,
      allowReview: exercise.allowReview,
      instructions: exercise.instructions || null,
      status: exercise.status,
      createdBy: exercise.createdBy.toString(),
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt
    };
  }

  /**
   * Get exercise by ID with populated data
   */
  static async getExerciseById(exerciseId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    const exercise = await Exercise.findById(exerciseId)
      .populate('department', 'name')
      .populate('createdBy', 'firstName lastName');

    if (!exercise) {
      throw ApiError.notFound('Exercise not found');
    }

    // Get statistics
    const allAttempts = await ExamResult.find({ examId: exerciseId });
    const completedAttempts = allAttempts.filter((a) => a.status === 'completed' || a.status === 'graded');

    const totalAttempts = completedAttempts.length;
    const averageScore = totalAttempts > 0
      ? completedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts
      : 0;
    const passedAttempts = completedAttempts.filter((a) => a.passed === true).length;
    const passRate = totalAttempts > 0 ? passedAttempts / totalAttempts : 0;

    // Build response
    const department = exercise.department as any;
    const creator = exercise.createdBy as any;

    return {
      id: exercise._id.toString(),
      title: exercise.title,
      description: exercise.description || null,
      type: exercise.type,
      department: {
        id: department._id.toString(),
        name: department.name
      },
      difficulty: exercise.difficulty || 'medium',
      timeLimit: exercise.timeLimit,
      passingScore: exercise.passingScore,
      totalPoints: exercise.totalPoints,
      questionCount: exercise.questionCount,
      shuffleQuestions: exercise.shuffleQuestions,
      showFeedback: exercise.showFeedback,
      allowReview: exercise.allowReview,
      instructions: exercise.instructions || null,
      status: exercise.status,
      createdBy: {
        id: creator._id.toString(),
        firstName: creator.firstName,
        lastName: creator.lastName
      },
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
      statistics: {
        totalAttempts,
        averageScore: Math.round(averageScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100
      }
    };
  }

  /**
   * Update exercise
   */
  static async updateExercise(exerciseId: string, updateData: UpdateExerciseInput): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      throw ApiError.notFound('Exercise not found');
    }

    // Check if trying to publish without questions
    if (updateData.status === 'published' && exercise.questionCount === 0) {
      throw ApiError.badRequest('Cannot publish exercise without questions');
    }

    // Check for active attempts if trying to modify
    const activeAttempts = await ExamResult.countDocuments({
      examId: exerciseId,
      status: 'in-progress'
    });

    if (activeAttempts > 0) {
      throw ApiError.conflict('Cannot modify exercise with active attempts');
    }

    // Validate title uniqueness if changing title
    if (updateData.title && updateData.title !== exercise.title) {
      const existingExercise = await Exercise.findOne({
        title: updateData.title,
        department: exercise.department,
        _id: { $ne: exerciseId }
      });

      if (existingExercise) {
        throw ApiError.conflict('Exercise with this title already exists in department');
      }
    }

    // Update fields
    if (updateData.title !== undefined) exercise.title = updateData.title;
    if (updateData.description !== undefined) exercise.description = updateData.description;
    if (updateData.type !== undefined) exercise.type = updateData.type;
    if (updateData.difficulty !== undefined) exercise.difficulty = updateData.difficulty;
    if (updateData.timeLimit !== undefined) exercise.timeLimit = updateData.timeLimit;
    if (updateData.passingScore !== undefined) exercise.passingScore = updateData.passingScore;
    if (updateData.shuffleQuestions !== undefined) exercise.shuffleQuestions = updateData.shuffleQuestions;
    if (updateData.showFeedback !== undefined) exercise.showFeedback = updateData.showFeedback;
    if (updateData.allowReview !== undefined) exercise.allowReview = updateData.allowReview;
    if (updateData.instructions !== undefined) exercise.instructions = updateData.instructions;
    if (updateData.status !== undefined) exercise.status = updateData.status;

    await exercise.save();

    return {
      id: exercise._id.toString(),
      title: exercise.title,
      description: exercise.description || null,
      type: exercise.type,
      department: exercise.department.toString(),
      difficulty: exercise.difficulty,
      timeLimit: exercise.timeLimit,
      passingScore: exercise.passingScore,
      totalPoints: exercise.totalPoints,
      questionCount: exercise.questionCount,
      shuffleQuestions: exercise.shuffleQuestions,
      showFeedback: exercise.showFeedback,
      allowReview: exercise.allowReview,
      instructions: exercise.instructions || null,
      status: exercise.status,
      createdBy: exercise.createdBy.toString(),
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt
    };
  }

  /**
   * Delete exercise (soft delete)
   */
  static async deleteExercise(exerciseId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      throw ApiError.notFound('Exercise not found');
    }

    // Check for active attempts
    const activeAttempts = await ExamResult.countDocuments({
      examId: exerciseId,
      status: 'in-progress'
    });

    if (activeAttempts > 0) {
      throw ApiError.conflict('Cannot delete exercise with active attempts');
    }

    // Soft delete - set status to archived
    exercise.status = 'archived';
    await exercise.save();
  }

  /**
   * Get questions in exercise
   */
  static async getExerciseQuestions(
    exerciseId: string,
    includeAnswers: boolean = false
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      throw ApiError.notFound('Exercise not found');
    }

    // Get question IDs in order
    const orderedQuestions = exercise.questions.sort((a, b) => a.order - b.order);
    const questionIds = orderedQuestions.map((q) => q.questionId);

    // Fetch all questions
    const questions = await Question.find({
      _id: { $in: questionIds }
    });

    // Create a map for quick lookup
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    // Build ordered response
    const questionsData = orderedQuestions.map((exerciseQuestion) => {
      const question = questionMap.get(exerciseQuestion.questionId.toString());
      if (!question) return null;

      const questionData: any = {
        id: question._id.toString(),
        questionText: question.questionText,
        questionType: question.questionType,
        order: exerciseQuestion.order,
        points: exerciseQuestion.points,
        difficulty: question.difficulty || 'medium',
        tags: question.tags || [],
        createdAt: question.createdAt
      };

      // Include options for multiple-choice and matching
      if (question.questionType === 'multiple-choice' || question.questionType === 'matching') {
        questionData.options = question.options || [];
      }

      // Include answers only if requested
      if (includeAnswers) {
        if (question.correctAnswer) {
          questionData.correctAnswer = question.correctAnswer;
        } else if (question.correctAnswers) {
          questionData.correctAnswer = question.correctAnswers;
        }
        questionData.explanation = question.explanation || null;
      }

      return questionData;
    }).filter((q) => q !== null);

    return {
      exerciseId: exercise._id.toString(),
      exerciseTitle: exercise.title,
      questionCount: exercise.questionCount,
      totalPoints: exercise.totalPoints,
      questions: questionsData
    };
  }

  /**
   * Add question to exercise
   */
  static async addQuestionToExercise(
    exerciseId: string,
    questionData: AddQuestionInput,
    departmentId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      throw ApiError.notFound('Exercise not found');
    }

    // Check for active attempts
    const activeAttempts = await ExamResult.countDocuments({
      examId: exerciseId,
      status: 'in-progress'
    });

    if (activeAttempts > 0 && exercise.status === 'published') {
      throw ApiError.conflict('Cannot add questions to published exercise with active attempts');
    }

    let question;

    // Mode 1: Link existing question
    if (questionData.questionId) {
      if (!mongoose.Types.ObjectId.isValid(questionData.questionId)) {
        throw ApiError.badRequest('Invalid question ID');
      }

      question = await Question.findById(questionData.questionId);
      if (!question) {
        throw ApiError.notFound('Question not found');
      }

      // Check if question already exists in exercise
      const existingQuestion = exercise.questions.find(
        (q) => q.questionId.toString() === questionData.questionId
      );

      if (existingQuestion) {
        throw ApiError.conflict('Question already added to this exercise');
      }
    } else {
      // Mode 2: Create new question
      if (!questionData.questionText || !questionData.questionType) {
        throw ApiError.badRequest('questionText and questionType are required when creating new question');
      }

      // Validate question type specific requirements
      if (questionData.questionType === 'multiple-choice' || questionData.questionType === 'matching') {
        if (!questionData.options || questionData.options.length < 2 || questionData.options.length > 10) {
          throw ApiError.badRequest('Multiple choice questions must have 2-10 options');
        }
      }

      // Create new question
      question = new Question({
        questionText: questionData.questionText,
        questionType: questionData.questionType,
        departmentId: departmentId,
        points: questionData.points || 10,
        options: questionData.options,
        correctAnswer: Array.isArray(questionData.correctAnswer)
          ? questionData.correctAnswer[0]
          : questionData.correctAnswer,
        correctAnswers: Array.isArray(questionData.correctAnswer)
          ? questionData.correctAnswer
          : undefined,
        explanation: questionData.explanation,
        difficulty: questionData.difficulty || 'medium',
        tags: questionData.tags || [],
        isActive: true
      });

      await question.save();
    }

    // Determine order
    const order = questionData.order || Math.max(...exercise.questions.map((q) => q.order), 0) + 1;
    const points = questionData.points || question.points;

    // Add question to exercise
    exercise.questions.push({
      questionId: question._id,
      order,
      points
    } as any);

    // Update totals
    exercise.questionCount = exercise.questions.length;
    exercise.totalPoints = exercise.questions.reduce((sum, q) => sum + q.points, 0);

    await exercise.save();

    // Build response
    const questionResponse: any = {
      id: question._id.toString(),
      questionText: question.questionText,
      questionType: question.questionType,
      order,
      points,
      difficulty: question.difficulty || 'medium',
      tags: question.tags || [],
      createdAt: question.createdAt
    };

    if (question.options) {
      questionResponse.options = question.options;
    }

    if (question.correctAnswer) {
      questionResponse.correctAnswer = question.correctAnswer;
    } else if (question.correctAnswers) {
      questionResponse.correctAnswer = question.correctAnswers;
    }

    if (question.explanation) {
      questionResponse.explanation = question.explanation;
    }

    return {
      exerciseId: exercise._id.toString(),
      question: questionResponse,
      updatedTotals: {
        questionCount: exercise.questionCount,
        totalPoints: exercise.totalPoints
      }
    };
  }

  /**
   * Bulk add questions to exercise
   */
  static async bulkAddQuestions(
    exerciseId: string,
    bulkData: BulkAddQuestionsInput,
    departmentId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    if (!bulkData.questions || bulkData.questions.length === 0) {
      throw ApiError.badRequest('Questions array is required and cannot be empty');
    }

    if (bulkData.questions.length > 100) {
      throw ApiError.badRequest('Cannot add more than 100 questions at once');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      throw ApiError.notFound('Exercise not found');
    }

    // Check for active attempts
    const activeAttempts = await ExamResult.countDocuments({
      examId: exerciseId,
      status: 'in-progress'
    });

    if (activeAttempts > 0 && exercise.status === 'published') {
      throw ApiError.conflict('Cannot add questions to published exercise with active attempts');
    }

    // Replace mode: remove all existing questions
    if (bulkData.mode === 'replace') {
      exercise.questions = [];
    }

    let added = 0;
    let failed = 0;
    const errors: any[] = [];

    // Process each question
    for (let i = 0; i < bulkData.questions.length; i++) {
      try {
        const questionData = bulkData.questions[i];
        let question;

        // Link existing or create new question
        if (questionData.questionId) {
          question = await Question.findById(questionData.questionId);
          if (!question) {
            throw new Error('Question not found');
          }
        } else {
          if (!questionData.questionText || !questionData.questionType) {
            throw new Error('questionText and questionType are required');
          }

          question = new Question({
            questionText: questionData.questionText,
            questionType: questionData.questionType,
            departmentId: departmentId,
            points: questionData.points || 10,
            options: questionData.options,
            correctAnswer: Array.isArray(questionData.correctAnswer)
              ? questionData.correctAnswer[0]
              : questionData.correctAnswer,
            correctAnswers: Array.isArray(questionData.correctAnswer)
              ? questionData.correctAnswer
              : undefined,
            explanation: questionData.explanation,
            difficulty: questionData.difficulty || 'medium',
            tags: questionData.tags || [],
            isActive: true
          });

          await question.save();
        }

        // Add to exercise
        const order = exercise.questions.length + 1;
        const points = questionData.points || question.points;

        exercise.questions.push({
          questionId: question._id,
          order,
          points
        } as any);

        added++;
      } catch (error: any) {
        failed++;
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    // Update totals
    exercise.questionCount = exercise.questions.length;
    exercise.totalPoints = exercise.questions.reduce((sum, q) => sum + q.points, 0);

    await exercise.save();

    return {
      exerciseId: exercise._id.toString(),
      added,
      failed,
      errors,
      updatedTotals: {
        questionCount: exercise.questionCount,
        totalPoints: exercise.totalPoints
      }
    };
  }

  /**
   * Remove question from exercise
   */
  static async removeQuestionFromExercise(exerciseId: string, questionId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw ApiError.badRequest('Invalid question ID');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      throw ApiError.notFound('Exercise not found');
    }

    // Check for active attempts
    const activeAttempts = await ExamResult.countDocuments({
      examId: exerciseId,
      status: 'in-progress'
    });

    if (activeAttempts > 0 && exercise.status === 'published') {
      throw ApiError.conflict('Cannot remove questions from published exercise with active attempts');
    }

    // Find and remove question
    const questionIndex = exercise.questions.findIndex(
      (q) => q.questionId.toString() === questionId
    );

    if (questionIndex === -1) {
      throw ApiError.notFound('Question not found in exercise');
    }

    exercise.questions.splice(questionIndex, 1);

    // Reorder remaining questions
    exercise.questions.forEach((q, index) => {
      q.order = index + 1;
    });

    // Update totals
    exercise.questionCount = exercise.questions.length;
    exercise.totalPoints = exercise.questions.reduce((sum, q) => sum + q.points, 0);

    // If last question removed, change status to draft
    if (exercise.questionCount === 0 && exercise.status === 'published') {
      exercise.status = 'draft';
    }

    await exercise.save();

    return {
      exerciseId: exercise._id.toString(),
      removedQuestionId: questionId,
      updatedTotals: {
        questionCount: exercise.questionCount,
        totalPoints: exercise.totalPoints
      }
    };
  }

  /**
   * Reorder questions in exercise
   */
  static async reorderExerciseQuestions(exerciseId: string, questionIds: string[]): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      throw ApiError.badRequest('questionIds must be a non-empty array');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      throw ApiError.notFound('Exercise not found');
    }

    // Check for active attempts
    const activeAttempts = await ExamResult.countDocuments({
      examId: exerciseId,
      status: 'in-progress'
    });

    if (activeAttempts > 0 && exercise.status === 'published') {
      throw ApiError.conflict('Cannot reorder questions in exercise with active attempts');
    }

    // Validate all question IDs exist in exercise
    if (questionIds.length !== exercise.questions.length) {
      throw ApiError.badRequest('Must include all question IDs currently in exercise');
    }

    // Check for duplicates
    const uniqueIds = new Set(questionIds);
    if (uniqueIds.size !== questionIds.length) {
      throw ApiError.badRequest('Duplicate question IDs in array');
    }

    // Validate all IDs exist
    const existingIds = new Set(exercise.questions.map((q) => q.questionId.toString()));
    for (const id of questionIds) {
      if (!existingIds.has(id)) {
        throw ApiError.badRequest(`Question ID ${id} not found in exercise`);
      }
    }

    // Create new ordered array
    const reorderedQuestions = questionIds.map((id, index) => {
      const existingQuestion = exercise.questions.find((q) => q.questionId.toString() === id);
      return {
        questionId: existingQuestion!.questionId,
        order: index + 1,
        points: existingQuestion!.points
      };
    });

    exercise.questions = reorderedQuestions as any;
    await exercise.save();

    // Build response
    const updatedOrder = reorderedQuestions.map((q) => ({
      questionId: q.questionId.toString(),
      order: q.order
    }));

    return {
      exerciseId: exercise._id.toString(),
      questionCount: exercise.questionCount,
      updatedOrder
    };
  }
}
