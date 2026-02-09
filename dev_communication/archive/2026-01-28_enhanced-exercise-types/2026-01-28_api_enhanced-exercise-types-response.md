# Message: Enhanced Exercise Types - API Response

**Date:** 2026-01-28
**From:** API Team
**To:** UI Team
**Priority:** High
**Type:** Response
**In-Response-To:** `ui-to-api/2026-01-28_enhanced-exercise-types-api-request.md`
**Related Issues:** UI-ISS-071, UI-ISS-072

---

## Status

**Planning Complete** - Ready for implementation.

## Summary

The API team has reviewed your request for Enhanced Exercise Types (Flashcard and Matching) and has completed the following:

1. **Spec Approved** - `ENHANCED_EXERCISE_DELIVERY_SPEC.md` is approved for implementation
2. **Flashcard Flow Spec Created** - Detailed specification for the flashcard system with retention checks
3. **API Contracts Created** - Full contracts for all requested endpoints
4. **MediaContent Types Defined** - Rich media support per the full spec
5. **API Issues Created** - 5 implementation issues (API-ISS-009 through API-ISS-013)
6. **Monolithic Question Design** - Key architecture decision for content reuse

---

## Important: Flashcard Architecture Update

Based on discussions about course module flow (~15 min modules), we have **enhanced the flashcard architecture** beyond the original spec:

### Key Changes from Original Spec

| Original Spec | New Architecture |
|---------------|------------------|
| Flashcards as standalone exercise | Flashcards integrated into course choreography |
| Exercise-level tracking | Course-level tracking with per-module flashcards |
| No retention checks | Configurable retention checks after module completion |
| No remediation | Automatic remediation when threshold exceeded |

### Flashcard Flow Summary

1. **In-Module Practice**: Flashcards shown during module, until learner passes final event
2. **Post-Completion Retention**: Random flashcards from completed modules inserted into course flow
3. **Remediation**: If learner fails ≥ X flashcards, they must re-review module and retake final

See full specification: `dev_communication/specs/learning/FLASHCARD_FLOW_SPEC.md`

---

## API Issues Created

| Issue | Title | Priority | Dependencies |
|-------|-------|----------|--------------|
| API-ISS-009 | Question Model - Monolithic Design Update | High | Foundation |
| API-ISS-010 | Flashcard System Implementation | High | API-ISS-009 |
| API-ISS-011 | Matching Exercise Implementation | High | API-ISS-009 |
| API-ISS-012 | Media Upload System (S3 + Local) | High | None |
| API-ISS-013 | Retention Check & Remediation System | Medium | API-ISS-010 |

**Implementation Order:** ISS-009 (foundation) → ISS-010/011/012 (parallel) → ISS-013

---

## Key Architecture: Monolithic Question Design

Instead of separate `FlashcardItem` and `MatchingPair` entities, we're using a **single Question model** that supports multiple presentations:

```typescript
interface IQuestion {
  // Universal fields
  questionText: string;          // Prompt / front-of-card / Column A
  correctAnswers: string[];      // Answers / back-of-card / Column B match
  distractors: string[];         // Wrong answers (for MC/matching)

  // Type support array
  questionTypes: QuestionType[]; // ['multiple_choice', 'flashcard', 'matching']

  // Type-specific extensions (optional)
  flashcardData?: { prompts: [], backMedia, frontMedia };
  matchingData?: { columnAMedia, columnBMedia };
}
```

**Benefits:**
- One Question → multiple exercise types (content reuse)
- Same content for quizzes, flashcards, and matching without duplication
- Unified question bank management
- Consistent authoring experience

**Documentation:** `memory/entities/question-system.md`

---

## Contracts Created

### 1. Media Types (`contracts/types/media-types.ts`)

Full MediaContent support per spec:
- `MediaContent` - text + optional media attachments
- `MediaAttachment` - image/video/audio with metadata
- `MediaLayout` - 7 layout options (text_only, media_above, media_left, etc.)
- `MediaConstraints` - file size and type limits

### 2. Media Upload (`contracts/api/media.contract.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/media/upload-url` | POST | Request presigned upload URL |
| `/api/v2/media/confirm` | POST | Confirm upload and process |
| `/api/v2/media/:mediaId` | GET | Get media details |
| `/api/v2/media/:mediaId` | DELETE | Delete media |
| `/api/v2/media` | GET | List media with filters |

**Note:** S3 support built-in with local storage fallback for development.

### 3. Flashcards (`contracts/api/flashcards.contract.ts`)

#### Authoring (Module-level)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/modules/:moduleId/flashcards` | GET | List flashcards in module |
| `/api/v2/modules/:moduleId/flashcards` | POST | Create flashcard |
| `/api/v2/modules/:moduleId/flashcards/:cardId` | PUT | Update flashcard |
| `/api/v2/modules/:moduleId/flashcards/:cardId` | DELETE | Delete flashcard |
| `/api/v2/modules/:moduleId/flashcards/bulk` | POST | Bulk create |
| `/api/v2/modules/:moduleId/flashcards/reorder` | PATCH | Reorder |

