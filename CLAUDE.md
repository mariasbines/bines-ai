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

## PR review flow

Three-tier review protection for every merge to `master`:

1. **ISAAC grade (plan-phase, Tier 1).** `isaac:grade` runs via Codex CLI before any code is written. Score ≥ 85 to proceed. Catches "the plan is wrong" problems; see `.isaac/epics/launch/artifacts/08-grade-*.md` for recorded grades.
2. **ISAAC validate (post-story, Tier 2).** Quality gates (`pnpm typecheck && pnpm lint && pnpm test && pnpm build`) plus a Claude review against the story's ACs and scope rules, run as part of `isaac:execute`. Catches "the code doesn't match the plan."
3. **Claude PR bot + CI (merge-time, Tier 3b).** GitHub Actions at `.github/workflows/`:
   - `ci.yml` runs the four quality gates on every PR to `master` and every push to `dev`. Branch protection on `master` requires green CI + at least one approval.
   - `claude-review.yml` posts an automated Claude Sonnet 4.6 review on every PR opened or synchronised against `master`. Advisory only — human approval still required.

**When to manually invoke `/review` or `/security-review`** (in addition to the bot):
- Before merging any PR that touches `src/app/api/chat/` or `src/lib/chat/` — the chat is the risk-densest surface (9 mitigations mapped there in `04-assessment.md`). Run `/security-review` on the branch.
- Before merging any PR that touches env-var handling, `ANTHROPIC_API_KEY` wiring, or Vercel Blob writes — `/security-review`.
- When the bot flags nothing on a large PR (>500 lines changed) — sanity check with `/review`.

**If the bot is wrong**: human approval overrides. Reply to the bot comment with your reasoning — the record lives on the PR even if the bot can't read its own prior output.

**Skip-review escape hatch**: label a PR `skip-review` and the bot workflow bypasses the Claude call. Use for meta-PRs only — edits to the review script itself, tool-chain version bumps, etc.

**Cost expectation**: ~$0.03-0.08 per bot review at Sonnet 4.6 prices. At ~20 PRs/month this is sub-$2. Watch the Anthropic billing dashboard for anomalies.
