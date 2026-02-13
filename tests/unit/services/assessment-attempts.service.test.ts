// Note: Exception-aware max attempts logic is tested in assessment-attempts-exception.test.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AssessmentAttemptsService } from '@/services/progress/assessment-attempts.service';
import AssessmentAttempt from '@/models/progress/AssessmentAttempt.model';
import Assessment from '@/models/content/Assessment.model';
import Question from '@/models/assessment/Question.model';
import Department from '@/models/organization/Department.model';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('AssessmentAttemptsService - Unit Tests', () => {
  let mongoServer: MongoMemoryServer;
  let departmentId: mongoose.Types.ObjectId;
  let assessmentId: mongoose.Types.ObjectId;
  let learnerId: mongoose.Types.ObjectId;
  let enrollmentId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Create base test data
    departmentId = new mongoose.Types.ObjectId();
    learnerId = new mongoose.Types.ObjectId();
    enrollmentId = new mongoose.Types.ObjectId();

    // Create a department
    await Department.create({
      _id: departmentId,
      name: 'Test Department',
      code: 'TEST',
      isVisible: true
    });
  });

  describe('startAttempt()', () => {
    it('should create a new attempt for a published assessment', async () => {
      // Create questions
      const question1 = await Question.create({
        questionText: 'What is 2+2?',
        questionTypes: ['multiple_choice'],
        departmentId,
        points: 10,
        correctAnswers: ['4'],
        distractors: ['3', '5', '6'],
        isActive: true,
        questionBankIds: ['bank1']
      });

      const question2 = await Question.create({
        questionText: 'The sky is blue.',
        questionTypes: ['true_false'],
        departmentId,
        points: 5,
        correctAnswers: ['true'],
        trueFalseData: { correctValue: true },
        isActive: true,
        questionBankIds: ['bank1']
      });

      // Create assessment
      const assessment = await Assessment.create({
        departmentId,
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 2,
          selectionMode: 'sequential'
        },
        timing: {
          timeLimit: 1800,
          showTimer: true,
          autoSubmitOnExpiry: true
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      assessmentId = assessment._id as mongoose.Types.ObjectId;

      const result = await AssessmentAttemptsService.startAttempt(
        assessmentId.toString(),
        learnerId.toString(),
        enrollmentId.toString()
      );

      expect(result).toBeDefined();
      expect(result.assessmentId.toString()).toBe(assessmentId.toString());
      expect(result.learnerId.toString()).toBe(learnerId.toString());
      expect(result.attemptNumber).toBe(1);
      expect(result.status).toBe('in_progress');
      expect(result.questions).toHaveLength(2);
      expect(result.timing.timeLimitSeconds).toBe(1800);
    });

    it('should throw error if assessment is not published', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Draft Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 2,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: false,
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(
        AssessmentAttemptsService.startAttempt(
          assessment._id.toString(),
          learnerId.toString(),
          enrollmentId.toString()
        )
      ).rejects.toThrow('Assessment not found or not published');
    });

    it('should throw error if max attempts reached', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Limited Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 2,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      // Create 2 completed attempts
      for (let i = 1; i <= 2; i++) {
        await AssessmentAttempt.create({
          assessmentId: assessment._id,
          learnerId,
          enrollmentId,
          attemptNumber: i,
          status: 'graded',
          questions: [],
          timing: {
            startedAt: new Date(),
            lastActivityAt: new Date(),
            timeSpentSeconds: 100
          },
          scoring: {
            gradingComplete: true,
            requiresManualGrading: false
          }
        });
      }

      await expect(
        AssessmentAttemptsService.startAttempt(
          assessment._id.toString(),
          learnerId.toString(),
          enrollmentId.toString()
        )
      ).rejects.toThrow('Maximum attempts reached');
    });

    it('should throw error if another attempt is in progress', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      // Create an in-progress attempt
      await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 0
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      await expect(
        AssessmentAttemptsService.startAttempt(
          assessment._id.toString(),
          learnerId.toString(),
          enrollmentId.toString()
        )
      ).rejects.toThrow('already in progress');
    });

    it('should increment attempt number correctly', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      // Create a completed attempt
      await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.startAttempt(
        assessment._id.toString(),
        learnerId.toString(),
        enrollmentId.toString()
      );

      expect(result.attemptNumber).toBe(2);
    });
  });

  describe('getCurrentAttempt()', () => {
    it('should return the current in-progress attempt', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      const attempt = await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [{
          questionId: new mongoose.Types.ObjectId(),
          questionSnapshot: { text: 'Test question' },
          pointsPossible: 10
        }],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 50
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.getCurrentAttempt(
        assessment._id.toString(),
        learnerId.toString()
      );

      expect(result).toBeDefined();
      expect(result!._id.toString()).toBe(attempt._id.toString());
      expect(result!.status).toBe('in_progress');
    });

    it('should return null if no in-progress attempt exists', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      const result = await AssessmentAttemptsService.getCurrentAttempt(
        assessment._id.toString(),
        learnerId.toString()
      );

      expect(result).toBeNull();
    });
  });

  describe('saveProgress()', () => {
    it('should save responses for questions', async () => {
      const questionId = new mongoose.Types.ObjectId();

      // Start the attempt 2 minutes ago
      const startedAt = new Date(Date.now() - 120000);

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [{
          questionId,
          questionSnapshot: { text: 'What is 2+2?' },
          pointsPossible: 10
        }],
        timing: {
          startedAt,
          lastActivityAt: new Date(Date.now() - 60000),
          timeSpentSeconds: 60
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.saveProgress(
        attempt._id.toString(),
        [{ questionId: questionId.toString(), response: '4' }]
      );

      expect(result).toBeDefined();
      expect(result.questions[0].response).toBe('4');
      // Time spent should be recalculated from startedAt (approx 120 seconds)
      expect(result.timing.timeSpentSeconds).toBeGreaterThanOrEqual(110);
    });

    it('should throw error if attempt is not in progress', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      await expect(
        AssessmentAttemptsService.saveProgress(
          attempt._id.toString(),
          [{ questionId: new mongoose.Types.ObjectId().toString(), response: 'test' }]
        )
      ).rejects.toThrow('Attempt is not in progress');
    });

    it('should throw error if attempt not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        AssessmentAttemptsService.saveProgress(
          fakeId.toString(),
          [{ questionId: new mongoose.Types.ObjectId().toString(), response: 'test' }]
        )
      ).rejects.toThrow('Attempt not found');
    });
  });

  describe('submitAttempt()', () => {
    it('should submit attempt and auto-grade objective questions', async () => {
      const questionId1 = new mongoose.Types.ObjectId();
      const questionId2 = new mongoose.Types.ObjectId();

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [
          {
            questionId: questionId1,
            questionSnapshot: {
              questionType: 'multiple_choice',
              correctAnswer: '4'
            },
            response: '4',
            pointsPossible: 10
          },
          {
            questionId: questionId2,
            questionSnapshot: {
              questionType: 'true_false',
              correctAnswer: 'true'
            },
            response: 'false',
            pointsPossible: 5
          }
        ],
        timing: {
          startedAt: new Date(Date.now() - 300000),
          lastActivityAt: new Date(),
          timeSpentSeconds: 300
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.submitAttempt(attempt._id.toString());

      expect(result.status).toBe('graded');
      expect(result.scoring.rawScore).toBe(10); // Only first question correct
      expect(result.scoring.percentageScore).toBeCloseTo(66.67, 1);
      expect(result.scoring.gradingComplete).toBe(true);
      expect(result.questions[0].isCorrect).toBe(true);
      expect(result.questions[0].pointsEarned).toBe(10);
      expect(result.questions[1].isCorrect).toBe(false);
      expect(result.questions[1].pointsEarned).toBe(0);
    });

    it('should set requiresManualGrading for essay questions', async () => {
      const questionId = new mongoose.Types.ObjectId();

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [{
          questionId,
          questionSnapshot: {
            questionType: 'long_answer',
            maxWordCount: 500
          },
          response: 'This is my essay answer about the topic.',
          pointsPossible: 20
        }],
        timing: {
          startedAt: new Date(Date.now() - 600000),
          lastActivityAt: new Date(),
          timeSpentSeconds: 600
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.submitAttempt(attempt._id.toString());

      expect(result.status).toBe('submitted');
      expect(result.scoring.requiresManualGrading).toBe(true);
      expect(result.scoring.gradingComplete).toBe(false);
    });

    it('should throw error if attempt already submitted', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      await expect(
        AssessmentAttemptsService.submitAttempt(attempt._id.toString())
      ).rejects.toThrow('Attempt has already been submitted');
    });

    it('should auto-grade short answer questions with exact match', async () => {
      const questionId = new mongoose.Types.ObjectId();

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [{
          questionId,
          questionSnapshot: {
            questionType: 'short_answer',
            correctAnswers: ['Paris', 'paris', 'PARIS']
          },
          response: 'paris',
          pointsPossible: 10
        }],
        timing: {
          startedAt: new Date(Date.now() - 120000),
          lastActivityAt: new Date(),
          timeSpentSeconds: 120
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.submitAttempt(attempt._id.toString());

      expect(result.questions[0].isCorrect).toBe(true);
      expect(result.questions[0].pointsEarned).toBe(10);
    });

    it('should create projected short-answer grading for near-threshold responses', async () => {
      const questionId = new mongoose.Types.ObjectId();

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [{
          questionId,
          questionSnapshot: {
            questionType: 'short_answer',
            correctAnswers: ['paris'],
            matchThreshold: 90
          },
          response: 'pariss',
          pointsPossible: 10
        }],
        timing: {
          startedAt: new Date(Date.now() - 120000),
          lastActivityAt: new Date(),
          timeSpentSeconds: 120
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.submitAttempt(attempt._id.toString());

      expect(result.status).toBe('submitted');
      expect(result.scoring.gradingComplete).toBe(false);
      expect(result.scoring.requiresManualGrading).toBe(true);
      expect(result.questions[0].gradedAt).toBeUndefined();
      expect(result.questions[0].projectedCorrect).toBe(true);
      expect(result.questions[0].projectedMethod).toBe('short_answer_fuzzy');
      expect(result.questions[0].requiresInstructorReview).toBe(true);
      expect(result.questions[0].projectedScore).toBe(10);
    });

    it('should create projected long-answer grading using heuristic signals', async () => {
      const questionId = new mongoose.Types.ObjectId();

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [{
          questionId,
          questionSnapshot: {
            questionType: 'long_answer',
            modelAnswer: 'The mitochondria is responsible for energy production and ATP generation in the cell.',
            rubric: 'Discuss energy production and ATP generation clearly.'
          },
          response: 'Mitochondria helps with energy production and ATP in cells.',
          pointsPossible: 20
        }],
        timing: {
          startedAt: new Date(Date.now() - 120000),
          lastActivityAt: new Date(),
          timeSpentSeconds: 120
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.submitAttempt(attempt._id.toString());

      expect(result.status).toBe('submitted');
      expect(result.scoring.requiresManualGrading).toBe(true);
      expect(result.questions[0].gradedAt).toBeUndefined();
      expect(result.questions[0].projectedMethod).toBe('long_answer_heuristic');
      expect(result.questions[0].projectedConfidence).toBeDefined();
      expect(result.questions[0].requiresInstructorReview).toBe(true);
      expect(result.questions[0].projectedAt).toBeDefined();
    });
  });

  describe('getAttemptResults()', () => {
    it('should return results for a graded attempt', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      const attempt = await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [{
          questionId: new mongoose.Types.ObjectId(),
          questionSnapshot: {
            questionTypes: ['multiple_choice'],
            questionText: 'What is 2+2?',
            correctAnswer: '4'
          },
          response: '4',
          isCorrect: true,
          pointsEarned: 10,
          pointsPossible: 10,
          gradedAt: new Date()
        }],
        timing: {
          startedAt: new Date(Date.now() - 300000),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 300
        },
        scoring: {
          rawScore: 10,
          percentageScore: 100,
          passed: true,
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.getAttemptResults(
        attempt._id.toString(),
        learnerId.toString()
      );

      expect(result).toBeDefined();
      expect(result.scoring.rawScore).toBe(10);
      expect(result.scoring.percentageScore).toBe(100);
      expect(result.scoring.passed).toBe(true);
    });

    it('should hide correct answers based on feedback settings', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'never',
          partialCredit: false
        },
        feedback: {
          showFeedback: false,
          feedbackTiming: 'after_submit',
          showExplanations: false
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      const attempt = await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [{
          questionId: new mongoose.Types.ObjectId(),
          questionSnapshot: {
            questionTypes: ['multiple_choice'],
            questionText: 'What is 2+2?',
            correctAnswer: '4'
          },
          response: '3',
          isCorrect: false,
          pointsEarned: 0,
          pointsPossible: 10,
          gradedAt: new Date()
        }],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          rawScore: 0,
          percentageScore: 0,
          passed: false,
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.getAttemptResults(
        attempt._id.toString(),
        learnerId.toString()
      );

      expect(result.showCorrectAnswers).toBe(false);
    });

    it('should hide feedback until grading is complete', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Manual Grade Assessment',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_grading',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      const attempt = await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [{
          questionId: new mongoose.Types.ObjectId(),
          questionSnapshot: {
            questionTypes: ['long_answer'],
            questionText: 'Explain the concept.'
          },
          response: 'Learner response',
          pointsEarned: 8,
          pointsPossible: 10,
          feedback: 'Staff private feedback',
          gradedAt: new Date(),
          gradedBy: new mongoose.Types.ObjectId()
        }],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          rawScore: 8,
          percentageScore: 80,
          passed: true,
          gradingComplete: false,
          requiresManualGrading: true,
          overallFeedback: 'Overall note before completion'
        }
      });

      const result = await AssessmentAttemptsService.getAttemptResults(
        attempt._id.toString(),
        learnerId.toString()
      );

      expect(result.questions[0].feedback).toBeUndefined();
      expect(result.scoring.overallFeedback).toBeUndefined();
    });

    it('should show feedback once grading is complete', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Complete Grade Assessment',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_grading',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      const attempt = await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [{
          questionId: new mongoose.Types.ObjectId(),
          questionSnapshot: {
            questionTypes: ['long_answer'],
            questionText: 'Explain the concept.'
          },
          response: 'Learner response',
          pointsEarned: 8,
          pointsPossible: 10,
          feedback: 'Visible feedback',
          gradedAt: new Date(),
          gradedBy: new mongoose.Types.ObjectId()
        }],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          rawScore: 8,
          percentageScore: 80,
          passed: true,
          gradingComplete: true,
          requiresManualGrading: false,
          overallFeedback: 'Visible overall feedback'
        }
      });

      const result = await AssessmentAttemptsService.getAttemptResults(
        attempt._id.toString(),
        learnerId.toString()
      );

      expect(result.questions[0].feedback).toBe('Visible feedback');
      expect(result.scoring.overallFeedback).toBe('Visible overall feedback');
    });

    it('should throw error if learner does not own the attempt', async () => {
      const otherLearnerId = new mongoose.Types.ObjectId();

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId: otherLearnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          rawScore: 10,
          percentageScore: 100,
          passed: true,
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      await expect(
        AssessmentAttemptsService.getAttemptResults(
          attempt._id.toString(),
          learnerId.toString()
        )
      ).rejects.toThrow('Access denied');
    });
  });

  describe('listAttempts()', () => {
    it('should list all attempts for an assessment', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      // Create multiple attempts
      for (let i = 1; i <= 3; i++) {
        await AssessmentAttempt.create({
          assessmentId: assessment._id,
          learnerId,
          enrollmentId,
          attemptNumber: i,
          status: i === 3 ? 'in_progress' : 'graded',
          questions: [],
          timing: {
            startedAt: new Date(),
            lastActivityAt: new Date(),
            timeSpentSeconds: 100 * i
          },
          scoring: {
            rawScore: i === 3 ? undefined : 80,
            percentageScore: i === 3 ? undefined : 80,
            passed: i !== 3,
            gradingComplete: i !== 3,
            requiresManualGrading: false
          }
        });
      }

      const result = await AssessmentAttemptsService.listAttempts(
        assessment._id.toString()
      );

      expect(result.attempts).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
    });

    it('should filter attempts by status', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      // Create attempts with different statuses
      await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId: new mongoose.Types.ObjectId(),
        enrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 50
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.listAttempts(
        assessment._id.toString(),
        undefined,
        { status: 'graded' }
      );

      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].status).toBe('graded');
    });

    it('should filter attempts by learner', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      const otherLearnerId = new mongoose.Types.ObjectId();

      await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId: otherLearnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      const result = await AssessmentAttemptsService.listAttempts(
        assessment._id.toString(),
        learnerId.toString()
      );

      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].learnerId.toString()).toBe(learnerId.toString());
    });

    it('should paginate results', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      // Create 5 attempts
      for (let i = 1; i <= 5; i++) {
        await AssessmentAttempt.create({
          assessmentId: assessment._id,
          learnerId: new mongoose.Types.ObjectId(),
          enrollmentId,
          attemptNumber: 1,
          status: 'graded',
          questions: [],
          timing: {
            startedAt: new Date(),
            lastActivityAt: new Date(),
            timeSpentSeconds: 100
          },
          scoring: {
            gradingComplete: true,
            requiresManualGrading: false
          }
        });
      }

      const result = await AssessmentAttemptsService.listAttempts(
        assessment._id.toString(),
        undefined,
        { page: 1, limit: 2 }
      );

      expect(result.attempts).toHaveLength(2);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });
  });

  describe('listAttemptSummaries()', () => {
    it('should include canonical course context when module linkage exists', async () => {
      const createdBy = new mongoose.Types.ObjectId();
      const moduleId = new mongoose.Types.ObjectId();

      const canonicalCourse = await CanonicalCourse.create({
        code: 'EMDR101',
        departmentId,
        totalVersions: 1,
        createdBy
      });

      const courseVersion = await CourseVersion.create({
        canonicalCourseId: canonicalCourse._id,
        version: 1,
        title: 'EMDR Foundations',
        credits: 3,
        duration: 90,
        createdBy,
        status: 'published',
        isLatest: true
      });

      await CourseVersionModule.create({
        courseVersionId: courseVersion._id,
        moduleId,
        order: 1
      });

      const assessment = await Assessment.create({
        departmentId,
        title: 'Contextualized Assessment',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy
      });

      const attempt = await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        moduleId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 300
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      const result = await AssessmentAttemptsService.listAttemptSummaries();
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].id).toBe(attempt._id.toString());
      expect(result.attempts[0].courseId).toBe(canonicalCourse._id.toString());
      expect(result.attempts[0].courseCode).toBe('EMDR101');
      expect(result.attempts[0].courseName).toBe('EMDR Foundations');
      expect(result.attempts[0].courseVersionId).toBe(courseVersion._id.toString());
      expect(result.attempts[0].courseContexts).toEqual([
        {
          courseId: canonicalCourse._id.toString(),
          courseCode: 'EMDR101',
          courseName: 'EMDR Foundations',
          courseVersionId: courseVersion._id.toString()
        }
      ]);
    });

    it('should prefer enrollment course when module maps to multiple course contexts', async () => {
      const createdBy = new mongoose.Types.ObjectId();
      const moduleId = new mongoose.Types.ObjectId();

      const primaryCourse = await CanonicalCourse.create({
        code: 'CBT201',
        departmentId,
        totalVersions: 1,
        createdBy
      });
      const secondaryCourse = await CanonicalCourse.create({
        code: 'EMDR301',
        departmentId,
        totalVersions: 1,
        createdBy
      });

      const primaryVersion = await CourseVersion.create({
        canonicalCourseId: primaryCourse._id,
        version: 1,
        title: 'CBT Advanced',
        credits: 3,
        duration: 90,
        createdBy,
        status: 'published',
        isLatest: true
      });
      const secondaryVersion = await CourseVersion.create({
        canonicalCourseId: secondaryCourse._id,
        version: 1,
        title: 'EMDR Advanced',
        credits: 3,
        duration: 90,
        createdBy,
        status: 'published',
        isLatest: true
      });

      await CourseVersionModule.create({ courseVersionId: primaryVersion._id, moduleId, order: 1 });
      await CourseVersionModule.create({ courseVersionId: secondaryVersion._id, moduleId, order: 1 });

      const enrollment = await Enrollment.create({
        learnerId,
        programId: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date(),
        metadata: {
          courseId: secondaryCourse._id.toString()
        }
      });

      const assessment = await Assessment.create({
        departmentId,
        title: 'Cross-mapped Assessment',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy
      });

      await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId: enrollment._id,
        moduleId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 120
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      const result = await AssessmentAttemptsService.listAttemptSummaries();
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].courseId).toBe(secondaryCourse._id.toString());
      expect(result.attempts[0].courseVersionId).toBe(secondaryVersion._id.toString());
      expect(result.attempts[0].courseContexts).toHaveLength(2);
    });

    it('should omit canonical course context when no module linkage exists', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Unlinked Assessment',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 120
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      const result = await AssessmentAttemptsService.listAttemptSummaries();
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].courseId).toBeUndefined();
      expect(result.attempts[0].courseCode).toBeUndefined();
      expect(result.attempts[0].courseName).toBeUndefined();
      expect(result.attempts[0].courseVersionId).toBeUndefined();
    });
  });

  describe('gradeAttemptBatch()', () => {
    it('should grade multiple questions atomically and finalize attempt when complete', async () => {
      const graderId = new mongoose.Types.ObjectId();
      const assessment = await Assessment.create({
        departmentId,
        title: 'Batch Grade Assessment',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 2,
          selectionMode: 'sequential'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 60,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      const questionOneId = new mongoose.Types.ObjectId();
      const questionTwoId = new mongoose.Types.ObjectId();
      const attempt = await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        learningUnitId: new mongoose.Types.ObjectId(),
        attemptNumber: 1,
        status: 'submitted',
        questions: [
          {
            questionId: questionOneId,
            questionSnapshot: { questionType: 'long_answer', learningUnitQuestionId: new mongoose.Types.ObjectId() },
            pointsPossible: 20,
            projectedScore: 20,
            projectedCorrect: true,
            projectedConfidence: 0.86,
            projectedMethod: 'long_answer_heuristic',
            projectedReason: 'Projected as correct pending instructor verification',
            requiresInstructorReview: true,
            projectedAt: new Date()
          },
          {
            questionId: questionTwoId,
            questionSnapshot: { questionType: 'long_answer' },
            pointsPossible: 20,
            projectedScore: 16,
            projectedCorrect: false,
            projectedConfidence: 0.54,
            projectedMethod: 'long_answer_heuristic',
            projectedReason: 'Projected partial credit pending instructor verification',
            requiresInstructorReview: true,
            projectedAt: new Date()
          }
        ],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 200
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      const result = await AssessmentAttemptsService.gradeAttemptBatch(
        attempt._id.toString(),
        {
          questionGrades: [
            { questionIndex: 0, scoreEarned: 18, feedback: 'Strong response' },
            { questionIndex: 1, scoreEarned: 16 }
          ],
          overallFeedback: 'Great work overall',
          notifyLearner: true
        },
        graderId.toString()
      );

      expect(result.status).toBe('graded');
      expect(result.scoring.gradingComplete).toBe(true);
      expect(result.scoring.rawScore).toBe(34);
      expect(result.scoring.overallFeedback).toBe('Great work overall');
      expect(result.notification.deferred).toBe(false);
      expect(result.notification.notifiedAt).toBeDefined();
      expect(result.questionGrades).toHaveLength(2);
      expect(result.questionGrades[0].questionIndex).toBe(0);
      expect(result.questionGrades[0].learningUnitQuestionId).toBeDefined();

      const gradedAttempt = await AssessmentAttempt.findById(attempt._id);
      expect(gradedAttempt?.questions[0].requiresInstructorReview).toBe(false);
      expect(gradedAttempt?.questions[0].reviewedAt).toBeDefined();
      expect(gradedAttempt?.questions[1].requiresInstructorReview).toBe(false);
      expect(gradedAttempt?.questions[1].reviewedAt).toBeDefined();
    });

    it('should enforce atomic behavior when any grade is invalid', async () => {
      const graderId = new mongoose.Types.ObjectId();
      const questionOneId = new mongoose.Types.ObjectId();
      const questionTwoId = new mongoose.Types.ObjectId();

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [
          { questionId: questionOneId, questionSnapshot: { questionType: 'long_answer' }, pointsPossible: 20 },
          { questionId: questionTwoId, questionSnapshot: { questionType: 'long_answer' }, pointsPossible: 20 }
        ],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      await expect(
        AssessmentAttemptsService.gradeAttemptBatch(
          attempt._id.toString(),
          {
            questionGrades: [
              { questionIndex: 0, scoreEarned: 10 },
              { questionIndex: 1, scoreEarned: 100 }
            ]
          },
          graderId.toString()
        )
      ).rejects.toThrow('cannot exceed points possible');

      const unchangedAttempt = await AssessmentAttempt.findById(attempt._id);
      expect(unchangedAttempt?.questions[0].gradedAt).toBeUndefined();
      expect(unchangedAttempt?.questions[0].pointsEarned).toBeUndefined();
      expect(unchangedAttempt?.scoring.overallFeedback).toBeUndefined();
    });

    it('should defer learner notification until grading is complete', async () => {
      const graderId = new mongoose.Types.ObjectId();
      const questionOneId = new mongoose.Types.ObjectId();
      const questionTwoId = new mongoose.Types.ObjectId();

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [
          { questionId: questionOneId, questionSnapshot: { questionType: 'long_answer' }, pointsPossible: 20 },
          { questionId: questionTwoId, questionSnapshot: { questionType: 'long_answer' }, pointsPossible: 20 }
        ],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      const partialResult = await AssessmentAttemptsService.gradeAttemptBatch(
        attempt._id.toString(),
        {
          questionGrades: [{ questionIndex: 0, scoreEarned: 12 }],
          notifyLearner: true
        },
        graderId.toString()
      );

      expect(partialResult.status).toBe('submitted');
      expect(partialResult.notification.deferred).toBe(true);

      const finalResult = await AssessmentAttemptsService.gradeAttemptBatch(
        attempt._id.toString(),
        {
          questionGrades: [{ questionIndex: 1, scoreEarned: 14 }]
        },
        graderId.toString()
      );

      expect(finalResult.status).toBe('graded');
      expect(finalResult.notification.notifiedAt).toBeDefined();
      expect(finalResult.notification.deferred).toBe(false);
    });
  });

  describe('gradeQuestion()', () => {
    it('should manually grade an essay question', async () => {
      const questionId = new mongoose.Types.ObjectId();
      const graderId = new mongoose.Types.ObjectId();

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [{
          questionId,
          questionSnapshot: {
            questionType: 'long_answer',
            maxWordCount: 500
          },
          response: 'This is a well-written essay response.',
          pointsPossible: 20
        }],
        timing: {
          startedAt: new Date(Date.now() - 600000),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 600
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      const result = await AssessmentAttemptsService.gradeQuestion(
        attempt._id.toString(),
        0,
        18,
        'Excellent essay with clear arguments.',
        graderId.toString()
      );

      expect(result.questions[0].pointsEarned).toBe(18);
      expect(result.questions[0].feedback).toBe('Excellent essay with clear arguments.');
      expect(result.questions[0].gradedBy.toString()).toBe(graderId.toString());
      expect(result.questions[0].gradedAt).toBeDefined();
    });

    it('should update attempt to graded when all questions are graded', async () => {
      const questionId = new mongoose.Types.ObjectId();
      const graderId = new mongoose.Types.ObjectId();

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [{
          questionId,
          questionSnapshot: {
            questionType: 'long_answer',
            maxWordCount: 500
          },
          response: 'Essay response.',
          pointsPossible: 20
        }],
        timing: {
          startedAt: new Date(Date.now() - 600000),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 600
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      const result = await AssessmentAttemptsService.gradeQuestion(
        attempt._id.toString(),
        0,
        15,
        'Good work.',
        graderId.toString()
      );

      expect(result.status).toBe('graded');
      expect(result.scoring.gradingComplete).toBe(true);
      expect(result.scoring.rawScore).toBe(15);
      expect(result.scoring.percentageScore).toBe(75);
    });

    it('should throw error if score exceeds points possible', async () => {
      const questionId = new mongoose.Types.ObjectId();

      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [{
          questionId,
          questionSnapshot: {
            questionTypes: ['long_answer']
          },
          response: 'Essay response.',
          pointsPossible: 20
        }],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      await expect(
        AssessmentAttemptsService.gradeQuestion(
          attempt._id.toString(),
          0,
          25, // More than 20 points possible
          'Feedback',
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow('Score cannot exceed points possible');
    });

    it('should throw error for invalid question index', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [{
          questionId: new mongoose.Types.ObjectId(),
          questionSnapshot: { questionType: 'long_answer' },
          response: 'Essay response.',
          pointsPossible: 20
        }],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          submittedAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      await expect(
        AssessmentAttemptsService.gradeQuestion(
          attempt._id.toString(),
          5, // Invalid index
          15,
          'Feedback',
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow('Invalid question index');
    });

    it('should throw error if attempt is not submitted', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: new mongoose.Types.ObjectId(),
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [{
          questionId: new mongoose.Types.ObjectId(),
          questionSnapshot: { questionType: 'long_answer' },
          pointsPossible: 20
        }],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 100
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: true
        }
      });

      await expect(
        AssessmentAttemptsService.gradeQuestion(
          attempt._id.toString(),
          0,
          15,
          'Feedback',
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow('Attempt must be submitted before grading');
    });
  });

  describe('Time limit enforcement', () => {
    it('should auto-submit when time limit is exceeded on save', async () => {
      const assessment = await Assessment.create({
        departmentId,
        title: 'Timed Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          timeLimit: 60, // 60 seconds
          showTimer: true,
          autoSubmitOnExpiry: true
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      const questionId = new mongoose.Types.ObjectId();

      // Create attempt that started 2 minutes ago (exceeds 60 second limit)
      const attempt = await AssessmentAttempt.create({
        assessmentId: assessment._id,
        learnerId,
        enrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [{
          questionId,
          questionSnapshot: {
            questionTypes: ['multiple_choice'],
            correctAnswer: '4'
          },
          pointsPossible: 10
        }],
        timing: {
          startedAt: new Date(Date.now() - 120000), // 2 minutes ago
          lastActivityAt: new Date(Date.now() - 60000),
          timeSpentSeconds: 60,
          timeLimitSeconds: 60
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      // Trying to save progress should fail because time limit exceeded
      await expect(
        AssessmentAttemptsService.saveProgress(
          attempt._id.toString(),
          [{ questionId: questionId.toString(), response: '4' }]
        )
      ).rejects.toThrow('Time limit exceeded');
    });
  });

  describe('Attempt lifecycle integration', () => {
    it('should handle complete attempt flow: start -> save -> submit -> grade', async () => {
      // Create question
      const question = await Question.create({
        questionText: 'Explain the importance of testing.',
        questionTypes: ['long_answer'],
        departmentId,
        points: 20,
        correctAnswers: [],
        maxWordCount: 500,
        isActive: true,
        questionBankIds: ['bank1']
      });

      // Create assessment
      const assessment = await Assessment.create({
        departmentId,
        title: 'Essay Test',
        style: 'exam',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 1,
          selectionMode: 'sequential'
        },
        timing: {
          timeLimit: 3600,
          showTimer: true,
          autoSubmitOnExpiry: true
        },
        attempts: {
          maxAttempts: 1,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 60,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_grading',
          showExplanations: true
        },
        isPublished: true,
        createdBy: new mongoose.Types.ObjectId()
      });

      // Step 1: Start attempt
      const startedAttempt = await AssessmentAttemptsService.startAttempt(
        assessment._id.toString(),
        learnerId.toString(),
        enrollmentId.toString()
      );

      expect(startedAttempt.status).toBe('in_progress');
      expect(startedAttempt.attemptNumber).toBe(1);

      // Step 2: Save progress
      const questionIdStr = startedAttempt.questions[0].questionId.toString();
      const savedAttempt = await AssessmentAttemptsService.saveProgress(
        startedAttempt._id.toString(),
        [{
          questionId: questionIdStr,
          response: 'Testing is crucial for software quality and reliability.'
        }]
      );

      expect(savedAttempt.questions[0].response).toBeDefined();

      // Step 3: Submit attempt
      const submittedAttempt = await AssessmentAttemptsService.submitAttempt(
        startedAttempt._id.toString()
      );

      expect(submittedAttempt.status).toBe('submitted');
      expect(submittedAttempt.scoring.requiresManualGrading).toBe(true);

      // Step 4: Grade the essay
      const graderId = new mongoose.Types.ObjectId();
      const gradedAttempt = await AssessmentAttemptsService.gradeQuestion(
        startedAttempt._id.toString(),
        0,
        16,
        'Good explanation but could include more examples.',
        graderId.toString()
      );

      expect(gradedAttempt.status).toBe('graded');
      expect(gradedAttempt.scoring.rawScore).toBe(16);
      expect(gradedAttempt.scoring.percentageScore).toBe(80);
      expect(gradedAttempt.scoring.passed).toBe(true);
      expect(gradedAttempt.scoring.gradingComplete).toBe(true);
    });
  });
});
