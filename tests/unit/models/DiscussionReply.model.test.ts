import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import DiscussionReply from '@/models/discussion/DiscussionReply.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('DiscussionReply Model', () => {
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
    await DiscussionReply.deleteMany({});
  });

  const validData = () => ({
    threadId: new mongoose.Types.ObjectId(),
    authorId: new mongoose.Types.ObjectId(),
    authorType: 'learner' as const,
    body: 'This is a reply to the discussion thread.'
  });

  // --- Required fields ---

  it('should fail without threadId', async () => {
    const data = validData();
    delete (data as any).threadId;
    await expect(DiscussionReply.create(data)).rejects.toThrow(/threadId/i);
  });

  it('should fail without authorId', async () => {
    const data = validData();
    delete (data as any).authorId;
    await expect(DiscussionReply.create(data)).rejects.toThrow(/authorId/i);
  });

  it('should fail without authorType', async () => {
    const data = validData();
    delete (data as any).authorType;
    await expect(DiscussionReply.create(data)).rejects.toThrow(/authorType/i);
  });

  it('should fail without body', async () => {
    const data = validData();
    delete (data as any).body;
    await expect(DiscussionReply.create(data)).rejects.toThrow(/body/i);
  });

  // --- Enum ---

  it('should accept authorType "learner"', async () => {
    const doc = await DiscussionReply.create({ ...validData(), authorType: 'learner' });
    expect(doc.authorType).toBe('learner');
  });

  it('should accept authorType "staff"', async () => {
    const doc = await DiscussionReply.create({ ...validData(), authorType: 'staff' });
    expect(doc.authorType).toBe('staff');
  });

  it('should reject invalid authorType', async () => {
    await expect(
      DiscussionReply.create({ ...validData(), authorType: 'invalid' })
    ).rejects.toThrow(/author type/i);
  });

  // --- Defaults ---

  it('should set correct defaults', async () => {
    const doc = await DiscussionReply.create(validData());
    expect(doc.parentReplyId).toBeNull();
    expect(doc.isInstructorAnswer).toBe(false);
    expect(doc.isDeleted).toBe(false);
    expect(doc.deletedAt).toBeNull();
    expect(doc.deletedBy).toBeNull();
  });

  // --- Constraints ---

  it('should reject body exceeding 10000 characters', async () => {
    const doc = new DiscussionReply({ ...validData(), body: 'a'.repeat(10001) });
    await expect(doc.validate()).rejects.toThrow(/10000/);
  });

  // --- Timestamps ---

  it('should auto-generate createdAt and updatedAt', async () => {
    const doc = await DiscussionReply.create(validData());
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  // --- Index: threadId lookup ---

  it('should find replies by threadId', async () => {
    const threadId = new mongoose.Types.ObjectId();
    const otherThreadId = new mongoose.Types.ObjectId();

    await DiscussionReply.create([
      { ...validData(), threadId, body: 'Reply 1' },
      { ...validData(), threadId, body: 'Reply 2' },
      { ...validData(), threadId: otherThreadId, body: 'Other thread reply' }
    ]);

    const results = await DiscussionReply.find({ threadId }).lean();
    expect(results).toHaveLength(2);
    expect(results.every(r => r.threadId.equals(threadId))).toBe(true);
  });
});
