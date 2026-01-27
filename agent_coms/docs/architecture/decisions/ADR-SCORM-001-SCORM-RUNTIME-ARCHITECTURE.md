# ADR-SCORM-001: SCORM Runtime Architecture

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Content/Learning

## Context

CadenceLMS supports SCORM (Sharable Content Object Reference Model) packages for delivering interactive e-learning content. SCORM compliance requires:
- Proper package validation and extraction
- Runtime API for content-LMS communication
- CMI (Computer Managed Instruction) data persistence
- Session management and attempt tracking
- Offline learning capability with sync

This ADR establishes the architecture for SCORM handling from package upload through learner completion.

## Decision

### 1. SCORM Version Support

#### Supported Versions

| Version | Status | Notes |
|---------|--------|-------|
| SCORM 1.2 | Full Support | Most common format |
| SCORM 2004 (all editions) | Full Support | Advanced sequencing |
| AICC | Not Supported | Legacy, recommend conversion |
| xAPI/Tin Can | Future | See integration roadmap |

#### Version Detection

```typescript
// Detect SCORM version from manifest
function detectScormVersion(manifestXml: string): '1.2' | '2004' {
  const parser = new DOMParser();
  const doc = parser.parseFromString(manifestXml, 'text/xml');

  // Check for SCORM 2004 namespace
  const adlcpNs = doc.documentElement.getAttribute('xmlns:adlcp');
  if (adlcpNs?.includes('adlcp_v1p3')) {
    return '2004';
  }

  // Check schemaversion element
  const schemaVersion = doc.querySelector('schemaversion')?.textContent;
  if (schemaVersion?.startsWith('2004') || schemaVersion === '1.3') {
    return '2004';
  }

  return '1.2';
}
```

### 2. Package Processing Pipeline

#### Upload & Validation Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    SCORM PACKAGE PIPELINE                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│  │  Upload  │──▶│  Extract │──▶│ Validate │──▶│  Store   │   │
│  │   ZIP    │   │   ZIP    │   │ Manifest │   │   S3     │   │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   │
│                       │              │              │          │
│                       ▼              ▼              ▼          │
│                 ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│                 │  Scan    │  │  Parse   │  │  Index   │     │
│                 │ Malware  │  │   SCOs   │  │ Content  │     │
│                 └──────────┘  └──────────┘  └──────────┘     │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

#### Package Validation Rules

```typescript
interface ScormValidationResult {
  valid: boolean;
  version: '1.2' | '2004';
  errors: ValidationError[];
  warnings: ValidationWarning[];
  manifest: ParsedManifest;
}

const validationRules = {
  // Required files
  requiredFiles: ['imsmanifest.xml'],

  // Manifest structure
  manifestRules: {
    hasOrganizations: true,
    hasResources: true,
    hasLaunchableResource: true,
    validIdentifiers: true
  },

  // Security checks
  securityRules: {
    noExternalScripts: true,     // No remote script loading
    noPhpFiles: true,            // No server-side code
    allowedFileTypes: [
      '.html', '.htm', '.js', '.css', '.json',
      '.jpg', '.jpeg', '.png', '.gif', '.svg',
      '.mp4', '.webm', '.mp3', '.wav',
      '.pdf', '.swf', '.xml'
    ]
  },

  // Size limits
  sizeLimits: {
    maxPackageSize: 100 * 1024 * 1024,     // 100 MB
    maxFileCount: 10000,
    maxPathLength: 255
  }
};
```

#### Manifest Parser

```typescript
interface ParsedManifest {
  identifier: string;
  version: '1.2' | '2004';
  title: string;
  description?: string;
  organizations: Organization[];
  resources: Resource[];
  defaultOrganization: string;
  metadata?: ManifestMetadata;
}

interface Organization {
  identifier: string;
  title: string;
  items: Item[];
}

interface Item {
  identifier: string;
  title: string;
  resourceRef?: string;         // identifierref
  parameters?: string;          // Launch parameters
  prerequisites?: string;       // SCORM 1.2
  masteryScore?: number;        // SCORM 1.2
  children?: Item[];
  sequencing?: Sequencing;      // SCORM 2004
}

interface Resource {
  identifier: string;
  type: string;
  href: string;                 // Launch file
  scormType: 'sco' | 'asset';
  files: string[];
  dependencies: string[];
}
```

### 3. SCORM Runtime API

