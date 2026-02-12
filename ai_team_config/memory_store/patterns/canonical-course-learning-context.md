# Pattern: Canonical Course Learning Context

**Category:** API
**Created:** 2026-02-12
**Tags:** #pattern #api #canonical-course #learning-unit #progress #reports

## Problem

Legacy analytics/reporting code often joins `Course` + `CourseContent`, which breaks canonical course migration and makes course IDs inconsistent across API responses.

## Solution

Resolve course analytics/reporting context from canonical entities only:

1. Resolve canonical identity and active version:
   - `CanonicalCourse`
   - `CourseVersion` (prefer `currentPublishedVersionId`, fallback `latestDraftVersionId`)
2. Resolve version modules:
   - `CourseVersionModule` (ordered)
3. Resolve learning units for those modules:
   - `LearningUnit` (active)
4. Derive report/progress content IDs from learning units:
   - aggregate deduped `LearningUnit.contentId`
5. Calculate module completion from content coverage (not raw attempt count).

## Example

```typescript
const context = await buildCourseLearningContext(courseId);
const contentIds = context.contentIds.map((id) => new mongoose.Types.ObjectId(id));

const attempts = await ScormAttempt.find({
  learnerId,
  contentId: { $in: contentIds }
});

const completedModules = context.modules.filter((moduleContext) => {
  const moduleAttempts = filterAttemptsByContentIds(attempts, moduleContext.contentIds);
  const completedItems = countCompletedContentItems(moduleAttempts as Array<{ contentId: mongoose.Types.ObjectId; status: string }>);
  return moduleContext.contentIds.length > 0 && completedItems >= moduleContext.contentIds.length;
}).length;
```

## When to Use

- Migrating progress/report services off `CourseContent`.
- Returning stable canonical `courseId` values to clients.
- Building module-level analytics that must align with versioned course structure.

## When NOT to Use

- Legacy-only code paths that still intentionally serve `Course` identities.
- Cases where module/content linkage is not course-version scoped.

## Related Patterns

- [[canonical-template-usage-resolution]]
- [[department-scoping]]

## Examples in Codebase

- `src/services/analytics/progress.service.ts`
- `src/services/reporting/reports.service.ts`

## Links

- Memory log: [[../memory-log]]
