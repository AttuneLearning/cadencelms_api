# UI-ISS-067: Standardize page headers to use PageHeader component

**Date:** 2026-01-22
**Reporter:** System
**Priority:** Low
**Status:** In Progress

## Description

Multiple pages use inline `<h1>` headers instead of the standardized `PageHeader` component from `@/shared/ui/page-header`. This should be unified for consistency.

## Affected Pages (24 total)

### Admin (5 pages)
- [ ] `src/pages/admin/audit-logs/AuditLogDetailPage.tsx`
- [ ] `src/pages/admin/audit-logs/AuditLogsPage.tsx`
- [ ] `src/pages/admin/settings/AppearanceSettingsPage.tsx`
- [ ] `src/pages/admin/settings/NotificationSettingsPage.tsx`
- [ ] `src/pages/admin/settings/SecuritySettingsPage.tsx`

### Learner (10 pages)
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

### Staff (6 pages)
- [ ] `src/pages/staff/courses/CoursePreviewPage.tsx`
- [ ] `src/pages/staff/courses/ExerciseBuilderPage.tsx`
- [ ] `src/pages/staff/courses/ModuleEditorPage.tsx`
- [ ] `src/pages/staff/departments/DepartmentReportsPage.tsx`
- [ ] `src/pages/staff/departments/DepartmentSettingsPage.tsx`
- [ ] `src/pages/staff/departments/DepartmentStudentsPage.tsx`

### Profile/Public (3 pages)
- [ ] `src/pages/profile/ProfilePage.tsx`
- [ ] `src/pages/profile/ProfilePageV2.tsx`
- [ ] `src/pages/public/CertificateVerificationPage.tsx`

## Fix Pattern

1. Add import: `import { PageHeader } from '@/shared/ui/page-header';`
2. Replace inline header:
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

## PageHeader Props

```typescript
interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;  // For action buttons
  className?: string;
  backButton?: React.ReactNode;
}
```
