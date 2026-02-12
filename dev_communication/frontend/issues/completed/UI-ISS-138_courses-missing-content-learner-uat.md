# UI-ISS-138: Learner Courses Have No Content — Seed Data + UAT Coverage

## Status: IN PROGRESS
## Priority: High
## Created: 2026-02-08
## Updated: 2026-02-09
## Requested By: Internal (UAT)
## Assigned To: Unassigned
## Related: API-ISS-031, API-ISS-033, UI-ISS-143, `dev_communication/messaging/ui-to-api/2026-02-08_course-content-seed-request.md`
## Blocked-By: None (API-ISS-031 resolved — seed data available)

---

## Overview

All courses in the mock database have module structures but **zero lessons/activities in every module**. This means learners like Casey Learner (casey.learner@lms.edu, EMDR department) cannot access any course content. The course player, content viewer, and all learner course experience pages are untestable.

**Investigation results (admin-level access):**

| Course | Code | Modules | Lessons |
|--------|------|---------|---------|
| Cognitive Assessment Fundamentals | COG101 | 4 | 0 |
| Advanced Cognitive Interventions | COG201 | 4 | 0 |
| Behavioral Health Basics | BH101 | 8 | 0 |
| CBT Foundations | CBT101 | 9 | 0 |
| CBT Advanced Skills | CBT201 | 8 | 0 |
| EMDR Introduction | EMDR101 | 8 | 0 |
| Behavioral Health Applied Practice | BH201 | 8 | 0 |
| EMDR Practicum | EMDR201 | 8 | 0 |
| Cognitive Therapy Practicum | COG301 | 4 | 0 |

All courses return `modules: [...]` with entries, but each module has `lessons: []` (empty).

**Casey Learner's access scope:**
- Department: EMDR (course-taker role)
- Can only view EMDR courses directly; other department courses return 403
- Has class enrollments for: COG101, COG201, BH101, CBT101, CBT201, EMDR101, BH201

---

## Requirements

1. API team generates lesson/activity content for at least 3 courses (minimum: 1 with text content, 1 with exercises, 1 with mixed content types)
2. At least one course accessible to Casey Learner (EMDR department) has full content
3. UI team writes and validates UAT stories for the learner course experience
4. UAT stories pass successfully against populated course data

---

## UAT Stories

### UAT-1: Learner Can View My Courses List

**As** a learner,
**I want** to see a list of my enrolled courses,
**So that** I can choose which course to study.

**Acceptance Criteria:**
- [ ] Navigate to `/learner/courses` or `/learner/learning`
- [ ] Page renders without errors
- [ ] At least one course card shows course title, progress, and enrollment status
- [ ] Course card links to course player or detail page

### UAT-2: Learner Can Open Course Player

**As** a learner,
**I want** to open a course and see its content structure,
**So that** I can navigate through modules and lessons.

**Acceptance Criteria:**
- [ ] Click a course from My Courses
- [ ] Course player page (`/learner/courses/:courseId/player`) loads without errors
- [ ] Module sidebar or navigation shows the course's module structure
- [ ] At least one module contains one or more lessons/activities

### UAT-3: Learner Can Load and View Content

**As** a learner,
**I want** to open a lesson and see its content,
**So that** I can study the material.

**Acceptance Criteria:**
- [ ] Click a lesson within a module
- [ ] Content area renders the lesson content (text, video embed, document, etc.)
- [ ] No "content not found" or empty state errors for populated lessons
- [ ] Content renders correctly in both light and dark modes

### UAT-4: Learner Can Navigate Between Lessons

**As** a learner,
**I want** to navigate between lessons within a course,
**So that** I can progress through the material sequentially.

**Acceptance Criteria:**
- [ ] Next/Previous navigation buttons are visible
- [ ] Clicking Next advances to the next lesson
- [ ] Clicking Previous returns to the previous lesson
- [ ] Navigation wraps between modules correctly (last lesson of M1 -> first lesson of M2)

### UAT-5: Learner Can Take an Exercise

**As** a learner,
**I want** to complete an exercise or knowledge check within a course,
**So that** I can test my understanding.

**Acceptance Criteria:**
- [ ] Exercise activity loads in the course player or exercise page
- [ ] Questions render with interactive answer inputs
- [ ] Submit button is clickable and processes the attempt
- [ ] Results page shows score and feedback

### UAT-6: Learner Can View Course Progress

**As** a learner,
**I want** to see my progress through a course,
**So that** I know how much I've completed.

**Acceptance Criteria:**
- [ ] Progress indicator visible on course player (e.g., progress bar, percentage)
- [ ] Completed lessons are visually marked
- [ ] `/learner/courses/:courseId/progress` page loads and shows accurate progress

