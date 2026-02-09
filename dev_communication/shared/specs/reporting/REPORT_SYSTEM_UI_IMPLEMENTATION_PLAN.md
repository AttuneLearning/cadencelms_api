# Report System UI Implementation Plan

**Document Version:** 1.0  
**Created:** 2026-01-15  
**Status:** Ready for Implementation  
**API Reference:** [REPORT_SYSTEM_RECOMMENDATION.md](../api/REPORT_SYSTEM_RECOMMENDATION.md)  
**API Implementation Plan:** [API REPORT_SYSTEM_IMPLEMENTATION_PLAN.md](../api/REPORT_SYSTEM_IMPLEMENTATION_PLAN.md)

---

## Executive Summary

This document outlines the UI implementation plan for the Report System, aligned with the API team's recommendations. The implementation is structured in 4 phases over approximately 6-8 weeks, coordinated with API team milestones.

---

## Key Changes from Original Spec

Per API team recommendation, the UI must implement:

| Change | Original | Updated |
|--------|----------|---------|
| **Naming convention** | Mixed (underscores, camelCase) | kebab-case (hyphens) everywhere |
| **Event types** | `content_started` | `content-started` |
| **Measure types** | `completionRate` | `completion-rate` |
| **Report types** | `enrollment` | `enrollment-summary` |
| **Visibility levels** | 3 levels | 4 levels (added `team`) |
| **Output formats** | 3 formats | 4 formats (added `json`) |
| **Dimension: activity** | `learning-event` | `activity` |
| **ReportSchedule** | Embedded in ReportJob | Separate collection/API |
| **Enum values** | Hardcoded | Fetched from `/api/v2/lookup-values` |

---

## Phase Overview

```
Phase 1: Foundation & Types (Week 1-2) - Parallel with API Phase 1
├── UI-ISS-024: Update LearningEvent types to kebab-case
├── UI-ISS-025: Create Report entity types (ReportJob, ReportTemplate, ReportSchedule)
├── UI-ISS-026: Create Report API client
└── UI-ISS-027: Create Report hooks (React Query)

Phase 2: Core Pages (Week 3-4) - Parallel with API Phase 2-3
├── UI-ISS-028: Fix System Reports page (unblock ISS-023)
├── UI-ISS-029: Create Reports Dashboard page
├── UI-ISS-030: Create Report Jobs list/detail pages
└── UI-ISS-031: Create Report Templates pages

Phase 3: Custom Report Builder (Week 5-6) - After API Phase 3
├── UI-ISS-032: Custom Report Builder UI
├── UI-ISS-033: Dimension/Measure/Slicer selectors
├── UI-ISS-034: Report Preview component
└── UI-ISS-035: Report Export options

Phase 4: Scheduling & Polish (Week 7-8) - After API Phase 4
├── UI-ISS-036: Report Schedules pages
├── UI-ISS-037: Notifications integration
└── UI-ISS-038: Testing & Polish
```

---

## Dependency Graph

```
                        ┌─────────────┐
                        │   UI-ISS-024   │
                        │ Event Types │
                        └──────┬──────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
               ▼               ▼               ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │   UI-ISS-025   │ │   UI-ISS-026   │ │   UI-ISS-027   │
        │    Types    │ │ API Client  │ │    Hooks    │
        └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
               │               │               │
               └───────────────┴───────────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
               ▼               ▼               ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │   UI-ISS-028   │ │   UI-ISS-029   │ │   UI-ISS-030   │
        │ Fix Reports │ │  Dashboard  │ │  Jobs Pages │
        └─────────────┘ └─────────────┘ └──────┬──────┘
                                               │
               ┌───────────────────────────────┘
               │
       ┌───────┴───────┬───────────────┐
       │               │               │
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   UI-ISS-032   │ │   UI-ISS-033   │ │   UI-ISS-034   │
│  Builder UI │ │  Selectors  │ │   Preview   │
└──────┬──────┘ └─────────────┘ └─────────────┘
       │
       ▼
┌─────────────┐
│   UI-ISS-036   │
│  Schedules  │
└─────────────┘
```

