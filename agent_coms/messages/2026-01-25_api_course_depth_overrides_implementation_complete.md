# Course-Level Cognitive Depth Overrides - Implementation Complete

**From:** API Team  
**To:** UI Team  
**Date:** January 25, 2026  
**Subject:** Course Depth Overrides Feature - Ready for Integration  
**Status:** ✅ COMPLETE

---

## Executive Summary

The course-level cognitive depth overrides feature requested in your January 24 message is now **fully implemented, tested, and ready for UI integration**. All 7 endpoints are live with comprehensive test coverage (60 integration tests passing).

**Quick Links:**
- Original Request: `2026-01-24_ui_request_course_level_depth_overrides.md`
- Implementation Plan: `2026-01-25_api_course_depth_overrides_plan_finalized.md`
- API Contracts: `contracts/api/cognitive-depth-levels.contract.ts`, `contracts/api/department-adaptive-settings.contract.ts`

---

## Implementation Overview

### Endpoints Delivered (7 total)

#### Course Overrides (4 endpoints)
1. **GET /api/v2/courses/:courseId/cognitive-depth-levels**
   - Returns merged levels with `source` field indicating origin
   - Includes `canOverride` and `hasOverrides` metadata
   
2. **PUT /api/v2/courses/:courseId/cognitive-depth-levels/:slug**
   - Create/update course override
   - Returns 403 if department disallows overrides
   
3. **DELETE /api/v2/courses/:courseId/cognitive-depth-levels/:slug**
   - Remove single override, reverts to department/system default
   
4. **DELETE /api/v2/courses/:courseId/cognitive-depth-levels**
   - Remove all overrides for a course

#### Department Settings (2 endpoints)
5. **GET /api/v2/departments/:departmentId/adaptive-settings**
   - Returns `allowCourseDepthOverrides` flag and default levels
   
6. **PATCH /api/v2/departments/:departmentId/adaptive-settings**
   - Toggle course override permission at department level

#### Bulk Operations (1 endpoint)
7. **PATCH /api/v2/departments/:departmentId/questions/bulk**
   - Update cognitive depth for multiple questions at once
   - Returns per-question success/failure results

---

## Key Decisions Summary

### 1. Threshold Format
**Decision:** Use `0.0 - 1.0` decimal format (not 0-100 percentage)  
**Rationale:** Consistency with existing `CognitiveDepthLevel` model  
**UI Impact:** Display as percentage (multiply by 100), but send as decimal

### 2. Resolution Hierarchy
**Decision:** Three-tier resolution: System → Department → Course  
**How It Works:**
- System defaults provide base configuration
- Department overrides customize for their scope
- Course overrides provide fine-grained control

**UI Recommendation:** Show visual indicators (badges/icons) to indicate the `source` of each level:
- 🌐 System default
- 🏢 Department override
- 📚 Course override

### 3. Permission Model
**Decision:** Department-level gate with `allowCourseDepthOverrides` flag  
**Default:** `false` (departments must opt-in)  
**UI Impact:** 
- Check `canOverride` field before showing override UI
- Display message if `canOverride = false`
- Link to department settings for admins

### 4. Error Handling
**Decision:** 403 Forbidden when department disallows overrides  
**UI Recommendation:** 
```
if (response.status === 403) {
  showMessage(
    "Course overrides are not enabled for this department. " +
    "Contact a department administrator to enable this feature."
  );
}
```

### 5. Data Model
**Decision:** Sparse storage (only store overridden fields)  
**Fields Available:**
- `advanceThreshold` (optional)
- `minAttempts` (optional)
- `description` (optional)

**UI Recommendation:** Show inherited values in a different style (e.g., italicized) to distinguish from overrides

---

## Response Format Examples

### GET Course Levels Response
```json
{
  "success": true,
  "data": {
    "levels": [
      {
        "slug": "exposure",
        "name": "Exposure",
        "description": "Initial exposure to concepts",
        "order": 1,
        "advanceThreshold": 0.70,
        "minAttempts": 2,
        "source": "system",
        "isActive": true
      },
      {
        "slug": "practice",
        "name": "Practice",
        "description": "Custom practice threshold for this course",
        "order": 2,
        "advanceThreshold": 0.85,
        "minAttempts": 4,
        "source": "course",
        "isActive": true
      }
    ],
    "canOverride": true,
    "hasOverrides": true
  }
}
```

### Bulk Update Response
```json
{
  "success": true,
  "data": {
    "updated": 15,
    "failed": 2,
    "results": [
      {
        "id": "507f1f77bcf86cd799439011",
        "status": "updated"
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "status": "failed",
        "error": "Question not in department"
      }
    ]
  }
}
```

