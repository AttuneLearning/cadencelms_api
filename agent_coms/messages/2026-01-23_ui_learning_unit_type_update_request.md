# UI Team - Learning Unit Type Lookup Values Update
## Date: 2026-01-23
## From: UI Team
## To: API Team
## Priority: Medium
## Related Issues: UI-ISS-068, UI-ISS-073
---
## Summary
Requesting confirmation and contract update for Learning Unit `type` lookup values.

## Request/Response
- **Request**: Update Learning Unit `type` lookup values to replace `video` with `media` and add `assignment`.
- **Current UI Need**: Support authoring activities with `media` type and `assignment` type.
- **Please Confirm**:
  1) Allowed `LearningUnitType` values going forward (including `media` and `assignment`).
  2) Whether existing `video` values should be migrated to `media`.
  3) Whether `assignment` is distinct from `exercise` or should map to an existing type.
  4) Ensure lookup values are stored as LookupValue entries (if applicable).

## Notes
- We will not change UI enums until API confirms and contracts are updated.
- If `media` maps to multiple file types, please provide any required metadata fields.
