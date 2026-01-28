# Pattern: Department Scoping

**Category:** API
**Created:** 2026-01-27
**Tags:** #pattern #api #multi-tenant

## Problem

CadenceLMS is multi-tenant, with data isolated by department. How do we consistently scope API endpoints to ensure proper data isolation?

## Solution

Most endpoints are scoped under `/api/v2/departments/:departmentId/...` to ensure:
1. Clear ownership of resources
2. Consistent authorization checks
3. Predictable URL structure

### URL Structure

```
/api/v2/departments/:departmentId/[resource]
/api/v2/departments/:departmentId/[resource]/:resourceId
/api/v2/departments/:departmentId/[resource]/:resourceId/[subresource]
```

### Authorization Flow

1. Extract `departmentId` from URL params
2. Check user has permission for that department
3. Service methods receive `departmentId` as first parameter
4. All queries filter by `departmentId`

## Example

```typescript
// Route
router.get('/departments/:departmentId/knowledge-nodes',
  isAuthenticated,
  authorize.anyOf(['content:department:read', 'content:own:read']),
  listKnowledgeNodes
);

// Controller
export const listKnowledgeNodes = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  const nodes = await KnowledgeNodesService.listByDepartment(departmentId, options);
  res.json(ApiResponse.success(nodes));
});

// Service
async listByDepartment(departmentId: string, options: ListOptions) {
  return KnowledgeNode.find({ departmentId, isDeleted: { $ne: true } });
}
```

## When to Use

- Any resource that belongs to a department
- Nested resources under department-owned parents
- Listing/filtering operations

## When NOT to Use

- System-wide resources (e.g., system default cognitive depth levels)
- User-specific endpoints that span departments
- Authentication endpoints

## Exceptions

Some endpoints are NOT department-scoped:
- `GET /api/v2/cognitive-depth-levels` - System defaults
- `GET /api/v2/learners/:learnerId/knowledge-progress` - Cross-department
- `POST /api/v2/adaptive/select-question` - Uses learnerId to determine context

## Examples in Codebase

- `src/routes/knowledge-nodes.routes.ts`
- `src/routes/cognitive-depth-levels.routes.ts`
- `src/controllers/content/knowledge-nodes.controller.ts`

## Links

- Memory log: [[../memory-log]]
- Related entities: [[../entities/adaptive-learning-system]]
- Related context: [[../context/multi-tenant-model]]
