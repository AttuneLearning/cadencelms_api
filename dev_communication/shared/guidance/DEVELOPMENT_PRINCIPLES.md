# Development Principles

Core principles that guide all development work on CadenceLMS.

---

## 1. Ideal API Design First

**Unless otherwise specified, always design for the ideal API/route structure.**

### What This Means

| Do | Don't |
|----|-------|
| Use the new field name only | Add both old and new field names |
| Update existing callers to use new API | Add compatibility shims |
| Design clean interfaces | Add `@deprecated` annotations |
| Remove unused code | Comment out "for later" |

### Example: Field Rename

**Bad (backward compatible):**
```typescript
interface Question {
  questionTypes: QuestionType[];      // New
  questionType?: QuestionType;        // @deprecated - legacy
  correctAnswers: string[];           // New
  correctAnswer?: string | string[];  // @deprecated - legacy
}

// Plus normalization code to handle both formats
function normalize(q) {
  return {
    questionTypes: q.questionTypes ?? [q.questionType],
    questionType: q.questionTypes?.[0] ?? q.questionType,
    // ... duplicated logic
  };
}
```

**Good (ideal design):**
```typescript
interface Question {
  questionTypes: QuestionType[];
  correctAnswers: string[];
}

// No normalization needed - one format only
```

### When Backward Compatibility IS Appropriate

Only add backward compatibility when ALL of these are true:

1. **Explicit request** - User/spec explicitly asks for it
2. **Production data exists** - Real data would break without it
3. **Migration timeline defined** - Clear date for removal
4. **Documented** - Captured in ADR or issue

If compatibility is needed, document:
```typescript
/**
 * @deprecated Remove after 2026-03-01 migration
 * @see ADR-XXX-MIGRATION-PLAN
 */
questionType?: QuestionType;
```

---

## 2. No Production Data Assumption

**Treat greenfield features as having no existing data.**

For new features:
- Design the ideal schema
- Don't add migration paths "just in case"
- Don't preserve old field names for hypothetical data

If there IS production data:
- The spec/issue should explicitly state this
- Migration strategy should be defined upfront
- Temporary compatibility (with removal date) may be appropriate

---

## 3. Clean Over Compatible

**Prefer simple code over complex backward-compatible code.**

When a change would require either:
- A) Adding compatibility layer (50 lines)
- B) Updating 10 existing callers (30 lines total)

Choose B. The codebase stays cleaner long-term.

### Refactoring Rule

If you're adding a new field/method that replaces an old one:
1. Add the new field/method
2. Update ALL existing usages to the new pattern
3. Remove the old field/method
4. Don't leave both in place

---

## 4. Update Callers, Don't Shim

**When an API changes, update the consumers.**

Instead of:
```typescript
// API layer - add shim
function getQuestion(id) {
  const q = await db.findQuestion(id);
  return {
    ...q,
    // Shim for old UI code
    questionType: q.questionTypes[0],
  };
}
```

Do:
```typescript
// API layer - clean response
function getQuestion(id) {
  return db.findQuestion(id);
}

// UI layer - update to use new field
const type = question.questionTypes[0];
```

---

## 5. Spec Authority

**The spec is the source of truth.**

If a spec says "No Backwards Compatibility":
- Follow it literally
- Don't add compatibility "to be safe"
- If you disagree, discuss before implementing

If a spec is unclear:
- Ask for clarification
- Don't assume backward compatibility is needed
- Default to ideal design

---

## Quick Reference

| Situation | Action |
|-----------|--------|
| New feature, no existing data | Ideal design, no compatibility |
| Renaming a field | Update all usages, remove old field |
| Adding new field alongside old | Remove old field, update callers |
| Spec says "no backward compat" | Follow it literally |
| Spec is silent on compatibility | Default to ideal design |
| User explicitly requests compat | Add it with removal date |
| Production data would break | Add compat with migration plan |

---

## Related

- ADR: [[../architecture/decisions/ADR-DEV-002-IDEAL-API-DESIGN]]
- Checklist: [[FEATURE_DEVELOPMENT_CHECKLIST]]
