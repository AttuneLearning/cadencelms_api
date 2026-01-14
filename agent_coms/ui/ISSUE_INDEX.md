# Issue Queue Index

**Last Updated:** 2026-01-14 (02:05)

## Overview

This index provides a quick reference to all UI issues. Individual issue documents are organized into:
- `issue_queue/` - Pending issues awaiting implementation
- `issue_queue_complete/` - Completed issues (archived for reference)

## Status Summary

- **Total Issues:** 18
- **Completed:** 15 ✅ (83% completion rate)
- **Pending:** 3

## Priority Breakdown

- **Critical:** 1 pending (API issue)
- **High:** 7 (1 pending, 6 completed) ⭐
- **Medium:** 2 (1 completed, 1 pending as part of ISS-010)
- **Low:** 3 (2 completed, 1 pending)

---

## Pending Issues (3)

### Critical Priority

| Issue | Title | Type | Location | Notes |
|-------|-------|------|----------|-------|
| ISS-011 | Encrypt Identification Numbers at Rest (Security Critical) | feature (security) | [issue_queue/ISS-011.md](./issue_queue/ISS-011.md) | **API AGENT** - Backend encryption implementation |

### High Priority

| Issue | Title | Type | Location | Notes |
|-------|-------|------|----------|-------|
| ISS-017 | Department Management - Create Department & Staff Assignment UI | feature | [issue_queue/ISS-017.md](./issue_queue/ISS-017.md) | Large feature - department CRUD UI |

### Low Priority

| Issue | Title | Type | Location | Notes |
|-------|-------|------|----------|-------|
| ISS-018 | Add Password Visibility Toggle to All Password Fields | polish | [issue_queue/ISS-018.md](./issue_queue/ISS-018.md) | UX improvement - reusable component |

---

## Completed Issues (15)

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
| ISS-012 | Financial Aid Fields Integration - Learner Demographics | feature | 2026-01-13 | [issue_queue_complete/ISS-012.md](./issue_queue_complete/ISS-012.md) |
| ISS-013 | Admin Tab Requires Escalation Password Modal | feature | 2026-01-13 | [issue_queue_complete/ISS-013.md](./issue_queue_complete/ISS-013.md) |
| ISS-014 | Dashboard Navigation Consistency - Complete Navigation Structure | feature | 2026-01-14 | [issue_queue_complete/ISS-014.md](./issue_queue_complete/ISS-014.md) |
| ISS-015 | Dashboard NavItem Not Dynamic - Hardcoded to Learner Dashboard | bug | 2026-01-13 | [issue_queue_complete/ISS-015.md](./issue_queue_complete/ISS-015.md) |
| ISS-016 | Certificates Link Label Shows "test-certificates" Instead of "Certificates" | bug | 2026-01-13 | [issue_queue_complete/ISS-016.md](./issue_queue_complete/ISS-016.md) |

---

## Issue Types

- **Feature:** 7 issues (1 pending, 6 completed) ⭐
- **Bug:** 8 issues (0 pending, 8 completed) ✅ All bugs fixed!
- **Refactor:** 1 issue (1 completed)
- **Security:** 1 issue (1 pending - API)
- **Polish:** 1 issue (1 pending - UX improvement)

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
- **ISS-011:** Encrypt ID Numbers (⏳ pending, API issue) - [View](./issue_queue/ISS-011.md)
- **ISS-012:** Financial Aid Fields (✅ completed, 2026-01-13) - [View](./issue_queue_complete/ISS-012.md)
- **ISS-013:** Admin Escalation Modal (✅ completed, 2026-01-13, 2 phases) - [View](./issue_queue_complete/ISS-013.md)
- **ISS-014:** Dashboard Navigation (✅ completed, 2026-01-14) - [View](./issue_queue_complete/ISS-014.md)
- **ISS-015:** Dynamic Dashboard NavItem (✅ completed, 2026-01-13) - [View](./issue_queue_complete/ISS-015.md)
- **ISS-016:** Certificates Link Label (✅ completed, 2026-01-13) - [View](./issue_queue_complete/ISS-016.md)
- **ISS-017:** Department Management UI (⏳ pending, large feature) - [View](./issue_queue/ISS-017.md)
- **ISS-018:** Password Visibility Toggle (⏳ pending, low priority) - [View](./issue_queue/ISS-018.md)

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

1. **ISS-011** (Critical) - **API AGENT** - Encrypt Identification Numbers - Security critical, API implementation required
2. **ISS-017** (High) - Department Management UI - Admin feature, requires planning
3. **ISS-018** (Low) - Password Visibility Toggle - UX polish, low priority

---

## Notes

- ✅ **ALL UI BUGS RESOLVED** - 8/8 bug issues completed
- ⏳ 3 remaining pending issues (2 features + 1 polish)
- 🔒 ISS-011 is assigned to API Agent (backend encryption work)
- 📊 Issue completion rate: 83% (15/18) ⭐
- 🎯 Remaining work is primarily feature development, not bug fixes
- 🚀 Major features completed in this session: Admin Escalation & Session Management (ISS-013), Dashboard Navigation Consistency (ISS-014)

---

## Archive Information

Completed issues are moved to `issue_queue_complete/` for reference. Each completed issue document includes:
- Final status and completion date
- Implementation details and commit references
- Related files and test results
- Any notes or clarifications from implementation

