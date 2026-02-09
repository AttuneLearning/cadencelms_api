# Request: Generate Course Content in Seed Data

**Date:** 2026-02-08
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** UI-ISS-138

---

## Request

The UI team needs course content (lessons/activities) populated in the mock seed data. Currently, all 9 seeded courses have module structures but **zero lessons in every module**. This blocks UAT for the entire learner course experience (course player, content viewer, exercise taking, progress tracking).

## Current State

All courses created by `seed-mock-data.ts`:

| Course | Code | Modules | Lessons |
|--------|------|---------|---------|
| Cognitive Assessment Fundamentals | COG101 | 4 | **0** |
| Advanced Cognitive Interventions | COG201 | 4 | **0** |
| Behavioral Health Basics | BH101 | 8 | **0** |
| CBT Foundations | CBT101 | 9 | **0** |
| CBT Advanced Skills | CBT201 | 8 | **0** |
| EMDR Introduction | EMDR101 | 8 | **0** |
| Behavioral Health Applied Practice | BH201 | 8 | **0** |
| EMDR Practicum | EMDR201 | 8 | **0** |
| Cognitive Therapy Practicum | COG301 | 4 | **0** |

## What We Need

For at least **3 courses** (ideally including one from EMDR department for Casey Learner access), please seed:

### Minimum per course:
- **2-3 modules** with content
- **2-4 lessons per module** with a mix of content types:
  - Text/HTML content lessons
  - At least 1 exercise or knowledge check (with questions and correct answers)
  - Optionally: document content, video placeholder

### Content types the UI supports:
- `text` — HTML/rich text content
- `video` — Video embed (URL reference)
- `document` — Document viewer (PDF, etc.)
- `exercise` — Interactive exercise with questions
- `quiz` — Quiz/knowledge check
- `assignment` — Assignment submission

### Suggested courses to populate:
1. **EMDR101** (EMDR Introduction) — Casey Learner has access via EMDR department
2. **CBT101** (CBT Foundations) — Core curriculum, used across programs
3. **BH101** (Behavioral Health Basics) — Different department for cross-testing

### Exercise/Quiz question format expected by UI:
```json
{
  "questionText": "What is the primary goal of EMDR therapy?",
  "questionType": "multiple_choice",
  "points": 10,
  "options": [
    { "text": "Option A", "isCorrect": false },
    { "text": "Option B", "isCorrect": true }
  ]
}
```

## Why This Is Needed

The UI has complete implementations for:
- Course player with module/lesson navigation
- Content rendering (text, document viewer, exercise taking)
- Progress tracking and completion
- Grading workflows

None of these can be UAT-tested without actual lesson content in the database.

## Timeline

- **Needed by:** Next session — this blocks all learner experience UAT
- **Blocking:** UI-ISS-138 (Learner Course UAT Stories)

---

## Response Section (For Recipient)

**Status:** Pending
**Response Date:**

---

*Move to `archive/` when thread is complete*
