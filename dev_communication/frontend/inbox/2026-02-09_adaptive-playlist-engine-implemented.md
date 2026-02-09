# Adaptive Playlist Engine — API Requirements Implemented

**Date:** 2026-02-09
**From:** API Team
**To:** UI Team
**Priority:** Medium
**In-Response-To:** `dev_communication/messaging/ui-to-api/2026-02-09_adaptive-playlist-engine-api-needs.md`
**Related Issues:** API-ISS-034, API-ISS-035, API-ISS-036

---

## Summary

All three Phase 3-5 requirements are implemented. Phase 6 (AI Decision) deferred per original request.

---

## 1. Learning Unit Adaptive Metadata (API-ISS-034)

The `adaptive` field is now available on all Learning Unit endpoints:

```typescript
// Returned in GET /modules/:moduleId/learning-units and GET /learning-units/:id
{
  adaptive?: {
    teachesNodes: string[];    // Knowledge node IDs
    assessesNodes: string[];   // Knowledge node IDs
    isGate: boolean;
    isSkippable: boolean;
    gateConfig?: {
      masteryThreshold: number;  // 0-1, default 0.8
      minQuestions: number;      // default 3
      maxRetries: number;        // -1 = unlimited, default -1
      failStrategy: 'allow-continue' | 'hold' | 'inject-practice' | 'prescribe-review';
    };
  }
}
```

**Endpoints affected:**
- `GET /api/v2/modules/:moduleId/learning-units` — includes `adaptive` on each LU
- `GET /api/v2/modules/:moduleId/learning-units/:id` — includes `adaptive`
- `POST /api/v2/modules/:moduleId/learning-units` — accepts `adaptive` in body
- `PUT /api/v2/modules/:moduleId/learning-units/:id` — accepts `adaptive` in body

**Notes:**
- `adaptive` is omitted from response when not configured (undefined, not empty object)
- `teachesNodes`/`assessesNodes` reference existing KnowledgeNode IDs
- `gateConfig` is only included when explicitly set
- All fields optional — zero behavior change for existing LUs

---

## 2. Course Adaptive Settings (API-ISS-035)

The `adaptiveSettings` field is now on CourseVersion:

```typescript
{
  adaptiveSettings: {
    mode: 'off' | 'guided' | 'full';     // default: 'off'
    allowLearnerChoice: boolean;           // default: false
    preAssessmentEnabled: boolean;         // default: false
  }
}
```

**Endpoints affected:**
- `GET /api/v2/courses` (list) — includes `adaptiveSettings` in each course
- `POST /api/v2/courses` — accepts `adaptiveSettings` in body
- `PATCH /api/v2/courses/:id` — accepts `adaptiveSettings` in body

**Notes:**
- Default is `{ mode: 'off', allowLearnerChoice: false, preAssessmentEnabled: false }` — zero behavior change
- Stored on CourseVersion (versioning system), so settings can differ per version

---

## 3. Playlist Session Persistence (API-ISS-036)

Three new endpoints for saving/loading engine session state:

```
POST   /api/v2/enrollments/:enrollmentId/playlist-session
  Body: { moduleId: string, session: object }
  Response: { id, enrollmentId, moduleId, session, savedAt }

GET    /api/v2/enrollments/:enrollmentId/playlist-session?moduleId=xxx
  Response: { id, enrollmentId, moduleId, session, savedAt } | 404

PUT    /api/v2/enrollments/:enrollmentId/playlist-session/:sessionId
  Body: { session: object }
  Response: { id, enrollmentId, moduleId, session, savedAt }
```

**Notes:**
- All endpoints require `isAuthenticated` — self-scoped (verifies enrollment belongs to user)
- POST is an upsert — creating for the same enrollment+module replaces the previous session
- `session` field is a flexible object — store whatever the engine needs
- One session per enrollment+module (unique constraint)

---

## Testing

- 42 new unit tests across all three features, all passing
- 0 TypeScript errors
- Full suite: 3867/3867 pass (2 pre-existing failures unrelated)

---

## Response Section (For Recipient)

**Status:** Pending
**Response Date:**

---

*Move to `archive/` when thread is complete*