#### API Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      SCORM PLAYER                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    SCORM Content                         │  │
│  │                    (iframe)                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│           │                                     │              │
│           │  API.LMSInitialize()               │              │
│           │  API.LMSGetValue()                 │              │
│           │  API.LMSSetValue()                 │              │
│           │  API.LMSCommit()                   │              │
│           │  API.LMSFinish()                   │              │
│           ▼                                     ▼              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              SCORM API Adapter (scorm-again)            │  │
│  │                                                          │  │
│  │  - Exposes window.API (1.2) or window.API_1484_11 (2004)│  │
│  │  - Validates CMI data model                              │  │
│  │  - Buffers changes for batch commit                      │  │
│  │  - Handles offline queueing                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│           │                                                    │
│           │  REST API calls                                    │
│           ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              LMS Backend API                             │  │
│  │                                                          │  │
│  │  POST /api/v2/scorm-runtime/{attemptId}/commit          │  │
│  │  GET  /api/v2/scorm-runtime/{attemptId}/data            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

#### SCORM API Adapter (Client-Side)

**Library:** scorm-again (npm package)

```typescript
// Initialize SCORM API adapter
import { Scorm12API, Scorm2004API } from 'scorm-again';

function initializeScormApi(version: '1.2' | '2004', config: ScormConfig) {
  const apiConfig = {
    // Auto-commit interval (ms)
    autocommitInterval: 30000,

    // Callback when LMSCommit is called
    commitCallback: async (cmiData: CMIData) => {
      return persistCMIData(config.attemptId, cmiData);
    },

    // Initialize with existing data
    cmi: config.existingCmiData || {},

    // Learner info
    learnerInfo: {
      learner_id: config.learnerId,
      learner_name: config.learnerName
    }
  };

  if (version === '1.2') {
    window.API = new Scorm12API(apiConfig);
  } else {
    window.API_1484_11 = new Scorm2004API(apiConfig);
  }
}
```

#### Backend Runtime Endpoints

```typescript
// SCORM Runtime API routes
router.post('/scorm-runtime/:attemptId/initialize', initializeAttempt);
router.get('/scorm-runtime/:attemptId/data', getCMIData);
router.post('/scorm-runtime/:attemptId/commit', commitCMIData);
router.post('/scorm-runtime/:attemptId/terminate', terminateAttempt);

// Initialize attempt
POST /api/v2/scorm-runtime/{attemptId}/initialize
Response: {
  "cmiData": { /* existing CMI data */ },
  "launchData": "...",
  "suspendData": "...",
  "maxTimeAllowed": 3600
}

// Commit CMI data
POST /api/v2/scorm-runtime/{attemptId}/commit
Request: {
  "cmi": {
    "core": {
      "lesson_status": "incomplete",
      "lesson_location": "page_5",
      "score": { "raw": 75, "min": 0, "max": 100 }
    },
    "suspend_data": "eyJwcm9ncmVzcyI6MC41fQ=="
  }
}
```

### 4. CMI Data Model

#### SCORM 1.2 CMI Elements

```typescript
interface CMI_1_2 {
  core: {
    student_id: string;
    student_name: string;
    lesson_location: string;
    credit: 'credit' | 'no-credit';
    lesson_status: 'passed' | 'completed' | 'failed' | 'incomplete' | 'browsed' | 'not attempted';
    entry: 'ab-initio' | 'resume' | '';
    score: {
      raw: number;
      max: number;
      min: number;
    };
    total_time: string;      // HHHH:MM:SS.SS format
    lesson_mode: 'browse' | 'normal' | 'review';
    exit: 'time-out' | 'suspend' | 'logout' | '';
    session_time: string;
  };
  suspend_data: string;       // Max 4096 chars
  launch_data: string;
  comments: string;
  comments_from_lms: string;
  objectives: ObjectiveData[];
  student_data: {
    mastery_score: number;
    max_time_allowed: string;
    time_limit_action: 'exit,message' | 'exit,no message' | 'continue,message' | 'continue,no message';
  };
  student_preference: {
    audio: number;
    language: string;
    speed: number;
    text: number;
  };
  interactions: InteractionData[];
}
```

#### SCORM 2004 CMI Elements

