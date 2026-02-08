# API-ISS-023: Prioritized Learner List

**Status:** READY
**Priority:** High
**Created:** 2026-02-05
**Assignee:** API Team
**Depends-On:** API-ISS-022

---

## Summary

Enhance learner listing to prioritize program enrollees when department filter is provided, supporting enrollment workflows.

---

## Background

When department-admins enroll learners:
- Most relevant: learners already in their department's programs
- Also needed: all other learners (course purchasers, new users, etc.)

Current endpoint returns all learners without prioritization.

---

## Requirements

### 1. Two-Tier Results

When `department` filter is provided:

**Tier 1 - Program Enrollees:**
- Learners enrolled in programs belonging to the specified department
- Sorted by lastName, firstName

**Tier 2 - Other Learners:**
- All remaining learners (no program enrollment, other departments, course-only)
- Sorted by lastName, firstName

Results flow naturally across pagination (Tier 1 first, then Tier 2).

### 2. Response Fields

Add to learner response:

```typescript
{
  // ... existing fields
  isProgramEnrollee: boolean;  // true if in dept's program
  programCount: number;        // total program enrollments
  courseCount: number;         // total course enrollments
}
```

### 3. Search Behavior

- Search filters across **entire dataset** (both tiers)
- Results maintain prioritization (program enrollees first)
- Pagination reflects filtered totals

### 4. Pagination

- Default limit: 50
- Max limit: 100
- Standard pagination response

---

## Implementation

### Query Strategy

```typescript
// Pseudocode for prioritized query
async function listLearnersWithPriority(departmentId: string, search?: string) {
  // Get program IDs for department
  const programIds = await Program.find({ departmentId }).distinct('_id');

  // Get learner IDs enrolled in those programs
  const programEnrolleeIds = await Enrollment.find({
    programId: { $in: programIds }
  }).distinct('learnerId');

  // Build aggregation with priority scoring
  const pipeline = [
    // Match all learners (or search filter)
    { $match: searchFilter },

    // Add priority field
    { $addFields: {
      isProgramEnrollee: { $in: ['$_id', programEnrolleeIds] },
      priority: { $cond: [{ $in: ['$_id', programEnrolleeIds] }, 0, 1] }
    }},

    // Sort by priority, then name
    { $sort: { priority: 1, lastName: 1, firstName: 1 } },

    // Paginate
    { $facet: {
      metadata: [{ $count: 'total' }],
      data: [{ $skip: skip }, { $limit: limit }]
    }}
  ];
}
```

### Display Name Builder

```typescript
function buildDisplayName(firstName: string, lastName: string): string {
  const firstInitial = firstName.charAt(0).toUpperCase();
  return `${lastName}, ${firstInitial}.`;
}

function getIdSuffix(objectId: string): string {
  return objectId.slice(-4);
}
```

---

## API Examples

### List for Enrollment (department filter)

```
GET /api/v2/users/learners?department=abc123&limit=50
```

Response:
```json
{
  "learners": [
    { "displayName": "Adams, J.", "idSuffix": "1234", "isProgramEnrollee": true, ... },
    { "displayName": "Baker, S.", "idSuffix": "5678", "isProgramEnrollee": true, ... },
    { "displayName": "Clark, M.", "idSuffix": "9abc", "isProgramEnrollee": false, ... }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 342 }
}
```

### Search with Department

```
GET /api/v2/users/learners?department=abc123&search=smith&limit=50
```

Response includes all "smith" matches, prioritized.

---

## Testing

```bash
# Verify program enrollees appear first
GET /api/v2/users/learners?department={cogDeptId}
# Assert: isProgramEnrollee=true learners before isProgramEnrollee=false

# Verify search maintains priority
GET /api/v2/users/learners?department={cogDeptId}&search=a
# Assert: matching program enrollees before other matches

# Verify pagination works across tiers
GET /api/v2/users/learners?department={cogDeptId}&page=2&limit=50
# Assert: continues correctly from page 1
```

---

## Acceptance Criteria

- [ ] Program enrollees appear before other learners when dept filter used
- [ ] `isProgramEnrollee` field correctly indicates enrollment status
- [ ] `displayName` format is "LastName, F."
- [ ] `idSuffix` is last 4 chars of ObjectId
- [ ] Search filters entire dataset, maintains priority
- [ ] Pagination works correctly across tiers
- [ ] No department filter = no prioritization (equal treatment)
- [ ] Tests cover all scenarios

---

## Related

- **Spec:** `dev_communication/specs/users/LEARNER_DIRECTORY_ENDPOINT.md`
- **Depends-On:** API-ISS-022 (Permission tier)
- **Related UI:** Course Enrollment Pages
