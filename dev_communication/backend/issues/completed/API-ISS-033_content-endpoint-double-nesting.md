# API-ISS-033: Content GET Endpoint Returns Double-Nested Response

## Status: PENDING
## Priority: Medium
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-138

---

## Overview

The `GET /api/v2/content/:id` endpoint returns a double-nested response body:

```json
{
  "status": "success",
  "success": true,
  "data": {
    "data": {
      "id": "...",
      "title": "...",
      "type": "media",
      "metadata": { "htmlContent": "..." }
    }
  }
}
```

The expected standard response shape (matching all other endpoints) should be:

```json
{
  "status": "success",
  "success": true,
  "data": {
    "id": "...",
    "title": "...",
    "type": "media",
    "metadata": { "htmlContent": "..." }
  }
}
```

## Root Cause

In `src/controllers/content/content.controller.ts`, line 67:

```ts
res.status(200).json(ApiResponse.success({ data: result }));
```

This wraps `result` in `{ data: result }` before passing to `ApiResponse.success()`, which adds its own `data` wrapper, resulting in `data.data`.

## Fix

Change to:

```ts
res.status(200).json(ApiResponse.success(result));
```

## UI Workaround

The UI has a defensive unwrap in `getContent()` that handles both nested and flat responses, so this is not blocking. But it should be fixed for consistency.

---

## Acceptance Criteria

- [ ] `GET /api/v2/content/:id` returns `{ status, data: { id, title, ... } }` (single nesting)
- [ ] Other content endpoints checked for same pattern
- [ ] Tests updated if needed

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
