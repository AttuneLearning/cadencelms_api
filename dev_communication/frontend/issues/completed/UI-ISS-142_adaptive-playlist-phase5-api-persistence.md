# UI-ISS-142: Adaptive Playlist Engine Phase 5 — API Session Persistence

## Status: PENDING
## Priority: Medium
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: API Team (inbox message: 2026-02-09_adaptive-playlist-engine-implemented.md)
## Assigned To: Unassigned
## Related: API-ISS-034, API-ISS-035, API-ISS-036, ADR-UI-004

---

## Overview

The API team has implemented all three Phase 3-5 requirements for the adaptive playlist engine (API-ISS-034/035/036). The UI has Phases 1-4 complete (engine types, strategies, React hook, course player integration). Phase 5 wires the engine to real API endpoints for session persistence and reads adaptive metadata from real LU/course data.

---

## API Contracts

### 1. LU Adaptive Metadata (API-ISS-034)

Available on `GET /api/v2/modules/:moduleId/learning-units`:

```typescript
{
  adaptive?: {
    teachesNodes: string[];
    assessesNodes: string[];
    isGate: boolean;
    isSkippable: boolean;
    gateConfig?: {
      masteryThreshold: number;  // 0-1
      minQuestions: number;
      maxRetries: number;        // -1 = unlimited
      failStrategy: 'allow-continue' | 'hold' | 'inject-practice' | 'prescribe-review';
    };
  }
}
```

### 2. Course Adaptive Settings (API-ISS-035)

Available on `GET /api/v2/courses` and `PATCH /api/v2/courses/:id`:

```typescript
{
  adaptiveSettings: {
    mode: 'off' | 'guided' | 'full';
    allowLearnerChoice: boolean;
    preAssessmentEnabled: boolean;
  }
}
```

### 3. Playlist Session Persistence (API-ISS-036)

```
POST   /api/v2/enrollments/:enrollmentId/playlist-session
  Body: { moduleId, session }
  Response: { id, enrollmentId, moduleId, session, savedAt }

GET    /api/v2/enrollments/:enrollmentId/playlist-session?moduleId=xxx
  Response: { id, enrollmentId, moduleId, session, savedAt } | 404

PUT    /api/v2/enrollments/:enrollmentId/playlist-session/:sessionId
  Body: { session }
  Response: { id, enrollmentId, moduleId, session, savedAt }
```

One session per enrollment+module. POST is an upsert.

---

## Requirements

### Entity Layer Updates
1. Update `src/entities/playlist-session/` — add API functions for session CRUD
2. Add query hooks: `usePlaylistSession`, `useSavePlaylistSession`

### Feature Layer Updates
3. Update `src/features/playlist-engine/hooks/usePlaylistEngine.ts` — load session from API on init, save session on changes (debounced)
4. Read `adaptiveSettings.mode` from course data to select strategy (currently defaults to 'off')
5. Read `adaptive` metadata from LU responses to configure engine entries

### Settings Integration
6. Wire `CourseAdaptiveSettingsPanel` to `PATCH /api/v2/courses/:id` with `adaptiveSettings`
7. Wire `LearningUnitAdaptiveEditor` to `PUT /api/v2/modules/:moduleId/learning-units/:id` with `adaptive`

---

## Files to Modify

| File | Action |
|------|--------|
| `src/entities/playlist-session/api/` | Add API functions |
| `src/entities/playlist-session/hooks/` | Add query hooks |
| `src/features/playlist-engine/hooks/usePlaylistEngine.ts` | Wire to API persistence |
| `src/features/playlist-engine/ui/CourseAdaptiveSettingsPanel.tsx` | Wire save to API |
| `src/features/playlist-engine/ui/LearningUnitAdaptiveEditor.tsx` | Wire save to API |
| `src/pages/learner/player/CoursePlayerPage.tsx` | Pass adaptive settings from course data |

---

## Tests Required

1. [ ] Playlist session API functions — save, load, update
2. [ ] usePlaylistEngine — loads session from API, saves on changes
3. [ ] CourseAdaptiveSettingsPanel — saves to API on submit
4. [ ] LearningUnitAdaptiveEditor — saves to API on submit
5. [ ] Engine initializes with correct strategy based on course adaptiveSettings.mode

---

## Acceptance Criteria

- [ ] Playlist session persists across page reloads via API
- [ ] Engine reads adaptive mode from course data
- [ ] Engine reads LU adaptive metadata for gates/skippable config
- [ ] Instructor settings panels save to real API
- [ ] Existing off-mode behavior unchanged
- [ ] Tests pass
- [ ] Code reviewed

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
