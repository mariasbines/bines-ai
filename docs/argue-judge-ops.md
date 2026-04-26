# Argue-judge operations runbook

Internal docs for the `/argue` brand-defence judge. Scope: the
Blob-backed verdict store under `argue-judges/`, the run-route, the
nightly sweep cron, and the GDPR erasure path.

Written for a single-operator context (Maria). British English throughout.
Brevity over voice — this is a runbook, not copy.

Status: ships with story 003.006 (end of Phase B). The 7-day soft-launch
gap begins on dev merge; Phase C (public render, CTA, v1 deletion, launch
QA) follows after Maria's sign-off.

---

## 1 · Cron schedule + ordering

Two crons share `vercel.json`:

| Cron | Schedule (UTC) | Purpose |
|---|---|---|
| `/api/argue-log/cleanup` | `30 3 * * *` | delete argue-log day-files older than 90 days |
| `/api/argue-judge/sweep` | `30 4 * * *` | judge yesterday's argue-log conversations that lack a verdict |

Sweep runs **one hour after cleanup**. The ordering is good hygiene rather
than load-bearing — at v1 scale (≤90 day retention; sweep targets
yesterday) the two never fight over the same files. If conversations/day
ever scale past ~50 and the sweep window tightens against the cleanup
window, revisit the staggering.

`maxDuration: 300` is set on the sweep route — five minutes covers up to
~150 conversations/day at sequential pacing. Past that, switch the runner
to `Promise.allSettled` with a concurrency cap of ~5 and keep the timeout
at 8s per call.

---

## 2 · Manual replay

If a sweep was missed (Vercel cron flake, bad deploy, missing secret), or
if a fix landed and you want to re-judge a specific day, replay manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://bines.ai/api/argue-judge/sweep?day=2026-04-20"
```

The `?day=YYYY-MM-DD` override is regex-validated. Path-traversal-shaped
input returns 400 with no Blob touch.

The route is **idempotent** — already-judged conversations are skipped
(counted as `skipped_already_judged`). Re-running the same day-replay is
safe.

The response envelope:

```json
{
  "day": "2026-04-20",
  "judged": 7,
  "skipped_already_judged": 3,
  "errors": 0
}
```

`errors > 0` means one or more `judgeConversation` calls threw. Check
Vercel function logs for `[argue-judge] sweep-failed conv_id=<id>
reason=<name>` lines. The next night's sweep picks up the un-judged
conversations automatically — no retry needed unless the failure is
systemic (in which case fix-then-replay).

---

## 3 · Monthly cron-history check

Once a month, eyeball the Vercel dashboard's cron tab:

1. Navigate to Project → Settings → Crons.
2. Confirm both `/api/argue-log/cleanup` and `/api/argue-judge/sweep`
   show recent successful runs.
3. If a run is marked failed, drill into the function-log timestamp of
   that run and look for the relevant `[argue-judge] ...` log line.
4. If the sweep is silent (no recent runs at all — schedule may have
   silently dropped after a Vercel UI change), redeploy `vercel.json` to
   re-register.

There is no automated alerting at v1. Manual review is the contract.

---

## 4 · GDPR erasure path for verdicts

If a visitor requests deletion of their argue-log entries, the existing
argue-log cleanup path covers them — `argue-log/<day>.jsonl` files are
deleted day-by-day, and the 90-day cron handles the same.

For verdicts in `argue-judges/<day>.jsonl`:

1. **Identify the day.** The verdict's day-key is when the JUDGE ran (not
   when the conversation happened). If the visitor's conversation was on
   `2026-04-25`, the verdict could be on `2026-04-25` (run-route) or
   `2026-04-26` (sweep).
2. **Delete the relevant `argue-judges/<day>.jsonl` blob.** Use the
   Vercel dashboard Blob admin UI or a one-off script that authenticates
   with `BLOB_READ_WRITE_TOKEN` and calls `del()` on the blob URL.
3. **Trigger a redeploy.** The build-time loader (`getJudgesForSlug`)
   re-reads the namespace; the next prod build excludes the deleted day's
   verdicts from the public summary.

There is **no** automated retention cron for `argue-judges/` at v1.
Verdicts persist until manually deleted. If retention becomes a
requirement, mirror the argue-log cleanup pattern under a new route at
`/api/argue-judge/cleanup`.

For per-quote redaction (without a full day-blob delete), the v2.1
backlog is the path — flag the request as a v2.1 candidate.

---

## 5 · Cost note

At launch volume (~20 conversations/day), nightly sweep cost is roughly:

- 20 × `judgeConversation` × 512 max_tokens × Sonnet 4.6 pricing ≈ £0.16/day, £5/month.

Sources: Anthropic billing dashboard. Watch for anomalies — a sudden
10× spike means either a traffic surge OR a bug (e.g., the run route is
firing redundantly because the chat-end signal isn't deduping). Diagnose
before scaling the maxDuration knob.

If conversations/day grows past ~50:

- Concurrency: switch the sweep loop to `Promise.allSettled` with a cap
  of ~5 (architecture-flagged deferred optimisation; trigger threshold).
- Per-IP rate limit on `/api/argue-judge/run`: today bounded indirectly
  by the chat route's 50/IP/day cap on argue-log writes. If that cap is
  ever loosened, add a direct cap on the run route.

---

## 6 · Fail-shut policy

The judge runner (`src/lib/argue-judge/runner.ts`) throws on any error
path: timeout, JSON parse failure, Zod rejection, SDK throw. Callers (run
route + sweep cron) catch + log + skip. **No default verdict is ever
written.**

Consequence: a missed judgment means the conversation contributes nothing
to the public summary. That's harmless — verdicts are aggregate signals,
not transactional records.

The sweep does not retry within the same run. The next night's sweep
picks up un-judged conversations automatically. If a class of failure
persists across nights (e.g., a model id rename), surface it via the
monthly cron-history check + manual replay after the fix.

---

## Env vars summary

| Env var | Read by | Required |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | argue-judges storage layer | yes |
| `ANTHROPIC_API_KEY` | judge runner (Sonnet) | yes |
| `CRON_SECRET` | sweep route bearer auth (shared with argue-log/cleanup) | yes |
| `ARGUE_LOG_IP_SALT_CURRENT` | run route IP-bind hash | yes |
| `ARGUE_LOG_IP_SALT_PREVIOUS` | run route IP-bind salt-rotation tolerance | optional |

`CRON_SECRET` is shared with the argue-log cleanup cron (PB2-SEC-005
accepted risk — operational simplicity over separate-secrets benefit).
