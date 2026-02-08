# Suggestion: Navigation Architecture Redesign

**Date:** 2026-02-05
**Team:** UI
**Suggested By:** Claude (planning session)
**Status:** Accepted (ADR-UI-003)
**Priority:** High

## Context

The current navigation system across Staff, Learner, and Admin dashboards has several architectural issues that degrade user experience and code maintainability:

1. **Duplicate Links**: "Analytics" appears 3 times on staff dashboard (sidebar, PageHeader, Quick Actions)
2. **Mixed Mental Models**: Users must understand global vs. personal vs. department-scoped contexts
3. **Role Confusion**: BASE_NAV_ITEMS shows disabled learner-only items to staff users
4. **Deep Nesting**: Department actions require 4-5 clicks through nested accordions
5. **Hardcoded Data**: LearnerDashboardPage shows placeholder zeros, not real data
6. **Missing Routes**: Department-scoped learner routes defined in config but pages don't exist

## Trigger

- [x] Feature implementation
- [ ] Bug resolution
- [ ] Code review finding
- [ ] Cross-team coordination
- [ ] Message/Issue reference

**Reference:** Planning session for navigation improvements

## Proposed Decision

### 1. Task-Based Navigation Sections

Replace flat/context-based navigation with task-based sections consistent across all dashboards:

```
OVERVIEW       -> Dashboard, Calendar
PRIMARY        -> Role's main workflow (Teaching/Learning/Management)
SECONDARY      -> Supporting tasks
INSIGHTS       -> Analytics & Reports
DEPARTMENT     -> Breadcrumb selector + flat action list
FOOTER         -> Profile, Settings
```

### 2. Breadcrumb Department Selector

Replace nested accordion department navigation with:
- Dropdown showing current department path: `Engineering > Frontend`
- "Back to [Parent]" link when in subdepartment
- Flat list of department actions (no nested groups)
- Uses existing API: `GET /api/v2/departments/:id/hierarchy`

### 3. Role-Filtered Base Navigation

- Remove BASE_NAV_ITEMS entirely
- Each dashboard owns its complete navigation
- No disabled items for other roles
- Profile/Settings in footer (always visible)

### 4. Contextual Quick Actions

Replace navigation-duplicate Quick Actions with:
- Data-driven actions: "12 submissions to grade"
- Verbs not nouns: "Upload content" not "Content Management"
- Connected to real API data

## Impact

**Affects:**
- [ ] API team
- [x] UI team
- [ ] Both teams

**Scope:**
- [x] New pattern to establish
- [ ] Existing pattern to document
- [x] Decision that needs consensus
- [ ] Technical debt to address

## Consequences

### Positive
- 40% fewer navigation items
- 100% less redundancy
- 1-2 clicks to department actions (down from 4-5)
- Consistent patterns across all user types
- Scalable for deep department hierarchies (up to 5 levels)

### Negative
- Breaking change to navigation structure
- Requires updating all dashboard pages
- Need to implement missing learner department routes
- Users familiar with old navigation need to relearn

### Neutral
- Same permission model (no auth changes)
- Same routing patterns (just reorganized)

## Implementation Scope

- **New files**: 5 (breadcrumb component, section config, 3 learner dept pages)
- **Modified files**: 10 (sidebar, navItems, dashboards, router, stores)
- **Deleted patterns**: BASE_NAV_ITEMS, nested department accordions, duplicate Quick Actions

## Suggested ADR

**Domain:** UI
**Suggested ID:** ADR-UI-XXX
**Suggested Title:** Task-Based Navigation Architecture

## Notes

- API team confirmed: hierarchy endpoint exists and supports this design
- No backend changes required
- Full implementation plan available in memory vault: `memory/sessions/2026-02-05-navigation-dashboard-redesign.md`
