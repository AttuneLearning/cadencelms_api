import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MediaUploadRequest from '@/models/content/MediaUploadRequest.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('MediaUploadRequest Model', () => {
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
    await MediaUploadRequest.deleteMany({});
  });

  const createRequest = (overrides: any = {}) => {
    return MediaUploadRequest.create({
      uploadId: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      storageKey: 'uploads/test/image.png',
      storageProvider: 'local',
      filename: 'image.png',
      mimeType: 'image/png',
      fileSize: 1024,
      mediaType: 'image',
      purpose: 'general',
      requestedBy: new mongoose.Types.ObjectId(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      ...overrides
    });
  };

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid media upload request with required fields', async () => {
      const userId = new mongoose.Types.ObjectId();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const request = await createRequest({
        uploadId: 'test-upload-001',
        storageKey: 'uploads/test/photo.jpg',
        storageProvider: 'aws_s3',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2048,
        mediaType: 'image',
        purpose: 'thumbnail',
        requestedBy: userId,
        expiresAt
      });

      expect(request.uploadId).toBe('test-upload-001');
      expect(request.storageKey).toBe('uploads/test/photo.jpg');
      expect(request.storageProvider).toBe('aws_s3');
      expect(request.filename).toBe('photo.jpg');
      expect(request.mimeType).toBe('image/jpeg');
      expect(request.fileSize).toBe(2048);
      expect(request.mediaType).toBe('image');
      expect(request.purpose).toBe('thumbnail');
      expect(request.requestedBy).toEqual(userId);
    });

    it('should require uploadId', async () => {
      const doc = new MediaUploadRequest({
        storageKey: 'uploads/test/image.png',
        storageProvider: 'local',
        filename: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        mediaType: 'image',
        purpose: 'general',
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.save()).rejects.toThrow(/Upload ID is required/);
    });

    it('should require storageKey', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-upload-002',
        storageProvider: 'local',
        filename: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        mediaType: 'image',
        purpose: 'general',
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.save()).rejects.toThrow(/Storage key is required/);
    });

    it('should require storageProvider', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-upload-003',
        storageKey: 'uploads/test/image.png',
        filename: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        mediaType: 'image',
        purpose: 'general',
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.save()).rejects.toThrow(/Storage provider is required/);
    });

    it('should require filename', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-upload-004',
        storageKey: 'uploads/test/image.png',
        storageProvider: 'local',
        mimeType: 'image/png',
        fileSize: 1024,
        mediaType: 'image',
        purpose: 'general',
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.save()).rejects.toThrow(/Filename is required/);
    });

    it('should require mimeType', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-upload-005',
        storageKey: 'uploads/test/image.png',
        storageProvider: 'local',
        filename: 'image.png',
        fileSize: 1024,
        mediaType: 'image',
        purpose: 'general',
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.save()).rejects.toThrow(/MIME type is required/);
    });

    it('should require fileSize', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-upload-006',
        storageKey: 'uploads/test/image.png',
        storageProvider: 'local',
        filename: 'image.png',
        mimeType: 'image/png',
        mediaType: 'image',
        purpose: 'general',
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.save()).rejects.toThrow(/File size is required/);
    });

    it('should require mediaType', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-upload-007',
        storageKey: 'uploads/test/image.png',
        storageProvider: 'local',
        filename: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        purpose: 'general',
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.save()).rejects.toThrow(/Media type is required/);
    });

    it('should require purpose', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-upload-008',
        storageKey: 'uploads/test/image.png',
        storageProvider: 'local',
        filename: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        mediaType: 'image',
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.save()).rejects.toThrow(/Purpose is required/);
    });

    it('should require requestedBy', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-upload-009',
        storageKey: 'uploads/test/image.png',
        storageProvider: 'local',
        filename: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        mediaType: 'image',
        purpose: 'general',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.save()).rejects.toThrow(/Requested by is required/);
    });

    it('should require expiresAt', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-upload-010',
        storageKey: 'uploads/test/image.png',
        storageProvider: 'local',
        filename: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        mediaType: 'image',
        purpose: 'general',
        requestedBy: new mongoose.Types.ObjectId()
      });

      await expect(doc.save()).rejects.toThrow(/Expiration time is required/);
    });

    it('should enforce uploadId uniqueness', async () => {
      await createRequest({ uploadId: 'duplicate-id' });

      await expect(
        createRequest({ uploadId: 'duplicate-id' })
      ).rejects.toThrow(/duplicate key/i);
    });
  });

  describe('Enum Validation', () => {
    it('should accept valid storageProvider values', async () => {
      const localReq = await createRequest({ uploadId: 'sp-local', storageProvider: 'local' });
      expect(localReq.storageProvider).toBe('local');

      const s3Req = await createRequest({ uploadId: 'sp-s3', storageProvider: 'aws_s3' });
      expect(s3Req.storageProvider).toBe('aws_s3');
    });

    it('should reject invalid storageProvider', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-sp-invalid',
        storageKey: 'uploads/test/image.png',
        storageProvider: 'azure_blob' as any,
        filename: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        mediaType: 'image',
        purpose: 'general',
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.validate()).rejects.toThrow(/is not a valid storage provider/);
    });

    it('should accept valid mediaType values', async () => {
      for (const mediaType of ['image', 'video', 'audio']) {
        const req = await createRequest({ uploadId: `mt-${mediaType}`, mediaType });
        expect(req.mediaType).toBe(mediaType);
      }
    });

    it('should reject invalid mediaType', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-mt-invalid',
        storageKey: 'uploads/test/file.txt',
        storageProvider: 'local',
        filename: 'file.txt',
        mimeType: 'text/plain',
        fileSize: 1024,
        mediaType: 'document' as any,
        purpose: 'general',
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.validate()).rejects.toThrow(/is not a valid media type/);
    });

    it('should accept all valid purpose values', async () => {
      const purposes = ['flashcard', 'question', 'content', 'thumbnail', 'avatar', 'certificate', 'general'];

      for (const purpose of purposes) {
        const req = await createRequest({ uploadId: `p-${purpose}`, purpose });
        expect(req.purpose).toBe(purpose);
      }
    });

    it('should reject invalid purpose', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-p-invalid',
        storageKey: 'uploads/test/image.png',
        storageProvider: 'local',
        filename: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        mediaType: 'image',
        purpose: 'wallpaper' as any,
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.validate()).rejects.toThrow(/is not a valid purpose/);
    });

    it('should accept all valid status values', async () => {
      const statuses = ['pending', 'completed', 'expired', 'failed'];

      for (const status of statuses) {
        const req = await createRequest({ uploadId: `s-${status}`, status });
        expect(req.status).toBe(status);
      }
    });

    it('should reject invalid status', async () => {
      const doc = new MediaUploadRequest({
        uploadId: 'test-s-invalid',
        storageKey: 'uploads/test/image.png',
        storageProvider: 'local',
        filename: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        mediaType: 'image',
        purpose: 'general',
        status: 'cancelled' as any,
        requestedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await expect(doc.validate()).rejects.toThrow(/is not a valid status/);
    });
  });

  describe('Default Values', () => {
    it('should default status to "pending"', async () => {
      const request = await createRequest();
      expect(request.status).toBe('pending');
    });

    it('should default requestedAt to current date', async () => {
      const before = new Date();
      const request = await createRequest();
      const after = new Date();

      expect(request.requestedAt).toBeDefined();
      expect(request.requestedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(request.requestedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const request = await createRequest();
      expect(request.createdAt).toBeDefined();
      expect(request.createdAt).toBeInstanceOf(Date);
      expect(request.updatedAt).toBeDefined();
      expect(request.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Optional Fields', () => {
    it('should store entityType', async () => {
      const request = await createRequest({ entityType: 'LearningUnit' });
      expect(request.entityType).toBe('LearningUnit');
    });

    it('should store entityId', async () => {
      const entityId = new mongoose.Types.ObjectId();
      const request = await createRequest({ entityId });
      expect(request.entityId).toEqual(entityId);
    });

    it('should store departmentId', async () => {
      const departmentId = new mongoose.Types.ObjectId();
      const request = await createRequest({ departmentId });
      expect(request.departmentId).toEqual(departmentId);
    });

    it('should store mediaAttachmentId', async () => {
      const mediaAttachmentId = new mongoose.Types.ObjectId();
      const request = await createRequest({ mediaAttachmentId });
      expect(request.mediaAttachmentId).toEqual(mediaAttachmentId);
    });

    it('should store errorMessage', async () => {
      const request = await createRequest({ errorMessage: 'Upload timed out' });
      expect(request.errorMessage).toBe('Upload timed out');
    });

    it('should store uploadUrl', async () => {
      const request = await createRequest({ uploadUrl: 'https://s3.example.com/presigned' });
      expect(request.uploadUrl).toBe('https://s3.example.com/presigned');
    });

    it('should store publicUrl', async () => {
      const request = await createRequest({ publicUrl: 'https://cdn.example.com/image.png' });
      expect(request.publicUrl).toBe('https://cdn.example.com/image.png');
    });
  });

  describe('Static Methods', () => {
    describe('findPendingByUploadId', () => {
      it('should find a pending upload request by uploadId', async () => {
        await createRequest({ uploadId: 'find-pending-1', status: 'pending' });

        const found = await MediaUploadRequest.findPendingByUploadId('find-pending-1');
        expect(found).not.toBeNull();
        expect(found!.uploadId).toBe('find-pending-1');
        expect(found!.status).toBe('pending');
      });

      it('should not find a completed upload request', async () => {
        await createRequest({ uploadId: 'find-pending-2', status: 'completed' });

        const found = await MediaUploadRequest.findPendingByUploadId('find-pending-2');
        expect(found).toBeNull();
      });

      it('should not find a failed upload request', async () => {
        await createRequest({ uploadId: 'find-pending-3', status: 'failed' });

        const found = await MediaUploadRequest.findPendingByUploadId('find-pending-3');
        expect(found).toBeNull();
      });

      it('should not find an expired upload request (past expiresAt)', async () => {
        await createRequest({
          uploadId: 'find-pending-4',
          status: 'pending',
          expiresAt: new Date(Date.now() - 1000) // already expired
        });

        const found = await MediaUploadRequest.findPendingByUploadId('find-pending-4');
        expect(found).toBeNull();
      });

      it('should return null for non-existent uploadId', async () => {
        const found = await MediaUploadRequest.findPendingByUploadId('non-existent');
        expect(found).toBeNull();
      });
    });

    describe('markCompleted', () => {
      it('should mark a pending upload as completed', async () => {
        await createRequest({ uploadId: 'mark-complete-1' });
        const mediaAttachmentId = new mongoose.Types.ObjectId();

        const updated = await MediaUploadRequest.markCompleted('mark-complete-1', mediaAttachmentId);
        expect(updated).not.toBeNull();
        expect(updated!.status).toBe('completed');
        expect(updated!.mediaAttachmentId).toEqual(mediaAttachmentId);
      });

      it('should not mark a non-pending upload as completed', async () => {
        await createRequest({ uploadId: 'mark-complete-2', status: 'failed' });
        const mediaAttachmentId = new mongoose.Types.ObjectId();

        const updated = await MediaUploadRequest.markCompleted('mark-complete-2', mediaAttachmentId);
        expect(updated).toBeNull();
      });

      it('should return null for non-existent uploadId', async () => {
        const mediaAttachmentId = new mongoose.Types.ObjectId();
        const updated = await MediaUploadRequest.markCompleted('non-existent', mediaAttachmentId);
        expect(updated).toBeNull();
      });
    });

    describe('markFailed', () => {
      it('should mark a pending upload as failed', async () => {
        await createRequest({ uploadId: 'mark-fail-1' });

        const updated = await MediaUploadRequest.markFailed('mark-fail-1', 'File too large');
        expect(updated).not.toBeNull();
        expect(updated!.status).toBe('failed');
        expect(updated!.errorMessage).toBe('File too large');
      });

      it('should not mark a non-pending upload as failed', async () => {
        await createRequest({ uploadId: 'mark-fail-2', status: 'completed' });

        const updated = await MediaUploadRequest.markFailed('mark-fail-2', 'Some error');
        expect(updated).toBeNull();
      });

      it('should return null for non-existent uploadId', async () => {
        const updated = await MediaUploadRequest.markFailed('non-existent', 'Error');
        expect(updated).toBeNull();
      });
    });

    describe('cleanupExpired', () => {
      it('should mark expired pending requests as expired', async () => {
        // Create expired pending request
        await createRequest({
          uploadId: 'cleanup-1',
          status: 'pending',
          expiresAt: new Date(Date.now() - 60 * 1000) // expired 1 minute ago
        });

        // Create non-expired pending request
        await createRequest({
          uploadId: 'cleanup-2',
          status: 'pending',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        const count = await MediaUploadRequest.cleanupExpired();
        expect(count).toBe(1);

        const expiredDoc = await MediaUploadRequest.findOne({ uploadId: 'cleanup-1' });
        expect(expiredDoc!.status).toBe('expired');

        const pendingDoc = await MediaUploadRequest.findOne({ uploadId: 'cleanup-2' });
        expect(pendingDoc!.status).toBe('pending');
      });

      it('should not affect already completed requests', async () => {
        await createRequest({
          uploadId: 'cleanup-3',
          status: 'completed',
          expiresAt: new Date(Date.now() - 60 * 1000)
        });

        const count = await MediaUploadRequest.cleanupExpired();
        expect(count).toBe(0);

        const doc = await MediaUploadRequest.findOne({ uploadId: 'cleanup-3' });
        expect(doc!.status).toBe('completed');
      });

      it('should return 0 when no expired pending requests exist', async () => {
        await createRequest({
          uploadId: 'cleanup-4',
          status: 'pending',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        const count = await MediaUploadRequest.cleanupExpired();
        expect(count).toBe(0);
      });
    });
  });

  describe('TTL Index', () => {
    it('should have a TTL index on expiresAt with 900 seconds', async () => {
      const indexes = await MediaUploadRequest.collection.indexes();
      const ttlIndex = indexes.find(
        (idx: any) => idx.key && idx.key.expiresAt !== undefined && idx.expireAfterSeconds !== undefined
      );

      expect(ttlIndex).toBeDefined();
      expect(ttlIndex!.expireAfterSeconds).toBe(900);
    });
  });
});
