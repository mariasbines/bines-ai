# 01 — Concept: /argue hardening

**Epic:** `argue-hardening`
**Phase:** 1 (Concept)
**Captured:** 24 Apr 2026
**Previous artifact:** `notes-elicitation.md` (nine clarifying questions, all locked)

## Problem

The `/argue` chat on bines.ai is live on Vercel preview but has two gaps before it can be shared publicly:

1. **No conversation log.** Once bines.ai goes public, people will argue with the bot, and Maria has no record of what's being said. She can't spot patterns (what questions recur? where does the bot break voice? what topics is it being dragged into?), can't triage abuse, and can't audit the bot's own output. The existing `/api/chat` route is stateless by design — request in, stream out, nothing persisted.

2. **No off-brand filter.** The system prompt is the only guardrail. It's strong but porous: Claude will still take the bait on electoral politics, named-people gossip, conspiracy topics, and other lanes that aren't Maria's to argue in. Rate-limit + `agent-guard` cover abuse vectors; neither covers topic drift. A visitor who asks *"what does Maria think about Trump?"* today will get some kind of answer, and Maria doesn't want that to be her site's public voice.

Both need solving **before** the dev → master launch PR (story 001.018). This epic slots between the content work and the launch QA.

## Goals

1. **Log every `/argue` conversation** (user + assistant turns + guard/moderation metadata) to private Vercel Blob, 90-day rolling retention, salted-hashed IPs.
2. **Filter off-brand topics** via a two-layer system: Anthropic's moderation endpoint (harm categories) + a Haiku 4.5 pre-flight pass (off-brand categories from Maria's locked list).
3. **Give Maria a web view** at `/argue/log` behind Vercel Deployment Protection so she can browse conversations, with toxic content scrubbed-by-default and click-to-reveal.
4. **Keep the chat UX unchanged for legitimate visitors** — filter should be invisible unless triggered; log should add negligible latency.

## Stakeholders

- **Maria** (primary) — wants situational awareness without nasty content being pushed at her. Admin-only consumer of the log. Wants filter tuning to stay in her hands.
- **Public visitors** (anonymous) — argue with the bot; should see no change on-brand. Off-brand questioners should get an in-voice refusal, not a generic "I can't help with that."
- **Bad actors / agents** — already handled by rate-limit + `agent-guard`. This epic adds a topical wall but does not re-solve abuse.
- **Future Maria at v2** — the conversation log is also the seed corpus for the v2 RAG upgrade (noted in `~/Documents/bines-ai-brainstorm/03-architecture.md`). Logging format should be readable by the v2 ingest, even if v2 is out of scope here.

## Success criteria

- A seven-day public soft-launch of `/argue` produces a browsable log with zero illegal/harmful content publicly accessible, and Maria can skim it without wincing.
- Prompts on the nine locked off-brand categories (Q6 list) return the in-voice redirect, verified by a new voice-check rubric (sibling to `docs/chat-voice-check.md`).
- Anthropic moderation flags are attached to log entries but do NOT block output on Moderation endpoint (we log moderation verdicts for auditing; only Haiku pre-flight can block).
- Rate limit on `/api/chat` is unchanged; Haiku pre-flight happens **behind** the endpoint rate-limit gate so a bad actor can't burn Haiku budget faster than Sonnet (elicitation Q9 note).
- `/argue/log` is reachable only to Maria's Vercel-authenticated browser session. `curl` with no cookie gets a 401 from Vercel's edge, not from our code.
- 90-day retention enforced: logs older than 90 days auto-expire (either via a scheduled cleanup or Blob-level lifecycle).
- Typecheck, lint, tests, build all green. Coverage ≥ 80% on new `src/lib/argue-log/` and `src/lib/argue-filter/` modules.

## Constraints

### Locked by Maria (elicitation answers)

