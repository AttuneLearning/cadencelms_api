# ADR-CONTENT-001: Content Delivery Architecture

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Content

## Context

CadenceLMS delivers diverse learning content including:
- SCORM packages (interactive courseware)
- Video content (lectures, demos)
- Documents (PDFs, slides, Word docs)
- Images (diagrams, infographics)
- Audio files (podcasts, narration)

A robust content delivery architecture is essential to:
- Handle large file uploads reliably
- Serve content efficiently at scale
- Support offline learning scenarios
- Maintain content integrity and versioning
- Control access to protected content

## Decision

### 1. Content Types & Storage

#### Content Type Matrix

| Type | Storage | Max Size | MIME Types | CDN | Offline |
|------|---------|----------|------------|-----|---------|
| SCORM | S3 (extracted) | 100 MB | application/zip | Yes | Yes |
| Video | S3 | 500 MB | video/mp4, video/webm | Yes (HLS) | Optional |
| Document | S3 | 50 MB | application/pdf, docx, pptx | Yes | Yes |
| Image | S3 | 10 MB | image/jpeg, png, gif, webp | Yes | Yes |
| Audio | S3 | 100 MB | audio/mpeg, wav, ogg | Yes | Yes |

#### Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT STORAGE ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Uploads    │     │   Primary    │     │     CDN      │    │
│  │   (Temp)     │────▶│   Storage    │────▶│   (Cache)    │    │
│  │              │     │    (S3)      │     │              │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                              │                     │            │
│                              ▼                     ▼            │
│                       ┌──────────────┐     ┌──────────────┐    │
│                       │   Archive    │     │   Learner    │    │
│                       │   (Glacier)  │     │   Browser    │    │
│                       └──────────────┘     └──────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. File Storage (S3)

#### Bucket Structure

```
cadencelms-content-{env}/
├── scorm/
│   ├── {contentId}/
│   │   ├── v1/
│   │   │   ├── imsmanifest.xml
│   │   │   ├── index.html
│   │   │   └── assets/
│   │   └── v2/
│   └── uploads/           # Temporary upload staging
│
├── media/
│   ├── videos/
│   │   ├── {contentId}/
│   │   │   ├── original.mp4
│   │   │   ├── hls/
│   │   │   │   ├── master.m3u8
│   │   │   │   ├── 1080p/
│   │   │   │   ├── 720p/
│   │   │   │   └── 480p/
│   │   │   └── thumbnail.jpg
│   │   └── ...
│   │
│   ├── documents/
│   │   └── {contentId}.pdf
│   │
│   ├── images/
│   │   └── {contentId}/
│   │       ├── original.jpg
│   │       └── thumbs/
│   │           ├── 200x200.jpg
│   │           └── 400x400.jpg
│   │
│   └── audio/
│       └── {contentId}.mp3
│
├── certificates/
│   └── {certificateId}.pdf
│
└── exports/
    └── reports/
        └── {reportJobId}.xlsx
```

#### S3 Configuration

```typescript
// S3 bucket policies
const bucketConfig = {
  // Content bucket - private, accessed via signed URLs or CDN
  contentBucket: {
    name: `cadencelms-content-${env}`,
    region: 'us-east-1',
    encryption: 'AES256',
    versioning: true,
    lifecycleRules: [
      {
        id: 'archive-old-versions',
        prefix: 'scorm/',
        noncurrentVersionTransition: {
          days: 30,
          storageClass: 'GLACIER'
        }
      },
      {
        id: 'cleanup-temp-uploads',
        prefix: 'uploads/',
        expiration: { days: 1 }
      }
    ]
  },

  // Public assets bucket - thumbnails, previews
  assetsBucket: {
    name: `cadencelms-assets-${env}`,
    publicAccess: true,
    cacheControl: 'public, max-age=31536000'
  }
};
```

### 3. Upload Flow

#### Direct Upload (Presigned URLs)

