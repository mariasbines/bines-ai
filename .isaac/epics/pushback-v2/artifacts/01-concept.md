# 01 — Concept: pushback v2 (Argue-driven, AI-judged)

**Epic:** `pushback-v2`
**Phase:** 1 (Concept)
**Captured:** 26 Apr 2026
**Sibling artifact:** `notes-elicitation.md` — eight clarifying questions, all locked.

## Problem

The v1 pushback surface on bines.ai is hidden in production for three reasons:

1. **Wrong input mechanism.** The `[ push back ]` CTA opens `<PushBackModal>` — a textarea that asks the visitor to write a paragraph. That's a *separate* feedback channel from `/argue`, even though the `/argue` chat is already the canonical place where visitors push back. Two surfaces for the same job, neither aware of the other.
2. **Static frontmatter counts.** `pushback.count` lives in each Fieldwork MDX file's frontmatter, manually maintained. It drifts the moment anyone interacts with the chat, and bumping it is a curatorial chore Maria explicitly does not want.
3. **No moderation between visitor input and public display.** v1's modal posted directly to `/api/push-back` and the count rendered on the card — but nothing existed to filter abusive content out of any public surface that quoted visitors. v2 needs a moderation layer baked in.

These problems compound: the modal is a duplicate of `/argue`, the counts lie, and there's no safe way to *show* what visitors actually said. v1 shipped as scaffolding; v2 collapses scaffolding into one Argue-driven flow with AI judgment.

## Goals

1. **Single chat surface.** The `[ argue with this ]` CTA on each Fieldwork piece links to `/argue?from=<slug>`. No modal, no separate textarea. Same chat surface that already exists, now piece-aware.
2. **AI-judged, not Maria-curated.** A post-conversation Sonnet pass (`argue-judge`) emits `{ is_pushback, landed, excerpt, harm_in_visitor_messages }` per conversation. Maria never decides whether a chat counts.
3. **Public summary block on every Fieldwork piece.** Editorial-maximalist register: count of pushbacks, count of landed concessions, top 2-3 verbatim visitor excerpts. No visitor identity. Anonymous arguments only.
4. **Index-card count badge.** Each `<FieldworkCard>` on `/fieldwork` surfaces the pushback count next to "in rotation" — turning the index into a live engagement signal.
5. **Retire v1 in the same epic.** `/api/push-back`, `PushBackModal`, and related tests deleted. Already unreachable; this is the moment to clean up.

## Stakeholders

- **Maria** (primary) — wants to know which pieces are landing, which pieces are getting pushed back on, and what the best counter-arguments are, *without* being the curator. Voice and editorial restraint matter; the summary block has to read like the rest of the site, not like a comments section.
- **Public visitors** — argue with the bot via the piece-aware chat; their best lines may surface as anonymous excerpts on the piece. Tone of the surfaced excerpts should preserve their voice (verbatim quotes, never AI-paraphrased).
- **Bad actors / abuse** — already filtered upstream by Sonnet's belt + agent-guard + rate-limit. v2 adds one more layer at the *publication* surface: harmful content never reaches the public summary, even if it reached the chat.
- **Future Maria at v3** — the judge verdicts become a richer signal than raw turn counts. Could feed a "best argument of the month" surface, or a per-piece engagement timeline. Out of scope here.

## Success criteria

- Visitor click on `[ argue with this ]` from any Fieldwork piece lands them in `/argue` with the chat pre-warmed by the piece's body and a soft preface (*"you've come from [piece title]. what didn't land?"*).
- Each `argue-log` entry written during a piece-attributed conversation carries a `from_slug` field tying it to the originating piece.
- An end-of-conversation event (idle 2 min OR `beforeunload`) triggers a Sonnet judge pass that writes one verdict per conversation to a separate `argue-judges/YYYY-MM-DD.jsonl` log.
- Build-time enrichment on `/fieldwork/[slug]` reads `argue-judges/`, filters by `from_slug`, computes `pushback_count` / `landed_count` / `excerpts[]` for each piece — overriding the static MDX frontmatter values.
- The `<PushbackSummary>` component renders on every Fieldwork detail page when there is at least one pushback; absent silently when count is zero.
- The `<FieldworkCard>` index variant shows a small accent-tinted badge with the pushback count when > 0.
- Every excerpt shown publicly came from a conversation flagged `harm_in_visitor_messages: false` AND `is_pushback: true`. No exception path.
- v1 surface (`/api/push-back`, `PushBackModal`, `PushBackModal.test.tsx`) deleted; `pushback.count` MDX frontmatter field becomes a build-time fallback for sites without the judges log present.
- Resilience: a daily cron sweeps any argue-log conversations that didn't get a judge (because the user closed the browser before either fired) and runs Sonnet over them retroactively.
- Quality gates: typecheck, lint, tests, build all green. Coverage ≥ 80% on new modules under `src/lib/argue-judge/`.

## Decisions locked in elicitation

(See `notes-elicitation.md` for full Q&A.)

