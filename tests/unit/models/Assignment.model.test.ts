import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Assignment from '@/models/assignment/Assignment.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Assignment Model', () => {
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
    await Assignment.deleteMany({});
  });

  const validData = () => ({
    courseId: new mongoose.Types.ObjectId(),
    title: 'Week 1 Written Assignment',
    instructions: 'Write a 500-word essay on the topic covered in Module 1.',
    submissionType: 'text' as const,
    maxScore: 100,
    createdBy: new mongoose.Types.ObjectId()
  });

  // ── Required fields ──────────────────────────────────────────────────

  it('should fail without courseId', async () => {
    const data = validData();
    delete (data as any).courseId;
    await expect(Assignment.create(data)).rejects.toThrow(/courseId/i);
  });

  it('should fail without title', async () => {
    const data = validData();
    delete (data as any).title;
    await expect(Assignment.create(data)).rejects.toThrow(/title/i);
  });

  it('should fail without instructions', async () => {
    const data = validData();
    delete (data as any).instructions;
    await expect(Assignment.create(data)).rejects.toThrow(/instructions/i);
  });

  it('should fail without submissionType', async () => {
    const data = validData();
    delete (data as any).submissionType;
    await expect(Assignment.create(data)).rejects.toThrow(/submissionType/i);
  });

  it('should fail without maxScore', async () => {
    const data = validData();
    delete (data as any).maxScore;
    await expect(Assignment.create(data)).rejects.toThrow(/maxScore/i);
  });

  it('should fail without createdBy', async () => {
    const data = validData();
    delete (data as any).createdBy;
    await expect(Assignment.create(data)).rejects.toThrow(/createdBy/i);
  });

  // ── Enum: submissionType ─────────────────────────────────────────────

  it('should accept submissionType "text"', async () => {
    const doc = await Assignment.create({ ...validData(), submissionType: 'text' });
    expect(doc.submissionType).toBe('text');
  });

  it('should accept submissionType "file"', async () => {
    const doc = await Assignment.create({ ...validData(), submissionType: 'file' });
    expect(doc.submissionType).toBe('file');
  });

  it('should accept submissionType "text_and_file"', async () => {
    const doc = await Assignment.create({ ...validData(), submissionType: 'text_and_file' });
    expect(doc.submissionType).toBe('text_and_file');
  });

  it('should reject invalid submissionType', async () => {
    const data = { ...validData(), submissionType: 'video' };
    await expect(Assignment.create(data)).rejects.toThrow(/submission type/i);
  });

  // ── Defaults ─────────────────────────────────────────────────────────

  it('should default allowedFileTypes to [pdf, docx, jpg, png]', async () => {
    const doc = await Assignment.create(validData());
    expect(doc.allowedFileTypes).toEqual(['pdf', 'docx', 'jpg', 'png']);
  });

  it('should default maxFileSize to 10485760, maxFiles to 5, maxResubmissions to 0', async () => {
    const doc = await Assignment.create(validData());
    expect(doc.maxFileSize).toBe(10485760);
    expect(doc.maxFiles).toBe(5);
    expect(doc.maxResubmissions).toBe(0);
  });

  it('should default isPublished to false and isDeleted to false', async () => {
    const doc = await Assignment.create(validData());
    expect(doc.isPublished).toBe(false);
    expect(doc.isDeleted).toBe(false);
  });

  // ── Constraints ──────────────────────────────────────────────────────

  it('should reject title exceeding 200 characters', async () => {
    const doc = new Assignment({ ...validData(), title: 'a'.repeat(201) });
    await expect(doc.validate()).rejects.toThrow(/200/);
  });

  it('should reject instructions exceeding 10000 characters', async () => {
    const doc = new Assignment({ ...validData(), instructions: 'b'.repeat(10001) });
    await expect(doc.validate()).rejects.toThrow(/10000/);
  });

  it('should reject negative maxScore', async () => {
    const doc = new Assignment({ ...validData(), maxScore: -1 });
    await expect(doc.validate()).rejects.toThrow(/maxScore/i);
  });

  it('should reject negative maxFileSize', async () => {
    const doc = new Assignment({ ...validData(), maxFileSize: -1 });
    await expect(doc.validate()).rejects.toThrow(/maxFileSize/i);
  });

  it('should reject maxFiles below 1 and above 20', async () => {
    const below = new Assignment({ ...validData(), maxFiles: 0 });
    await expect(below.validate()).rejects.toThrow(/maxFiles/i);

    const above = new Assignment({ ...validData(), maxFiles: 21 });
    await expect(above.validate()).rejects.toThrow(/maxFiles/i);
  });

  // ── Optional fields ──────────────────────────────────────────────────

  it('should accept optional moduleId', async () => {
    const moduleId = new mongoose.Types.ObjectId();
    const doc = await Assignment.create({ ...validData(), moduleId });
    expect(doc.moduleId!.toString()).toBe(moduleId.toString());
  });

  // ── Timestamps ───────────────────────────────────────────────────────

  it('should auto-generate createdAt and updatedAt', async () => {
    const doc = await Assignment.create(validData());
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  // ── Indexes ──────────────────────────────────────────────────────────

  it('should find assignments by courseId and isDeleted', async () => {
    const courseId = new mongoose.Types.ObjectId();
    await Assignment.create({ ...validData(), courseId, title: 'Assignment A' });
    await Assignment.create({ ...validData(), courseId, title: 'Assignment B', isDeleted: true });
    await Assignment.create({ ...validData(), title: 'Other course assignment' });

    const active = await Assignment.find({ courseId, isDeleted: false });
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Assignment A');

    const all = await Assignment.find({ courseId });
    expect(all).toHaveLength(2);
  });
});
