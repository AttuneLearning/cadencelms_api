# Authorization Documentation

This directory contains all authorization-related documentation for the LMS Role System V2.

## Documents

### [Route_Authorization_Mapping.md](./Route_Authorization_Mapping.md)
**Status:** ✅ Approved
**Last Updated:** 2026-01-11

Complete mapping of all ~150 API routes to their required access rights and roles. This is the definitive reference for implementing authorization middleware on routes.

**Key sections:**
- Authorization patterns and middleware usage
- Business rules (visibility, editing, scoping, data masking)
- Complete route mappings by domain (Content, Courses, Academic, Enrollment, Users, Analytics, System)
- Access rights summary by role
- Implementation checklist

**Use this document when:**
- Implementing authorization middleware on route files
- Understanding which roles can access which endpoints
- Determining service layer scoping and filtering requirements
- Applying data masking for FERPA compliance

---

## Quick Reference

### Common Patterns

**Standard Route Protection:**
```typescript
router.get('/',
  requireAccessRight('domain:resource:read'),
  controller.list
);
```

**Admin-Only with Escalation:**
```typescript
router.delete('/:id',
  requireEscalation,
  requireAdminRole(['department-admin']),
  requireAccessRight('domain:resource:manage'),
  controller.delete
);
```

**Multiple Rights (OR Logic):**
```typescript
router.get('/:id',
  requireAccessRight(['enrollment:own:read', 'enrollment:department:read']),
  controller.get
);
```

### Key Business Rules

1. **Course Visibility:** Draft courses visible to all department members, editable by creator + department-admin only
2. **Learner Scope:** Learners NOT department-limited, can see published courses across all departments
3. **Instructor Scope:** Instructors see only their own classes/enrolled learners
4. **Data Masking:** Last names masked to "FirstName L." for instructors and department-admin (except enrollment-admin)
5. **Self-Enrollment:** Controlled by department setting `allowSelfEnrollment`
6. **Department Hierarchy:** Top-level members see all subdepartments
7. **Audit Logs:** Admin-only, even instructors cannot view logs for their own content

### Sensitive Operations (Require Escalation)

- All staff/learner PII operations
- All audit log access
- All settings write operations
- Transcript generation
- Department create/delete
- Destructive operations

---

## Implementation Status

- [x] Route authorization mappings defined
- [ ] Middleware applied to route files (Phases 6-8 work)
- [ ] Service layer scoping implemented
- [ ] Data masking implemented
- [ ] Department settings integration
- [ ] Integration tests for authorization

---

## Related Documentation

- [Access Rights API Documentation](../../docs/api/access-rights-v2.md)
- [Role System V2 Implementation Plan](../plans/Role_System_V2_Phased_Implementation.md)
- [Middleware Source](../../src/middlewares/)
- [API Contracts](../../contracts/api/)