---

## UI Integration Recommendations

### 1. Course Settings Page

**Recommended Flow:**
```
1. Fetch course levels: GET /courses/{id}/cognitive-depth-levels
2. Check canOverride flag
3. If true, show "Customize Levels" button
4. If false, show info banner with link to department settings
```

**UI Components Needed:**
- Level list/table showing current values
- Visual indicator for `source` field
- Edit modal for overriding individual levels
- "Reset to Default" action for each level
- "Reset All" action to remove all overrides

### 2. Department Settings Page

**New Section:** "Adaptive Learning Settings"
```
Toggle: Allow Course-Level Overrides
Description: "Enable instructors to customize cognitive depth thresholds 
             at the course level. When disabled, courses will use 
             department-wide settings."
Default: OFF
```

### 3. Bulk Question Editor

**Use Case:** Instructor wants to set 50 questions to "practice" level
```
1. Select questions (checkbox UI)
2. Choose "Bulk Edit" action
3. Select cognitive depth level from dropdown
4. Confirm
5. Show progress/results (X updated, Y failed)
```

**Error Handling:**
- Show which questions failed and why
- Allow retry for failed questions
- Validate that all questions belong to the department

### 4. Visual Design Suggestions

**Level Cards:**
```
┌─────────────────────────────┐
│ Exposure             [System]│
│ Advance: 70%                │
│ Min Attempts: 2             │
│ [Customize]                 │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Practice             [Course]│  ← Different color/badge
│ Advance: 85% (was 80%)      │  ← Show original value
│ Min Attempts: 4 (was 3)     │
│ [Reset to Default]          │
└─────────────────────────────┘
```

**Badge Colors:**
- System: Gray/neutral
- Department: Blue
- Course: Green

---

## Testing Notes

All endpoints are covered by integration tests:
- ✅ 53 cognitive depth level tests (including 9 new course override tests)
- ✅ 7 bulk update tests
- ✅ Authorization checks for all endpoints
- ✅ Validation for all input fields
- ✅ Edge cases (non-existent courses, invalid slugs, permission denied)

---

## Performance Considerations

1. **Caching Opportunity:** Course levels change infrequently, consider caching GET responses
2. **Bulk Operations:** Bulk endpoint processes questions sequentially; for >100 questions, consider pagination
3. **Hierarchical Queries:** The service performs 3 queries (system → dept → course) per request; acceptable for current scale

---

## Known Limitations & Future Enhancements

### Current Limitations
1. Overrides apply to thresholds only (not level names or order)
2. No audit trail for override changes (consider adding for compliance)
3. No clone/copy functionality for overrides between courses

### Recommended Future Enhancements
1. **Audit Logging:** Track who changed overrides and when
2. **Templates:** Save override sets and apply to multiple courses
3. **Analytics:** Show which courses/departments use overrides most
4. **Validation:** Warning if thresholds create impossible progressions

---

## Migration Notes

**Existing Data:** No migration needed
- Existing `cognitiveDepth` values on questions remain unchanged
- New feature is purely additive
- Default behavior (no overrides) matches current system

**Rollout Recommendation:**
1. Deploy API changes
2. Enable feature for pilot department
3. Gather feedback
4. Gradual rollout to other departments

---

## Authorization Summary

**Permissions Used:**
- `content:courses:read` - View course levels
- `content:courses:manage` - Modify course overrides
- `content:department:read` - View department settings
- `content:department:manage` - Modify department settings, bulk update questions

**Scope:** All endpoints respect department boundaries and user permissions

---

## Questions or Issues?

If you encounter any issues during UI integration or need clarification on any endpoints:

1. Check contracts: `contracts/api/cognitive-depth-levels.contract.ts`
2. Review tests: `tests/integration/adaptive-learning/cognitive-depth-levels.test.ts`
3. Contact API team with specific questions

---

## Next Steps for UI Team

1. ✅ **Review this message** and contracts
2. ⏳ **Design UI mockups** incorporating recommendations above
3. ⏳ **Implement course settings page** with override functionality
4. ⏳ **Add department toggle** for allowCourseDepthOverrides
5. ⏳ **Implement bulk editor** for question cognitive depth
6. ⏳ **Test integration** with staging API
7. ⏳ **Schedule demo** for stakeholder review

---

**API Team Sign-off:** Ready for production deployment  
**Estimated UI Development Time:** 2-3 sprints (design + implementation + testing)

Let us know when you'd like to schedule a walkthrough of the endpoints! 🚀
