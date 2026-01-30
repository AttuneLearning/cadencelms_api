/**
 * Learning Unit Questions API Integration Tests
 *
 * Tests the Learning Unit Questions API endpoints for linking questions
 * from question banks to learning units (exercise/assessment types).
 *
 * Base path: /api/v2/learning-units/:learningUnitId/questions
 *
 * Endpoints tested:
 * - GET    /api/v2/learning-units/:learningUnitId/questions
 * - POST   /api/v2/learning-units/:learningUnitId/questions
 * - POST   /api/v2/learning-units/:learningUnitId/questions/bulk
 * - PUT    /api/v2/learning-units/:learningUnitId/questions/:linkId
 * - DELETE /api/v2/learning-units/:learningUnitId/questions/:linkId
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import LearningUnit from '@/models/content/LearningUnit.model';
import LearningUnitQuestion from '@/models/content/LearningUnitQuestion.model';
import Module from '@/models/academic/Module.model';
import Course from '@/models/academic/Course.model';
import Department from '@/models/organization/Department.model';
import Question from '@/models/assessment/Question.model';
import Setting from '@/models/system/Setting.model';
import { LookupValue } from '@/models/LookupValue.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';
import { seedLearningUnitLookups } from '../../helpers/lookup-values';

describeIfMongo('Learning Unit Questions API', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testDepartment2: any;
  let testCourse: any;
  let testModule: any;
  let testLearningUnitExercise: any;
  let testLearningUnitAssessment: any;
  let testLearningUnitLesson: any;
  let testUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create required lookup values
    await LookupValue.create({
      category: 'course-status',
      key: 'draft',
      displayAs: 'Draft',
      sortOrder: 0,
      isActive: true
    });

    await seedLearningUnitLookups();

    // Create test departments
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TESTDEPT',
      slug: 'test-department',
      level: 0,
      path: [],
      isActive: true
    });

    testDepartment2 = await Department.create({
      name: 'Other Department',
      code: 'OTHERDEPT',
      slug: 'other-department',
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
      description: 'Can manage content',
      accessRights: ['content:assessments:manage', 'content:lessons:manage', 'content:courses:read', 'content:courses:manage'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:assessments:manage', domain: 'content', resource: 'assessments', action: 'manage', description: 'Manage assessments', isActive: true },
      { name: 'content:lessons:manage', domain: 'content', resource: 'lessons', action: 'manage', description: 'Manage lessons', isActive: true },
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses', isActive: true }
    ]);

    // Create test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'learning-unit-questions-test@example.com',
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

    // Generate auth token with new authorization format
    authToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        email: testUser.email,
        type: 'access',
        globalRights: ['*'], // System admin for test simplicity
        departmentRights: {
          [testDepartment._id.toString()]: ['content:assessments:manage', 'content:lessons:manage', 'content:courses:read', 'content:courses:manage']
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
    // Create test course
    testCourse = await Course.create({
      name: 'Test Course',
      code: 'TESTCRS' + Date.now(),
      departmentId: testDepartment._id,
      credits: 3,
      status: 'draft',
      isActive: true,
      createdBy: testUser._id
    });

    // Create test module
    testModule = await Module.create({
      courseId: testCourse._id,
      title: 'Test Module',
      description: 'Test module for learning unit questions',
      completionCriteria: {
        type: 'all_required'
      },
      presentationRules: {
        presentationMode: 'prescribed',
        repetitionMode: 'none',
        repeatOn: {
          failedAttempt: false,
          belowMastery: false,
          learnerRequest: false
        },
        repeatableCategories: [],
        showAllAvailable: true,
        allowSkip: false
      },
      isPublished: true,
      estimatedDuration: 60,
      order: 1,
      createdBy: testUser._id
    });

    // Create test learning units
    testLearningUnitExercise = await LearningUnit.create({
      moduleId: testModule._id,
      title: 'Test Exercise',
      description: 'An exercise that supports questions',
      type: 'exercise',
      category: 'practice',
      isRequired: true,
      isReplayable: true,
      weight: 20,
      sequence: 1,
      estimatedDuration: 30,
      isActive: true,
      createdBy: testUser._id
    });

    testLearningUnitAssessment = await LearningUnit.create({
      moduleId: testModule._id,
      title: 'Test Assessment',
      description: 'An assessment that supports questions',
      type: 'assessment',
      category: 'graded',
      isRequired: true,
      isReplayable: false,
      weight: 50,
      sequence: 2,
      estimatedDuration: 45,
      isActive: true,
      createdBy: testUser._id
    });

    testLearningUnitLesson = await LearningUnit.create({
      moduleId: testModule._id,
      title: 'Test Lesson',
      description: 'A lesson that does NOT support questions',
      type: 'media',
      category: 'topic',
      isRequired: true,
      isReplayable: true,
      weight: 10,
      sequence: 3,
      estimatedDuration: 15,
      isActive: true,
      createdBy: testUser._id
    });
  });

  afterEach(async () => {
    await LearningUnitQuestion.deleteMany({});
    await LearningUnit.deleteMany({});
    await Module.deleteMany({});
    await Course.deleteMany({});
    await Question.deleteMany({});
    await Setting.deleteMany({});
  });

  // =========================================================================
  // Helper Functions
  // =========================================================================

  async function createTestQuestion(options: {
    departmentId?: mongoose.Types.ObjectId;
    questionText?: string;
    questionTypes?: string[];
    points?: number;
    difficulty?: string;
  } = {}): Promise<any> {
    return Question.create({
      questionText: options.questionText || `Test question ${Date.now()}`,
      questionTypes: options.questionTypes || ['multiple_choice'],
      departmentId: options.departmentId || testDepartment._id,
      points: options.points || 10,
      difficulty: options.difficulty || 'medium',
      correctAnswers: ['Option A'],
      distractors: ['Option B', 'Option C', 'Option D'],
      isActive: true,
      questionBankIds: []
    });
  }

  async function createMultipleQuestions(count: number, departmentId?: mongoose.Types.ObjectId): Promise<any[]> {
    const questions: any[] = [];
    for (let i = 0; i < count; i++) {
      const question = await createTestQuestion({
        departmentId: departmentId || testDepartment._id,
        questionText: `Test question ${i + 1}`,
        points: 10 + i
      });
      questions.push(question);
    }
    return questions;
  }

  // =========================================================================
  // POST /api/v2/learning-units/:learningUnitId/questions
  // =========================================================================

  describe('POST /api/v2/learning-units/:learningUnitId/questions', () => {
    describe('successful linking', () => {
      it('should link a question to an exercise learning unit', async () => {
        const question = await createTestQuestion();

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: question._id.toString()
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.questionId).toBe(question._id.toString());
        expect(response.body.data.learningUnitId).toBe(testLearningUnitExercise._id.toString());
        expect(response.body.data.sequence).toBeDefined();
        expect(response.body.data.id).toBeDefined();
      });

      it('should link a question to an assessment learning unit', async () => {
        const question = await createTestQuestion();

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitAssessment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: question._id.toString()
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.questionId).toBe(question._id.toString());
      });

      it('should auto-assign sequence when not provided', async () => {
        const question1 = await createTestQuestion();
        const question2 = await createTestQuestion();

        // Link first question
        const response1 = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: question1._id.toString() });

        expect(response1.body.data.sequence).toBe(0);

        // Link second question - sequence should auto-increment
        const response2 = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: question2._id.toString() });

        expect(response2.body.data.sequence).toBe(1);
      });

      it('should set pointsOverride if provided', async () => {
        const question = await createTestQuestion({ points: 10 });

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: question._id.toString(),
            pointsOverride: 25
          });

        expect(response.status).toBe(201);
        expect(response.body.data.pointsOverride).toBe(25);
      });

      it('should allow explicit sequence when provided', async () => {
        const question = await createTestQuestion();

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: question._id.toString(),
            sequence: 5
          });

        expect(response.status).toBe(201);
        expect(response.body.data.sequence).toBe(5);
      });
    });

    describe('validation errors', () => {
      it('should reject linking to non-exercise/assessment units (lesson type)', async () => {
        const question = await createTestQuestion();

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitLesson._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: question._id.toString()
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('does not support questions');
      });

      it('should reject duplicate links (same question linked twice)', async () => {
        const question = await createTestQuestion();

        // Link first time
        await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: question._id.toString() });

        // Try to link same question again
        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: question._id.toString() });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('already linked');
      });

      it('should reject question from different department', async () => {
        const questionInOtherDept = await createTestQuestion({
          departmentId: testDepartment2._id
        });

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionInOtherDept._id.toString()
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('same department');
      });

      it('should return 404 for non-existent learning unit', async () => {
        const question = await createTestQuestion();
        const fakeId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .post(`/api/v2/learning-units/${fakeId}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: question._id.toString() });

        expect(response.status).toBe(404);
      });

      it('should return 404 for non-existent question', async () => {
        const fakeQuestionId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: fakeQuestionId.toString() });

        expect(response.status).toBe(404);
      });

      it('should return 404 for invalid learning unit ID format', async () => {
        const question = await createTestQuestion();

        const response = await request(app)
          .post('/api/v2/learning-units/invalid-id/questions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: question._id.toString() });

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const question = await createTestQuestion();

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .send({ questionId: question._id.toString() });

        expect(response.status).toBe(401);
      });

      it('should return 401 with invalid auth token', async () => {
        const question = await createTestQuestion();

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', 'Bearer invalid-token')
          .send({ questionId: question._id.toString() });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // POST /api/v2/learning-units/:learningUnitId/questions/bulk
  // =========================================================================

  describe('POST /api/v2/learning-units/:learningUnitId/questions/bulk', () => {
    describe('successful bulk linking', () => {
      it('should bulk link multiple questions', async () => {
        const questions = await createMultipleQuestions(3);

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: questions.map(q => ({ questionId: q._id.toString() }))
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.linked).toBe(3);
        expect(response.body.data.skipped).toBe(0);
        expect(response.body.data.links).toHaveLength(3);
      });

      it('should assign sequences in array order when not provided', async () => {
        const questions = await createMultipleQuestions(3);

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: questions.map(q => ({ questionId: q._id.toString() }))
          });

        expect(response.status).toBe(201);

        const links = response.body.data.links;
        expect(links[0].sequence).toBe(0);
        expect(links[1].sequence).toBe(1);
        expect(links[2].sequence).toBe(2);
      });

      it('should skip already linked questions', async () => {
        const questions = await createMultipleQuestions(3);

        // Link first question individually
        await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: questions[0]._id.toString() });

        // Bulk link all 3 (first one already linked)
        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: questions.map(q => ({ questionId: q._id.toString() }))
          });

        expect(response.status).toBe(201);
        expect(response.body.data.linked).toBe(2);
        expect(response.body.data.skipped).toBe(1);
      });

      it('should replace existing when replaceExisting=true', async () => {
        const oldQuestions = await createMultipleQuestions(2);
        const newQuestions = await createMultipleQuestions(3);

        // Link old questions
        await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: oldQuestions.map(q => ({ questionId: q._id.toString() }))
          });

        // Replace with new questions
        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: newQuestions.map(q => ({ questionId: q._id.toString() })),
            replaceExisting: true
          });

        expect(response.status).toBe(201);
        expect(response.body.data.linked).toBe(3);
        expect(response.body.data.removed).toBe(2);

        // Verify old links are gone
        const listResponse = await request(app)
          .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(listResponse.body.data.totalQuestions).toBe(3);
      });

      it('should respect pointsOverride in bulk operation', async () => {
        const questions = await createMultipleQuestions(2);

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: [
              { questionId: questions[0]._id.toString(), pointsOverride: 25 },
              { questionId: questions[1]._id.toString(), pointsOverride: 30 }
            ]
          });

        expect(response.status).toBe(201);

        // Verify by listing
        const listResponse = await request(app)
          .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        // Total should use overrides: 25 + 30 = 55
        expect(listResponse.body.data.totalPoints).toBe(55);
      });
    });

    describe('validation errors', () => {
      it('should reject empty questions array', async () => {
        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questions: [] });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('cannot be empty');
      });

      it('should respect bulk limit from settings', async () => {
        // Set a low bulk limit
        await Setting.create({
          category: 'question',
          key: 'bulkOperations.maxItems',
          value: 2,
          dataType: 'number',
          isPublic: false,
          isEditable: true,
          description: 'Test bulk limit'
        });

        const questions = await createMultipleQuestions(3);

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: questions.map(q => ({ questionId: q._id.toString() }))
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('limit');
      });

      it('should skip questions from different department', async () => {
        const validQuestion = await createTestQuestion({ departmentId: testDepartment._id });
        const invalidQuestion = await createTestQuestion({ departmentId: testDepartment2._id });

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: [
              { questionId: validQuestion._id.toString() },
              { questionId: invalidQuestion._id.toString() }
            ]
          });

        expect(response.status).toBe(201);
        expect(response.body.data.linked).toBe(1);
        expect(response.body.data.skipped).toBe(1);
      });

      it('should skip non-existent questions', async () => {
        const validQuestion = await createTestQuestion();
        const fakeQuestionId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: [
              { questionId: validQuestion._id.toString() },
              { questionId: fakeQuestionId.toString() }
            ]
          });

        expect(response.status).toBe(201);
        expect(response.body.data.linked).toBe(1);
        expect(response.body.data.skipped).toBe(1);
      });
    });
  });

  // =========================================================================
  // GET /api/v2/learning-units/:learningUnitId/questions
  // =========================================================================

  describe('GET /api/v2/learning-units/:learningUnitId/questions', () => {
    describe('successful listing', () => {
      it('should list linked questions in sequence order', async () => {
        const questions = await createMultipleQuestions(3);

        // Link questions with explicit sequences in reverse order
        await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: questions[0]._id.toString(), sequence: 3 });

        await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: questions[1]._id.toString(), sequence: 1 });

        await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: questions[2]._id.toString(), sequence: 2 });

        const response = await request(app)
          .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.questions).toHaveLength(3);

        // Should be ordered by sequence (1, 2, 3)
        expect(response.body.data.questions[0].sequence).toBe(1);
        expect(response.body.data.questions[1].sequence).toBe(2);
        expect(response.body.data.questions[2].sequence).toBe(3);
      });

      it('should calculate totalPoints correctly using original points', async () => {
        const q1 = await createTestQuestion({ points: 10 });
        const q2 = await createTestQuestion({ points: 20 });
        const q3 = await createTestQuestion({ points: 30 });

        await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: [
              { questionId: q1._id.toString() },
              { questionId: q2._id.toString() },
              { questionId: q3._id.toString() }
            ]
          });

        const response = await request(app)
          .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.totalPoints).toBe(60); // 10 + 20 + 30
        expect(response.body.data.totalQuestions).toBe(3);
      });

      it('should use pointsOverride in totalPoints calculation when set', async () => {
        const q1 = await createTestQuestion({ points: 10 });
        const q2 = await createTestQuestion({ points: 20 });

        await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: [
              { questionId: q1._id.toString(), pointsOverride: 50 }, // Override
              { questionId: q2._id.toString() } // Use original
            ]
          });

        const response = await request(app)
          .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.totalPoints).toBe(70); // 50 (override) + 20 (original)
      });

      it('should include learning unit title in response', async () => {
        const response = await request(app)
          .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnitId).toBe(testLearningUnitExercise._id.toString());
        expect(response.body.data.learningUnitTitle).toBe('Test Exercise');
      });

      it('should return empty list for learning unit with no questions', async () => {
        const response = await request(app)
          .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.questions).toHaveLength(0);
        expect(response.body.data.totalQuestions).toBe(0);
        expect(response.body.data.totalPoints).toBe(0);
      });

      it('should include expanded question data', async () => {
        const question = await createTestQuestion({
          questionText: 'What is 2 + 2?',
          points: 15,
          difficulty: 'easy'
        });

        await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: question._id.toString() });

        const response = await request(app)
          .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const linkedQuestion = response.body.data.questions[0];
        expect(linkedQuestion.question).toBeDefined();
        expect(linkedQuestion.question.text).toBe('What is 2 + 2?');
        expect(linkedQuestion.question.points).toBe(15);
        expect(linkedQuestion.question.difficulty).toBe('easy');
        expect(linkedQuestion.question.types).toEqual(['multiple_choice']);
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent learning unit', async () => {
        const fakeId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .get(`/api/v2/learning-units/${fakeId}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 404 for invalid learning unit ID', async () => {
        const response = await request(app)
          .get('/api/v2/learning-units/invalid-id/questions')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // PUT /api/v2/learning-units/:learningUnitId/questions/:linkId
  // =========================================================================

  describe('PUT /api/v2/learning-units/:learningUnitId/questions/:linkId', () => {
    let testQuestion: any;
    let testLink: any;

    beforeEach(async () => {
      testQuestion = await createTestQuestion({ points: 10 });

      const linkResponse = await request(app)
        .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ questionId: testQuestion._id.toString(), sequence: 0 });

      testLink = linkResponse.body.data;
    });

    describe('successful updates', () => {
      it('should update sequence', async () => {
        const response = await request(app)
          .put(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ sequence: 5 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.sequence).toBe(5);
      });

      it('should update pointsOverride', async () => {
        const response = await request(app)
          .put(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ pointsOverride: 25 });

        expect(response.status).toBe(200);
        expect(response.body.data.pointsOverride).toBe(25);
      });

      it('should clear pointsOverride when set to null', async () => {
        // First set a pointsOverride
        await request(app)
          .put(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ pointsOverride: 25 });

        // Then clear it by setting to null
        const response = await request(app)
          .put(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ pointsOverride: null });

        expect(response.status).toBe(200);
        expect(response.body.data.pointsOverride).toBeNull();
      });

      it('should update both sequence and pointsOverride simultaneously', async () => {
        const response = await request(app)
          .put(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sequence: 10,
            pointsOverride: 50
          });

        expect(response.status).toBe(200);
        expect(response.body.data.sequence).toBe(10);
        expect(response.body.data.pointsOverride).toBe(50);
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent link', async () => {
        const fakeLinkId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .put(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${fakeLinkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ sequence: 5 });

        expect(response.status).toBe(404);
      });

      it('should return 404 when link belongs to different learning unit', async () => {
        // Create another link in a different learning unit
        const otherQuestion = await createTestQuestion();
        const otherLinkResponse = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitAssessment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: otherQuestion._id.toString() });

        const otherLinkId = otherLinkResponse.body.data.id;

        // Try to update it via the wrong learning unit
        const response = await request(app)
          .put(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${otherLinkId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ sequence: 5 });

        expect(response.status).toBe(404);
      });

      it('should return 404 for invalid link ID format', async () => {
        const response = await request(app)
          .put(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ sequence: 5 });

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .put(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`)
          .send({ sequence: 5 });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // DELETE /api/v2/learning-units/:learningUnitId/questions/:linkId
  // =========================================================================

  describe('DELETE /api/v2/learning-units/:learningUnitId/questions/:linkId', () => {
    let testQuestion: any;
    let testLink: any;

    beforeEach(async () => {
      testQuestion = await createTestQuestion();

      const linkResponse = await request(app)
        .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ questionId: testQuestion._id.toString() });

      testLink = linkResponse.body.data;
    });

    describe('successful deletion', () => {
      it('should unlink question from learning unit', async () => {
        const response = await request(app)
          .delete(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify link is gone
        const listResponse = await request(app)
          .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(listResponse.body.data.totalQuestions).toBe(0);
      });

      it('should not delete the question itself', async () => {
        await request(app)
          .delete(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Verify question still exists
        const question = await Question.findById(testQuestion._id);
        expect(question).not.toBeNull();
        expect(question?.isActive).toBe(true);
      });

      it('should allow re-linking after deletion', async () => {
        // Delete the link
        await request(app)
          .delete(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Re-link the same question
        const relinkResponse = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: testQuestion._id.toString() });

        expect(relinkResponse.status).toBe(201);
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent link', async () => {
        const fakeLinkId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .delete(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${fakeLinkId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 404 when link belongs to different learning unit', async () => {
        // Create another link in a different learning unit
        const otherQuestion = await createTestQuestion();
        const otherLinkResponse = await request(app)
          .post(`/api/v2/learning-units/${testLearningUnitAssessment._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: otherQuestion._id.toString() });

        const otherLinkId = otherLinkResponse.body.data.id;

        // Try to delete it via the wrong learning unit
        const response = await request(app)
          .delete(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${otherLinkId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 404 for invalid link ID format', async () => {
        const response = await request(app)
          .delete(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 404 when deleting already deleted link', async () => {
        // Delete once
        await request(app)
          .delete(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Try to delete again
        const response = await request(app)
          .delete(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .delete(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/${testLink.id}`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Edge Cases and Complex Scenarios
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle large bulk operations efficiently', async () => {
      const questions = await createMultipleQuestions(50);

      const startTime = Date.now();
      const response = await request(app)
        .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questions: questions.map(q => ({ questionId: q._id.toString() }))
        });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(201);
      expect(response.body.data.linked).toBe(50);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should maintain data integrity across concurrent operations', async () => {
      const questions = await createMultipleQuestions(5);

      // Perform concurrent link operations
      const promises = questions.map(q =>
        request(app)
          .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ questionId: q._id.toString() })
      );

      const results = await Promise.all(promises);

      // All should either succeed or fail due to duplicate detection
      const successCount = results.filter(r => r.status === 201).length;
      const duplicateCount = results.filter(r => r.status === 400).length;

      // Due to potential race conditions, some might succeed and some might fail
      // Total should equal 5
      expect(successCount + duplicateCount).toBe(5);

      // Verify final state is consistent
      const listResponse = await request(app)
        .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should have exactly 5 unique questions linked
      expect(listResponse.body.data.totalQuestions).toBe(5);
    });

    it('should handle question with zero points', async () => {
      const question = await Question.create({
        questionText: 'No points question',
        questionTypes: ['multiple_choice'],
        departmentId: testDepartment._id,
        points: 1, // Minimum allowed is 1 in the model
        correctAnswers: ['A'],
        distractors: ['B'],
        isActive: true,
        questionBankIds: []
      });

      // Use pointsOverride of 0
      const response = await request(app)
        .post(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionId: question._id.toString(),
          pointsOverride: 0
        });

      expect(response.status).toBe(201);

      const listResponse = await request(app)
        .get(`/api/v2/learning-units/${testLearningUnitExercise._id}/questions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.body.data.totalPoints).toBe(0);
    });

    it('should work with assessment type learning units', async () => {
      const questions = await createMultipleQuestions(3);

      // Link to assessment
      const response = await request(app)
        .post(`/api/v2/learning-units/${testLearningUnitAssessment._id}/questions/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questions: questions.map(q => ({ questionId: q._id.toString() }))
        });

      expect(response.status).toBe(201);
      expect(response.body.data.linked).toBe(3);

      // Verify listing works
      const listResponse = await request(app)
        .get(`/api/v2/learning-units/${testLearningUnitAssessment._id}/questions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.learningUnitTitle).toBe('Test Assessment');
      expect(listResponse.body.data.totalQuestions).toBe(3);
    });
  });
});
