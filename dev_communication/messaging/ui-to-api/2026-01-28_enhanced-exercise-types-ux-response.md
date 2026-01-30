# Message: Enhanced Exercise Types - UX Response

**Date:** 2026-01-28
**From:** UI Team
**To:** API Team
**Priority:** High
**Type:** Response
**In-Response-To:** `api-to-ui/2026-01-28_api_enhanced-exercise-types-response.md`
**Related Issues:** UI-ISS-071, UI-ISS-072, API-ISS-009 through API-ISS-013

---

## Summary

Thank you for the comprehensive architecture response. We've reviewed the monolithic Question design and API contracts. Below are our answers to your UX questions and our parallel development plan.

---

## Question 1: Retention Check UI

**Recommendation:** Inline Learning Unit in Module List (with modal fallback)

| Option | Pros | Cons |
|--------|------|------|
| Modal Overlay | Immediate attention, can't skip | Interrupts flow, feels punitive |
| Inline Learning Unit | Natural course flow, less jarring | Could be scrolled past |
| Dedicated Page | Full-screen focus | Navigation overhead |

**Our Approach:**

1. **Primary:** Insert retention checks as inline "checkpoint" units between modules
   - Appears as a card in the course progression list
   - Visual indicator: different color/icon to distinguish from regular modules
   - Learner clicks to begin, results shown inline

2. **Fallback Modal:** If learner tries to skip past a pending retention check:
   - Soft modal: "Complete your retention check before continuing"
   - Still allows reviewing previous content

**UI Components:**
```
src/features/retention-check/
├── RetentionCheckCard.tsx      # Inline card in course list
├── RetentionCheckModal.tsx     # Soft block if skipped
├── RetentionCheckExercise.tsx  # The actual flashcard review
└── RetentionCheckResults.tsx   # Pass/fail with next steps
```

---

## Question 2: Remediation UX

**Design Principles:**
- Non-punitive language ("Review needed" not "You failed")
- Clear progress indicators
- Learner autonomy where possible

**Implementation:**

### 2.1 Which Module Requires Re-review

- **Banner at top of course view:** "Module Review Required: [Module Name]"
- **Visual state on module card:** Orange outline with "Review Required" badge
- **Progress bar:** Changes to orange/warning color for affected modules

### 2.2 Progress Through Remediation Steps

Three-step progress indicator (similar to checkout flow):

```
[1. Review Content] → [2. Practice Flashcards] → [3. Retake Final]
     ●                      ○                        ○
```

- Show in course header during remediation
- Checkmarks for completed steps
- Current step highlighted

### 2.3 Course Progression is Blocked

**Visual Treatment:**
- **Locked Module Icon:** Future modules show lock icon
- **Tooltip:** "Complete remediation to unlock"
- **Disabled state:** Click shows helpful message, not error

**Messaging Approach:**
- "Before moving on, let's make sure you've mastered [Module Name]"
- "You're almost there! Complete your review to continue"
- Avoid: "You failed" / "Access denied" / "Blocked"

**UI Components:**
```
src/features/remediation/
├── RemediationBanner.tsx       # Top-of-page alert
├── RemediationProgress.tsx     # Step indicator
├── LockedModuleOverlay.tsx     # Visual lock state
└── RemediationComplete.tsx     # Success celebration
```

---

## Question 3: Flashcard Builder Features

### 3.1 Anki/Quizlet Import

**Recommendation:** Phase 2 feature (not MVP)

**Reasoning:**
- Adds significant complexity (format parsing, error handling)
- Most staff will create cards from scratch or module content
- Can add later based on user demand

**If implemented later:**
- Support Anki `.apkg` export format (SQLite-based)
- Support Quizlet export CSV format
- Import wizard with field mapping preview

### 3.2 AI-Assisted Card Generation

**Recommendation:** Phase 2 feature (high value, but not MVP)

**Potential Implementation:**
1. Staff selects module content sections
2. System generates card suggestions from text
3. Staff reviews/edits/approves each card
4. Approved cards added to deck

**API Consideration:** Would need:
- `POST /api/v2/modules/:moduleId/flashcards/generate-suggestions`
- Returns suggested cards (not saved until approved)

**For MVP:**
- Manual card creation with rich text/media
- Bulk CSV import (simple format: front, back, hint)
- Copy/paste from module content

---

## Our Parallel Development Plan

### Phase 1: Foundation (Now)
- [x] Update Question types for monolithic design (UI-ISS-071, UI-ISS-072)
- [ ] Create shared drag-drop primitives (@dnd-kit integration)
- [ ] Build CardFlip animation component

### Phase 2: Mock Data Development
- [ ] FlashcardEditor with local state (no API)
- [ ] FlashcardPractice player component
- [ ] MatchingExercise player component
- [ ] RetentionCheckCard inline component

### Phase 3: API Integration
- [ ] Connect to flashcard endpoints when ready
- [ ] Connect to matching endpoints when ready
- [ ] Connect to retention/remediation endpoints

### Phase 4: Polish
- [ ] Anki/Quizlet import (if prioritized)
- [ ] AI-assisted generation (if prioritized)
- [ ] Accessibility audit (keyboard navigation for drag-drop)

---

## Questions for API Team

1. **Mastery Algorithm:** For flashcard practice sessions, what algorithm determines card selection?
   - Simple random?
   - Spaced repetition (SM-2 or similar)?
   - Weighted by recent performance?

2. **Offline Support:** Any consideration for offline flashcard practice?
   - Would require local caching of card data
   - Sync results when back online

3. **Analytics:** What learner analytics should we expose?
   - Time spent per card
   - Cards mastered over time
   - Problem cards (frequently wrong)

---

## Contract Review Complete

We've reviewed the contracts in `contracts/api/`. No changes needed - they cover our requirements.

**Confirmed:**
- `flashcards.contract.ts` - Matches our component data needs
- `matching-exercises.contract.ts` - Supports drag-drop interaction model
- `media-types.ts` - MediaContent structure works for rich cards

---

## Next Steps

**UI Team:**
- Begin Phase 1 foundation work immediately
- Build mock-data components for parallel testing
- Target: Components ready for API integration within 1-2 development cycles

**API Team:**
- Continue with implementation order: ISS-009 → ISS-010/011/012 → ISS-013
- Notify UI when endpoints are ready for integration testing

---

*Message from UI Team - 2026-01-28*
