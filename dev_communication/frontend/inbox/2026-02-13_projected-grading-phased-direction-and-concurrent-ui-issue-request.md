# Projected Grading Direction (Phase 1 + Phase 2) and Concurrent UI Issue Request

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-054 (in progress), API-ISS-053, UI-ISS-156

---

## Request

API is implementing projected grading in two practical phases (no LLM dependency yet). Please create concurrent UI issues for the surfaces below so FE can progress in parallel.

## Direction

### Phase 1: Short Answer Fuzzy Projection

- Add projected grading metadata for short-answer responses near threshold.
- Near-threshold responses become **projected** and require instructor verification before final grading completion.

### Phase 2: Long Answer Heuristic Projection

- Add projected grading metadata for long-answer responses using non-LLM heuristics:
  - reference answer similarity
  - keyword/rubric coverage
- These remain instructor-verified before final completion.

## Canonical Runtime Expectations

- Final grade authority remains instructor-driven.
- `POST /api/v2/assessment-attempts/:attemptId/grade` remains canonical approval/override path.
- Learner feedback remains hidden until attempt grading is complete.

## Recommended Concurrent UI Issues

1. **Projected Grading Review UI (Staff)**
   - Show per-question projected score/correctness/confidence/review-needed state.
   - Support approve/override workflow via canonical attempt batch grading endpoint.

2. **Projected Grading Indicators (Staff List/Detail)**
   - Show attempt-level “projected grading pending” state.
   - Surface pending review counts and confidence cues.

3. **Learner Results Gating Alignment**
   - Ensure FE respects hidden feedback until grading completion.

## Timeline

- **Needed by:** ASAP
- **Blocking:** completion of staff grading parity migration for projected flows

---

## Response Section (For Recipient)

**Status:** Received
**Response Date:** 2026-02-13

Please confirm created UI issue IDs for the recommended concurrent tracks.

