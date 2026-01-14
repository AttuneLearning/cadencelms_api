# Issue Queue Index

**Last Updated:** 2026-01-14 (16:00)

## Overview

This index provides a quick reference to all UI issues. Individual issue documents are organized into:
- `issue_queue/` - Pending issues awaiting implementation
- `issue_queue_complete/` - Completed issues (archived for reference)

## Status Summary

- **Total Issues:** 21
- **Completed:** 18 ✅ (86% completion rate)
- **Pending:** 3

## Priority Breakdown

- **Critical:** 1 completed (API issue) ✅
- **High:** 10 (3 pending, 7 completed) ⭐
- **Medium:** 2 (2 completed)
- **Low:** 3 (3 completed) ✅

---

## Pending Issues (3)

### High Priority

| Issue | Title | Type | Location | Notes |
|-------|-------|------|----------|-------|
| ISS-019 | Rename CourseSegment to CourseModule Throughout UI | refactor | [issue_queue/ISS-019.md](./issue_queue/ISS-019.md) | **PRIORITY** - Blocks ISS-020 |
| ISS-020 | Wire Up Staff Course Builder Routes | feature | [issue_queue/ISS-020.md](./issue_queue/ISS-020.md) | Depends on ISS-019 |
| ISS-021 | Role Permission Updates - Grade Override & Billing Course View | feature | [issue_queue/ISS-021.md](./issue_queue/ISS-021.md) | ✅ Contracts updated, ready for UI |

---

## Completed Issues (18)

| Issue | Title | Type | Completion Date | Location |
|-------|-------|------|-----------------|----------|
| ISS-001 | Profile Page - Complete Implementation with IPerson Type | feature | git: fa63fe9 | [issue_queue_complete/ISS-001.md](./issue_queue_complete/ISS-001.md) |
| ISS-002 | Separate Change Password Page | feature | git: 6dc3a5a | [issue_queue_complete/ISS-002.md](./issue_queue_complete/ISS-002.md) |
| ISS-003 | "My Progress" Link Causes Infinite Loading Loop on Non-Learner Dashboards | bug | - | [issue_queue_complete/ISS-003.md](./issue_queue_complete/ISS-003.md) |
| ISS-004 | Sidebar Link Highlighting Inconsistent Across Dashboards | bug | - | [issue_queue_complete/ISS-004.md](./issue_queue_complete/ISS-004.md) |
| ISS-005 | Add confirmation dialog to delete course button | bug | Already impl. | [issue_queue_complete/ISS-005.md](./issue_queue_complete/ISS-005.md) |
| ISS-006 | Test Suite Improvements - Update Dependencies and Fix Warnings | refactor | - | [issue_queue_complete/ISS-006.md](./issue_queue_complete/ISS-006.md) |
| ISS-007 | Consolidate Sidebar Navigation - Remove Duplicate Dashboards | bug | - | [issue_queue_complete/ISS-007.md](./issue_queue_complete/ISS-007.md) |
| ISS-008 | Fix Page Load Loops on Certificates and Departments Pages | bug | - | [issue_queue_complete/ISS-008.md](./issue_queue_complete/ISS-008.md) |
| ISS-009 | Align API Client Token Handling with Auth Storage | bug | - | [issue_queue_complete/ISS-009.md](./issue_queue_complete/ISS-009.md) |
| ISS-010 | PersonExtended & Demographics Profile Forms - Staff & Learner | feature | 2026-01-13 | [issue_queue_complete/ISS-010.md](./issue_queue_complete/ISS-010.md) |
| ISS-011 | Encrypt Identification Numbers at Rest (Security Critical) | feature (security) | 2026-01-14 (API) | [issue_queue_complete/ISS-011.md](./issue_queue_complete/ISS-011.md) |
| ISS-012 | Financial Aid Fields Integration - Learner Demographics | feature | 2026-01-13 | [issue_queue_complete/ISS-012.md](./issue_queue_complete/ISS-012.md) |
| ISS-013 | Admin Tab Requires Escalation Password Modal | feature | 2026-01-13 | [issue_queue_complete/ISS-013.md](./issue_queue_complete/ISS-013.md) |
| ISS-014 | Dashboard Navigation Consistency - Complete Navigation Structure | feature | 2026-01-14 | [issue_queue_complete/ISS-014.md](./issue_queue_complete/ISS-014.md) |
| ISS-015 | Dashboard NavItem Not Dynamic - Hardcoded to Learner Dashboard | bug | 2026-01-13 | [issue_queue_complete/ISS-015.md](./issue_queue_complete/ISS-015.md) |
| ISS-016 | Certificates Link Label Shows "test-certificates" Instead of "Certificates" | bug | 2026-01-13 | [issue_queue_complete/ISS-016.md](./issue_queue_complete/ISS-016.md) |
| ISS-017 | Department Management - Create Department & Staff Assignment UI | feature | 2026-01-14 | [issue_queue_complete/ISS-017.md](./issue_queue_complete/ISS-017.md) |
| ISS-018 | Add Password Visibility Toggle to All Password Fields | polish | 2026-01-14 | [issue_queue_complete/ISS-018.md](./issue_queue_complete/ISS-018.md) |