---

## Phase 1: Foundation & Types (Week 1-2)

### Goals
- Update existing types to use kebab-case
- Create all Report entity types
- Create API client for report endpoints
- Create React Query hooks

### Issues

| Issue | Title | Priority | Est. Hours | Depends On |
|-------|-------|----------|------------|------------|
| UI-ISS-024 | Update LearningEvent types to kebab-case | High | 4 | - |
| UI-ISS-025 | Create Report entity types | High | 6 | UI-ISS-024 |
| UI-ISS-026 | Create Report API client | High | 6 | UI-ISS-025 |
| UI-ISS-027 | Create Report React Query hooks | High | 4 | UI-ISS-026 |

### Deliverables
- [ ] `src/entities/learning-event/model/types.ts` - Updated event types
- [ ] `src/entities/report-job/model/types.ts` - ReportJob types
- [ ] `src/entities/report-template/model/types.ts` - ReportTemplate types
- [ ] `src/entities/report-schedule/model/types.ts` - ReportSchedule types
- [ ] `src/shared/types/report-builder.ts` - Custom report builder types
- [ ] `src/entities/report-job/api/reportJobApi.ts` - API client
- [ ] `src/entities/report-job/hooks/` - React Query hooks
- [ ] Updated `src/shared/api/endpoints.ts` with report endpoints

### API Dependency
- Waits for: API UI-ISS-024 (LookupValue seeding)
- Can mock: Yes - mock endpoints until API ready

---

## Phase 2: Core Pages (Week 3-4)

### Goals
- Fix the broken System Reports page (ISS-023)
- Create Reports Dashboard with overview cards
- Create Report Jobs management pages
- Create Report Templates pages

### Issues

| Issue | Title | Priority | Est. Hours | Depends On |
|-------|-------|----------|------------|------------|
| UI-ISS-028 | Fix System Reports page | Critical | 4 | UI-ISS-027 |
| UI-ISS-029 | Create Reports Dashboard | High | 8 | UI-ISS-027 |
| UI-ISS-030 | Create Report Jobs pages | High | 12 | UI-ISS-029 |
| UI-ISS-031 | Create Report Templates pages | Medium | 10 | UI-ISS-030 |

### Deliverables
- [ ] `src/pages/admin/reports/ReportsPage.tsx` - Fixed/refactored
- [ ] `src/pages/admin/reports/ReportsDashboard.tsx` - Overview page
- [ ] `src/pages/admin/reports/jobs/ReportJobsListPage.tsx`
- [ ] `src/pages/admin/reports/jobs/ReportJobDetailPage.tsx`
- [ ] `src/pages/admin/reports/templates/ReportTemplatesPage.tsx`
- [ ] `src/pages/admin/reports/templates/ReportTemplateDetailPage.tsx`
- [ ] Updated routing in `src/app/router.tsx`

### API Dependency
- Waits for: API UI-ISS-030 (Report Jobs API)
- Can mock: Yes - mock until API ready

---

## Phase 3: Custom Report Builder (Week 5-6)

### Goals
- Create visual Custom Report Builder interface
- Implement dimension/measure/slicer selection
- Create live preview functionality
- Add export options

### Issues

| Issue | Title | Priority | Est. Hours | Depends On |
|-------|-------|----------|------------|------------|
| UI-ISS-032 | Custom Report Builder UI | High | 16 | UI-ISS-030 |
| UI-ISS-033 | Dimension/Measure/Slicer selectors | High | 12 | UI-ISS-032 |
| UI-ISS-034 | Report Preview component | Medium | 8 | UI-ISS-033 |
| UI-ISS-035 | Report Export options | Medium | 6 | UI-ISS-034 |

