import mongoose from 'mongoose';
import Exercise, { IExercise, IMatchingConfig } from '@/models/assessment/Exercise.model';
import Question, { IQuestion } from '@/models/assessment/Question.model';
import MatchingSession, { IMatchingSession, IMatchingColumnItem } from '@/models/activity/MatchingSession.model';
import MatchingAttempt, { IMatchResult } from '@/models/activity/MatchingAttempt.model';
import Department from '@/models/organization/Department.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Matching Exercise Service
 *
 * Handles all business logic for matching exercises:
 * - Creating matching exercises from questions
 * - Building session data with shuffled columns
 * - Grading submitted matches
 * - Tracking attempt history
 */

// ============================================
// TYPES
// ============================================

interface CreateMatchingExerciseInput {
  title: string;
  description?: string;
  department: string;
  instructions?: string;
  passingScore?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionIds: string[];
  shuffleColumnB?: boolean;
  allowPartialCredit?: boolean;
  showFeedbackOnDrop?: boolean;
  maxAttempts?: number;
  timeLimit?: number;
  columnALabel?: string;
  columnBLabel?: string;
  createdBy: string;
}

interface UpdateMatchingExerciseInput {
  title?: string;
  description?: string;
  instructions?: string;
  passingScore?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  status?: 'draft' | 'published' | 'archived';
  questionIds?: string[];
  shuffleColumnB?: boolean;
  allowPartialCredit?: boolean;
  showFeedbackOnDrop?: boolean;
  maxAttempts?: number;
  timeLimit?: number;
  columnALabel?: string;
  columnBLabel?: string;
}

interface MatchingSessionResponse {
  sessionId: string;
  exerciseId: string;
  title: string;
  instructions: string | null;
  timeLimit: number | null;
  attemptsRemaining: number | null;
  columnALabel: string | null;
  columnBLabel: string | null;
  columnA: Array<{
    id: string;
    text: string;
    media: { mediaId?: string; url?: string; altText?: string } | null;
  }>;
  columnB: Array<{
    id: string;
    text: string;
    media: { mediaId?: string; url?: string; altText?: string } | null;
  }>;
  showFeedbackOnDrop: boolean;
  startedAt: string;
  expiresAt: string;
}

interface SubmitMatchingResultInput {
  sessionId: string;
  matches: Array<{
    columnAId: string;
    columnBId: string;
  }>;
  timeSpent: number;
}

interface MatchingResultResponse {
  attemptId: string;
  score: number;
  passed: boolean;
  correctCount: number;
  totalPairs: number;
  results: Array<{
    columnAId: string;
    matchedColumnBId: string;
    correctColumnBId: string;
    correct: boolean;
    columnAText: string;
    matchedText: string;
    correctText: string;
    explanation: string | null;
  }>;
  attemptsRemaining: number | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Build column item from question
 */
function buildColumnAItem(question: IQuestion): IMatchingColumnItem {
  return {
    questionId: question._id,
    text: question.questionText,
    media: question.matchingData?.columnAMedia
      ? {
          mediaId: question.matchingData.columnAMedia.mediaId,
          url: question.matchingData.columnAMedia.url,
          altText: question.matchingData.columnAMedia.altText
        }
      : undefined
  };
}

function buildColumnBItem(question: IQuestion): IMatchingColumnItem {
  // Column B comes from correctAnswers[0]
  const answerText = question.correctAnswers?.[0] || question.correctAnswer || '';
  return {
    questionId: question._id,
    text: answerText,
    media: question.matchingData?.columnBMedia
      ? {
          mediaId: question.matchingData.columnBMedia.mediaId,
          url: question.matchingData.columnBMedia.url,
          altText: question.matchingData.columnBMedia.altText
        }
      : undefined
  };
}

// ============================================
// SERVICE CLASS
// ============================================

export class MatchingExerciseService {
  /**
   * Create a new matching exercise
   */
  static async createMatchingExercise(input: CreateMatchingExerciseInput): Promise<any> {
    // Validate department exists
    const department = await Department.findById(input.department);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Check title uniqueness in department
    const existingExercise = await Exercise.findOne({
      title: input.title,
      department: input.department
    });
    if (existingExercise) {
      throw ApiError.conflict('Exercise with this title already exists in department');
    }

    // Validate at least 2 questions
    if (!input.questionIds || input.questionIds.length < 2) {
      throw ApiError.badRequest('Matching exercises require at least 2 questions');
    }

    // Maximum 12 questions for usability
    if (input.questionIds.length > 12) {
      throw ApiError.badRequest('Matching exercises should have at most 12 questions for usability');
    }

    // Validate all question IDs are valid ObjectIds
    const questionObjectIds = input.questionIds.map((id) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw ApiError.badRequest(`Invalid question ID: ${id}`);
      }
      return new mongoose.Types.ObjectId(id);
    });

