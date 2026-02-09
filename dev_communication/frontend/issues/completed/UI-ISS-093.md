# UI-ISS-093: Wire Up "Hours Studied" Dashboard Stat

## Status: PENDING
## Priority: Low
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: N/A

---

## Overview

The learner dashboard stat card for "Hours Studied" is hardcoded to `0`. A TODO comment indicates it should be populated from the progress summary API.

---

## Requirements

1. Fetch aggregate hours studied from the progress summary API
2. Display actual value in the dashboard stat card

---

## Technical Specification

### Current Behavior

```tsx
hoursStudied: 0, // TODO: Get from progress summary when available
```

### Expected Behavior

Call `useProgressSummary()` or compute total time from enrollment data, then display in the stat card.

---

## Implementation

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/learner/dashboard/LearnerDashboardPage.tsx` | Modify | Import progress summary hook, wire up `hoursStudied` |

---

## Tests Required

1. [ ] Hours studied stat displays non-zero value when progress exists
2. [ ] Graceful fallback to 0 when no data available

---

## Acceptance Criteria

- [ ] Hours studied reflects actual learner time data
- [ ] Stat card displays properly formatted hours
- [ ] Falls back to 0 gracefully if no data available

---

## Questions / Clarifications

1. **API availability**: Does the progress summary endpoint return a `totalTimeSpent` or `hoursStudied` field? See API message `2026-02-07_learner-course-player-api-verification.md`.

---

## Implementation Notes

Low priority — cosmetic stat. No impact on core course-taking flow.

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

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
