# Pattern: Canonical Template Usage Resolution

**Category:** API
**Created:** 2026-02-12
**Tags:** #pattern #api #canonical-course #templates

## Problem

Template usage tracking depended on legacy `Course.metadata.templateId`, which breaks canonical-course migration and returns legacy IDs to clients.

## Solution

Resolve template usage through canonical entities:

1. Find programs linked to a template:
   - `Program.certificate.templateId = templateId`
2. Find canonical courses in those programs:
   - `CanonicalCourse.programId IN linkedProgramIds`
3. Resolve display metadata from preferred course version:
   - use `currentPublishedVersionId`, fallback to `latestDraftVersionId`
4. Build UI-safe rows with canonical identity and optional version context.

Force-delete unlink should clear program-level template links (`Program.certificate.templateId`) and report affected canonical courses.

## Example

```typescript
const linkedPrograms = await Program.find({ 'certificate.templateId': templateId })
  .select('_id')
  .lean();

const canonicalCourses = await CanonicalCourse.find({
  programId: { $in: linkedPrograms.map((p) => p._id) }
})
  .select('_id code currentPublishedVersionId latestDraftVersionId')
  .lean();

const versionIds = canonicalCourses
  .map((c) => c.currentPublishedVersionId || c.latestDraftVersionId)
  .filter(Boolean);

const versions = await CourseVersion.find({ _id: { $in: versionIds } })
  .select('_id title status version')
  .lean();
```

## When to Use

- Migrating legacy template/course relationships to canonical models.
- Returning course references to frontend where ID stability matters.
- Enforcing deletion guards based on real canonical usage rather than stale counters.

## When NOT to Use

- Template relationships that are genuinely independent of programs/courses.
- Cases where a direct canonical reference already exists on the target model.

## Related Patterns

- [[department-scoping]]

## Examples in Codebase

- `src/services/content/templates.service.ts`

## Links

- Memory log: [[../memory-log]]
