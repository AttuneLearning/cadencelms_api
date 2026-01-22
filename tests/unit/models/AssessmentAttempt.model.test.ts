import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AssessmentAttempt from '@/models/progress/AssessmentAttempt.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('AssessmentAttempt Model', () => {
  let mongoServer: MongoMemoryServer;
  let testAssessmentId: mongoose.Types.ObjectId;
  let testLearnerId: mongoose.Types.ObjectId;
  let testEnrollmentId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testAssessmentId = new mongoose.Types.ObjectId();
    testLearnerId = new mongoose.Types.ObjectId();
    testEnrollmentId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await AssessmentAttempt.deleteMany({});
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create valid assessment attempt with all required fields', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
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

      expect(attempt.assessmentId).toEqual(testAssessmentId);
      expect(attempt.learnerId).toEqual(testLearnerId);
      expect(attempt.enrollmentId).toEqual(testEnrollmentId);
      expect(attempt.attemptNumber).toBe(1);
      expect(attempt.status).toBe('in_progress');
    });

    it('should require assessmentId field', async () => {
      const attempt = new AssessmentAttempt({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
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

      await expect(attempt.save()).rejects.toThrow(/assessmentId/);
    });

    it('should require learnerId field', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        enrollmentId: testEnrollmentId,
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

      await expect(attempt.save()).rejects.toThrow(/learnerId/);
    });

    it('should require enrollmentId field', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
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

      await expect(attempt.save()).rejects.toThrow(/enrollmentId/);
    });

    it('should require attemptNumber field', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
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

      await expect(attempt.save()).rejects.toThrow(/attemptNumber/);
    });

    it('should require status field', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
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

      await expect(attempt.save()).rejects.toThrow(/status/);
    });

    it('should validate attemptNumber is positive', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 0,
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

      await expect(attempt.save()).rejects.toThrow(/attemptNumber/);
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept valid status: in_progress', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
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

      expect(attempt.status).toBe('in_progress');
    });

    it('should accept valid status: submitted', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'submitted',
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

      expect(attempt.status).toBe('submitted');
    });

    it('should accept valid status: graded', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 0
        },
        scoring: {
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      expect(attempt.status).toBe('graded');
    });

    it('should accept valid status: abandoned', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'abandoned',
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

      expect(attempt.status).toBe('abandoned');
    });

    it('should reject invalid status', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'invalid-status',
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

      await expect(attempt.save()).rejects.toThrow();
    });
  });

  describe('Questions Array Subdocument', () => {
    it('should store questions with all fields', async () => {
      const questionId = new mongoose.Types.ObjectId();
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [
          {
            questionId: questionId,
            questionSnapshot: {
              title: 'What is 2+2?',
              type: 'multiple_choice',
              options: ['2', '3', '4', '5']
            },
            response: '4',
            isCorrect: true,
            pointsEarned: 10,
            pointsPossible: 10,
            gradedAt: new Date(),
            gradedBy: new mongoose.Types.ObjectId(),
            feedback: 'Correct answer!'
          }
        ],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 120
        },
        scoring: {
          rawScore: 10,
          percentageScore: 100,
          passed: true,
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      expect(attempt.questions).toHaveLength(1);
      expect(attempt.questions[0].questionId).toEqual(questionId);
      expect(attempt.questions[0].questionSnapshot.title).toBe('What is 2+2?');
      expect(attempt.questions[0].response).toBe('4');
      expect(attempt.questions[0].isCorrect).toBe(true);
      expect(attempt.questions[0].pointsEarned).toBe(10);
      expect(attempt.questions[0].pointsPossible).toBe(10);
      expect(attempt.questions[0].feedback).toBe('Correct answer!');
    });

    it('should require questionId in questions', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [
          {
            questionSnapshot: { title: 'Test question' },
            pointsPossible: 10
          }
        ],
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

      await expect(attempt.save()).rejects.toThrow(/questionId/);
    });

    it('should require pointsPossible in questions', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [
          {
            questionId: new mongoose.Types.ObjectId(),
            questionSnapshot: { title: 'Test question' }
          }
        ],
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

      await expect(attempt.save()).rejects.toThrow(/pointsPossible/);
    });

    it('should allow multiple questions', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [
          {
            questionId: new mongoose.Types.ObjectId(),
            questionSnapshot: { title: 'Question 1' },
            pointsPossible: 10
          },
          {
            questionId: new mongoose.Types.ObjectId(),
            questionSnapshot: { title: 'Question 2' },
            pointsPossible: 15
          },
          {
            questionId: new mongoose.Types.ObjectId(),
            questionSnapshot: { title: 'Question 3' },
            pointsPossible: 20
          }
        ],
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

      expect(attempt.questions).toHaveLength(3);
      expect(attempt.questions[0].pointsPossible).toBe(10);
      expect(attempt.questions[1].pointsPossible).toBe(15);
      expect(attempt.questions[2].pointsPossible).toBe(20);
    });
  });

  describe('Timing Subdocument', () => {
    it('should require startedAt in timing', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [],
        timing: {
          lastActivityAt: new Date(),
          timeSpentSeconds: 0
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      await expect(attempt.save()).rejects.toThrow(/startedAt/);
    });

    it('should require lastActivityAt in timing', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [],
        timing: {
          startedAt: new Date(),
          timeSpentSeconds: 0
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      await expect(attempt.save()).rejects.toThrow(/lastActivityAt/);
    });

    it('should default timeSpentSeconds to 0 in timing if not provided', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date()
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      expect(attempt.timing.timeSpentSeconds).toBe(0);
    });

    it('should store all timing fields', async () => {
      const startedAt = new Date('2025-01-01T10:00:00Z');
      const submittedAt = new Date('2025-01-01T11:00:00Z');
      const lastActivityAt = new Date('2025-01-01T10:59:00Z');

      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'submitted',
        questions: [],
        timing: {
          startedAt: startedAt,
          lastActivityAt: lastActivityAt,
          submittedAt: submittedAt,
          timeSpentSeconds: 3540,
          timeLimitSeconds: 3600
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      expect(attempt.timing.startedAt).toEqual(startedAt);
      expect(attempt.timing.lastActivityAt).toEqual(lastActivityAt);
      expect(attempt.timing.submittedAt).toEqual(submittedAt);
      expect(attempt.timing.timeSpentSeconds).toBe(3540);
      expect(attempt.timing.timeLimitSeconds).toBe(3600);
    });

    it('should validate timeSpentSeconds is non-negative', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: -100
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      await expect(attempt.save()).rejects.toThrow(/timeSpentSeconds/);
    });
  });

  describe('Scoring Subdocument', () => {
    it('should require gradingComplete in scoring', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 0
        },
        scoring: {
          requiresManualGrading: false
        }
      });

      await expect(attempt.save()).rejects.toThrow(/gradingComplete/);
    });

    it('should require requiresManualGrading in scoring', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 0
        },
        scoring: {
          gradingComplete: false
        }
      });

      await expect(attempt.save()).rejects.toThrow(/requiresManualGrading/);
    });

    it('should store all scoring fields', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 300
        },
        scoring: {
          rawScore: 85,
          percentageScore: 85,
          passed: true,
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      expect(attempt.scoring.rawScore).toBe(85);
      expect(attempt.scoring.percentageScore).toBe(85);
      expect(attempt.scoring.passed).toBe(true);
      expect(attempt.scoring.gradingComplete).toBe(true);
      expect(attempt.scoring.requiresManualGrading).toBe(false);
    });

    it('should validate percentageScore range', async () => {
      const attempt = new AssessmentAttempt({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 300
        },
        scoring: {
          percentageScore: 150,
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      await expect(attempt.save()).rejects.toThrow(/percentageScore/);
    });
  });

  describe('Optional Fields', () => {
    it('should allow optional moduleId field', async () => {
      const moduleId = new mongoose.Types.ObjectId();
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        moduleId: moduleId,
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

      expect(attempt.moduleId).toEqual(moduleId);
    });

    it('should allow optional learningUnitId field', async () => {
      const learningUnitId = new mongoose.Types.ObjectId();
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        learningUnitId: learningUnitId,
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

      expect(attempt.learningUnitId).toEqual(learningUnitId);
    });
  });

  describe('Default Values', () => {
    it('should default timeSpentSeconds to 0', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'in_progress',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date()
        },
        scoring: {
          gradingComplete: false,
          requiresManualGrading: false
        }
      });

      expect(attempt.timing.timeSpentSeconds).toBe(0);
    });

    it('should auto-generate timestamps', async () => {
      const attempt = await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
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

      expect(attempt.createdAt).toBeDefined();
      expect(attempt.updatedAt).toBeDefined();
      expect(attempt.createdAt).toBeInstanceOf(Date);
      expect(attempt.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Indexes', () => {
    it('should allow compound index on assessmentId, learnerId, attemptNumber', async () => {
      await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
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

      const indexes = await AssessmentAttempt.collection.getIndexes();
      const hasCompoundIndex = Object.keys(indexes).some(key =>
        key.includes('assessmentId') && key.includes('learnerId') && key.includes('attemptNumber')
      );

      expect(hasCompoundIndex).toBe(true);
    });

    it('should find attempts by learnerId and status efficiently', async () => {
      const learner2 = new mongoose.Types.ObjectId();

      await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
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

      await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: learner2,
        enrollmentId: new mongoose.Types.ObjectId(),
        attemptNumber: 1,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 300
        },
        scoring: {
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      const attempts = await AssessmentAttempt.find({
        learnerId: testLearnerId,
        status: 'in_progress'
      });

      expect(attempts).toHaveLength(1);
      expect(attempts[0].learnerId).toEqual(testLearnerId);
    });

    it('should find attempts by assessmentId and status efficiently', async () => {
      const assessment2 = new mongoose.Types.ObjectId();

      await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
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

      await AssessmentAttempt.create({
        assessmentId: assessment2,
        learnerId: new mongoose.Types.ObjectId(),
        enrollmentId: new mongoose.Types.ObjectId(),
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

      const attempts = await AssessmentAttempt.find({
        assessmentId: testAssessmentId,
        status: 'in_progress'
      });

      expect(attempts).toHaveLength(1);
      expect(attempts[0].assessmentId).toEqual(testAssessmentId);
    });

    it('should find attempts by enrollmentId efficiently', async () => {
      const enrollment2 = new mongoose.Types.ObjectId();

      await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
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

      await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: new mongoose.Types.ObjectId(),
        enrollmentId: enrollment2,
        attemptNumber: 1,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 300
        },
        scoring: {
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      const attempts = await AssessmentAttempt.find({ enrollmentId: testEnrollmentId });

      expect(attempts).toHaveLength(1);
      expect(attempts[0].enrollmentId).toEqual(testEnrollmentId);
    });
  });

  describe('Query Methods', () => {
    it('should find multiple attempts for same assessment and learner', async () => {
      await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 1,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 300
        },
        scoring: {
          rawScore: 60,
          percentageScore: 60,
          passed: false,
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      await AssessmentAttempt.create({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        attemptNumber: 2,
        status: 'graded',
        questions: [],
        timing: {
          startedAt: new Date(),
          lastActivityAt: new Date(),
          timeSpentSeconds: 400
        },
        scoring: {
          rawScore: 85,
          percentageScore: 85,
          passed: true,
          gradingComplete: true,
          requiresManualGrading: false
        }
      });

      const attempts = await AssessmentAttempt.find({
        assessmentId: testAssessmentId,
        learnerId: testLearnerId
      }).sort({ attemptNumber: 1 });

      expect(attempts).toHaveLength(2);
      expect(attempts[0].attemptNumber).toBe(1);
      expect(attempts[0].scoring.passed).toBe(false);
      expect(attempts[1].attemptNumber).toBe(2);
      expect(attempts[1].scoring.passed).toBe(true);
    });
  });
});
