# API-ISS-034: Learning Unit Adaptive Metadata

## Status: COMPLETE
## Priority: High
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: UI Team
## Assigned To: API Team
## Related: `dev_communication/messaging/ui-to-api/2026-02-09_adaptive-playlist-engine-api-needs.md`

---

## Overview

Add optional `adaptive` field to Learning Unit model and responses, enabling the playlist engine to know which knowledge nodes a LU teaches/assesses, whether it acts as a gate checkpoint, and its gate configuration.

---

## Requirements

- Add `adaptive` subdocument to LearningUnit model (all fields optional)
- Include `adaptive` in GET learning unit responses
- Accept `adaptive` in PUT learning unit updates
- Fields: `teachesNodes`, `assessesNodes`, `isGate`, `isSkippable`, `gateConfig`

---

## Completion

**Completed Date:** 2026-02-09

**Verification:**
- [x] Model updated with adaptive subdocument
- [x] Service includes adaptive in responses and updates
- [x] Tests passing
- [x] TypeScript compiles cleanly
