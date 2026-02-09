# UI-ISS-120: Wire Certificate View on Completion Screen

## Status: PENDING
## Priority: High
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-097, API-ISS-026

---

## Overview

The `CourseCompletionScreen` component has an `onViewCertificate` optional prop that conditionally renders a "View Your Certificate" button. However, the actual player page that renders this component **never passes the prop**, so the certificate button never appears on course completion. The UI component is built and tested — it just needs to be wired.

---

## Requirements

1. Pass `onViewCertificate` callback to `CourseCompletionScreen` in the course player page
2. The callback should navigate to the certificate view or trigger certificate download
3. Only show the certificate button when the course awards a certificate (check course/enrollment metadata)

---

## Technical Specification

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| Course player page (renders `CourseCompletionScreen`) | Modify | Pass `onViewCertificate` prop |

### Current State
```tsx
<CourseCompletionScreen
  courseTitle={segmentsData?.courseTitle || 'Course'}
  courseProgress={courseProgress}
  enrollment={enrollment}
  onBackToDashboard={() => navigate('/learner/dashboard')}
  onReviewCourse={() => { ... }}
  // onViewCertificate is NOT passed — button never renders
/>
```

### Target State
```tsx
<CourseCompletionScreen
  courseTitle={segmentsData?.courseTitle || 'Course'}
  courseProgress={courseProgress}
  enrollment={enrollment}
  onBackToDashboard={() => navigate('/learner/dashboard')}
  onReviewCourse={() => { ... }}
  onViewCertificate={
    courseAwardsCertificate
      ? () => navigate(`/learner/certificates/${enrollmentId}`)
      : undefined
  }
/>
```

---

## Acceptance Criteria

- [ ] "View Your Certificate" button appears on completion screen when course awards a certificate
- [ ] Button does not appear for courses that don't award certificates
- [ ] Clicking the button navigates to certificate view or triggers download
- [ ] Existing completion flow (Back to Dashboard, Review Course) still works

---

## Questions / Clarifications

1. **Does the certificate endpoint exist yet?**
   Depends on API-ISS-026. If the API isn't ready, wire to `/learner/certificates` listing page as interim.

---

## Implementation Notes

*Quick win — the component already has the prop, tests exist, just needs wiring in the player page. The conditional logic should check enrollment or course metadata to determine if a certificate is awarded.*

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
