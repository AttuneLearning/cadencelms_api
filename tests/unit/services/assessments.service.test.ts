import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AssessmentsService } from '@/services/content/assessments.service';
import Assessment from '@/models/content/Assessment.model';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import Question from '@/models/assessment/Question.model';
import Department from '@/models/organization/Department.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('AssessmentsService - Unit Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testDepartment: any;
  let testDepartment2: any;
  let testQuestionBank: any;
  let testQuestions: any[];
  const adminUserId = new mongoose.Types.ObjectId().toString();

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
    // Create test department
    testDepartment = await Department.create({
      name: 'Computer Science',
      code: 'CS',
      isVisible: true
    });

    testDepartment2 = await Department.create({
      name: 'Mathematics',
      code: 'MATH',
      isVisible: true
    });

    // Create test questions - Question model uses 'easy' | 'medium' | 'hard'
    testQuestions = await Question.insertMany([
      {
        questionText: 'What is 2 + 2?',
        questionType: 'multiple-choice',
        departmentId: testDepartment._id,
        points: 10,
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        difficulty: 'easy',
        tags: ['math', 'basic'],
        isActive: true
      },
      {
        questionText: 'What is the capital of France?',
        questionType: 'short-answer',
        departmentId: testDepartment._id,
        points: 10,
        correctAnswer: 'Paris',
        difficulty: 'easy',
        tags: ['geography'],
        isActive: true
      },
      {
        questionText: 'Is JavaScript a programming language?',
        questionType: 'true-false',
        departmentId: testDepartment._id,
        points: 5,
        options: ['True', 'False'],
        correctAnswer: 'True',
        difficulty: 'easy',
        tags: ['programming'],
        isActive: true
      },
      {
        questionText: 'Explain the concept of recursion.',
        questionType: 'essay',
        departmentId: testDepartment._id,
        points: 20,
        difficulty: 'hard',
        tags: ['programming', 'advanced'],
        isActive: true
      },
      {
        questionText: 'What is 10 / 2?',
        questionType: 'multiple-choice',
        departmentId: testDepartment._id,
        points: 10,
        options: ['3', '4', '5', '6'],
        correctAnswer: '5',
        difficulty: 'medium',
        tags: ['math'],
        isActive: true
      }
    ]);

    // Create test question bank
    testQuestionBank = await QuestionBank.create({
      name: 'CS Fundamentals',
      description: 'Basic computer science questions',
      departmentId: testDepartment._id,
      questionIds: testQuestions.map(q => q._id),
      tags: ['cs', 'fundamentals'],
      isActive: true
    });
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('createAssessment()', () => {
    it('should create an assessment with valid data', async () => {
      const assessmentData = {
        departmentId: testDepartment._id.toString(),
        title: 'Midterm Exam',
        description: 'Computer Science midterm examination',
        style: 'exam' as const,
        questionSelection: {
          questionBankIds: [testQuestionBank._id.toString()],
          questionCount: 5,
          selectionMode: 'random' as const
        },
        timing: {
          timeLimit: 60,
          showTimer: true,
          autoSubmitOnExpiry: true
        },
        attempts: {
          maxAttempts: 1,
          retakePolicy: 'instructor_unlock' as const
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_all_attempts' as const,
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit' as const,
          showExplanations: true
        }
      };

      const result = await AssessmentsService.createAssessment(assessmentData, adminUserId);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Midterm Exam');
      expect(result.style).toBe('exam');
      expect(result.isPublished).toBe(false);
      expect(result.isArchived).toBe(false);
      expect(result.questionSelection.questionBankIds).toHaveLength(1);
    });

    it('should create a quiz with default timing and attempts', async () => {
      const assessmentData = {
        departmentId: testDepartment._id.toString(),
        title: 'Quick Quiz',
        style: 'quiz' as const,
        questionSelection: {
          questionBankIds: [testQuestionBank._id.toString()],
          questionCount: 3,
          selectionMode: 'sequential' as const
        },
        timing: {
          showTimer: false,
          autoSubmitOnExpiry: false
        },
        attempts: {
          maxAttempts: null,
          retakePolicy: 'anytime' as const
        },
        scoring: {
          passingScore: 60,
          showScore: true,
          showCorrectAnswers: 'after_submit' as const,
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'immediate' as const,
          showExplanations: true
        }
      };

      const result = await AssessmentsService.createAssessment(assessmentData, adminUserId);

      expect(result.style).toBe('quiz');
      expect(result.attempts.maxAttempts).toBeNull();
      expect(result.timing.timeLimit).toBeUndefined();
    });

    it('should throw error for invalid department', async () => {
      const invalidDeptId = new mongoose.Types.ObjectId().toString();
      const assessmentData = {
        departmentId: invalidDeptId,
        title: 'Test Assessment',
        style: 'quiz' as const,
        questionSelection: {
          questionBankIds: [testQuestionBank._id.toString()],
          questionCount: 3,
          selectionMode: 'random' as const
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: true
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime' as const
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit' as const,
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit' as const,
          showExplanations: false
        }
      };

      await expect(
        AssessmentsService.createAssessment(assessmentData, adminUserId)
      ).rejects.toThrow('Department not found');
    });

    it('should throw error for invalid question bank', async () => {
      const invalidBankId = new mongoose.Types.ObjectId().toString();
      const assessmentData = {
        departmentId: testDepartment._id.toString(),
        title: 'Test Assessment',
        style: 'quiz' as const,
        questionSelection: {
          questionBankIds: [invalidBankId],
          questionCount: 3,
          selectionMode: 'random' as const
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: true
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime' as const
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit' as const,
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit' as const,
          showExplanations: false
        }
      };

      await expect(
        AssessmentsService.createAssessment(assessmentData, adminUserId)
      ).rejects.toThrow('One or more question banks not found');
    });

    it('should throw error when question count exceeds available questions', async () => {
      const assessmentData = {
        departmentId: testDepartment._id.toString(),
        title: 'Test Assessment',
        style: 'quiz' as const,
        questionSelection: {
          questionBankIds: [testQuestionBank._id.toString()],
          questionCount: 100, // More than available
          selectionMode: 'random' as const
        },
        timing: {
          showTimer: true,
          autoSubmitOnExpiry: true
        },
        attempts: {
          maxAttempts: 3,
          retakePolicy: 'anytime' as const
        },
        scoring: {
          passingScore: 70,
          showScore: true,
          showCorrectAnswers: 'after_submit' as const,
          partialCredit: false
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: 'after_submit' as const,
          showExplanations: false
        }
      };

      await expect(
        AssessmentsService.createAssessment(assessmentData, adminUserId)
      ).rejects.toThrow('Question count exceeds available questions');
    });
  });

  describe('listAssessments()', () => {
    beforeEach(async () => {
      // Create multiple assessments
      await Assessment.insertMany([
        {
          departmentId: testDepartment._id,
          title: 'Quiz 1',
          style: 'quiz',
          questionSelection: {
            questionBankIds: [testQuestionBank._id.toString()],
            questionCount: 3,
            selectionMode: 'random'
          },
          timing: { showTimer: false, autoSubmitOnExpiry: false },
          attempts: { maxAttempts: null, retakePolicy: 'anytime' },
          scoring: { passingScore: 60, showScore: true, showCorrectAnswers: 'after_submit', partialCredit: true },
          feedback: { showFeedback: true, feedbackTiming: 'immediate', showExplanations: true },
          isPublished: true,
          isArchived: false,
          createdBy: new mongoose.Types.ObjectId(adminUserId)
        },
        {
          departmentId: testDepartment._id,
          title: 'Exam 1',
          style: 'exam',
          questionSelection: {
            questionBankIds: [testQuestionBank._id.toString()],
            questionCount: 5,
            selectionMode: 'sequential'
          },
          timing: { timeLimit: 60, showTimer: true, autoSubmitOnExpiry: true },
          attempts: { maxAttempts: 1, retakePolicy: 'instructor_unlock' },
          scoring: { passingScore: 70, showScore: true, showCorrectAnswers: 'after_all_attempts', partialCredit: false },
          feedback: { showFeedback: true, feedbackTiming: 'after_grading', showExplanations: true },
          isPublished: true,
          isArchived: false,
          createdBy: new mongoose.Types.ObjectId(adminUserId)
        },
        {
          departmentId: testDepartment._id,
          title: 'Draft Quiz',
          style: 'quiz',
          questionSelection: {
            questionBankIds: [testQuestionBank._id.toString()],
            questionCount: 2,
            selectionMode: 'random'
          },
          timing: { showTimer: false, autoSubmitOnExpiry: false },
          attempts: { maxAttempts: 3, retakePolicy: 'after_cooldown', cooldownMinutes: 30 },
          scoring: { passingScore: 50, showScore: true, showCorrectAnswers: 'never', partialCredit: true },
          feedback: { showFeedback: false, feedbackTiming: 'after_submit', showExplanations: false },
          isPublished: false,
          isArchived: false,
          createdBy: new mongoose.Types.ObjectId(adminUserId)
        },
        {
          departmentId: testDepartment2._id,
          title: 'Math Quiz',
          style: 'quiz',
          questionSelection: {
            questionBankIds: [testQuestionBank._id.toString()],
            questionCount: 3,
            selectionMode: 'random'
          },
          timing: { showTimer: false, autoSubmitOnExpiry: false },
          attempts: { maxAttempts: null, retakePolicy: 'anytime' },
          scoring: { passingScore: 60, showScore: true, showCorrectAnswers: 'after_submit', partialCredit: true },
          feedback: { showFeedback: true, feedbackTiming: 'immediate', showExplanations: true },
          isPublished: true,
          isArchived: false,
          createdBy: new mongoose.Types.ObjectId(adminUserId)
        }
      ]);
    });

    it('should list all assessments for admin', async () => {
      const result = await AssessmentsService.listAssessments({}, 'admin', []);

      expect(result.assessments).toHaveLength(4);
      expect(result.pagination.total).toBe(4);
    });

    it('should filter by department for non-admin users', async () => {
      const result = await AssessmentsService.listAssessments(
        {},
        'staff',
        [testDepartment._id.toString()]
      );

      expect(result.assessments).toHaveLength(3);
      result.assessments.forEach((assessment: any) => {
        expect(assessment.departmentId).toBe(testDepartment._id.toString());
      });
    });

    it('should filter by style', async () => {
      const result = await AssessmentsService.listAssessments(
        { style: 'exam' },
        'admin',
        []
      );

      expect(result.assessments).toHaveLength(1);
      expect(result.assessments[0].style).toBe('exam');
    });

    it('should filter by isPublished', async () => {
      const result = await AssessmentsService.listAssessments(
        { isPublished: true },
        'admin',
        []
      );

      expect(result.assessments).toHaveLength(3);
      result.assessments.forEach((assessment: any) => {
        expect(assessment.isPublished).toBe(true);
      });
    });

    it('should filter by departmentId', async () => {
      const result = await AssessmentsService.listAssessments(
        { departmentId: testDepartment._id.toString() },
        'admin',
        []
      );

      expect(result.assessments).toHaveLength(3);
    });

    it('should paginate results', async () => {
      const result = await AssessmentsService.listAssessments(
        { page: 1, limit: 2 },
        'admin',
        []
      );

      expect(result.assessments).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(4);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should sort results', async () => {
      const result = await AssessmentsService.listAssessments(
        { sort: 'title' },
        'admin',
        []
      );

      expect(result.assessments[0].title).toBe('Draft Quiz');
      expect(result.assessments[1].title).toBe('Exam 1');
    });

    it('should throw forbidden if user has no access to requested department', async () => {
      await expect(
        AssessmentsService.listAssessments(
          { departmentId: testDepartment2._id.toString() },
          'staff',
          [testDepartment._id.toString()]
        )
      ).rejects.toThrow('Insufficient permissions or access to this department');
    });
  });

  describe('getAssessment()', () => {
    let testAssessment: any;

    beforeEach(async () => {
      testAssessment = await Assessment.create({
        departmentId: testDepartment._id,
        title: 'Test Assessment',
        description: 'A test assessment',
        style: 'exam',
        questionSelection: {
          questionBankIds: [testQuestionBank._id.toString()],
          questionCount: 5,
          selectionMode: 'random'
        },
        timing: { timeLimit: 60, showTimer: true, autoSubmitOnExpiry: true },
        attempts: { maxAttempts: 2, retakePolicy: 'after_cooldown', cooldownMinutes: 60 },
        scoring: { passingScore: 70, showScore: true, showCorrectAnswers: 'after_all_attempts', partialCredit: false },
        feedback: { showFeedback: true, feedbackTiming: 'after_submit', showExplanations: true },
        isPublished: true,
        isArchived: false,
        createdBy: new mongoose.Types.ObjectId(adminUserId)
      });
    });

    it('should get assessment by ID for admin', async () => {
      const result = await AssessmentsService.getAssessment(
        testAssessment._id.toString(),
        'admin',
        []
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(testAssessment._id.toString());
      expect(result.title).toBe('Test Assessment');
      expect(result.questionCount).toBe(5);
    });

    it('should get assessment by ID for user with department access', async () => {
      const result = await AssessmentsService.getAssessment(
        testAssessment._id.toString(),
        'staff',
        [testDepartment._id.toString()]
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(testAssessment._id.toString());
    });

    it('should throw not found for invalid ID', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();

      await expect(
        AssessmentsService.getAssessment(invalidId, 'admin', [])
      ).rejects.toThrow('Assessment not found');
    });

    it('should throw forbidden for user without department access', async () => {
      await expect(
        AssessmentsService.getAssessment(
          testAssessment._id.toString(),
          'staff',
          [testDepartment2._id.toString()]
        )
      ).rejects.toThrow('Insufficient permissions or access to this department');
    });

    it('should throw not found for invalid ObjectId format', async () => {
      await expect(
        AssessmentsService.getAssessment('invalid-id', 'admin', [])
      ).rejects.toThrow('Assessment not found');
    });
  });

  describe('updateAssessment()', () => {
    let testAssessment: any;

    beforeEach(async () => {
      testAssessment = await Assessment.create({
        departmentId: testDepartment._id,
        title: 'Original Title',
        description: 'Original description',
        style: 'quiz',
        questionSelection: {
          questionBankIds: [testQuestionBank._id.toString()],
          questionCount: 3,
          selectionMode: 'random'
        },
        timing: { showTimer: false, autoSubmitOnExpiry: false },
        attempts: { maxAttempts: null, retakePolicy: 'anytime' },
        scoring: { passingScore: 60, showScore: true, showCorrectAnswers: 'after_submit', partialCredit: true },
        feedback: { showFeedback: true, feedbackTiming: 'immediate', showExplanations: true },
        isPublished: false,
        isArchived: false,
        createdBy: new mongoose.Types.ObjectId(adminUserId)
      });
    });

    it('should update assessment title and description', async () => {
      const result = await AssessmentsService.updateAssessment(
        testAssessment._id.toString(),
        { title: 'Updated Title', description: 'Updated description' },
        'admin',
        []
      );

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated description');
    });

    it('should update scoring settings', async () => {
      const result = await AssessmentsService.updateAssessment(
        testAssessment._id.toString(),
        {
          scoring: {
            passingScore: 80,
            showScore: false,
            showCorrectAnswers: 'never' as const,
            partialCredit: false
          }
        },
        'admin',
        []
      );

      expect(result.scoring.passingScore).toBe(80);
      expect(result.scoring.showScore).toBe(false);
      expect(result.scoring.showCorrectAnswers).toBe('never');
    });

    it('should not allow updating published assessment style', async () => {
      // First publish the assessment
      await Assessment.findByIdAndUpdate(testAssessment._id, { isPublished: true });

      await expect(
        AssessmentsService.updateAssessment(
          testAssessment._id.toString(),
          { style: 'exam' },
          'admin',
          []
        )
      ).rejects.toThrow('Cannot change style of a published assessment');
    });

    it('should throw forbidden for user without department access', async () => {
      await expect(
        AssessmentsService.updateAssessment(
          testAssessment._id.toString(),
          { title: 'New Title' },
          'staff',
          [testDepartment2._id.toString()]
        )
      ).rejects.toThrow('Insufficient permissions or access to this department');
    });

    it('should throw not found for non-existent assessment', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();

      await expect(
        AssessmentsService.updateAssessment(invalidId, { title: 'New Title' }, 'admin', [])
      ).rejects.toThrow('Assessment not found');
    });
  });

  describe('deleteAssessment()', () => {
    let testAssessment: any;

    beforeEach(async () => {
      testAssessment = await Assessment.create({
        departmentId: testDepartment._id,
        title: 'To Be Deleted',
        style: 'quiz',
        questionSelection: {
          questionBankIds: [testQuestionBank._id.toString()],
          questionCount: 3,
          selectionMode: 'random'
        },
        timing: { showTimer: false, autoSubmitOnExpiry: false },
        attempts: { maxAttempts: null, retakePolicy: 'anytime' },
        scoring: { passingScore: 60, showScore: true, showCorrectAnswers: 'after_submit', partialCredit: true },
        feedback: { showFeedback: true, feedbackTiming: 'immediate', showExplanations: true },
        isPublished: false,
        isArchived: false,
        createdBy: new mongoose.Types.ObjectId(adminUserId)
      });
    });

    it('should soft delete assessment', async () => {
      await AssessmentsService.deleteAssessment(
        testAssessment._id.toString(),
        'admin',
        []
      );

      const deleted = await Assessment.findById(testAssessment._id);
      expect(deleted!.isArchived).toBe(true);
    });

    it('should not delete published assessment', async () => {
      await Assessment.findByIdAndUpdate(testAssessment._id, { isPublished: true });

      await expect(
        AssessmentsService.deleteAssessment(testAssessment._id.toString(), 'admin', [])
      ).rejects.toThrow('Cannot delete a published assessment');
    });

    it('should throw forbidden for user without department access', async () => {
      await expect(
        AssessmentsService.deleteAssessment(
          testAssessment._id.toString(),
          'staff',
          [testDepartment2._id.toString()]
        )
      ).rejects.toThrow('Insufficient permissions or access to this department');
    });

    it('should throw not found for non-existent assessment', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();

      await expect(
        AssessmentsService.deleteAssessment(invalidId, 'admin', [])
      ).rejects.toThrow('Assessment not found');
    });
  });

  describe('publishAssessment()', () => {
    let testAssessment: any;

    beforeEach(async () => {
      testAssessment = await Assessment.create({
        departmentId: testDepartment._id,
        title: 'Draft Assessment',
        style: 'quiz',
        questionSelection: {
          questionBankIds: [testQuestionBank._id.toString()],
          questionCount: 3,
          selectionMode: 'random'
        },
        timing: { showTimer: false, autoSubmitOnExpiry: false },
        attempts: { maxAttempts: null, retakePolicy: 'anytime' },
        scoring: { passingScore: 60, showScore: true, showCorrectAnswers: 'after_submit', partialCredit: true },
        feedback: { showFeedback: true, feedbackTiming: 'immediate', showExplanations: true },
        isPublished: false,
        isArchived: false,
        createdBy: new mongoose.Types.ObjectId(adminUserId)
      });
    });

    it('should publish assessment', async () => {
      const result = await AssessmentsService.publishAssessment(
        testAssessment._id.toString(),
        'admin',
        []
      );

      expect(result.isPublished).toBe(true);
    });

    it('should throw error if already published', async () => {
      await Assessment.findByIdAndUpdate(testAssessment._id, { isPublished: true });

      await expect(
        AssessmentsService.publishAssessment(testAssessment._id.toString(), 'admin', [])
      ).rejects.toThrow('Assessment is already published');
    });

    it('should throw error if archived', async () => {
      await Assessment.findByIdAndUpdate(testAssessment._id, { isArchived: true });

      await expect(
        AssessmentsService.publishAssessment(testAssessment._id.toString(), 'admin', [])
      ).rejects.toThrow('Cannot publish an archived assessment');
    });

    it('should throw forbidden for user without department access', async () => {
      await expect(
        AssessmentsService.publishAssessment(
          testAssessment._id.toString(),
          'staff',
          [testDepartment2._id.toString()]
        )
      ).rejects.toThrow('Insufficient permissions or access to this department');
    });
  });

  describe('archiveAssessment()', () => {
    let testAssessment: any;

    beforeEach(async () => {
      testAssessment = await Assessment.create({
        departmentId: testDepartment._id,
        title: 'Published Assessment',
        style: 'exam',
        questionSelection: {
          questionBankIds: [testQuestionBank._id.toString()],
          questionCount: 5,
          selectionMode: 'random'
        },
        timing: { timeLimit: 60, showTimer: true, autoSubmitOnExpiry: true },
        attempts: { maxAttempts: 1, retakePolicy: 'instructor_unlock' },
        scoring: { passingScore: 70, showScore: true, showCorrectAnswers: 'after_all_attempts', partialCredit: false },
        feedback: { showFeedback: true, feedbackTiming: 'after_submit', showExplanations: true },
        isPublished: true,
        isArchived: false,
        createdBy: new mongoose.Types.ObjectId(adminUserId)
      });
    });

    it('should archive assessment', async () => {
      const result = await AssessmentsService.archiveAssessment(
        testAssessment._id.toString(),
        'admin',
        []
      );

      expect(result.isArchived).toBe(true);
      expect(result.isPublished).toBe(false);
    });

    it('should throw error if already archived', async () => {
      await Assessment.findByIdAndUpdate(testAssessment._id, { isArchived: true });

      await expect(
        AssessmentsService.archiveAssessment(testAssessment._id.toString(), 'admin', [])
      ).rejects.toThrow('Assessment is already archived');
    });

    it('should throw forbidden for user without department access', async () => {
      await expect(
        AssessmentsService.archiveAssessment(
          testAssessment._id.toString(),
          'staff',
          [testDepartment2._id.toString()]
        )
      ).rejects.toThrow('Insufficient permissions or access to this department');
    });
  });

  describe('getQuestionsForAssessment()', () => {
    let testAssessment: any;

    beforeEach(async () => {
      testAssessment = await Assessment.create({
        departmentId: testDepartment._id,
        title: 'Question Selection Test',
        style: 'quiz',
        questionSelection: {
          questionBankIds: [testQuestionBank._id.toString()],
          questionCount: 3,
          selectionMode: 'random'
        },
        timing: { showTimer: false, autoSubmitOnExpiry: false },
        attempts: { maxAttempts: null, retakePolicy: 'anytime' },
        scoring: { passingScore: 60, showScore: true, showCorrectAnswers: 'after_submit', partialCredit: true },
        feedback: { showFeedback: true, feedbackTiming: 'immediate', showExplanations: true },
        isPublished: true,
        isArchived: false,
        createdBy: new mongoose.Types.ObjectId(adminUserId)
      });
    });

    it('should return correct number of questions with random selection', async () => {
      const questions = await AssessmentsService.getQuestionsForAssessment(
        testAssessment._id.toString()
      );

      expect(questions).toHaveLength(3);
    });

    it('should return questions in order with sequential selection', async () => {
      await Assessment.findByIdAndUpdate(testAssessment._id, {
        'questionSelection.selectionMode': 'sequential'
      });

      const questions = await AssessmentsService.getQuestionsForAssessment(
        testAssessment._id.toString()
      );

      expect(questions).toHaveLength(3);
      // Sequential should return first 3 questions in order
      expect(questions[0].questionText).toBe(testQuestions[0].questionText);
    });

    it('should filter questions by tags', async () => {
      await Assessment.findByIdAndUpdate(testAssessment._id, {
        'questionSelection.filterByTags': ['math']
      });

      const questions = await AssessmentsService.getQuestionsForAssessment(
        testAssessment._id.toString()
      );

      questions.forEach((q: any) => {
        expect(q.tags).toContain('math');
      });
    });

    it('should filter questions by difficulty', async () => {
      // Note: Question model uses 'easy' | 'medium' | 'hard' for difficulty
      // The Assessment model's filterByDifficulty uses the same values for actual filtering
      await Assessment.findByIdAndUpdate(testAssessment._id, {
        'questionSelection.filterByDifficulty': ['easy'],
        'questionSelection.questionCount': 2
      });

      const questions = await AssessmentsService.getQuestionsForAssessment(
        testAssessment._id.toString()
      );

      // We have 3 questions with 'easy' difficulty in our test data
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(2);
      questions.forEach((q: any) => {
        expect(q.difficulty).toBe('easy');
      });
    });

    it('should throw not found for non-existent assessment', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();

      await expect(
        AssessmentsService.getQuestionsForAssessment(invalidId)
      ).rejects.toThrow('Assessment not found');
    });

    it('should aggregate questions from multiple question banks', async () => {
      // Create second question bank
      const secondBank = await QuestionBank.create({
        name: 'Advanced CS',
        departmentId: testDepartment._id,
        questionIds: [testQuestions[3]._id, testQuestions[4]._id],
        isActive: true
      });

      await Assessment.findByIdAndUpdate(testAssessment._id, {
        'questionSelection.questionBankIds': [
          testQuestionBank._id.toString(),
          secondBank._id.toString()
        ],
        'questionSelection.questionCount': 5
      });

      const questions = await AssessmentsService.getQuestionsForAssessment(
        testAssessment._id.toString()
      );

      expect(questions).toHaveLength(5);
    });
  });

  describe('Department Access Control', () => {
    let testAssessment: any;

    beforeEach(async () => {
      testAssessment = await Assessment.create({
        departmentId: testDepartment._id,
        title: 'Access Control Test',
        style: 'quiz',
        questionSelection: {
          questionBankIds: [testQuestionBank._id.toString()],
          questionCount: 3,
          selectionMode: 'random'
        },
        timing: { showTimer: false, autoSubmitOnExpiry: false },
        attempts: { maxAttempts: null, retakePolicy: 'anytime' },
        scoring: { passingScore: 60, showScore: true, showCorrectAnswers: 'after_submit', partialCredit: true },
        feedback: { showFeedback: true, feedbackTiming: 'immediate', showExplanations: true },
        isPublished: false,
        isArchived: false,
        createdBy: new mongoose.Types.ObjectId(adminUserId)
      });
    });

    it('should allow admin to access any department', async () => {
      const result = await AssessmentsService.getAssessment(
        testAssessment._id.toString(),
        'admin',
        []
      );

      expect(result).toBeDefined();
    });

    it('should allow staff with department membership to access', async () => {
      const result = await AssessmentsService.getAssessment(
        testAssessment._id.toString(),
        'staff',
        [testDepartment._id.toString()]
      );

      expect(result).toBeDefined();
    });

    it('should deny staff without department membership', async () => {
      await expect(
        AssessmentsService.getAssessment(
          testAssessment._id.toString(),
          'staff',
          [testDepartment2._id.toString()]
        )
      ).rejects.toThrow('Insufficient permissions or access to this department');
    });

    it('should allow staff with multiple department memberships', async () => {
      const result = await AssessmentsService.getAssessment(
        testAssessment._id.toString(),
        'staff',
        [testDepartment._id.toString(), testDepartment2._id.toString()]
      );

      expect(result).toBeDefined();
    });
  });
});
