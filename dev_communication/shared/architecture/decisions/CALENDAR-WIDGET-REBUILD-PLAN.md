# Calendar System Rebuild — Implementation Plan

**Date:** 2026-02-08
**Status:** Approved
**Scope:** Replace 3 duplicated calendar pages (~1040 lines) with shared CalendarWidget architecture

---

## Context

Three nearly identical calendar pages (~1040 lines total) exist with 95% duplicated code, hardcoded placeholder data, flat single-date events only, no date ranges, no feed toggling, and no API integration. The goal is a Google Calendar-style unified widget with toggleable feeds per role, Gantt-style span bars for date ranges, and full notification reminder support.

**User requirements recap:**
- Shared `CalendarWidget` with per-feed toggle checkboxes
- Point events (dots/chips) + span events (Gantt bars spanning columns)
- Three API feeds: learner, staff, system (separate endpoints)
- Multi-role composability (staff+learner sees both feeds toggled independently)
- Admin calendar is separate operational concept (system feed only)
- Full notification reminder integration
- Both corporate and academic deployment contexts

---

## Architecture

### Layer 1: Entity — `src/entities/calendar-event/`

| File | Purpose |
|------|---------|
| `model/types.ts` | `CalendarEvent` (discriminated union: `CalendarPointEvent \| CalendarSpanEvent`), `CalendarFeed`, `CalendarFeedId`, `FeedColor`, API contracts |
| `model/calendarEventKeys.ts` | Query key factory (pattern: `src/entities/notification/model/notificationKeys.ts`) |
| `api/calendarEventApi.ts` | `fetchLearnerFeed`, `fetchStaffFeed`, `fetchSystemFeed`, reminder CRUD |
| `hooks/useCalendarFeed.ts` | React Query hook per feed (pattern: `src/entities/notification/hooks/useNotifications.ts`) |
| `hooks/useCalendarFeedPlaceholder.ts` | Placeholder data hook with both point + span events until API ships |
| `lib/calendarUtils.ts` | Deduplicated helpers: `buildCalendarDays`, `getVisibleRange`, `pointEventsForDay`, `spanEventsForDay`, `splitSpanIntoWeekSegments`, type guards |
| `lib/feedColors.ts` | `FEED_COLOR_MAP` — semantic color tokens → Tailwind classes (dot, chip, bar variants) |
| `index.ts` | Barrel export |

**Key type design:**
```typescript
CalendarEvent = CalendarPointEvent | CalendarSpanEvent
  - kind: 'point' → date, time?, location?
  - kind: 'span'  → startDate, endDate
  - shared: id, feedId, title, description?, eventType, actionUrl?, metadata?

CalendarFeed = { id, label, color, enabled, isLoading, events[] }
CalendarFeedId = 'learner' | 'staff' | 'system'
FeedColor = 'primary' | 'destructive' | 'orange' | 'emerald' | 'violet' | 'secondary'
```

### Layer 2: Widget — `src/widgets/calendar/`

| File | Purpose |
|------|---------|
| `CalendarWidget.tsx` | Top-level composition: grid + sidebar, accepts `CalendarFeed[]` as props |
| `ui/CalendarGrid.tsx` | Month grid with span bar overlay layer + day cells |
| `ui/CalendarDayCell.tsx` | Single day: number, today ring, point-event dots, click handler |
| `ui/CalendarSpanBar.tsx` | Horizontal bar segment positioned via CSS grid-column |
| `ui/CalendarMonthNav.tsx` | Month title + prev/next/today buttons |
| `ui/CalendarWeekdayHeader.tsx` | Sun–Sat header row |
| `ui/CalendarSidebar.tsx` | Feed toggles + selected day events + legend |
| `ui/CalendarFeedToggle.tsx` | Checkbox + color dot + label (uses `src/shared/ui/checkbox.tsx`) |
| `ui/CalendarEventChip.tsx` | Colored event chip in sidebar detail view |
| `lib/useCalendarState.ts` | Local state: currentMonth, selectedDay, enabledFeeds, navigation |
| `lib/spanLayout.ts` | Span bar lane stacking algorithm (greedy, max 3 lanes) |
| `index.ts` | Barrel export |

**Widget is pure presentation** — pages supply feeds and data, widget renders.

### Layer 3: Pages (thin wrappers ~50 lines each)

| Page | Feeds | Title |
|------|-------|-------|
| `src/pages/learner/calendar/LearnerCalendarPage.tsx` | `learner` | "My Calendar" |
| `src/pages/staff/calendar/StaffCalendarPage.tsx` | `staff` + `learner` | "My Calendar" |
| `src/pages/admin/calendar/AdminCalendarPage.tsx` | `system` | "System Calendar" |

Each page: defines feed config → calls `useCalendarState()` → calls placeholder/real hooks per feed → assembles `CalendarFeed[]` → renders `<PageHeader>` + `<CalendarWidget>`.

### Layer 4: Feature (deferred) — `src/features/calendar-reminder/`

