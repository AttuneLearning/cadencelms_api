# UI Team: Staff Question Bank Access Implementation

**Date:** 2026-02-05
**From:** UI Team (Agent)
**To:** API Team
**Priority:** Medium
**Type:** Feature Implementation Notification + API Verification Request

## Summary

We've implemented department-scoped question bank access for staff users at `/staff/questions`. This allows `content-admin` and `department-admin` roles to manage questions within their department scope, in addition to the existing global admin access at `/admin/questions`.

## Implementation Details

### New Route Added
- **Route:** `/staff/questions`
- **Access:** Staff users with `question:manage-department` permission
- **Scope:** Questions are filtered by the currently selected department context

### Permission Check
Per ADR-AUTH-001 (Unified Authorization Model), we check:
```typescript
const canManageQuestions = hasPermission('question:manage-department');
```

### User Roles That Should Have Access
Based on Role_System_Architecture_Plan:
- `content-admin` - Has `question:manage-department` permission
- `department-admin` - Has broader department management including question access

## API Verification Request

Please confirm the following API endpoints support department-scoped access:

### 1. List Questions (Department-Scoped)
```
GET /api/v2/departments/{departmentId}/questions
```
- **Current behavior expected:** Returns only questions belonging to the specified department
- **Authorization:** User must have `question:manage-department` right in that department

### 2. Create Question (Department-Scoped)
```
POST /api/v2/departments/{departmentId}/questions
```
- **Authorization:** User must have `question:manage-department` right in that department

### 3. Update/Delete Question
```
PUT /api/v2/departments/{departmentId}/questions/{questionId}
DELETE /api/v2/departments/{departmentId}/questions/{questionId}
```
- **Authorization:** Same permission check

## Questions for API Team

1. Are these endpoints already implemented and supporting the permission checks described above?

2. Does the `/api/v2/roles/me` response include `question:manage-department` in the `departmentRights` for users with `content-admin` or `department-admin` roles?

3. Should questions created via staff route be automatically scoped to the department, or do we need to explicitly set the departmentId in the request body?

## Test Users
For UAT testing, we're using:
- `sam.department@lms.edu` (department admin) - should have access to staff question bank
- `riley.instructor@lms.edu` (instructor) - should NOT have access unless they also have content-admin role

## Files Changed
- `src/pages/staff/QuestionBankPage.tsx` - New staff-scoped question bank page
- `src/app/router/index.tsx` - Added `/staff/questions` route
- UAT tests updated to cover both admin and staff question bank access

---

Please respond with confirmation or any API changes needed.

**Status:** Awaiting API team response
