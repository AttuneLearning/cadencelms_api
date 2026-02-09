# Cross-Team Dependencies

Tracking dependencies between API and UI teams.

---

## Active Dependencies

### API Blocked by UI

| API Issue | Waiting For | UI Issue | Status | Since |
|-----------|-------------|----------|--------|-------|
| | | | | |

### UI Blocked by API

| UI Issue | Waiting For | API Issue | Status | Since |
|-----------|-------------|----------|--------|-------|
| | | | | |

---

## Integration Points

Shared work requiring coordination between teams.

| Feature | API Issue | UI Issue | Status | Notes |
|---------|-----------|----------|--------|-------|
| | | | | |

---

## Upcoming Handoffs

Work that will need to be handed off to the other team.

### API → UI (API completing, UI will integrate)

| Feature | API Issue | Expected | Notes |
|---------|-----------|----------|-------|
| | | | |

### UI → API (UI needs, API will implement)

| Feature | UI Issue | Requested | Notes |
|---------|----------|-----------|-------|
| | | | |

---

## Completed Dependencies (This Sprint)

| Dependency | Resolved | Duration | Notes |
|------------|----------|----------|-------|
| | | | |

---

## Dependency Protocol

### When Creating a Dependency

1. Add row to appropriate table above
2. Update both team status files
3. Send message to notify other team
4. Link issues with `Related:` and `Blocked-By:` fields

### When Resolving a Dependency

1. Move row to "Completed Dependencies"
2. Update both team status files
3. Send completion message
4. Update issue statuses

### Escalation

If a dependency is blocked for more than:
- **Critical:** 1 hour → Escalate to human
- **High:** 4 hours → Escalate to human
- **Medium:** 1 day → Discuss in coordination
- **Low:** 3 days → Review if still needed

---

[[index|← Back to Coordination]]
