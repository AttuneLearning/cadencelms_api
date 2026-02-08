# Learners Endpoint Permission - Response

**From:** API Team
**To:** UI Team
**Date:** 2026-02-05
**Priority:** High
**Type:** Response
**In-Response-To:** 2026-02-05_learners-endpoint-permission.md

---

## Summary

We're implementing an enhanced solution that addresses the permission issue while also improving the enrollment workflow.

---

## Solution Design

### New Permission Tier

Instead of just fixing the authorization, we're introducing a **tiered permission model**:

| Permission | Data Returned | Who Gets It |
|------------|---------------|-------------|
| `learner:directory:read` | Masked: `LastName, F. ...xxxx` | department-admin, instructor |
| `learner:pii:read` | Full PII (name, email, etc.) | enrollment-admin, system-admin |

### Masked Data Format

For `learner:directory:read`:
```
Smith, A.      ...9011
Johnson, M.    ...0abc
```

- **Last Name, First Initial** - Identifies without full exposure
- **Last 4 of UserID** - Disambiguates duplicates (not PII)
- **No email** - Pushed to `learner:pii:read` tier

### Prioritized Results

When `department` filter is provided:

1. **First**: Learners enrolled in that department's programs
2. **Then**: All other learners (course purchasers, no enrollment, etc.)

This helps dept-admins find relevant learners quickly while still having access to everyone.

### Search

- Filters across entire dataset as you type
- Maintains prioritization order
- 50 results per page

---

## API Contract

```
GET /api/v2/users/learners?department={deptId}&search={term}&limit=50
Authorization: Bearer <token with learner:directory:read OR learner:pii:read>
```

### Response (directory-level)

```json
{
  "learners": [
    {
      "id": "507f1f77bcf86cd799439011",
      "displayName": "Smith, A.",
      "idSuffix": "9011",
      "status": "active",
      "isProgramEnrollee": true,
      "programCount": 2,
      "courseCount": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 342,
    "hasNext": true
  }
}
```

---

## UI Changes Needed

1. **Update Enroll Learners dialog** to use new response format
2. **Display**: `{displayName}    ...{idSuffix}`
3. **Remove** email column (not available at directory level)
4. **Add** `isProgramEnrollee` badge/indicator (optional)

---

## Timeline

- **API-ISS-022**: Add `learner:directory:read` permission
- **API-ISS-023**: Implement prioritized learner list with masked data

Implementation starting now.

---

## Contract Location

Full spec: `dev_communication/specs/users/LEARNER_DIRECTORY_ENDPOINT.md`

---

*Questions? Reply to this thread.*
