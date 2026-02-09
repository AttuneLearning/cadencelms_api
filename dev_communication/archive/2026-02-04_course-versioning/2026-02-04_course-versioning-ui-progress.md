# Course Versioning UI Progress - Response

**Date:** 2026-02-04
**From:** UI Team
**To:** API Team
**Priority:** Medium
**Type:** Response
**In-Response-To:** `api-to-ui/2026-02-04_course-versioning-system-response.md`
**Related Issues:** UI-ISS-001 (in progress)

---

## Status

**Complete** - All UI phases that can be built with mock data are now ready.

## Summary

We've completed implementation of all UI types, entities, mock data, and feature components for the entire versioning system. Everything is ready for integration as soon as API endpoints become available.

---

## Implementation Details

### New Entities Created

| Entity | Path | Description |
|--------|------|-------------|
| `course-version` | `src/entities/course-version/` | CanonicalCourse, CourseVersion, CourseVersionListItem, ModuleEditLock types |
| `credential` | `src/entities/credential/` | CredentialGroup, CertificateDefinition, CertificateIssuance types |
| `notification` | `src/entities/notification/` | Notification, NotificationTemplate, priority/icon helpers |
| `access-policy` | `src/entities/access-policy/` | DepartmentAccessPolicy, ProgramAccessOverride, ProgramEnrollment types |
| `module` (updated) | `src/entities/module/` | Added ModuleLibraryItem, ModuleUsage, ModuleCompletion, ModuleEditLock |

### New Features Created

| Feature | Path | Components |
|---------|------|------------|
| `course-versioning` | `src/features/course-versioning/` | VersionHistoryDialog, VersionBadge, CreateVersionDialog |
| `module-library` | `src/features/module-library/` | ModuleLibraryCard, ModuleLibraryBrowser, AddModuleToCourseDialog |
| `credential-management` | `src/features/credential-management/` | CredentialGroupCard, CertificateDefinitionList, CertificateUpgradeDialog, CertificateIssuanceCard |
| `notifications` | `src/features/notifications/` | NotificationBell, NotificationItem, NotificationList |

### Mock Data Created

| File | Description |
|------|-------------|
| `courseVersions.ts` | Mock canonical courses, version list, edit locks |
| `credentials.ts` | Mock credential groups, certificate definitions, issuances |
| `notifications.ts` | Mock notifications and templates |
| `accessPolicies.ts` | Mock policies, overrides, enrollments, extension requests |
| `moduleLibrary.ts` | Mock module library items and usage data |

---

## Response to Questions

1. **Module Library UI: Do you have designs for a module browser/library view?**

   **Yes, now implemented.** We've created:
   - `ModuleLibraryBrowser` - Full browsing interface with search, filters (department, published status), grid/list view toggle
   - `ModuleLibraryCard` - Card component showing module title, description, duration, learning unit count, usage stats, completion rate
   - `AddModuleToCourseDialog` - Dialog for adding a module to a course version with order selection and required toggle
   - `ModuleUsageWarning` - Warning component showing affected courses when editing shared modules

2. **Version Indicator Placement: Where should version badges appear?**

   **Decision: Separate badge/chip.** We've implemented:
   - `VersionBadge` component with `[v2]` monospace badge
   - Lock icon displayed when version is locked
   - "Latest" badge for current version
   - Tooltip showing lock reason when applicable

   Example rendering: `[v2] [Lock icon] [Latest]`

3. **Draft Editing Lock: Single-editor locks or last-write-wins?**

   **Decision: Module-level locks with heartbeat.** We've added types for:
   - `ModuleEditLock` - Lock with userId, userName, acquiredAt, expiresAt
   - `ModuleEditLockStatus` - Status response including lock holder and access requests
   - UI will poll for lock status and show "Locked by [Name]" message
   - Support for access request flow when another user holds the lock

   This aligns with your API-ISS-021 design (30-min expiry, 5-min heartbeat).

4. **Notification Preferences: Should learners configure preferences?**

   **Decision: Defer to post-launch.** Agreed. We'll design the preferences UI when the core notification system is stable.

---

## What's Ready for Each Phase

### Phase 1 (Course Versioning)
- VersionHistoryDialog - shows all versions of a course
- VersionBadge - inline version display
- CreateVersionDialog - create new draft from published
- CourseManagementPage updated with version column and edit permissions

### Phase 2 (Module Sharing)
- ModuleLibraryBrowser - browse all shared modules
- ModuleLibraryCard - display module with usage stats
- AddModuleToCourseDialog - add module to course version
- ModuleUsageWarning - show affected courses
- Edit lock types ready for integration

### Phase 3 (Credentials)
- CredentialGroupCard - display credential groups
- CertificateDefinitionList - list with versioning info
- CertificateIssuanceCard - display issued certificates
- CertificateUpgradeDialog - learner upgrade flow

### Phase 4 (Notifications & Access)
- NotificationBell - header dropdown
- NotificationList - full list with filters
- NotificationItem - individual notification display
- Access policy types ready (UI pages to be built when API ready)

---

## Next Steps

**UI Team:**
- [x] All types and mock data created
- [x] All feature components created
- [ ] Wire up API calls when Phase 1 endpoints are ready
- [ ] Build full pages (Module Library Page, Credential Management Page)

**API Team:**
- [ ] Complete Phase 1 implementation
- [ ] Send Phase 1 contract for final review
- [ ] Notify when ready for integration testing

---

## Integration Notes

All UI components currently use mock data from `src/test/mocks/data/`. When API endpoints are ready:

1. We'll create API hooks in each entity's `api/` folder
2. Replace mock data with real API calls
3. Add proper error handling and loading states

The type definitions match our spec documents, so integration should be straightforward. Let us know if you need any type adjustments based on your implementation.

---

*Message from UI Team - 2026-02-04*
