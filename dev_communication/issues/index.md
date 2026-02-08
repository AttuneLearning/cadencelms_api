# Issues

Development issue tracking for API and UI teams.

## Issue Lifecycle

```
┌─────────┐      ┌─────────┐      ┌───────────┐
│  queue/ │ ───► │ active/ │ ───► │ completed/│
└─────────┘      └─────────┘      └───────────┘
  Ready to        In progress       Done
  work
```

**Move the file** between folders as status changes.

## Directories

### API Team (`issues/api/`)
| Folder | Count | Description |
|--------|-------|-------------|
| `queue/` | 14 | Ready to work |
| `active/` | 0 | In progress |
| `completed/` | 1 | Done |

**Recently Completed (2026-02-05):**
- API-ISS-024: Legacy Role Authorization Cleanup (High) - COMPLETE

**Queue:**
- API-ISS-009: Question Model - Monolithic Design Update (High)
- API-ISS-010: Flashcard System Implementation (High)
- API-ISS-011: Matching Exercise Implementation (High)
- API-ISS-012: Media Upload System - S3 + Local (High)
- API-ISS-013: Retention Check & Remediation System (Medium)

**Course Versioning System (API-ISS-014 to API-ISS-021):**
- API-ISS-014: Course Versioning Core (High) - Phase 1 Foundation
- API-ISS-015: Course Version Module Management (High) - Phase 1, depends on 014
- API-ISS-016: Module Sharing & Global Completion (High) - Phase 2, depends on 014-015
- API-ISS-017: Credential Groups & Certificate Definitions (High) - Phase 3, depends on 014
- API-ISS-018: Certificate Issuance & Verification (High) - Phase 3, depends on 017
- API-ISS-019: Access Policies & Duration Management (Medium) - Phase 4, depends on 014, 017
- API-ISS-020: Notification System (Medium) - Phase 4, depends on 017-019
- API-ISS-021: Module Edit Locking (Medium) - Phase 2, per UI request

**Learner Directory Enhancement (API-ISS-022 to API-ISS-023):**
- API-ISS-022: Learner Directory Permission (High) - New permission tier
- API-ISS-023: Prioritized Learner List (High) - Enrollment workflow, depends on 022

**Authorization Cleanup:**
- ~~API-ISS-024: Legacy Role Authorization Cleanup (High) - COMPLETE~~

### UI Team (`issues/ui/`)
| Folder | Count | Description |
|--------|-------|-------------|
| `queue/` | 31 | Ready to work |
| `active/` | 3 | In progress |
| `completed/` | 4 | Done |

**Active Issues:**
- UI-ISS-071: Missing Create Flashcard Deck Page (High)
- UI-ISS-072: Missing Create Matching Game Page (High)
- UI-ISS-082: Course Enrollment Pages (High) - IN REVIEW

**Recently Completed (2026-02-05):**
- UI-ISS-081: Fix Permission String Mismatches (High) - COMPLETE

**Question System Migration (UI-ISS-075 to UI-ISS-080):**
- UI-ISS-075: Question System Type Alignment (High) - Foundation
- UI-ISS-076: QuestionForm Enhancement (High) - Depends on 075
- UI-ISS-077: QuestionRenderer Enhancement (High) - Depends on 075
- UI-ISS-078: Page Integration (Medium) - Depends on 075-077
- UI-ISS-079: API Integration (Medium) - Depends on 075
- UI-ISS-080: Testing & Polish (Medium) - Depends on 075-079

**Learner Course Experience — Critical Gaps (UI-ISS-094 to UI-ISS-096):**
- UI-ISS-094: Multi-Lesson Module Support in Course Player (Critical)
- UI-ISS-095: Course Completion Flow & Celebration (Critical)
- UI-ISS-096: Exercise Retry Flow with Configurable Attempt Limits (Critical)

**Certificate & Credential System:**
- UI-ISS-097: Certificate & Badge System — Full Integration (High) - Depends on API-ISS-017, API-ISS-018

**Placeholders — Future Exploration:**
- UI-ISS-098: Dates, Deadlines & Valid-Until — Exploration (Low)
- UI-ISS-099: Messaging, Announcements & Reminders System (Medium) — Placeholder

**Next Phase — After Critical Gaps:**
- UI-ISS-100: Discussion Forums & Exceptions (Medium)
- UI-ISS-101: Assignment Submissions (Medium)
- UI-ISS-102: Learning Paths & Programs — Learner View (Medium)
- UI-ISS-104: Audio Content Type (Medium)

**Delayed — Later Priority:**
- UI-ISS-103: Notifications — Full Wiring & Integration (Low)

## Naming Convention

```
{TEAM}-ISS-{NNN}_{brief_description}.md
```

Examples:
- `API-ISS-001_department_learners_endpoint.md`
- `UI-ISS-042_certificate_config_modal.md`

## Issue Numbering

| Team | Prefix | Next Number |
|------|--------|-------------|
| API | API-ISS- | 025 |
| UI | UI-ISS- | 105 |

*Update "Next Number" when creating issues*

## Templates

- [[templates/issue-template|Issue Template]]

## Creating an Issue

1. Copy template from `templates/issue-template.md`
2. Fill in all sections
3. Save to `{team}/queue/` with proper naming
4. Update "Next Number" above

## Working an Issue

1. Move file from `queue/` to `active/`
2. Update status in file to "IN PROGRESS"
3. Work the issue
4. When complete, update status to "COMPLETE"
5. Move file from `active/` to `completed/`

## Cross-Team Issues

When an issue requires work from both teams:

1. Create issue in requesting team's queue
2. Add `Blocked-By:` or `Depends-On:` fields
3. Create corresponding issue in other team's queue
4. Link with `Related:` field in both

## Priority Levels

| Priority | Description | Response Time |
|----------|-------------|---------------|
| Critical | Blocking production | Immediate |
| High | Blocking development | Same day |
| Medium | Important feature | This sprint |
| Low | Nice to have | When available |

---

[[../index|← Back to Hub]]