### Deliverables
- [ ] `src/pages/admin/reports/builder/CustomReportBuilderPage.tsx`
- [ ] `src/features/report-builder/ui/FieldPalette.tsx`
- [ ] `src/features/report-builder/ui/ReportCanvas.tsx`
- [ ] `src/features/report-builder/ui/DimensionSelector.tsx`
- [ ] `src/features/report-builder/ui/MeasureSelector.tsx`
- [ ] `src/features/report-builder/ui/SlicerSelector.tsx`
- [ ] `src/features/report-builder/ui/GroupSelector.tsx`
- [ ] `src/features/report-builder/ui/FilterPanel.tsx`
- [ ] `src/features/report-builder/ui/ReportPreview.tsx`
- [ ] `src/features/report-builder/ui/ExportOptions.tsx`

### API Dependency
- Waits for: API UI-ISS-033 (Report Metadata API)
- Required endpoints: `/api/v2/report-metadata/dimensions`, `/measures`, `/slicers`

---

## Phase 4: Scheduling & Polish (Week 7-8)

### Goals
- Create Report Schedules management pages
- Integrate notifications
- Testing and polish

### Issues

| Issue | Title | Priority | Est. Hours | Depends On |
|-------|-------|----------|------------|------------|
| UI-ISS-036 | Report Schedules pages | Medium | 12 | UI-ISS-031 |
| UI-ISS-037 | Notifications integration | Low | 6 | UI-ISS-036 |
| UI-ISS-038 | Testing & Polish | Medium | 16 | All above |

### Deliverables
- [ ] `src/pages/admin/reports/schedules/ReportSchedulesPage.tsx`
- [ ] `src/pages/admin/reports/schedules/ReportScheduleDetailPage.tsx`
- [ ] `src/features/report-schedule/ui/ScheduleForm.tsx`
- [ ] `src/features/report-schedule/ui/ScheduleCalendar.tsx`
- [ ] Integration tests for all report pages
- [ ] E2E tests for critical flows

### API Dependency
- Waits for: API UI-ISS-032 (Report Schedules API)
- Waits for: API UI-ISS-034 (Background Worker)

---

## File Structure

```
src/
├── entities/
│   ├── report-job/
│   │   ├── api/
│   │   │   └── reportJobApi.ts
│   │   ├── hooks/
│   │   │   ├── useReportJobs.ts
│   │   │   ├── useReportJob.ts
│   │   │   ├── useCreateReportJob.ts
│   │   │   └── index.ts
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   ├── report-template/
│   │   ├── api/
│   │   │   └── reportTemplateApi.ts
│   │   ├── hooks/
│   │   │   └── ...
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   └── report-schedule/
│       ├── api/
│       ├── hooks/
│       ├── model/
│       └── index.ts
├── features/
│   └── report-builder/
│       ├── lib/
│       │   ├── useReportBuilder.ts      # Builder state management
│       │   └── reportDefinitionSchema.ts # Zod validation
│       └── ui/
│           ├── FieldPalette.tsx
│           ├── ReportCanvas.tsx
│           ├── DimensionSelector.tsx
│           ├── MeasureSelector.tsx
│           ├── SlicerSelector.tsx
│           ├── GroupSelector.tsx
│           ├── FilterPanel.tsx
│           ├── ReportPreview.tsx
│           └── ExportOptions.tsx
├── pages/
│   └── admin/
│       └── reports/
│           ├── ReportsDashboard.tsx
│           ├── ReportBuilderPage.tsx (refactored)
│           ├── jobs/
│           │   ├── ReportJobsListPage.tsx
│           │   └── ReportJobDetailPage.tsx
│           ├── templates/
│           │   ├── ReportTemplatesPage.tsx
│           │   └── ReportTemplateDetailPage.tsx
│           ├── schedules/
│           │   ├── ReportSchedulesPage.tsx
│           │   └── ReportScheduleDetailPage.tsx
│           └── builder/
│               └── CustomReportBuilderPage.tsx
└── shared/
    ├── api/
    │   └── endpoints.ts (updated)
    └── types/
        └── report-builder.ts
```

