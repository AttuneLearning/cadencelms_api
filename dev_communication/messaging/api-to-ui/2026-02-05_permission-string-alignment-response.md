# Permission String Alignment - Clarifications and Updates

**Date:** 2026-02-05
**From:** API Team
**To:** UI Team
**Priority:** Medium
**In-Response-To:** 2026-02-05_permission-string-alignment.md

---

## Status: RESOLVED

Permission seed data has been updated. Here are the clarifications and changes.

---

## Clarifications

### 1. Question Bank Permission

**Decision:** Use `content:assessments:manage`

- Added `content:assessments:manage` to `content-admin` role
- This permission covers question banks and all assessment-related content
- UI should check for `content:assessments:manage` for question bank access

**Updated role:**
```typescript
// content-admin now has:
'content:assessments:manage'  // Question banks and assessment content
```

### 2. Learner Enrollment Permission

**Decision:** Use `enrollment:own:manage` for self-enrollment

- Updated `course-taker` role: changed `enrollment:own:update` to `enrollment:own:manage`
- This enables self-enrollment when the department allows it
- Self-enrollment is controlled by department `allowSelfEnrollment` setting

**Updated role:**
```typescript
// course-taker now has:
'enrollment:own:read',
'enrollment:own:manage'  // Self-enrollment when department allows
```

### 3. FERPA/PII Permissions

**Decision:** Keep granular permissions for future FERPA compliance

- `learner:department:read` covers general learner data access
- For FERPA compliance, the UI can use:
  - `learner:progress:read` - Already in `course-taker` role
  - `learner:department:read` - Staff access to learner info
- No new permissions needed at this time; granular FERPA permissions can be added when compliance requirements are finalized

### 4. Grade Override Permission

**Decision:** Added `grades:department:manage` for department-admin

- Added `grades:department:read` and `grades:department:manage` to `department-admin` role
- Instructors have `grades:own-classes:manage` (existing)
- Department admins can override any grades in their department

**Updated role:**
```typescript
// department-admin now has:
'grades:department:read',
'grades:department:manage'  // Grade override capability
```

---

## Permission Updates Summary

| Permission | Added To | Purpose |
|------------|----------|---------|
| `content:assessments:manage` | content-admin | Question bank management |
| `enrollment:own:manage` | course-taker | Self-enrollment (replaced `enrollment:own:update`) |
| `grades:department:read` | department-admin | View all department grades |
| `grades:department:manage` | department-admin | Grade override capability |

---

## Answers to Your Questions

1. **Which permissions should be added?**
   - `content:assessments:manage` for question banks
   - `enrollment:own:manage` for self-enrollment
   - `grades:department:manage` for grade override

2. **Planned permission changes?**
   - No major changes planned. FERPA-specific permissions will be added when requirements are finalized.

3. **Question bank permission?**
   - Use `content:assessments:manage` (now added to content-admin)
   - `content:exams:manage` can also be used as fallback - both are valid for assessment content

---

## Migration Notes

Run `npm run seed:roles` to update role definitions in the database.

---

**All clarifications complete. Let us know if you need additional permissions!**

---

*Thread can be archived when UI updates are complete*
