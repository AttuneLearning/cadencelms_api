# Team Config: Role System V2 Phases 6-8

**ID:** P-TEAM-005
**Type:** team-config
**Version:** 1.0
**Created:** 2026-01-22
**Status:** Complete
**Tags:** #prompt #team-config #role-system #validators #documentation

## Team

| Field | Value |
|-------|-------|
| Name | LMS Backend Team - Role System V2 Phases 6-8 Completion |
| Description | Agent team for completing Role System V2 Phases 6-8: Validators, Integration Tests, and Documentation |
| Reference | `devdocs/plans/Role_System_V2_Phased_Implementation.md` |

## Purpose

Complete the final phases of Role System V2: validators and schemas, integration tests, and comprehensive documentation.

## Current State (at creation)

| Phase | Status |
|-------|--------|
| Phases 1-2 | Complete - Models, seeds, lookups |
| Phase 3 | Complete - Authentication services |
| Phase 4 | Complete - Controllers and routes |
| Phase 5 | Complete - Middleware and authorization |
| Phase 6 | Validators exist, need verification |
| Phase 7 | Integration tests exist but many failing |
| Phase 8 | Documentation and migration needed |

## Agents

### Agent Phase 6: Validators & Schemas Specialist

**Role:** Verify and complete Phase 6 validators and schemas

**Tasks:**
- P6-1: Verify escalation.validator.ts
- P6-2: Verify department-switch.validator.ts
- P6-3: Verify role.validator.ts
- P6-4: Verify auth.validator.ts
- P6-5: Create any missing tests
- P6-6: Document validation schemas

**Files to Verify:**
- `src/validators/escalation.validator.ts`
- `src/validators/department-switch.validator.ts`
- `src/validators/role.validator.ts`
- `src/validators/auth.validator.ts`
- `src/validators/department-membership.validator.ts`

### Agent Phase 7: Integration Tests Specialist

**Role:** Complete and fix all integration tests

**Tasks:**
- P7-1: Fix login-v2.test.ts (already done)
- P7-2: Fix escalation.test.ts
- P7-3: Fix department-switch.test.ts
- P7-4: Fix role-cascading.test.ts
- P7-5: Fix authorization.test.ts (partially done)
- P7-6: Fix roles-api.test.ts
- P7-7: Create access-rights API tests if missing
- P7-8: Verify role-system-e2e.test.ts

**Test Files:**
- `tests/integration/auth/login-v2.test.ts`
- `tests/integration/auth/escalation.test.ts`
- `tests/integration/auth/department-switch.test.ts`
- `tests/integration/auth/role-cascading.test.ts`
- `tests/integration/middleware/authorization.test.ts`
- `tests/integration/roles/roles-api.test.ts`

### Agent Phase 8: Documentation & Final Integration

**Role:** Complete documentation, create migration script, and finalize integration

**Tasks:**
- P8-1: Create API documentation (`docs/api/auth-v2.md`)
- P8-2: Create/update OpenAPI spec
- P8-3: Create V2 migration script
- P8-4: Create/update Postman collection
- P8-5: Verify final E2E integration test
- P8-6: Create comprehensive Phase 6-8 report
- P8-7: Create final Role System V2 completion report

**Output Files:**
- `docs/api/auth-v2.md`
- `docs/api/roles-v2.md`
- `docs/api/access-rights-v2.md`
- `docs/openapi/auth-v2.yaml`
- `src/migrations/v2-role-system.migration.ts`
- `docs/postman/LMS-V2.postman_collection.json`

## Phase Gates

### Phase 6: Validators & Schemas Complete
- All validators verified and working
- All validation schemas comprehensive
- Error messages are helpful
- Validators have tests
- Documentation complete

### Phase 7: Integration Tests Complete
- All integration tests passing
- Code coverage > 85%
- All E2E flows verified
- Test infrastructure documented
- No blocking issues

### Phase 8: Documentation & Migration Complete
- API documentation complete
- OpenAPI spec created/updated
- Migration script working
- Postman collection updated
- Final E2E test passing
- Comprehensive reports created

### Final Gate: Role System V2 Complete
- All 8 phases complete
- All tests passing
- All documentation complete
- Production ready
- Migration path clear
- No blocking issues

## Known Issues (at creation)

- JWT token format issues in some tests
- Admin session management in tests
- Model import patterns in some test files
- AccessRight validation in test data

## Known Fixes

- Add `type: 'access'` to JWT tokens
- Use named exports for Staff/Learner
- Use default export for GlobalAdmin
- Add resource/action to AccessRight seed data
- Use `_id` instead of `userId` in model creation

## Links

- Prompt registry: [[../prompt-registry]]
- Team configs index: [[index]]
- Related: [[role-system-phases-3-5]]
- Original: `.claude/team-config-role-system-phases-6-8.json`
