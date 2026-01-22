import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Question, { IQuestion } from '../../../src/models/assessment/Question.model';

describe('Question Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Question.deleteMany({});
  });

  describe('questionBankIds field', () => {
    const validQuestionData = {
      questionText: 'What is 2 + 2?',
      questionType: 'multiple-choice' as const,
      departmentId: new mongoose.Types.ObjectId(),
      points: 5,
      options: ['3', '4', '5', '6'],
      correctAnswer: '4'
    };

    it('should default to empty array when not provided', async () => {
      const question = await Question.create(validQuestionData);

      expect(question.questionBankIds).toBeDefined();
      expect(Array.isArray(question.questionBankIds)).toBe(true);
      expect(question.questionBankIds.length).toBe(0);
    });

    it('should accept an empty array', async () => {
      const question = await Question.create({
        ...validQuestionData,
        questionBankIds: []
      });

      expect(question.questionBankIds).toEqual([]);
    });

    it('should accept an array with a single bank ID', async () => {
      const bankId = 'bank-safety-001';
      const question = await Question.create({
        ...validQuestionData,
        questionBankIds: [bankId]
      });

      expect(question.questionBankIds).toEqual([bankId]);
    });

    it('should accept an array with multiple bank IDs', async () => {
      const bankIds = ['bank-safety-001', 'bank-module-1', 'bank-advanced'];
      const question = await Question.create({
        ...validQuestionData,
        questionBankIds: bankIds
      });

      expect(question.questionBankIds).toEqual(bankIds);
      expect(question.questionBankIds.length).toBe(3);
    });

    it('should persist questionBankIds after save', async () => {
      const bankIds = ['bank-test-1', 'bank-test-2'];
      const question = await Question.create({
        ...validQuestionData,
        questionBankIds: bankIds
      });

      const foundQuestion = await Question.findById(question._id);
      expect(foundQuestion?.questionBankIds).toEqual(bankIds);
    });

    it('should allow updating questionBankIds', async () => {
      const question = await Question.create(validQuestionData);

      question.questionBankIds = ['bank-updated-1', 'bank-updated-2'];
      await question.save();

      const updatedQuestion = await Question.findById(question._id);
      expect(updatedQuestion?.questionBankIds).toEqual(['bank-updated-1', 'bank-updated-2']);
    });

    it('should be queryable by bank ID using $in operator', async () => {
      // Create questions with different bank IDs
      await Question.create({
        ...validQuestionData,
        questionText: 'Question 1',
        questionBankIds: ['bank-safety', 'bank-module-1']
      });

      await Question.create({
        ...validQuestionData,
        questionText: 'Question 2',
        questionBankIds: ['bank-safety', 'bank-advanced']
      });

      await Question.create({
        ...validQuestionData,
        questionText: 'Question 3',
        questionBankIds: ['bank-module-1']
      });

      await Question.create({
        ...validQuestionData,
        questionText: 'Question 4',
        questionBankIds: []
      });

      // Query for questions in bank-safety
      const safetyQuestions = await Question.find({
        questionBankIds: { $in: ['bank-safety'] }
      });

      expect(safetyQuestions.length).toBe(2);
      expect(safetyQuestions[0].questionText).toMatch(/Question [12]/);
      expect(safetyQuestions[1].questionText).toMatch(/Question [12]/);

      // Query for questions in bank-module-1
      const module1Questions = await Question.find({
        questionBankIds: { $in: ['bank-module-1'] }
      });

      expect(module1Questions.length).toBe(2);
    });

    it('should support finding questions in multiple banks', async () => {
      await Question.create({
        ...validQuestionData,
        questionText: 'Question 1',
        questionBankIds: ['bank-a']
      });

      await Question.create({
        ...validQuestionData,
        questionText: 'Question 2',
        questionBankIds: ['bank-b']
      });

      await Question.create({
        ...validQuestionData,
        questionText: 'Question 3',
        questionBankIds: ['bank-c']
      });

      // Query for questions in bank-a OR bank-c
      const questions = await Question.find({
        questionBankIds: { $in: ['bank-a', 'bank-c'] }
      });

      expect(questions.length).toBe(2);
      const questionTexts = questions.map(q => q.questionText).sort();
      expect(questionTexts).toEqual(['Question 1', 'Question 3']);
    });

    it('should have an index for efficient querying', async () => {
      const indexes = await Question.collection.getIndexes();

      // Check if questionBankIds has an index
      const questionBankIdsIndex = Object.keys(indexes).find(key =>
        key.includes('questionBankIds')
      );

      expect(questionBankIdsIndex).toBeDefined();
    });

    it('should maintain backward compatibility with existing questions', async () => {
      // Simulate an existing question without questionBankIds field
      const questionData = {
        ...validQuestionData,
        questionText: 'Legacy question'
      };

      // @ts-expect-error - Testing backward compatibility
      delete questionData.questionBankIds;

      const question = await Question.create(questionData);

      // Should default to empty array
      expect(question.questionBankIds).toBeDefined();
      expect(question.questionBankIds).toEqual([]);
    });

    it('should allow empty strings in questionBankIds array', async () => {
      // Edge case: empty strings should be allowed (though not recommended)
      const question = await Question.create({
        ...validQuestionData,
        questionBankIds: ['', 'bank-valid']
      });

      expect(question.questionBankIds).toHaveLength(2);
      expect(question.questionBankIds[0]).toBe('');
      expect(question.questionBankIds[1]).toBe('bank-valid');
    });

    it('should handle duplicate bank IDs in array', async () => {
      // Edge case: duplicates should be allowed (application logic can handle deduplication)
      const question = await Question.create({
        ...validQuestionData,
        questionBankIds: ['bank-1', 'bank-1', 'bank-2']
      });

      expect(question.questionBankIds).toHaveLength(3);
      expect(question.questionBankIds).toEqual(['bank-1', 'bank-1', 'bank-2']);
    });
  });

  describe('existing field compatibility', () => {
    it('should create a question with all required fields and questionBankIds', async () => {
      const departmentId = new mongoose.Types.ObjectId();

      const question = await Question.create({
        questionText: 'Complete question with bank IDs',
        questionType: 'multiple-choice',
        departmentId,
        points: 10,
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 'Option A',
        difficulty: 'medium',
        tags: ['test', 'sample'],
        questionBankIds: ['bank-comprehensive']
      });

      expect(question.questionText).toBe('Complete question with bank IDs');
      expect(question.questionType).toBe('multiple-choice');
      expect(question.points).toBe(10);
      expect(question.questionBankIds).toEqual(['bank-comprehensive']);
    });
  });
});
