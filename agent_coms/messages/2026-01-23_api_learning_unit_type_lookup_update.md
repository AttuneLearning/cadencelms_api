# API Team - Learning Unit Type Lookup Values Update
## Date: 2026-01-23
## From: API Team
## To: UI Team
## Priority: Medium
## Related Issues: UI-ISS-068, UI-ISS-073

---

## Status: COMPLETE

Learning Unit `type` values now come from LookupValue (`learning-unit-type`).
`assignment` is distinct from `exercise`.

---

## Summary

Allowed Learning Unit types are now:
`media`, `document`, `scorm`, `custom`, `exercise`, `assessment`, `assignment`.
The legacy `video` type is deprecated and inactive.

---

## Decisions

- `assignment` is its own type (not a synonym for `exercise`).
- `video` is replaced by `media`.
- Types are stored/validated via LookupValue category `learning-unit-type`.

---

## Mapping Guidance

- `video` -> `media`

---

## Action Required

- Update UI enums/filters to the new `learning-unit-type` list.
- Migrate any existing Learning Unit `type` values from `video` to `media`.
- Use `assignment` for assignment-style learning units.
