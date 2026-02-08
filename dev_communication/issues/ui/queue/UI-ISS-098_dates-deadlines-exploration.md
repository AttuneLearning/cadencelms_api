# UI-ISS-098: Dates, Deadlines & Valid-Until — Exploration Placeholder

## Status: PENDING
## Priority: Low
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-099
## Category: Placeholder — Future Exploration

---

## Overview

**This is a placeholder issue for future exploration. Not for immediate implementation.**

The system will NOT have traditional due dates. However, some courses/enrollments may have a **"valid until"** date (e.g., enrollment expires after X months). This issue is to explore and define:

1. What date-based information should be displayed to learners
2. Where and how "valid until" dates appear in the UI
3. Whether any deadline/countdown warnings are needed
4. How expiring enrollments are handled (warning → grace period → lockout)
5. Integration with the calendar page (if applicable)
6. How date information feeds into the messaging inbox (see UI-ISS-099)

---

## Scope — To Be Defined

- **Valid Until dates**: Enrollment expiry, certificate validity period
- **NOT in scope (for now)**: Assignment due dates, module deadlines, pacing schedules
- Future exploration may expand scope based on product needs

---

## Questions to Answer Before Implementation

1. What date fields exist on enrollments and courses from the API?
2. Should learners see countdown warnings (e.g., "Enrollment expires in 7 days")?
3. What happens when an enrollment expires — locked out immediately or grace period?
4. Should the calendar page show enrollment expiry dates?
5. How do "valid until" dates relate to the messaging/notification inbox (UI-ISS-099)?

---

## Acceptance Criteria

- [ ] Exploration document produced with decisions
- [ ] Requirements defined for valid-until date handling
- [ ] Follow-up implementation issues created if needed

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
