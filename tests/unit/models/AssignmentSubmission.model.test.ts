import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AssignmentSubmission from '@/models/assignment/AssignmentSubmission.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('AssignmentSubmission Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await AssignmentSubmission.deleteMany({});
  });

  const validData = () => ({
    assignmentId: new mongoose.Types.ObjectId(),
    learnerId: new mongoose.Types.ObjectId(),
    enrollmentId: new mongoose.Types.ObjectId(),
    submissionNumber: 1
  });

  const validFile = () => ({
    fileId: new mongoose.Types.ObjectId(),
    fileName: 'essay.pdf',
    fileUrl: 'https://storage.example.com/uploads/essay.pdf',
    fileSize: 204800,
    mimeType: 'application/pdf'
  });

  // ── Required fields ──────────────────────────────────────────────────

  it('should create with valid data', async () => {
    const doc = await AssignmentSubmission.create(validData());
    expect(doc).toBeDefined();
    expect(doc._id).toBeDefined();
  });

  it('should fail without assignmentId', async () => {
    const data = validData();
    delete (data as any).assignmentId;
    await expect(AssignmentSubmission.create(data)).rejects.toThrow(/assignmentId is required/);
  });

  it('should fail without learnerId', async () => {
    const data = validData();
    delete (data as any).learnerId;
    await expect(AssignmentSubmission.create(data)).rejects.toThrow(/learnerId is required/);
  });

  it('should fail without enrollmentId', async () => {
    const data = validData();
    delete (data as any).enrollmentId;
    await expect(AssignmentSubmission.create(data)).rejects.toThrow(/enrollmentId is required/);
  });

  it('should fail without submissionNumber', async () => {
    const data = validData();
    delete (data as any).submissionNumber;
    await expect(AssignmentSubmission.create(data)).rejects.toThrow(/submissionNumber is required/);
  });

  // ── Enum: status ─────────────────────────────────────────────────────

  it('should accept all valid status values', async () => {
    const statuses = ['draft', 'submitted', 'graded', 'returned'] as const;
    for (const status of statuses) {
      const doc = await AssignmentSubmission.create({ ...validData(), status, submissionNumber: statuses.indexOf(status) + 1 });
      expect(doc.status).toBe(status);
    }
  });

  it('should reject invalid status', async () => {
    const data = { ...validData(), status: 'pending' };
    await expect(AssignmentSubmission.create(data)).rejects.toThrow(/not a valid submission status/);
  });

  // ── Defaults ─────────────────────────────────────────────────────────

  it('should apply all default values', async () => {
    const doc = await AssignmentSubmission.create(validData());
    expect(doc.status).toBe('draft');
    expect(doc.textContent).toBeNull();
    expect(doc.files).toEqual([]);
    expect(doc.grade).toBeNull();
    expect(doc.feedback).toBeNull();
    expect(doc.gradedBy).toBeNull();
    expect(doc.gradedAt).toBeNull();
    expect(doc.submittedAt).toBeNull();
    expect(doc.returnedAt).toBeNull();
    expect(doc.returnReason).toBeNull();
    expect(doc.isDeleted).toBe(false);
  });

  // ── Constraints ──────────────────────────────────────────────────────

  it('should reject submissionNumber less than 1', async () => {
    const doc = new AssignmentSubmission({ ...validData(), submissionNumber: 0 });
    await expect(doc.validate()).rejects.toThrow(/submissionNumber must be at least 1/);
  });

  it('should reject negative grade', async () => {
    const doc = new AssignmentSubmission({ ...validData(), grade: -1 });
    await expect(doc.validate()).rejects.toThrow(/grade cannot be negative/);
  });

  it('should reject textContent exceeding 50000 characters', async () => {
    const doc = new AssignmentSubmission({ ...validData(), textContent: 'a'.repeat(50001) });
    await expect(doc.validate()).rejects.toThrow(/textContent cannot exceed 50000 characters/);
  });

  it('should reject feedback exceeding 5000 characters', async () => {
    const doc = new AssignmentSubmission({ ...validData(), feedback: 'b'.repeat(5001) });
    await expect(doc.validate()).rejects.toThrow(/feedback cannot exceed 5000 characters/);
  });

  it('should reject returnReason exceeding 2000 characters', async () => {
    const doc = new AssignmentSubmission({ ...validData(), returnReason: 'c'.repeat(2001) });
    await expect(doc.validate()).rejects.toThrow(/returnReason cannot exceed 2000 characters/);
  });

  // ── Subdocument: files ───────────────────────────────────────────────

  it('should accept valid files subdocument', async () => {
    const file = validFile();
    const doc = await AssignmentSubmission.create({ ...validData(), files: [file] });
    expect(doc.files).toHaveLength(1);
    expect(doc.files[0].fileName).toBe('essay.pdf');
    expect(doc.files[0].fileUrl).toBe('https://storage.example.com/uploads/essay.pdf');
    expect(doc.files[0].fileSize).toBe(204800);
    expect(doc.files[0].mimeType).toBe('application/pdf');
  });

  it('should fail when file subdocument is missing required fields', async () => {
    const incompleteFile = { fileId: new mongoose.Types.ObjectId() };
    const doc = new AssignmentSubmission({ ...validData(), files: [incompleteFile] });
    await expect(doc.validate()).rejects.toThrow(/fileName.*required|fileUrl.*required|fileSize.*required|mimeType.*required/i);
  });

  // ── Timestamps ───────────────────────────────────────────────────────

  it('should auto-generate createdAt and updatedAt', async () => {
    const doc = await AssignmentSubmission.create(validData());
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  // ── Indexes ──────────────────────────────────────────────────────────

  it('should enforce unique compound index on assignmentId + learnerId + submissionNumber', async () => {
    const data = validData();
    await AssignmentSubmission.create(data);
    await expect(AssignmentSubmission.create(data)).rejects.toThrow(/duplicate key/i);
  });

  it('should allow same learner to have multiple submission numbers for same assignment', async () => {
    const data = validData();
    await AssignmentSubmission.create(data);
    const doc2 = await AssignmentSubmission.create({ ...data, submissionNumber: 2 });
    expect(doc2.submissionNumber).toBe(2);
  });

  it('should find submissions by assignmentId and status', async () => {
    const assignmentId = new mongoose.Types.ObjectId();
    await AssignmentSubmission.create({ ...validData(), assignmentId, status: 'submitted', submissionNumber: 1 });
    await AssignmentSubmission.create({ ...validData(), assignmentId, status: 'graded', submissionNumber: 2 });
    await AssignmentSubmission.create({ ...validData(), status: 'submitted', submissionNumber: 1 });

    const results = await AssignmentSubmission.find({ assignmentId, status: 'submitted', isDeleted: false });
    expect(results).toHaveLength(1);
  });
});
