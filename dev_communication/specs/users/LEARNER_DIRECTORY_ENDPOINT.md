# Learner Directory Endpoint Specification

## Overview

Enhanced learner listing endpoint that supports tiered permissions and prioritized results for enrollment workflows.

## Endpoint

```
GET /api/v2/users/learners
```

## Authorization Tiers

| Permission | Data Returned | Use Case |
|------------|---------------|----------|
| `learner:directory:read` | Masked: `LastName, F. ...xxxx` | Enrollment workflows |
| `learner:pii:read` | Full: name, email, DOB, address | Admin/compliance |

### Permission Acceptance (in order)

1. If caller has `learner:pii:read` → full data
2. If caller has `learner:directory:read` → masked data
3. Otherwise → 403 Forbidden

## Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `department` | ObjectId | Filter by department (prioritizes program enrollees) |
| `search` | string | Search across names (filters all pages) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 50, max: 100) |
| `status` | enum | `active`, `suspended`, `withdrawn`, `completed` |

## Response Format

### With `learner:directory:read` (masked)

```json
{
  "status": "success",
  "data": {
    "learners": [
      {
        "id": "507f1f77bcf86cd799439011",
        "displayName": "Smith, A.",
        "idSuffix": "9011",
        "status": "active",
        "isProgramEnrollee": true,
        "programCount": 2,
        "courseCount": 5
      },
      {
        "id": "507f1f77bcf86cd799430abc",
        "displayName": "Johnson, M.",
        "idSuffix": "0abc",
        "status": "active",
        "isProgramEnrollee": false,
        "programCount": 0,
        "courseCount": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 342,
      "totalPages": 7,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### With `learner:pii:read` (full)

```json
{
  "status": "success",
  "data": {
    "learners": [
      {
        "id": "507f1f77bcf86cd799439011",
        "firstName": "Alex",
        "lastName": "Smith",
        "email": "alex.smith@email.com",
        "displayName": "Smith, A.",
        "idSuffix": "9011",
        "status": "active",
        "isProgramEnrollee": true,
        "programCount": 2,
        "courseCount": 5,
        "department": {
          "id": "...",
          "name": "Cognitive Therapy"
        },
        "createdAt": "2026-01-15T10:30:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

## Sorting Logic (when `department` filter provided)

Results are sorted in two tiers:

1. **Program Enrollees First**: Learners enrolled in programs belonging to the specified department
2. **Other Learners**: All remaining learners (course-only purchasers, other departments, no enrollments)

Within each tier, sorted by:
- `lastName` ASC, `firstName` ASC (default)
- Or by `sort` parameter if provided

## Search Behavior

- Search applies across **all learners** (not just current page)
- Matches against: `firstName`, `lastName`
- Case-insensitive, partial match
- Results still maintain program-enrollee prioritization

## Example Workflow

**Department admin enrolling a learner:**

1. Opens "Enroll Learners" dialog
2. UI calls: `GET /api/v2/users/learners?department=xyz&limit=50`
3. Sees prioritized list: program learners first, then others
4. Types in search box: `GET /api/v2/users/learners?department=xyz&search=smi&limit=50`
5. Sees filtered results across all learners matching "smi"
6. Selects "Smith, A. ...9011" and confirms enrollment

## Notes

- `idSuffix` is the last 4 characters of the MongoDB ObjectId
- `displayName` format: `{LastName}, {FirstInitial}.`
- `isProgramEnrollee` indicates if learner is in a program for the filtered department
- When no `department` filter, all learners treated equally (no prioritization)
