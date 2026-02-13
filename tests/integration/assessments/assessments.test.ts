import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Department from '@/models/organization/Department.model';
import Assessment from '@/models/content/Assessment.model';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import Question from '@/models/assessment/Question.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { hashPassword } from '@/utils/password';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Assessments API', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testQuestionBank: any;

  const buildCreatePayload = () => ({
    title: 'Assessment Lifecycle Test',
    description: 'Assessment created for integration testing',
    departmentId: testDepartment._id.toString(),
    style: 'quiz',
    questionSelection: {
      questionBankIds: [testQuestionBank._id.toString()],
      questionCount: 1,
      selectionMode: 'sequential'
    },
    timing: {
      timeLimit: null,
      showTimer: true,
      autoSubmitOnExpiry: true
    },
    attempts: {
      maxAttempts: 3,
      cooldownMinutes: 0,
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
    }
  });

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    testDepartment = await Department.create({
      name: 'Assessments Test Department',
      code: `ASM${Date.now()}`,
      level: 0,
      path: [],
      isActive: true
    });

    await refreshDepartmentCache();

    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage and read assessments',
      accessRights: ['content:assessments:manage', 'content:assessments:read'],
      isActive: true
    });

    await AccessRight.create([
      {
        name: 'content:assessments:manage',
        domain: 'content',
        resource: 'assessments',
        action: 'manage',
        description: 'Manage assessments',
        isActive: true
      },
      {
        name: 'content:assessments:read',
        domain: 'content',
        resource: 'assessments',
        action: 'read',
        description: 'Read assessments',
        isActive: true
      }
    ]);

    const hashedPassword = await hashPassword('SecurePass123!');
    const userId = new mongoose.Types.ObjectId();

    await User.create({
      _id: userId,
      email: 'assessments-test@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true,
      accessRights: []
    });

    await Staff.create({
      _id: userId,
      person: {
        firstName: 'Assessments',
        lastName: 'Tester',
        emails: [
          {
            email: 'assessments-test@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }
        ],
        phones: [],
        addresses: []
      },
      departmentMemberships: [
        {
          departmentId: testDepartment._id,
          roles: ['content-admin'],
          isPrimary: true,
          isActive: true,
          joinedAt: new Date()
        }
      ],
      isActive: true
    });

    authToken = jwt.sign(
      {
        userId: userId.toString(),
        email: 'assessments-test@example.com',
        type: 'access',
        roles: ['content-admin'],
        globalRights: [],
        departmentRights: {
          [testDepartment._id.toString()]: ['content:assessments:manage', 'content:assessments:read']
        },
        departmentMemberships: [{ departmentId: testDepartment._id.toString() }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    testQuestionBank = await QuestionBank.create({
      name: 'Assessments Test Bank',
      departmentId: testDepartment._id,
      questionIds: [],
      isActive: true
    });

    const question = await Question.create({
      questionText: 'What is 2 + 2?',
      questionTypes: ['multiple_choice'],
      departmentId: testDepartment._id,
      points: 1,
      correctAnswers: ['4'],
      distractors: ['3', '5', '6'],
      questionBankIds: [testQuestionBank._id.toString()],
      isActive: true
    });

    testQuestionBank.questionIds = [question._id];
    await testQuestionBank.save();
  });

  afterEach(async () => {
    await Assessment.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('supports create/list/get/update/publish/archive lifecycle', async () => {
    const createResponse = await request(app)
      .post('/api/v2/assessments')
      .set('Authorization', `Bearer ${authToken}`)
      .send(buildCreatePayload());

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.title).toBe('Assessment Lifecycle Test');

    const assessmentId = createResponse.body.data.id;

    const listResponse = await request(app)
      .get('/api/v2/assessments')
      .set('Authorization', `Bearer ${authToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(Array.isArray(listResponse.body.data.assessments)).toBe(true);
    expect(listResponse.body.data.assessments.map((assessment: any) => assessment.id)).toContain(assessmentId);

    const getResponse = await request(app)
      .get(`/api/v2/assessments/${assessmentId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.id).toBe(assessmentId);

    const updateResponse = await request(app)
      .put(`/api/v2/assessments/${assessmentId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Assessment Lifecycle Updated' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.title).toBe('Assessment Lifecycle Updated');

    const publishResponse = await request(app)
      .post(`/api/v2/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.success).toBe(true);
    expect(publishResponse.body.data.isPublished).toBe(true);

    const archiveResponse = await request(app)
      .post(`/api/v2/assessments/${assessmentId}/archive`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.success).toBe(true);
    expect(archiveResponse.body.data.isArchived).toBe(true);
    expect(archiveResponse.body.data.isPublished).toBe(false);
  });

  it('deletes an unpublished assessment via soft delete', async () => {
    const createResponse = await request(app)
      .post('/api/v2/assessments')
      .set('Authorization', `Bearer ${authToken}`)
      .send(buildCreatePayload());

    expect(createResponse.status).toBe(201);

    const assessmentId = createResponse.body.data.id;

    const deleteResponse = await request(app)
      .delete(`/api/v2/assessments/${assessmentId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);

    const deletedAssessment = await Assessment.findById(assessmentId);
    expect(deletedAssessment).toBeTruthy();
    expect(deletedAssessment?.isArchived).toBe(true);
  });
});