---

## Issue Types

- **Feature:** 9 issues (3 pending, 6 completed) ⭐
- **Bug:** 8 issues (0 pending, 8 completed) ✅ All bugs fixed!
- **Refactor:** 2 issues (1 pending, 1 completed)
- **Security:** 1 issue (1 completed - API) ✅
- **Polish:** 1 issue (1 completed) ✅

---

## Quick Reference

### By Issue Number

- **ISS-001:** Profile Page Implementation (✅ completed, git: fa63fe9) - [View](./issue_queue_complete/ISS-001.md)
- **ISS-002:** Change Password Page (✅ completed, git: 6dc3a5a) - [View](./issue_queue_complete/ISS-002.md)
- **ISS-003:** My Progress Link Loop (✅ completed) - [View](./issue_queue_complete/ISS-003.md)
- **ISS-004:** Sidebar Highlighting (✅ completed) - [View](./issue_queue_complete/ISS-004.md)
- **ISS-005:** Delete Course Confirmation (✅ already impl.) - [View](./issue_queue_complete/ISS-005.md)
- **ISS-006:** Test Suite Improvements (✅ completed) - [View](./issue_queue_complete/ISS-006.md)
- **ISS-007:** Consolidate Sidebar (✅ completed) - [View](./issue_queue_complete/ISS-007.md)
- **ISS-008:** Page Load Loops (✅ completed) - [View](./issue_queue_complete/ISS-008.md)
- **ISS-009:** API Token Handling (✅ completed) - [View](./issue_queue_complete/ISS-009.md)
- **ISS-010:** Profile Extended Forms (✅ completed, 2026-01-13) - [View](./issue_queue_complete/ISS-010.md)
- **ISS-011:** Encrypt ID Numbers (✅ completed by API, 2026-01-14, commit: 7d7f2ca) - [View](./issue_queue_complete/ISS-011.md)
- **ISS-012:** Financial Aid Fields (✅ completed, 2026-01-13) - [View](./issue_queue_complete/ISS-012.md)
- **ISS-013:** Admin Escalation Modal (✅ completed, 2026-01-13, 2 phases) - [View](./issue_queue_complete/ISS-013.md)
- **ISS-014:** Dashboard Navigation (✅ completed, 2026-01-14) - [View](./issue_queue_complete/ISS-014.md)
- **ISS-015:** Dynamic Dashboard NavItem (✅ completed, 2026-01-13) - [View](./issue_queue_complete/ISS-015.md)
- **ISS-016:** Certificates Link Label (✅ completed, 2026-01-13) - [View](./issue_queue_complete/ISS-016.md)
- **ISS-017:** Department Management UI (✅ completed, 2026-01-14) - [View](./issue_queue_complete/ISS-017.md)
- **ISS-018:** Password Visibility Toggle (✅ completed, 2026-01-14) - [View](./issue_queue_complete/ISS-018.md)
- **ISS-019:** Segment → Module Rename (⏳ pending, **PRIORITY**, blocks ISS-020) - [View](./issue_queue/ISS-019.md)
- **ISS-020:** Staff Course Builder Routes (⏳ pending, depends on ISS-019) - [View](./issue_queue/ISS-020.md)
- **ISS-021:** Role Permission Updates (✅ contracts updated, ready for UI) - [View](./issue_queue/ISS-021.md)

---

## Session Progress (2026-01-13 → 2026-01-14)

