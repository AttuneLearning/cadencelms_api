import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Message from '@/models/messaging/Message.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Message Model', () => {
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
    await Message.deleteMany({});
  });

  const validData = () => ({
    type: 'direct' as const,
    subject: 'Test Message Subject',
    body: 'This is the body of the test message.',
    senderId: new mongoose.Types.ObjectId(),
    recipientId: new mongoose.Types.ObjectId()
  });

  // ── Required fields ──────────────────────────────────────────────────

  it('should create a valid message with all required fields', async () => {
    const doc = await Message.create(validData());
    expect(doc._id).toBeDefined();
    expect(doc.subject).toBe('Test Message Subject');
    expect(doc.body).toBe('This is the body of the test message.');
  });

  it('should fail without subject', async () => {
    const data = validData();
    delete (data as any).subject;
    await expect(Message.create(data)).rejects.toThrow(/subject/i);
  });

  it('should fail without body', async () => {
    const data = validData();
    delete (data as any).body;
    await expect(Message.create(data)).rejects.toThrow(/body/i);
  });

  it('should fail without senderId', async () => {
    const data = validData();
    delete (data as any).senderId;
    await expect(Message.create(data)).rejects.toThrow(/senderId/i);
  });

  it('should fail without recipientId', async () => {
    const data = validData();
    delete (data as any).recipientId;
    await expect(Message.create(data)).rejects.toThrow(/recipientId/i);
  });

  // ── Enum: type ─────────────────────────────────────────────────────

  it('should accept type "direct"', async () => {
    const doc = await Message.create({ ...validData(), type: 'direct' });
    expect(doc.type).toBe('direct');
  });

  it('should accept type "announcement"', async () => {
    const doc = await Message.create({ ...validData(), type: 'announcement' });
    expect(doc.type).toBe('announcement');
  });

  it('should accept type "reminder"', async () => {
    const doc = await Message.create({ ...validData(), type: 'reminder' });
    expect(doc.type).toBe('reminder');
  });

  it('should accept type "system"', async () => {
    const doc = await Message.create({ ...validData(), type: 'system' });
    expect(doc.type).toBe('system');
  });

  it('should reject invalid type', async () => {
    const data = { ...validData(), type: 'invalid' };
    await expect(Message.create(data)).rejects.toThrow();
  });

  // ── Enum: status ──────────────────────────────────────────────────

  it('should accept status "unread"', async () => {
    const doc = await Message.create({ ...validData(), status: 'unread' });
    expect(doc.status).toBe('unread');
  });

  it('should accept status "read"', async () => {
    const doc = await Message.create({ ...validData(), status: 'read' });
    expect(doc.status).toBe('read');
  });

  it('should accept status "archived"', async () => {
    const doc = await Message.create({ ...validData(), status: 'archived' });
    expect(doc.status).toBe('archived');
  });

  it('should reject invalid status', async () => {
    const data = { ...validData(), status: 'deleted' };
    await expect(Message.create(data)).rejects.toThrow();
  });

  // ── Defaults ─────────────────────────────────────────────────────────

  it('should default type to "direct"', async () => {
    const data = validData();
    delete (data as any).type;
    const doc = await Message.create(data);
    expect(doc.type).toBe('direct');
  });

  it('should default status to "unread"', async () => {
    const doc = await Message.create(validData());
    expect(doc.status).toBe('unread');
  });

  it('should default isImportant to false', async () => {
    const doc = await Message.create(validData());
    expect(doc.isImportant).toBe(false);
  });

  it('should default isDeleted to false', async () => {
    const doc = await Message.create(validData());
    expect(doc.isDeleted).toBe(false);
  });

  it('should default readAt to undefined', async () => {
    const doc = await Message.create(validData());
    expect(doc.readAt).toBeUndefined();
  });

  // ── Constraints ──────────────────────────────────────────────────────

  it('should reject subject exceeding 200 characters', async () => {
    const doc = new Message({ ...validData(), subject: 'a'.repeat(201) });
    await expect(doc.validate()).rejects.toThrow(/200/);
  });

  it('should accept subject at exactly 200 characters', async () => {
    const doc = await Message.create({ ...validData(), subject: 'a'.repeat(200) });
    expect(doc.subject).toHaveLength(200);
  });

  it('should reject body exceeding 10000 characters', async () => {
    const doc = new Message({ ...validData(), body: 'b'.repeat(10001) });
    await expect(doc.validate()).rejects.toThrow(/10000/);
  });

  it('should accept body at exactly 10000 characters', async () => {
    const doc = await Message.create({ ...validData(), body: 'b'.repeat(10000) });
    expect(doc.body).toHaveLength(10000);
  });

  it('should trim subject whitespace', async () => {
    const doc = await Message.create({ ...validData(), subject: '  Trimmed Subject  ' });
    expect(doc.subject).toBe('Trimmed Subject');
  });

  // ── Optional: relatedEntity ──────────────────────────────────────────

  it('should accept a valid relatedEntity', async () => {
    const entityId = new mongoose.Types.ObjectId();
    const doc = await Message.create({
      ...validData(),
      relatedEntity: {
        entityType: 'course',
        entityId,
        entityName: 'Intro to Testing'
      }
    });
    expect(doc.relatedEntity).toBeDefined();
    expect(doc.relatedEntity!.entityType).toBe('course');
    expect(doc.relatedEntity!.entityId.toString()).toBe(entityId.toString());
    expect(doc.relatedEntity!.entityName).toBe('Intro to Testing');
  });

  it('should accept relatedEntity without optional entityName', async () => {
    const entityId = new mongoose.Types.ObjectId();
    const doc = await Message.create({
      ...validData(),
      relatedEntity: {
        entityType: 'enrollment',
        entityId
      }
    });
    expect(doc.relatedEntity!.entityType).toBe('enrollment');
    expect(doc.relatedEntity!.entityName).toBeUndefined();
  });

  it('should create without relatedEntity', async () => {
    const doc = await Message.create(validData());
    expect(doc.relatedEntity).toBeUndefined();
  });

  // ── Optional: isImportant ─────────────────────────────────────────────

  it('should accept isImportant set to true', async () => {
    const doc = await Message.create({ ...validData(), isImportant: true });
    expect(doc.isImportant).toBe(true);
  });

  // ── Timestamps ───────────────────────────────────────────────────────

  it('should auto-generate createdAt and updatedAt', async () => {
    const doc = await Message.create(validData());
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  // ── Indexes ──────────────────────────────────────────────────────────

  it('should find messages by recipientId', async () => {
    const recipientId = new mongoose.Types.ObjectId();
    await Message.create({ ...validData(), recipientId, subject: 'Msg A' });
    await Message.create({ ...validData(), recipientId, subject: 'Msg B' });
    await Message.create({ ...validData(), subject: 'Other recipient' });

    const results = await Message.find({ recipientId });
    expect(results).toHaveLength(2);
    const subjects = results.map(r => r.subject).sort();
    expect(subjects).toEqual(['Msg A', 'Msg B']);
  });

  it('should find messages by recipientId and status', async () => {
    const recipientId = new mongoose.Types.ObjectId();
    await Message.create({ ...validData(), recipientId, status: 'unread', subject: 'Unread' });
    await Message.create({ ...validData(), recipientId, status: 'read', subject: 'Read' });

    const results = await Message.find({ recipientId, status: 'unread' });
    expect(results).toHaveLength(1);
    expect(results[0].subject).toBe('Unread');
  });

  it('should find messages by recipientId and type', async () => {
    const recipientId = new mongoose.Types.ObjectId();
    await Message.create({ ...validData(), recipientId, type: 'direct' });
    await Message.create({ ...validData(), recipientId, type: 'announcement' });
    await Message.create({ ...validData(), recipientId, type: 'system' });

    const results = await Message.find({ recipientId, type: 'announcement' });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('announcement');
  });
});