    // Fetch questions and validate they have 'matching' type
    const questions = await Question.find({
      _id: { $in: questionObjectIds },
      isActive: true
    });

    if (questions.length !== input.questionIds.length) {
      const foundIds = new Set(questions.map((q) => q._id.toString()));
      const missingIds = input.questionIds.filter((id) => !foundIds.has(id));
      throw ApiError.notFound(`Questions not found or inactive: ${missingIds.join(', ')}`);
    }

    // Validate each question has 'matching' in questionTypes
    for (const question of questions) {
      if (!question.questionTypes.includes('matching')) {
        throw ApiError.badRequest(
          `Question "${question.questionText.substring(0, 50)}..." does not have 'matching' type`
        );
      }
      // Validate each question has a correct answer for Column B
      if (!question.correctAnswers?.[0] && !question.correctAnswer) {
        throw ApiError.badRequest(
          `Question "${question.questionText.substring(0, 50)}..." has no correct answer for Column B`
        );
      }
    }

    // Create the exercise
    const exercise = new Exercise({
      title: input.title,
      description: input.description,
      type: 'matching',
      department: input.department,
      difficulty: input.difficulty || 'medium',
      timeLimit: input.timeLimit || 0,
      passingScore: input.passingScore || 70,
      totalPoints: questions.length, // 1 point per match
      questionCount: questions.length,
      shuffleQuestions: false, // Column A order is fixed
      showFeedback: true,
      allowReview: true,
      instructions: input.instructions,
      status: 'draft',
      createdBy: input.createdBy,
      matchingConfig: {
        questionIds: questionObjectIds,
        shuffleColumnB: input.shuffleColumnB !== false,
        allowPartialCredit: input.allowPartialCredit !== false,
        showFeedbackOnDrop: input.showFeedbackOnDrop || false,
        maxAttempts: input.maxAttempts,
        timeLimit: input.timeLimit,
        columnALabel: input.columnALabel,
        columnBLabel: input.columnBLabel
      }
    });

    await exercise.save();

