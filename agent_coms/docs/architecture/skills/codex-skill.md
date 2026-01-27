# Skill: Traverse Architecture Vault (Codex)

## Purpose
Help Codex quickly locate, review, and extend architecture decisions in the Obsidian vault.

## Entry Points
- Start at [[../index]] for the decision tree.
- Use [[../decision-log]] to see full list, status, and dates.

## Traversal Steps
1. Open the decision log and identify relevant ADR(s) by domain.
2. Open each ADR in `decisions/` and review Context, Decision, Consequences.
3. Use backlinks to discover affected specs, issues, or UI guidance.
4. If creating a new ADR, use [[../templates/adr-template]].
5. Update `decision-log.md` and add/refresh links in source docs.

## Linking Rules
- Use relative Obsidian links: `[[decisions/ADR-XXXX-TITLE]]`
- Add “Links” section in ADRs to point to source specs and related ADRs.
