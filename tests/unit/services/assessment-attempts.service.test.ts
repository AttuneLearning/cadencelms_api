import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AssessmentAttemptsService } from '@/services/progress/assessment-attempts.service';
import AssessmentAttempt from '@/models/progress/AssessmentAttempt.model';
import Assessment from '@/models/content/Assessment.model';
import Question from '@/models/assessment/Question.model';
import Department from '@/models/organization/Department.model';
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
        questionType: 'multiple-choice',
        departmentId,
        points: 10,
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        isActive: true,
        questionBankIds: ['bank1']
      });

      const question2 = await Question.create({
        questionText: 'The sky is blue.',
        questionType: 'true-false',
        departmentId,
        points: 5,
        correctAnswer: 'true',
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
              questionType: 'multiple-choice',
              correctAnswer: '4'
            },
            response: '4',
            pointsPossible: 10
          },
          {
            questionId: questionId2,
            questionSnapshot: {
              questionType: 'true-false',
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
            questionType: 'essay',
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
            questionType: 'short-answer',
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
            questionType: 'multiple-choice',
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
            questionType: 'multiple-choice',
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
            questionType: 'essay',
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
            questionType: 'essay',
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
            questionType: 'essay'
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
          questionSnapshot: { questionType: 'essay' },
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
          questionSnapshot: { questionType: 'essay' },
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
            questionType: 'multiple-choice',
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
        questionType: 'essay',
        departmentId,
        points: 20,
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