---

## Implementation

### Prerequisites (API Team)
- Seed script must generate lesson content for courses
- See message: `dev_communication/messaging/ui-to-api/2026-02-08_course-content-seed-request.md`

### UI Verification Steps
Once content is seeded:

1. Login as `casey.learner@lms.edu` / `Password123!`
2. Navigate to `/learner/courses` — verify course list renders
3. Click a course with content — verify player loads
4. Click a lesson — verify content renders
5. Navigate between lessons — verify next/previous works
6. Attempt an exercise — verify interactive flow
7. Check progress page — verify progress tracking

---

## Tests Required

1. [ ] UAT-1: My Courses page renders enrolled courses
2. [ ] UAT-2: Course player loads module/lesson structure
3. [ ] UAT-3: Lesson content renders correctly
4. [ ] UAT-4: Lesson navigation works
5. [ ] UAT-5: Exercise taking flow works end-to-end
6. [ ] UAT-6: Course progress displays correctly

---

## Acceptance Criteria

- [ ] All 6 UAT stories pass with seeded course content
- [ ] Casey Learner can access at least one full course end-to-end
- [ ] No console errors during content viewing flow
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Minimum content types needed for UAT?**
   Recommend: text/HTML lessons, at least 1 exercise/knowledge check, at least 1 document content.

2. **Should the seed include progress data (partially completed courses)?**
   Would be useful for UAT-6 but not strictly required — progress can be generated by completing content.

---

## Implementation Notes

### Changes Made

1. **`src/pages/learner/player/CoursePlayerPage.tsx`** (major rewrite)
   - Added `useQueries` from React Query to fetch learning units for all modules in parallel
   - Maps LUs into sidebar Lesson format using `mapContentType()` (handles API's `contentType` field)
   - 3-tier fallback: LUs → module.lessons → single-lesson-per-module
   - Topic LUs → HtmlContentViewer, Practice LUs → exercise placeholder, Graded LUs → assessment placeholder
   - Fixed `allLUsLoaded` gate: `moduleIds.length === 0 || queries.every(q => !q.isLoading)`

2. **`src/features/player/ui/HtmlContentViewer.tsx`** (NEW)
   - Renders HTML content from `metadata.htmlContent` via `useContent(contentId)`
   - Loading, error, empty states; auto-marks as viewed after 2s delay

3. **`src/features/player/ui/PlayerSidebar.tsx`**
   - Expanded `Lesson.type` to include: exercise, assessment, media, custom, audio, assignment
   - Added optional `category` field to Lesson interface

4. **`src/entities/content/api/contentApi.ts`**
   - Fixed `getContent()` to handle API's double-nested `data.data` response (see API-ISS-033)

5. **`src/entities/content-attempt/model/types.ts`**
   - Added `'media'` to ContentType union

6. **`src/features/player/ui/index.ts`**
   - Added HtmlContentViewer export

### API Data Chain Verified
```
CanonicalCourse → CourseVersion → Module → CourseVersionModule → LearningUnit → Content
GET /courses/:id/modules → modules[].id
GET /modules/:moduleId/learning-units → learningUnits[].{contentType, contentId, category}
GET /content/:contentId → {type: "media", metadata: {htmlContent: "..."}}
```

### UAT Status
- UAT-1 (My Courses): Ready — enrollment data exists
- UAT-2 (Player loads): Fixed — now fetches LUs and builds lesson structure
- UAT-3 (Content renders): Fixed — HtmlContentViewer renders HTML content
- UAT-4 (Navigation): Fixed — flatLessons derived from LU-based lessons
- UAT-5 (Exercises): Partial — placeholder UI (full exercise player is separate feature)
- UAT-6 (Progress): Ready — sidebar shows progress bar, uses useCourseProgress

### Known Limitations
- Exercise/assessment LUs show placeholder "Mark as Complete & Continue" (no interactive questions yet)
- ~~API-ISS-033: Content endpoint has double-nested response (UI has workaround)~~ — **RESOLVED**: API fixed double-nesting (2026-02-09). Workaround removal tracked in UI-ISS-143.

### Blocker Updates (2026-02-09)
- **API-ISS-031 RESOLVED**: Seed data now available for EMDR101, CBT101, BH101 (3 modules, 10 LUs each). Re-seed via `ENV_FILE=.env.mock npx ts-node scripts/seed-mock-data.ts`.
- **API-ISS-033 RESOLVED**: Content double-nesting fixed server-side. UI `getContent()` workaround can be removed (tracked in UI-ISS-143).

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
