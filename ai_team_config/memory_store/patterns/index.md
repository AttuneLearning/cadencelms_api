# Patterns

Recurring solutions, conventions, and best practices in the CadenceLMS API.

## API Patterns

- [[department-scoping]] - How endpoints are scoped to departments

## Data Patterns

- [[soft-delete]] - Soft deletion pattern (isActive/isDeleted)
- [[audit-fields]] - Created/updated timestamps and authors

## Testing Patterns

- [[integration-test-setup]] - Standard integration test structure
- [[describe-if-mongo]] - Conditional MongoDB test helper

## Process Patterns

- [[team-configuration]] - Inter-team workflow and skills

## Service Patterns

- [[canonical-template-usage-resolution]] - Resolve template usage via Program -> CanonicalCourse -> CourseVersion
- [[canonical-course-learning-context]] - Derive progress/report module context via CanonicalCourse -> CourseVersion -> CourseVersionModule -> LearningUnit

---

**Template:** [[../templates/pattern-template]]
**Memory log:** [[../memory-log]]
