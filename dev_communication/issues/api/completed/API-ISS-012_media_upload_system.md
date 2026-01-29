# API-ISS-012: Media Upload System (S3 + Local)

## Status: IN PROGRESS
## Priority: High
## Created: 2026-01-28
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: API-ISS-009, API-ISS-010, API-ISS-011
## Blocked-By: None

---

## Overview

Implement a media upload system supporting presigned URL uploads to S3 (production) with local storage fallback (development). This enables rich media content in flashcards, matching exercises, and questions.

**Architecture** (per ADR-CONTENT-001):
1. Client requests presigned upload URL
2. Client uploads directly to S3/local storage
3. Client confirms upload
4. Server processes and returns MediaAttachment

---

## Requirements

1. Presigned URL generation for S3 uploads
2. Local storage fallback for development
3. Media confirmation and processing
4. Support for images, video, audio
5. File size and type validation
6. CDN URL generation for delivery
7. Media deletion with reference checking

---

## Technical Specification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v2/media/upload-url` | Request presigned upload URL |
| POST | `/api/v2/media/confirm` | Confirm upload and process |
| GET | `/api/v2/media/:mediaId` | Get media details |
| DELETE | `/api/v2/media/:mediaId` | Delete media |
| GET | `/api/v2/media` | List media with filters |
| PUT | `/api/v2/media/local-upload/:uploadId` | Local upload endpoint (dev only) |

### MediaAttachment Model

```typescript
interface IMediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio';

  // Storage
  storageProvider: 'local' | 'aws_s3';
  storageKey: string;            // Path in storage
  cdnUrl: string;                // Public URL for delivery

  // Metadata
  filename: string;
  mimeType: string;
  fileSize: number;              // Bytes

  // Dimensions (image/video)
  width?: number;
  height?: number;

  // Duration (video/audio)
  duration?: number;             // Seconds

  // Accessibility
  altText?: string;
  transcript?: string;

  // References
  purpose: 'flashcard' | 'question' | 'content' | 'thumbnail';
  entityType?: string;
  entityId?: string;

  // Upload info
  uploadedBy: ObjectId;
  uploadedAt: Date;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### MediaUploadRequest Model (Temporary)

```typescript
interface IMediaUploadRequest {
  uploadId: string;              // UUID
  storageKey: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  purpose: string;
  entityType?: string;
  entityId?: string;

  requestedBy: ObjectId;
  requestedAt: Date;
  expiresAt: Date;               // TTL: 15 minutes

  status: 'pending' | 'completed' | 'expired';
}
```

### Configuration

```typescript
// Environment variables
STORAGE_PROVIDER=local|aws_s3
AWS_S3_BUCKET=cadencelms-content-dev
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
CDN_URL=https://cdn.cadencelms.com  // or null for direct S3

LOCAL_STORAGE_PATH=./uploads
LOCAL_STORAGE_URL=http://localhost:3000/uploads
```

### File Constraints

| Type | Max Size | Allowed MIME Types |
|------|----------|-------------------|
| Image | 10 MB | jpeg, png, gif, webp, svg+xml |
| Video | 100 MB | mp4, webm |
| Audio | 20 MB | mpeg, wav, ogg, mp4 |

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/models/content/MediaAttachment.model.ts` | Create | Media record schema |
| `src/models/content/MediaUploadRequest.model.ts` | Create | Temp upload tracking |
| `src/services/content/media.service.ts` | Create | Media business logic |
| `src/services/storage/storage.interface.ts` | Create | Storage provider interface |
| `src/services/storage/s3-storage.service.ts` | Create | S3 implementation |
| `src/services/storage/local-storage.service.ts` | Create | Local implementation |
| `src/controllers/content/media.controller.ts` | Create | Route handlers |
| `src/routes/media.routes.ts` | Create | Route definitions |
| `src/config/storage.config.ts` | Create | Storage configuration |
| `contracts/api/media.contract.ts` | Exists | Already created |
| `contracts/types/media-types.ts` | Exists | Already created |
| `tests/integration/media.test.ts` | Create | Integration tests |

### Storage Provider Interface

```typescript
interface IStorageProvider {
  generatePresignedUploadUrl(key: string, contentType: string, expiresIn: number): Promise<PresignedUrlResult>;
  getPublicUrl(key: string): string;
  deleteObject(key: string): Promise<void>;
  objectExists(key: string): Promise<boolean>;
  getObjectMetadata(key: string): Promise<ObjectMetadata>;
}
```

### Approach

1. **Phase 1: Storage Abstraction**
   - Create storage provider interface
   - Implement S3 provider
   - Implement local provider
   - Configuration-based selection

2. **Phase 2: Models**
   - Create MediaAttachment model
   - Create MediaUploadRequest model (with TTL)
   - Add indexes

3. **Phase 3: Service Layer**
   - Implement presigned URL generation
   - Implement upload confirmation
   - Implement metadata extraction (dimensions, duration)
   - Implement deletion with reference check

4. **Phase 4: API Endpoints**
   - Create routes and controllers
   - Add validation (file type, size)
   - Add authorization

5. **Phase 5: Local Development**
   - Static file serving middleware
   - Auto-cleanup of expired uploads

---

## Tests Required

1. [ ] Request upload URL for valid image
2. [ ] Request upload URL rejected for invalid MIME type
3. [ ] Request upload URL rejected for oversized file
4. [ ] Confirm upload creates MediaAttachment
5. [ ] Confirm upload extracts image dimensions
6. [ ] Confirm upload rejects expired uploadId
7. [ ] Delete media succeeds for own uploads
8. [ ] Delete media rejected for media in use
9. [ ] List media filters by entity
10. [ ] Local storage: upload works
11. [ ] Local storage: files served correctly
12. [ ] S3: presigned URL format correct (mock)

---

## Acceptance Criteria

- [ ] Storage provider abstraction implemented
- [ ] S3 provider implemented
- [ ] Local provider implemented
- [ ] Presigned URL generation works
- [ ] Upload confirmation processes media
- [ ] Image dimensions extracted
- [ ] CDN URLs generated correctly
- [ ] File type/size validation works
- [ ] Deletion checks references
- [ ] Local development workflow works
- [ ] All tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Do we need video transcoding?**
   Not for MVP - accept only web-ready formats (mp4, webm)

2. **Thumbnail generation for videos?**
   Not for MVP - can add later

3. **Should we support signed URLs for private content?**
   Not for MVP - all media public by default

---

## Implementation Notes

*Add notes during implementation*

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|
| | |

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
