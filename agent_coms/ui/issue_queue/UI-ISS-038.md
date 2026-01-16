# UI-UI-ISS-038: Report System Testing & Polish

**Priority:** Medium  
**Phase:** 4 - Scheduling & Polish  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 16  
**Depends On:** UI-ISS-032, UI-ISS-033, UI-ISS-034, UI-ISS-035, UI-ISS-036, UI-ISS-037

---

## Summary

Comprehensive testing and polish for the Report System, including unit tests, integration tests, E2E tests, accessibility improvements, and performance optimization.

---

## Requirements

### 1. Unit Tests

#### Entity Tests
- [ ] `report-job/model/types.test.ts` - Type validation
- [ ] `report-job/api/reportJobApi.test.ts` - API client tests
- [ ] `report-job/hooks/useReportJobs.test.ts` - Hook tests
- [ ] Same for report-template and report-schedule

#### Feature Tests
- [ ] `report-builder/lib/useReportBuilder.test.ts` - Builder state
- [ ] `report-builder/lib/reportDefinitionSchema.test.ts` - Validation

#### Component Tests
- [ ] `FieldPalette.test.tsx` - Field palette rendering
- [ ] `ReportCanvas.test.tsx` - Drag and drop
- [ ] `ExportOptions.test.tsx` - Format selection

### 2. Integration Tests

- [ ] Report creation flow (builder → job creation → detail view)
- [ ] Template usage flow (browse → select → customize → generate)
- [ ] Schedule creation flow (template → schedule → verify)
- [ ] Job status polling (pending → processing → ready)

### 3. E2E Tests (Playwright/Cypress)

```typescript
// Example E2E test scenarios
describe('Report Builder', () => {
  it('creates a custom report from scratch', async () => {
    // Navigate to builder
    // Add dimensions
    // Add measures
    // Configure date range
    // Generate report
    // Verify job created
  });

  it('uses a template to generate report', async () => {
    // Browse templates
    // Select template
    // Customize if needed
    // Generate
    // Download when ready
  });

  it('creates and manages a scheduled report', async () => {
    // Create schedule
    // Verify in list
    // Pause schedule
    // Resume schedule
    // Run now
    // Delete schedule
  });
});
```

### 4. Accessibility Audit

- [ ] Screen reader testing for all pages
- [ ] Keyboard navigation (especially drag-and-drop)
- [ ] Focus management in dialogs
- [ ] Color contrast for status badges
- [ ] ARIA labels for interactive elements

### 5. Performance Optimization

- [ ] Lazy load report pages
- [ ] Virtualize long lists (jobs, templates)
- [ ] Optimize metadata loading (caching)
- [ ] Reduce bundle size for report feature
- [ ] Profile and fix re-render issues

### 6. Error Handling Polish

- [ ] All API errors have user-friendly messages
- [ ] Network errors show retry options
- [ ] Validation errors highlight specific fields
- [ ] Empty states are helpful

### 7. Loading States

- [ ] Skeleton loaders for lists
- [ ] Progress indicators for job generation
- [ ] Optimistic UI where appropriate

### 8. Responsive Design

- [ ] Test all pages on mobile viewport
- [ ] Builder layout adapts to small screens
- [ ] Tables scroll horizontally on mobile
- [ ] Touch-friendly controls

---

## Test File Structure

```
src/
├── entities/
│   ├── report-job/
│   │   ├── api/__tests__/reportJobApi.test.ts
│   │   └── hooks/__tests__/useReportJobs.test.ts
│   ├── report-template/
│   │   └── ...
│   └── report-schedule/
│       └── ...
├── features/
│   └── report-builder/
│       ├── lib/__tests__/
│       │   ├── useReportBuilder.test.ts
│       │   └── reportDefinitionSchema.test.ts
│       └── ui/__tests__/
│           ├── FieldPalette.test.tsx
│           └── ReportCanvas.test.tsx
└── pages/
    └── admin/
        └── reports/
            └── __tests__/
                └── ReportsPage.test.tsx

e2e/
└── reports/
    ├── report-builder.spec.ts
    ├── report-jobs.spec.ts
    ├── report-templates.spec.ts
    └── report-schedules.spec.ts
```

---

## Acceptance Criteria

- [ ] >80% unit test coverage for report entities
- [ ] All integration tests passing
- [ ] E2E tests cover critical flows
- [ ] No accessibility violations (axe-core)
- [ ] Lighthouse performance score >80
- [ ] All pages responsive
- [ ] Error handling comprehensive
- [ ] Loading states smooth

---

## Notes

- Run accessibility audit with axe DevTools
- Use React Testing Library for component tests
- Mock API calls in unit tests
- Use MSW for integration tests
- Consider visual regression testing
