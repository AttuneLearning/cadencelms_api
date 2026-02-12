# Setup.sh / Scaffold Conformance Review

**From:** Backend Team
**Date:** 2026-02-09
**Priority:** Medium
**Re:** Uncommitted `.claude-workflow` submodule changes (scaffolds + teams/)

---

## Summary

Reviewed the uncommitted additions in the UI submodule working tree against the live `dev_communication/` structure and `setup.sh`. The new team-oriented scaffold is the right direction — it matches what both projects already use in production. But several files still reference the old flat layout.

## Untracked additions reviewed

```
?? scaffolds/dev_communication/archive/
?? scaffolds/dev_communication/backend/
?? scaffolds/dev_communication/frontend/
?? scaffolds/dev_communication/shared/
?? scaffolds/dev_communication/templates/
?? teams/
```

## Issues to fix before committing

### 1. Remove old scaffold dirs (conflict with new)

Old dirs still present alongside new: `scaffolds/dev_communication/{messaging, issues, coordination, architecture, guidance}`. The `cp -r` in setup.sh would create a hybrid. Remove the old dirs so only the new team-based layout ships.

### 2. Fix `settings.json` path in setup.sh (line 61)

```json
// Current (wrong):
"additionalDirectories": ["../claude-dev-workflow"]

// Should be:
"additionalDirectories": ["../.claude-workflow"]
```

### 3. Fix post-setup message (setup.sh line 157)

```
// Current: "Initialize team status in dev_communication/coordination/"
// Should be: "Initialize team status in dev_communication/{team}/status.md"
```

### 4. Update scaffold README.md

Still describes `messaging/api-to-ui/`, `issues/api/` etc. Should match the `backend/inbox/`, `frontend/inbox/` pattern.

### 5. Add template files to scaffold

The new scaffold creates `backend/` and `frontend/` dirs with inbox/issues but doesn't include:
- `{team}/definition.yaml` template (team identity/responsibilities/stack)
- `{team}/status.md` template (current focus/blockers)
- `shared/registry.yaml` template (active teams list)
- `shared/dependencies.md` template (cross-team blockers)

These are key to the new structure — a fresh project wouldn't know to create them.

### 6. Update SETUP.md

- Line 108: `coordination/{team}-team-status.md` → `{team}/status.md`
- Lines 161-192: Directory tree diagram still shows old layout
- No mention of `teams/catalog.yaml` or `protocol.yaml`

### 7. Update README.md

Lines 99-104: Scaffolds section describes old messaging/issues structure.

## What's correct (no changes needed)

- `teams/catalog.yaml` — clean generic role catalog
- `teams/protocol.yaml` — universal comm rules, consistent with PROCESS_GUIDE.md
- Per-team `inbox/` + `issues/{queue,active,completed}` layout
- `shared/` directory mirroring live structure

## Recommendation

Reconcile the above in the UI submodule working tree, commit to the submodule, then both projects pull the update. Happy to re-review after.
