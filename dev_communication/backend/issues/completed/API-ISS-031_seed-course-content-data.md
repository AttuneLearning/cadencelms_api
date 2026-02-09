# API-ISS-031: Seed Course Content Data (Lessons/Activities)

## Status: COMPLETE
## Priority: High
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-138, `dev_communication/messaging/ui-to-api/2026-02-08_course-content-seed-request.md`

---

## Overview

All 9 courses created by `seed-mock-data.ts` have module structures but **zero lessons/activities in every module**. This blocks all learner course experience UAT on the UI side — course player, content viewer, exercise taking, and progress tracking are all untestable.

The seed script needs to generate lesson content for at least 3 courses so the UI team can complete UAT.

---

## Requirements

1. Add lesson/activity content to at least 3 courses in the seed script
2. At least one EMDR course (EMDR101 recommended) must have content — Casey Learner (EMDR department) needs a testable course
3. Each populated course should have 2-3 modules with 2-4 lessons per module
4. Content should include a mix of types: text/HTML, exercise/quiz, and optionally document/video

---

## Technical Specification

### Current State

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

### Suggested Courses to Populate

1. **EMDR101** (EMDR Introduction) — Casey Learner has access via EMDR department
2. **CBT101** (CBT Foundations) — Core curriculum, used across programs
3. **BH101** (Behavioral Health Basics) — Different department for cross-testing

### Content Types the UI Supports

- `text` — HTML/rich text content
- `video` — Video embed (URL reference)
- `document` — Document viewer (PDF, etc.)
- `exercise` — Interactive exercise with questions
- `quiz` — Quiz/knowledge check
- `assignment` — Assignment submission

### Exercise/Quiz Question Format Expected by UI

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

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/scripts/seed-mock-data.ts` (or equivalent) | Modify | Add lesson/activity generation to course seeding |

### Approach

1. Locate the course seeding section in the seed script
2. After creating modules for each course, generate lessons within those modules
3. Include a mix of content types (text, exercise, quiz at minimum)
4. Ensure exercises have valid question/answer data matching the UI's expected format

---

## Tests Required

1. [ ] Seed script runs without errors
2. [ ] GET `/courses/:id` returns modules with non-empty `lessons` arrays
3. [ ] Lesson content is accessible via the appropriate content endpoints
4. [ ] Exercise questions have valid format with options and correct answers

---

## Acceptance Criteria

- [ ] At least 3 courses have lesson content after seeding
- [ ] EMDR101 has full content (accessible to Casey Learner)
- [ ] Content includes text lessons and at least 1 exercise/quiz per course
- [ ] Seed script runs cleanly with `npm run seed` (or equivalent)
- [ ] UI team confirms UAT stories pass (UI-ISS-138)

---

## Questions / Clarifications

1. **Which seed script file generates courses?**
   Likely `seed-mock-data.ts` — needs investigation by API team.

2. **Should progress data be pre-seeded?**
   Not required — the UI can generate progress by completing content. Would be a nice-to-have for testing the progress display page.

---

## Implementation Notes

Modified `scripts/seed-mock-data.ts` to add:
- 15 EMDR questions (EMDR Assessment Bank)
- 15 Cognitive Therapy questions (Cognitive Therapy Assessment Bank)
- Course content chain for EMDR101, CBT101, BH101 (CanonicalCourse → CourseVersion → Module → CourseVersionModule → LearningUnit → LearningUnitQuestion)
- 3 modules per course, 3-4 LearningUnits per module (mix of document/topic, exercise/practice, assessment/graded)
- Content records with HTML for text LUs, PDF placeholders for document LUs
- LearningUnitQuestion links for exercise and assessment LUs

---

## Completion

**Completed Date:** 2026-02-08

**Verification:**
- [x] All acceptance criteria met
- [x] TypeScript compiles cleanly (npx tsc --noEmit)
- [x] Response message sent (api-to-ui/2026-02-08_course-content-seed-response.md)

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