```
┌────────┐  1. Request upload URL   ┌────────┐
│ Client │─────────────────────────▶│  API   │
│        │◀─────────────────────────│        │
└────────┘  2. Presigned URL        └────────┘
     │                                   │
     │ 3. Upload directly to S3          │
     ▼                                   │
┌────────┐                               │
│   S3   │◀──────────────────────────────┘
│        │  4. Verify & process
└────────┘
```

#### Upload Process

```typescript
// 1. Client requests upload URL
POST /api/v2/content/upload-url
{
  "filename": "course-video.mp4",
  "contentType": "video/mp4",
  "size": 52428800,
  "type": "video"
}

// 2. API returns presigned URL
{
  "uploadId": "upload_abc123",
  "url": "https://s3.amazonaws.com/cadencelms-content/...",
  "fields": {
    "key": "uploads/video/upload_abc123.mp4",
    "policy": "...",
    "x-amz-signature": "..."
  },
  "expiresAt": "2026-01-27T16:30:00Z"
}

// 3. Client uploads directly to S3 (multipart for large files)
PUT {presignedUrl}
Content-Type: video/mp4

// 4. Client notifies API of completion
POST /api/v2/content/upload-complete
{
  "uploadId": "upload_abc123"
}

// 5. API processes: validate, move to permanent location, create record
```

#### Multipart Upload (Large Files)

```typescript
// For files > 100MB, use multipart upload
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
const PART_SIZE = 10 * 1024 * 1024; // 10MB parts

interface MultipartUpload {
  uploadId: string;
  contentId: string;
  parts: {
    partNumber: number;
    url: string;
    etag?: string;
  }[];
  expiresAt: Date;
}

// Flow:
// 1. Initiate multipart upload → get uploadId + part URLs
// 2. Client uploads each part in parallel
// 3. Client sends part ETags to API
// 4. API completes multipart upload
```

### 4. Content Delivery (CDN)

#### CDN Configuration

**Provider:** CloudFront (or Cloudflare)

```typescript
const cdnConfig = {
  // Primary distribution for content
  contentDistribution: {
    origins: [
      {
        id: 's3-content',
        domain: 'cadencelms-content.s3.amazonaws.com',
        originPath: '',
        s3Config: {
          originAccessIdentity: 'OAI-xxxxx'
        }
      }
    ],
    defaultCacheBehavior: {
      targetOrigin: 's3-content',
      viewerProtocolPolicy: 'redirect-to-https',
      allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      cachedMethods: ['GET', 'HEAD'],
      ttl: {
        default: 86400,    // 1 day
        max: 31536000,     // 1 year
        min: 0
      },
      compress: true
    },
    cacheBehaviors: [
      {
        pathPattern: '/scorm/*',
        ttl: { default: 31536000 },  // Immutable, versioned
        headers: ['Origin', 'Access-Control-Request-Method']
      },
      {
        pathPattern: '/media/videos/*/hls/*',
        ttl: { default: 86400 },
        headers: ['Origin']
      }
    ],
    customErrorResponses: [
      { errorCode: 403, responseCode: 404, responsePagePath: '/404.html' }
    ]
  }
};
```

#### Signed URLs for Protected Content

```typescript
// Generate signed CloudFront URL for protected content
function generateSignedUrl(contentPath: string, userId: string): string {
  const expiry = Date.now() + 4 * 60 * 60 * 1000; // 4 hours

  const policy = {
    Statement: [{
      Resource: `https://cdn.cadencelms.com/${contentPath}`,
      Condition: {
        DateLessThan: { 'AWS:EpochTime': Math.floor(expiry / 1000) }
      }
    }]
  };

  return cloudfront.getSignedUrl({
    url: `https://cdn.cadencelms.com/${contentPath}`,
    policy: JSON.stringify(policy),
    keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
    privateKey: process.env.CLOUDFRONT_PRIVATE_KEY
  });
}
```

### 5. Video Streaming

#### HLS Transcoding Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Upload     │────▶│  Transcode   │────▶│   Storage    │
│  (Original)  │     │  (MediaConvert)    │   (HLS)      │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Thumbnails  │
                     │  Generation  │
                     └──────────────┘
```