    return {
      id: exercise._id.toString(),
      title: exercise.title,
      description: exercise.description || null,
      type: exercise.type,
      department: exercise.department.toString(),
      difficulty: exercise.difficulty,
      passingScore: exercise.passingScore,
      questionCount: exercise.questionCount,
      instructions: exercise.instructions || null,
      status: exercise.status,
      matchingConfig: {
        questionIds: exercise.matchingConfig!.questionIds.map((id) => id.toString()),
        shuffleColumnB: exercise.matchingConfig!.shuffleColumnB,
        allowPartialCredit: exercise.matchingConfig!.allowPartialCredit,
        showFeedbackOnDrop: exercise.matchingConfig!.showFeedbackOnDrop,
        maxAttempts: exercise.matchingConfig!.maxAttempts || null,
        timeLimit: exercise.matchingConfig!.timeLimit || null,
        columnALabel: exercise.matchingConfig!.columnALabel || null,
        columnBLabel: exercise.matchingConfig!.columnBLabel || null
      },
      createdBy: exercise.createdBy.toString(),
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt
    };
  }

  /**
   * Update a matching exercise
   */
  static async updateMatchingExercise(exerciseId: string, input: UpdateMatchingExerciseInput): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      throw ApiError.notFound('Exercise not found');
    }

    if (exercise.type !== 'matching') {
      throw ApiError.badRequest('This endpoint is only for matching exercises');
    }

    // Check for active sessions if trying to modify questions
    if (input.questionIds) {
      const activeSessions = await MatchingSession.countDocuments({
        exerciseId,
        status: 'active'
      });
      if (activeSessions > 0) {
        throw ApiError.conflict('Cannot modify questions while there are active sessions');
      }
    }

    // Validate title uniqueness if changing title
    if (input.title && input.title !== exercise.title) {
      const existingExercise = await Exercise.findOne({
        title: input.title,
        department: exercise.department,
        _id: { $ne: exerciseId }
      });
      if (existingExercise) {
        throw ApiError.conflict('Exercise with this title already exists in department');
      }
    }

    // Update basic fields
    if (input.title !== undefined) exercise.title = input.title;
    if (input.description !== undefined) exercise.description = input.description;
    if (input.instructions !== undefined) exercise.instructions = input.instructions;
    if (input.passingScore !== undefined) exercise.passingScore = input.passingScore;
    if (input.difficulty !== undefined) exercise.difficulty = input.difficulty;
    if (input.status !== undefined) exercise.status = input.status;
    if (input.timeLimit !== undefined) exercise.timeLimit = input.timeLimit;

    // Update matching config
    if (exercise.matchingConfig) {
      if (input.shuffleColumnB !== undefined) {
        exercise.matchingConfig.shuffleColumnB = input.shuffleColumnB;
      }
      if (input.allowPartialCredit !== undefined) {
        exercise.matchingConfig.allowPartialCredit = input.allowPartialCredit;
      }
      if (input.showFeedbackOnDrop !== undefined) {
        exercise.matchingConfig.showFeedbackOnDrop = input.showFeedbackOnDrop;
      }
      if (input.maxAttempts !== undefined) {
        exercise.matchingConfig.maxAttempts = input.maxAttempts;
      }
      if (input.timeLimit !== undefined) {
        exercise.matchingConfig.timeLimit = input.timeLimit;
      }
      if (input.columnALabel !== undefined) {
        exercise.matchingConfig.columnALabel = input.columnALabel;
      }
      if (input.columnBLabel !== undefined) {
        exercise.matchingConfig.columnBLabel = input.columnBLabel;
      }

      // Update question IDs if provided
      if (input.questionIds) {
        if (input.questionIds.length < 2) {
          throw ApiError.badRequest('Matching exercises require at least 2 questions');
        }
        if (input.questionIds.length > 12) {
          throw ApiError.badRequest('Matching exercises should have at most 12 questions');
        }

        const questionObjectIds = input.questionIds.map((id) => {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw ApiError.badRequest(`Invalid question ID: ${id}`);
          }
          return new mongoose.Types.ObjectId(id);
        });

        // Validate questions
        const questions = await Question.find({
          _id: { $in: questionObjectIds },
          isActive: true
        });

        if (questions.length !== input.questionIds.length) {
          throw ApiError.notFound('Some questions not found or inactive');
        }

        for (const question of questions) {
          if (!question.questionTypes.includes('matching')) {
            throw ApiError.badRequest(
              `Question "${question.questionText.substring(0, 50)}..." does not have 'matching' type`
            );
          }
        }

        exercise.matchingConfig.questionIds = questionObjectIds;
        exercise.questionCount = questions.length;
        exercise.totalPoints = questions.length;
      }
    }

    // Cannot publish without questions
    if (input.status === 'published' && exercise.questionCount === 0) {
      throw ApiError.badRequest('Cannot publish exercise without questions');
    }

    exercise.markModified('matchingConfig');
    await exercise.save();

    return {
      id: exercise._id.toString(),
      title: exercise.title,
      description: exercise.description || null,
      type: exercise.type,
      department: exercise.department.toString(),
      difficulty: exercise.difficulty,
      passingScore: exercise.passingScore,
      questionCount: exercise.questionCount,
      instructions: exercise.instructions || null,
      status: exercise.status,
      matchingConfig: exercise.matchingConfig
        ? {
            questionIds: exercise.matchingConfig.questionIds.map((id) => id.toString()),
            shuffleColumnB: exercise.matchingConfig.shuffleColumnB,
            allowPartialCredit: exercise.matchingConfig.allowPartialCredit,
            showFeedbackOnDrop: exercise.matchingConfig.showFeedbackOnDrop,
            maxAttempts: exercise.matchingConfig.maxAttempts || null,
            timeLimit: exercise.matchingConfig.timeLimit || null,
            columnALabel: exercise.matchingConfig.columnALabel || null,
            columnBLabel: exercise.matchingConfig.columnBLabel || null
          }
        : null,
      createdBy: exercise.createdBy.toString(),
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt
    };
  }

  /**
   * Get a matching session (creates new or returns existing active session)
   */
  static async getMatchingSession(
    exerciseId: string,
    learnerId: string
  ): Promise<MatchingSessionResponse> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      throw ApiError.notFound('Exercise not found');
    }

    if (exercise.type !== 'matching') {
      throw ApiError.badRequest('This is not a matching exercise');
    }

    if (exercise.status !== 'published') {
      throw ApiError.badRequest('Exercise is not published');
    }

    if (!exercise.matchingConfig) {
      throw ApiError.internal('Matching exercise missing configuration');
    }

    const config = exercise.matchingConfig;

    // Check for existing active session
    let session = await MatchingSession.findOne({
      exerciseId,
      learnerId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    if (session) {
      // Return existing session
      return MatchingExerciseService.formatSessionResponse(exercise, session, config);
    }

    // Check max attempts
    const previousAttempts = await MatchingAttempt.countDocuments({
      exerciseId,
      learnerId
    });

    if (config.maxAttempts && previousAttempts >= config.maxAttempts) {
      throw ApiError.badRequest('Maximum attempts reached for this exercise');
    }

    // Fetch questions
    const questions = await Question.find({
      _id: { $in: config.questionIds },
      isActive: true
    });

    if (questions.length !== config.questionIds.length) {
      throw ApiError.internal('Some questions for this exercise are no longer available');
    }

    // Create question map for ordering
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    // Build columns in order specified by questionIds
    const columnA: IMatchingColumnItem[] = [];
    const columnB: IMatchingColumnItem[] = [];

    for (const qId of config.questionIds) {
      const question = questionMap.get(qId.toString());
      if (question) {
        columnA.push(buildColumnAItem(question));
        columnB.push(buildColumnBItem(question));
      }
    }

    // Shuffle Column B if configured
    const finalColumnB = config.shuffleColumnB ? shuffleArray(columnB) : columnB;
    const shuffleOrder = finalColumnB.map((item) => item.questionId);

    // Calculate expiration time
    const timeLimit = config.timeLimit || 3600; // Default 1 hour
    const expiresAt = new Date(Date.now() + timeLimit * 1000);

    // Create session
    session = await MatchingSession.create({
      exerciseId,
      learnerId,
      status: 'active',
      columnA,
      columnB: finalColumnB,
      shuffleOrder,
      startedAt: new Date(),
      expiresAt,
      attemptNumber: previousAttempts + 1
    });

    return MatchingExerciseService.formatSessionResponse(exercise, session, config);
  }

  /**
   * Format session response
   */
  private static async formatSessionResponse(
    exercise: IExercise,
    session: IMatchingSession,
    config: IMatchingConfig
  ): Promise<MatchingSessionResponse> {
    // Calculate attempts remaining
    let attemptsRemaining: number | null = null;
    if (config.maxAttempts) {
      const attemptCount = await MatchingAttempt.countDocuments({
        exerciseId: exercise._id,
        learnerId: session.learnerId
      });
      attemptsRemaining = Math.max(0, config.maxAttempts - attemptCount);
    }

    return {
      sessionId: session._id.toString(),
      exerciseId: exercise._id.toString(),
      title: exercise.title,
      instructions: exercise.instructions || null,
      timeLimit: config.timeLimit || null,
      attemptsRemaining,
      columnALabel: config.columnALabel || null,
      columnBLabel: config.columnBLabel || null,
      columnA: session.columnA.map((item) => ({
        id: item.questionId.toString(),
        text: item.text,
        media: item.media
          ? {
              mediaId: item.media.mediaId?.toString(),
              url: item.media.url,
              altText: item.media.altText
            }
          : null
      })),
      columnB: session.columnB.map((item) => ({
        id: item.questionId.toString(),
        text: item.text,
        media: item.media
          ? {
              mediaId: item.media.mediaId?.toString(),
              url: item.media.url,
              altText: item.media.altText
            }
          : null
      })),
      showFeedbackOnDrop: config.showFeedbackOnDrop,
      startedAt: session.startedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString()
    };
  }

  /**
   * Submit matching result and grade
   */
  static async submitMatchingResult(
    exerciseId: string,
    learnerId: string,
    input: SubmitMatchingResultInput
  ): Promise<MatchingResultResponse> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    if (!mongoose.Types.ObjectId.isValid(input.sessionId)) {
      throw ApiError.badRequest('Invalid session ID');
    }

    // Fetch session
    const session = await MatchingSession.findById(input.sessionId);
    if (!session) {
      throw ApiError.notFound('Session not found');
    }

    // Validate session belongs to this exercise and learner
    if (session.exerciseId.toString() !== exerciseId) {
      throw ApiError.badRequest('Session does not belong to this exercise');
    }

    if (session.learnerId.toString() !== learnerId) {
      throw ApiError.forbidden('Session does not belong to this learner');
    }

    // Check session status
    if (session.status !== 'active') {
      throw ApiError.badRequest(`Session is ${session.status}, cannot submit`);
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
      session.status = 'expired';
      await session.save();
      throw ApiError.badRequest('Session has expired');
    }

    // Fetch exercise
    const exercise = await Exercise.findById(exerciseId);
    if (!exercise || !exercise.matchingConfig) {
      throw ApiError.notFound('Exercise not found');
    }

    const config = exercise.matchingConfig;

    // Validate matches cover all pairs
    if (input.matches.length !== session.columnA.length) {
      throw ApiError.badRequest(
        `Expected ${session.columnA.length} matches, received ${input.matches.length}`
      );
    }

    // Fetch questions for explanations
    const questions = await Question.find({
      _id: { $in: config.questionIds }
    });
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    // Create lookup maps for session columns
    const columnAMap = new Map(session.columnA.map((item) => [item.questionId.toString(), item]));
    const columnBMap = new Map(session.columnB.map((item) => [item.questionId.toString(), item]));

    // Grade the matches
    let correctCount = 0;
    const results: IMatchResult[] = [];

    for (const match of input.matches) {
      const columnAItem = columnAMap.get(match.columnAId);
      const columnBItem = columnBMap.get(match.columnBId);

      if (!columnAItem) {
        throw ApiError.badRequest(`Invalid columnAId: ${match.columnAId}`);
      }
      if (!columnBItem) {
        throw ApiError.badRequest(`Invalid columnBId: ${match.columnBId}`);
      }

      // A match is correct when the learner connected columnA item to columnB item
      // where both have the same questionId (meaning the prompt was matched to its answer)
      const correct = match.columnAId === match.columnBId;
      if (correct) correctCount++;

      // Get the correct answer for this column A item
      const correctColumnBItem = columnBMap.get(match.columnAId);
      const question = questionMap.get(match.columnAId);

      results.push({
        columnAId: new mongoose.Types.ObjectId(match.columnAId),
        matchedColumnBId: new mongoose.Types.ObjectId(match.columnBId),
        correctColumnBId: new mongoose.Types.ObjectId(match.columnAId), // Correct answer has same ID
        correct,
        columnAText: columnAItem.text,
        matchedText: columnBItem.text,
        correctText: correctColumnBItem?.text || '',
        explanation: question?.matchingData?.pairExplanation || question?.explanation
      });
    }

    // Calculate score
    const totalPairs = session.columnA.length;
    let score: number;

    if (config.allowPartialCredit) {
      score = (correctCount / totalPairs) * 100;
    } else {
      score = correctCount === totalPairs ? 100 : 0;
    }

    const passed = score >= exercise.passingScore;

    // Create attempt record
    const attempt = await MatchingAttempt.create({
      exerciseId,
      learnerId,
      sessionId: session._id,
      attemptNumber: session.attemptNumber,
      submittedMatches: input.matches.map((m) => ({
        columnAId: new mongoose.Types.ObjectId(m.columnAId),
        columnBId: new mongoose.Types.ObjectId(m.columnBId)
      })),
      results,
      score: Math.round(score * 100) / 100,
      correctCount,
      totalPairs,
      passed,
      startedAt: session.startedAt,
      submittedAt: new Date(),
      timeSpent: input.timeSpent,
      allowPartialCredit: config.allowPartialCredit,
      passingScore: exercise.passingScore
    });

    // Mark session as completed
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    // Calculate attempts remaining
    let attemptsRemaining: number | null = null;
    if (config.maxAttempts) {
      const attemptCount = await MatchingAttempt.countDocuments({
        exerciseId,
        learnerId
      });
      attemptsRemaining = Math.max(0, config.maxAttempts - attemptCount);
    }

    return {
      attemptId: attempt._id.toString(),
      score: attempt.score,
      passed: attempt.passed,
      correctCount: attempt.correctCount,
      totalPairs: attempt.totalPairs,
      results: attempt.results.map((r) => ({
        columnAId: r.columnAId.toString(),
        matchedColumnBId: r.matchedColumnBId.toString(),
        correctColumnBId: r.correctColumnBId.toString(),
        correct: r.correct,
        columnAText: r.columnAText,
        matchedText: r.matchedText,
        correctText: r.correctText,
        explanation: r.explanation || null
      })),
      attemptsRemaining
    };
  }

  /**
   * Get matching attempt history for a learner
   */
  static async getMatchingAttempts(
    exerciseId: string,
    learnerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      throw ApiError.badRequest('Invalid exercise ID');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      throw ApiError.notFound('Exercise not found');
    }

    if (exercise.type !== 'matching') {
      throw ApiError.badRequest('This is not a matching exercise');
    }

    const skip = (page - 1) * limit;

    const [attempts, total] = await Promise.all([
      MatchingAttempt.find({
        exerciseId,
        learnerId
      })
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit),
      MatchingAttempt.countDocuments({
        exerciseId,
        learnerId
      })
    ]);

    // Get best score
    const bestAttempt = await MatchingAttempt.findOne({
      exerciseId,
      learnerId
    }).sort({ score: -1 });

    return {
      exerciseId: exercise._id.toString(),
      exerciseTitle: exercise.title,
      learnerId,
      totalAttempts: total,
      bestScore: bestAttempt?.score || null,
      hasPassed: bestAttempt?.passed || false,
      attemptsRemaining: exercise.matchingConfig?.maxAttempts
        ? Math.max(0, exercise.matchingConfig.maxAttempts - total)
        : null,
      attempts: attempts.map((attempt) => ({
        attemptId: attempt._id.toString(),
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        correctCount: attempt.correctCount,
        totalPairs: attempt.totalPairs,
        passed: attempt.passed,
        timeSpent: attempt.timeSpent,
        submittedAt: attempt.submittedAt.toISOString()
      })),
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
   * Get detailed results for a specific attempt
   */
  static async getAttemptDetails(
    attemptId: string,
    learnerId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.badRequest('Invalid attempt ID');
    }

    const attempt = await MatchingAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    if (attempt.learnerId.toString() !== learnerId) {
      throw ApiError.forbidden('Attempt does not belong to this learner');
    }

    const exercise = await Exercise.findById(attempt.exerciseId);

    return {
      attemptId: attempt._id.toString(),
      exerciseId: attempt.exerciseId.toString(),
      exerciseTitle: exercise?.title || 'Unknown',
      attemptNumber: attempt.attemptNumber,
      score: attempt.score,
      correctCount: attempt.correctCount,
      totalPairs: attempt.totalPairs,
      passed: attempt.passed,
      allowPartialCredit: attempt.allowPartialCredit,
      passingScore: attempt.passingScore,
      timeSpent: attempt.timeSpent,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt.toISOString(),
      results: attempt.results.map((r) => ({
        columnAId: r.columnAId.toString(),
        matchedColumnBId: r.matchedColumnBId.toString(),
        correctColumnBId: r.correctColumnBId.toString(),
        correct: r.correct,
        columnAText: r.columnAText,
        matchedText: r.matchedText,
        correctText: r.correctText,
        explanation: r.explanation || null
      }))
    };
  }

  /**
   * Abandon an active session
   */
  static async abandonSession(sessionId: string, learnerId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      throw ApiError.badRequest('Invalid session ID');
    }

    const session = await MatchingSession.findById(sessionId);
    if (!session) {
      throw ApiError.notFound('Session not found');
    }

    if (session.learnerId.toString() !== learnerId) {
      throw ApiError.forbidden('Session does not belong to this learner');
    }

    if (session.status !== 'active') {
      throw ApiError.badRequest(`Session is already ${session.status}`);
    }

    session.status = 'abandoned';
    await session.save();
  }
}
