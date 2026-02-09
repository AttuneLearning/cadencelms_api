# Adaptive Playlist Engine — API Requirements

**Date:** 2026-02-09
**From:** UI Team
**To:** API Team
**Priority:** Medium
**Related Issues:** ADR-UI-004

---

## Request

The UI is implementing an Adaptive Playlist Engine (ADR-UI-004) that wraps the existing linear learning-unit sequence with a runtime engine that can skip, inject, and retry learning units based on learner performance. We need several API changes to fully support this.

## Context

The playlist engine has three modes: `off` (passthrough), `guided` (gates only), `full` (skip + inject + remediate). Phase 1 (types + pure engine) and Phase 2 (React integration) are being built now with `mode: 'off'` as default — **zero behavior change**. The API changes below are needed for Phases 3-6.

Extensive adaptive infrastructure already exists (knowledge nodes, adaptive testing, question banks, cognitive depth, learner progress, exercises) — all currently disconnected from the course player. This engine connects them.

---

## Requirements

### 1. Learning Unit Adaptive Metadata (Phase 3)

Add optional `adaptive` field to Learning Unit responses:

```typescript
interface LearningUnitAdaptive {
  teachesNodes: string[];    // Knowledge node IDs this LU teaches
  assessesNodes: string[];   // Knowledge node IDs this LU assesses
  isGate: boolean;           // Whether this LU acts as a gate checkpoint
  isSkippable: boolean;      // Whether engine can skip if nodes already mastered
  gateConfig?: {
    masteryThreshold: number;  // 0-1, required mastery to pass gate
    minQuestions: number;      // Minimum questions in gate challenge
    maxRetries: number;        // Max retry attempts (-1 = unlimited)
    failStrategy: 'allow-continue' | 'hold' | 'inject-practice' | 'prescribe-review';
  };
}
```

**Endpoints affected:**
- `GET /modules/:moduleId/learning-units` — include `adaptive` field on each LU
- `PUT /learning-units/:id` — accept `adaptive` in update payload

### 2. Course Adaptive Settings (Phase 4)

Add adaptive configuration to course settings:

```typescript
interface CourseAdaptiveSettings {
  mode: 'off' | 'guided' | 'full';
  allowLearnerChoice: boolean;       // Can learner toggle mode?
  preAssessmentEnabled: boolean;     // Run pre-assessment before starting?
}
```

**Endpoints affected:**
- `GET /courses/:id` — include `adaptiveSettings` in course response
- `PUT /courses/:id/settings` — accept `adaptiveSettings` in update

### 3. Playlist Session Persistence (Phase 5)

Endpoints for saving/loading playlist engine session state:

```
POST   /enrollments/:enrollmentId/playlist-session
  Body: { moduleId, session: LearnerModuleSession }
  Response: { id, enrollmentId, moduleId, session, savedAt }

GET    /enrollments/:enrollmentId/playlist-session?moduleId=xxx
  Response: { id, enrollmentId, moduleId, session, savedAt } | 404

PUT    /enrollments/:enrollmentId/playlist-session/:sessionId
  Body: { session: LearnerModuleSession }
  Response: { id, session, savedAt }
```

### 4. AI Decision Endpoint (Phase 6 — Future)

```
POST /adaptive/decide
  Body: { enrollmentId, moduleId, context: PlaylistContext }
  Response: { decision: PlaylistDecision }

POST /enrollments/:enrollmentId/playlist/inject
  Body: { entries: PlaylistEntry[], insertAfterIndex: number }
  Response: { updatedPlaylist: PlaylistEntry[] }
```

---

## Priority / Timeline

| Requirement | Priority | Needed By |
|-------------|----------|-----------|
| 1. LU Adaptive Metadata | High | Phase 3 (after current sprint) |
| 2. Course Adaptive Settings | High | Phase 4 (can parallel #1) |
| 3. Session Persistence | Medium | Phase 5 |
| 4. AI Decision | Low | Phase 6 (future) |

**Not blocking current work** — UI is building Phases 1-2 with `mode: 'off'` and no API changes needed. Requirements 1-2 are needed before we can activate guided/full modes.

---

## Response Section (For Recipient)

**Status:** Pending
**Response Date:**

---

*Move to `archive/` when thread is complete*