| File | Purpose |
|------|---------|
| `ui/ReminderButton.tsx` | Icon button + popover with timing options |
| `hooks/useCreateReminder.ts` | Mutation hook |

---

## Span Bar Rendering

Each calendar week row uses a nested grid. Span bars sit in an overlay sub-row above day cells:

1. `splitSpanIntoWeekSegments()` splits multi-week spans into per-row segments with `{startCol, colSpan, lane, isFirst, isLast}`
2. Lane assignment uses greedy interval scheduling (max 3 lanes, "+N more" overflow)
3. Bars use `grid-column: startCol / span colSpan` — no absolute positioning
4. First segment shows title; continuations show subtle left indicator; last has rounded end cap
5. Colors from `FEED_COLOR_MAP[feed.color].bar`

---

## API Contract

Add to `src/shared/api/endpoints.ts`:
```typescript
calendar: {
  learner: '/calendar/learner',     // GET ?startDate=&endDate=
  staff: '/calendar/staff',         // GET ?startDate=&endDate=
  system: '/calendar/system',       // GET ?startDate=&endDate=
  reminders: '/calendar/reminders', // POST, DELETE /:id
}
```

All feeds return `{ success: true, data: { events: CalendarEvent[] } }`.

---

## Build Sequence

### Phase 1: Entity (8 files)
1. `src/entities/calendar-event/model/types.ts`
2. `src/entities/calendar-event/model/calendarEventKeys.ts`
3. `src/entities/calendar-event/lib/calendarUtils.ts`
4. `src/entities/calendar-event/lib/feedColors.ts`
5. `src/entities/calendar-event/api/calendarEventApi.ts`
6. `src/entities/calendar-event/hooks/useCalendarFeed.ts`
7. `src/entities/calendar-event/hooks/useCalendarFeedPlaceholder.ts`
8. `src/entities/calendar-event/index.ts`

### Phase 2: Widget (13 files)
9. `src/widgets/calendar/lib/useCalendarState.ts`
10. `src/widgets/calendar/lib/spanLayout.ts`
11. `src/widgets/calendar/ui/CalendarMonthNav.tsx`
12. `src/widgets/calendar/ui/CalendarWeekdayHeader.tsx`
13. `src/widgets/calendar/ui/CalendarDayCell.tsx`
14. `src/widgets/calendar/ui/CalendarSpanBar.tsx`
15. `src/widgets/calendar/ui/CalendarGrid.tsx`
16. `src/widgets/calendar/ui/CalendarFeedToggle.tsx`
17. `src/widgets/calendar/ui/CalendarEventChip.tsx`
18. `src/widgets/calendar/ui/CalendarSidebar.tsx`
19. `src/widgets/calendar/CalendarWidget.tsx`
20. `src/widgets/calendar/index.ts`

### Phase 3: Page rewrites (3 files)
21. Rewrite `src/pages/learner/calendar/LearnerCalendarPage.tsx` (320→~50 lines)
22. Rewrite `src/pages/staff/calendar/StaffCalendarPage.tsx` (365→~60 lines)
23. Rewrite `src/pages/admin/calendar/AdminCalendarPage.tsx` (357→~50 lines)

### Phase 4: Endpoints + mocks
24. Add `calendar` section to `src/shared/api/endpoints.ts`
25. Create `src/test/mocks/data/calendarEvents.ts`

### Phase 5: Tests
26. `src/entities/calendar-event/lib/__tests__/calendarUtils.test.ts`
27. `src/widgets/calendar/lib/__tests__/spanLayout.test.ts`
28. `src/widgets/calendar/__tests__/CalendarWidget.test.tsx`
29. `src/pages/*/calendar/__tests__/*.test.tsx` (3 page tests)

### Phase 6: ADR + comms
30. Create `dev_communication/shared/architecture/decisions/ADR-UI-004-CALENDAR-WIDGET-ARCHITECTURE.md`
31. Send comms to API team with endpoint contract

---

## Patterns to Follow (exact files)

| Pattern | Reference File |
|---------|---------------|
| Query key factory | `src/entities/notification/model/notificationKeys.ts` |
| React Query hooks | `src/entities/notification/hooks/useNotifications.ts` |
| Entity barrel export | `src/entities/notification/index.ts` |
| Notification types | `src/entities/notification/model/types.ts` |
| Enrollment date fields | `src/entities/enrollment/model/types.ts` (enrolledAt, expiresAt, ClassEnrollment.schedule) |
| API client | `src/entities/notification/api/notificationApi.ts` |
| Checkbox UI | `src/shared/ui/checkbox.tsx` |

---

## Verification

```bash
npx tsc --noEmit                                     # Type check
npx vitest run                                       # All tests pass
npx vitest run src/entities/calendar-event           # Entity tests
npx vitest run src/widgets/calendar                  # Widget tests
npx vitest run src/pages/*/calendar                  # Page tests
```

Visual: dev server at localhost:5173, navigate to /learner/calendar, /staff/calendar, /admin/calendar — each renders the shared widget with appropriate feeds, span bars visible, feed toggles work, month navigation works, day selection shows sidebar events.
