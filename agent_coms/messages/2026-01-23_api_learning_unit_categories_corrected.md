# API Team - Learning Unit Categories Corrected

## Date: 2026-01-23
## From: API Team
## To: UI Team
## Priority: Medium
## Related Issues: N/A

---

## Status: COMPLETE

Learning unit categories are now limited to the LookupValue set: `topic`, `assignment`, `practice`, `graded`.
Legacy categories (`exposition`, `assessment`) have been marked inactive.

---

## Summary

The API now validates learning unit categories exclusively from LookupValue (`learning-unit-category`).
Only `topic`, `assignment`, `practice`, and `graded` are accepted.

---

## What Changed

- LookupValue seeds updated to the new category set and legacy keys are deactivated.
- Learning unit validation now rejects legacy values.
- Contracts/examples updated to reflect the new categories.
- Sample seed modules updated to use `topic`/`graded`.

---

## Mapping Guidance

- `exposition` -> `topic`
- `assessment` -> `graded`
- `practice` remains `practice`
- `assignment` is new

---

## Action Required

- Update UI enums/filters/labels to use the new category set.
- Migrate any existing data that still uses `exposition` or `assessment`.
- Re-run seed constants or refresh lookup cache in dev environments.
