# UI-ISS-117: Learner Sidebar Navigation Fixes

## Status: PENDING
## Priority: Critical
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-124, UI-ISS-125

---

## Overview

Three fully-built learner pages — My Courses, My Programs, and My Learning — are **invisible** to learners because they are not linked in the active sidebar configuration. Additionally, three shell/placeholder pages (Calendar, Settings, My Classes) appear in the sidebar despite having no real content, giving a broken first impression.

---

## Requirements

1. Add **My Courses** (`/learner/courses`) to the sidebar under the "Learning" section
2. Add **My Programs** (`/learner/programs`) to the sidebar under the "Learning" section
3. Add **My Learning** (`/learner/learning`) to the sidebar under the "Learning" section
4. Hide or clearly mark as "Coming Soon" the **Calendar** sidebar link (currently renders a stub)
5. Hide or clearly mark as "Coming Soon" the **Settings** sidebar link (currently renders empty content)
6. Hide or clearly mark as "Coming Soon" the **My Classes** sidebar link (currently shows hardcoded empty state)

---

## Technical Specification

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/widgets/sidebar/learner-sidebar-config.ts` (or active sidebar config) | Modify | Add My Courses, My Programs, My Learning links; hide/mark stubs |

### Current Sidebar (Learning section)
- Inbox → `/learner/inbox`
- My Classes → `/learner/classes` (stub — hardcoded empty)
- Course Catalog → `/learner/catalog`

### Target Sidebar (Learning section)
- My Courses → `/learner/courses` ✅ (fully built)
- My Programs → `/learner/programs` ✅ (fully built)
- My Learning → `/learner/learning` ✅ (fully built)
- Course Catalog → `/learner/catalog` ✅ (fully built)
- Inbox → `/learner/inbox`

### Pages to hide from sidebar until ready
- Calendar (move to UI-ISS-125 scope)
- Settings (move to UI-ISS-124 scope)
- My Classes (no API integration yet)

---

## Acceptance Criteria

- [ ] My Courses appears in learner sidebar and navigates to `/learner/courses`
- [ ] My Programs appears in learner sidebar and navigates to `/learner/programs`
- [ ] My Learning appears in learner sidebar and navigates to `/learner/learning`
- [ ] Calendar, Settings, and My Classes are hidden from sidebar (or clearly marked as Coming Soon)
- [ ] No broken navigation flows
- [ ] Sidebar order is logical and intuitive

---

## Implementation Notes

*The pages themselves are fully functional — this is purely a sidebar configuration issue. The `learner-sidebar-config.ts` needs to be updated to reference the correct routes.*

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
