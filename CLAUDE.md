## ISAAC Integration

@.isaac/PRINCIPLES.md
@.isaac/QUALITY_GATES.md
@.isaac/SCOPE_RULES.md
@.isaac/MEMORY_FIRST.md

## ISAAC telemetry — DISABLED for this project

Per Maria's instruction (22 Apr 2026): do **NOT** call the ISAAC dashboard telemetry scripts when running phase skills in this repo. Specifically skip:

- `node "$(cat .isaac/.plugin-root)/hooks/scripts/report-progress.js" --event phase-start ...`
- `node "$(cat .isaac/.plugin-root)/hooks/scripts/report-progress.js" --event phase-complete ...`
- `node "$(cat .isaac/.plugin-root)/hooks/scripts/report-progress.js" --event stories-sync`
- Any other `report-progress.js` or telemetry-emitting invocations from ISAAC skills

The phase workflow (concept → context → architecture → assessment → stories → plan → grade → execute → validate → commit) still applies — just without the Kanban-dashboard reporting. Phase state is derivable from git history and `.isaac/epics/launch/artifacts/` files.

**To re-enable for a future project**: remove this section and the telemetry calls rejoin the skill flow automatically. Maria plans to keep it on for SynapseDx-side work.

## Project

`bines.ai` — Maria's personal site. Purpose, voice, aesthetic, and content architecture captured in `~/Documents/bines-ai-brainstorm/02-state-of-play.md` (read first). Memory at `~/.claude/projects/-Users-mariabines/memory/project_bines_ai.md`.

## Stack

- Next.js 15 + React 19 + App Router
- TypeScript
- Tailwind CSS v4
- pnpm (package manager)
- Turbopack (dev + build)
- Vercel Pro (hosting, configured under Maria's personal account)
- Domain: `bines.ai` (apex canonical, `www` redirects). Registered at Name.com.

## Non-negotiables for this project

- **Voice comes from `02-state-of-play.md`.** Diagnostic, not confessional. Fun · smart · a little provocative · with depth. British dry + Southern storytelling + Canadian wry. Do not improvise voice — consult the state-of-play or existing Fieldwork pieces.
- **Aesthetic is editorial-maximalist** — Bass / Sister Corita / Matisse / Charley Harper lineage. Scale not volume. No default AI-image tropes (no robots, no glowing brains, no blue gradients).
- **No SynapseDx palette.** bines.ai is deliberately distinct from Maria's CEO brand. SynapseDx colours (bg #0A0F1A, cyan #00D4AA, coral #F26B38, blue #0EA5E9) are forbidden here.
- **Low-fi Maria-to-camera video is intentional.** Do not suggest polishing it.
- **AI chat ("argue with me") is a first-class feature**, not a bolt-on. v1 MVP uses Anthropic API + strong system prompt anchored on Maria's voice. v2 adds corpus awareness.
