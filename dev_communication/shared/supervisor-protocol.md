# Supervisor Agent Protocol

Guidelines for Supervisor/QA/Code Reviewer agents on maintaining architecture decisions and team coordination.

---

## Role Definition

The Supervisor agent (typically Opus 4.5) is responsible for:
1. **Quality gate** - Reviewing code before completion
2. **Architecture guardian** - Ensuring decisions are documented
3. **Coordination** - Managing cross-team dependencies
4. **Feedback loop** - Capturing learnings as suggestions

---

## Architecture Feedback Loop

### When to Create Architecture Suggestions

Create a suggestion via `/adr suggest` when:

| Trigger | Example | Priority |
|---------|---------|----------|
| **New pattern established** | "We're using this caching approach everywhere now" | High |
| **Significant design decision** | "Chose MongoDB aggregation over app-level joins" | High |
| **Cross-team convention** | "API and UI agreed on this error format" | High |
| **Bug fix reveals design flaw** | "This bug happened because we had no standard for X" | Medium |
| **Code review finds undocumented pattern** | "I see this pattern in 5 places but no ADR" | Medium |
| **Repeated questions** | "Third time explaining why we do X this way" | Medium |
| **Tech debt identified** | "We should document why this is temporary" | Low |

### When NOT to Create Suggestions

- Minor implementation details
- One-off solutions unlikely to repeat
- Already documented elsewhere
- Personal preferences without team consensus

---

## Feedback Loop Process

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPERVISOR FEEDBACK LOOP                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. DETECT                                                   │
│     │                                                        │
│     ├─► Feature completed → Check: New pattern?              │
│     ├─► Bug resolved → Check: Design lesson?                 │
│     ├─► Code review → Check: Undocumented pattern?           │
│     └─► Cross-team work → Check: Shared decision?            │
│                                                              │
│  2. EVALUATE                                                 │
│     │                                                        │
│     ├─► Will this decision repeat? (Yes → continue)          │
│     ├─► Does it affect multiple files/modules? (Yes → +1)    │
│     ├─► Does it affect other team? (Yes → +1)                │
│     └─► Is it already documented? (Yes → skip)               │
│                                                              │
│  3. CAPTURE                                                  │
│     │                                                        │
│     └─► /adr suggest [topic]                                 │
│         - Context: What prompted this                        │
│         - Decision: What was decided                         │
│         - Impact: Who/what is affected                       │
│                                                              │
│  4. REVIEW (Weekly/Sprint)                                   │
│     │                                                        │
│     ├─► Accept → /adr create                                 │
│     ├─► Reject → Archive with reason                         │
│     └─► Defer → Add to gaps tracker                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Polling Protocol

Run `/adr poll` periodically to scan for architecture concerns in:
- Active messages
- Active issues
- Recent completions

**Recommended frequency:** Start of each session or daily

**Keywords to watch for:**
- "architecture", "pattern", "design"
- "convention", "standard", "approach"
- "we decided", "going forward", "from now on"
- "technical debt", "refactor", "redesign"

---

## Code Review Architecture Checklist

During code review, check:

### Patterns
- [ ] Does this code follow existing patterns?
- [ ] If it deviates, is the deviation documented?
- [ ] If it establishes a new pattern, should we document it?

### Decisions
- [ ] Were any significant decisions made?
- [ ] Do those decisions affect other parts of the system?
- [ ] Should they be ADRs?

### Cross-Team
- [ ] Does this affect the other team?
- [ ] Is there a shared convention being established?
- [ ] Should both teams be aware?

### Gaps
- [ ] Did this work reveal an undocumented area?
- [ ] Should we add to the gaps tracker?

---

## Session Start Protocol

At the start of each session:

1. **Check status:** `/adr`
2. **Review suggestions:** Check `dev_communication/shared/architecture/suggestions/`
3. **Check gaps:** Review if current work addresses any gaps
4. **Poll:** `/adr poll` for new architecture concerns

---

## Session End Protocol

At the end of each session:

1. **Review completed work:**
   - Any new patterns established?
   - Any significant decisions made?

2. **Create suggestions** for anything architecture-relevant

3. **Update status** if gaps were addressed

4. **Send messages** if architecture decisions affect other team

---

## Integration with Other Skills

### With `/comms`
- After architecture-relevant work, notify other team
- When receiving messages about patterns/decisions, consider `/adr suggest`

### With `/memory`
- Architecture decisions may also warrant memory entries
- Patterns can be documented in both ADRs and ai_team_config/memory_store/patterns/

---

## Escalation

Escalate to human when:
- Conflicting architecture decisions between teams
- Major architectural change proposed
- Uncertainty about decision impact
- Gaps marked as Critical priority

---

## Metrics (Optional)

Track over time:
- Suggestions created per sprint
- Suggestions accepted vs rejected
- Gaps opened vs closed
- ADRs created
- Time from suggestion to ADR

---

[[index|← Back to Coordination Hub]]
[[../architecture/index|→ Architecture Hub]]
