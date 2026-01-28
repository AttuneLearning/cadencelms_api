/**
 * Bulk Question Updates Integration Tests
 *
 * Tests the bulk question cognitive depth update endpoint:
 * - PATCH /api/v2/departments/:departmentId/questions/bulk
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import Question from '@/models/assessment/Question.model';
import CognitiveDepthLevel from '@/models/content/CognitiveDepthLevel.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Bulk Question Updates Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testUser: any;
  let testQuestions: any[];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'BULK' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    await refreshDepartmentCache();

    // Seed role definitions
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage content',
      accessRights: ['content:department:read', 'content:department:manage'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:department:read', domain: 'content', resource: 'department', action: 'read', description: 'Read department content', isActive: true },
      { name: 'content:department:manage', domain: 'content', resource: 'department', action: 'manage', description: 'Manage department content', isActive: true }
    ]);

    // Seed system default cognitive depth levels
    await CognitiveDepthLevel.create([
      {
        departmentId: null,
        slug: 'exposure',
        name: 'Exposure',
        description: 'Initial exposure',
        order: 1,
        advanceThreshold: 0.70,
        minAttempts: 2,
        isDefault: true,
        isActive: true
      },
      {
        departmentId: null,
        slug: 'practice',
        name: 'Practice',
        description: 'Practice level',
        order: 2,
        advanceThreshold: 0.80,
        minAttempts: 3,
        isDefault: true,
        isActive: true
      }
    ]);

    // Create test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'bulk-test@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: testUser._id,
      person: {
        firstName: 'Bulk',
        lastName: 'Test',
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
      { userId: testUser._id.toString(), email: testUser.email, roles: ['staff'], type: 'access' },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test questions
    testQuestions = await Question.create([
      {
        departmentId: testDepartment._id,
        questionTypes: ['multiple_choice'],
        questionText: 'Test Question 1',
        points: 10,
        difficulty: 'medium',
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 'Option A',
        isActive: true
      },
      {
        departmentId: testDepartment._id,
        questionTypes: ['multiple_choice'],
        questionText: 'Test Question 2',
        points: 10,
        difficulty: 'medium',
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 'Option A',
        isActive: true
      },
      {
        departmentId: testDepartment._id,
        questionTypes: ['true_false'],
        questionText: 'Test Question 3',
        points: 5,
        difficulty: 'easy',
        options: ['True', 'False'],
        correctAnswer: 'True',
        isActive: true
      }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('PATCH /api/v2/departments/:departmentId/questions/bulk', () => {
    it('should bulk update cognitive depth for all questions', async () => {
      const questionIds = testQuestions.map(q => q._id.toString());

      const response = await request(app)
        .patch(`/api/v2/departments/${testDepartment._id}/questions/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionIds,
          updates: { cognitiveDepth: 'exposure' }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(3);
      expect(response.body.data.failed).toBe(0);
      expect(response.body.data.results).toHaveLength(3);
      
      // Verify all succeeded
      response.body.data.results.forEach((result: any) => {
        expect(result.status).toBe('updated');
      });
    });

    it('should handle partial failures gracefully', async () => {
      const validId = testQuestions[0]._id.toString();
      const invalidId = 'invalid-id';

      const response = await request(app)
        .patch(`/api/v2/departments/${testDepartment._id}/questions/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionIds: [validId, invalidId],
          updates: { cognitiveDepth: 'practice' }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.updated).toBe(1);
      expect(response.body.data.failed).toBe(1);
      
      // Find results
      const successResult = response.body.data.results.find((r: any) => r.id === validId);
      const failResult = response.body.data.results.find((r: any) => r.id === invalidId);
      
      expect(successResult.status).toBe('updated');
      expect(failResult.status).toBe('failed');
      expect(failResult.error).toBeDefined();
    });

    it('should return 400 when questionIds is missing', async () => {
      const response = await request(app)
        .patch(`/api/v2/departments/${testDepartment._id}/questions/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          updates: { cognitiveDepth: 'exposure' }
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when updates.cognitiveDepth is missing', async () => {
      const response = await request(app)
        .patch(`/api/v2/departments/${testDepartment._id}/questions/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionIds: [testQuestions[0]._id.toString()],
          updates: {}
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid cognitive depth slug', async () => {
      const response = await request(app)
        .patch(`/api/v2/departments/${testDepartment._id}/questions/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionIds: [testQuestions[0]._id.toString()],
          updates: { cognitiveDepth: 'nonexistent-slug' }
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('not found');
    });

    it('should not update questions from different department', async () => {
      // Create a question in a different department
      const otherDept = await Department.create({
        name: 'Other Department',
        code: 'OTHER' + Date.now(),
        level: 0,
        path: [],
        isActive: true
      });

      const otherQuestion = await Question.create({
        departmentId: otherDept._id,
        questionTypes: ['multiple_choice'],
        questionText: 'Other Department Question',
        points: 10,
        difficulty: 'medium',
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 'Option A',
        isActive: true
      });

      const response = await request(app)
        .patch(`/api/v2/departments/${testDepartment._id}/questions/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionIds: [testQuestions[0]._id.toString(), otherQuestion._id.toString()],
          updates: { cognitiveDepth: 'exposure' }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.updated).toBe(1);
      expect(response.body.data.failed).toBe(1);

      const failedResult = response.body.data.results.find(
        (r: any) => r.id === otherQuestion._id.toString()
      );
      expect(failedResult.status).toBe('failed');
      expect(failedResult.error).toContain('not in department');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .patch(`/api/v2/departments/${testDepartment._id}/questions/bulk`)
        .send({
          questionIds: [testQuestions[0]._id.toString()],
          updates: { cognitiveDepth: 'exposure' }
        });

      expect(response.status).toBe(401);
    });
  });
});
