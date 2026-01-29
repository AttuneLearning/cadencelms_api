# API-ISS-013: Retention Check & Remediation System

## Status: PENDING
## Priority: Medium
## Created: 2026-01-28
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: API-ISS-010, UI-ISS-071
## Depends-On: API-ISS-010 (Flashcard System)

---

## Overview

Implement the retention check and remediation system that verifies learner knowledge retention after module completion. When learners fail retention checks (miss ≥ X flashcards), they must remediate by re-reviewing module content and retaking the final assessment.

See: `dev_communication/specs/learning/FLASHCARD_FLOW_SPEC.md` (Phases 2-4)

---

## Requirements

1. Retention check injection into course choreography
2. Retention check session and submission
3. Failure detection and remediation triggering
4. Remediation tracking (content review + final retake)
5. Course progression blocking during remediation
6. Retention check history

---

## Technical Specification

### Retention Check Flow

```
Module 1 Complete → Continue Course → [Retention Check: Module 1] →
  ├─ Pass (< X incorrect) → Continue
  └─ Fail (≥ X incorrect) → Remediation Required
      ├─ Re-review Module 1 content
      ├─ Retake Module 1 final
      └─ Then continue
```

### Models

#### RetentionCheck

```typescript
interface IRetentionCheck {
  id: string;
  learnerId: ObjectId;
  courseId: ObjectId;
  sourceModuleId: ObjectId;          // Module whose cards are being checked

  // Context
  triggeredAtModuleId: ObjectId;     // Where in course this was triggered
  triggeredAt: Date;

  // Configuration (snapshot from CourseFlashcardConfig)
  cardCount: number;
  failureThreshold: number;

  // Cards selected
  questionIds: ObjectId[];           // Questions used in this check

  // Status
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: Date;
  completedAt?: Date;

  // Results
  results?: {
    questionId: ObjectId;
    correct: boolean;
    quality: number;
    timeSpent: number;
  }[];

  correctCount?: number;
  incorrectCount?: number;
  passed?: boolean;

  // Remediation
  remediationRequired: boolean;
  remediationId?: ObjectId;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Remediation

```typescript
interface IRemediation {
  id: string;
  learnerId: ObjectId;
  courseId: ObjectId;
  moduleId: ObjectId;                // Module requiring remediation

  // Trigger
  triggeredByCheckId: ObjectId;
  triggeredAt: Date;

  // Requirements (from CourseFlashcardConfig)
  requireContentReview: boolean;
  requireFinalRetake: boolean;

  // Progress
  status: 'pending' | 'content_reviewed' | 'final_retaken' | 'completed';

  contentReviewedAt?: Date;
  contentItemsViewed?: string[];     // Track which items viewed

  finalRetakeAttemptId?: ObjectId;
  finalRetakenAt?: Date;
  finalPassed?: boolean;

  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/courses/:courseId/retention-checks/pending` | Get pending checks |
| GET | `/api/v2/courses/:courseId/retention-checks/:checkId` | Get check cards |
| POST | `/api/v2/courses/:courseId/retention-checks/:checkId/submit` | Submit answers |
| GET | `/api/v2/courses/:courseId/retention-checks/history` | Get history |
| GET | `/api/v2/courses/:courseId/remediations/active` | Get active remediations |
| POST | `/api/v2/courses/:courseId/remediations/:id/content-reviewed` | Mark content reviewed |
| GET | `/api/v2/courses/:courseId/remediations/:id/status` | Get remediation status |

### Retention Check Selection

```typescript
async function selectRetentionCheckCards(courseId, moduleId, learnerId, cardCount) {
  // Get questions from module with 'flashcard' type
  const questions = await Question.find({
    moduleId,
    questionTypes: 'flashcard',
    isActive: true
  });

  // Get learner progress for these questions
  const progress = await FlashcardProgress.find({
    learnerId,
    questionId: { $in: questions.map(q => q._id) }
  });

  // Selection strategy based on config
  // - random: Random selection
  // - weighted_by_difficulty: Favor harder cards
  // - sm2_priority: Favor cards due for review

  return selectCards(questions, progress, cardCount, selectionMethod);
}
```

### Remediation Workflow

```typescript
async function checkRemediationStatus(remediationId) {
  const remediation = await Remediation.findById(remediationId);

  // Check if content review complete
  if (remediation.requireContentReview && !remediation.contentReviewedAt) {
    return { status: 'pending', nextStep: 'content_review' };
  }

  // Check if final retake complete
  if (remediation.requireFinalRetake && !remediation.finalRetakenAt) {
    return { status: 'content_reviewed', nextStep: 'final_retake' };
  }

  // Check if final passed
  if (remediation.requireFinalRetake && !remediation.finalPassed) {
    return { status: 'final_retaken', nextStep: 'retake_again' };
  }

  // All complete
  return { status: 'completed', nextStep: null };
}
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/models/activity/RetentionCheck.model.ts` | Create | Retention check tracking |
| `src/models/activity/Remediation.model.ts` | Create | Remediation tracking |
| `src/services/assessment/retention-check.service.ts` | Create | Check business logic |
| `src/services/assessment/remediation.service.ts` | Create | Remediation logic |
| `src/controllers/assessment/retention-check.controller.ts` | Create | Route handlers |
| `src/routes/retention-check.routes.ts` | Create | Route definitions |
| `contracts/api/flashcards.contract.ts` | Update | Already has retention contracts |
| `tests/integration/retention-check.test.ts` | Create | Integration tests |

### Approach

1. **Phase 1: Models**
   - Create RetentionCheck model
   - Create Remediation model
   - Add indexes

2. **Phase 2: Retention Check Service**
   - Card selection logic
   - Check creation when module completes
   - Result evaluation
   - Remediation triggering

3. **Phase 3: Remediation Service**
   - Remediation creation
   - Status tracking
   - Content review confirmation
   - Final retake integration

4. **Phase 4: API Endpoints**
   - Create routes and controllers
   - Add validation
   - Add authorization

5. **Phase 5: Course Integration**
   - Hook into module completion
   - Block progression during remediation
   - Update learner course view

---

## Tests Required

1. [ ] Retention check created when module completes
2. [ ] Check not created when flashcardsPerCheck = 0
3. [ ] Correct number of cards selected
4. [ ] Submit check: pass when < threshold incorrect
5. [ ] Submit check: fail when >= threshold incorrect
6. [ ] Remediation created on check failure
7. [ ] Content review can be marked complete
8. [ ] Final retake tracked
9. [ ] Remediation completes when all steps done
10. [ ] Course progression blocked during active remediation
11. [ ] History returns all checks for learner

---

## Acceptance Criteria

- [ ] RetentionCheck model created
- [ ] Remediation model created
- [ ] Retention checks created at correct times
- [ ] Card selection respects configuration
- [ ] Check submission evaluates correctly
- [ ] Remediation triggered on failure
- [ ] Remediation workflow tracks all steps
- [ ] Course progression blocked appropriately
- [ ] All tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **How is content review verified?**
   Time-on-page or explicit "Mark as reviewed" - TBD with UI team

2. **What if learner fails final retake during remediation?**
   They must retake again until passing

3. **Can remediation be bypassed by instructor?**
   Future feature - not for MVP

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