**Issues Completed This Session:**
1. ✅ **ISS-015** - Dashboard NavItem dynamic routing (commit: 6be9cf0)
2. ✅ **ISS-016** - Certificates link label fix (commit: cf2055e)
3. ✅ **ISS-005** - Verified already implemented
4. ✅ **ISS-002** - Verified completed (git: 6dc3a5a)
5. ✅ **ISS-001** - Verified completed (git: fa63fe9)
6. ✅ **ISS-012** - Verified UI implementation complete
7. ✅ **ISS-013** - Admin Escalation Modal & Session Management (commits: 8e98ae9, c052af2) ⭐
8. ✅ **ISS-014** - Dashboard Navigation Consistency - Complete Navigation Structure ⭐
9. ✅ **ISS-011** - Encrypt ID Numbers - Completed by API team (commit: 7d7f2ca, no UI changes) ⭐
10. ✅ **ISS-018** - Password Visibility Toggle - PasswordInput component (pending commit) ⭐

**Git Commits Made:**
- `6be9cf0` - fix(ISS-015): make Dashboard nav link context-aware
- `cf2055e` - fix(ISS-016): correct Certificates link label
- `8e98ae9` - feat(ISS-013 Phase 1): admin escalation modal
- `c052af2` - feat(ISS-013 Phase 2): session management & timeout
- (pending) - feat(ISS-014): standardize navigation across all dashboards

**Test Results:**
- All sidebar tests passing (60 tests)
- TypeScript compilation clean (no new errors)
- No regressions introduced

**ISS-013 Implementation Highlights:**
- Phase 1: Escalation modal with password verification, route protection
- Phase 2: Session timeout (15min), activity tracking, countdown indicator, de-escalation UI
- Security: Memory-only token storage, auto de-escalation on timeout

**ISS-014 Implementation Highlights:**
- Added System Analytics and System Reports to Admin dashboard
- Added My Classes (teaching) to Staff dashboard (non-department-scoped)
- Added Calendar view to all three dashboards (Learner, Staff, Admin)
- Created placeholder pages for future implementation
- Updated navItems configuration (v4.0.0) and router

---

## Recommended Work Order for Remaining Issues

Based on priority, complexity, and dependencies:

1. **ISS-019** (High, Refactor) - Rename CourseSegment → CourseModule - **DO FIRST** (blocks ISS-020)
2. **ISS-020** (High, Feature) - Wire Up Staff Course Builder Routes - Depends on ISS-019
3. **ISS-021** (High, Feature) - Role Permission Updates - API contract pending

**Reference Specs:**
- [COURSE_ROLE_FUNCTION_MATRIX.md](./specs/COURSE_ROLE_FUNCTION_MATRIX.md) ✅ APPROVED
- [CONTENT_ADMIN_FLOW_DESIGN.md](./specs/CONTENT_ADMIN_FLOW_DESIGN.md)

---

## Notes

- ✅ **ALL UI BUGS RESOLVED** - 8/8 bug issues completed
- ✅ **ALL SECURITY ISSUES RESOLVED** - ISS-011 encryption completed by API team
- ✅ **ALL POLISH ISSUES RESOLVED** - ISS-018 password visibility toggle completed
- ✅ **ISS-017 Department Management COMPLETED** - 2026-01-14
- ⏳ 3 remaining pending issues:
  - **ISS-019** - Segment → Module Rename (refactor, blocks ISS-020)
  - **ISS-020** - Staff Course Builder Routes (depends on ISS-019)
  - **ISS-021** - Role Permission Updates (API contract pending)
- 📊 Issue completion rate: **86%** (18/21)
- 🎯 Dependency chain: ISS-019 → ISS-020 (must complete rename before routing)
- 📋 **Approved Specs:** COURSE_ROLE_FUNCTION_MATRIX.md, CONTENT_ADMIN_FLOW_DESIGN.md
- 🚀 Major features completed in this session: Admin Escalation & Session Management (ISS-013), Dashboard Navigation Consistency (ISS-014), ID Number Encryption (ISS-011 via API), Password Visibility Toggle (ISS-018), Department Management (ISS-017)

---

## Archive Information

Completed issues are moved to `issue_queue_complete/` for reference. Each completed issue document includes:
- Final status and completion date
- Implementation details and commit references
- Related files and test results
- Any notes or clarifications from implementation