#### Transcoding Presets

```typescript
const transcodingPresets = {
  '1080p': {
    width: 1920,
    height: 1080,
    bitrate: 5000000,  // 5 Mbps
    codec: 'H.264',
    profile: 'High'
  },
  '720p': {
    width: 1280,
    height: 720,
    bitrate: 2500000,  // 2.5 Mbps
    codec: 'H.264',
    profile: 'Main'
  },
  '480p': {
    width: 854,
    height: 480,
    bitrate: 1000000,  // 1 Mbps
    codec: 'H.264',
    profile: 'Main'
  }
};

// Output HLS structure
// /media/videos/{contentId}/hls/
//   ├── master.m3u8        (adaptive playlist)
//   ├── 1080p/
//   │   ├── playlist.m3u8
//   │   └── segment_*.ts
//   ├── 720p/
//   └── 480p/
```

### 6. Content Versioning

#### Version Strategy

```typescript
// Content versions are immutable
interface ContentVersion {
  contentId: string;
  version: number;
  storagePath: string;      // /scorm/{contentId}/v{version}/
  status: 'processing' | 'ready' | 'archived';
  createdAt: Date;
  createdBy: string;
  metadata: {
    fileSize: number;
    checksum: string;        // SHA-256 for integrity
    scormVersion?: string;
  };
}

// Version lifecycle
// 1. Upload creates new version (status: processing)
// 2. Processing completes (status: ready)
// 3. Publish makes version active
// 4. New upload creates v+1
// 5. Old versions archived after retention period
```

#### Content Record with Versions

```typescript
const contentSchema = {
  _id: ObjectId,
  title: String,
  type: String,  // scorm, video, document, etc.
  currentVersion: Number,
  versions: [{
    version: Number,
    storagePath: String,
    status: String,
    fileSize: Number,
    checksum: String,
    createdAt: Date,
    createdBy: ObjectId
  }],
  // ... other fields
};
```

### 7. Content Processing Pipeline

#### Processing Stages

```
Upload → Validate → Process → Store → Index
   │         │          │        │       │
   │         │          │        │       └─ Update search index
   │         │          │        └─ Move to permanent S3 location
   │         │          └─ Type-specific processing
   │         │              - SCORM: Extract, parse manifest
   │         │              - Video: Transcode to HLS
   │         │              - Image: Generate thumbnails
   │         │              - Document: Extract text for search
   │         └─ Verify file type, scan for malware
   └─ Receive file via presigned URL
```

#### Processing Service

```typescript
interface ContentProcessor {
  process(uploadId: string): Promise<ProcessingResult>;
}

// SCORM Processor
class ScormProcessor implements ContentProcessor {
  async process(uploadId: string): Promise<ProcessingResult> {
    // 1. Extract ZIP to temp directory
    // 2. Parse imsmanifest.xml
    // 3. Validate SCORM structure
    // 4. Copy to versioned S3 path
    // 5. Return manifest data
  }
}

// Video Processor
class VideoProcessor implements ContentProcessor {
  async process(uploadId: string): Promise<ProcessingResult> {
    // 1. Submit to MediaConvert
    // 2. Wait for transcoding (or use job callback)
    // 3. Generate thumbnails
    // 4. Store HLS output
    // 5. Return streaming URLs
  }
}
```

### 8. Access Control

#### Content Access Levels

| Level | Access Pattern | Example |
|-------|---------------|---------|
| Public | CDN, no auth | Course thumbnails, previews |
| Protected | Signed URL | Published content for enrolled learners |
| Private | API proxy | Draft content, admin-only |

#### Access Check Flow

```typescript
// Middleware for content access
async function checkContentAccess(req: Request): Promise<boolean> {
  const { contentId, userId } = req;
  const content = await Content.findById(contentId);

  // 1. Check if content is published
  if (content.status !== 'published') {
    // Only creator or admin can access draft
    return isCreatorOrAdmin(userId, content);
  }

  // 2. Check department access
  if (content.departmentId) {
    const hasAccess = await userHasDepartmentAccess(userId, content.departmentId);
    if (!hasAccess) return false;
  }

  // 3. For learners, check enrollment
  if (isLearner(userId)) {
    return isEnrolledInContentCourse(userId, contentId);
  }

  return true;
}
```

