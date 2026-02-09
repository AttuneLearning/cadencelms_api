import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import DiscussionThread from '@/models/discussion/DiscussionThread.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('DiscussionThread Model', () => {
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
    await DiscussionThread.deleteMany({});
  });

  const validData = () => ({
    courseId: new mongoose.Types.ObjectId(),
    authorId: new mongoose.Types.ObjectId(),
    authorType: 'learner' as const,
    title: 'How do I complete Module 3?',
    body: 'I am stuck on the final exercise and need some guidance on the expected output format.'
  });

  // ── Required fields ──────────────────────────────────────────────────

  it('should fail without courseId', async () => {
    const data = validData();
    delete (data as any).courseId;
    await expect(DiscussionThread.create(data)).rejects.toThrow(/courseId/i);
  });

  it('should fail without authorId', async () => {
    const data = validData();
    delete (data as any).authorId;
    await expect(DiscussionThread.create(data)).rejects.toThrow(/authorId/i);
  });

  it('should fail without authorType', async () => {
    const data = validData();
    delete (data as any).authorType;
    await expect(DiscussionThread.create(data)).rejects.toThrow(/authorType/i);
  });

  it('should fail without title', async () => {
    const data = validData();
    delete (data as any).title;
    await expect(DiscussionThread.create(data)).rejects.toThrow(/title/i);
  });

  it('should fail without body', async () => {
    const data = validData();
    delete (data as any).body;
    await expect(DiscussionThread.create(data)).rejects.toThrow(/body/i);
  });

  // ── Enum: authorType ─────────────────────────────────────────────────

  it('should accept authorType "learner"', async () => {
    const doc = await DiscussionThread.create({ ...validData(), authorType: 'learner' });
    expect(doc.authorType).toBe('learner');
  });

  it('should accept authorType "staff"', async () => {
    const doc = await DiscussionThread.create({ ...validData(), authorType: 'staff' });
    expect(doc.authorType).toBe('staff');
  });

  it('should reject invalid authorType', async () => {
    const data = { ...validData(), authorType: 'invalid' };
    await expect(DiscussionThread.create(data)).rejects.toThrow(/author type/i);
  });

  // ── Defaults ─────────────────────────────────────────────────────────

  it('should default isPinned to false', async () => {
    const doc = await DiscussionThread.create(validData());
    expect(doc.isPinned).toBe(false);
  });

  it('should default isLocked to false', async () => {
    const doc = await DiscussionThread.create(validData());
    expect(doc.isLocked).toBe(false);
  });

  it('should default replyCount to 0', async () => {
    const doc = await DiscussionThread.create(validData());
    expect(doc.replyCount).toBe(0);
  });

  it('should default isDeleted to false, deletedAt to null, deletedBy to null', async () => {
    const doc = await DiscussionThread.create(validData());
    expect(doc.isDeleted).toBe(false);
    expect(doc.deletedAt).toBeNull();
    expect(doc.deletedBy).toBeNull();
  });

  it('should default lastReplyAt to null and lastReplyBy to null', async () => {
    const doc = await DiscussionThread.create(validData());
    expect(doc.lastReplyAt).toBeNull();
    expect(doc.lastReplyBy).toBeNull();
  });

  // ── Constraints ──────────────────────────────────────────────────────

  it('should reject title exceeding 300 characters', async () => {
    const doc = new DiscussionThread({ ...validData(), title: 'a'.repeat(301) });
    await expect(doc.validate()).rejects.toThrow(/300/);
  });

  it('should reject body exceeding 10000 characters', async () => {
    const doc = new DiscussionThread({ ...validData(), body: 'b'.repeat(10001) });
    await expect(doc.validate()).rejects.toThrow(/10000/);
  });

  it('should reject negative replyCount', async () => {
    const doc = new DiscussionThread({ ...validData(), replyCount: -1 });
    await expect(doc.validate()).rejects.toThrow(/Reply count/i);
  });

  // ── Optional fields ──────────────────────────────────────────────────

  it('should accept optional moduleId and lessonId', async () => {
    const moduleId = new mongoose.Types.ObjectId();
    const lessonId = new mongoose.Types.ObjectId();
    const doc = await DiscussionThread.create({ ...validData(), moduleId, lessonId });
    expect(doc.moduleId!.toString()).toBe(moduleId.toString());
    expect(doc.lessonId!.toString()).toBe(lessonId.toString());
  });

  // ── Timestamps ───────────────────────────────────────────────────────

  it('should auto-generate createdAt and updatedAt', async () => {
    const doc = await DiscussionThread.create(validData());
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  // ── Indexes ──────────────────────────────────────────────────────────

  it('should find threads by courseId', async () => {
    const courseId = new mongoose.Types.ObjectId();
    await DiscussionThread.create({ ...validData(), courseId, title: 'Thread A' });
    await DiscussionThread.create({ ...validData(), courseId, title: 'Thread B' });
    await DiscussionThread.create({ ...validData(), title: 'Other course thread' });

    const results = await DiscussionThread.find({ courseId });
    expect(results).toHaveLength(2);
    const titles = results.map(r => r.title).sort();
    expect(titles).toEqual(['Thread A', 'Thread B']);
  });
});
