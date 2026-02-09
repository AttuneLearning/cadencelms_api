# UI-ISS-124: Learner Settings Page

## Status: PENDING
## Priority: Low
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-117

---

## Overview

The learner Settings page at `/learner/settings` is a **completely empty stub** — it renders only a layout wrapper with no content. Learners who navigate to Settings see a blank page. The page should provide meaningful settings controls relevant to the learner experience.

---

## Requirements

1. **Notification preferences** — Toggle email/in-app notifications for different event types (enrollment, course updates, deadlines, grades)
2. **Display preferences** — Theme toggle (light/dark/system), language preference (if i18n is planned)
3. **Privacy settings** — Profile visibility, learning activity visibility
4. **Account info** — Display username/email (read-only or link to profile edit)

---

## Technical Specification

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| Learner settings page component | Modify | Replace empty stub with settings UI |

### Current State
```tsx
// Empty — renders only layout wrapper with no content
```

### Approach

Use shadcn/ui `Card`, `Switch`, `Select` components for settings controls. Group settings into sections with clear headings. Persist preferences via API or localStorage initially.

### Suggested Layout
```
Settings
├── Notifications
│   ├── Email notifications (Switch)
│   ├── Course update alerts (Switch)
│   └── Grade/feedback alerts (Switch)
├── Display
│   ├── Theme (Select: Light / Dark / System)
│   └── Sidebar collapsed by default (Switch)
├── Privacy
│   ├── Show my profile to other learners (Switch)
│   └── Show my progress to instructors (Switch — default on)
└── Account
    ├── Email: user@example.com (read-only)
    └── Change Password (link)
```

---

## Acceptance Criteria

- [ ] Settings page renders meaningful content (not empty)
- [ ] At least notification and display preferences are functional
- [ ] Settings persist across sessions (API or localStorage)
- [ ] Responsive layout (works on mobile)
- [ ] Can be added back to sidebar once complete (see UI-ISS-117)

---

## Implementation Notes

*This can be implemented incrementally. Start with theme toggle and notification preferences since the infrastructure for both exists. The page was hidden from the sidebar in UI-ISS-107 — re-add it once this issue is complete.*

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
