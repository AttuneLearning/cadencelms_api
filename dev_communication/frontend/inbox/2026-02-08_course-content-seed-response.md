# Response: Course Content Seed Data Ready

**Date:** 2026-02-08
**From:** API Team
**To:** UI Team
**Priority:** High
**In Response To:** `ui-to-api/2026-02-08_course-content-seed-request.md`
**Related Issues:** API-ISS-031 (completed), UI-ISS-138

---

## Status: COMPLETE

The seed script (`scripts/seed-mock-data.ts`) has been updated with full course content for 3 courses.

## What Was Added

### Two New Question Banks

1. **EMDR Assessment Bank** — 15 domain-specific questions covering EMDR theory, phases, bilateral stimulation, clinical application, and safety/ethics
2. **Cognitive Therapy Assessment Bank** — 15 questions covering Beck scales, case formulation, cognitive restructuring, schema work, and Socratic questioning

All questions include: `correctAnswers`, `distractors`, `explanation`, `difficulty`, `flashcardData`, `matchingPairs`

### Course Content for 3 Courses

Each course follows the chain: `CanonicalCourse → CourseVersion (published) → Module → CourseVersionModule → LearningUnit → LearningUnitQuestion`

#### EMDR101 (EMDR Introduction) — 3 modules, 10 learning units
- Module 1: "Foundations of EMDR Theory" (3 LUs: text topic, document topic, graded assessment)
- Module 2: "The Eight Phases of EMDR" (4 LUs: text topic, practice exercise, document topic, graded quiz)
- Module 3: "EMDR Clinical Application" (3 LUs: text topic, practice exercise, graded final assessment)

#### CBT101 (CBT Foundations) — 3 modules, 10 learning units
- Module 1: "Introduction to CBT" (3 LUs: text topic, document topic, graded assessment)
- Module 2: "Cognitive Distortions" (4 LUs: text topic, practice exercise, document topic, graded quiz)
- Module 3: "CBT Techniques in Practice" (3 LUs: text topic, practice exercise, graded final assessment)

#### BH101 (Behavioral Health Basics) — 3 modules, 10 learning units
- Module 1: "Introduction to Behavioral Health" (3 LUs: text topic, document topic, graded assessment)
- Module 2: "Assessment and Screening" (4 LUs: text topic, practice exercise, document topic, graded quiz)
- Module 3: "Intervention Strategies" (3 LUs: text topic, practice exercise, graded final assessment)

### Learning Unit Types Used

| LU Type | Category | Has Content Record | Has Questions |
|---------|----------|--------------------|---------------|
| `document` | `topic` | Yes (type='text' with HTML or type='document' with PDF URL) | No |
| `exercise` | `practice` | No | Yes (4 questions each) |
| `assessment` | `graded` | No | Yes (5-6 questions each) |

### Content Records

Text-type Content records include `metadata.htmlContent` with actual domain-relevant HTML content (EMDR phases, CBT cognitive model, BH assessment methods, etc.)

Document-type Content records include placeholder `fileUrl`, `mimeType`, and `fileSize` values.

## How to Run

```bash
# Re-seed the mock database
ENV_FILE=.env.mock npx ts-node scripts/seed-mock-data.ts
```

The course content seeding is idempotent — it checks for existing CanonicalCourse records before creating.

## Learner Access

- **Casey Learner** (`casey.learner@lms.edu`) has EMDR101 access via EMDR department
- **Alex Learner** (`alex.learner@lms.edu`) has CBT101 access via Cognitive department
- **Jordan Student** (`jordan.student@lms.edu`) has BH101 access via Behavioral Health department

## Notes

- Questions are linked to LearningUnits via `LearningUnitQuestion` records with `bankId` references
- Assessment LUs have settings: `{ passingScore: 70, showFeedback: true, shuffleQuestions: true }`
- Exercise LUs have settings: `{ passingScore: 70, showFeedback: true }`

---

*Move to `archive/` when thread is complete*
