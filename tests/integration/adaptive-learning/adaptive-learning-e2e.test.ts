/**
 * Adaptive Learning E2E Integration Tests
 *
 * Complete end-to-end scenarios combining all adaptive learning features:
 * - Knowledge nodes with prerequisites
 * - Cognitive depth levels (system defaults and department customization)
 * - Learner progress tracking
 * - Adaptive question selection
 *
 * These tests simulate realistic learner journeys through the adaptive system.
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Learner } from '@/models/auth/Learner.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import CognitiveDepthLevel from '@/models/content/CognitiveDepthLevel.model';
import KnowledgeNode from '@/models/content/KnowledgeNode.model';
import LearnerKnowledgeProgress from '@/models/progress/LearnerKnowledgeProgress.model';
import Question from '@/models/assessment/Question.model';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

/**
 * Helper function to simulate a learner answering multiple questions
 * Records responses through the adaptive API to update progress
 */
async function simulateAnswering(
  token: string,
  learnerId: string,
  nodeId: string,
  depth: string,
  correctCount: number,
  totalCount: number
): Promise<void> {
  for (let i = 0; i < totalCount; i++) {
    await request(app)
      .post('/api/v2/adaptive/record-response')
      .set('Authorization', `Bearer ${token}`)
      .send({
        learnerId,
        questionId: new mongoose.Types.ObjectId().toString(),
        knowledgeNodeId: nodeId,
        cognitiveDepth: depth,
        isCorrect: i < correctCount
      });
  }
}

