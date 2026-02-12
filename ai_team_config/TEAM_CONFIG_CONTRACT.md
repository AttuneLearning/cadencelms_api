# Team Config Contract

## Purpose

This contract defines how all AI agents share team configuration and persistent knowledge in a unified, project-local structure.

## Required Local Structure

At repository root:

- `./ai_team_config/`
- `./ai_team_config/memory_store/` (shared cross-team memory vault)
- `./ai_team_config/<team>/` (for example `./ai_team_config/backend/`)

Inside each team directory, the following stores are required:

- `./ai_team_config/<team>/adr_store/`
- `./ai_team_config/<team>/memory_store/`
- `./ai_team_config/<team>/context_store/`

Skill memory storage is required under:

- `./ai_team_config/<team>/skill_store/<skill>/memory_store/`

## Storage Format

All store content must be Obsidian-vault compatible Markdown:

1. Use Markdown files (`.md`) as primary storage objects.
2. Use wiki-links (`[[path/to/note]]`) for traversable graph navigation.
3. Provide index notes at each directory level (`index.md`) with backlinks to parent/root indexes.
4. Keep paths deterministic so multiple agents can safely read/write the same vault.

## Team Definition Source

Team definitions and protocol for installer/runtime:

- `.codex-workflow/teams/profiles.json`
- `.codex-workflow/teams/catalog.yaml`
- `.codex-workflow/teams/protocol.yaml`

## Runtime Resolution

Skills and tools should resolve active team context from:

1. `.codex-workflow/config/active-team.json` (project-local), fallback to
2. Installed pack `config/active-team.json`.

The active team profile must expose default paths including:

- `memory_root`
- `team_vault_root`
- `adr_store`
- `memory_store`
- `context_store`
- `skill_store_root`

## Installer Requirements

Installer must:

1. Require `--team`.
2. Validate selected team exists in profiles.
3. Verify `./ai_team_config/memory_store/` exists.
4. Verify `./ai_team_config/<team>/...` store directories exist.
5. Create/recreate missing shared/team store directories and `index.md` notes when absent.
6. Ensure skill memory store directories exist for enabled skills.
7. Write active team config with resolved store paths.

## Governance Rules

1. Messages cross team boundaries; issues remain team-local by default.
2. Team-specific artifacts should remain inside that team's vault subtree.
3. Shared architectural decisions can be linked across teams via wiki-links.