#### Course Configuration
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/courses/:courseId/flashcard-config` | GET | Get flashcard settings |
| `/api/v2/courses/:courseId/flashcard-config` | PUT | Update settings |

#### Learner Sessions
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/courses/:courseId/flashcard-session` | GET | Get practice cards |
| `/api/v2/courses/:courseId/flashcard-result` | POST | Record card result |
| `/api/v2/courses/:courseId/flashcard-progress` | GET | Get progress overview |
| `/api/v2/courses/:courseId/flashcard-progress` | DELETE | Reset progress |

#### Retention Checks
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/courses/:courseId/retention-checks/pending` | GET | Get pending checks |
| `/api/v2/courses/:courseId/retention-checks/:checkId` | GET | Get check cards |
| `/api/v2/courses/:courseId/retention-checks/:checkId/submit` | POST | Submit answers |
| `/api/v2/courses/:courseId/retention-checks/history` | GET | Get history |

#### Remediation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/courses/:courseId/remediations/active` | GET | Get active remediations |
| `/api/v2/courses/:courseId/remediations/:id/content-reviewed` | POST | Mark content reviewed |
| `/api/v2/courses/:courseId/remediations/:id/status` | GET | Get remediation status |

### 4. Matching Exercises (`contracts/api/matching-exercises.contract.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/content/exercises` | POST | Create matching exercise (type='matching') |
| `/api/v2/content/exercises/:id/matching-session` | GET | Get shuffled pairs for learner |
| `/api/v2/content/exercises/:id/matching-result` | POST | Submit matches |
| `/api/v2/content/exercises/:id/matching-attempts` | GET | Get attempt history |
| `/api/v2/content/exercises/:id/matching-pairs` | PUT | Update pairs (authoring) |

---

## Configuration Defaults

### Course Flashcard Config

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Flashcard system enabled |
| `flashcardsPerCheck` | `3` | Cards per retention check |
| `failureThreshold` | `2` | Incorrect answers before remediation |
| `checkFrequency` | `'every_module'` | When to inject retention checks |
| `requireContentReview` | `true` | Must re-review content on remediation |
| `requireFinalRetake` | `true` | Must retake final event on remediation |

**Special:** Setting `flashcardsPerCheck = 0` disables retention checks entirely.

---

## UI Component Recommendations

### Flashcard Authoring
```
src/features/flashcard-builder/
├── FlashcardEditor.tsx        # Rich media card editor
├── FlashcardList.tsx          # Sortable list with drag-drop
├── FlashcardBulkImport.tsx    # CSV import
└── FlashcardPreview.tsx       # Card flip preview
```

### Flashcard Player (Learner)
```
src/features/flashcard-player/
├── FlashcardPractice.tsx      # In-module practice mode
├── RetentionCheck.tsx         # Retention check UI (graded)
├── CardFlip.tsx               # Animated card flip
└── RemediationNotice.tsx      # "Module review required" banner
```

### Matching Player
```
src/features/matching-player/
├── MatchingExercise.tsx       # Main drag-drop interface
├── MatchingColumn.tsx         # Column A / Column B
├── DraggableItem.tsx          # Draggable answer
├── DropZone.tsx               # Target drop area
└── MatchingResults.tsx        # Results with explanations
```

---

## Questions for UI Team

1. **Retention Check UI**: Should retention checks appear as:
   - Modal overlay interrupting course flow?
   - Inline learning unit in the module list?
   - Dedicated page?

2. **Remediation UX**: When remediation is triggered, how should we indicate:
   - Which module requires re-review?
   - Progress through remediation steps?
   - Course progression is blocked?

3. **Flashcard Builder**: Should the builder support:
   - Importing from Anki/Quizlet formats?
   - AI-assisted card generation from module content?

---

## Next Steps

**API Team:**
- [ ] Begin implementation with API-ISS-009 (Question model update)
- [ ] Implement API-ISS-012 (Media upload) in parallel

**UI Team:**
- [ ] Review contracts in `contracts/` directory
- [ ] Review monolithic Question design in `memory/entities/question-system.md`
- [ ] Flag any contract changes needed before implementation begins
- [ ] Respond to UI questions above (retention check UI, remediation UX, builder features)
- [ ] Create/update UI issues for authoring pages based on Question structure

---

## Files Created/Modified

### New Files
- `dev_communication/specs/learning/FLASHCARD_FLOW_SPEC.md` - v1.1.0 with Question integration
- `memory/entities/question-system.md` - Monolithic Question design documentation
- `contracts/types/question-types.ts` - Question type definitions
- `contracts/types/media-types.ts` - Media type definitions
- `contracts/api/flashcards.contract.ts` - Flashcard API contract
- `contracts/api/media.contract.ts` - Media upload API contract
- `contracts/api/matching-exercises.contract.ts` - Matching exercise API contract
- `dev_communication/issues/api/queue/API-ISS-009_question_model_monolithic_design.md`
- `dev_communication/issues/api/queue/API-ISS-010_flashcard_system_implementation.md`
- `dev_communication/issues/api/queue/API-ISS-011_matching_exercise_implementation.md`
- `dev_communication/issues/api/queue/API-ISS-012_media_upload_system.md`
- `dev_communication/issues/api/queue/API-ISS-013_retention_check_remediation_system.md`

### Modified Files
- `dev_communication/issues/index.md` - Updated issue counts and next number

---

*Message from API Team - 2026-01-28 (Updated)*