| # | Decision |
|---|---|
| Q1 | argue-judge emits its own `harm_in_visitor_messages` flag — single Sonnet call covers pushback / landed / excerpt / harm. |
| Q2 | Judge fires once at chat-end (idle 2 min OR `beforeunload`); a daily cron sweeps un-judged conversations. |
| Q3 | `from_slug` captured at conversation start; never re-attributed mid-conversation. |
| Q4 | CTA copy: `[ argue with this ]`. |
| Q5 | Excerpt selection: highest-substance per judge confidence; top 2-3 per piece. |
| Q6 | Summary block on `/fieldwork/[slug]` footer + count badge on `/fieldwork` index card. |
| Q7 | `/api/push-back` and `<PushBackModal>` deleted in this epic. |
| Q8 | Judge model: Sonnet (consistency with `/api/chat`). |

## Scope IN

- New `from_slug` query param on `/argue?from=<slug>`; piece-aware system-prompt extension
- New `from_slug` field on `ArgueLogEntry` schema (additive, optional)
- New `/api/argue/judge` route — accepts conversation transcript, runs Sonnet, writes to `argue-judges/YYYY-MM-DD.jsonl`
- New `src/lib/argue-judge/` module — the Sonnet prompt, the verdict shape, the storage helper
- New `<PushbackSummary>` component on `/fieldwork/[slug]` footer
- New count badge on `<FieldworkCard>` index variant
- Updated `<FieldworkCardCtas>` — replaces hidden `[ push back ]` button with `<Link href="/argue?from=<slug>">[ argue with this ]</Link>`
- Updated `getFieldworkBySlug` / loaders — derives counts + excerpts from `argue-judges/` at build time
- Daily Vercel cron route — sweeps un-judged conversations and runs the judge retroactively
- Delete `/api/push-back`, `<PushBackModal>`, and their tests

## Scope OUT

- Real-time visualisation of arguments-in-progress
- Visitor-side reactions (likes, shares, comments)
- Gamification (leaderboards, "best argument of the week")
- Visitor identity / accounts / login
- Per-piece engagement timeline / time-series charts
- v3 / future RAG retrieval over argue-log corpus (already noted in v3 brainstorm)
- Re-judging old conversations under newer Sonnet versions (model-version tagging stays in v2 for forward compatibility, but the re-judge tool is out)

## Open risks / failure modes

- **Judge false positives** — trivial chats flagged as pushbacks. Mitigation: prompt tuning + minimum-substance heuristic (turn count ≥ 2, total visitor character count ≥ a threshold).
- **Judge false negatives** — substantive arguments missed. Mitigation: spot-check from the existing `/argue/log` admin view; tune prompt iteratively.
- **Excerpt quality** — a flat verbatim quote that reads weirdly out of context. Mitigation: judge selects the *most self-contained* line, not just the longest. If no usable line exists, judge sets `excerpt: null` and that conversation contributes to the count but no public quote.
- **Drift over model upgrades** — judge verdicts produced under Sonnet 4.6 may grade differently from a future Sonnet 5. Mitigation: every verdict carries a `judge_model` field; out-of-scope tooling can re-judge later if needed.
- **Build-time staleness** — derived counts only reflect activity up to the last deploy. Mitigation: acceptable for Maria's traffic profile; if it becomes an issue, revisit with on-demand revalidation.
- **Chat-end detection misses** — `beforeunload` is unreliable on mobile, idle timer can fire prematurely. Mitigation: daily cron sweep retroactively judges any conversation older than 30 min that lacks a judge entry.
- **Cost** — every conversation triggers an extra Sonnet call. Mitigation: bounded by daily rate-limit cap (50 / IP); typical cost per judge < $0.01 at current Sonnet 4.6 pricing.

## Dependencies

- **Blob store** `bines-ai-blob` (already provisioned for argue-log; reuse for argue-judges)
- **`ANTHROPIC_API_KEY`** (already set on Vercel preview + production)
- **`ARGUE_LOG_IP_SALT_CURRENT`** (already set; judges inherit the same hash semantics)
- **`CRON_SECRET`** (already set for the existing argue-log retention cron; reuse for the judge-sweep cron)
- **No new env vars** required beyond what argue-hardening already established

## Hand-off to Phase 2 (context)

Codebase areas the context phase needs to map:

- `src/components/FieldworkCardCtas.tsx` — current CTA structure, `[ push back ]` hidden state
- `src/components/PushBackModal.tsx` — to delete; capture what its tests assert so the deletion doesn't drop coverage from elsewhere
- `src/app/api/push-back/route.ts` — to delete
- `src/app/argue/page.tsx` — needs `?from=` handling
- `src/components/ChatInterface.tsx` — needs idle / beforeunload chat-end signal
- `src/app/api/chat/route.ts` — needs to accept + persist `from_slug`
- `src/lib/argue-log/schema.ts` + storage — additive `from_slug` field
- `src/lib/content/fieldwork.ts` (`getFieldworkBySlug` etc.) — build-time enrichment from judges log
- The cron pattern from the existing argue-log retention sweeper (any `vercel.json` cron entry)