describeIfMongo('Adaptive Learning E2E Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let staffAuthToken: string;
  let learnerAuthToken: string;
  let testDepartment: any;
  let testStaffUser: any;
  let testLearnerUser: any;
  let testLearner: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test department
    testDepartment = await Department.create({
      name: 'Adaptive E2E Department',
      code: 'AE2E' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    await refreshDepartmentCache();

    // Seed role definitions
    await RoleDefinition.create([
      {
        name: 'content-admin',
        userType: 'staff',
        displayName: 'Content Administrator',
        description: 'Can manage adaptive content',
        accessRights: ['content:department:read', 'content:department:manage', 'learner:grades:read'],
        isActive: true
      },
      {
        name: 'course-taker',
        userType: 'learner',
        displayName: 'Learner',
        description: 'Basic learner role',
        accessRights: ['learner:own:read', 'content:department:read', 'grades:own:read'],
        isActive: true
      }
    ]);

    // Seed access rights
    await AccessRight.create([
      { name: 'content:department:read', domain: 'content', resource: 'department', action: 'read', description: 'Read department content', isActive: true },
      { name: 'content:department:manage', domain: 'content', resource: 'department', action: 'manage', description: 'Manage department content', isActive: true },
      { name: 'learner:own:read', domain: 'learner', resource: 'own', action: 'read', description: 'Read own learner data', isActive: true },
      { name: 'learner:grades:read', domain: 'learner', resource: 'grades', action: 'read', description: 'Read learner grades', isActive: true },
      { name: 'grades:own:read', domain: 'grades', resource: 'own', action: 'read', description: 'Read own grades', isActive: true }
    ]);

    // Create staff user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testStaffUser = await User.create({
      email: 'adaptive-e2e-staff@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: testStaffUser._id,
      person: {
        firstName: 'E2E',
        lastName: 'Staff',
        emails: [{
          email: testStaffUser.email,
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

    // Create learner user
    testLearnerUser = await User.create({
      email: 'adaptive-e2e-learner@example.com',
      password: hashedPassword,
      userTypes: ['learner'],
      defaultDashboard: 'learner',
      isActive: true
    });

    testLearner = await Learner.create({
      _id: testLearnerUser._id,
      person: {
        firstName: 'E2E',
        lastName: 'Learner',
        emails: [{
          email: testLearnerUser.email,
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
        roles: ['course-taker'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }],
      isActive: true
    });

    // Generate auth tokens
    staffAuthToken = jwt.sign(
      {
        userId: testStaffUser._id.toString(),
        email: testStaffUser.email,
        roles: ['staff'],
        type: 'access',
        globalRights: [],
        departmentRights: {
          [testDepartment._id.toString()]: ['content:department:read', 'content:department:manage', 'learner:grades:read']
        },
        departmentMemberships: [{ departmentId: testDepartment._id.toString() }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    learnerAuthToken = jwt.sign(
      {
        userId: testLearnerUser._id.toString(),
        email: testLearnerUser.email,
        roles: ['learner'],
        type: 'access',
        globalRights: [],
        departmentRights: {
          [testDepartment._id.toString()]: ['learner:own:read', 'content:department:read', 'grades:own:read']
        },
        departmentMemberships: [{ departmentId: testDepartment._id.toString() }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Seed system default cognitive depth levels
    await CognitiveDepthLevel.create([
      { departmentId: null, slug: 'exposure', name: 'Exposure', order: 1, advanceThreshold: 0.8, minAttempts: 3, isDefault: true, isActive: true },
      { departmentId: null, slug: 'practice', name: 'Practice', order: 2, advanceThreshold: 0.8, minAttempts: 3, isDefault: true, isActive: true },
      { departmentId: null, slug: 'proficiency', name: 'Proficiency', order: 3, advanceThreshold: 0.8, minAttempts: 3, isDefault: true, isActive: true },
      { departmentId: null, slug: 'mastery', name: 'Mastery', order: 4, advanceThreshold: 0.9, minAttempts: 3, isDefault: true, isActive: true }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await KnowledgeNode.deleteMany({});
    await LearnerKnowledgeProgress.deleteMany({});
    await Question.deleteMany({});
    await QuestionBank.deleteMany({});
    await CognitiveDepthLevel.deleteMany({ departmentId: { $ne: null } });
  });

  // =========================================================================
  // Scenario 1: Complete Adaptive Learning Journey
  // =========================================================================
  describe('Complete Adaptive Learning Journey', () => {
    let nodeBasics: any;
    let nodeIntermediate: any;
    let nodeAdvanced: any;
    let testBank: any;

    beforeEach(async () => {
      // Create question bank
      testBank = await QuestionBank.create({
        name: 'E2E Journey Bank',
        description: 'Questions for journey testing',
        departmentId: testDepartment._id,
        questionIds: [],
        isActive: true
      });

      // Create knowledge nodes with prerequisites chain: Basics -> Intermediate -> Advanced
      nodeBasics = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Programming Basics',
        slug: 'programming-basics-' + Date.now(),
        description: 'Fundamental programming concepts',
        prerequisiteNodeIds: [],
        depthRange: { min: 'exposure', max: 'mastery' },
        tags: ['programming', 'basics'],
        isActive: true,
        createdBy: testStaffUser._id,
        updatedBy: testStaffUser._id
      });

      nodeIntermediate = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Intermediate Concepts',
        slug: 'intermediate-concepts-' + Date.now(),
        description: 'Intermediate programming concepts',
        prerequisiteNodeIds: [nodeBasics._id],
        depthRange: { min: 'exposure', max: 'mastery' },
        tags: ['programming', 'intermediate'],
        isActive: true,
        createdBy: testStaffUser._id,
        updatedBy: testStaffUser._id
      });

      nodeAdvanced = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Advanced Topics',
        slug: 'advanced-topics-' + Date.now(),
        description: 'Advanced programming topics',
        prerequisiteNodeIds: [nodeIntermediate._id],
        depthRange: { min: 'exposure', max: 'mastery' },
        tags: ['programming', 'advanced'],
        isActive: true,
        createdBy: testStaffUser._id,
        updatedBy: testStaffUser._id
      });

      // Create questions for each node at different depths
      const depths = ['exposure', 'practice', 'proficiency', 'mastery'];
      for (const node of [nodeBasics, nodeIntermediate, nodeAdvanced]) {
        for (const depth of depths) {
          await Question.create([
            {
              departmentId: testDepartment._id,
              questionText: `${node.name} ${depth} question 1`,
              questionTypes: ['multiple_choice'],
              points: 1,
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 'A',
              questionBankIds: [testBank._id.toString()],
              knowledgeNodeId: node._id,
              cognitiveDepth: depth,
              isActive: true
            },
            {
              departmentId: testDepartment._id,
              questionText: `${node.name} ${depth} question 2`,
              questionTypes: ['multiple_choice'],
              points: 1,
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 'B',
              questionBankIds: [testBank._id.toString()],
              knowledgeNodeId: node._id,
              cognitiveDepth: depth,
              isActive: true
            },
            {
              departmentId: testDepartment._id,
              questionText: `${node.name} ${depth} question 3`,
              questionTypes: ['multiple_choice'],
              points: 1,
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 'C',
              questionBankIds: [testBank._id.toString()],
              knowledgeNodeId: node._id,
              cognitiveDepth: depth,
              isActive: true
            }
          ]);
        }
      }
    });

    it('should complete full journey from exposure to mastery across prerequisite chain', async () => {
      // Step 1: Check initial knowledge map - only Basics should be ready
      let mapResponse = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/learners/${testLearner._id}/knowledge-map`)
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.data.readyToLearnNodes).toContain(nodeBasics._id.toString());
      expect(mapResponse.body.data.readyToLearnNodes).not.toContain(nodeIntermediate._id.toString());
      expect(mapResponse.body.data.readyToLearnNodes).not.toContain(nodeAdvanced._id.toString());

      // Step 2: Start with Basics at exposure depth
      let selectResponse = await request(app)
        .post('/api/v2/adaptive/select-question')
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({
          learnerId: testLearner._id.toString(),
          knowledgeNodeId: nodeBasics._id.toString()
        });

      expect(selectResponse.status).toBe(200);
      expect(selectResponse.body.data.cognitiveDepth).toBe('exposure');

      // Step 3: Progress through exposure level (3 correct answers at 80% threshold)
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeBasics._id.toString(), 'exposure', 3, 3);

      // Step 4: Progress through practice level
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeBasics._id.toString(), 'practice', 3, 3);

      // Step 5: Progress through proficiency level
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeBasics._id.toString(), 'proficiency', 3, 3);

      // Step 6: Progress through mastery level
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeBasics._id.toString(), 'mastery', 3, 3);

      // Step 7: Verify Basics node is complete and Intermediate becomes ready
      mapResponse = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/learners/${testLearner._id}/knowledge-map`)
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.data.masteredNodes).toContain(nodeBasics._id.toString());
      expect(mapResponse.body.data.readyToLearnNodes).toContain(nodeIntermediate._id.toString());
      expect(mapResponse.body.data.readyToLearnNodes).not.toContain(nodeAdvanced._id.toString());

      // Step 8: Complete Intermediate node
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeIntermediate._id.toString(), 'exposure', 3, 3);
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeIntermediate._id.toString(), 'practice', 3, 3);
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeIntermediate._id.toString(), 'proficiency', 3, 3);
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeIntermediate._id.toString(), 'mastery', 3, 3);

      // Step 9: Verify Intermediate complete, Advanced becomes ready
      mapResponse = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/learners/${testLearner._id}/knowledge-map`)
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.data.masteredNodes).toContain(nodeBasics._id.toString());
      expect(mapResponse.body.data.masteredNodes).toContain(nodeIntermediate._id.toString());
      expect(mapResponse.body.data.readyToLearnNodes).toContain(nodeAdvanced._id.toString());

      // Step 10: Complete Advanced node
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeAdvanced._id.toString(), 'exposure', 3, 3);
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeAdvanced._id.toString(), 'practice', 3, 3);
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeAdvanced._id.toString(), 'proficiency', 3, 3);
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeAdvanced._id.toString(), 'mastery', 3, 3);

      // Step 11: Verify final knowledge map shows all nodes mastered
      mapResponse = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/learners/${testLearner._id}/knowledge-map`)
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.data.masteredNodes).toContain(nodeBasics._id.toString());
      expect(mapResponse.body.data.masteredNodes).toContain(nodeIntermediate._id.toString());
      expect(mapResponse.body.data.masteredNodes).toContain(nodeAdvanced._id.toString());
      expect(mapResponse.body.data.summary.masteredNodes).toBe(3);
    });

    it('should track progress through depth levels correctly', async () => {
      // Answer questions at exposure level
      await simulateAnswering(learnerAuthToken, testLearner._id.toString(), nodeBasics._id.toString(), 'exposure', 3, 3);

      // Check progress for the node
      const progressResponse = await request(app)
        .get(`/api/v2/learners/${testLearner._id}/knowledge-progress/${nodeBasics._id}`)
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(progressResponse.status).toBe(200);
      expect(progressResponse.body.data.totalAttempts).toBe(3);
      expect(progressResponse.body.data.correctAttempts).toBe(3);
      expect(progressResponse.body.data.depthProgress).toBeDefined();
      expect(progressResponse.body.data.depthProgress.exposure).toBeDefined();
      expect(progressResponse.body.data.depthProgress.exposure.mastered).toBe(true);
    });
  });

  // =========================================================================
  // Scenario 2: Department Customization Flow
  // =========================================================================
  describe('Department Customization Flow', () => {
    it('should allow department to create custom depth levels', async () => {
      // Step 1: List system defaults
      let defaultsResponse = await request(app)
        .get('/api/v2/cognitive-depth-levels')
        .set('Authorization', `Bearer ${staffAuthToken}`);

      expect(defaultsResponse.status).toBe(200);
      expect(defaultsResponse.body.data.length).toBeGreaterThanOrEqual(4);
      expect(defaultsResponse.body.data[0].isDefault).toBe(true);

      // Step 2: Create custom depth levels for department
      const customLevelResponse = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
        .set('Authorization', `Bearer ${staffAuthToken}`)
        .send({
          slug: 'introduction',
          name: 'Introduction',
          description: 'Custom introductory level',
          order: 1,
          advanceThreshold: 0.6,
          minAttempts: 2
        });

      expect(customLevelResponse.status).toBe(201);
      expect(customLevelResponse.body.data.slug).toBe('introduction');
      expect(customLevelResponse.body.data.departmentId).toBe(testDepartment._id.toString());

      // Step 3: Create override for system default
      const overrideResponse = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
        .set('Authorization', `Bearer ${staffAuthToken}`)
        .send({
          slug: 'exposure',
          name: 'Department Exposure',
          description: 'Customized exposure level',
          order: 1,
          advanceThreshold: 0.7,
          minAttempts: 4
        });

      expect(overrideResponse.status).toBe(201);
      expect(overrideResponse.body.data.isOverride).toBe(true);

      // Step 4: Verify department levels include both custom and merged defaults
      const deptLevelsResponse = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
        .set('Authorization', `Bearer ${staffAuthToken}`);

      expect(deptLevelsResponse.status).toBe(200);
      expect(deptLevelsResponse.body.data.length).toBeGreaterThanOrEqual(5); // 4 defaults + 1 custom

      // Find custom level
      const introLevel = deptLevelsResponse.body.data.find((l: any) => l.slug === 'introduction');
      expect(introLevel).toBeDefined();
      expect(introLevel.name).toBe('Introduction');

      // Find overridden level
      const exposureLevel = deptLevelsResponse.body.data.find((l: any) => l.slug === 'exposure');
      expect(exposureLevel.name).toBe('Department Exposure');
      expect(exposureLevel.isOverride).toBe(true);
    });

    it('should use department custom levels for knowledge node questions', async () => {
      // Create custom depth level for department
      await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
        .set('Authorization', `Bearer ${staffAuthToken}`)
        .send({
          slug: 'custom-depth',
          name: 'Custom Depth',
          description: 'Department-specific depth level',
          order: 5,
          advanceThreshold: 0.75,
          minAttempts: 2
        });

      // Create knowledge node
      const nodeResponse = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes`)
        .set('Authorization', `Bearer ${staffAuthToken}`)
        .send({
          name: 'Custom Depth Node',
          description: 'Node using custom depth'
        });

      expect(nodeResponse.status).toBe(201);
      const nodeId = nodeResponse.body.data.id;

      // Create question bank
      const testBank = await QuestionBank.create({
        name: 'Custom Depth Bank',
        departmentId: testDepartment._id,
        questionIds: [],
        isActive: true
      });

      // Create question at custom depth
      await Question.create({
        departmentId: testDepartment._id,
        questionText: 'Custom depth question',
        questionTypes: ['multiple_choice'],
        points: 1,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        questionBankIds: [testBank._id.toString()],
        knowledgeNodeId: nodeId,
        cognitiveDepth: 'custom-depth',
        isActive: true
      });

      // Verify question was created with custom depth
      const question = await Question.findOne({ cognitiveDepth: 'custom-depth' });
      expect(question).not.toBeNull();
      expect(question!.cognitiveDepth).toBe('custom-depth');
    });
  });

  // =========================================================================
  // Scenario 3: Prerequisite Enforcement
  // =========================================================================
  describe('Prerequisite Enforcement', () => {
    let nodeA: any;
    let nodeB: any;
    let nodeC: any;

    beforeEach(async () => {
      // Create prerequisite chain: A -> B -> C
      nodeA = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Node A (Foundation)',
        slug: 'node-a-' + Date.now(),
        description: 'Foundation node with no prerequisites',
        prerequisiteNodeIds: [],
        depthRange: { min: 'exposure', max: 'mastery' },
        isActive: true,
        createdBy: testStaffUser._id,
        updatedBy: testStaffUser._id
      });

      nodeB = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Node B (Intermediate)',
        slug: 'node-b-' + Date.now(),
        description: 'Intermediate node requiring A',
        prerequisiteNodeIds: [nodeA._id],
        depthRange: { min: 'exposure', max: 'mastery' },
        isActive: true,
        createdBy: testStaffUser._id,
        updatedBy: testStaffUser._id
      });

      nodeC = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Node C (Advanced)',
        slug: 'node-c-' + Date.now(),
        description: 'Advanced node requiring B',
        prerequisiteNodeIds: [nodeB._id],
        depthRange: { min: 'exposure', max: 'mastery' },
        isActive: true,
        createdBy: testStaffUser._id,
        updatedBy: testStaffUser._id
      });
    });

    it('should verify C not ready until B complete, B not ready until A complete', async () => {
      // Initial state: only A should be ready
      let mapResponse = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/learners/${testLearner._id}/knowledge-map`)
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.data.readyToLearnNodes).toContain(nodeA._id.toString());
      expect(mapResponse.body.data.readyToLearnNodes).not.toContain(nodeB._id.toString());
      expect(mapResponse.body.data.readyToLearnNodes).not.toContain(nodeC._id.toString());
    });

    it('should unlock B when A is mastered', async () => {
      // Master node A
      await LearnerKnowledgeProgress.create({
        learnerId: testLearner._id,
        knowledgeNodeId: nodeA._id,
        departmentId: testDepartment._id,
        currentDepth: 'mastery',
        masteryScore: 90,
        totalAttempts: 12,
        correctAttempts: 11,
        isComplete: true,
        isActive: true
      });

      // Check knowledge map
      const mapResponse = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/learners/${testLearner._id}/knowledge-map`)
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.data.masteredNodes).toContain(nodeA._id.toString());
      expect(mapResponse.body.data.readyToLearnNodes).toContain(nodeB._id.toString());
      expect(mapResponse.body.data.readyToLearnNodes).not.toContain(nodeC._id.toString());
    });

    it('should unlock C when B is mastered', async () => {
      // Master nodes A and B
      await LearnerKnowledgeProgress.create({
        learnerId: testLearner._id,
        knowledgeNodeId: nodeA._id,
        departmentId: testDepartment._id,
        currentDepth: 'mastery',
        masteryScore: 90,
        totalAttempts: 12,
        correctAttempts: 11,
        isComplete: true,
        isActive: true
      });

      await LearnerKnowledgeProgress.create({
        learnerId: testLearner._id,
        knowledgeNodeId: nodeB._id,
        departmentId: testDepartment._id,
        currentDepth: 'mastery',
        masteryScore: 88,
        totalAttempts: 10,
        correctAttempts: 9,
        isComplete: true,
        isActive: true
      });

      // Check knowledge map
      const mapResponse = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/learners/${testLearner._id}/knowledge-map`)
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.data.masteredNodes).toContain(nodeA._id.toString());
      expect(mapResponse.body.data.masteredNodes).toContain(nodeB._id.toString());
      expect(mapResponse.body.data.readyToLearnNodes).toContain(nodeC._id.toString());
    });

    it('should prevent circular dependencies', async () => {
      // Try to make A depend on C (would create A -> B -> C -> A cycle)
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${nodeA._id}/prerequisites`)
        .set('Authorization', `Bearer ${staffAuthToken}`)
        .send({
          prerequisiteNodeId: nodeC._id.toString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent self-reference in prerequisites', async () => {
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${nodeA._id}/prerequisites`)
        .set('Authorization', `Bearer ${staffAuthToken}`)
        .send({
          prerequisiteNodeId: nodeA._id.toString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // =========================================================================
  // Scenario 4: Cross-Bank Question Selection
  // =========================================================================
  describe('Cross-Bank Question Selection', () => {
    let testNode: any;
    let bankA: any;
    let bankB: any;
    let bankC: any;

    beforeEach(async () => {
      // Create knowledge node
      testNode = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Multi-Bank Node',
        slug: 'multi-bank-node-' + Date.now(),
        description: 'Node with questions from multiple banks',
        prerequisiteNodeIds: [],
        depthRange: { min: 'exposure', max: 'mastery' },
        isActive: true,
        createdBy: testStaffUser._id,
        updatedBy: testStaffUser._id
      });

      // Create multiple question banks
      bankA = await QuestionBank.create({
        name: 'Bank A',
        departmentId: testDepartment._id,
        questionIds: [],
        isActive: true
      });

      bankB = await QuestionBank.create({
        name: 'Bank B',
        departmentId: testDepartment._id,
        questionIds: [],
        isActive: true
      });

      bankC = await QuestionBank.create({
        name: 'Bank C',
        departmentId: testDepartment._id,
        questionIds: [],
        isActive: true
      });

      // Create questions in each bank linked to the same node
      await Question.create([
        {
          departmentId: testDepartment._id,
          questionText: 'Bank A Question 1',
          questionTypes: ['multiple_choice'],
          points: 1,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          questionBankIds: [bankA._id.toString()],
          knowledgeNodeId: testNode._id,
          cognitiveDepth: 'exposure',
          isActive: true
        },
        {
          departmentId: testDepartment._id,
          questionText: 'Bank A Question 2',
          questionTypes: ['multiple_choice'],
          points: 1,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'B',
          questionBankIds: [bankA._id.toString()],
          knowledgeNodeId: testNode._id,
          cognitiveDepth: 'exposure',
          isActive: true
        },
        {
          departmentId: testDepartment._id,
          questionText: 'Bank B Question 1',
          questionTypes: ['multiple_choice'],
          points: 1,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'C',
          questionBankIds: [bankB._id.toString()],
          knowledgeNodeId: testNode._id,
          cognitiveDepth: 'exposure',
          isActive: true
        },
        {
          departmentId: testDepartment._id,
          questionText: 'Bank C Question 1',
          questionTypes: ['multiple_choice'],
          points: 1,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'D',
          questionBankIds: [bankC._id.toString()],
          knowledgeNodeId: testNode._id,
          cognitiveDepth: 'exposure',
          isActive: true
        }
      ]);
    });

    it('should select questions from all available banks when no filter specified', async () => {
      // Select multiple questions without bank filter
      const response = await request(app)
        .post('/api/v2/adaptive/select-questions')
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({
          learnerId: testLearner._id.toString(),
          knowledgeNodeId: testNode._id.toString(),
          count: 4
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(4);

      // Verify questions come from different banks
      const bankIds = new Set<string>();
      response.body.data.forEach((item: any) => {
        item.question.questionBankIds.forEach((id: string) => bankIds.add(id));
      });

      expect(bankIds.size).toBeGreaterThanOrEqual(2);
    });

    it('should filter questions by single questionBankId', async () => {
      const response = await request(app)
        .post('/api/v2/adaptive/select-questions')
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({
          learnerId: testLearner._id.toString(),
          knowledgeNodeId: testNode._id.toString(),
          questionBankIds: [bankA._id.toString()],
          count: 5
        });

      expect(response.status).toBe(200);
      // Only Bank A has 2 exposure questions
      expect(response.body.data.length).toBeLessThanOrEqual(2);

      // All questions should be from Bank A
      response.body.data.forEach((item: any) => {
        expect(item.question.questionBankIds).toContain(bankA._id.toString());
      });
    });

    it('should filter questions by multiple questionBankIds', async () => {
      const response = await request(app)
        .post('/api/v2/adaptive/select-questions')
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({
          learnerId: testLearner._id.toString(),
          knowledgeNodeId: testNode._id.toString(),
          questionBankIds: [bankA._id.toString(), bankB._id.toString()],
          count: 5
        });

      expect(response.status).toBe(200);
      // Bank A has 2 and Bank B has 1 exposure question
      expect(response.body.data.length).toBeLessThanOrEqual(3);

      // All questions should be from Bank A or Bank B
      response.body.data.forEach((item: any) => {
        const hasValidBank = item.question.questionBankIds.some(
          (id: string) => id === bankA._id.toString() || id === bankB._id.toString()
        );
        expect(hasValidBank).toBe(true);
      });
    });

    it('should return empty when filtering by bank with no questions for node', async () => {
      // Create a new empty bank
      const emptyBank = await QuestionBank.create({
        name: 'Empty Bank',
        departmentId: testDepartment._id,
        questionIds: [],
        isActive: true
      });

      const response = await request(app)
        .post('/api/v2/adaptive/select-question')
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({
          learnerId: testLearner._id.toString(),
          knowledgeNodeId: testNode._id.toString(),
          questionBankIds: [emptyBank._id.toString()]
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toContain('No questions available');
    });

    it('should support questions belonging to multiple banks', async () => {
      // Create a question that belongs to both Bank A and Bank B
      const multiQuestion = await Question.create({
        departmentId: testDepartment._id,
        questionText: 'Multi-Bank Question',
        questionTypes: ['multiple_choice'],
        points: 1,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        questionBankIds: [bankA._id.toString(), bankB._id.toString()],
        knowledgeNodeId: testNode._id,
        cognitiveDepth: 'exposure',
        isActive: true
      });

      // Filter by Bank A should include this question
      const responseA = await request(app)
        .post('/api/v2/adaptive/select-questions')
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({
          learnerId: testLearner._id.toString(),
          knowledgeNodeId: testNode._id.toString(),
          questionBankIds: [bankA._id.toString()],
          count: 10
        });

      expect(responseA.status).toBe(200);
      const multiQuestionInA = responseA.body.data.find(
        (item: any) => item.question._id.toString() === multiQuestion._id.toString()
      );
      expect(multiQuestionInA).toBeDefined();

      // Filter by Bank B should also include this question
      const responseB = await request(app)
        .post('/api/v2/adaptive/select-questions')
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({
          learnerId: testLearner._id.toString(),
          knowledgeNodeId: testNode._id.toString(),
          questionBankIds: [bankB._id.toString()],
          count: 10
        });

      expect(responseB.status).toBe(200);
      const multiQuestionInB = responseB.body.data.find(
        (item: any) => item.question._id.toString() === multiQuestion._id.toString()
      );
      expect(multiQuestionInB).toBeDefined();
    });
  });

  // =========================================================================
  // Additional E2E Scenarios
  // =========================================================================
  describe('Progress Summary and Depth Distribution', () => {
    let testNodes: any[];

    beforeEach(async () => {
      testNodes = [];
      for (let i = 0; i < 5; i++) {
        const node = await KnowledgeNode.create({
          departmentId: testDepartment._id,
          name: `Summary Test Node ${i + 1}`,
          slug: `summary-node-${i + 1}-${Date.now()}`,
          prerequisiteNodeIds: [],
          depthRange: { min: 'exposure', max: 'mastery' },
          isActive: true,
          createdBy: testStaffUser._id,
          updatedBy: testStaffUser._id
        });
        testNodes.push(node);
      }
    });

    it('should provide accurate progress summary', async () => {
      // Create varied progress for different nodes
      await LearnerKnowledgeProgress.create({
        learnerId: testLearner._id,
        knowledgeNodeId: testNodes[0]._id,
        departmentId: testDepartment._id,
        currentDepth: 'mastery',
        masteryScore: 95,
        totalAttempts: 15,
        correctAttempts: 14,
        isComplete: true,
        isActive: true
      });

      await LearnerKnowledgeProgress.create({
        learnerId: testLearner._id,
        knowledgeNodeId: testNodes[1]._id,
        departmentId: testDepartment._id,
        currentDepth: 'practice',
        masteryScore: 70,
        totalAttempts: 8,
        correctAttempts: 6,
        isComplete: false,
        isActive: true
      });

      await LearnerKnowledgeProgress.create({
        learnerId: testLearner._id,
        knowledgeNodeId: testNodes[2]._id,
        departmentId: testDepartment._id,
        currentDepth: 'exposure',
        masteryScore: 50,
        totalAttempts: 4,
        correctAttempts: 2,
        isComplete: false,
        isActive: true
      });

      // Nodes 3 and 4 have no progress (not started)

      const response = await request(app)
        .get(`/api/v2/learners/${testLearner._id}/knowledge-progress/summary`)
        .query({ departmentId: testDepartment._id.toString() })
        .set('Authorization', `Bearer ${staffAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalNodes).toBe(5);
      expect(response.body.data.masteredNodes).toBe(1);
      expect(response.body.data.inProgressNodes).toBe(2);
      expect(response.body.data.notStartedNodes).toBe(2);
      expect(response.body.data.depthDistribution).toBeDefined();
    });
  });
});
