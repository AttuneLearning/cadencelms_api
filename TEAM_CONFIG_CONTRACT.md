# Team Config Contract

This file defines how team-scoped AI storage is organized for the project.

Required shared vault structure:
- `ai_team_config/memory_store/`

Required team vault structure:
- `ai_team_config/<team>/adr_store/`
- `ai_team_config/<team>/memory_store/`
- `ai_team_config/<team>/context_store/`
- `ai_team_config/<team>/skill_store/<skill>/memory_store/`

Storage format: Obsidian-compatible Markdown with wiki-links/backlinks.
