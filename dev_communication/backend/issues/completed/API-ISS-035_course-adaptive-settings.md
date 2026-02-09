# API-ISS-035: Course Adaptive Settings

## Status: COMPLETE
## Priority: High
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: UI Team
## Assigned To: API Team
## Related: `dev_communication/messaging/ui-to-api/2026-02-09_adaptive-playlist-engine-api-needs.md`

---

## Overview

Add `adaptiveSettings` field to CourseVersion model, allowing courses to configure adaptive playlist engine behavior (mode, learner choice, pre-assessment).

---

## Requirements

- Add `adaptiveSettings` subdocument to CourseVersion model
- Include in course responses via CoursesService
- Accept in create/update course inputs
- Fields: `mode` (off|guided|full), `allowLearnerChoice`, `preAssessmentEnabled`
- Default: `mode: 'off'` (zero behavior change)

---

## Completion

**Completed Date:** 2026-02-09

**Verification:**
- [x] CourseVersion model updated with adaptiveSettings
- [x] Service includes adaptiveSettings in responses
- [x] Tests passing
- [x] TypeScript compiles cleanly
