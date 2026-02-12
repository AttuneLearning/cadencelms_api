# ADR-UI-003: Task-Based Navigation Architecture

**Status:** Accepted
**Date:** 2026-02-05
**Domain:** UI

## Context

The navigation system across Staff, Learner, and Admin dashboards suffered from several architectural issues:

| Problem | Example |
|---------|---------|
| **Duplicate links** | "Analytics" appeared 3 times on staff dashboard |
| **Mixed mental models** | Global vs personal vs department-scoped contexts confused users |
| **Role confusion** | `BASE_NAV_ITEMS` showed disabled learner-only items to staff |
| **Deep nesting** | Department actions required 4-5 clicks through accordions |
| **Hardcoded data** | `LearnerDashboardPage` showed placeholder zeros |
| **Missing routes** | Department-scoped learner routes defined but pages didn't exist |

## Decision

Implement a task-based navigation architecture with:

### 1. Universal Section Structure

All dashboards follow the same section hierarchy:

```
OVERVIEW           -> Dashboard, Calendar (always)
PRIMARY WORKFLOW   -> Role's main tasks
SECONDARY WORKFLOW -> Supporting tasks
INSIGHTS           -> Analytics/Reports
DEPARTMENT         -> Breadcrumb selector + flat action list
FOOTER             -> Profile, Settings
```

### 2. Role-Specific Navigation Configs

- **STAFF_SECTIONS**: Teaching-focused (Courses, Assignments, Students)
- **LEARNER_SECTIONS**: Learning-focused (My Courses, My Progress, Certificates)
- **ADMIN_SECTIONS**: Management-focused (Users, Departments, Settings)

No shared `BASE_NAV_ITEMS` - each role owns its complete navigation.

### 3. Breadcrumb Department Navigation

Replace nested accordions with:
- `DepartmentBreadcrumbSelector` component showing path: `Engineering > Frontend`
- "Navigate up" action when in subdepartment
- Flat list of department actions (no nested groups)
- Uses existing API: `GET /api/v2/departments/:id/hierarchy`

### 4. Contextual Quick Actions

Replace navigation duplicates with data-driven actions:
- Verbs not nouns: "Grade 5 submissions" not "Grading"
- Connected to real API data via `useQuickActions(role)` hook
- Urgency-based prioritization

## Implementation

### Files Created

| File | Purpose |
|------|---------|
| `src/widgets/sidebar/config/sectionConfig.ts` | Section-based nav configs |
| `src/widgets/sidebar/ui/DepartmentBreadcrumbSelector.tsx` | Breadcrumb navigation |
| `src/features/quick-actions/hooks/useQuickActions.ts` | Contextual actions hook |
| `src/features/quick-actions/ui/QuickActionsCard.tsx` | Actions display component |
| `src/pages/learner/departments/LearnerDepartmentCoursesPage.tsx` | Dept courses page |
| `src/pages/learner/departments/LearnerDepartmentEnrollmentsPage.tsx` | Dept enrollments page |
| `src/pages/learner/departments/LearnerDepartmentProgressPage.tsx` | Dept progress page |

### Files Modified

| File | Changes |
|------|---------|
| `src/widgets/sidebar/Sidebar.tsx` | Section-based rendering |
| `src/shared/stores/navigationStore.ts` | Breadcrumb state |
| `src/pages/staff/dashboard/StaffDashboardPage.tsx` | QuickActionsCard integration |
| `src/pages/learner/dashboard/LearnerDashboardPage.tsx` | Real API data |
| `src/app/router/index.tsx` | Learner department routes |

### Navigation Store Extensions

```typescript
interface NavigationState {
  // Existing...
  departmentPath: string[];
  isBreadcrumbMode: boolean;
  navigateToDepartment: (deptId: string, ancestors?: string[]) => void;
  navigateUp: () => void;
  clearDepartmentPath: () => void;
  toggleBreadcrumbMode: () => void;
}
```

### Route Additions

```
/learner/departments/:deptId/courses
/learner/departments/:deptId/enrollments
/learner/departments/:deptId/progress
```

## Consequences

### Positive

- **40% fewer navigation items** - eliminated duplicates
- **1-2 clicks** to department actions (down from 4-5)
- **Consistent patterns** across all user types
- **Scalable** for deep department hierarchies (5 levels)
- **Real data** in learner dashboard instead of zeros

### Negative

- Breaking change to navigation structure
- Users familiar with old navigation need to relearn

### Neutral

- Same permission model (no auth changes needed)
- No backend changes required

## Alternatives Considered

### 1. Keep Accordion-Based Navigation
Rejected: Too many clicks for deep hierarchies, poor mobile experience

### 2. Mega Menu Pattern
Rejected: Doesn't scale well for enterprise organizations with 50+ departments

### 3. Tabbed Navigation Per Section
Rejected: Loses sidebar context, requires more horizontal space

## Links

- Session log: [[../../../ai_team_config/memory_store/sessions/2026-02-05-navigation-dashboard-redesign]]
- ADR Suggestion: [[../suggestions/2026-02-05_ui_navigation-architecture-redesign]]
- Related: [[ADR-UI-001-FSD-ARCHITECTURE]]
