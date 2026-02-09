# UI-ISS-118: Dead Links & Broken Navigation

## Status: PENDING
## Priority: Critical
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-117

---

## Overview

Several navigation links in the learner UI point to non-existent routes or placeholder destinations, creating a broken experience. The header dropdown "My Courses" link points to `/courses` (doesn't exist), the notification bell's "View All" navigates to `/settings/notifications` (admin route, not a notifications list), and notification item clicks perform no navigation.

---

## Requirements

1. Fix the header dropdown "My Courses" link to point to `/learner/courses` instead of `/courses`
2. Fix the notification "View All" link to navigate to a valid learner notification page (or remove the link until a notifications page exists)
3. Wire notification item click-through to navigate to the relevant content (e.g., the course, enrollment, or message that triggered the notification)

---

## Technical Specification

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| Header user dropdown component | Modify | Change `<Link to="/courses">` → `<Link to="/learner/courses">` |
| Header notification bell handler | Modify | Change `handleViewAllNotifications` from `/settings/notifications` to a valid learner route |
| Notification item component | Modify | Add `onClick` navigation based on notification type/context |

### Current State

**Header dropdown:**
```tsx
<Link to="/courses" className="cursor-pointer">
  <span>My Courses</span>
</Link>
```
Should be: `<Link to="/learner/courses">`

**Notification "View All":**
```tsx
const handleViewAllNotifications = () => {
  navigate('/settings/notifications'); // placeholder — admin route
};
```
Should navigate to `/learner/notifications` or similar.

**Notification click:** No navigation handler on individual notification items.

---

## Acceptance Criteria

- [ ] Header "My Courses" navigates to `/learner/courses` and loads the My Courses page
- [ ] Notification "View All" navigates to a valid learner-accessible page
- [ ] Clicking a notification item navigates to relevant content (or shows detail)
- [ ] No dead links in the learner header area
- [ ] All navigation targets are accessible to the learner role

---

## Implementation Notes

*The "View All" notification target could be `/learner/inbox` as an interim solution until a dedicated notifications listing page is built. Notification click-through requires mapping notification types to target routes.*

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