```typescript
interface CMI_2004 {
  learner_id: string;
  learner_name: string;
  location: string;
  credit: 'credit' | 'no-credit';
  completion_status: 'completed' | 'incomplete' | 'not attempted' | 'unknown';
  success_status: 'passed' | 'failed' | 'unknown';
  entry: 'ab-initio' | 'resume' | '';
  exit: 'time-out' | 'suspend' | 'logout' | 'normal' | '';
  mode: 'browse' | 'normal' | 'review';
  progress_measure: number;   // 0.0 to 1.0
  score: {
    scaled: number;           // -1.0 to 1.0
    raw: number;
    min: number;
    max: number;
  };
  total_time: string;         // ISO 8601 duration
  session_time: string;
  suspend_data: string;       // Max 64000 chars
  launch_data: string;
  max_time_allowed: string;
  time_limit_action: 'exit,message' | 'exit,no message' | 'continue,message' | 'continue,no message';
  scaled_passing_score: number;
  learner_preference: {
    audio_level: number;
    language: string;
    delivery_speed: number;
    audio_captioning: number;
  };
  objectives: Objective2004[];
  interactions: Interaction2004[];
  comments_from_learner: Comment[];
  comments_from_lms: Comment[];
}
```

### 5. Attempt & Session Management

#### Attempt Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    ATTEMPT LIFECYCLE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐                                               │
│  │   New    │                                               │
│  │ Attempt  │                                               │
│  └────┬─────┘                                               │
│       │ LMSInitialize()                                     │
│       ▼                                                      │
│  ┌──────────┐  LMSSetValue/LMSCommit  ┌──────────┐         │
│  │   In     │◀───────────────────────▶│  Saved   │         │
│  │ Progress │                          │  State   │         │
│  └────┬─────┘                          └──────────┘         │
│       │                                                      │
│       │ LMSFinish(exit=suspend)                             │
│       ▼                                                      │
│  ┌──────────┐                                               │
│  │ Suspended│──────────────────────────────────┐            │
│  │          │  (Resume later)                   │            │
│  └────┬─────┘                                   │            │
│       │ LMSFinish(exit=logout/normal)          │            │
│       │ OR lesson_status=completed/passed      │            │
│       ▼                                         ▼            │
│  ┌──────────┐                          ┌──────────┐         │
│  │ Completed│                          │ Abandoned│         │
│  │          │                          │ (timeout)│         │
│  └──────────┘                          └──────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Session Token

```typescript
// JWT session token for SCORM runtime
interface ScormSessionToken {
  attemptId: string;
  contentId: string;
  userId: string;
  scormVersion: '1.2' | '2004';
  iat: number;
  exp: number;           // 4 hours
}

// Verify session on each runtime API call
async function verifyScormSession(token: string): Promise<ScormSession> {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const attempt = await ScormAttempt.findById(decoded.attemptId);

  if (!attempt || attempt.status === 'completed') {
    throw ApiError.unauthorized('Invalid or expired session');
  }

  return { attempt, decoded };
}
```

### 6. Data Persistence

#### ScormAttempt Schema

```typescript
// Already implemented: src/models/activity/ScormAttempt.model.ts
const scormAttemptSchema = {
  attemptId: ObjectId,           // Unique attempt ID
  contentId: ObjectId,           // SCORM package reference
  learnerId: ObjectId,           // User reference
  attemptNumber: Number,
  scormVersion: '1.2' | '2004',
  status: 'not-attempted' | 'incomplete' | 'completed' | 'passed' | 'failed' | 'browsed' | 'abandoned',

  // Score
  scoreRaw: Number,
  scoreMin: Number,
  scoreMax: Number,
  scoreScaled: Number,           // SCORM 2004 only

  // Time tracking
  sessionTime: Number,           // Current session (seconds)
  totalTime: Number,             // Cumulative (seconds)

  // Progress
  progressMeasure: Number,       // 0.0 to 1.0 (SCORM 2004)
  completionStatus: String,
  successStatus: String,

  // CMI data (full state)
  cmiData: Mixed,                // Complete CMI object
  suspendData: String,           // Bookmark data
  launchData: String,
  location: String,              // Last location in content

  // Timestamps
  startedAt: Date,
  lastAccessedAt: Date,
  completedAt: Date,

  // Metadata
  metadata: Mixed
};

// Indexes for efficient queries
scormAttemptSchema.index({ contentId: 1, learnerId: 1, attemptNumber: 1 });
scormAttemptSchema.index({ learnerId: 1, status: 1 });
```

#### CMI Commit Strategy

