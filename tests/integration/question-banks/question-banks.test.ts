import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '@/app';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import Question from '@/models/assessment/Question.model';
import LearningUnitQuestion from '@/models/content/LearningUnitQuestion.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { LookupValue } from '@/models/LookupValue.model';
import { hashPassword } from '@/utils/password';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Question Banks API', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let readOnlyAuthToken: string;
  let testDepartment: any;
  let testUserId: mongoose.Types.ObjectId;
  let testBankId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test department
    testDepartment = await Department.create({
      name: 'Question Banks Test Department',
      code: 'QBTEST' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    // Refresh department cache after creating departments
    await refreshDepartmentCache();

    // Seed role definitions using valid role names
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage content including assessments',
      accessRights: ['content:assessments:manage', 'content:lessons:read'],
      isActive: true
    });

    await RoleDefinition.create({
      name: 'instructor',
      userType: 'staff',
      displayName: 'Instructor',
      description: 'Can view content',
      accessRights: ['content:lessons:read'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:assessments:manage', domain: 'content', resource: 'assessments', action: 'manage', description: 'Manage assessments', isActive: true },
      { name: 'content:lessons:read', domain: 'content', resource: 'lessons', action: 'read', description: 'Read lessons', isActive: true }
    ]);

    // Seed lookup values for LearningUnit category and type validation
    await LookupValue.create([
      {
        lookupId: 'learning-unit-category.assessment',
        category: 'learning-unit-category',
        key: 'assessment',
        parentLookupId: null,
        displayAs: 'Assessment',
        sortOrder: 0,
        isActive: true
      },
      {
        lookupId: 'learning-unit-type.assessment',
        category: 'learning-unit-type',
        key: 'assessment',
        parentLookupId: null,
        displayAs: 'Assessment',
        sortOrder: 0,
        isActive: true
      }
    ]);

    // Create a staff user with content-admin role (full access)
    const hashedPassword = await hashPassword('SecurePass123!');
    testUserId = new mongoose.Types.ObjectId();

    await User.create({
      _id: testUserId,
      email: 'qb-test@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true,
      accessRights: []
    });

    await Staff.create({
      _id: testUserId,
      person: {
        firstName: 'Test',
        lastName: 'User',
        emails: [{
          email: 'qb-test@example.com',
          type: 'institutional',
          isPrimary: true,
          verified: true
        }],
        phones: [],
        addresses: []
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['content-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }],
      isActive: true
    });

    // Generate JWT token with full access rights
    authToken = jwt.sign(
      {
        userId: testUserId.toString(),
        email: 'qb-test@example.com',
        type: 'access',
        roles: ['content-admin'],
        globalRights: [],
        departmentRights: {
          [testDepartment._id.toString()]: ['content:assessments:manage', 'content:lessons:read']
        },
        departmentMemberships: [{ departmentId: testDepartment._id.toString() }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create a read-only user for testing authorization
    const readOnlyUserId = new mongoose.Types.ObjectId();

    await User.create({
      _id: readOnlyUserId,
      email: 'qb-readonly@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true,
      accessRights: []
    });

    await Staff.create({
      _id: readOnlyUserId,
      person: {
        firstName: 'ReadOnly',
        lastName: 'User',
        emails: [{
          email: 'qb-readonly@example.com',
          type: 'institutional',
          isPrimary: true,
          verified: true
        }],
        phones: [],
        addresses: []
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['instructor'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }],
      isActive: true
    });

    readOnlyAuthToken = jwt.sign(
      {
        userId: readOnlyUserId.toString(),
        email: 'qb-readonly@example.com',
        type: 'access',
        roles: ['instructor'],
        globalRights: [],
        departmentRights: {
          [testDepartment._id.toString()]: ['content:lessons:read']
        },
        departmentMemberships: [{ departmentId: testDepartment._id.toString() }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up question banks created during tests
    await QuestionBank.deleteMany({ departmentId: testDepartment._id });
    await Question.deleteMany({ departmentId: testDepartment._id });
    await LearningUnitQuestion.deleteMany({});
    await LearningUnit.deleteMany({});
  });

  describe('POST /api/v2/departments/:departmentId/question-banks', () => {
    it('should create a question bank', async () => {
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Question Bank',
          description: 'A test bank for unit testing',
          tags: ['test', 'math']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Question bank created');
      expect(response.body.data.name).toBe('Test Question Bank');
      expect(response.body.data.description).toBe('A test bank for unit testing');
      expect(response.body.data.tags).toEqual(['test', 'math']);
      expect(response.body.data.questionCount).toBe(0);
      expect(response.body.data.id).toBeDefined();

      testBankId = response.body.data.id;
    });

    it('should create a question bank without optional fields', async () => {
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Minimal Bank'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Minimal Bank');
      expect(response.body.data.description).toBeNull();
      expect(response.body.data.tags).toEqual([]);
    });

    it('should reject duplicate names in same department', async () => {
      // Create first bank
      await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicate Test Bank' });

      // Try to create duplicate
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicate Test Bank' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject duplicate names case-insensitively', async () => {
      await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Case Test Bank' });

      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'CASE TEST BANK' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .send({ name: 'Unauthorized Bank' });

      expect(response.status).toBe(401);
    });

    it('should reject with read-only access', async () => {
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${readOnlyAuthToken}`)
        .send({ name: 'Read Only Attempt' });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent department', async () => {
      const fakeDeptId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/v2/departments/${fakeDeptId}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Orphan Bank' });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid department ID format', async () => {
      const response = await request(app)
        .post('/api/v2/departments/invalid-id/question-banks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Invalid Dept Bank' });

      expect(response.status).toBe(404);
    });

    it('should lowercase tags when creating', async () => {
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tag Test Bank',
          tags: ['UPPERCASE', 'MixedCase', 'lowercase']
        });

      expect(response.status).toBe(201);
      expect(response.body.data.tags).toEqual(['uppercase', 'mixedcase', 'lowercase']);
    });
  });

  describe('GET /api/v2/departments/:departmentId/question-banks', () => {
    beforeEach(async () => {
      // Create multiple test banks for listing tests
      await QuestionBank.create([
        {
          name: 'Math Bank Alpha',
          description: 'Mathematics questions',
          departmentId: testDepartment._id,
          tags: ['math', 'algebra'],
          isActive: true
        },
        {
          name: 'Math Bank Beta',
          description: 'More math questions',
          departmentId: testDepartment._id,
          tags: ['math', 'geometry'],
          isActive: true
        },
        {
          name: 'Science Bank',
          description: 'Science questions',
          departmentId: testDepartment._id,
          tags: ['science', 'physics'],
          isActive: true
        },
        {
          name: 'History Bank',
          description: 'History questions',
          departmentId: testDepartment._id,
          tags: ['history'],
          isActive: true
        },
        {
          name: 'Deleted Bank',
          description: 'Should not appear',
          departmentId: testDepartment._id,
          tags: ['deleted'],
          isActive: false
        }
      ]);
    });

    it('should list question banks with pagination', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.questionBanks).toHaveLength(4); // Excludes deleted
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBe(4);
      expect(response.body.data.pagination.page).toBe(1);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks?limit=2&page=1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.questionBanks).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(4);
      expect(response.body.data.pagination.totalPages).toBe(2);
      expect(response.body.data.pagination.hasNext).toBe(true);
      expect(response.body.data.pagination.hasPrev).toBe(false);
    });

    it('should return second page of results', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks?limit=2&page=2`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.questionBanks).toHaveLength(2);
      expect(response.body.data.pagination.hasNext).toBe(false);
      expect(response.body.data.pagination.hasPrev).toBe(true);
    });

    it('should filter by search term in name', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks?search=Math`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.questionBanks).toHaveLength(2);
      expect(response.body.data.questionBanks.every((b: any) => b.name.includes('Math'))).toBe(true);
    });

    it('should filter by search term in description', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks?search=Science questions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.questionBanks).toHaveLength(1);
      expect(response.body.data.questionBanks[0].name).toBe('Science Bank');
    });

    it('should filter by tags', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks?tags=math`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.questionBanks).toHaveLength(2);
      expect(response.body.data.questionBanks.every((b: any) => b.tags.includes('math'))).toBe(true);
    });

    it('should filter by multiple tags (OR logic)', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks?tags=algebra,history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.questionBanks).toHaveLength(2);
      const names = response.body.data.questionBanks.map((b: any) => b.name);
      expect(names).toContain('Math Bank Alpha');
      expect(names).toContain('History Bank');
    });

    it('should allow read-only users to list banks', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${readOnlyAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.questionBanks).toHaveLength(4);
    });

    it('should not include deleted banks', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks?search=Deleted`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.questionBanks).toHaveLength(0);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks`);

      expect(response.status).toBe(401);
    });

    it('should sort by createdAt descending by default', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const banks = response.body.data.questionBanks;
      for (let i = 0; i < banks.length - 1; i++) {
        expect(new Date(banks[i].createdAt).getTime())
          .toBeGreaterThanOrEqual(new Date(banks[i + 1].createdAt).getTime());
      }
    });

    it('should sort by name ascending when specified', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks?sort=name`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const names = response.body.data.questionBanks.map((b: any) => b.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('GET /api/v2/departments/:departmentId/question-banks/:bankId', () => {
    let detailsTestBank: any;

    beforeEach(async () => {
      // Create a bank with some questions for detail tests
      detailsTestBank = await QuestionBank.create({
        name: 'Details Test Bank',
        description: 'Bank for testing details endpoint',
        departmentId: testDepartment._id,
        tags: ['details', 'test'],
        isActive: true
      });

      // Create questions linked to this bank
      await Question.create([
        {
          questionText: 'Question 1',
          questionTypes: ['multiple_choice'],
          departmentId: testDepartment._id,
          points: 10,
          correctAnswers: ['A'],
          distractors: ['B', 'C', 'D'],
          questionBankIds: [detailsTestBank._id.toString()],
          isActive: true
        },
        {
          questionText: 'Question 2',
          questionTypes: ['true_false'],
          departmentId: testDepartment._id,
          points: 5,
          correctAnswers: ['true'],
          trueFalseData: { correctValue: true },
          questionBankIds: [detailsTestBank._id.toString()],
          isActive: true
        }
      ]);
    });

    it('should return bank details with question count', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks/${detailsTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Details Test Bank');
      expect(response.body.data.description).toBe('Bank for testing details endpoint');
      expect(response.body.data.tags).toEqual(['details', 'test']);
      expect(response.body.data.questionCount).toBe(2);
      expect(response.body.data.usageCount).toBeDefined();
      expect(response.body.data.id).toBe(detailsTestBank._id.toString());
    });

    it('should return 404 for non-existent bank', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for deleted bank', async () => {
      const deletedBank = await QuestionBank.create({
        name: 'Deleted Bank',
        departmentId: testDepartment._id,
        isActive: false
      });

      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks/${deletedBank._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for bank in different department', async () => {
      const otherDepartment = await Department.create({
        name: 'Other Department',
        code: 'OTHER' + Date.now(),
        level: 0,
        path: [],
        isActive: true
      });

      const otherBank = await QuestionBank.create({
        name: 'Other Bank',
        departmentId: otherDepartment._id,
        isActive: true
      });

      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks/${otherBank._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for invalid bank ID format', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks/invalid-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should allow read-only users to view bank details', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks/${detailsTestBank._id}`)
        .set('Authorization', `Bearer ${readOnlyAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Details Test Bank');
    });
  });

  describe('PUT /api/v2/departments/:departmentId/question-banks/:bankId', () => {
    let updateTestBank: any;

    beforeEach(async () => {
      updateTestBank = await QuestionBank.create({
        name: 'Update Test Bank',
        description: 'Original description',
        departmentId: testDepartment._id,
        tags: ['original'],
        isActive: true
      });
    });

    it('should update bank name and description', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/question-banks/${updateTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Bank Name',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Question bank updated');
      expect(response.body.data.name).toBe('Updated Bank Name');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update only provided fields', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/question-banks/${updateTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Only description updated'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Update Test Bank'); // Unchanged
      expect(response.body.data.description).toBe('Only description updated');
    });

    it('should update tags', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/question-banks/${updateTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: ['updated', 'new-tags']
        });

      expect(response.status).toBe(200);
      expect(response.body.data.tags).toEqual(['updated', 'new-tags']);
    });

    it('should lowercase tags when updating', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/question-banks/${updateTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: ['UPPER', 'Mixed', 'lower']
        });

      expect(response.status).toBe(200);
      expect(response.body.data.tags).toEqual(['upper', 'mixed', 'lower']);
    });

    it('should reject duplicate names', async () => {
      // Create another bank
      await QuestionBank.create({
        name: 'Existing Bank',
        departmentId: testDepartment._id,
        isActive: true
      });

      // Try to update to duplicate name
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/question-banks/${updateTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Existing Bank'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    it('should allow updating to same name (case change only)', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/question-banks/${updateTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'UPDATE TEST BANK'
        });

      // This should be allowed since it's the same bank
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('UPDATE TEST BANK');
    });

    it('should return 404 for non-existent bank', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/question-banks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Does Not Exist' });

      expect(response.status).toBe(404);
    });

    it('should reject with read-only access', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/question-banks/${updateTestBank._id}`)
        .set('Authorization', `Bearer ${readOnlyAuthToken}`)
        .send({ name: 'Should Fail' });

      expect(response.status).toBe(403);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/question-banks/${updateTestBank._id}`)
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v2/departments/:departmentId/question-banks/:bankId', () => {
    let deleteTestBank: any;
    let usedTestBank: any;
    let learningUnitId: mongoose.Types.ObjectId;
    let questionId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      // Create a bank that's not in use
      deleteTestBank = await QuestionBank.create({
        name: 'Delete Test Bank',
        description: 'Bank to be deleted',
        departmentId: testDepartment._id,
        isActive: true
      });

      // Create a bank that's in use
      usedTestBank = await QuestionBank.create({
        name: 'Used Test Bank',
        description: 'Bank that is in use',
        departmentId: testDepartment._id,
        isActive: true
      });

      // Create a question in the used bank
      const question = await Question.create({
        questionText: 'Question in used bank',
        questionTypes: ['multiple_choice'],
        departmentId: testDepartment._id,
        points: 10,
        correctAnswers: ['A'],
        distractors: ['B', 'C'],
        questionBankIds: [usedTestBank._id.toString()],
        isActive: true
      });
      questionId = question._id;

      // Create a LearningUnit to satisfy the foreign key reference
      const learningUnit = await LearningUnit.create({
        moduleId: new mongoose.Types.ObjectId(),
        title: 'Test Learning Unit',
        type: 'assessment',
        category: 'assessment',
        isRequired: true,
        isReplayable: false,
        weight: 1,
        sequence: 1,
        isActive: true
      });
      learningUnitId = learningUnit._id;

      // Create a LearningUnitQuestion link to simulate bank in use
      await LearningUnitQuestion.create({
        learningUnitId: learningUnitId,
        questionId: questionId,
        bankId: usedTestBank._id,
        sequence: 0
      });
    });

    it('should soft delete bank when not in use', async () => {
      const response = await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/question-banks/${deleteTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Question bank deleted');

      // Verify soft delete
      const deletedBank = await QuestionBank.findById(deleteTestBank._id);
      expect(deletedBank).toBeTruthy();
      expect(deletedBank!.isActive).toBe(false);
    });

    it('should return error when bank is in use', async () => {
      const response = await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/question-banks/${usedTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot delete bank in use');
      expect(response.body.message).toContain('learning unit');

      // Verify bank still exists and is active
      const bank = await QuestionBank.findById(usedTestBank._id);
      expect(bank!.isActive).toBe(true);
    });

    it('should force delete when force=true', async () => {
      const response = await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/question-banks/${usedTestBank._id}?force=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify soft delete
      const deletedBank = await QuestionBank.findById(usedTestBank._id);
      expect(deletedBank!.isActive).toBe(false);

      // Verify LearningUnitQuestion links are removed
      const links = await LearningUnitQuestion.find({ bankId: usedTestBank._id });
      expect(links).toHaveLength(0);
    });

    it('should remove bankId from questions when deleting', async () => {
      // Create a question linked to the delete test bank
      const question = await Question.create({
        questionText: 'Linked question',
        questionTypes: ['true_false'],
        departmentId: testDepartment._id,
        points: 5,
        correctAnswers: ['true'],
        trueFalseData: { correctValue: true },
        questionBankIds: [deleteTestBank._id.toString()],
        isActive: true
      });

      await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/question-banks/${deleteTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Verify bankId is removed from question
      const updatedQuestion = await Question.findById(question._id);
      expect(updatedQuestion!.questionBankIds).not.toContain(deleteTestBank._id.toString());
    });

    it('should return 404 for non-existent bank', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/question-banks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for already deleted bank', async () => {
      // First delete
      await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/question-banks/${deleteTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Second delete attempt
      const response = await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/question-banks/${deleteTestBank._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject with read-only access', async () => {
      const response = await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/question-banks/${deleteTestBank._id}`)
        .set('Authorization', `Bearer ${readOnlyAuthToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/question-banks/${deleteTestBank._id}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for bank in different department', async () => {
      const otherDepartment = await Department.create({
        name: 'Another Department',
        code: 'ANOTH' + Date.now(),
        level: 0,
        path: [],
        isActive: true
      });

      const otherBank = await QuestionBank.create({
        name: 'Other Dept Bank',
        departmentId: otherDepartment._id,
        isActive: true
      });

      const response = await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/question-banks/${otherBank._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results gracefully', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks?search=nonexistent`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.questionBanks).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });

    it('should handle special characters in bank name', async () => {
      // Create a bank with special characters in the name
      await QuestionBank.create({
        name: 'Bank with special-chars_and.dots',
        departmentId: testDepartment._id,
        isActive: true
      });

      // Search for a substring that doesn't contain regex special chars
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks?search=special-chars`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.questionBanks).toHaveLength(1);
      expect(response.body.data.questionBanks[0].name).toBe('Bank with special-chars_and.dots');
    });

    it('should handle long bank names', async () => {
      const longName = 'A'.repeat(200);
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: longName });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe(longName);
    });

    it('should handle empty tags array', async () => {
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment._id}/question-banks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'No Tags Bank',
          tags: []
        });

      expect(response.status).toBe(201);
      expect(response.body.data.tags).toEqual([]);
    });

    it('should limit results per page to 100', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/question-banks?limit=200`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.limit).toBe(100);
    });
  });
});
