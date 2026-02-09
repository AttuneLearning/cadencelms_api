# UI-ISS-123: Accessibility Pass — Learner Experience

## Status: PENDING
## Priority: Medium
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-122

---

## Overview

The learner-facing UI lacks several accessibility fundamentals: no skip-to-content link, missing `aria-live` regions for dynamic content updates (quiz feedback, progress changes, notifications), question navigator uses color-only differentiation (no shape/icon indicators for answered vs unanswered), and focus management gaps during page transitions and modal interactions.

---

## Requirements

1. **Skip-to-content link** — Add a visually hidden skip link at the top of the page that becomes visible on focus, allowing keyboard users to bypass the sidebar and header
2. **aria-live regions** — Add `aria-live="polite"` announcements for:
   - Quiz/exam question submission feedback (correct/incorrect)
   - Progress bar updates
   - Notification badge count changes
   - Toast messages (verify existing implementation)
3. **Question navigator indicators** — Add shape or icon differentiation beyond just color (e.g., filled circle vs empty circle, checkmark for answered) so color-blind users can distinguish states
4. **Focus management** — Ensure focus moves appropriately when:
   - Navigating between questions in an exercise
   - Modal dialogs open/close
   - Page transitions complete (focus to main content)
   - Error messages appear (focus to error)

---

## Technical Specification

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| Root layout / App shell | Modify | Add skip-to-content link |
| Main content area | Modify | Add `id="main-content"` target for skip link |
| Exercise/Quiz question components | Modify | Add `aria-live` regions for feedback |
| Question navigator component | Modify | Add shape/icon indicators alongside color |
| Progress bar components | Modify | Add `aria-live` + `aria-valuenow` |
| Modal/dialog components | Verify | Ensure focus trap and return focus on close |

### Skip-to-Content Implementation
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
>
  Skip to main content
</a>
```

### Question Navigator Enhancement
Current: colored dots only (e.g., blue = answered, gray = unanswered)
Target: colored dots + icons (e.g., ● filled = answered, ○ empty = unanswered, ✓ = submitted)

---

## Acceptance Criteria

- [ ] Skip-to-content link visible on Tab key press, navigates to main content
- [ ] Screen readers announce quiz feedback when answers are submitted
- [ ] Screen readers announce progress changes
- [ ] Question navigator distinguishable without color (meets WCAG 1.4.1)
- [ ] Focus management correct for question navigation, modals, and page transitions
- [ ] No accessibility regressions in existing components
- [ ] Keyboard-only navigation works through entire learner flow

---

## Implementation Notes

*This is a WCAG 2.1 AA compliance pass focused on the learner experience. Administrative pages are out of scope for this issue. Prioritize the course player and exercise flows as they are the most interaction-heavy learner surfaces.*

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
