import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Question from '@/models/assessment/Question.model';
import Department from '@/models/organization/Department.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Question Model', () => {
  let mongoServer: MongoMemoryServer;
  let testDept: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testDept = await Department.create({
      name: 'Engineering',
      code: 'ENG'
    });
  });

  afterEach(async () => {
    await Question.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid question', async () => {
      const question = await Question.create({
        questionText: 'What is 2 + 2?',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['4'],
        distractors: ['3', '5', '6']
      });

      expect(question.questionText).toBe('What is 2 + 2?');
      expect(question.questionTypes).toEqual(['multiple_choice']);
      expect(question.points).toBe(5);
    });

    it('should require questionText field', async () => {
      const question = new Question({
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5
      });

      await expect(question.save()).rejects.toThrow(/questionText/);
    });

    it('should require questionTypes field', async () => {
      const question = new Question({
        questionText: 'What is 2 + 2?',
        departmentId: testDept._id,
        points: 5
      });

      await expect(question.save()).rejects.toThrow(/questionTypes/);
    });

    it('should require departmentId field', async () => {
      const question = new Question({
        questionText: 'What is 2 + 2?',
        questionTypes: ['multiple_choice'],
        points: 5
      });

      await expect(question.save()).rejects.toThrow(/departmentId/);
    });

    it('should require points field', async () => {
      const question = new Question({
        questionText: 'What is 2 + 2?',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id
      });

      await expect(question.save()).rejects.toThrow(/points/);
    });

    it('should validate questionTypes enum', async () => {
      const question = new Question({
        questionText: 'Test question',
        questionTypes: ['invalid-type'],
        departmentId: testDept._id,
        points: 5
      });

      await expect(question.save()).rejects.toThrow();
    });

    it('should accept valid question types', async () => {
      const typeConfigs: Record<string, any> = {
        'multiple_choice': { correctAnswers: ['A'], distractors: ['B', 'C'] },
        'true_false': { correctAnswers: ['true'], trueFalseData: { correctValue: true } },
        'short_answer': { correctAnswers: ['answer'] },
        'long_answer': {},
        'fill_in_blank': { correctAnswers: ['blank'], blanks: [{ placeholder: '____', acceptedAnswers: ['blank'], position: 0, matchThreshold: 100 }] },
        'matching': { matchingPairs: { 'A': '1', 'B': '2' } }
      };

      for (const [type, config] of Object.entries(typeConfigs)) {
        const question = await Question.create({
          questionText: `Question of type ${type}`,
          questionTypes: [type],
          departmentId: testDept._id,
          points: 5,
          ...config
        });

        expect(question.questionTypes).toEqual([type]);
      }
    });

    it('should validate points is positive', async () => {
      const question = new Question({
        questionText: 'Test question',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 0
      });

      await expect(question.save()).rejects.toThrow(/points/);
    });
  });

  describe('Multiple Choice Questions', () => {
    it('should store multiple choice with correct answer and distractors', async () => {
      const question = await Question.create({
        questionText: 'What is the capital of France?',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['Paris'],
        distractors: ['London', 'Berlin', 'Madrid']
      });

      expect(question.correctAnswers).toEqual(['Paris']);
      expect(question.distractors).toEqual(['London', 'Berlin', 'Madrid']);
    });

    it('should store correct answer in array format', async () => {
      const question = await Question.create({
        questionText: 'What is 2 + 2?',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['4'],
        distractors: ['3', '5', '6']
      });

      expect(question.correctAnswers).toEqual(['4']);
    });

    it('should store multiple correct answers', async () => {
      const question = await Question.create({
        questionText: 'Select all prime numbers',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 10,
        correctAnswers: ['2', '3', '5'],
        distractors: ['4', '6']
      });

      expect(question.correctAnswers).toEqual(['2', '3', '5']);
    });
  });

  describe('True/False Questions', () => {
    it('should create true/false question', async () => {
      const question = await Question.create({
        questionText: 'TypeScript is a superset of JavaScript',
        questionTypes: ['true_false'],
        departmentId: testDept._id,
        points: 2,
        correctAnswers: ['true'],
        trueFalseData: { correctValue: true }
      });

      expect(question.correctAnswers).toEqual(['true']);
      expect(question.trueFalseData?.correctValue).toBe(true);
    });
  });

  describe('Short Answer and Essay', () => {
    it('should create short answer question', async () => {
      const question = await Question.create({
        questionText: 'Define polymorphism',
        questionTypes: ['short_answer'],
        departmentId: testDept._id,
        points: 10
      });

      expect(question.questionTypes).toEqual(['short_answer']);
    });

    it('should create essay question with word limit', async () => {
      const question = await Question.create({
        questionText: 'Discuss the impact of cloud computing',
        questionTypes: ['long_answer'],
        departmentId: testDept._id,
        points: 25,
        maxWordCount: 500
      });

      expect(question.maxWordCount).toBe(500);
    });

    it('should store model answer', async () => {
      const question = await Question.create({
        questionText: 'What is recursion?',
        questionTypes: ['short_answer'],
        departmentId: testDept._id,
        points: 10,
        modelAnswer: 'A function that calls itself'
      });

      expect(question.modelAnswer).toBe('A function that calls itself');
    });
  });

  describe('Fill in the Blank', () => {
    it('should create fill-blank question', async () => {
      const question = await Question.create({
        questionText: 'The time complexity of binary search is ____',
        questionTypes: ['fill_in_blank'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['O(log n)'],
        blanks: [{ placeholder: '____', acceptedAnswers: ['O(log n)'], position: 0, matchThreshold: 100 }]
      });

      expect(question.correctAnswers).toEqual(['O(log n)']);
    });

    it('should allow multiple acceptable answers', async () => {
      const question = await Question.create({
        questionText: 'JavaScript was created by ____',
        questionTypes: ['fill_in_blank'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['Brendan Eich', 'Eich'],
        blanks: [{ placeholder: '____', acceptedAnswers: ['Brendan Eich', 'Eich'], position: 0, matchThreshold: 100 }]
      });

      expect(question.correctAnswers).toEqual(['Brendan Eich', 'Eich']);
    });
  });

  describe('Matching Questions', () => {
    it('should store matching pairs', async () => {
      const question = await Question.create({
        questionText: 'Match the data structure to its operation',
        questionTypes: ['matching'],
        departmentId: testDept._id,
        points: 10,
        matchingPairs: {
          'Stack': 'LIFO',
          'Queue': 'FIFO',
          'Array': 'Random Access'
        }
      });

      expect(question.matchingPairs).toEqual({
        'Stack': 'LIFO',
        'Queue': 'FIFO',
        'Array': 'Random Access'
      });
    });
  });

  describe('Question Metadata', () => {
    it('should store difficulty level', async () => {
      const question = await Question.create({
        questionText: 'Advanced recursion question',
        questionTypes: ['long_answer'],
        departmentId: testDept._id,
        points: 20,
        difficulty: 'hard'
      });

      expect(question.difficulty).toBe('hard');
    });

    it('should validate difficulty enum', async () => {
      const question = new Question({
        questionText: 'Test',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        difficulty: 'impossible'
      });

      await expect(question.save()).rejects.toThrow();
    });

    it('should store tags', async () => {
      const question = await Question.create({
        questionText: 'Test question',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['A'],
        distractors: ['B', 'C'],
        tags: ['algorithms', 'sorting', 'complexity']
      });

      expect(question.tags).toEqual(['algorithms', 'sorting', 'complexity']);
    });

    it('should store explanation', async () => {
      const question = await Question.create({
        questionText: 'What is Big O notation?',
        questionTypes: ['short_answer'],
        departmentId: testDept._id,
        points: 10,
        explanation: 'Big O describes the upper bound of time complexity'
      });

      expect(question.explanation).toBe('Big O describes the upper bound of time complexity');
    });

    it('should store hints', async () => {
      const question = await Question.create({
        questionText: 'Solve the sorting problem',
        questionTypes: ['long_answer'],
        departmentId: testDept._id,
        points: 15,
        hints: ['Consider divide and conquer', 'Think about merge sort']
      });

      expect(question.hints).toEqual(['Consider divide and conquer', 'Think about merge sort']);
    });
  });

  describe('Active Status', () => {
    it('should default to active', async () => {
      const question = await Question.create({
        questionText: 'Test question',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['A'],
        distractors: ['B', 'C']
      });

      expect(question.isActive).toBe(true);
    });

    it('should allow deactivation', async () => {
      const question = await Question.create({
        questionText: 'Old question',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['A'],
        distractors: ['B', 'C'],
        isActive: false
      });

      expect(question.isActive).toBe(false);
    });
  });

  describe('Metadata Field', () => {
    it('should store custom metadata', async () => {
      const question = await Question.create({
        questionText: 'Test question',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['A'],
        distractors: ['B', 'C'],
        metadata: {
          source: 'Textbook Chapter 5',
          lastUsed: '2024-09-15',
          averageScore: 0.85
        }
      });

      expect(question.metadata).toEqual({
        source: 'Textbook Chapter 5',
        lastUsed: '2024-09-15',
        averageScore: 0.85
      });
    });

    it('should auto-generate timestamps', async () => {
      const question = await Question.create({
        questionText: 'Test question',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['A'],
        distractors: ['B', 'C']
      });

      expect(question.createdAt).toBeDefined();
      expect(question.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find questions by department', async () => {
      await Question.create({
        questionText: 'Question 1',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['A'],
        distractors: ['B', 'C']
      });

      const questions = await Question.find({ departmentId: testDept._id });
      expect(questions).toHaveLength(1);
    });

    it('should find questions by type', async () => {
      await Question.create({
        questionText: 'MC Question',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['A'],
        distractors: ['B', 'C']
      });

      await Question.create({
        questionText: 'Essay Question',
        questionTypes: ['long_answer'],
        departmentId: testDept._id,
        points: 20
      });

      const mcQuestions = await Question.find({ questionTypes: 'multiple_choice' });
      expect(mcQuestions).toHaveLength(1);
    });

    it('should find questions by difficulty', async () => {
      await Question.create({
        questionText: 'Easy Q',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['A'],
        distractors: ['B', 'C'],
        difficulty: 'easy'
      });

      await Question.create({
        questionText: 'Hard Q',
        questionTypes: ['long_answer'],
        departmentId: testDept._id,
        points: 20,
        difficulty: 'hard'
      });

      const easyQuestions = await Question.find({ difficulty: 'easy' });
      expect(easyQuestions).toHaveLength(1);
    });

    it('should find active questions only', async () => {
      await Question.create({
        questionText: 'Active Q',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['A'],
        distractors: ['B', 'C'],
        isActive: true
      });

      await Question.create({
        questionText: 'Inactive Q',
        questionTypes: ['multiple_choice'],
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['A'],
        distractors: ['B', 'C'],
        isActive: false
      });

      const activeQuestions = await Question.find({ isActive: true });
      expect(activeQuestions).toHaveLength(1);
    });
  });
});
