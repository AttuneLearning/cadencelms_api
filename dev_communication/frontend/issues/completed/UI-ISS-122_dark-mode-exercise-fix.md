# UI-ISS-122: Dark Mode Fix for Exercise & Quiz Components

## Status: PENDING
## Priority: Medium
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: None

---

## Overview

Exercise, quiz, and exam components extensively use hardcoded Tailwind color classes (`bg-white`, `text-gray-900`, `border-gray-300`, `bg-gray-50`, etc.) instead of semantic theme tokens (`bg-background`, `text-foreground`, `border-border`). These components will render with incorrect colors in dark mode, showing white backgrounds on dark pages, unreadable text, and jarring contrast issues.

---

## Requirements

1. Replace all hardcoded Tailwind color classes with semantic theme tokens across exercise/quiz/exam components
2. Ensure all exercise UI elements are readable and visually consistent in both light and dark modes
3. Test all question types (multiple choice, true/false, short answer, matching, ordering, fill-in-blank, essay) in dark mode

---

## Technical Specification

### Files to Modify

| File | Action | Hardcoded Classes Found |
|------|--------|------------------------|
| Question type components (multiple-choice, true-false, short-answer, matching, ordering, fill-in-blank, essay) | Modify | `border-gray-300`, `bg-white`, `bg-gray-50`, `text-gray-*`, `bg-blue-50` |
| `QuestionRenderer` | Modify | `bg-white`, `border-gray-200`, `text-gray-*` (10+ instances) |
| `ExercisePlayer` | Modify | `bg-white`, `border-gray-200`, `text-gray-*` |
| `ExerciseResults` | Modify | `bg-gray-50`, `text-gray-700`, `border-gray-200`, `border-gray-400` |
| Feedback components | Modify | `bg-white`, `text-gray-*` |

### Replacement Map

| Hardcoded | Semantic Replacement |
|-----------|---------------------|
| `bg-white` | `bg-background` or `bg-card` |
| `bg-gray-50` | `bg-muted` |
| `text-gray-900` | `text-foreground` |
| `text-gray-700` | `text-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `text-gray-400` | `text-muted-foreground` |
| `border-gray-200` | `border-border` |
| `border-gray-300` | `border-border` |
| `border-gray-400` | `border-border` |
| `bg-blue-50` | `bg-primary/10` or `bg-accent` |
| `bg-blue-100` | `bg-primary/20` |
| `text-blue-*` | `text-primary` |

---

## Acceptance Criteria

- [ ] No hardcoded color classes remain in exercise/quiz/exam components
- [ ] All question types render correctly in light mode (visual regression check)
- [ ] All question types render correctly in dark mode
- [ ] Feedback states (correct/incorrect) still visually distinct in both modes
- [ ] Exercise results summary readable in both modes
- [ ] No contrast accessibility issues

---

## Implementation Notes

*This is a systematic find-and-replace task. Use the replacement map above but verify each replacement visually. Some semantic classes may need adjustment based on the specific component's design intent. The green/red feedback colors for correct/incorrect answers may need special handling (keep explicit green/red but ensure they work on both backgrounds).*

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