```typescript
// Batch commit with optimistic locking
async function commitCMIData(attemptId: string, cmiData: Partial<CMIData>): Promise<void> {
  const attempt = await ScormAttempt.findById(attemptId);

  // Merge CMI data (deep merge)
  const mergedCmi = deepMerge(attempt.cmiData || {}, cmiData);

  // Extract key fields for indexing
  const updates: any = {
    cmiData: mergedCmi,
    lastAccessedAt: new Date()
  };

  // SCORM 1.2 status extraction
  if (cmiData.core?.lesson_status) {
    updates.status = mapLessonStatus(cmiData.core.lesson_status);
  }
  if (cmiData.core?.score?.raw !== undefined) {
    updates.scoreRaw = cmiData.core.score.raw;
  }
  if (cmiData.core?.lesson_location) {
    updates.location = cmiData.core.lesson_location;
  }
  if (cmiData.suspend_data) {
    updates.suspendData = cmiData.suspend_data;
  }

  // SCORM 2004 status extraction
  if (cmiData.completion_status) {
    updates.completionStatus = cmiData.completion_status;
  }
  if (cmiData.success_status) {
    updates.successStatus = cmiData.success_status;
  }
  if (cmiData.progress_measure !== undefined) {
    updates.progressMeasure = cmiData.progress_measure;
  }

  // Check for completion
  if (isAttemptComplete(mergedCmi, attempt.scormVersion)) {
    updates.status = determineCompletionStatus(mergedCmi);
    updates.completedAt = new Date();
  }

  await ScormAttempt.updateOne({ _id: attemptId }, { $set: updates });
}
```

### 7. Offline Support

#### Offline Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    OFFLINE SCORM FLOW                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ONLINE                              OFFLINE                    │
│  ──────                              ───────                    │
│                                                                 │
│  ┌──────────┐                       ┌──────────┐              │
│  │  SCORM   │  Download Package     │  SCORM   │              │
│  │ Content  │─────────────────────▶│ Content  │              │
│  │  (CDN)   │                       │ (IndexDB)│              │
│  └──────────┘                       └──────────┘              │
│                                            │                   │
│  ┌──────────┐                             │ Play              │
│  │   API    │                             ▼                   │
│  │ Backend  │                       ┌──────────┐              │
│  └──────────┘                       │  SCORM   │              │
│       ▲                             │  Player  │              │
│       │                             └──────────┘              │
│       │                                   │                   │
│       │                                   │ CMI Updates       │
│       │                                   ▼                   │
│       │                             ┌──────────┐              │
│       │                             │  Offline │              │
│       │   Sync when online          │   Queue  │              │
│       └─────────────────────────────│(IndexDB) │              │
│                                     └──────────┘              │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

#### Offline Queue Schema (IndexedDB)

```typescript
interface OfflineScormQueue {
  id: string;                    // Auto-generated
  attemptId: string;
  timestamp: Date;
  operation: 'commit' | 'terminate';
  cmiData: Partial<CMIData>;
  synced: boolean;
  syncAttempts: number;
  lastSyncError?: string;
}

// Sync strategy
async function syncOfflineQueue(): Promise<SyncResult> {
  const queue = await db.offlineScormQueue
    .where('synced').equals(false)
    .sortBy('timestamp');

  const results = { succeeded: 0, failed: 0 };

  for (const item of queue) {
    try {
      await api.post(`/scorm-runtime/${item.attemptId}/commit`, {
        cmi: item.cmiData,
        offlineTimestamp: item.timestamp
      });

      await db.offlineScormQueue.update(item.id, { synced: true });
      results.succeeded++;
    } catch (error) {
      await db.offlineScormQueue.update(item.id, {
        syncAttempts: item.syncAttempts + 1,
        lastSyncError: error.message
      });
      results.failed++;
    }
  }

  return results;
}
```

#### Conflict Resolution

```typescript
// Server handles offline sync conflicts
async function handleOfflineCommit(
  attemptId: string,
  cmiData: CMIData,
  offlineTimestamp: Date
): Promise<void> {
  const attempt = await ScormAttempt.findById(attemptId);

  // Check if server has newer data
  if (attempt.lastAccessedAt > offlineTimestamp) {
    // Merge strategy: offline progress takes precedence
    // (learner was actually doing the work)
    const merged = mergeWithOfflinePrecedence(attempt.cmiData, cmiData);
    await commitCMIData(attemptId, merged);
  } else {
    // Simple case: apply offline changes
    await commitCMIData(attemptId, cmiData);
  }
}

function mergeWithOfflinePrecedence(server: CMIData, offline: CMIData): CMIData {
  return {
    ...server,
    ...offline,
    // Prefer higher scores
    core: {
      ...server.core,
      ...offline.core,
      score: {
        raw: Math.max(server.core?.score?.raw || 0, offline.core?.score?.raw || 0)
      }
    },
    // Prefer more advanced location
    // Combine interaction data
    interactions: [...(server.interactions || []), ...(offline.interactions || [])]
  };
}
```

### 8. SCORM Player Component

