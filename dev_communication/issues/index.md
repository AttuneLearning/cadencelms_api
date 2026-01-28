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
| `queue/` | 0 | Ready to work |
| `active/` | 0 | In progress |
| `completed/` | 0 | Done |

### UI Team (`issues/ui/`)
| Folder | Count | Description |
|--------|-------|-------------|
| `queue/` | 0 | Ready to work |
| `active/` | 0 | In progress |
| `completed/` | 0 | Done |

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
| API | API-ISS- | 009 |
| UI | UI-ISS- | 063 |

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
