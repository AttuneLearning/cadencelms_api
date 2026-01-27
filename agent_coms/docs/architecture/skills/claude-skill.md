# Skill: Traverse Architecture Vault (Claude)

## Purpose
Guide Claude to follow the decision tree and avoid missing dependencies.

## Entry Points
- [[../index]] for the high-level tree.
- [[../decision-log]] for the canonical list.

## Traversal Steps
1. Identify domain (Platform/Auth, UI, Billing).
2. Open the ADR(s) for that domain and read Context/Decision/Consequences.
3. Follow “Links” to source specs and related ADRs.
4. Summarize impacts and note any superseded decisions.

## Editing Rules
- Use [[../templates/adr-template]] when adding ADRs.
- Always update `decision-log.md`.
- Add forward links in source docs and back links in ADRs.
