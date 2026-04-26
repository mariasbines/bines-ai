# Notes — elicitation Q&A (pushback v2)

Eight questions surfaced before drafting `01-concept.md`. Maria's responses below are the locked starting points for the architecture phase.

## Q1 — Moderation gate post-Haiku-retirement

**Context:** the seed (project_bines_ai_pushback_v2.md) referenced *"verdict.harm !== 'none' is the moderation gate for excerpting"*, but the pre-flight Haiku classifier was retired this morning (commit `b996ba2`). That harm signal no longer exists on argue-log entries.

**Options:**
- A1. argue-judge does double duty: emits `is_pushback`, `landed`, `excerpt`, plus a fresh `harm_in_visitor_messages` flag scoped to public-excerpt safety.
- A2. Separate harm classifier only on conversations that would otherwise be excerpted.
- A3. Trust Sonnet's belt — flag conversations where Sonnet refused as non-pushbacks.

**Maria:** A1.

## Q2 — When does argue-judge fire?

**Options:**
- B1. Once at chat-end (browser close / idle timeout).
- B2. After every assistant response.
- B3. Lazily, batched at build time over the previous day's logs.

**Maria:** **B1** — chat-end. Fires on idle / beforeunload. Server-side cron sweep covers conversations where neither fired (resilience).

## Q3 — Multi-piece conversations

**Options:** start-piece sticks, or judge re-tags if pivot detected.

**Maria:** start-piece sticks. `from_slug` captured once at conversation start, never re-attributed.

## Q4 — CTA copy

**Options:** keep `[ push back ]`, or rename to `[ argue with this ]`, or other.

**Maria:** rename to `[ argue with this ]`.

## Q5 — Excerpt selection

**Options:** most recent / highest-substance / random-stable.

**Maria:** highest-substance — judge ranks by classifier confidence; top 2-3 excerpts shown.

## Q6 — Pushback summary visibility

**Options:**
- F1. Footer on `/fieldwork/[slug]` only.
- F2. Footer + small count badge on `/fieldwork` index card.
- F3. Footer + a global "this week's best pushbacks" element on `/fieldwork` index.

**Maria:** **F2** — footer + index-card count badge.

## Q7 — Old `/api/push-back` + `PushBackModal`

**Options:** delete in this epic / keep dormant until v2 is stable.

**Maria:** delete in this epic. Already unreachable from UI.

## Q8 — Model choice for argue-judge

**Options:** Haiku (cheap, low latency) vs. Sonnet (more nuance for "did it land").

**Maria:** **Sonnet** — consistency with the rest of the chat surface; cost / latency are acceptable for a once-per-conversation call.
