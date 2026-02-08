# Architecture Suggestions

Ingestion directory for architecture decision suggestions from both teams.

## Purpose

This directory collects potential architecture decisions identified during development. Suggestions are reviewed periodically and either:
- **Accepted** → Create formal ADR
- **Rejected** → Archive with reason
- **Deferred** → Move to gaps tracker

---

## Pending Suggestions

| Date | Team | Topic | Suggested By | Status |
|------|------|-------|--------------|--------|
| 2026-02-05 | UI | [Navigation Architecture Redesign](2026-02-05_ui_navigation-architecture-redesign.md) | Claude | Pending |

---

## How to Create a Suggestion

### Via Skill
```
/adr suggest
```

### Manual Creation

1. Create file: `YYYY-MM-DD_{team}_{topic_slug}.md`
2. Use template below
3. Add entry to table above

### Template

```markdown
# Suggestion: [Topic]

**Date:** YYYY-MM-DD
**Team:** [API | UI | Both]
**Suggested By:** [Agent ID | Human]
**Status:** Pending
**Priority:** [High | Medium | Low]

## Context

[What prompted this suggestion? What problem or pattern was discovered?]

## Trigger

- [ ] Feature implementation
- [ ] Bug resolution
- [ ] Code review finding
- [ ] Cross-team coordination
- [ ] Message/Issue reference

**Reference:** [Link to issue, message, or commit if applicable]

## Proposed Decision

[What architectural decision should be documented?]

## Impact

**Affects:**
- [ ] API team
- [ ] UI team
- [ ] Both teams

**Scope:**
- [ ] New pattern to establish
- [ ] Existing pattern to document
- [ ] Decision that needs consensus
- [ ] Technical debt to address

## Suggested ADR

**Domain:** [Platform/Auth | API | Data | Security | Content | UI | Billing | Integration | Infrastructure]
**Suggested ID:** ADR-{DOMAIN}-{NNN}
**Suggested Title:** [Title]

## Notes

[Any additional context or considerations]
```

---

## Review Process

1. **Weekly Review** - Team leads review pending suggestions
2. **Triage** - Categorize as Accept/Reject/Defer
3. **Action**:
   - Accept → `/adr create` from suggestion
   - Reject → Move to `archive/` with reason
   - Defer → Add to [[../gaps/index]] with timeline

---

## Archived Suggestions

| Date | Topic | Outcome | Reason |
|------|-------|---------|--------|
| | | | |

---

[[../index|← Back to Architecture Hub]]
