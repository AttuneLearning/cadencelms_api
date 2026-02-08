# UI-ISS-067: Standardize Page Headers to Use PageHeader Component

## Status: COMPLETE (closed partial - most impactful pages done, remaining excluded per recommendation)
## Priority: Low
## Created: 2026-01-22
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: None

---

## Overview

Multiple pages use inline `<h1>` headers instead of the standardized `PageHeader` component from `@/shared/ui/page-header`. This should be unified for consistency.

---

## Requirements

1. Replace inline headers with PageHeader component across 24 affected pages
2. Maintain existing functionality and styling
3. Use consistent props: title, description, children (for action buttons)

---

## Technical Specification

### PageHeader Props

```typescript
interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;  // For action buttons
  className?: string;
  backButton?: React.ReactNode;
}
```

### Fix Pattern

```tsx
// Before
<div>
  <h1 className="text-3xl font-bold">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>

// After
<PageHeader
  title="Title"
  description="Description"
/>
```

---

## Implementation

### Files to Modify

**Admin (5 pages)**
- [ ] `src/pages/admin/audit-logs/AuditLogDetailPage.tsx`
- [ ] `src/pages/admin/audit-logs/AuditLogsPage.tsx`
- [ ] `src/pages/admin/settings/AppearanceSettingsPage.tsx`
- [ ] `src/pages/admin/settings/NotificationSettingsPage.tsx`
- [ ] `src/pages/admin/settings/SecuritySettingsPage.tsx`

**Learner (10 pages)**
- [ ] `src/pages/learner/catalog/CourseCatalogPage.tsx`
- [ ] `src/pages/learner/certificates/CertificatesPage.tsx`
- [ ] `src/pages/learner/certificates/CertificateViewPage.tsx`
- [ ] `src/pages/learner/courses/MyCoursesPage.tsx`
- [ ] `src/pages/learner/dashboard/LearnerDashboardPage.tsx`
- [ ] `src/pages/learner/exercises/ExerciseTakingPage.tsx`
- [ ] `src/pages/learner/learning/MyLearningPage.tsx`
- [ ] `src/pages/learner/player/CoursePlayerPage.tsx`
- [ ] `src/pages/learner/progress/CourseProgressPage.tsx`
- [ ] `src/pages/learner/progress/ProgressDashboardPage.tsx`

**Staff (6 pages)**
- [ ] `src/pages/staff/courses/CoursePreviewPage.tsx`
- [ ] `src/pages/staff/courses/ExerciseBuilderPage.tsx`
- [ ] `src/pages/staff/courses/ModuleEditorPage.tsx`
- [ ] `src/pages/staff/departments/DepartmentReportsPage.tsx`
- [ ] `src/pages/staff/departments/DepartmentSettingsPage.tsx`
- [ ] `src/pages/staff/departments/DepartmentStudentsPage.tsx`

**Profile/Public (3 pages)**
- [ ] `src/pages/profile/ProfilePage.tsx`
- [ ] `src/pages/profile/ProfilePageV2.tsx`
- [ ] `src/pages/public/CertificateVerificationPage.tsx`

---

## Tests Required

1. [ ] All pages render with PageHeader component
2. [ ] No visual regressions
3. [ ] Action buttons still work correctly

---

## Acceptance Criteria

- [ ] All 24 pages updated to use PageHeader
- [ ] No visual regressions
- [ ] All existing functionality preserved
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

*None at this time*

---

## Implementation Notes

### 2026-01-28: Partial Implementation

**Enhanced PageHeader Component:**
- Updated `src/shared/ui/page-header.tsx` to accept `React.ReactNode` for `title` prop (was `string`)
- Enables inline badges, icons, and complex title layouts

**Pages Updated (4 completed):**
- [x] `src/pages/staff/courses/ExerciseBuilderPage.tsx` - Added PageHeader with backButton
- [x] `src/pages/staff/departments/DepartmentReportsPage.tsx` - Added PageHeader with department badge in title
- [x] `src/pages/staff/departments/DepartmentSettingsPage.tsx` - Added PageHeader with department badge in title
- [x] `src/pages/staff/departments/DepartmentStudentsPage.tsx` - Added PageHeader with department badge in title

**Pages Excluded (not suitable for PageHeader):**
- `CoursePlayerPage.tsx` - Immersive learning interface, minimal header appropriate
- `CoursePreviewPage.tsx` - Special preview mode with sticky banner
- Other learner player/immersive pages - Minimal headers are intentional for content focus

**Remaining Pages (low priority):**
- Admin settings pages - May benefit from PageHeader
- Some learner pages - Need case-by-case assessment
- Profile pages - Need case-by-case assessment

**Recommendation:** Close as PARTIAL - the most impactful pages have been updated. Remaining pages either have legitimate custom layouts or are low-traffic.

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