- **Retention:** 90 days rolling, auto-expire.
- **IPs:** salted hash, salt rotates quarterly. No raw IPs on disk or wire.
- **What gets logged:** full conversation content (user + assistant), plus guard signals, Haiku filter verdict, Anthropic moderation verdict per turn.
- **Admin UX:** web page only, behind Deployment Protection. **No email digest** — explicit decline.
- **Blob access:** private namespace. Admin page server-side-fetches; `access: 'public'` is forbidden for conversation logs (this is different from push-back, which uses public access for simplicity).
- **Filter categories (Q6 locked list):**
  - Electoral politics
  - Hot-button social issues (abortion, immigration, gun control, Israel/Palestine, Ukraine, trans rights as identity debate)
  - Race-as-identity-politics
  - Religion
  - Named real people outside Maria's published circle
  - Family-of-Maria beyond what's on site
  - Conspiracy / crypto hype
- **Refusal tone:** *"not my lane — Maria doesn't have a public position on this, and I don't invent them. What else have you got?"* (in Maria's voice; redirect, not lecture)
- **Classifier stack:** layered, both.
  - **Anthropic moderation endpoint** — flags harm categories. Scrubbed-by-default in admin view; metadata visible, content behind click-to-reveal.
  - **Haiku 4.5 pre-flight** — flags off-brand categories from Q6. In-voice refusal in chat; entry renders normally in admin log (interesting data, not toxic).
- **Ship order:** log first, filter second. Log works invisibly; filter adds value once there's data to tune against. Soft-launch `/argue` for ~a week after log ships, then tune filter from observed traffic.

### Inherited from project

- **Stack:** Next.js 15 App Router + Edge runtime on `/api/chat`. Log append must be Edge-compatible (no Node-only APIs).
- **Blob SDK:** `@vercel/blob` already in deps (`src/lib/push-back/storage.ts` is the precedent).
- **Anthropic SDK:** `@anthropic-ai/sdk` already wired (`src/lib/chat/anthropic.ts`). Moderation endpoint + Haiku model both reachable via same client.
- **No telemetry:** `.claude/CLAUDE.md` disables ISAAC `report-progress.js` calls for this project. Phases still run; Kanban dashboard does not.
- **British English.** Voice from `~/Documents/bines-ai-brainstorm/02-state-of-play.md`.

## Integration points

| Surface | File(s) | What this epic changes |
|---|---|---|
| Chat route | `src/app/api/chat/route.ts` | Insert Haiku pre-flight between rate-limit and Sonnet stream; append log entry post-stream (in a non-blocking way — edge runtime friendly). |
| Rate-limit | `src/lib/chat/rate-limit.ts` | **No change.** Endpoint-level limit already gates both Haiku + Sonnet. |
| Agent-guard | `src/lib/chat/agent-guard.ts` | **No change.** Signal captured and attached to log entry. |
| System prompt | `src/lib/chat/system-prompt.ts` | Tightened to declare the off-brand list as out-of-scope — belt-and-braces with the classifier. |
| Push-back (reference) | `src/lib/push-back/storage.ts` | **Do not reuse.** Private namespace + admin-only access is structurally different from public feedback logs. Copy the Blob pattern, not the storage module. |
| New: argue-log lib | `src/lib/argue-log/` (new) | Storage, salted hashing, 90-day lifecycle, JSONL schema. |
| New: argue-filter lib | `src/lib/argue-filter/` (new) | Haiku pre-flight + Anthropic moderation adapters; refusal-template rendering. |
| New: admin page | `src/app/argue/log/page.tsx` (new) | Server component, gated by Deployment Protection. Browse day-by-day. Scrub-by-default for moderation-flagged content. |
| New: admin API | `src/app/api/argue-log/route.ts` (new) — optional | Only if client-side pagination needed; otherwise page reads straight from Blob. |

## MVP scope (six-story sketch)

Pulled forward from the elicitation notes:

1. **002.001 — Conversation log.** Private Blob namespace, daily JSONL, salted-hash IPs, 90-day auto-expire. Append happens post-stream, non-blocking.
2. **002.002 — Admin view** at `/argue/log`. Scrub-by-default on moderation flags + click-to-reveal. Date navigation.
3. **002.003 — Anthropic moderation integration.** Each turn's verdict captured on the log entry. Does NOT block.
4. **002.004 — Haiku pre-flight classifier.** Off-brand categories → in-voice refusal. Blocks before Sonnet call.
5. **002.005 — Refusal template + system-prompt tightening.** Voice-checked rubric for refusal phrasing (new sibling to `docs/chat-voice-check.md`).
6. **002.006 — Launch QA + `/argue` public share.** Voice vibe-check against the filter, toggle Deployment Protection off for `/argue` itself (but keep `/argue/log` protected), watch log for a week.

Exact story decomposition happens in Phase 6 (`isaac:stories`) once architecture and assessment are done.

## Non-goals

- **v2 RAG / corpus awareness.** The chat stays one-shot on system prompt. Logging format should be *readable* by a future v2 ingest, but no v2 work here.
- **User accounts on `/argue`.** No login, no identity. Salted-hash IP is the only handle.
- **Real-time dashboards or alerts.** Maria browses when she wants to. No push notifications, no email digest, no Slack.
- **Cross-page log consolidation.** Push-back feedback and argue logs stay separate stores; the admin views are separate pages.
- **Filter tuning UI.** Maria edits categories in code for v1. An admin-editable allow/deny list is post-launch.
- **Abuse / prompt-injection defence.** `agent-guard` already logs-and-passes. This epic does not escalate it to a hard block; that's a separate security decision.

## Risks (initial scan — elaborated in Phase 4 assessment)

- **Latency creep from Haiku pre-flight.** Adds one round-trip before the main stream. Mitigation: keep Haiku prompt short; cap tokens; measure p50/p95 in QA. Acceptable bar: < 400ms added.
- **False positives from Haiku filter.** Legitimate questions refused as off-brand. Mitigation: err on the side of "allow" for borderline cases; log verdict so Maria can see misses; refusal prompt explicitly tells the visitor *what else have you got?* rather than dead-ending.
- **Blob-append race.** Same risk push-back has (get-then-put). Accepted for v1 (low traffic). If `/argue` goes viral, migrate to per-turn files — noted as a follow-up.
- **Salt rotation without key management infra.** Quarterly rotation needs an operational procedure. Mitigation: store current + previous salt in env vars; rotation = set new current, keep prior for historical lookups, rotate prior out after 90 days.
- **Admin-page data leak if Deployment Protection misconfigured.** Mitigation: server component reads Blob with server-only token; even if the page is wrongly reachable, client never gets Blob URLs. Defence-in-depth.
- **Anthropic moderation endpoint cost / quota.** One call per turn. At expected traffic this is negligible; flag for re-evaluation if monthly spend crosses a threshold.
- **Edge runtime + Blob compatibility.** `@vercel/blob` works on Edge; push-back precedent confirms this. No new risk.

## Open questions for Phase 2 (context) / Phase 3 (architecture)

- Where does the **salt** live? Env var (`ARGUE_LOG_IP_SALT`) vs Vercel Edge Config vs Blob-stored key manifest. Probably env var for v1, keep it boring.
- How does **90-day expiry** happen? Vercel Cron + a cleanup endpoint vs Blob lifecycle policy (if supported on current plan) vs manual. Needs a small spike in Phase 2.
- Does the admin page stream Blob content (could be tens of MB over 90 days) or paginate day-by-day? Day-by-day is almost certainly right; confirm with back-of-envelope sizing in Phase 3.
- Does Haiku pre-flight see the **full conversation** or only the latest user turn? Full conversation catches topic drift mid-chat but costs more tokens. Default to full; revisit on observed cost.
- Should the `/argue/log` page surface **aggregate stats** (verdicts per day, top refusal triggers)? Nice-to-have; decide in stories phase.

---

## Next

Run `/isaac:context` to analyse codebase patterns before architecture. Specifically map:
- How push-back's Blob storage module is structured so argue-log can copy the shape without copying the public-access choice
- Where Edge-runtime compat constraints bite (streaming + post-response work)
- How the existing chat tests are structured so new filter/log tests follow the same shape
