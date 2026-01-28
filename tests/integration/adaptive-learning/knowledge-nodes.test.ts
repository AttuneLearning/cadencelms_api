/**
 * Knowledge Nodes API Integration Tests
 *
 * Tests the knowledge nodes API endpoints under /api/v2/departments/:departmentId/knowledge-nodes
 * Knowledge nodes represent conceptual topics for adaptive learning organized in a graph structure.
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import KnowledgeNode from '@/models/content/KnowledgeNode.model';
import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Knowledge Nodes API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TEST' + Date.now(),
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
      accessRights: ['content:department:read', 'content:department:manage', 'content:own:read'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:department:read', domain: 'content', resource: 'department', action: 'read', description: 'Read department content', isActive: true },
      { name: 'content:department:manage', domain: 'content', resource: 'department', action: 'manage', description: 'Manage department content', isActive: true },
      { name: 'content:own:read', domain: 'content', resource: 'own', action: 'read', description: 'Read own content', isActive: true }
    ]);

    // Create test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'knowledge-nodes-test@example.com',
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
      { userId: testUser._id.toString(), email: testUser.email, roles: ['staff'], type: 'access' },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await KnowledgeNode.deleteMany({});
  });

  // =========================================================================
  // List Nodes Tests
  // =========================================================================
  describe('GET /api/v2/departments/:departmentId/knowledge-nodes', () => {
    describe('successful listing', () => {
      it('should return paginated list', async () => {
        // Create test nodes
        await KnowledgeNode.create([
          {
            departmentId: testDepartment._id,
            name: 'Node 1',
            slug: 'node-1',
            isActive: true,
            createdBy: testUser._id,
            updatedBy: testUser._id
          },
          {
            departmentId: testDepartment._id,
            name: 'Node 2',
            slug: 'node-2',
            isActive: true,
            createdBy: testUser._id,
            updatedBy: testUser._id
          }
        ]);

        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/knowledge-nodes`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.nodes).toHaveLength(2);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.total).toBe(2);
      });

      it('should filter by isActive', async () => {
        await KnowledgeNode.create([
          {
            departmentId: testDepartment._id,
            name: 'Active Node',
            slug: 'active-node',
            isActive: true,
            createdBy: testUser._id,
            updatedBy: testUser._id
          },
          {
            departmentId: testDepartment._id,
            name: 'Inactive Node',
            slug: 'inactive-node',
            isActive: false,
            createdBy: testUser._id,
            updatedBy: testUser._id
          }
        ]);

        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/knowledge-nodes?isActive=true`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.nodes).toHaveLength(1);
        expect(response.body.data.nodes[0].name).toBe('Active Node');
      });

      it('should filter by parentNodeId', async () => {
        const parentNode = await KnowledgeNode.create({
          departmentId: testDepartment._id,
          name: 'Parent Node',
          slug: 'parent-node',
          isActive: true,
          createdBy: testUser._id,
          updatedBy: testUser._id
        });

        await KnowledgeNode.create([
          {
            departmentId: testDepartment._id,
            name: 'Child Node',
            slug: 'child-node',
            parentNodeId: parentNode._id,
            isActive: true,
            createdBy: testUser._id,
            updatedBy: testUser._id
          },
          {
            departmentId: testDepartment._id,
            name: 'Root Node',
            slug: 'root-node',
            isActive: true,
            createdBy: testUser._id,
            updatedBy: testUser._id
          }
        ]);

        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/knowledge-nodes?parentNodeId=${parentNode._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.nodes).toHaveLength(1);
        expect(response.body.data.nodes[0].name).toBe('Child Node');
      });

      // Text search requires text index which may not be available in memory MongoDB
      it.skip('should search by name', async () => {
        await KnowledgeNode.create([
          {
            departmentId: testDepartment._id,
            name: 'Algebra Basics',
            slug: 'algebra-basics',
            description: 'Introduction to algebra',
            isActive: true,
            createdBy: testUser._id,
            updatedBy: testUser._id
          },
          {
            departmentId: testDepartment._id,
            name: 'Geometry Fundamentals',
            slug: 'geometry-fundamentals',
            description: 'Introduction to geometry',
            isActive: true,
            createdBy: testUser._id,
            updatedBy: testUser._id
          }
        ]);

        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/knowledge-nodes?search=algebra`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.nodes).toHaveLength(1);
        expect(response.body.data.nodes[0].name).toBe('Algebra Basics');
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/knowledge-nodes`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Get Tree Tests
  // =========================================================================
  describe('GET /api/v2/departments/:departmentId/knowledge-nodes/tree', () => {
    it('should return hierarchical tree structure', async () => {
      const rootNode = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Root Node',
        slug: 'root-node',
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Child Node 1',
        slug: 'child-node-1',
        parentNodeId: rootNode._id,
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Child Node 2',
        slug: 'child-node-2',
        parentNodeId: rootNode._id,
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/tree`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Find root node in tree
      const rootInTree = response.body.data.find((n: any) => n.name === 'Root Node');
      expect(rootInTree).toBeDefined();
      expect(rootInTree.children).toHaveLength(2);
    });
  });

  // =========================================================================
  // Create Node Tests
  // =========================================================================
  describe('POST /api/v2/departments/:departmentId/knowledge-nodes', () => {
    describe('successful creation', () => {
      it('should create with minimal fields (name)', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Minimal Node'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Minimal Node');
        expect(response.body.data.departmentId).toBe(testDepartment._id.toString());
        expect(response.body.data.isActive).toBe(true);
      });

      it('should create with all fields', async () => {
        const parentNode = await KnowledgeNode.create({
          departmentId: testDepartment._id,
          name: 'Parent',
          slug: 'parent',
          isActive: true,
          createdBy: testUser._id,
          updatedBy: testUser._id
        });

        const relatedNode = await KnowledgeNode.create({
          departmentId: testDepartment._id,
          name: 'Related',
          slug: 'related',
          isActive: true,
          createdBy: testUser._id,
          updatedBy: testUser._id
        });

        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Complete Node',
            slug: 'complete-node',
            description: 'A node with all fields populated',
            parentNodeId: parentNode._id.toString(),
            relatedNodeIds: [relatedNode._id.toString()],
            tags: ['math', 'algebra']
          });

        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe('Complete Node');
        expect(response.body.data.slug).toBe('complete-node');
        expect(response.body.data.description).toBe('A node with all fields populated');
        expect(response.body.data.parentNodeId).toBe(parentNode._id.toString());
        expect(response.body.data.relatedNodeIds).toContain(relatedNode._id.toString());
        expect(response.body.data.tags).toEqual(['math', 'algebra']);
      });

      it('should auto-generate slug from name', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'My Test Node Name'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.slug).toBe('my-test-node-name');
      });
    });

    describe('validation errors', () => {
      it('should return 400 for missing name', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should return 400 for duplicate slug in same department', async () => {
        // Create first node
        await KnowledgeNode.create({
          departmentId: testDepartment._id,
          name: 'Existing Node',
          slug: 'existing-slug',
          isActive: true,
          createdBy: testUser._id,
          updatedBy: testUser._id
        });

        // Try to create another with same slug
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Another Node',
            slug: 'existing-slug'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes`)
          .send({ name: 'Unauthorized Node' });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Get By ID Tests
  // =========================================================================
  describe('GET /api/v2/departments/:departmentId/knowledge-nodes/:nodeId', () => {
    it('should return node details', async () => {
      const node = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Detail Node',
        slug: 'detail-node',
        description: 'A node to get details for',
        tags: ['test', 'detail'],
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${node._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(node._id.toString());
      expect(response.body.data.name).toBe('Detail Node');
      expect(response.body.data.slug).toBe('detail-node');
      expect(response.body.data.description).toBe('A node to get details for');
      expect(response.body.data.tags).toEqual(['test', 'detail']);
    });

    it('should return 404 for non-existent', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // =========================================================================
  // Update Node Tests
  // =========================================================================
  describe('PUT /api/v2/departments/:departmentId/knowledge-nodes/:nodeId', () => {
    let testNode: any;

    beforeEach(async () => {
      testNode = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Original Name',
        slug: 'original-slug',
        description: 'Original description',
        tags: ['original'],
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });
    });

    describe('successful updates', () => {
      it('should update fields', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${testNode._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Name',
            description: 'Updated description',
            tags: ['updated', 'modified']
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Name');
        expect(response.body.data.description).toBe('Updated description');
        expect(response.body.data.tags).toEqual(['updated', 'modified']);
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Update Attempt' });

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${testNode._id}`)
          .send({ name: 'Unauthorized Update' });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Delete Node Tests
  // =========================================================================
  describe('DELETE /api/v2/departments/:departmentId/knowledge-nodes/:nodeId', () => {
    it('should soft delete (deactivate)', async () => {
      const node = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Node to Delete',
        slug: 'node-to-delete',
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      const response = await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${node._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify node is soft deleted (isActive = false)
      const deletedNode = await KnowledgeNode.findById(node._id);
      expect(deletedNode).not.toBeNull();
      expect(deletedNode!.isActive).toBe(false);
    });

    it('should return 404 for non-existent', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    describe('authorization', () => {
      it('should return 401 without auth', async () => {
        const node = await KnowledgeNode.create({
          departmentId: testDepartment._id,
          name: 'Protected Node',
          slug: 'protected-node',
          isActive: true,
          createdBy: testUser._id,
          updatedBy: testUser._id
        });

        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${node._id}`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Prerequisites Tests
  // =========================================================================
  describe('Prerequisites', () => {
    let nodeA: any;
    let nodeB: any;
    let nodeC: any;

    beforeEach(async () => {
      nodeA = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Node A',
        slug: 'node-a',
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      nodeB = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Node B',
        slug: 'node-b',
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      nodeC = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Node C',
        slug: 'node-c',
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });
    });

    describe('POST /api/v2/departments/:departmentId/knowledge-nodes/:nodeId/prerequisites', () => {
      it('should add prerequisite', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${nodeB._id}/prerequisites`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisiteNodeId: nodeA._id.toString()
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.prerequisiteNodeIds).toContain(nodeA._id.toString());
      });

      it('should prevent circular dependency (A -> B -> A)', async () => {
        // First, make A a prerequisite of B
        await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${nodeB._id}/prerequisites`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisiteNodeId: nodeA._id.toString()
          });

        // Now try to make B a prerequisite of A (would create A -> B -> A cycle)
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${nodeA._id}/prerequisites`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisiteNodeId: nodeB._id.toString()
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should prevent self-reference', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${nodeA._id}/prerequisites`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisiteNodeId: nodeA._id.toString()
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/v2/departments/:departmentId/knowledge-nodes/:nodeId/prerequisites/:prereqId', () => {
      it('should remove prerequisite', async () => {
        // First add prerequisite
        await KnowledgeNode.updateOne(
          { _id: nodeB._id },
          { $push: { prerequisiteNodeIds: nodeA._id } }
        );

        // Then remove it
        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${nodeB._id}/prerequisites/${nodeA._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify removal
        const updatedNode = await KnowledgeNode.findById(nodeB._id);
        expect(updatedNode!.prerequisiteNodeIds).not.toContainEqual(nodeA._id);
      });
    });
  });

  // =========================================================================
  // Graph Endpoint Tests
  // =========================================================================
  describe('GET /api/v2/departments/:departmentId/knowledge-nodes/:nodeId/graph', () => {
    it('should return prerequisites, dependents, related, children', async () => {
      // Create prerequisite node
      const prereqNode = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Prerequisite Node',
        slug: 'prereq-node',
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      // Create related node
      const relatedNode = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Related Node',
        slug: 'related-node',
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      // Create main node with prerequisite and related
      const mainNode = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Main Node',
        slug: 'main-node',
        prerequisiteNodeIds: [prereqNode._id],
        relatedNodeIds: [relatedNode._id],
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      // Create child node
      const childNode = await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Child Node',
        slug: 'child-node',
        parentNodeId: mainNode._id,
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      // Create dependent node (has mainNode as prerequisite)
      await KnowledgeNode.create({
        departmentId: testDepartment._id,
        name: 'Dependent Node',
        slug: 'dependent-node',
        prerequisiteNodeIds: [mainNode._id],
        isActive: true,
        createdBy: testUser._id,
        updatedBy: testUser._id
      });

      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${mainNode._id}/graph`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Check prerequisites
      expect(response.body.data.prerequisites).toBeDefined();
      expect(Array.isArray(response.body.data.prerequisites)).toBe(true);
      expect(response.body.data.prerequisites).toHaveLength(1);
      expect(response.body.data.prerequisites[0].name).toBe('Prerequisite Node');

      // Check dependents
      expect(response.body.data.dependents).toBeDefined();
      expect(Array.isArray(response.body.data.dependents)).toBe(true);
      expect(response.body.data.dependents).toHaveLength(1);
      expect(response.body.data.dependents[0].name).toBe('Dependent Node');

      // Check related
      expect(response.body.data.related).toBeDefined();
      expect(Array.isArray(response.body.data.related)).toBe(true);
      expect(response.body.data.related).toHaveLength(1);
      expect(response.body.data.related[0].name).toBe('Related Node');

      // Check children
      expect(response.body.data.children).toBeDefined();
      expect(Array.isArray(response.body.data.children)).toBe(true);
      expect(response.body.data.children).toHaveLength(1);
      expect(response.body.data.children[0].name).toBe('Child Node');
    });

    it('should return 404 for non-existent node', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/knowledge-nodes/${nonExistentId}/graph`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