---

## Timeline Summary

| Week | Phase | Focus | API Dependency |
|------|-------|-------|----------------|
| Week 1 | Phase 1 | Types, API client | Mock endpoints |
| Week 2 | Phase 1-2 | Hooks, Fix Reports page | API Phase 1 |
| Week 3 | Phase 2 | Dashboard, Jobs list | API Phase 2 |
| Week 4 | Phase 2-3 | Templates, Builder start | API Phase 3 |
| Week 5 | Phase 3 | Builder UI, Selectors | API Metadata |
| Week 6 | Phase 3-4 | Preview, Export, Schedules | API Phase 4 |
| Week 7 | Phase 4 | Schedules, Notifications | API Worker |
| Week 8 | Phase 4 | Testing, Polish | Full API |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API delays | Medium | High | Mock endpoints, parallel development |
| Report builder complexity | Medium | Medium | Start simple, iterate |
| Kebab-case migration issues | Low | Medium | Create codemod script |
| Performance with large previews | Medium | Medium | Limit preview rows, pagination |

---

## Success Criteria

### Phase 1 Complete
- [ ] All types use kebab-case
- [ ] API client handles all report endpoints
- [ ] React Query hooks work with mocks
- [ ] No TypeScript errors

### Phase 2 Complete
- [ ] System Reports page no longer crashes (ISS-023 fixed)
- [ ] Dashboard shows overview cards
- [ ] Users can view and manage report jobs
- [ ] Users can browse templates

### Phase 3 Complete
- [ ] Custom Report Builder functional
- [ ] Can select dimensions, measures, slicers, groups
- [ ] Preview shows sample data
- [ ] Can export to all formats

### Phase 4 Complete
- [ ] Scheduled reports can be created/managed
- [ ] Notifications work
- [ ] All tests passing
- [ ] Ready for production

---

## Issue Summary

| Issue | Title | Phase | Priority | Status |
|-------|-------|-------|----------|--------|
| UI-ISS-024 | Update LearningEvent types to kebab-case | 1 | High | 🔲 Not Started |
| UI-ISS-025 | Create Report entity types | 1 | High | 🔲 Not Started |
| UI-ISS-026 | Create Report API client | 1 | High | 🔲 Not Started |
| UI-ISS-027 | Create Report React Query hooks | 1 | High | 🔲 Not Started |
| UI-ISS-028 | Fix System Reports page (ISS-023) | 2 | Critical | 🔲 Not Started |
| UI-ISS-029 | Create Reports Dashboard | 2 | High | 🔲 Not Started |
| UI-ISS-030 | Create Report Jobs pages | 2 | High | 🔲 Not Started |
| UI-ISS-031 | Create Report Templates pages | 2 | Medium | 🔲 Not Started |
| UI-ISS-032 | Custom Report Builder UI | 3 | High | 🔲 Not Started |
| UI-ISS-033 | Dimension/Measure/Slicer selectors | 3 | High | 🔲 Not Started |
| UI-ISS-034 | Report Preview component | 3 | Medium | 🔲 Not Started |
| UI-ISS-035 | Report Export options | 3 | Medium | 🔲 Not Started |
| UI-ISS-036 | Report Schedules pages | 4 | Medium | 🔲 Not Started |
| UI-ISS-037 | Notifications integration | 4 | Low | 🔲 Not Started |
| UI-ISS-038 | Testing & Polish | 4 | Medium | 🔲 Not Started |

---

## Next Steps

1. **Review this plan with the team**
2. **Coordinate with API team on timeline**
3. **Begin Phase 1 implementation**
4. **Create mock endpoints for parallel development**
5. **Schedule weekly sync with API team**