#### Player Architecture

```typescript
// UI Component structure
interface ScormPlayerProps {
  contentId: string;
  attemptId?: string;       // For resume
  onComplete?: (result: AttemptResult) => void;
  onProgress?: (progress: ProgressUpdate) => void;
}

// Player responsibilities:
// 1. Load SCORM content in sandboxed iframe
// 2. Initialize scorm-again API adapter
// 3. Handle API calls from content
// 4. Persist CMI data (online or offline queue)
// 5. Track session time
// 6. Handle navigation (for multi-SCO packages)
```

#### Security Considerations

```typescript
// iframe sandbox attributes
const iframeSandbox = [
  'allow-scripts',           // Required for SCORM
  'allow-same-origin',       // Required for API access
  'allow-forms',             // Some content uses forms
  'allow-popups'             // Some content opens resources
];

// Content Security Policy for SCORM player page
const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // SCORM often needs eval
  'style-src': ["'self'", "'unsafe-inline'"],
  'frame-src': ["'self'", "https://cdn.cadencelms.com"],
  'connect-src': ["'self'", "https://api.cadencelms.com"]
};
```

### 9. Reporting & Analytics

#### SCORM Metrics

```typescript
// Aggregated metrics for reporting
interface ScormAnalytics {
  contentId: string;

  // Attempt metrics
  totalAttempts: number;
  uniqueLearners: number;
  completionRate: number;
  passRate: number;

  // Score metrics
  averageScore: number;
  scoreDistribution: { range: string; count: number }[];

  // Time metrics
  averageTimeSpent: number;
  medianTimeSpent: number;

  // Interaction analysis (if available)
  questionAnalysis: {
    questionId: string;
    correctRate: number;
    averageTime: number;
  }[];
}

// Query for analytics
async function getScormAnalytics(contentId: string): Promise<ScormAnalytics> {
  const pipeline = [
    { $match: { contentId: new ObjectId(contentId) } },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        uniqueLearners: { $addToSet: '$learnerId' },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        passedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] }
        },
        totalScore: { $sum: '$scoreRaw' },
        scoredCount: {
          $sum: { $cond: [{ $ne: ['$scoreRaw', null] }, 1, 0] }
        },
        totalTime: { $sum: '$totalTime' }
      }
    }
  ];

  const [result] = await ScormAttempt.aggregate(pipeline);
  // ... calculate metrics
}
```

## Consequences

### Positive
- Full SCORM 1.2 and 2004 compliance
- Offline learning with reliable sync
- Detailed attempt tracking for reporting
- Leverages proven scorm-again library
- Session-based security

### Negative
- SCORM content often requires unsafe-inline/eval CSP
- Offline sync adds complexity
- Large CMI data objects in MongoDB
- Session timeout handling complexity

### Neutral
- Existing ScormAttempt model aligns with architecture
- Content service has placeholder for manifest parsing
- UI FSD spec mentions scorm-again library

## Alternatives Considered

### Custom SCORM API Implementation
- **Rejected**: scorm-again is well-tested and maintained; no need to reinvent.

### Server-Side SCORM Runtime
- **Rejected**: SCORM requires client-side JavaScript API; can't run on server.

### Store CMI as Separate Documents
- **Rejected**: CMI data is always accessed with attempt; embedding is simpler.

## Implementation Notes

### Required Libraries

```json
{
  "dependencies": {
    "scorm-again": "^1.7.0",
    "xml2js": "^0.6.0",
    "adm-zip": "^0.5.10"
  }
}
```

### Environment Variables

```bash
# SCORM Configuration
SCORM_SESSION_EXPIRY=4h
SCORM_AUTOCOMMIT_INTERVAL=30000
SCORM_MAX_SUSPEND_DATA=64000
```

## Links

- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-CONTENT-001-CONTENT-DELIVERY-ARCHITECTURE]] (package storage)
  - [[ADR-API-002-API-CACHING-STRATEGY]] (offline caching)
  - [[ADR-SEC-001-SECURITY-ARCHITECTURE]] (session security)
- Implementation:
  - `src/models/activity/ScormAttempt.model.ts` - Attempt schema
  - `src/models/content/Content.model.ts` - SCORM content schema
  - `src/services/content/content.service.ts` - Launch/manage SCORM
- References:
  - [SCORM 1.2 RTE Reference](https://scorm.com/scorm-explained/technical-scorm/run-time/)
  - [SCORM 2004 Documentation](https://adlnet.gov/projects/scorm/)
  - [scorm-again Library](https://github.com/jcputney/scorm-again)
