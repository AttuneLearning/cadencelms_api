# Issues

Development issue tracking across teams.

## Issue Lifecycle

```
┌─────────┐      ┌─────────┐      ┌───────────┐
│  queue/  │ ───► │ active/ │ ───► │ completed/│
└─────────┘      └─────────┘      └───────────┘
  Ready to        In progress       Done
  work
```

**Move the file** between folders as status changes.

## Teams

### Backend (`backend/issues/`)
| Folder | Count | Description |
|--------|-------|-------------|
| `queue/` | 0 | Ready to work |
| `active/` | 0 | In progress |
| `completed/` | 34 | Done |

**Current Queue (0):**
_(No issues in queue)_

**Completed (34):**
- ~~API-ISS-009 through API-ISS-042~~ All moved to completed/

### Frontend (`frontend/issues/`)
| Folder | Count | Description |
|--------|-------|-------------|
| `queue/` | 1 | Ready to work |
| `active/` | 1 | In progress |
| `completed/` | 75 | Done |

**Active (1):**
- UI-ISS-138: Courses Missing Content — Seed Data + Learner UAT (High) — IN PROGRESS

**Current Queue (1):**
- UI-ISS-137: Grading Form — No Editable Fields / Submit Fails (High)

**All UI issues through UI-ISS-136 have been completed.**

## Naming Convention

```
{TEAM}-ISS-{NNN}_{brief_description}.md
```

## Issue Numbering

| Team | Prefix | Next Number |
|------|--------|-------------|
| Backend | API-ISS- | 043 |
| Frontend | UI-ISS- | 139 |

*Update "Next Number" when creating issues*

## Creating an Issue

1. Copy template from `templates/issue-template.md`
2. Fill in all sections
3. Save to `{team}/issues/queue/` with proper naming
4. Update "Next Number" above

## Working an Issue

1. Move file from `queue/` to `active/`
2. Update status in file to "IN PROGRESS"
3. Work the issue
4. When complete, update status to "COMPLETE"
5. Move file from `active/` to `completed/`

## Cross-Team Work

When work requires another team's involvement:

1. **Send a message** to their inbox (`{team}/inbox/`)
2. **Do NOT create issues** in their queue — they triage inbound messages
3. The receiving team decides whether to create a local issue
4. Track the dependency in `shared/dependencies.md`

## Priority Levels

| Priority | Description | Response Time |
|----------|-------------|---------------|
| Critical | Blocking production | Immediate |
| High | Blocking development | Same day |
| Medium | Important feature | This sprint |
| Low | Nice to have | When available |
