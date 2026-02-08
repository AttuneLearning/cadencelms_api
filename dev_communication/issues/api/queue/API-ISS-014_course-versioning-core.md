# API-ISS-014: Course Versioning Core (CanonicalCourse, CourseVersion)

## Status: PENDING
## Priority: High
## Created: 2026-02-04
## Updated: 2026-02-04
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-001, ADR-VERS-001, API-ISS-015 (depends on this)
## Phase: 1 - Core Versioning Foundation

---

## Overview

Implement the core course versioning system with CanonicalCourse and CourseVersion entities. This establishes the foundation for course evolution while maintaining certificate integrity and compliance tracking.

The existing `Course` model will be transformed into `CanonicalCourse` (stable identity) with `CourseVersion` (immutable snapshots) for actual course content.

---

## Requirements

1. Create `CanonicalCourse` model representing stable course identity
2. Create `CourseVersion` model for immutable course snapshots
3. Implement version lifecycle (draft -> published -> locked)
4. Preserve existing Course IDs during migration
5. Auto-lock previous version when new version is published
6. Track version lineage (parentVersionId)

---

## Technical Specification

### New Models

#### CanonicalCourse

```typescript
interface ICanonicalCourse extends Document {
  code: string;                          // Stable course code (e.g., "CS101")
  departmentId: ObjectId;
  programId: ObjectId | null;
  currentPublishedVersionId: ObjectId | null;
  latestDraftVersionId: ObjectId | null;
  totalVersions: number;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### CourseVersion

```typescript
interface ICourseVersion extends Document {
  canonicalCourseId: ObjectId;
  version: number;                       // 1, 2, 3...
  title: string;
  description: string | null;
  credits: number;
  duration: number;
  settings: CourseSettings;
  instructorIds: ObjectId[];
  status: 'draft' | 'published' | 'archived';
  isLocked: boolean;
  isLatest: boolean;
  parentVersionId: ObjectId | null;
  createdBy: ObjectId;
  createdAt: Date;
  publishedAt: Date | null;
  publishedBy: ObjectId | null;
  lockedAt: Date | null;
  lockedBy: ObjectId | null;
  lockedReason: 'superseded' | 'archived' | 'manual' | null;
  changeNotes: string | null;
  statsAtLock: {
    moduleCount: number;
    learningUnitCount: number;
    enrollmentCount: number;
  } | null;
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v2/courses/{id}/versions` | Create new draft version from published |
| GET | `/api/v2/courses/{id}/versions` | List all versions of a course |
| GET | `/api/v2/course-versions/{id}` | Get specific version details |
| PATCH | `/api/v2/course-versions/{id}` | Update draft version |
| POST | `/api/v2/course-versions/{id}/publish` | Publish draft (locks previous) |
| POST | `/api/v2/course-versions/{id}/lock` | Manually lock a version |

### POST /api/v2/courses/{id}/versions

Create a new draft version from the current published version.

**Request:**
```json
{
  "changeNotes": "Updated module content for 2026"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "...",
    "canonicalCourseId": "...",
    "version": 2,
    "status": "draft",
    "parentVersionId": "...",
    "changeNotes": "Updated module content for 2026"
  }
}
```

### POST /api/v2/course-versions/{id}/publish

**Business Logic:**
1. Validate version is in 'draft' status
2. Lock the current published version (if any)
   - Set `isLocked: true`
   - Set `lockedReason: 'superseded'`
   - Capture `statsAtLock`
3. Update new version:
   - Set `status: 'published'`
   - Set `publishedAt: now()`
   - Set `publishedBy: currentUserId`
   - Set `isLatest: true`
4. Update CanonicalCourse:
   - Set `currentPublishedVersionId`
   - Set `latestDraftVersionId: null`
   - Increment `totalVersions`
5. Emit event: `course.version.published`

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "...",
    "version": 2,
    "status": "published",
    "publishedAt": "2026-02-04T...",
    "previousVersionLocked": true,
    "previousVersionId": "..."
  }
}
```

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/models/academic/CanonicalCourse.model.ts` | CanonicalCourse schema |
| `src/models/academic/CourseVersion.model.ts` | CourseVersion schema |
| `src/services/courseVersion.service.ts` | Version business logic |
| `src/controllers/courseVersion.controller.ts` | Route handlers |
| `src/routes/v2/courseVersion.routes.ts` | Route definitions |
| `src/validators/courseVersion.validator.ts` | Request validation |

### Files to Modify

| File | Change |
|------|--------|
| `src/routes/v2/index.ts` | Add courseVersion routes |
| `src/models/enrollment/Enrollment.model.ts` | Add `courseVersionId` field |

### Migration Script

```typescript
// scripts/migrations/001_course_versioning.ts

1. For each existing Course:
   a. Create CanonicalCourse with same _id
   b. Create CourseVersion v1 with course data
   c. Set CanonicalCourse.currentPublishedVersionId = v1._id

2. Add courseVersionId to existing Enrollments
   - Find enrollment's course
   - Set courseVersionId = course's v1 version
```

---

## Tests Required

1. [ ] Create new version from published course
2. [ ] Cannot create version from draft course
3. [ ] Cannot create version if draft already exists
4. [ ] Publish version locks previous version
5. [ ] Cannot edit published version
6. [ ] Cannot edit locked version
7. [ ] List versions returns in order
8. [ ] Manual lock works correctly
9. [ ] Stats captured on lock
10. [ ] Migration preserves existing data

---

## Acceptance Criteria

- [ ] CanonicalCourse model created with indexes
- [ ] CourseVersion model created with indexes
- [ ] All 6 endpoints implemented
- [ ] Version lifecycle enforced (draft -> published -> locked)
- [ ] Previous version auto-locked on publish
- [ ] Migration script tested and documented
- [ ] Event emitted on publish (for future certificate auto-versioning)
- [ ] Tests pass
- [ ] Contract file created and sent to UI team

---

## Questions / Clarifications

1. **Should we support archiving a published version directly?**
   Yes - add 'archived' status. Archived versions are locked but don't supersede anything.

2. **Can a course have multiple drafts?**
   No - only one draft at a time. Must publish or discard before creating another.

---

## Implementation Notes

*Add notes during implementation*

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
- [ ] Contract sent to UI team
- [ ] API-ISS-015 unblocked
