# API Team - Learning Unit Category Optional/Nullable

## Date: 2026-01-23
## From: API Team
## To: UI Team
## Priority: Low
## Related Issues: N/A

---

## Status: COMPLETE

The Learning Unit contract now allows `category` to be optional on create/update and nullable in responses.

---

## Summary

`category` is no longer required in the Learning Units contracts. If omitted, the API may return `category: null` in list/create/get responses.

---

## What Changed

- Create request: `category` is now optional.
- Update request: `category` allows `string | null`.
- Responses (list/create/get): `category` now allows `null`.

---

## Files Updated

- `contracts/api/learning-units.contract.ts`

---

## Action Required

If your UI assumes `category` is always present, handle `null` (or missing) values gracefully.

