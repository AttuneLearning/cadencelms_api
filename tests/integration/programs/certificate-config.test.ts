import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../src/app';
import Program from '../../../src/models/academic/Program.model';
import Template from '../../../src/models/content/Template.model';
import { createTestUser, getAuthToken } from '../../helpers/auth';

describe('PUT /api/v2/programs/:id/certificate', () => {
  let authToken: string;
  let testProgram: any;
  let testTemplate: any;
  let testDepartmentId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    // Get auth token for user with content:programs:manage permission
    const user = await createTestUser({
      roles: ['department-admin'],
      permissions: ['content:programs:manage']
    });
    authToken = await getAuthToken(user);

    testDepartmentId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    // Create a test program
    testProgram = await Program.create({
      name: 'Test Certificate Program',
      code: 'TESTCERT' + Date.now(),
      departmentId: testDepartmentId,
      type: 'certificate'
    });

    // Create a test template
    testTemplate = await Template.create({
      name: 'Test Certificate Template',
      type: 'certificate',
      content: '<html>Certificate</html>',
      isActive: true
    });
  });

  afterEach(async () => {
    await Program.deleteMany({ code: /^TESTCERT/ });
    await Template.deleteMany({ name: 'Test Certificate Template' });
  });

  describe('successful updates', () => {
    it('should enable certificate configuration', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          title: 'Certificate of Completion',
          signatoryName: 'Dr. Jane Smith',
          signatoryTitle: 'Department Director',
          validityPeriod: 24,
          autoIssue: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.certificate.enabled).toBe(true);
      expect(response.body.data.certificate.title).toBe('Certificate of Completion');
      expect(response.body.data.certificate.autoIssue).toBe(true);
    });

    it('should disable certificate configuration', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: false
        });

      expect(response.status).toBe(200);
      expect(response.body.data.certificate.enabled).toBe(false);
      expect(response.body.data.certificate.autoIssue).toBe(false);
    });

    it('should accept valid templateId', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          templateId: testTemplate._id.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.data.certificate.templateId).toBe(testTemplate._id.toString());
    });
  });

  describe('validation errors', () => {
    it('should require enabled field', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Certificate'
        });

      expect(response.status).toBe(400);
    });

    it('should reject title exceeding 200 characters', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          title: 'A'.repeat(201)
        });

      expect(response.status).toBe(400);
    });

    it('should reject negative validityPeriod', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          validityPeriod: -1
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid templateId', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          templateId: new mongoose.Types.ObjectId().toString()
        });

      expect(response.status).toBe(400);
    });
  });

  describe('authorization', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .send({ enabled: true });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent program', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/v2/programs/${fakeId}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: true });

      expect(response.status).toBe(404);
    });
  });
});
