import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Assessment from '@/models/content/Assessment.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Assessment Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Assessment.deleteMany({});
  });

  describe('Required Fields Validation', () => {
    it('should create a valid assessment with required fields', async () => {
      const departmentId = new mongoose.Types.ObjectId();
      const createdBy = new mongoose.Types.ObjectId();

      const assessment = await Assessment.create({
        departmentId,
        title: 'Midterm Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy
      });

      expect(assessment.departmentId).toEqual(departmentId);
      expect(assessment.title).toBe('Midterm Quiz');
      expect(assessment.style).toBe('quiz');
      expect(assessment.createdBy).toEqual(createdBy);
    });

    it('should require departmentId field', async () => {
      const assessment = new Assessment({
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/departmentId/);
    });

    it('should require title field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/title/);
    });

    it('should require style field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/style/);
    });

    it('should require createdBy field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        }
      });

      await expect(assessment.save()).rejects.toThrow(/createdBy/);
    });

    it('should trim title whitespace', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: '  Test Quiz  ',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.title).toBe('Test Quiz');
    });
  });

  describe('Style Enum Validation', () => {
    it('should accept "quiz" as valid style', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Quiz Assessment',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.style).toBe('quiz');
    });

    it('should accept "exam" as valid style', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Final Exam',
        style: 'exam',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 50,
          selectionMode: 'random'
        },
        timing: {
          timeLimit: 120,
          showTimer: true,
          autoSubmitOnExpiry: true
        },
        attempts: {
          maxAttempts: 1,
          retakePolicy: 'instructor_unlock'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_all_attempts',
          partialCredit: false
        },
        feedback: {
          showFeedback: false,
          feedbackTiming: 'after_grading',
          showExplanations: false
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.style).toBe('exam');
    });

    it('should reject invalid style value', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test',
        style: 'invalid-style',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow();
    });
  });

  describe('QuestionSelection Subdocument Validation', () => {
    it('should require questionSelection subdocument', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/questionSelection/);
    });

    it('should require questionBankIds array', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/questionBankIds/);
    });

    it('should require questionCount', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/questionCount/);
    });

    it('should require selectionMode', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/selectionMode/);
    });

    it('should validate selectionMode enum', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'invalid'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow();
    });

    it('should accept optional filterByTags', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random',
          filterByTags: ['algebra', 'geometry']
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.questionSelection.filterByTags).toEqual(['algebra', 'geometry']);
    });

    it('should accept optional filterByDifficulty', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random',
          filterByDifficulty: ['beginner', 'intermediate']
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.questionSelection.filterByDifficulty).toEqual(['beginner', 'intermediate']);
    });

    it('should validate filterByDifficulty enum values', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random',
          filterByDifficulty: ['invalid-difficulty']
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow();
    });

    it('should validate questionCount is positive', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 0,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/questionCount/);
    });
  });

  describe('Timing Subdocument Validation', () => {
    it('should require timing subdocument', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/timing/);
    });

    it('should accept optional timeLimit', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Timed Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          timeLimit: 60,
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
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.timing.timeLimit).toBe(60);
    });

    it('should require showTimer field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/showTimer/);
    });

    it('should require autoSubmitOnExpiry field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/autoSubmitOnExpiry/);
    });

    it('should validate timeLimit is positive when provided', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          timeLimit: -10,
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/timeLimit/);
    });
  });

  describe('Attempts Subdocument Validation', () => {
    it('should require attempts subdocument', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/attempts/);
    });

    it('should require maxAttempts field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/maxAttempts/);
    });

    it('should accept null for maxAttempts (unlimited)', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
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
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.attempts.maxAttempts).toBeNull();
    });

    it('should validate maxAttempts is positive when not null', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 0,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/maxAttempts/);
    });

    it('should accept optional cooldownMinutes', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          cooldownMinutes: 30,
          retakePolicy: 'after_cooldown'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.attempts.cooldownMinutes).toBe(30);
    });

    it('should require retakePolicy field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/retakePolicy/);
    });

    it('should validate retakePolicy enum', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'invalid'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow();
    });
  });

  describe('Scoring Subdocument Validation', () => {
    it('should require scoring subdocument', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/scoring/);
    });

    it('should require passingScore field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/passingScore/);
    });

    it('should validate passingScore is between 0 and 100', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 150,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/passingScore/);
    });

    it('should require showScore field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/showScore/);
    });

    it('should require showCorrectAnswers field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/showCorrectAnswers/);
    });

    it('should validate showCorrectAnswers enum', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'invalid',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow();
    });

    it('should require partialCredit field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit'
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/partialCredit/);
    });
  });

  describe('Feedback Subdocument Validation', () => {
    it('should require feedback subdocument', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/feedback/);
    });

    it('should require showFeedback field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/showFeedback/);
    });

    it('should require feedbackTiming field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/feedbackTiming/);
    });

    it('should validate feedbackTiming enum', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'invalid',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow();
    });

    it('should require showExplanations field', async () => {
      const assessment = new Assessment({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit'
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(assessment.save()).rejects.toThrow(/showExplanations/);
    });
  });

  describe('Default Values', () => {
    it('should default isPublished to false', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.isPublished).toBe(false);
    });

    it('should default isArchived to false', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.isArchived).toBe(false);
    });

    it('should auto-generate createdAt and updatedAt timestamps', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.createdAt).toBeDefined();
      expect(assessment.updatedAt).toBeDefined();
    });
  });

  describe('Optional Fields', () => {
    it('should accept optional description field', async () => {
      const assessment = await Assessment.create({
        departmentId: new mongoose.Types.ObjectId(),
        title: 'Test Quiz',
        description: 'This is a comprehensive quiz covering chapters 1-3',
        style: 'quiz',
        questionSelection: {
          questionBankIds: ['bank1'],
          questionCount: 10,
          selectionMode: 'random'
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime'
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit',
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit',
          showExplanations: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(assessment.description).toBe('This is a comprehensive quiz covering chapters 1-3');
    });
  });

  describe('Indexes', () => {
    it('should have index on departmentId', async () => {
      const indexes = Assessment.schema.indexes();
      const hasIndex = indexes.some(
        (index) => index[0].departmentId === 1
      );
      expect(hasIndex).toBe(true);
    });

    it('should have compound index on departmentId and style', async () => {
      const indexes = Assessment.schema.indexes();
      const hasIndex = indexes.some(
        (index) => index[0].departmentId === 1 && index[0].style === 1
      );
      expect(hasIndex).toBe(true);
    });

    it('should have index on isPublished', async () => {
      const indexes = Assessment.schema.indexes();
      const hasIndex = indexes.some(
        (index) => index[0].isPublished === 1
      );
      expect(hasIndex).toBe(true);
    });

    it('should have index on isArchived', async () => {
      const indexes = Assessment.schema.indexes();
      const hasIndex = indexes.some(
        (index) => index[0].isArchived === 1
      );
      expect(hasIndex).toBe(true);
    });
  });

  describe('Query Methods', () => {
    beforeEach(async () => {
      const dept1 = new mongoose.Types.ObjectId();
      const dept2 = new mongoose.Types.ObjectId();
      const creator = new mongoose.Types.ObjectId();

      await Assessment.create([
        {
          departmentId: dept1,
          title: 'Quiz 1',
          style: 'quiz',
          isPublished: true,
          questionSelection: {
            questionBankIds: ['bank1'],
            questionCount: 10,
            selectionMode: 'random'
          },
          timing: { showTimer: true, autoSubmitOnExpiry: false },
          attempts: { maxAttempts: 3, retakePolicy: 'anytime' },
          scoring: {
            passingScore: 70,
            showScore: true,
            showCorrectAnswers: 'after_submit',
            partialCredit: true
          },
          feedback: {
            showFeedback: true,
            feedbackTiming: 'after_submit',
            showExplanations: true
          },
          createdBy: creator
        },
        {
          departmentId: dept1,
          title: 'Exam 1',
          style: 'exam',
          isPublished: false,
          questionSelection: {
            questionBankIds: ['bank1'],
            questionCount: 50,
            selectionMode: 'random'
          },
          timing: { showTimer: true, autoSubmitOnExpiry: true },
          attempts: { maxAttempts: 1, retakePolicy: 'instructor_unlock' },
          scoring: {
            passingScore: 60,
            showScore: true,
            showCorrectAnswers: 'after_all_attempts',
            partialCredit: false
          },
          feedback: {
            showFeedback: false,
            feedbackTiming: 'after_grading',
            showExplanations: false
          },
          createdBy: creator
        },
        {
          departmentId: dept2,
          title: 'Quiz 2',
          style: 'quiz',
          isPublished: true,
          isArchived: true,
          questionSelection: {
            questionBankIds: ['bank2'],
            questionCount: 15,
            selectionMode: 'sequential'
          },
          timing: { showTimer: false, autoSubmitOnExpiry: false },
          attempts: { maxAttempts: null, retakePolicy: 'anytime' },
          scoring: {
            passingScore: 80,
            showScore: true,
            showCorrectAnswers: 'never',
            partialCredit: true
          },
          feedback: {
            showFeedback: true,
            feedbackTiming: 'immediate',
            showExplanations: true
          },
          createdBy: creator
        }
      ]);
    });

    it('should find by departmentId', async () => {
      const assessments = await Assessment.find().limit(3);
      const dept1Assessments = assessments.filter(
        (a) => a.departmentId.toString() === assessments[0].departmentId.toString()
      );
      expect(dept1Assessments.length).toBeGreaterThan(0);
    });

    it('should find by style', async () => {
      const quizzes = await Assessment.find({ style: 'quiz' });
      expect(quizzes.length).toBeGreaterThan(0);
      quizzes.forEach((quiz) => {
        expect(quiz.style).toBe('quiz');
      });
    });

    it('should find published assessments', async () => {
      const published = await Assessment.find({ isPublished: true });
      expect(published.length).toBeGreaterThan(0);
      published.forEach((assessment) => {
        expect(assessment.isPublished).toBe(true);
      });
    });

    it('should find non-archived assessments', async () => {
      const active = await Assessment.find({ isArchived: false });
      expect(active.length).toBeGreaterThan(0);
      active.forEach((assessment) => {
        expect(assessment.isArchived).toBe(false);
      });
    });

    it('should find by compound departmentId and style', async () => {
      const assessments = await Assessment.find().limit(3);
      const deptQuizzes = await Assessment.find({
        departmentId: assessments[0].departmentId,
        style: 'quiz'
      });
      expect(deptQuizzes.length).toBeGreaterThan(0);
    });
  });
});
