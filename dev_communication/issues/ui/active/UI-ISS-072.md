# UI-ISS-072: Missing Create Matching Game Page

## Status: IN PROGRESS
## Priority: High
## Created: 2026-01-22
## Updated: 2026-01-28
## Requested By: UI Team
## Assigned To: Unassigned
## Related: API-ISS-009, API-ISS-011

---

## Overview

There is no Create Matching Game page for staff to author matching activities and attach them to modules/learning units. This blocks matching-style practice activities in the UI.

---

## Requirements

1. Staff can create a matching game from a dedicated page
2. Activity includes title, description
3. List of pairs (left/right)
4. Add/reorder/delete pairs
5. Optional hints support
6. Activity can be associated with a module/learning unit

---

## Technical Specification

### Evidence

- No matching game authoring page exists under `src/pages/staff`
- Exercise specs mention matching activities, but there is no UI entry point to create them

### Suggested UI/Flow

1. Add "Create Matching Game" CTA in module authoring flows
2. Create a new page (e.g., `src/pages/staff/activities/CreateMatchingGamePage.tsx`)
3. Provide metadata fields and a pair editor with add/reorder/delete
4. Save and return to module editor with the activity attached

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/staff/activities/CreateMatchingGamePage.tsx` | Create | Matching game authoring page |
| Module editor | Modify | Add "Create Matching Game" CTA |

### Approach

Reference `api/agent_coms/ui/specs/ENHANCED_EXERCISE_DELIVERY_SPEC.md` for matching game specifications.

---

## Tests Required

1. [ ] Create Matching Game page is accessible
2. [ ] Activity metadata can be entered
3. [ ] Pairs can be added, edited, reordered, deleted
4. [ ] Activity saves and attaches to module

---

## Acceptance Criteria

- [ ] Create Matching Game page accessible from module authoring
- [ ] Activity title and description fields work
- [ ] Pairs can be added
- [ ] Pairs support left/right content
- [ ] Pairs support optional hints
- [ ] Pairs can be reordered
- [ ] Pairs can be deleted
- [ ] Activity saves correctly
- [ ] Activity attaches to module/learning unit
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

*None at this time*

---

## Implementation Notes

### 2026-01-28: API Response Received - Architecture Updated

**Status Change:** BLOCKED → IN PROGRESS (parallel development approved)

**Key Architecture Decision: Monolithic Question Design**

Matching exercises use the unified Question model instead of separate entities:

```typescript
interface IQuestion {
  questionText: string;          // Column A content
  correctAnswers: string[];      // Column B match
  distractors: string[];         // Extra Column B items (wrong answers)
  questionTypes: QuestionType[]; // Includes 'matching'
  matchingData?: {
    columnAMedia?: MediaContent;
    columnBMedia?: MediaContent;
  };
}
```

**Benefits:** Same content can be used for quizzes, flashcards, and matching without duplication.

**Note:** `MatchingQuestion` component exists (`src/features/exercises/ui/MatchingQuestion.tsx`) for **question type** within quizzes. This issue adds **standalone matching exercises** with drag-and-drop interaction.

### API Contracts Ready

**Matching Exercise Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/content/exercises` | POST | Create matching exercise (type='matching') |
| `/api/v2/content/exercises/:id/matching-session` | GET | Get shuffled pairs for learner |
| `/api/v2/content/exercises/:id/matching-result` | POST | Submit matches |
| `/api/v2/content/exercises/:id/matching-attempts` | GET | Get attempt history |
| `/api/v2/content/exercises/:id/matching-pairs` | PUT | Update pairs (authoring) |

### UI Components to Implement

**Matching Player (Learner):**
```
src/features/matching-player/
├── MatchingExercise.tsx       # Main drag-drop interface
├── MatchingColumn.tsx         # Column A / Column B
├── DraggableItem.tsx          # Draggable answer
├── DropZone.tsx               # Target drop area
└── MatchingResults.tsx        # Results with explanations
```

### Parallel Development Plan

1. **Phase 1 (Now):** Update Question types for monolithic design
2. **Phase 2:** Build matching player components with mock data
3. **Phase 3:** Integrate with API when endpoints ready

**Reference Docs:**
- `memory/entities/question-system.md`
- `contracts/api/matching-exercises.contract.ts`

### 2026-01-28: Moved to Active - API Complete

**Status:** API implementation complete (API-ISS-009, API-ISS-011)
- All matching exercise endpoints are live and ready for integration
- Question model types updated in UI (commit d4abfb0)
- Ready for Phase 2: Build MatchingExercise component

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

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