### 9. Offline Support

#### Downloadable Content

```typescript
// Generate offline package for content
interface OfflinePackage {
  contentId: string;
  version: number;
  downloadUrl: string;      // Signed URL, expires in 24h
  size: number;
  checksum: string;
  expiresAt: Date;
}

// Offline manifest for course
interface OfflineManifest {
  courseId: string;
  contents: OfflinePackage[];
  totalSize: number;
  generatedAt: Date;
}
```

#### Client-Side Storage

```typescript
// UI uses IndexedDB + File System API
// See FSD spec AD-004 for offline strategy
const offlineStorage = {
  scorm: 'IndexedDB + FileSystem',   // Extract and store SCORM files
  video: 'FileSystem',               // Large video files
  documents: 'IndexedDB',            // PDFs, docs
  progress: 'IndexedDB'              // Sync queue for progress
};
```

### 10. Content URLs

#### URL Patterns

```
# SCORM player launch
https://app.cadencelms.com/scorm-player/{contentId}?session={token}

# Video streaming (HLS)
https://cdn.cadencelms.com/media/videos/{contentId}/hls/master.m3u8?token={signed}

# Document download
https://cdn.cadencelms.com/media/documents/{contentId}.pdf?token={signed}

# Thumbnail (public)
https://cdn.cadencelms.com/assets/thumbs/{contentId}/200x200.jpg

# API content info
https://api.cadencelms.com/api/v2/content/{contentId}
```

## Consequences

### Positive
- Direct-to-S3 uploads reduce API server load
- CDN ensures fast content delivery globally
- HLS streaming adapts to network conditions
- Versioning enables safe updates without breaking references
- Signed URLs protect content access

### Negative
- S3 + CloudFront adds infrastructure cost
- Video transcoding adds processing time
- Multipart uploads add client complexity
- Multiple services to monitor and maintain

### Neutral
- Existing content service patterns align with this architecture
- Requires CDN_URL environment variable (already referenced)
- SCORM processing placeholder needs implementation

## Alternatives Considered

### Local File Storage
- **Rejected**: Doesn't scale, no CDN benefits, single point of failure.

### Third-Party Video Platform (Vimeo, YouTube)
- **Rejected**: Less control, potential privacy concerns, external dependency for core feature.

### Single Bucket (No Separation)
- **Rejected**: Harder to manage lifecycle rules, permissions, and costs per content type.

## Implementation Notes

### Environment Variables

```bash
# S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_CONTENT_BUCKET=cadencelms-content-prod
S3_ASSETS_BUCKET=cadencelms-assets-prod

# CDN Configuration
CDN_URL=https://cdn.cadencelms.com
CLOUDFRONT_KEY_PAIR_ID=xxx
CLOUDFRONT_PRIVATE_KEY=xxx

# Video Processing
MEDIACONVERT_ENDPOINT=https://xxx.mediaconvert.us-east-1.amazonaws.com
MEDIACONVERT_ROLE=arn:aws:iam::xxx:role/MediaConvertRole
```

### Migration from Local Storage

```typescript
// Existing: fileUrl = '/uploads/media/filename.mp4'
// New: fileUrl = 's3://cadencelms-content/media/videos/{contentId}/original.mp4'

// CDN URL generation already in place:
// ContentService.generateCDNUrl() uses CDN_URL env var
```

## Links

- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-SCORM-001-SCORM-RUNTIME-ARCHITECTURE]] (SCORM handling)
  - [[ADR-SEC-001-SECURITY-ARCHITECTURE]] (access control)
  - [[ADR-API-002-API-CACHING-STRATEGY]] (CDN caching)
- Implementation:
  - `src/models/content/Content.model.ts` - Content schema
  - `src/services/content/content.service.ts` - Content operations
  - `src/config/environment.ts` - Upload config
