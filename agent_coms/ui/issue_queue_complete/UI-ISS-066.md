# UI-ISS-066: StaffReportsPage missing PageHeader import

**Date:** 2026-01-22
**Reporter:** System
**Priority:** Low
**Status:** Resolved
**Resolved:** 2026-01-22

## Description

The `StaffReportsPage.tsx` uses the `PageHeader` component but was missing the import statement, causing a runtime error:

```
Uncaught ReferenceError: PageHeader is not defined
    StaffReportsPage StaffReportsPage.tsx:223
```

## Root Cause

The `PageHeader` component exists at `src/shared/ui/page-header.tsx` and is used by 40+ other pages in the application. The `StaffReportsPage.tsx` file was simply missing the import.

## Fix

Added the missing import:

```typescript
import { PageHeader } from '@/shared/ui/page-header';
```

## Related Files

- `src/pages/staff/reports/StaffReportsPage.tsx` - Missing import
- `src/shared/ui/page-header.tsx` - Component definition
