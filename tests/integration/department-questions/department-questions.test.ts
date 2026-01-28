/**
 * Department Questions API Integration Tests
 *
 * Tests the department-scoped questions API endpoints:
 * - GET    /api/v2/departments/:departmentId/questions
 * - POST   /api/v2/departments/:departmentId/questions
 * - GET    /api/v2/departments/:departmentId/questions/:questionId
 * - PUT    /api/v2/departments/:departmentId/questions/:questionId
 * - DELETE /api/v2/departments/:departmentId/questions/:questionId
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Question from '@/models/assessment/Question.model';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import LearningUnitQuestion from '@/models/content/LearningUnitQuestion.model';
import Module from '@/models/academic/Module.model';
import Course from '@/models/academic/Course.model';
import Department from '@/models/organization/Department.model';
import { LookupValue } from '@/models/LookupValue.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';
import { seedLearningUnitLookups } from '../../helpers/lookup-values';

describeIfMongo('Department Questions API', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testUser: any;
  let testQuestionBank: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create course-status lookup value
    await LookupValue.create({
      category: 'course-status',
      key: 'draft',
      displayAs: 'Draft',
      sortOrder: 1,
      isActive: true
    });

    // Seed learning unit lookups for dependency tests
    await seedLearningUnitLookups();

    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'DQTEST',
      level: 0,
      path: [],
      isActive: true
    });

    // Refresh department cache after creating departments
    await refreshDepartmentCache();

    // Seed role definitions
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage content and assessments',
      accessRights: ['content:assessments:manage', 'content:lessons:read', 'content:courses:manage'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:assessments:manage', domain: 'content', resource: 'assessments', action: 'manage', description: 'Manage assessments', isActive: true },
      { name: 'content:lessons:read', domain: 'content', resource: 'lessons', action: 'read', description: 'Read lessons', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses', isActive: true }
    ]);

    // Create test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'department-questions-test@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: testUser._id,
      person: {
        firstName: 'Test',
        lastName: 'User',
        emails: [{
          email: testUser.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['content-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Generate auth token
    authToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        email: testUser.email,
        type: 'access',
        globalRights: ['*'],
        departmentRights: {
          [testDepartment._id.toString()]: ['content:assessments:manage', 'content:lessons:read', 'content:courses:manage']
        },
        departmentMemberships: [{ departmentId: testDepartment._id }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create a test question bank for each test
    testQuestionBank = await QuestionBank.create({
      name: 'Test Question Bank',
      description: 'A test question bank',
      departmentId: testDepartment._id,
      questionIds: [],
      isActive: true
    });
  });

  afterEach(async () => {
    await Question.deleteMany({});
    await QuestionBank.deleteMany({});
    await LearningUnitQuestion.deleteMany({});
    await LearningUnit.deleteMany({});
    await Module.deleteMany({});
    await Course.deleteMany({});
  });

  // =========================================================================
  // POST /api/v2/departments/:departmentId/questions - Create Question
  // =========================================================================
  describe('POST /api/v2/departments/:departmentId/questions', () => {
    describe('multiple_choice questions', () => {
      it('should create a multiple_choice question with options', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['multiple_choice'],
            text: 'What is 2 + 2?',
            points: 10,
            difficulty: 'easy',
            options: [
              { text: '3', isCorrect: false },
              { text: '4', isCorrect: true },
              { text: '5', isCorrect: false }
            ]
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.questionTypes).toContain('multiple_choice');
        expect(response.body.data.text).toBe('What is 2 + 2?');
        expect(response.body.data.points).toBe(10);
        expect(response.body.data.difficulty).toBe('easy');
        expect(response.body.data.options).toHaveLength(3);
        // Verify options have the correct structure with isCorrect property
        expect(response.body.data.options.every((o: any) => typeof o.isCorrect === 'boolean')).toBe(true);
        // The options are returned with id, text, and isCorrect properties
        const optionTexts = response.body.data.options.map((o: any) => o.text);
        expect(optionTexts).toContain('3');
        expect(optionTexts).toContain('4');
        expect(optionTexts).toContain('5');
      });

      it('should reject multiple_choice without options', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['multiple_choice'],
            text: 'What is 2 + 2?',
            points: 10
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('options');
      });

      it('should reject multiple_choice with less than 2 options', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['multiple_choice'],
            text: 'What is 2 + 2?',
            points: 10,
            options: [{ text: '4', isCorrect: true }]
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('at least 2 options');
      });

      it('should reject multiple_choice without correct option', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['multiple_choice'],
            text: 'What is 2 + 2?',
            points: 10,
            options: [
              { text: '3', isCorrect: false },
              { text: '5', isCorrect: false }
            ]
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('correct option');
      });
    });

    describe('true_false questions', () => {
      it('should create a true_false question', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['true_false'],
            text: 'The sky is blue.',
            points: 5,
            difficulty: 'easy',
            options: [
              { text: 'True', isCorrect: true },
              { text: 'False', isCorrect: false }
            ]
          });

        expect(response.status).toBe(201);
        expect(response.body.data.questionTypes).toContain('true_false');
        expect(response.body.data.options).toHaveLength(2);
      });

      it('should reject true_false with more than 2 options', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['true_false'],
            text: 'The sky is blue.',
            points: 5,
            options: [
              { text: 'True', isCorrect: true },
              { text: 'False', isCorrect: false },
              { text: 'Maybe', isCorrect: false }
            ]
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('exactly 2 options');
      });

      it('should reject true_false with multiple correct answers', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['true_false'],
            text: 'The sky is blue.',
            points: 5,
            options: [
              { text: 'True', isCorrect: true },
              { text: 'False', isCorrect: true }
            ]
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('exactly 1 correct');
      });
    });

    describe('short_answer questions', () => {
      it('should create a short_answer question with acceptedAnswers', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['short_answer'],
            text: 'What is the capital of France?',
            points: 10,
            difficulty: 'medium',
            acceptedAnswers: ['Paris', 'paris', 'PARIS'],
            matchThreshold: 90
          });

        expect(response.status).toBe(201);
        expect(response.body.data.questionTypes).toContain('short_answer');
        expect(response.body.data.acceptedAnswers).toEqual(['Paris', 'paris', 'PARIS']);
        expect(response.body.data.matchThreshold).toBe(90);
      });

      it('should reject short_answer without acceptedAnswers', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['short_answer'],
            text: 'What is the capital of France?',
            points: 10
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('accepted answer');
      });

      it('should use default matchThreshold when not provided', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['short_answer'],
            text: 'What is the capital of France?',
            points: 10,
            acceptedAnswers: ['Paris']
          });

        expect(response.status).toBe(201);
        expect(response.body.data.matchThreshold).toBe(80); // default
      });
    });

    describe('long_answer questions', () => {
      it('should create a long_answer question', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['long_answer'],
            text: 'Explain the theory of relativity.',
            points: 20,
            difficulty: 'hard',
            sampleAnswer: 'The theory of relativity is...',
            rubric: '5 points: Complete explanation with examples'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.questionTypes).toContain('long_answer');
        expect(response.body.data.sampleAnswer).toBe('The theory of relativity is...');
        expect(response.body.data.rubric).toBe('5 points: Complete explanation with examples');
      });

      it('should create a long_answer question with minimal fields', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['long_answer'],
            text: 'Describe your experience.',
            points: 15
          });

        expect(response.status).toBe(201);
        expect(response.body.data.questionTypes).toContain('long_answer');
        expect(response.body.data.sampleAnswer).toBeNull();
        expect(response.body.data.rubric).toBeNull();
      });
    });

    describe('matching questions', () => {
      it('should create a matching question with pairs', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['matching'],
            text: 'Match the capitals with their countries.',
            points: 15,
            difficulty: 'medium',
            pairs: [
              { left: 'France', right: 'Paris' },
              { left: 'Germany', right: 'Berlin' },
              { left: 'Italy', right: 'Rome' }
            ]
          });

        expect(response.status).toBe(201);
        expect(response.body.data.questionTypes).toContain('matching');
        expect(response.body.data.pairs).toHaveLength(3);
        expect(response.body.data.pairs[0].left).toBe('France');
        expect(response.body.data.pairs[0].right).toBe('Paris');
      });

      it('should reject matching with less than 2 pairs', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['matching'],
            text: 'Match the capitals.',
            points: 15,
            pairs: [{ left: 'France', right: 'Paris' }]
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('at least 2 pairs');
      });

      it('should reject matching pairs without left or right', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['matching'],
            text: 'Match the capitals.',
            points: 15,
            pairs: [
              { left: 'France', right: 'Paris' },
              { left: 'Germany' }
            ]
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('left and right');
      });
    });

    describe('flashcard questions', () => {
      it('should create a flashcard question with cards', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['flashcard'],
            text: 'Study these vocabulary words.',
            points: 10,
            difficulty: 'easy',
            cards: [
              { front: 'Bonjour', back: 'Hello', hint: 'French greeting' },
              { front: 'Merci', back: 'Thank you' }
            ]
          });

        expect(response.status).toBe(201);
        expect(response.body.data.questionTypes).toContain('flashcard');
        expect(response.body.data.cards).toHaveLength(2);
        expect(response.body.data.cards[0].front).toBe('Bonjour');
        expect(response.body.data.cards[0].back).toBe('Hello');
        expect(response.body.data.cards[0].hint).toBe('French greeting');
        expect(response.body.data.cards[1].hint).toBeNull();
      });

      it('should reject flashcard without cards', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['flashcard'],
            text: 'Study these words.',
            points: 10
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('at least 1 card');
      });

      it('should reject flashcard cards without front or back', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['flashcard'],
            text: 'Study these words.',
            points: 10,
            cards: [{ front: 'Bonjour' }]
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('front and back');
      });
    });

    describe('fill_in_blank questions', () => {
      it('should create a fill_in_blank question', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['fill_in_blank'],
            text: 'The capital of France is {{blank}}.',
            points: 10,
            difficulty: 'easy',
            blanks: [
              {
                position: 0,
                acceptedAnswers: ['Paris', 'paris'],
                matchThreshold: 90
              }
            ]
          });

        expect(response.status).toBe(201);
        expect(response.body.data.questionTypes).toContain('fill_in_blank');
        expect(response.body.data.blanks).toHaveLength(1);
        expect(response.body.data.blanks[0].position).toBe(0);
        expect(response.body.data.blanks[0].acceptedAnswers).toEqual(['Paris', 'paris']);
      });

      it('should reject fill_in_blank without blanks', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['fill_in_blank'],
            text: 'The capital of France is {{blank}}.',
            points: 10
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('at least 1 blank');
      });

      it('should reject fill_in_blank with mismatched placeholder count', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['fill_in_blank'],
            text: 'The capital of France is {{blank}} and Germany is {{blank}}.',
            points: 10,
            blanks: [
              { position: 0, acceptedAnswers: ['Paris'] }
            ]
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('placeholder');
      });
    });

    describe('question bank association', () => {
      it('should add question to bank if questionBankIds provided', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['multiple_choice'],
            text: 'What is 3 + 3?',
            points: 10,
            questionBankIds: [testQuestionBank._id.toString()],
            options: [
              { text: '5', isCorrect: false },
              { text: '6', isCorrect: true },
              { text: '7', isCorrect: false }
            ]
          });

        expect(response.status).toBe(201);
        expect(response.body.data.questionBankIds).toContain(testQuestionBank._id.toString());
        expect(response.body.data.bankNames).toContain('Test Question Bank');

        // Verify question is in bank
        const updatedBank = await QuestionBank.findById(testQuestionBank._id);
        expect(updatedBank!.questionIds.map(id => id.toString())).toContain(response.body.data.id);
      });

      it('should reject if questionBankId not in same department', async () => {
        // Create a bank in a different department
        const otherDept = await Department.create({
          name: 'Other Department',
          code: 'OTHERDQ1',
          level: 0,
          path: [],
          isActive: true
        });

        const otherBank = await QuestionBank.create({
          name: 'Other Bank',
          departmentId: otherDept._id,
          isActive: true
        });

        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['multiple_choice'],
            text: 'Test question',
            points: 10,
            questionBankIds: [otherBank._id.toString()],
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false }
            ]
          });

        expect(response.status).toBe(404);
        expect(response.body.message).toContain('not found');

        // Cleanup
        await Department.findByIdAndDelete(otherDept._id);
      });
    });

    describe('hierarchy validation', () => {
      it('should create question with hierarchy', async () => {
        // Create a parent question first
        const parentResponse = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['multiple_choice'],
            text: 'Parent question',
            points: 10,
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false }
            ]
          });

        expect(parentResponse.status).toBe(201);
        const parentId = parentResponse.body.data.id;

        // Create child question with hierarchy
        const childResponse = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['multiple_choice'],
            text: 'Child question',
            points: 15,
            options: [
              { text: 'X', isCorrect: true },
              { text: 'Y', isCorrect: false }
            ],
            hierarchy: {
              parentQuestionId: parentId,
              conceptTag: 'math-basics',
              difficultyProgression: 2
            }
          });

        expect(childResponse.status).toBe(201);
        expect(childResponse.body.data.hierarchy.parentQuestionId).toBe(parentId);
        expect(childResponse.body.data.hierarchy.conceptTag).toBe('math-basics');
        expect(childResponse.body.data.hierarchy.difficultyProgression).toBe(2);
      });

      it('should validate hierarchy (no circular dependency)', async () => {
        // Create question A
        const questionAResponse = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['multiple_choice'],
            text: 'Question A',
            points: 10,
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false }
            ]
          });

        expect(questionAResponse.status).toBe(201);
        const questionAId = questionAResponse.body.data.id;

        // Create question B with parentQuestionId = A
        const questionBResponse = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['multiple_choice'],
            text: 'Question B',
            points: 10,
            options: [
              { text: 'X', isCorrect: true },
              { text: 'Y', isCorrect: false }
            ],
            hierarchy: {
              parentQuestionId: questionAId
            }
          });

        expect(questionBResponse.status).toBe(201);
        const questionBId = questionBResponse.body.data.id;

        // Try to update A with parentQuestionId = B (should fail - circular dependency)
        const updateResponse = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${questionAId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            hierarchy: {
              parentQuestionId: questionBId
            }
          });

        expect(updateResponse.status).toBe(500); // Model-level validation throws error
      });

      it('should prevent question from being its own parent', async () => {
        // Create a question first
        const createResponse = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['multiple_choice'],
            text: 'Self reference question',
            points: 10,
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false }
            ]
          });

        const questionId = createResponse.body.data.id;

        // Try to set itself as parent
        const updateResponse = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${questionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            hierarchy: {
              parentQuestionId: questionId
            }
          });

        expect(updateResponse.status).toBe(400);
        expect(updateResponse.body.message).toContain('own parent');
      });
    });

    describe('validation errors', () => {
      it('should return 400 for invalid question type', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            types: ['invalid_type'],
            text: 'Test question',
            points: 10
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid question type');
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/questions`)
          .send({
            types: ['multiple_choice'],
            text: 'Test question',
            points: 10,
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false }
            ]
          });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // GET /api/v2/departments/:departmentId/questions - List Questions
  // =========================================================================
  describe('GET /api/v2/departments/:departmentId/questions', () => {
    beforeEach(async () => {
      // Create test questions
      await Question.create([
        {
          questionText: 'Multiple choice easy question',
          questionTypes: ['multiple_choice'],
          departmentId: testDepartment._id,
          points: 10,
          difficulty: 'easy',
          tags: ['math', 'arithmetic'],
          options: ['A', 'B', 'C'],
          correctAnswer: 'A',
          isActive: true,
          questionBankIds: [testQuestionBank._id.toString()]
        },
        {
          questionText: 'Multiple choice medium question',
          questionTypes: ['multiple_choice'],
          departmentId: testDepartment._id,
          points: 15,
          difficulty: 'medium',
          tags: ['math'],
          options: ['X', 'Y', 'Z'],
          correctAnswer: 'Y',
          isActive: true,
          questionBankIds: []
        },
        {
          questionText: 'Short answer hard question',
          questionTypes: ['short_answer'],
          departmentId: testDepartment._id,
          points: 20,
          difficulty: 'hard',
          tags: ['geography'],
          acceptedAnswers: ['Paris'],
          matchThreshold: 80,
          isActive: true,
          questionBankIds: []
        },
        {
          questionText: 'True false question',
          questionTypes: ['true_false'],
          departmentId: testDepartment._id,
          points: 5,
          difficulty: 'easy',
          tags: ['science'],
          options: ['True', 'False'],
          correctAnswer: 'True',
          isActive: true,
          questionBankIds: []
        },
        {
          questionText: 'Flashcard question',
          questionTypes: ['flashcard'],
          departmentId: testDepartment._id,
          points: 10,
          difficulty: 'medium',
          tags: ['vocabulary'],
          cards: [{ front: 'Hello', back: 'Bonjour' }],
          isActive: true,
          questionBankIds: []
        }
      ]);
    });

    describe('basic listing', () => {
      it('should list all questions in department', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.questions).toHaveLength(5);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.total).toBe(5);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions`);

        expect(response.status).toBe(401);
      });
    });

    describe('filtering by type', () => {
      it('should filter by type=multiple_choice', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?type=multiple_choice`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.questions).toHaveLength(2);
        response.body.data.questions.forEach((q: any) => {
          expect(q.questionTypes).toContain('multiple_choice');
        });
      });

      it('should filter by type=short_answer', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?type=short_answer`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.questions).toHaveLength(1);
        expect(response.body.data.questions[0].questionTypes).toContain('short_answer');
      });

      it('should return 400 for invalid type', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?type=invalid_type`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('filtering by difficulty', () => {
      it('should filter by difficulty=easy', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?difficulty=easy`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.questions).toHaveLength(2);
        response.body.data.questions.forEach((q: any) => {
          expect(q.difficulty).toBe('easy');
        });
      });

      it('should filter by difficulty=hard', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?difficulty=hard`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.questions).toHaveLength(1);
        expect(response.body.data.questions[0].difficulty).toBe('hard');
      });
    });

    describe('filtering by bankId', () => {
      it('should filter by bankId', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?bankId=${testQuestionBank._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.questions).toHaveLength(1);
        expect(response.body.data.questions[0].questionBankIds).toContain(testQuestionBank._id.toString());
      });

      it('should return 400 for invalid bankId', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?bankId=invalid-id`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('search by question text', () => {
      it('should search by question text', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?search=easy`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.questions.length).toBeGreaterThan(0);
        response.body.data.questions.forEach((q: any) => {
          expect(q.text.toLowerCase()).toContain('easy');
        });
      });

      it('should return empty array for search with no matches', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?search=nonexistent_xyz`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.questions).toHaveLength(0);
        expect(response.body.data.pagination.total).toBe(0);
      });
    });

    describe('pagination', () => {
      it('should paginate results', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?page=1&limit=2`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.questions).toHaveLength(2);
        expect(response.body.data.pagination.total).toBe(5);
        expect(response.body.data.pagination.totalPages).toBe(3);
        expect(response.body.data.pagination.hasNext).toBe(true);
        expect(response.body.data.pagination.hasPrev).toBe(false);
      });

      it('should return second page', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?page=2&limit=2`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.questions).toHaveLength(2);
        expect(response.body.data.pagination.hasNext).toBe(true);
        expect(response.body.data.pagination.hasPrev).toBe(true);
      });

      it('should enforce max limit of 100', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?limit=150`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        // Should cap at 100, but we only have 5 questions
        expect(response.body.data.pagination.limit).toBe(100);
      });
    });

    describe('sorting', () => {
      it('should sort by createdAt descending by default', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const questions = response.body.data.questions;
        for (let i = 0; i < questions.length - 1; i++) {
          const date1 = new Date(questions[i].createdAt).getTime();
          const date2 = new Date(questions[i + 1].createdAt).getTime();
          expect(date1).toBeGreaterThanOrEqual(date2);
        }
      });

      it('should sort by points ascending', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?sort=points`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const questions = response.body.data.questions;
        for (let i = 0; i < questions.length - 1; i++) {
          expect(questions[i].points).toBeLessThanOrEqual(questions[i + 1].points);
        }
      });

      it('should sort by points descending', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions?sort=-points`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const questions = response.body.data.questions;
        for (let i = 0; i < questions.length - 1; i++) {
          expect(questions[i].points).toBeGreaterThanOrEqual(questions[i + 1].points);
        }
      });
    });
  });

  // =========================================================================
  // GET /api/v2/departments/:departmentId/questions/:questionId - Get Single
  // =========================================================================
  describe('GET /api/v2/departments/:departmentId/questions/:questionId', () => {
    let testQuestion: any;

    beforeEach(async () => {
      testQuestion = await Question.create({
        questionText: 'Test question for retrieval',
        questionTypes: ['multiple_choice'],
        departmentId: testDepartment._id,
        points: 10,
        difficulty: 'medium',
        tags: ['test', 'retrieval'],
        explanation: 'This is the explanation',
        options: ['A', 'B', 'C'],
        correctAnswer: 'B',
        isActive: true,
        questionBankIds: [testQuestionBank._id.toString()]
      });
    });

    it('should return question by ID', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testQuestion._id.toString());
      expect(response.body.data.text).toBe('Test question for retrieval');
      expect(response.body.data.questionTypes).toContain('multiple_choice');
      expect(response.body.data.points).toBe(10);
      expect(response.body.data.difficulty).toBe('medium');
      expect(response.body.data.explanation).toBe('This is the explanation');
      expect(response.body.data.tags).toEqual(['test', 'retrieval']);
    });

    it('should include options for multiple_choice', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.options).toHaveLength(3);
      // Verify options have the correct structure
      expect(response.body.data.options.every((o: any) => typeof o.isCorrect === 'boolean')).toBe(true);
      // The options should contain A, B, C
      const optionTexts = response.body.data.options.map((o: any) => o.text);
      expect(optionTexts).toContain('A');
      expect(optionTexts).toContain('B');
      expect(optionTexts).toContain('C');
    });

    it('should include usageCount', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.usageCount).toBe(0);
    });

    it('should return 404 for non-existent question', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/questions/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for question in different department', async () => {
      const otherDept = await Department.create({
        name: 'Other Dept',
        code: 'OTHERDQ2',
        level: 0,
        path: [],
        isActive: true
      });

      const otherQuestion = await Question.create({
        questionText: 'Other department question',
        questionTypes: ['multiple_choice'],
        departmentId: otherDept._id,
        points: 10,
        options: ['A', 'B'],
        correctAnswer: 'A',
        isActive: true
      });

      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/questions/${otherQuestion._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);

      // Cleanup
      await Department.findByIdAndDelete(otherDept._id);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`);

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // PUT /api/v2/departments/:departmentId/questions/:questionId - Update
  // =========================================================================
  describe('PUT /api/v2/departments/:departmentId/questions/:questionId', () => {
    let testQuestion: any;

    beforeEach(async () => {
      testQuestion = await Question.create({
        questionText: 'Original question text',
        questionTypes: ['multiple_choice'],
        departmentId: testDepartment._id,
        points: 10,
        difficulty: 'easy',
        tags: ['original'],
        options: ['A', 'B', 'C'],
        correctAnswer: 'A',
        isActive: true,
        questionBankIds: []
      });
    });

    describe('updating basic fields', () => {
      it('should update question text', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            text: 'Updated question text'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.text).toBe('Updated question text');
      });

      it('should update points', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            points: 25
          });

        expect(response.status).toBe(200);
        expect(response.body.data.points).toBe(25);
      });

      it('should update difficulty', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            difficulty: 'hard'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.difficulty).toBe('hard');
      });

      it('should update tags', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            tags: ['updated', 'new-tag']
          });

        expect(response.status).toBe(200);
        expect(response.body.data.tags).toEqual(['updated', 'new-tag']);
      });

      it('should update explanation', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            explanation: 'New explanation text'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.explanation).toBe('New explanation text');
      });
    });

    describe('updating options', () => {
      it('should update options for multiple_choice', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            options: [
              { text: 'X', isCorrect: false },
              { text: 'Y', isCorrect: true },
              { text: 'Z', isCorrect: false }
            ]
          });

        expect(response.status).toBe(200);
        expect(response.body.data.options).toHaveLength(3);
        expect(response.body.data.options.find((o: any) => o.text === 'Y').isCorrect).toBe(true);
      });

      it('should reject update with no correct option', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            options: [
              { text: 'X', isCorrect: false },
              { text: 'Y', isCorrect: false }
            ]
          });

        expect(response.status).toBe(400);
      });
    });

    describe('updating question banks', () => {
      it('should add question to bank', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionBankIds: [testQuestionBank._id.toString()]
          });

        expect(response.status).toBe(200);
        expect(response.body.data.questionBankIds).toContain(testQuestionBank._id.toString());

        // Verify bank was updated
        const updatedBank = await QuestionBank.findById(testQuestionBank._id);
        expect(updatedBank!.questionIds.map(id => id.toString())).toContain(testQuestion._id.toString());
      });

      it('should remove question from bank', async () => {
        // First add to bank
        await Question.findByIdAndUpdate(testQuestion._id, {
          questionBankIds: [testQuestionBank._id.toString()]
        });
        await QuestionBank.findByIdAndUpdate(testQuestionBank._id, {
          $addToSet: { questionIds: testQuestion._id }
        });

        // Then remove
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionBankIds: []
          });

        expect(response.status).toBe(200);
        expect(response.body.data.questionBankIds).toHaveLength(0);

        // Verify bank was updated
        const updatedBank = await QuestionBank.findById(testQuestionBank._id);
        expect(updatedBank!.questionIds.map(id => id.toString())).not.toContain(testQuestion._id.toString());
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent question', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Updated' });

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid question type', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ types: ['invalid_type'] });

        expect(response.status).toBe(400);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .send({ text: 'Updated' });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // DELETE /api/v2/departments/:departmentId/questions/:questionId - Delete
  // =========================================================================
  describe('DELETE /api/v2/departments/:departmentId/questions/:questionId', () => {
    let testQuestion: any;

    beforeEach(async () => {
      testQuestion = await Question.create({
        questionText: 'Question to delete',
        questionTypes: ['multiple_choice'],
        departmentId: testDepartment._id,
        points: 10,
        options: ['A', 'B'],
        correctAnswer: 'A',
        isActive: true,
        questionBankIds: [testQuestionBank._id.toString()]
      });

      // Add to bank
      await QuestionBank.findByIdAndUpdate(testQuestionBank._id, {
        $addToSet: { questionIds: testQuestion._id }
      });
    });

    describe('successful deletion', () => {
      it('should delete question when not linked', async () => {
        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');

        // Verify soft delete
        const deletedQuestion = await Question.findById(testQuestion._id);
        expect(deletedQuestion!.isActive).toBe(false);

        // Verify removed from bank
        const updatedBank = await QuestionBank.findById(testQuestionBank._id);
        expect(updatedBank!.questionIds.map(id => id.toString())).not.toContain(testQuestion._id.toString());
      });

      it('should not return deleted question in list', async () => {
        await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const ids = response.body.data.questions.map((q: any) => q.id);
        expect(ids).not.toContain(testQuestion._id.toString());
      });
    });

    describe('deletion with dependencies', () => {
      it('should return dependencies when question is linked to learning units', async () => {
        // Create a course, module, and learning unit
        const testCourse = await Course.create({
          name: 'Test Course',
          code: 'DQTC1',
          departmentId: testDepartment._id,
          credits: 3,
          status: 'draft',
          isActive: true
        });

        const testModule = await Module.create({
          courseId: testCourse._id,
          title: 'Test Module',
          order: 1,
          completionCriteria: { type: 'all_required' },
          presentationRules: {
            presentationMode: 'prescribed',
            repetitionMode: 'none',
            repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
            repeatableCategories: [],
            showAllAvailable: true,
            allowSkip: false
          },
          createdBy: testUser._id
        });

        const testLearningUnit = await LearningUnit.create({
          moduleId: testModule._id,
          title: 'Test Learning Unit',
          type: 'assessment',
          category: 'graded',
          isRequired: true,
          isReplayable: false,
          weight: 10,
          sequence: 1,
          isActive: true,
          createdBy: testUser._id
        });

        // Link question to learning unit
        await LearningUnitQuestion.create({
          learningUnitId: testLearningUnit._id,
          questionId: testQuestion._id,
          sequence: 1
        });

        // Try to delete
        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('QUESTION_HAS_DEPENDENCIES');
        expect(response.body.message).toContain('linked to');
        expect(response.body.message).toContain('1 learning unit');

        // Verify question was NOT deleted
        const stillActive = await Question.findById(testQuestion._id);
        expect(stillActive!.isActive).toBe(true);
      });

      it('should return all dependencies when linked to multiple learning units', async () => {
        // Create multiple learning units and link them
        const testCourse = await Course.create({
          name: 'Test Course',
          code: 'DQTC2',
          departmentId: testDepartment._id,
          credits: 3,
          status: 'draft',
          isActive: true
        });

        const testModule = await Module.create({
          courseId: testCourse._id,
          title: 'Test Module',
          order: 1,
          completionCriteria: { type: 'all_required' },
          presentationRules: {
            presentationMode: 'prescribed',
            repetitionMode: 'none',
            repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
            repeatableCategories: [],
            showAllAvailable: true,
            allowSkip: false
          },
          createdBy: testUser._id
        });

        const learningUnit1 = await LearningUnit.create({
          moduleId: testModule._id,
          title: 'Learning Unit 1',
          type: 'assessment',
          category: 'graded',
          isRequired: true,
          isReplayable: false,
          weight: 10,
          sequence: 1,
          isActive: true,
          createdBy: testUser._id
        });

        const learningUnit2 = await LearningUnit.create({
          moduleId: testModule._id,
          title: 'Learning Unit 2',
          type: 'exercise',
          category: 'practice',
          isRequired: false,
          isReplayable: true,
          weight: 5,
          sequence: 2,
          isActive: true,
          createdBy: testUser._id
        });

        // Link question to both learning units
        await LearningUnitQuestion.create([
          { learningUnitId: learningUnit1._id, questionId: testQuestion._id, sequence: 1 },
          { learningUnitId: learningUnit2._id, questionId: testQuestion._id, sequence: 1 }
        ]);

        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('QUESTION_HAS_DEPENDENCIES');
        expect(response.body.message).toContain('linked to');
        expect(response.body.message).toContain('2 learning unit');

        // Verify question was NOT deleted
        const stillActive = await Question.findById(testQuestion._id);
        expect(stillActive!.isActive).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent question', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/questions/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 404 for already deleted question', async () => {
        // Delete once
        await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Try to delete again
        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/questions/${testQuestion._id}`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Multiple Select Questions (additional coverage)
  // =========================================================================
  describe('multiple_select questions', () => {
    it('should create a multiple_select question with multiple correct answers', async () => {
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          types: ['multiple_select'],
          text: 'Select all prime numbers.',
          points: 15,
          difficulty: 'medium',
          options: [
            { text: '2', isCorrect: true },
            { text: '3', isCorrect: true },
            { text: '4', isCorrect: false },
            { text: '5', isCorrect: true }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.data.questionTypes).toContain('multiple_select');
      const correctOptions = response.body.data.options.filter((o: any) => o.isCorrect);
      expect(correctOptions).toHaveLength(3);
    });
  });
});
